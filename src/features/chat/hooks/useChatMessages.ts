import {useCallback, useEffect, useRef, useState} from 'react';

import type {ChatMessage} from '../model/types';

import {useChatRepository} from './useChatRepository';

const MESSAGES_PER_PAGE = 30;

type BufferedRealtimeEvent =
  | {messages: ChatMessage[]; type: 'new-messages'}
  | {message: ChatMessage; type: 'mutation'};

const appendNewMessages = (
  messages: ChatMessage[],
  newMessages: ChatMessage[],
) => {
  const existingIds = new Set(messages.map(message => message.id));
  const uniqueNewMessages = newMessages.filter(
    message => !existingIds.has(message.id),
  );

  return uniqueNewMessages.length > 0
    ? [...messages, ...uniqueNewMessages]
    : messages;
};

const toMessageIdSet = (messages: ChatMessage[]) =>
  new Set(
    messages.flatMap(message => (message.id ? [message.id] : [])),
  );

const applyBufferedRealtimeEvents = (
  messages: ChatMessage[],
  events: BufferedRealtimeEvent[],
) =>
  events.reduce<ChatMessage[]>((currentMessages, event) => {
    if (event.type === 'new-messages') {
      return appendNewMessages(currentMessages, event.messages);
    }

    return replaceChatMessageById(currentMessages, event.message);
  }, messages);

const mergeSnapshotWithLoadedHistory = (
  previousMessages: ChatMessage[],
  snapshotMessages: ChatMessage[],
  preserveLoadedHistory: boolean,
) => {
  if (!preserveLoadedHistory) {
    return snapshotMessages;
  }

  const snapshotMessageById = new Map(
    snapshotMessages.map(message => [message.id, message]),
  );
  const previousMessageIds = new Set(
    previousMessages.map(message => message.id),
  );

  return [
    ...previousMessages.map(
      message => snapshotMessageById.get(message.id) ?? message,
    ),
    ...snapshotMessages.filter(message => !previousMessageIds.has(message.id)),
  ];
};

