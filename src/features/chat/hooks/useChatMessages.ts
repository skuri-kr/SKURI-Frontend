import {useCallback, useEffect, useRef, useState} from 'react';

import type {ChatMessage} from '../model/types';

import {useChatRepository} from './useChatRepository';

const MESSAGES_PER_PAGE = 30;

const toTimestamp = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return null;
};

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
  const newestTimestampRef = useRef<unknown>(null);
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const hasLoadedOlderMessagesRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(async () => {
    setReloadToken(currentValue => currentValue + 1);
  }, []);

  const applyMessageMutation = useCallback((message: ChatMessage) => {
    setMessages(previousMessages =>
      replaceChatMessageById(previousMessages, message),
    );
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
      const isCurrentLoad = () =>
        isMountedRef.current && loadGenerationRef.current === loadGeneration;

      const applyRealtimeEvent = (event: BufferedRealtimeEvent) => {
        if (!isCurrentLoad()) {
          return;
        }

        if (bufferingRealtimeEvents) {
          bufferedRealtimeEvents.push(event);
          return;
        }

        setMessages(previousMessages => {
          const nextMessages = applyBufferedRealtimeEvents(previousMessages, [
            event,
          ]);

          newestTimestampRef.current =
            nextMessages[nextMessages.length - 1]?.createdAt ?? null;

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
          const oldestSnapshotTimestamp = toTimestamp(
            sortedMessages[0]?.createdAt,
          );
          const olderMessages =
            preserveLoadedHistory && oldestSnapshotTimestamp !== null
              ? previousMessages.filter(
                  message => {
                    const messageTimestamp = toTimestamp(message.createdAt);

                    return (
                      messageTimestamp !== null &&
                      messageTimestamp < oldestSnapshotTimestamp
                    );
                  },
                )
              : [];
          const nextMessages = applyBufferedRealtimeEvents(
            [...olderMessages, ...sortedMessages],
            pendingEvents,
          );

          newestTimestampRef.current =
            nextMessages[nextMessages.length - 1]?.createdAt ?? null;

          return nextMessages;
        });

        if (!preserveLoadedHistory) {
          setHasMore(result.hasMore);
          oldestCursorRef.current = result.cursor;
        }
      };

      const reconcileAfterRealtimeReady = async () => {
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
        } catch (error) {
          if (isCurrentLoad()) {
            console.error('실시간 구독 후 메시지 보정 실패:', error);
          }
        }
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
          },
        );
        realtimeUnsubscribeRef.current = subscription.unsubscribe;

        void subscription.ready
          .then(reconcileAfterRealtimeReady)
          .catch(error => {
            if (isCurrentLoad()) {
              console.error('실시간 메시지 구독 준비 실패:', error);
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

      const sortedMessages = [...result.data].reverse();

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

        return [...uniqueMessages, ...prevMessages];
      });

      oldestCursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('이전 메시지 로드 실패:', err);
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
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
      newestTimestampRef.current = null;
      hasLoadedOlderMessagesRef.current = false;
      realtimeUnsubscribeRef.current?.();
      realtimeUnsubscribeRef.current = null;
      return;
    }

    hasLoadedOlderMessagesRef.current = false;
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
