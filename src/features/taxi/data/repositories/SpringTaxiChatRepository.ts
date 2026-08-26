import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';
import {
  selectNewestChatMessage,
  type VersionedChatMessage,
} from '@/shared/lib/chatMessageVersion';
import {uploadImage as uploadSharedImage} from '@/shared/api/imageUploadClient';
import {
  chatSocketClient,
  createNativeStompSocket,
  MinimalStompClient,
  type StompFrame,
  type StompSubscription,
} from '@/shared/realtime';

import type {TaxiRecruitDraft} from '../../model/taxiRecruitData';
import type {
  TaxiChatAccountMessageDraft,
  TaxiChatImageUploadInput,
  TaxiChatSessionSnapshot,
  TaxiChatSourceData,
} from '../../model/taxiChatViewData';
import {taxiHomeApiClient} from '../api/taxiHomeApiClient';
import {taxiChatApiClient} from '../api/taxiChatApiClient';
import type {
  ChatMessageCursorResponseDto,
  ChatMessageMutationEventResponseDto,
  ChatMessageResponseDto,
  SendChatMessageRequestDto,
  StompApiErrorDto,
} from '../dto/taxiChatDto';
import {
  buildTaxiChatSourceData,
  mapTaxiChatMessageDto,
  resolveTaxiChatRoomId,
} from '../mappers/taxiChatMapper';
import type {ITaxiChatRepository} from './ITaxiChatRepository';

interface PartyChatState {
  hasOlderMessages: boolean;
  loadPromise: Promise<TaxiChatSourceData | null> | null;
  loadingOlderPromise: Promise<void> | null;
  olderCursor: ChatMessageCursorResponseDto | null;
  mutationSubscription: StompSubscription | null;
  pendingMessageMutations: Map<string, ChatMessageResponseDto>;
  pendingRealtimeEvents: PartyChatRealtimeEvent[];
  reconciliationPromise: Promise<TaxiChatSourceData | null> | null;
  roomSubscription: StompSubscription | null;
  source: TaxiChatSourceData | null;
  subscribers: Set<SubscriptionCallbacks<TaxiChatSourceData | null>>;
}

type PartyChatRealtimeEvent =
  | {message: ChatMessageResponseDto; type: 'message'}
  | {message: ChatMessageResponseDto; type: 'mutation'};

interface PendingSpecialMessageRequest {
  reject: (error: Error) => void;
  resolve: (value: TaxiChatSourceData | null) => void;
  snapshotFallbackTimeoutId: ReturnType<typeof setTimeout> | null;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface StompConnectionAttempt {
  cancel: () => void;
  client: MinimalStompClient;
  generation: number;
}

const MESSAGES_PAGE_SIZE = 100;
const MAX_RECONCILIATION_BRIDGE_MESSAGES = 300;
const SPECIAL_MESSAGE_TIMEOUT_MS = 8000;
const STOMP_CONNECT_TIMEOUT_MS = 10000;

const buildNativeStompWebSocketPath = (endpointPath = '/ws') => {
  const normalizedPath = endpointPath.replace(/\/$/, '');

  if (normalizedPath.endsWith('/websocket')) {
    return normalizedPath.replace(/\/websocket$/, '-native');
  }

  if (normalizedPath.endsWith('-native')) {
    return normalizedPath;
  }

  return `${normalizedPath}-native`;
};

const clonePartySource = (source: TaxiChatSourceData): TaxiChatSourceData => ({
  ...source,
  departureLocation: {...source.departureLocation},
  destinationLocation: {...source.destinationLocation},
  latestAccountData: source.latestAccountData
    ? {...source.latestAccountData}
    : undefined,
  messages: source.messages.map(message => ({
    ...message,
    accountData: message.accountData ? {...message.accountData} : undefined,
    arrivalData: message.arrivalData
      ? {
          ...message.arrivalData,
          accountData: message.arrivalData.accountData
            ? {...message.arrivalData.accountData}
            : undefined,
          settlementTargetMemberIds: [
            ...message.arrivalData.settlementTargetMemberIds,
          ],
        }
      : undefined,
    avatar: message.avatar ? {...message.avatar} : undefined,
  })),
  participants: source.participants.map(participant => ({...participant})),
  settlement: source.settlement
    ? {
        ...source.settlement,
        accountData: source.settlement.accountData
          ? {...source.settlement.accountData}
          : undefined,
        settlementTargetMemberIds: [
          ...source.settlement.settlementTargetMemberIds,
        ],
      }
    : undefined,
});

const resolveLatestAccountData = (messages: TaxiChatSourceData['messages']) =>
  [...messages]
    .reverse()
    .find(message => message.type === 'account' && message.accountData)
    ?.accountData;

const mergeVersionedMessages = <T extends VersionedChatMessage & {id: string}>(
  messages: T[],
  nextMessages: T[],
) => {
  const mergedMessages = [...messages];
  const messageIndexById = new Map<string, number>();

  mergedMessages.forEach((message, index) => {
    messageIndexById.set(message.id, index);
  });

  nextMessages.forEach(message => {
    const existingIndex = messageIndexById.get(message.id);

    if (existingIndex === undefined) {
      messageIndexById.set(message.id, mergedMessages.length);
      mergedMessages.push(message);
      return;
    }

    mergedMessages[existingIndex] = selectNewestChatMessage(
      mergedMessages[existingIndex],
      message,
    );
  });

  return mergedMessages;
};

const hasOverlappingMessageId = <
  T extends {id: string},
  U extends {id: string},
>(
  messages: T[],
  nextMessages: U[],
) => {
  const messageIds = new Set(messages.map(message => message.id));

  return nextMessages.some(message => messageIds.has(message.id));
};

const applyRealtimeEventsToMessages = (
  messages: TaxiChatSourceData['messages'],
  events: PartyChatRealtimeEvent[],
) =>
  events.reduce<TaxiChatSourceData['messages']>((currentMessages, event) => {
    const messageIndex = currentMessages.findIndex(
      message => message.id === event.message.id,
    );

    if (event.type === 'message') {
      if (messageIndex >= 0) {
        const nextMessages = [...currentMessages];
        nextMessages[messageIndex] = selectNewestChatMessage(
          currentMessages[messageIndex],
          mapTaxiChatMessageDto(event.message),
        );
        return nextMessages;
      }

      return [...currentMessages, mapTaxiChatMessageDto(event.message)];
    }

    if (messageIndex < 0) {
      return currentMessages;
    }

    const nextMessages = [...currentMessages];
    nextMessages[messageIndex] = selectNewestChatMessage(
      currentMessages[messageIndex],
      mapTaxiChatMessageDto(event.message),
    );
    return nextMessages;
  }, messages);

const createStompRepositoryError = (
  message: string,
  context?: Record<string, unknown>,
) =>
  new RepositoryError(RepositoryErrorCode.SUBSCRIPTION_FAILED, message, {
    context,
  });

export class SpringTaxiChatRepository implements ITaxiChatRepository {
  private readonly pendingSpecialMessageRequests = new Map<
    string,
    PendingSpecialMessageRequest
  >();