export interface UseChatMessagesResult {
  applyMessageMutation: (message: ChatMessage) => void;
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const replaceChatMessageById = (
  messages: ChatMessage[],
  nextMessage: ChatMessage,
) => {
  const messageIndex = messages.findIndex(
    message => message.id === nextMessage.id,
  );

  if (messageIndex < 0) {
    return messages;
  }

  const nextMessages = [...messages];
  nextMessages[messageIndex] = nextMessage;

  return nextMessages;
};

export const useChatMessages = (
  chatRoomId: string | undefined,
  enabled: boolean = true,
): UseChatMessagesResult => {
  const chatRepository = useChatRepository();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const oldestCursorRef = useRef<unknown>(null);
  const isLoadingOlderPageRef = useRef(false);
  const loadedMessageIdsRef = useRef(new Set<string>());
  const pendingOlderPageMutationsRef = useRef(new Map<string, ChatMessage>());
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const hasLoadedOlderMessagesRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(async () => {
    setReloadToken(currentValue => currentValue + 1);
  }, []);

  const applyMessageMutation = useCallback((message: ChatMessage) => {
    if (
      isLoadingOlderPageRef.current &&
      message.id &&
      !loadedMessageIdsRef.current.has(message.id)
    ) {
      pendingOlderPageMutationsRef.current.set(message.id, message);
    }

    setMessages(previousMessages => {
      const nextMessages = replaceChatMessageById(previousMessages, message);

      loadedMessageIdsRef.current = toMessageIdSet(nextMessages);

      return nextMessages;
    });
  }, []);

  const loadInitialMessages = useCallback(
    async (roomId: string, loadGeneration: number) => {
      let bufferingRealtimeEvents = true;
      let resolveInitialLoadFinished: (() => void) | undefined;
      const initialLoadFinishedPromise = new Promise<void>(resolve => {
        resolveInitialLoadFinished = resolve;
      });
      const bufferedRealtimeEvents: BufferedRealtimeEvent[] = [];
      let hasInitialSnapshot = false;
      let hasScheduledInitialReconciliation = false;
      let reconciliationPromise = Promise.resolve();
      const isCurrentLoad = () =>
        isMountedRef.current && loadGenerationRef.current === loadGeneration;

      const retainUnknownMutationForLoadingPage = (message: ChatMessage) => {
        if (
          isLoadingOlderPageRef.current &&
          message.id &&
          !loadedMessageIdsRef.current.has(message.id)
        ) {
          pendingOlderPageMutationsRef.current.set(message.id, message);
        }
      };

      const applyRealtimeEvent = (event: BufferedRealtimeEvent) => {
        if (!isCurrentLoad()) {
          return;
        }

        if (event.type === 'mutation') {
          retainUnknownMutationForLoadingPage(event.message);
        }

        if (bufferingRealtimeEvents) {
          bufferedRealtimeEvents.push(event);
          return;
        }

        setMessages(previousMessages => {
          const nextMessages = applyBufferedRealtimeEvents(previousMessages, [
            event,
          ]);
          loadedMessageIdsRef.current = toMessageIdSet(nextMessages);

          return nextMessages;
        });
      };

      const resumeRealtimeEvents = () => {
        const pendingEvents = bufferedRealtimeEvents.splice(0);
        bufferingRealtimeEvents = false;

        if (pendingEvents.length === 0) {
          return;
        }

        setMessages(previousMessages => {
          const nextMessages = applyBufferedRealtimeEvents(
            previousMessages,
            pendingEvents,
          );
          loadedMessageIdsRef.current = toMessageIdSet(nextMessages);

          return nextMessages;
        });
      };

      const applySnapshot = (
        result: Awaited<ReturnType<typeof chatRepository.getInitialMessages>>,
        preserveLoadedHistory: boolean,
      ) => {
        const sortedMessages = [...result.data].reverse();
        const pendingEvents = bufferedRealtimeEvents.splice(0);

        bufferingRealtimeEvents = false;
        setMessages(previousMessages => {
          const nextMessages = applyBufferedRealtimeEvents(
            mergeSnapshotWithLoadedHistory(
              previousMessages,
              sortedMessages,
              preserveLoadedHistory,
            ),
            pendingEvents,
          );
          loadedMessageIdsRef.current = toMessageIdSet(nextMessages);

          return nextMessages;
        });
        setError(null);

        if (!preserveLoadedHistory) {
          setHasMore(result.hasMore);
          oldestCursorRef.current = result.cursor;
        }
      };

      const reconcileAfterRealtimeReady = () => {
        const nextReconciliation = reconciliationPromise
          .catch(() => undefined)
          .then(async () => {
            await initialLoadFinishedPromise;

            if (!isCurrentLoad()) {
              return;
            }

            bufferingRealtimeEvents = true;

            try {
              const result = await chatRepository.getInitialMessages(
                roomId,
                MESSAGES_PER_PAGE,
              );

              if (!isCurrentLoad()) {
                return;
              }

              applySnapshot(
                result,
                hasInitialSnapshot && hasLoadedOlderMessagesRef.current,
              );
              hasInitialSnapshot = true;
            } catch (reconciliationError) {
              if (isCurrentLoad()) {
                resumeRealtimeEvents();
                console.error(
                  '실시간 구독 후 메시지 보정 실패:',
                  reconciliationError,
                );
              }
            }
          });

        reconciliationPromise = nextReconciliation.catch(() => undefined);
        return nextReconciliation;
      };

      try {
        setLoading(true);
        setError(null);

        realtimeUnsubscribeRef.current?.();
        const subscription = chatRepository.subscribeToNewMessages(
          roomId,
          null,
          {
            onNewMessages: newMessages => {
              applyRealtimeEvent({
                messages: newMessages,
                type: 'new-messages',
              });
            },
            onMessageMutation: message => {
              applyRealtimeEvent({message, type: 'mutation'});
            },
            onError: err => {
              console.error('실시간 메시지 구독 실패:', err);
            },
            onRealtimeReady: () => {
              if (!hasScheduledInitialReconciliation) {
                hasScheduledInitialReconciliation = true;
              }

              reconcileAfterRealtimeReady().catch(() => undefined);
            },
          },
        );
        realtimeUnsubscribeRef.current = subscription.unsubscribe;

        subscription.ready
          .then(() => {
            if (hasScheduledInitialReconciliation) {
              return;
            }

            hasScheduledInitialReconciliation = true;
            return reconcileAfterRealtimeReady();
          })
          .catch(subscriptionError => {
            if (isCurrentLoad()) {
              resumeRealtimeEvents();
              console.error(
                '실시간 메시지 구독 준비 실패:',
                subscriptionError,
              );
            }
          });

        const result = await chatRepository.getInitialMessages(
          roomId,
          MESSAGES_PER_PAGE,
        );

        if (!isCurrentLoad()) {
          return;
        }

        applySnapshot(result, false);
        hasInitialSnapshot = true;
      } catch (err) {
        console.error('초기 메시지 로드 실패:', err);
        if (isCurrentLoad()) {
          setError(err as Error);
        }
      } finally {
        resolveInitialLoadFinished?.();

        if (isCurrentLoad()) {
          setLoading(false);
        }
      }
    },
    [chatRepository],
  );

  const loadMore = useCallback(async () => {
    if (!chatRoomId || loadingMore || !hasMore || !oldestCursorRef.current) {
      return;
    }

    try {
      setLoadingMore(true);
      isLoadingOlderPageRef.current = true;

      const result = await chatRepository.getOlderMessages(
        chatRoomId,
        oldestCursorRef.current,
        MESSAGES_PER_PAGE,
      );

      if (!isMountedRef.current) {
        return;
      }

      if (result.data.length === 0) {
        setHasMore(false);
        return;
      }

      const sortedMessages = [...result.data]
        .reverse()
        .map(
          message =>
            (message.id
              ? pendingOlderPageMutationsRef.current.get(message.id)
              : undefined) ?? message,
        );

      result.data.forEach(message => {
        if (message.id) {
          pendingOlderPageMutationsRef.current.delete(message.id);
        }
      });

      setMessages(prevMessages => {
        const existingIds = new Set(prevMessages.map(message => message.id));
        const uniqueMessages = sortedMessages.filter(
          message => !existingIds.has(message.id),
        );

        if (uniqueMessages.length === 0) {
          setHasMore(false);
          return prevMessages;
        }

        hasLoadedOlderMessagesRef.current = true;
        const nextMessages = [...uniqueMessages, ...prevMessages];
        loadedMessageIdsRef.current = toMessageIdSet(nextMessages);

        return nextMessages;
      });

      oldestCursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('이전 메시지 로드 실패:', err);
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      isLoadingOlderPageRef.current = false;
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [chatRepository, chatRoomId, hasMore, loadingMore]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadGeneration = ++loadGenerationRef.current;

    if (!chatRoomId || !enabled) {
      setMessages([]);
      setError(null);
      setLoading(false);
      setHasMore(true);
      oldestCursorRef.current = null;
      isLoadingOlderPageRef.current = false;
      loadedMessageIdsRef.current.clear();
      pendingOlderPageMutationsRef.current.clear();
      hasLoadedOlderMessagesRef.current = false;
      realtimeUnsubscribeRef.current?.();
      realtimeUnsubscribeRef.current = null;
      return;
    }

    hasLoadedOlderMessagesRef.current = false;
    isLoadingOlderPageRef.current = false;
    loadedMessageIdsRef.current.clear();
    pendingOlderPageMutationsRef.current.clear();
    loadInitialMessages(chatRoomId, loadGeneration);

    return () => {
      isMountedRef.current = false;
      realtimeUnsubscribeRef.current?.();
      realtimeUnsubscribeRef.current = null;
    };
  }, [chatRoomId, enabled, loadInitialMessages, reloadToken]);

  return {
    applyMessageMutation,
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
};
