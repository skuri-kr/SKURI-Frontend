import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import {useFriendHubData} from '../useFriendHubData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

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
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
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

    expect(result.current.receivedRequests).toEqual([]);
    expect(result.current.friends).toEqual([friend]);

    await waitFor(() => {
      expect(result.current.error).toBe('network unavailable');
    });
    expect(result.current.receivedRequests).toEqual([]);
    expect(result.current.friends).toEqual([friend]);
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
});