  private readonly partyStates = new Map<string, PartyChatState>();

  private readonly sessionListeners = new Set<() => void>();

  private currentPartyId: string | null = null;

  private errorSubscription: StompSubscription | null = null;

  private stompClient: MinimalStompClient | null = null;

  private stompConnectionPromise: Promise<MinimalStompClient> | null = null;

  private stompConnectionAttempt: StompConnectionAttempt | null = null;

  private stompConnectTimeoutHandle: ReturnType<typeof setTimeout> | null =
    null;

  private stompClientGeneration = 0;

  async createPartyChat(_draft: TaxiRecruitDraft): Promise<{partyId: string}> {
    throw new RepositoryError(
      RepositoryErrorCode.INVALID_ARGUMENT,
      '파티 생성은 현재 채팅 저장소에서 지원하지 않습니다.',
    );
  }

  async getPartyChat(partyId: string): Promise<TaxiChatSourceData | null> {
    const source = await this.loadPartyChat(partyId, true);

    return source ? clonePartySource(source) : null;
  }

  async loadOlderMessages(partyId: string): Promise<void> {
    const state = this.getOrCreatePartyState(partyId);

    if (state.loadingOlderPromise) {
      return state.loadingOlderPromise;
    }

    if (!state.source || !state.hasOlderMessages || !state.olderCursor) {
      return;
    }

    const cursor = state.olderCursor;
    state.source = {
      ...state.source,
      loadingOlderMessages: true,
    };
    this.publishPartyState(partyId);

    state.loadingOlderPromise = taxiChatApiClient
      .getMessages(resolveTaxiChatRoomId(partyId), {
        cursorCreatedAt: cursor.createdAt,
        cursorId: cursor.id,
        size: MESSAGES_PAGE_SIZE,
      })
      .then(response => {
        const currentSource = state.source;

        if (!currentSource) {
          return;
        }

        const olderMessages = [...response.data.messages]
          .reverse()
          .map(message =>
            mapTaxiChatMessageDto(
              this.resolvePendingMessageMutation(state, message),
            ),
          );

        response.data.messages.forEach(message => {
          state.pendingMessageMutations.delete(message.id);
        });

        state.olderCursor = response.data.nextCursor ?? null;
        state.hasOlderMessages = response.data.hasNext;
        state.source = {
          ...currentSource,
          hasOlderMessages: state.hasOlderMessages,
          loadingOlderMessages: false,
          messages: mergeVersionedMessages(
            olderMessages,
            currentSource.messages,
          ),
        };
        this.publishPartyState(partyId);
      })
      .catch(error => {
        if (state.source) {
          state.source = {
            ...state.source,
            loadingOlderMessages: false,
          };
          this.publishPartyState(partyId);
        }

        throw error;
      })
      .finally(() => {
        state.loadingOlderPromise = null;
      });

    return state.loadingOlderPromise;
  }

  getSessionSnapshot(): TaxiChatSessionSnapshot {
    return {
      currentPartyId: this.currentPartyId,
    };
  }

  async resetSession(): Promise<void> {
    this.clearPartyStates();

    if (this.currentPartyId !== null) {
      this.currentPartyId = null;
      this.emitSessionChange();
    }

    await this.deactivateStompClient();
  }

  async sendMessage(
    partyId: string,
    messageText: string,
  ): Promise<TaxiChatSourceData | null> {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      const state = this.partyStates.get(partyId);

      return state?.source ? clonePartySource(state.source) : null;
    }

