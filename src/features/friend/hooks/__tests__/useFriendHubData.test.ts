import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';
import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_INBOX_COUNTS_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';

import {useFriendHubData} from '../useFriendHubData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);
const mockedInvalidateData = jest.mocked(invalidateData);

const createRepository = () => ({
  acceptFriendRequest: jest.fn(),
  blockMember: jest.fn(),
  cancelFriendRequest: jest.fn(),
  createFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  getBlocks: jest.fn(),
  getFriend: jest.fn(),
  getFriendRequests: jest.fn().mockImplementation(({cursor, direction}) => {
    if (direction === 'RECEIVED' && cursor === 'received-cursor') {
      return Promise.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T12:00:00',
            department: null,
            expiresAt: '2026-09-17T12:00:00',
            friend: {
              department: null,
              id: 'friend-2',
              nickname: '나래',
              photoUrl: null,
            },
            id: 'request-2',
          },
        ],
        nextCursor: null,
      });
    }

    if (direction === 'RECEIVED') {
      return Promise.resolve({
        hasNext: true,
        items: [
          {
            createdAt: '2026-08-18T11:00:00',
            department: '컴퓨터공학과',
            expiresAt: '2026-09-17T11:00:00',
            friend: {
              department: '컴퓨터공학과',
              id: 'friend-1',
              nickname: '가람',
              photoUrl: null,
            },
            id: 'request-1',
          },
        ],
        nextCursor: 'received-cursor',
      });
    }

    return Promise.resolve({hasNext: false, items: [], nextCursor: null});
  }),
  getFriends: jest.fn().mockResolvedValue([]),
  getInboxCounts: jest.fn().mockResolvedValue({
    chatRoomInvitationCount: 0,
    incomingRequestCount: 1,
    partyInvitationCount: 0,
    totalActionCount: 1,
  }),
  getMyCode: jest.fn(),
  getMyPrivacy: jest.fn(),
  previewFriendCode: jest.fn(),
  regenerateMyCode: jest.fn(),
  removeFriend: jest.fn(),
  searchFriends: jest.fn(),
  unblockMember: jest.fn(),
  updateFavorite: jest.fn(),
  updateMyPrivacy: jest.fn(),
});

const friend = {
  department: null,
  favorite: false,
  id: 'friend-1',
  nickname: '가람',
  photoUrl: null,
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
};

