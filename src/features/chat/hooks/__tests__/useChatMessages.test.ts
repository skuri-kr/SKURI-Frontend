import {act, renderHook, waitFor} from '@testing-library/react-native';

import type {IChatRepository} from '../../data/repositories/IChatRepository';
import type {
  ChatMessage,
  MessageSubscriptionCallbacks,
} from '../../model/types';
import {useChatMessages} from '../useChatMessages';
import {useChatRepository} from '../useChatRepository';

jest.mock('../useChatRepository', () => ({
  useChatRepository: jest.fn(),
}));

const mockedUseChatRepository = jest.mocked(useChatRepository);

const createMessage = (id: string, createdAt: string): ChatMessage => ({
  createdAt,
  id,
  senderId: 'member-1',
  senderName: '테스터',
  text: id,
  type: 'text',
});

const createDeferred = <T,>() => {
  let reject: (error: Error) => void;
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject: reject!, resolve: resolve!};
};

const createReadySubscription = () => ({
  ready: Promise.resolve(),
  unsubscribe: jest.fn(),
});

describe('useChatMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('이전 메시지 커서를 갱신하며 마지막 페이지까지 계속 불러온다', async () => {
    const firstCursor = {
      createdAt: '2026-08-11T10:03:00',
      id: 'message-4',
    };
    const secondCursor = {
      createdAt: '2026-08-11T10:01:00',
      id: 'message-2',
    };
    const repository = {
      getInitialMessages: jest.fn().mockResolvedValue({
        cursor: firstCursor,
        data: [
          createMessage('message-5', '2026-08-11T10:04:00'),
          createMessage('message-4', '2026-08-11T10:03:00'),
        ],
        hasMore: true,
      }),
      getOlderMessages: jest
        .fn()
        .mockResolvedValueOnce({
          cursor: secondCursor,
          data: [
            createMessage('message-3', '2026-08-11T10:02:00'),
            createMessage('message-2', '2026-08-11T10:01:00'),
          ],
          hasMore: true,
        })
        .mockResolvedValueOnce({
          cursor: null,
          data: [createMessage('message-1', '2026-08-11T10:00:00')],
          hasMore: false,
        }),
      subscribeToNewMessages: jest.fn(createReadySubscription),
    };

    mockedUseChatRepository.mockReturnValue(
      repository as unknown as IChatRepository,
    );

    const {result} = renderHook(() => useChatMessages('public:game:minecraft'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages.map(message => message.id)).toEqual([
        'message-4',
        'message-5',
      ]);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(repository.getOlderMessages).toHaveBeenNthCalledWith(
      1,
      'public:game:minecraft',
      firstCursor,
      30,
    );
    expect(result.current.messages.map(message => message.id)).toEqual([
      'message-2',
      'message-3',
      'message-4',
      'message-5',
    ]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(repository.getOlderMessages).toHaveBeenNthCalledWith(
      2,
      'public:game:minecraft',
      secondCursor,
      30,
    );
    expect(result.current.messages.map(message => message.id)).toEqual([
      'message-1',
      'message-2',
      'message-3',
      'message-4',
      'message-5',
    ]);
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(repository.getOlderMessages).toHaveBeenCalledTimes(2);
  });

  it('수정 또는 삭제 이벤트는 같은 ID의 기존 메시지만 제자리에서 교체한다', async () => {
    let callbacks: MessageSubscriptionCallbacks | undefined;
    const repository = {
      getInitialMessages: jest.fn().mockResolvedValue({
        cursor: null,
        data: [
          createMessage('message-2', '2026-08-11T10:02:00'),
          createMessage('message-1', '2026-08-11T10:01:00'),
        ],
        hasMore: false,
      }),
      getOlderMessages: jest.fn(),
      subscribeToNewMessages: jest.fn(
        (
          _roomId: string,
          _timestamp: unknown,
          nextCallbacks: MessageSubscriptionCallbacks,
        ) => {
          callbacks = nextCallbacks;
          return createReadySubscription();
        },
      ),
    };

    mockedUseChatRepository.mockReturnValue(
      repository as unknown as IChatRepository,
    );

    const {result} = renderHook(() => useChatMessages('public:game:minecraft'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      callbacks?.onMessageMutation({
        ...createMessage('message-1', '2026-08-11T10:01:00'),
        editedAt: '2026-08-11T10:03:00',
        text: '수정된 메시지',
      });
      callbacks?.onMessageMutation(
        createMessage('not-loaded-yet', '2026-08-11T09:59:00'),
      );
    });

    expect(result.current.messages.map(message => message.id)).toEqual([
      'message-1',
      'message-2',
    ]);
    expect(result.current.messages[0]?.text).toBe('수정된 메시지');
    expect(result.current.messages[0]?.editedAt).toBe('2026-08-11T10:03:00');
  });

  it('실시간 구독 준비 후 최신 스냅샷과 그 사이 이벤트를 함께 반영한다', async () => {
    const initialSnapshot = createDeferred<{
      cursor: null;
      data: ChatMessage[];
      hasMore: boolean;
    }>();
    const reconciliationSnapshot = createDeferred<{
      cursor: null;
      data: ChatMessage[];
      hasMore: boolean;
    }>();
    const subscriptionReady = createDeferred<void>();
    let callbacks: MessageSubscriptionCallbacks | undefined;
    const repository = {
      getInitialMessages: jest
        .fn()
        .mockReturnValueOnce(initialSnapshot.promise)
        .mockReturnValueOnce(reconciliationSnapshot.promise),
      getOlderMessages: jest.fn(),
      subscribeToNewMessages: jest.fn(
        (
          _roomId: string,
          _timestamp: unknown,
          nextCallbacks: MessageSubscriptionCallbacks,
        ) => {
          callbacks = nextCallbacks;

          return {
            ready: subscriptionReady.promise,
            unsubscribe: jest.fn(),
          };
        },
      ),
    };

    mockedUseChatRepository.mockReturnValue(
      repository as unknown as IChatRepository,
    );

    const {result} = renderHook(() => useChatMessages('public:game:minecraft'));

    await waitFor(() => {
      expect(repository.getInitialMessages).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      initialSnapshot.resolve({
        cursor: null,
        data: [createMessage('message-1', '2026-08-11T10:01:00')],
        hasMore: false,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages[0]?.text).toBe('message-1');
    });

    await act(async () => {
      subscriptionReady.resolve();
    });

    await waitFor(() => {
      expect(repository.getInitialMessages).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      callbacks?.onMessageMutation({
        ...createMessage('message-1', '2026-08-11T10:01:00'),
        editedAt: '2026-08-11T10:03:00',
        text: '수정된 메시지',
      });
      callbacks?.onNewMessages([
        createMessage('message-2', '2026-08-11T10:02:00'),
      ]);
      reconciliationSnapshot.resolve({
        cursor: null,
        data: [createMessage('message-1', '2026-08-11T10:01:00')],
        hasMore: false,
      });
    });

    await waitFor(() => {
      expect(result.current.messages.map(message => message.id)).toEqual([
        'message-1',
        'message-2',
      ]);
      expect(result.current.messages[0]?.text).toBe('수정된 메시지');
    });
  });
});