    const client = await this.ensureStompClient();

    client.publish({
      body: JSON.stringify({
        text: trimmedMessage,
        type: 'TEXT',
      } satisfies SendChatMessageRequestDto),
      destination: `/app/chat/${resolveTaxiChatRoomId(partyId)}`,
    });

    const state = this.partyStates.get(partyId);

    return state?.source ? clonePartySource(state.source) : null;
  }

  async sendImageMessage(
    partyId: string,
    imageUrl: string,
  ): Promise<TaxiChatSourceData | null> {
    const trimmedImageUrl = imageUrl.trim();

    if (!trimmedImageUrl) {
      const state = this.partyStates.get(partyId);

      return state?.source ? clonePartySource(state.source) : null;
    }

    const client = await this.ensureStompClient();

    client.publish({
      body: JSON.stringify({
        imageUrl: trimmedImageUrl,
        type: 'IMAGE',
      } satisfies SendChatMessageRequestDto),
      destination: `/app/chat/${resolveTaxiChatRoomId(partyId)}`,
    });

    const state = this.partyStates.get(partyId);

    return state?.source ? clonePartySource(state.source) : null;
  }

  async updateMessage(
    partyId: string,
    messageId: string,
    text: string,
  ): Promise<TaxiChatSourceData | null> {
    const response = await taxiChatApiClient.updateMessage(
      resolveTaxiChatRoomId(partyId),
      messageId,
      {text: text.trim()},
    );

    return this.applyMessageMutation(partyId, response.data);
  }

  async deleteMessage(
    partyId: string,
    messageId: string,
  ): Promise<TaxiChatSourceData | null> {
    const response = await taxiChatApiClient.deleteMessage(
      resolveTaxiChatRoomId(partyId),
      messageId,
    );

    return this.applyMessageMutation(partyId, response.data);
  }

  async sendAccountMessage(
    partyId: string,
    payload: TaxiChatAccountMessageDraft,
  ): Promise<TaxiChatSourceData | null> {
    return this.publishSpecialMessage(partyId, {
      account: {
        accountHolder: payload.accountHolder,
        accountNumber: payload.accountNumber,
        bankName: payload.bankName,
        hideName: payload.hideName,
        remember: payload.remember,
      },
      type: 'ACCOUNT',
    });
  }

  async setCurrentParty(partyId: string): Promise<void> {
    this.currentPartyId = partyId;
    this.emitSessionChange();
  }

  subscribeToPartyChat(
    partyId: string,
    callbacks: SubscriptionCallbacks<TaxiChatSourceData | null>,
  ): Unsubscribe {
    const state = this.getOrCreatePartyState(partyId);
    state.subscribers.add(callbacks);

    if (state.source) {
      callbacks.onData(clonePartySource(state.source));
    }

    const initialSnapshotPromise = this.loadPartyChat(partyId, true);

    initialSnapshotPromise.catch(error => {
      if (this.isSubscribedCallback(partyId, state, callbacks)) {
        callbacks.onError(error as Error);
      }
    });

    this.ensureStompClient()
      .then(async () => {
        this.ensureRoomSubscription(partyId);
        this.ensureRoomMutationSubscription(partyId);

        await initialSnapshotPromise.catch(() => undefined);

        if (
          this.partyStates.get(partyId) !== state ||
          state.subscribers.size === 0
        ) {
          return;
        }

        await this.reconcileSubscribedPartyChat(partyId);
      })
      .catch(error => {
        if (this.isSubscribedCallback(partyId, state, callbacks)) {
          callbacks.onError(error as Error);
        }
      });

    return () => {
      const currentState = this.partyStates.get(partyId);

      if (!currentState) {
        return;
      }

      currentState.subscribers.delete(callbacks);

      if (currentState.subscribers.size === 0) {
        currentState.roomSubscription?.unsubscribe();
        currentState.roomSubscription = null;
        currentState.mutationSubscription?.unsubscribe();
        currentState.mutationSubscription = null;

        if (this.currentPartyId === partyId) {
          this.currentPartyId = null;
          this.emitSessionChange();
        }

        this.partyStates.delete(partyId);

        if (!this.hasActiveSubscribers()) {
          this.deactivateStompClient().catch(error => {
            console.warn('채팅 STOMP 클라이언트를 정리하지 못했습니다.', error);
          });
        }
      }
    };
  }

