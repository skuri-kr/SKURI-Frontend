import {act, renderHook, waitFor} from '@testing-library/react-native';

import type {IChatRepository} from '../../data/repositories/IChatRepository';
import type {ChatMessage} from '../../model/types';
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
      subscribeToNewMessages: jest.fn(() => jest.fn()),
    };

    mockedUseChatRepository.mockReturnValue(
      repository as unknown as IChatRepository,
    );

    const {result} = renderHook(() =>
      useChatMessages('public:game:minecraft'),
    );

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
});