describe('useFriendHubData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('받은 친구 요청의 opaque cursor 다음 페이지를 기존 목록 뒤에 이어 붙인다', async () => {
    const repository = createRepository();
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequests).toHaveLength(1);
      expect(result.current.receivedNextCursor).toBe('received-cursor');
    });

    await act(async () => {
      await result.current.loadMoreRequests('RECEIVED');
    });

    expect(repository.getFriendRequests).toHaveBeenLastCalledWith({
      cursor: 'received-cursor',
      direction: 'RECEIVED',
      size: 20,
    });
    expect(result.current.receivedRequests.map(item => item.id)).toEqual([
      'request-1',
      'request-2',
    ]);
    expect(result.current.receivedNextCursor).toBeNull();
  });

  it('새로고침이 실패해도 이전에 불러온 친구 허브 데이터를 유지한다', async () => {
    const repository = createRepository();
    repository.getFriends
      .mockResolvedValueOnce([
        {
          department: null,
          favorite: false,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
      ])
      .mockRejectedValueOnce(new Error('network unavailable'));
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
      expect(result.current.friends).toHaveLength(1);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBe('network unavailable');
    expect(result.current.hasLoadedOnce).toBe(true);
    expect(result.current.friends).toEqual([
      {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
    ]);
  });

  it('요청 수 조회가 실패해도 마지막으로 성공한 받은 요청 수를 유지한다', async () => {
    const repository = createRepository();
    repository.getInboxCounts
      .mockResolvedValueOnce({
        chatRoomInvitationCount: 0,
        incomingRequestCount: 31,
        partyInvitationCount: 0,
        totalActionCount: 31,
      })
      .mockRejectedValueOnce(new Error('network unavailable'));
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.incomingRequestCount).toBe(31);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.incomingRequestCount).toBe(31);
  });

  it('초기 조회에서 한 요청 방향이 실패해도 성공한 친구 목록을 유지한다', async () => {
    const repository = createRepository();
    repository.getFriends.mockResolvedValue([friend]);
    repository.getFriendRequests.mockImplementation(({direction}) =>
      direction === 'RECEIVED'
        ? Promise.reject(new Error('received unavailable'))
        : Promise.resolve({hasNext: false, items: [], nextCursor: null}),
    );
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.hasLoadedFriends).toBe(true);
      expect(result.current.hasLoadedSentRequests).toBe(true);
      expect(result.current.receivedRequestsError).toBe('received unavailable');
    });

    expect(result.current.hasLoadedOnce).toBe(true);
    expect(result.current.friends).toEqual([friend]);
    expect(result.current.hasLoadedReceivedRequests).toBe(false);
  });

  it('느린 요청 목록 조회를 기다리지 않고 완료된 친구 목록을 먼저 표시한다', async () => {
    const repository = createRepository();
    const friends = createDeferred<Array<typeof friend>>();
    const receivedRequests = createDeferred<{
      hasNext: boolean;
      items: [];
      nextCursor: null;
    }>();
    const sentRequests = createDeferred<{
      hasNext: boolean;
      items: [];
      nextCursor: null;
    }>();
    const inboxCounts = createDeferred<{
      chatRoomInvitationCount: number;
      incomingRequestCount: number;
      partyInvitationCount: number;
      totalActionCount: number;
    }>();
    repository.getFriends.mockReturnValue(friends.promise);
    repository.getFriendRequests.mockImplementation(({direction}) =>
      direction === 'RECEIVED' ? receivedRequests.promise : sentRequests.promise,
    );
    repository.getInboxCounts.mockReturnValue(inboxCounts.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await act(async () => {
      friends.resolve([friend]);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.friends).toEqual([friend]);
      expect(result.current.hasLoadedFriends).toBe(true);
      expect(result.current.hasLoadedOnce).toBe(true);
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      receivedRequests.resolve({hasNext: false, items: [], nextCursor: null});
      sentRequests.resolve({hasNext: false, items: [], nextCursor: null});
      inboxCounts.resolve({
        chatRoomInvitationCount: 0,
        incomingRequestCount: 0,
        partyInvitationCount: 0,
        totalActionCount: 0,
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('친구 요청 수락 뒤 동기화 조회가 실패해도 수락한 요청을 다시 표시하지 않는다', async () => {
    const repository = createRepository();
    repository.getFriends
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('network unavailable'));
    repository.acceptFriendRequest.mockResolvedValue({
      friend,
      requestId: 'request-1',
      status: 'ACCEPTED',
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequests).toHaveLength(1);
    });

    await act(async () => {
      await result.current.acceptRequest('request-1');
    });

    expect(result.current.completedRequestActions.get('request-1')).toBe('ACCEPTED');
    expect(result.current.friends).toEqual([friend]);
    expect(mockedInvalidateData).toHaveBeenCalledWith(
      FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
    );

    await waitFor(() => {
      expect(result.current.error).toBe('network unavailable');
    });
    expect(result.current.completedRequestActions.get('request-1')).toBe('ACCEPTED');
    expect(result.current.friends).toEqual([friend]);
  });

  it('친구 요청 거절 성공 후 마이페이지 요청 수를 무효화한다', async () => {
    const repository = createRepository();
    repository.declineFriendRequest.mockResolvedValue(undefined);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequests).toHaveLength(1);
    });

    await act(async () => {
      await result.current.declineRequest('request-1');
    });

    expect(mockedInvalidateData).toHaveBeenCalledWith(
      FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
    );
  });

  it('진행 중인 새로고침이 즐겨찾기 변경을 이전 상태로 되돌리지 않는다', async () => {
    const repository = createRepository();
    const refreshFriends = createDeferred<Array<typeof friend>>();
    repository.getFriends
      .mockResolvedValueOnce([friend])
      .mockReturnValueOnce(refreshFriends.promise);
    repository.updateFavorite.mockResolvedValue(undefined);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.friends).toEqual([friend]);
    });

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = result.current.reload();
    });

    await act(async () => {
      await result.current.updateFavorite(friend);
    });

    await act(async () => {
      refreshFriends.resolve([friend]);
      await reloadPromise;
    });

    expect(result.current.friends).toEqual([{...friend, favorite: true}]);
  });

  it('즐겨찾기를 즉시 반영하고 저장 실패 시 원복한다', async () => {
    const repository = createRepository();
    const favoriteUpdate = createDeferred<void>();
    repository.getFriends.mockResolvedValue([friend]);
    repository.updateFavorite.mockReturnValue(favoriteUpdate.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.friends).toEqual([friend]);
    });

    let updatePromise!: Promise<void>;
    await act(async () => {
      updatePromise = result.current.updateFavorite(friend);
    });

    expect(result.current.friends).toEqual([{...friend, favorite: true}]);

    await act(async () => {
      favoriteUpdate.reject(new Error('network unavailable'));
      await expect(updatePromise).rejects.toThrow('network unavailable');
    });

    expect(result.current.friends).toEqual([friend]);
  });

  it('즐겨찾기 저장 중 시작한 새로고침이 저장된 상태를 되돌리지 않는다', async () => {
    const repository = createRepository();
    const favoriteUpdate = createDeferred<void>();
    const refreshFriends = createDeferred<Array<typeof friend>>();
    repository.getFriends
      .mockResolvedValueOnce([friend])
      .mockReturnValueOnce(refreshFriends.promise);
    repository.updateFavorite.mockReturnValue(favoriteUpdate.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.friends).toEqual([friend]);
    });

    let favoritePromise!: Promise<void>;
    let reloadPromise!: Promise<void>;
    await act(async () => {
      favoritePromise = result.current.updateFavorite(friend);
      reloadPromise = result.current.reloadFriends();
    });

    await act(async () => {
      favoriteUpdate.resolve(undefined);
      await favoritePromise;
      refreshFriends.resolve([friend]);
      await reloadPromise;
    });

    expect(result.current.friends).toEqual([{...friend, favorite: true}]);
  });

  it('요청 처리 결과를 1.2초간 표시한 뒤 요청 카드를 제거한다', async () => {
    jest.useFakeTimers();
    const repository = createRepository();
    repository.acceptFriendRequest.mockResolvedValue({
      friend,
      requestId: 'request-1',
      status: 'ACCEPTED',
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequests).toHaveLength(1);
    });

    await act(async () => {
      await result.current.acceptRequest('request-1');
    });

    expect(result.current.receivedRequests).toHaveLength(1);
    expect(result.current.completedRequestActions.get('request-1')).toBe('ACCEPTED');
    repository.getFriendRequests.mockResolvedValueOnce({
      hasNext: false,
      items: [],
      nextCursor: null,
    });

    await act(async () => {
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(result.current.receivedRequests).toEqual([]);
    expect(result.current.completedRequestActions.get('request-1')).toBeUndefined();
    expect(repository.getFriendRequests).toHaveBeenLastCalledWith({
      direction: 'RECEIVED',
      size: 20,
    });
    jest.useRealTimers();
  });

  it('즐겨찾기 변경 중에도 진행 중인 요청 다음 페이지를 이어 붙인다', async () => {
    const repository = createRepository();
    const nextPage = createDeferred<{
      hasNext: boolean;
      items: Array<{
        createdAt: string;
        department: string | null;
        expiresAt: string;
        friend: {department: string | null; id: string; nickname: string; photoUrl: string | null};
        id: string;
      }>;
      nextCursor: string | null;
    }>();
    repository.getFriends.mockResolvedValue([friend]);
    repository.getFriendRequests.mockImplementation(({cursor, direction}) => {
      if (direction === 'RECEIVED' && cursor === 'received-cursor') {
        return nextPage.promise;
      }
      if (direction === 'RECEIVED') {
        return Promise.resolve({
          hasNext: true,
          items: [
            {
              createdAt: '2026-08-18T11:00:00',
              department: null,
              expiresAt: '2026-09-17T11:00:00',
              friend: {department: null, id: 'friend-1', nickname: '가람', photoUrl: null},
              id: 'request-1',
            },
          ],
          nextCursor: 'received-cursor',
        });
      }
      return Promise.resolve({hasNext: false, items: [], nextCursor: null});
    });
    repository.updateFavorite.mockResolvedValue(undefined);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedNextCursor).toBe('received-cursor');
    });

    let loadMorePromise!: Promise<void>;
    await act(async () => {
      loadMorePromise = result.current.loadMoreRequests('RECEIVED');
      await result.current.updateFavorite(friend);
    });

    await act(async () => {
      nextPage.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T12:00:00',
            department: null,
            expiresAt: '2026-09-17T12:00:00',
            friend: {department: null, id: 'friend-2', nickname: '나래', photoUrl: null},
            id: 'request-2',
          },
        ],
        nextCursor: null,
      });
      await loadMorePromise;
    });

    expect(result.current.receivedRequests.map(request => request.id)).toEqual([
      'request-1',
      'request-2',
    ]);
  });

  it('같은 닉네임 친구는 ID 순으로 안정적으로 정렬한다', async () => {
    const repository = createRepository();
    repository.getFriends.mockResolvedValue([
      {...friend, id: 'friend-2', nickname: '가람'},
      {...friend, id: 'friend-1', nickname: '가람'},
    ]);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.friends.map(item => item.id)).toEqual(['friend-1', 'friend-2']);
    });
  });

  it('받은 요청과 보낸 요청의 다음 페이지를 동시에 불러온다', async () => {
    const repository = createRepository();
    const initialReceivedRequests = [
      {
        createdAt: '2026-08-18T11:00:00',
        department: null,
        expiresAt: '2026-09-17T11:00:00',
        friend: {department: null, id: 'friend-1', nickname: '가람', photoUrl: null},
        id: 'request-1',
      },
    ];
    const receivedPage = createDeferred<{
      hasNext: boolean;
      items: typeof initialReceivedRequests;
      nextCursor: string | null;
    }>();
    const initialSentRequests = [
      {
        createdAt: '2026-08-18T11:00:00',
        department: null,
        expiresAt: '2026-09-17T11:00:00',
        friend: {department: null, id: 'friend-2', nickname: '나래', photoUrl: null},
        id: 'request-2',
      },
    ];
    const sentPage = createDeferred<{
      hasNext: boolean;
      items: typeof initialSentRequests;
      nextCursor: string | null;
    }>();
    repository.getFriendRequests.mockImplementation(({cursor, direction}) => {
      if (direction === 'RECEIVED' && cursor === 'received-cursor') {
        return receivedPage.promise;
      }
      if (direction === 'SENT' && cursor === 'sent-cursor') {
        return sentPage.promise;
      }
      return Promise.resolve({
        hasNext: true,
        items: direction === 'RECEIVED' ? initialReceivedRequests : initialSentRequests,
        nextCursor: direction === 'RECEIVED' ? 'received-cursor' : 'sent-cursor',
      });
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedNextCursor).toBe('received-cursor');
      expect(result.current.sentNextCursor).toBe('sent-cursor');
    });

    let receivedPromise!: Promise<void>;
    let sentPromise!: Promise<void>;
    await act(async () => {
      receivedPromise = result.current.loadMoreRequests('RECEIVED');
      sentPromise = result.current.loadMoreRequests('SENT');
    });

    expect(result.current.loadingMoreDirections).toEqual(new Set(['RECEIVED', 'SENT']));

    await act(async () => {
      receivedPage.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T12:00:00',
            department: null,
            expiresAt: '2026-09-17T12:00:00',
            friend: {department: null, id: 'friend-3', nickname: '다온', photoUrl: null},
            id: 'request-3',
          },
        ],
        nextCursor: null,
      });
      await receivedPromise;
    });

    await act(async () => {
      sentPage.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T12:00:00',
            department: null,
            expiresAt: '2026-09-17T12:00:00',
            friend: {department: null, id: 'friend-4', nickname: '라온', photoUrl: null},
            id: 'request-4',
          },
        ],
        nextCursor: null,
      });
      await sentPromise;
    });

    expect(result.current.receivedRequests.map(request => request.id)).toEqual([
      'request-1',
      'request-3',
    ]);
    expect(result.current.sentRequests.map(request => request.id)).toEqual([
      'request-2',
      'request-4',
    ]);
  });

  it('서로 다른 요청의 처리 상태를 독립적으로 유지한다', async () => {
    const repository = createRepository();
    const acceptRequest = createDeferred<{
      friend: typeof friend;
      requestId: string;
      status: 'ACCEPTED';
    }>();
    const cancelRequest = createDeferred<void>();
    repository.getFriendRequests.mockImplementation(({direction}) =>
      Promise.resolve({
        hasNext: false,
        items:
          direction === 'RECEIVED'
            ? [
                {
                  createdAt: '2026-08-18T11:00:00',
                  department: null,
                  expiresAt: '2026-09-17T11:00:00',
                  friend: {department: null, id: 'friend-1', nickname: '가람', photoUrl: null},
                  id: 'request-1',
                },
              ]
            : [
                {
                  createdAt: '2026-08-18T11:00:00',
                  department: null,
                  expiresAt: '2026-09-17T11:00:00',
                  friend: {department: null, id: 'friend-2', nickname: '나래', photoUrl: null},
                  id: 'request-2',
                },
              ],
        nextCursor: null,
      }),
    );
    repository.acceptFriendRequest.mockReturnValue(acceptRequest.promise);
    repository.cancelFriendRequest.mockReturnValue(cancelRequest.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequests).toHaveLength(1);
      expect(result.current.sentRequests).toHaveLength(1);
    });

    let acceptPromise!: Promise<void>;
    let cancelPromise!: Promise<void>;
    await act(async () => {
      acceptPromise = result.current.acceptRequest('request-1');
      cancelPromise = result.current.cancelRequest('request-2');
    });

    expect(result.current.mutatingRequestIds).toEqual(new Set(['request-1', 'request-2']));
    expect(result.current.mutatingRequestActions).toEqual(
      new Map([
        ['request-1', 'ACCEPT'],
        ['request-2', 'CANCEL'],
      ]),
    );

    await act(async () => {
      cancelRequest.resolve(undefined);
      await cancelPromise;
    });

    expect(result.current.mutatingRequestIds).toEqual(new Set(['request-1']));
    expect(result.current.mutatingRequestActions).toEqual(
      new Map([['request-1', 'ACCEPT']]),
    );

    await act(async () => {
      acceptRequest.resolve({friend, requestId: 'request-1', status: 'ACCEPTED'});
      await acceptPromise;
    });

    expect(result.current.mutatingRequestIds).toEqual(new Set());
    expect(result.current.mutatingRequestActions).toEqual(new Map());
  });

  it('서로 다른 친구의 즐겨찾기 저장 상태를 독립적으로 유지한다', async () => {
    const repository = createRepository();
    const secondFriend = {
      department: null,
      favorite: false,
      id: 'friend-2',
      nickname: '나래',
      photoUrl: null,
    };
    const firstUpdate = createDeferred<void>();
    const secondUpdate = createDeferred<void>();
    repository.getFriends.mockResolvedValue([friend, secondFriend]);
    repository.updateFavorite.mockImplementation((friendId: string) =>
      friendId === friend.id ? firstUpdate.promise : secondUpdate.promise,
    );
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    let firstPromise!: Promise<void>;
    let secondPromise!: Promise<void>;
    await act(async () => {
      firstPromise = result.current.updateFavorite(friend);
      secondPromise = result.current.updateFavorite(secondFriend);
    });

    expect(result.current.updatingFavoriteIds).toEqual(new Set(['friend-1', 'friend-2']));

    await act(async () => {
      firstUpdate.resolve(undefined);
      await firstPromise;
    });

    expect(result.current.updatingFavoriteIds).toEqual(new Set(['friend-2']));

    await act(async () => {
      secondUpdate.resolve(undefined);
      await secondPromise;
    });

    expect(result.current.updatingFavoriteIds).toEqual(new Set());
  });
  it('받은 요청과 보낸 요청의 독립 재시도가 서로의 성공 결과를 버리지 않는다', async () => {
    const repository = createRepository();
    const receivedRetry = createDeferred<{
      hasNext: boolean;
      items: Array<{
        createdAt: string;
        department: string | null;
        expiresAt: string;
        friend: {department: string | null; id: string; nickname: string; photoUrl: string | null};
        id: string;
      }>;
      nextCursor: string | null;
    }>();
    const sentRetry = createDeferred<{
      hasNext: boolean;
      items: Array<{
        createdAt: string;
        department: string | null;
        expiresAt: string;
        friend: {department: string | null; id: string; nickname: string; photoUrl: string | null};
        id: string;
      }>;
      nextCursor: string | null;
    }>();
    let receivedCalls = 0;
    let sentCalls = 0;
    repository.getFriendRequests.mockImplementation(({direction}) => {
      if (direction === 'RECEIVED') {
        receivedCalls += 1;
        return receivedCalls === 1
          ? Promise.reject(new Error('received unavailable'))
          : receivedRetry.promise;
      }

      sentCalls += 1;
      return sentCalls === 1
        ? Promise.reject(new Error('sent unavailable'))
        : sentRetry.promise;
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendHubData());

    await waitFor(() => {
      expect(result.current.receivedRequestsError).toBe('received unavailable');
      expect(result.current.sentRequestsError).toBe('sent unavailable');
    });

    let receivedReload!: Promise<void>;
    let sentReload!: Promise<void>;
    await act(async () => {
      receivedReload = result.current.reloadRequestDirection('RECEIVED');
      sentReload = result.current.reloadRequestDirection('SENT');
    });

    await act(async () => {
      receivedRetry.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T11:00:00',
            department: null,
            expiresAt: '2026-09-17T11:00:00',
            friend: {department: null, id: 'friend-1', nickname: '가람', photoUrl: null},
            id: 'request-1',
          },
        ],
        nextCursor: null,
      });
      sentRetry.resolve({
        hasNext: false,
        items: [
          {
            createdAt: '2026-08-18T11:00:00',
            department: null,
            expiresAt: '2026-09-17T11:00:00',
            friend: {department: null, id: 'friend-2', nickname: '나래', photoUrl: null},
            id: 'request-2',
          },
        ],
        nextCursor: null,
      });
      await Promise.all([receivedReload, sentReload]);
    });

    expect(result.current.receivedRequests.map(request => request.id)).toEqual(['request-1']);
    expect(result.current.sentRequests.map(request => request.id)).toEqual(['request-2']);
    expect(result.current.receivedRequestsError).toBeUndefined();
    expect(result.current.sentRequestsError).toBeUndefined();
  });


});