  subscribeToSession(listener: () => void) {
    this.sessionListeners.add(listener);

    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  async updateNotificationSetting(
    partyId: string,
    enabled: boolean,
  ): Promise<TaxiChatSourceData | null> {
    const chatRoomId = resolveTaxiChatRoomId(partyId);
    const response = await taxiChatApiClient.updateSettings(
      chatRoomId,
      !enabled,
    );
    const state = this.getOrCreatePartyState(partyId);

    if (state.source) {
      state.source = {
        ...state.source,
        notificationEnabled: !response.data.muted,
      };
      this.publishPartyState(partyId);
      return clonePartySource(state.source);
    }

    const source = await this.loadPartyChat(partyId, true);

    return source ? clonePartySource(source) : null;
  }

  async uploadImage({
    fileName,
    mimeType,
    uri,
  }: TaxiChatImageUploadInput): Promise<string> {
    const response = await uploadSharedImage({
      context: 'CHAT_IMAGE',
      fileName,
      mimeType,
      uri,
    });

    return response.url;
  }

  private buildSpecialMessageKey(partyId: string) {
    return `${partyId}:account`;
  }

  private getLatestAccountMessage(
    source: TaxiChatSourceData | null | undefined,
  ) {
    if (!source) {
      return undefined;
    }

    return [...source.messages]
      .reverse()
      .find(message => message.type === 'account' && message.accountData);
  }

  private matchesAccountPayload(
    message: ChatMessageResponseDto | TaxiChatSourceData['messages'][number],
    payload: SendChatMessageRequestDto,
  ) {
    if (
      payload.type !== 'ACCOUNT' ||
      !payload.account ||
      !message.accountData
    ) {
      return false;
    }

    const {account} = payload;
    const {accountData} = message;

    if (
      accountData.bankName !== account.bankName ||
      accountData.accountNumber !== account.accountNumber ||
      Boolean(accountData.hideName) !== Boolean(account.hideName)
    ) {
      return false;
    }

    if (account.hideName) {
      return true;
    }

    return accountData.accountHolder === account.accountHolder;
  }

  private queueAccountSnapshotFallback(params: {
    key: string;
    partyId: string;
    payload: SendChatMessageRequestDto;
    previousLatestAccountMessageId?: string;
  }) {
    const timeoutId = setTimeout(() => {
      this.resolveAccountMessageFromSnapshot(params).catch(error => {
        console.warn('계좌 메시지 스냅샷 보정에 실패했습니다.', error);
      });
    }, 1500);

    const pendingRequest = this.pendingSpecialMessageRequests.get(params.key);

    if (pendingRequest) {
      pendingRequest.snapshotFallbackTimeoutId = timeoutId;
    } else {
      clearTimeout(timeoutId);
    }
  }

  private async resolveAccountMessageFromSnapshot({
    key,
    partyId,
    payload,
    previousLatestAccountMessageId,
  }: {
    key: string;
    partyId: string;
    payload: SendChatMessageRequestDto;
    previousLatestAccountMessageId?: string;
  }) {
    if (!this.pendingSpecialMessageRequests.has(key)) {
      return;
    }

    const source = await this.loadPartyChat(partyId, true);
    const latestAccountMessage = this.getLatestAccountMessage(source);

    if (
      !latestAccountMessage ||
      latestAccountMessage.id === previousLatestAccountMessageId ||
      !this.matchesAccountPayload(latestAccountMessage, payload)
    ) {
      return;
    }
    this.clearPendingSpecialMessageRequest(key);
  }

  private clearPendingSpecialMessageRequest(key: string, error?: Error) {
    const pendingRequest = this.pendingSpecialMessageRequests.get(key);

    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timeoutId);
    if (pendingRequest.snapshotFallbackTimeoutId) {
      clearTimeout(pendingRequest.snapshotFallbackTimeoutId);
    }
    this.pendingSpecialMessageRequests.delete(key);

    if (error) {
      pendingRequest.reject(error);
      return;
    }

    const partyId = key.split(':')[0];
    const state = this.partyStates.get(partyId);
    pendingRequest.resolve(
      state?.source ? clonePartySource(state.source) : null,
    );
  }

  private async publishSpecialMessage(
    partyId: string,
    payload: SendChatMessageRequestDto,
  ): Promise<TaxiChatSourceData | null> {
    const client = await this.ensureStompClient();
    const key = this.buildSpecialMessageKey(partyId);
    const previousLatestAccountMessageId = this.getLatestAccountMessage(
      this.partyStates.get(partyId)?.source,
    )?.id;

    this.clearPendingSpecialMessageRequest(
      key,
      createStompRepositoryError(
        '이전 특수 메시지 요청이 새 요청으로 대체되었습니다.',
      ),
    );

    const responsePromise = new Promise<TaxiChatSourceData | null>(
      (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.clearPendingSpecialMessageRequest(
            key,
            createStompRepositoryError(
              '특수 메시지 전송 결과를 제시간에 확인하지 못했습니다.',
              {
                chatMessageType: payload.type,
                partyId,
              },
            ),
          );
        }, SPECIAL_MESSAGE_TIMEOUT_MS);

        this.pendingSpecialMessageRequests.set(key, {
          reject,
          resolve,
          snapshotFallbackTimeoutId: null,
          timeoutId,
        });
      },
    );
    client.publish({
      body: JSON.stringify(payload),
      destination: `/app/chat/${resolveTaxiChatRoomId(partyId)}`,
    });
    this.queueAccountSnapshotFallback({
      key,
      partyId,
      payload,
      previousLatestAccountMessageId,
    });

    return responsePromise;
  }

  private clearStompSubscriptions() {
    this.errorSubscription?.unsubscribe();
    this.errorSubscription = null;

    this.partyStates.forEach(state => {
      state.roomSubscription?.unsubscribe();
      state.roomSubscription = null;
      state.mutationSubscription?.unsubscribe();
      state.mutationSubscription = null;
    });
  }

  private clearPartyStates() {
    this.partyStates.forEach(state => {
      state.roomSubscription?.unsubscribe();
      state.roomSubscription = null;
      state.mutationSubscription?.unsubscribe();
      state.mutationSubscription = null;
      state.source = null;
      state.subscribers.clear();
    });
    this.errorSubscription?.unsubscribe();
    this.errorSubscription = null;
    this.pendingSpecialMessageRequests.forEach((_, key) => {
      this.clearPendingSpecialMessageRequest(
        key,
        createStompRepositoryError(
          '채팅 세션이 정리되어 특수 메시지 대기 요청을 종료했습니다.',
        ),
      );
    });
    this.partyStates.clear();
  }

  private async deactivateStompClient() {
    const client = this.stompClient;

    if (client) {
      this.cancelStompConnectionAttempt(client);
    }

    this.clearStompConnectTimeout();
    this.stompClientGeneration += 1;
    this.stompClient = null;
    this.stompConnectionPromise = null;
    this.errorSubscription = null;
    this.pendingSpecialMessageRequests.forEach((_, key) => {
      this.clearPendingSpecialMessageRequest(
        key,
        createStompRepositoryError(
          '채팅 연결이 종료되어 특수 메시지 전송을 마무리하지 못했습니다.',
        ),
      );
    });

    if (!client) {
      return;
    }

    try {
      await client.deactivate({force: true});
    } catch (error) {
      console.warn('채팅 STOMP 연결 종료에 실패했습니다.', error);
    }
  }

  private emitSessionChange() {
    this.sessionListeners.forEach(listener => {
      listener();
    });
  }

  private ensureErrorSubscription() {
    if (!this.stompClient?.connected || this.errorSubscription) {
      return;
    }

    this.errorSubscription = this.stompClient.subscribe(
      '/user/queue/errors',
      frame => {
        const payload = this.parseFrameBody<StompApiErrorDto>(frame);
        const message =
          payload?.message || '채팅 실시간 처리 중 오류가 발생했습니다.';
        const error = createStompRepositoryError(message, {
          apiErrorCode: payload?.errorCode,
        });

        this.pendingSpecialMessageRequests.forEach((_, key) => {
          this.clearPendingSpecialMessageRequest(key, error);
        });
        this.notifyPartySubscribers(error);
      },
    );
  }

  private ensureRoomSubscription(partyId: string) {
    const state = this.partyStates.get(partyId);

    if (
      !state ||
      state.subscribers.size === 0 ||
      state.roomSubscription ||
      !this.stompClient?.connected
    ) {
      return;
    }

    state.roomSubscription = this.stompClient.subscribe(
      `/topic/chat/${resolveTaxiChatRoomId(partyId)}`,
      frame => {
        this.handleIncomingMessage(partyId, frame).catch(() => undefined);
      },
    );
  }

  private ensureRoomMutationSubscription(partyId: string) {
    const state = this.partyStates.get(partyId);

    if (
      !state ||
      state.subscribers.size === 0 ||
      state.mutationSubscription ||
      !this.stompClient?.connected
    ) {
      return;
    }

    state.mutationSubscription = this.stompClient.subscribe(
      `/topic/chat/${resolveTaxiChatRoomId(partyId)}/events`,
      frame => {
        this.handleIncomingMessageMutation(partyId, frame);
      },
    );
  }

  private async ensureStompClient(): Promise<MinimalStompClient> {
    if (this.stompClient?.connected) {
      return this.stompClient;
    }

    if (this.stompConnectionPromise) {
      return this.stompConnectionPromise;
    }

    if (!this.stompClient) {
      this.stompClient = new MinimalStompClient();
    }

    const client = this.stompClient;
    const generation = ++this.stompClientGeneration;

    this.stompConnectionPromise = new Promise<MinimalStompClient>(
      (resolve, reject) => {
        let settled = false;
        let connectTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const clearConnectTimeout = () => {
          if (!connectTimeoutHandle) {
            return;
          }

          clearTimeout(connectTimeoutHandle);

          if (this.stompConnectTimeoutHandle === connectTimeoutHandle) {
            this.stompConnectTimeoutHandle = null;
          }

          connectTimeoutHandle = null;
        };

        const safeReject = (error: RepositoryError) => {
          if (settled) {
            return;
          }

          settled = true;
          clearConnectTimeout();
          this.clearStompConnectionAttempt(client, generation);
          reject(error);
        };

        this.stompConnectionAttempt = {
          cancel: () => {
            safeReject(
              createStompRepositoryError('채팅 실시간 연결이 취소되었습니다.'),
            );
          },
          client,
          generation,
        };

        connectTimeoutHandle = setTimeout(() => {
          if (!this.isCurrentStompClient(client, generation)) {
            clearConnectTimeout();
            return;
          }

          const error = createStompRepositoryError(
            '채팅 실시간 연결 시간이 초과되었습니다.',
            {
              timeoutMs: STOMP_CONNECT_TIMEOUT_MS,
            },
          );

          safeReject(error);
          this.deactivateStompClient().catch(() => undefined);
        }, STOMP_CONNECT_TIMEOUT_MS);
        this.stompConnectTimeoutHandle = connectTimeoutHandle;

        client.beforeConnect = async () => {
          try {
            const options = await chatSocketClient.buildConnectionOptions({
              endpointPath: buildNativeStompWebSocketPath(),
            });

            client.connectHeaders = options.connectHeaders;
            client.webSocketFactory = () =>
              createNativeStompSocket(options.url);
            client.heartbeatIncoming = options.heartbeatIncomingMs;
            client.heartbeatOutgoing = options.heartbeatOutgoingMs;
            client.reconnectDelay = options.reconnectDelayMs;
          } catch (error) {
            const repositoryError = createStompRepositoryError(
              '채팅 실시간 연결 준비에 실패했습니다.',
              {
                cause: error,
              },
            );
            safeReject(repositoryError);
            throw repositoryError;
          }
        };

        client.onConnect = () => {
          if (!this.isCurrentStompClient(client, generation)) {
            return;
          }

          this.ensureErrorSubscription();
          this.partyStates.forEach((state, partyId) => {
            if (state.subscribers.size > 0) {
              this.ensureRoomSubscription(partyId);
              this.ensureRoomMutationSubscription(partyId);
              this.reconcileSubscribedPartyChat(partyId).catch(error => {
                console.error('택시 채팅 재연결 후 메시지 보정 실패:', error);
              });
            }
          });

          if (!settled) {
            settled = true;
            clearConnectTimeout();
            this.clearStompConnectionAttempt(client, generation);
            resolve(client);
          }
        };

        client.onDisconnect = () => {
          if (!this.isCurrentStompClient(client, generation)) {
            return;
          }
          this.clearStompSubscriptions();
        };

        client.onStompError = frame => {
          if (!this.isCurrentStompClient(client, generation)) {
            return;
          }

          const error = createStompRepositoryError(
            frame.headers.message ||
              this.parseFrameBody<StompApiErrorDto>(frame)?.message ||
              '채팅 실시간 연결에 실패했습니다.',
            {
              frameBody: frame.body,
            },
          );
          this.notifyPartySubscribers(error);
          safeReject(error);
        };

        client.onWebSocketClose = event => {
          if (!this.isCurrentStompClient(client, generation)) {
            return;
          }
          this.clearStompSubscriptions();

          if (!settled) {
            safeReject(
              createStompRepositoryError('채팅 실시간 연결이 닫혔습니다.', {
                closeCode: event.code,
                closeReason: event.reason,
                wasClean: event.wasClean,
              }),
            );
          }
        };

        client.onWebSocketError = event => {
          if (!this.isCurrentStompClient(client, generation)) {
            return;
          }

          const error = createStompRepositoryError(
            '채팅 실시간 연결을 열지 못했습니다.',
            {
              event,
            },
          );
          safeReject(error);
        };
        client.activate();
      },
    ).finally(() => {
      this.clearStompConnectionAttempt(client, generation);

      if (this.isCurrentStompClient(client, generation)) {
        this.stompConnectionPromise = null;
      }
    });

    return this.stompConnectionPromise;
  }

  private reconcileSubscribedPartyChat(partyId: string) {
    const state = this.partyStates.get(partyId);

    if (!state || state.subscribers.size === 0) {
      return Promise.resolve(null);
    }

    if (state.reconciliationPromise) {
      return state.reconciliationPromise;
    }

    state.reconciliationPromise = (async () => {
      await state.loadPromise?.catch(() => undefined);

      if (
        this.partyStates.get(partyId) !== state ||
        state.subscribers.size === 0
      ) {
        return null;
      }

      return this.loadPartyChat(partyId, true);
    })().finally(() => {
      if (this.partyStates.get(partyId) === state) {
        state.reconciliationPromise = null;
      }
    });

    return state.reconciliationPromise;
  }

  private getOrCreatePartyState(partyId: string): PartyChatState {
    const existingState = this.partyStates.get(partyId);

    if (existingState) {
      return existingState;
    }

    const nextState: PartyChatState = {
      hasOlderMessages: false,
      loadPromise: null,
      loadingOlderPromise: null,
      olderCursor: null,
      mutationSubscription: null,
      pendingMessageMutations: new Map(),
      pendingRealtimeEvents: [],
      reconciliationPromise: null,
      roomSubscription: null,
      source: null,
      subscribers: new Set(),
    };

    this.partyStates.set(partyId, nextState);
    return nextState;
  }

  private applyPendingRealtimeEventsToSource(partyId: string) {
    const state = this.getOrCreatePartyState(partyId);

    if (!state.source || state.pendingRealtimeEvents.length === 0) {
      return;
    }

    const pendingRealtimeEvents = state.pendingRealtimeEvents.splice(0);
    const messages = applyRealtimeEventsToMessages(
      state.source.messages,
      pendingRealtimeEvents,
    );

    state.source = {
      ...state.source,
      latestAccountData: resolveLatestAccountData(messages),
      messages,
    };
    this.publishPartyState(partyId);
  }

  private retainPendingMessageMutation(
    state: PartyChatState,
    message: ChatMessageResponseDto,
  ) {
    const pendingMessage = state.pendingMessageMutations.get(message.id);

    state.pendingMessageMutations.set(
      message.id,
      pendingMessage
        ? selectNewestChatMessage(pendingMessage, message)
        : message,
    );
  }

  private resolvePendingMessageMutation(
    state: PartyChatState,
    message: ChatMessageResponseDto,
  ) {
    const pendingMessage = state.pendingMessageMutations.get(message.id);

    return pendingMessage
      ? selectNewestChatMessage(message, pendingMessage)
      : message;
  }

  private applyMessageMutation(
    partyId: string,
    message: ChatMessageResponseDto,
  ): TaxiChatSourceData | null {
    const state = this.getOrCreatePartyState(partyId);
    const source = state.source;

    if (!source) {
      return null;
    }

    const messageIndex = source.messages.findIndex(
      item => item.id === message.id,
    );

    if (messageIndex < 0) {
      return clonePartySource(source);
    }

    const messages = [...source.messages];
    messages[messageIndex] = selectNewestChatMessage(
      messages[messageIndex],
      mapTaxiChatMessageDto(this.resolvePendingMessageMutation(state, message)),
    );
    state.pendingMessageMutations.delete(message.id);
    state.source = {
      ...source,
      latestAccountData: resolveLatestAccountData(messages),
      messages,
    };
    this.publishPartyState(partyId);

    return clonePartySource(state.source);
  }

  private async handleIncomingMessage(partyId: string, frame: StompFrame) {
    const message = this.parseFrameBody<ChatMessageResponseDto>(frame);

    if (!message) {
      await this.loadPartyChat(partyId, true);
      return;
    }

    const state = this.getOrCreatePartyState(partyId);
    const mappedMessage = mapTaxiChatMessageDto(message);
    const specialMessageKey = this.buildSpecialMessageKey(partyId);

    if (state.loadPromise || !state.source) {
      state.pendingRealtimeEvents.push({message, type: 'message'});

      if (mappedMessage.type === 'account') {
        this.clearPendingSpecialMessageRequest(specialMessageKey);
      }

      if (!state.loadPromise) {
        await this.loadPartyChat(partyId, true);
      }

      return;
    }

    if (state.source.messages.some(item => item.id === message.id)) {
      if (mappedMessage.type === 'account') {
        this.clearPendingSpecialMessageRequest(specialMessageKey);
      }
      return;
    }

    state.source = {
      ...state.source,
      latestAccountData: resolveLatestAccountData([
        ...state.source.messages,
        mappedMessage,
      ]),
      messages: [...state.source.messages, mappedMessage],
    };
    this.publishPartyState(partyId);

    if (mappedMessage.type === 'account') {
      this.clearPendingSpecialMessageRequest(specialMessageKey);
    }
    await this.markLatestMessageAsRead(partyId, message.createdAt);
  }

  private handleIncomingMessageMutation(partyId: string, frame: StompFrame) {
    const payload =
      this.parseFrameBody<ChatMessageMutationEventResponseDto>(frame);

    if (!payload?.message?.id) {
      return;
    }

    const state = this.getOrCreatePartyState(partyId);
    this.retainPendingMessageMutation(state, payload.message);

    if (state.loadPromise || !state.source) {
      state.pendingRealtimeEvents.push({
        message: payload.message,
        type: 'mutation',
      });

      if (!state.loadPromise) {
        this.loadPartyChat(partyId, true).catch(() => undefined);
      }
      return;
    }

    if (
      state.loadingOlderPromise &&
      !state.source.messages.some(message => message.id === payload.message.id)
    ) {
      return;
    }

    this.applyMessageMutation(partyId, payload.message);
  }

  private async loadReconciliationBridge(
    partyId: string,
    previousMessages: TaxiChatSourceData['messages'],
    initialPage: {
      hasNext: boolean;
      nextCursor?: ChatMessageCursorResponseDto | null;
    },
  ) {
    let bridgeMessages: ChatMessageResponseDto[] = [];
    let cursor = initialPage.nextCursor ?? null;
    let hasNext = initialPage.hasNext;

    while (
      cursor &&
      hasNext &&
      bridgeMessages.length < MAX_RECONCILIATION_BRIDGE_MESSAGES
    ) {
      const response = await taxiChatApiClient.getMessages(
        resolveTaxiChatRoomId(partyId),
        {
          cursorCreatedAt: cursor.createdAt,
          cursorId: cursor.id,
          size: MESSAGES_PAGE_SIZE,
        },
      );

      if (response.data.messages.length === 0) {
        return null;
      }

      const sortedPageMessages = [...response.data.messages].reverse();
      bridgeMessages = mergeVersionedMessages(
        sortedPageMessages,
        bridgeMessages,
      );

      if (hasOverlappingMessageId(previousMessages, sortedPageMessages)) {
        return bridgeMessages;
      }

      cursor = response.data.nextCursor ?? null;
      hasNext = response.data.hasNext;
    }

    return null;
  }

  private async loadPartyChat(
    partyId: string,
    forceRefresh: boolean,
  ): Promise<TaxiChatSourceData | null> {
    const state = this.getOrCreatePartyState(partyId);

    if (!forceRefresh && state.source) {
      return state.source;
    }

    if (state.loadPromise) {
      return state.loadPromise;
    }

    const chatRoomId = resolveTaxiChatRoomId(partyId);

    state.loadPromise = Promise.all([
      taxiHomeApiClient.getParty(partyId),
      taxiChatApiClient.getChatRoom(chatRoomId),
      taxiChatApiClient.getMessages(chatRoomId, {
        size: MESSAGES_PAGE_SIZE,
      }),
    ])
      .then(async ([partyResponse, roomResponse, messagesResponse]) => {
        const initialPreviousSource = state.source;
        const initialPreviousMessages = initialPreviousSource?.messages ?? [];
        let shouldPreserveLoadedHistory = Boolean(initialPreviousSource);
        let bridgeMessages: ChatMessageResponseDto[] = [];

        if (
          initialPreviousSource &&
          !hasOverlappingMessageId(
            initialPreviousMessages,
            messagesResponse.data.messages,
          )
        ) {
          const loadedBridgeMessages = await this.loadReconciliationBridge(
            partyId,
            initialPreviousMessages,
            messagesResponse.data,
          );

          if (loadedBridgeMessages) {
            bridgeMessages = loadedBridgeMessages;
          } else {
            shouldPreserveLoadedHistory = false;
          }
        }

        const fetchedMessages = [
          ...bridgeMessages,
          ...[...messagesResponse.data.messages].reverse(),
        ].map(message => this.resolvePendingMessageMutation(state, message));
        const refreshedSource = buildTaxiChatSourceData({
          messages: messagesResponse.data.messages,
          party: partyResponse.data,
          room: roomResponse.data,
        });
        const previousSource = state.source;
        const previousMessages = previousSource?.messages ?? [];
        const mergedSnapshotMessages = shouldPreserveLoadedHistory
          ? mergeVersionedMessages(
              previousMessages,
              fetchedMessages.map(mapTaxiChatMessageDto),
            )
          : fetchedMessages.map(mapTaxiChatMessageDto);
        const pendingRealtimeEvents = state.pendingRealtimeEvents.splice(0);
        const mergedMessages = applyRealtimeEventsToMessages(
          mergedSnapshotMessages,
          pendingRealtimeEvents,
        );
        const latestAccountData = resolveLatestAccountData(mergedMessages);

        fetchedMessages.forEach(message => {
          state.pendingMessageMutations.delete(message.id);
        });

        if (!shouldPreserveLoadedHistory) {
          state.olderCursor = messagesResponse.data.nextCursor ?? null;
          state.hasOlderMessages = messagesResponse.data.hasNext;
        }

        const source: TaxiChatSourceData = {
          ...refreshedSource,
          hasOlderMessages: state.hasOlderMessages,
          latestAccountData,
          loadingOlderMessages: previousSource?.loadingOlderMessages ?? false,
          messages: mergedMessages,
        };

        state.source = source;
        this.publishPartyState(partyId);

        const latestMessage =
          source.messages[source.messages.length - 1]?.createdAt;

        if (latestMessage && state.subscribers.size > 0) {
          this.markLatestMessageAsRead(partyId, latestMessage).catch(
            () => undefined,
          );
        }

        return source;
      })
      .catch(error => {
        this.applyPendingRealtimeEventsToSource(partyId);
        throw error;
      })
      .finally(() => {
        state.loadPromise = null;
      });

    return state.loadPromise;
  }

  private hasActiveSubscribers() {
    return [...this.partyStates.values()].some(
      state => state.subscribers.size > 0,
    );
  }

  private clearStompConnectTimeout() {
    if (!this.stompConnectTimeoutHandle) {
      return;
    }

    clearTimeout(this.stompConnectTimeoutHandle);
    this.stompConnectTimeoutHandle = null;
  }

  private cancelStompConnectionAttempt(client: MinimalStompClient) {
    const attempt = this.stompConnectionAttempt;

    if (attempt?.client !== client) {
      return;
    }

    attempt.cancel();
  }

  private clearStompConnectionAttempt(
    client: MinimalStompClient,
    generation: number,
  ) {
    if (
      this.stompConnectionAttempt?.client === client &&
      this.stompConnectionAttempt.generation === generation
    ) {
      this.stompConnectionAttempt = null;
    }
  }

  private isSubscribedCallback(
    partyId: string,
    state: PartyChatState,
    callbacks: SubscriptionCallbacks<TaxiChatSourceData | null>,
  ) {
    return (
      this.partyStates.get(partyId) === state &&
      state.subscribers.has(callbacks)
    );
  }

  private isCurrentStompClient(client: MinimalStompClient, generation: number) {
    return (
      this.stompClient === client && this.stompClientGeneration === generation
    );
  }

  private markLatestMessageAsRead(partyId: string, lastReadAt?: string) {
    if (!lastReadAt) {
      return Promise.resolve();
    }

    return taxiChatApiClient
      .markAsRead(resolveTaxiChatRoomId(partyId), lastReadAt)
      .catch(error => {
        console.warn('채팅 읽음 상태를 갱신하지 못했습니다.', error);
      });
  }

  private notifyPartySubscribers(error: RepositoryError) {
    this.partyStates.forEach(state => {
      if (state.subscribers.size === 0) {
        return;
      }

      state.subscribers.forEach(callbacks => {
        callbacks.onError(error);
      });
    });
  }

  private parseFrameBody<T>(frame: {body: string}): T | null {
    if (!frame.body) {
      return null;
    }

    try {
      return JSON.parse(frame.body) as T;
    } catch {
      return null;
    }
  }

  private publishPartyState(partyId: string) {
    const state = this.partyStates.get(partyId);

    if (!state || !state.source || state.subscribers.size === 0) {
      return;
    }

    state.subscribers.forEach(callbacks => {
      callbacks.onData(clonePartySource(state.source!));
    });
  }
}
