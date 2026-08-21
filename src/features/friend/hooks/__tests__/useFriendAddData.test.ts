import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import type {FriendSearchResult} from '../../model/friend';
import {useFriendAddData} from '../useFriendAddData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

const myCode = {
  canRegenerate: true,
  code: 'SKR-7K4M-9Q2D',
  nextRegenerationAt: null,
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
};

const createRepository = () => ({
  acceptFriendRequest: jest.fn(),
  blockMember: jest.fn(),
  cancelFriendRequest: jest.fn(),
  createFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  getBlocks: jest.fn(),
  getFriend: jest.fn(),
  getFriendRequests: jest.fn(),
  getFriends: jest.fn(),
  getInboxCounts: jest.fn(),
  getMyCode: jest.fn().mockResolvedValue(myCode),
  getMyPrivacy: jest.fn(),
  previewFriendCode: jest.fn(),
  regenerateMyCode: jest.fn(),
  removeFriend: jest.fn(),
  searchFriends: jest.fn(),
  unblockMember: jest.fn(),
  updateFavorite: jest.fn(),
  updateMyPrivacy: jest.fn(),
});

describe('useFriendAddData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('친구 코드가 바뀐 뒤에는 이전 미리보기 응답을 표시하지 않는다', async () => {
    const repository = createRepository();
    const previewDeferred = createDeferred<{
      canSendFriendRequest: boolean;
      department: string | null;
      id: string;
      nickname: string;
      photoUrl: string | null;
    }>();
    repository.previewFriendCode.mockReturnValue(previewDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    await waitFor(() => {
      expect(result.current.myCode?.code).toBe(myCode.code);
    });

    await act(async () => {
      const previewPromise = result.current.previewFriendCode('SKR-OLD-CODE');
      result.current.invalidateFriendCodePreview();
      previewDeferred.resolve({
        canSendFriendRequest: true,
        department: null,
        id: 'old-friend',
        nickname: '이전 친구',
        photoUrl: null,
      });
      await previewPromise;
    });

    expect(result.current.preview).toBeUndefined();
    expect(result.current.previewing).toBe(false);
  });

  it('검색어 변경 후에는 이전 검색의 결과와 cursor를 버린다', async () => {
    const repository = createRepository();
    const searchDeferred = createDeferred<{
      hasNext: boolean;
      items: Array<{
        canSendFriendRequest: boolean;
        department: string | null;
        id: string;
        nickname: string;
        photoUrl: string | null;
      }>;
      nextCursor: string | null;
    }>();
    repository.searchFriends.mockReturnValue(searchDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    await act(async () => {
      const searchPromise = result.current.searchFriends('가람');
      result.current.resetSearch();
      searchDeferred.resolve({
        hasNext: true,
        items: [
          {
            canSendFriendRequest: true,
            department: null,
            id: 'old-result',
            nickname: '가람',
            photoUrl: null,
          },
        ],
        nextCursor: 'old-cursor',
      });
      await searchPromise;
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.searchNextCursor).toBeNull();
  });

  it('내 친구 코드 최초 조회가 실패하면 다시 시도할 수 있다', async () => {
    const repository = createRepository();
    repository.getMyCode
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(myCode);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    await waitFor(() => {
      expect(result.current.myCodeError).toBe('network unavailable');
      expect(result.current.loadingMyCode).toBe(false);
    });

    await act(async () => {
      await result.current.reloadMyCode();
    });

    expect(result.current.myCode).toEqual(myCode);
    expect(result.current.myCodeError).toBeUndefined();
  });

  it('성공한 검색어에 대해서만 빈 검색 결과 상태를 확정한다', async () => {
    const repository = createRepository();
    repository.searchFriends.mockResolvedValue({
      hasNext: false,
      items: [],
      nextCursor: null,
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    expect(result.current.completedSearchQuery).toBeUndefined();

    await act(async () => {
      await result.current.searchFriends('가람');
    });

    expect(result.current.completedSearchQuery).toBe('가람');

    await act(async () => {
      result.current.resetSearch();
    });

    expect(result.current.completedSearchQuery).toBeUndefined();
  });

  it('서로 다른 친구 요청은 각각 완료될 때까지 전송 상태를 유지한다', async () => {
    const repository = createRepository();
    const firstRequest = createDeferred<{
      friend: null;
      requestId: string;
      status: 'PENDING';
    }>();
    const secondRequest = createDeferred<{
      friend: null;
      requestId: string;
      status: 'PENDING';
    }>();
    repository.createFriendRequest.mockImplementation((friendId: string) =>
      friendId === 'friend-1' ? firstRequest.promise : secondRequest.promise,
    );
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    let firstPromise!: Promise<unknown>;
    let secondPromise!: Promise<unknown>;
    await act(async () => {
      firstPromise = result.current.sendFriendRequest('friend-1');
      secondPromise = result.current.sendFriendRequest('friend-2');
    });

    expect(result.current.sendingFriendIds).toEqual(new Set(['friend-1', 'friend-2']));

    await act(async () => {
      firstRequest.resolve({friend: null, requestId: 'request-1', status: 'PENDING'});
      await firstPromise;
    });

    expect(result.current.sendingFriendIds).toEqual(new Set(['friend-2']));

    await act(async () => {
      secondRequest.resolve({friend: null, requestId: 'request-2', status: 'PENDING'});
      await secondPromise;
    });

    expect(result.current.sendingFriendIds).toEqual(new Set());
  });

  it('같은 친구에게 연속으로 요청을 보내도 중복 전송하지 않는다', async () => {
    const repository = createRepository();
    const request = createDeferred<{
      friend: null;
      requestId: string;
      status: 'PENDING';
    }>();
    repository.createFriendRequest.mockReturnValue(request.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    let firstPromise!: Promise<unknown>;
    let duplicateResult: unknown;
    await act(async () => {
      firstPromise = result.current.sendFriendRequest('friend-1');
      duplicateResult = await result.current.sendFriendRequest('friend-1');
    });

    expect(duplicateResult).toBeUndefined();
    expect(repository.createFriendRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({friend: null, requestId: 'request-1', status: 'PENDING'});
      await firstPromise;
    });
  });

  it('요청 성공 뒤 늦게 도착한 검색 결과가 요청 버튼을 다시 활성화하지 않는다', async () => {
    const repository = createRepository();
    const search = createDeferred<{
      hasNext: boolean;
      items: Array<{
        canSendFriendRequest: boolean;
        department: string | null;
        id: string;
        nickname: string;
        photoUrl: string | null;
      }>;
      nextCursor: string | null;
    }>();
    repository.searchFriends.mockReturnValue(search.promise);
    repository.createFriendRequest.mockResolvedValue({
      friend: null,
      requestId: 'request-1',
      status: 'PENDING',
    });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    let searchPromise!: Promise<void>;
    await act(async () => {
      searchPromise = result.current.searchFriends('가람');
      await result.current.sendFriendRequest('friend-1');
    });

    await act(async () => {
      search.resolve({
        hasNext: false,
        items: [
          {
            canSendFriendRequest: true,
            department: null,
            id: 'friend-1',
            nickname: '가람',
            photoUrl: null,
          },
        ],
        nextCursor: null,
      });
      await searchPromise;
    });

    expect(result.current.searchResults).toEqual([
      {
        canSendFriendRequest: false,
        department: null,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
    ]);
  });

  it('이전 검색의 더 보기 요청은 새 검색의 더 보기를 막지 않는다', async () => {
    const repository = createRepository();
    const staleLoadMore = createDeferred<{
      hasNext: boolean;
      items: FriendSearchResult[];
      nextCursor: string | null;
    }>();
    repository.searchFriends
      .mockResolvedValueOnce({
        hasNext: true,
        items: [{canSendFriendRequest: true, department: null, id: 'friend-a', nickname: '가람', photoUrl: null}],
        nextCursor: 'cursor-a',
      })
      .mockReturnValueOnce(staleLoadMore.promise)
      .mockResolvedValueOnce({
        hasNext: true,
        items: [{canSendFriendRequest: true, department: null, id: 'friend-b', nickname: '나래', photoUrl: null}],
        nextCursor: 'cursor-b',
      })
      .mockResolvedValueOnce({
        hasNext: false,
        items: [{canSendFriendRequest: true, department: null, id: 'friend-b2', nickname: '나래', photoUrl: null}],
        nextCursor: null,
      });
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendAddData());

    await act(async () => {
      await result.current.searchFriends('가람');
    });

    let staleLoadMorePromise!: Promise<void>;
    act(() => {
      staleLoadMorePromise = result.current.loadMoreSearchResults('가람');
      result.current.resetSearch();
    });

    await act(async () => {
      await result.current.searchFriends('나래');
    });

    await act(async () => {
      await result.current.loadMoreSearchResults('나래');
    });

    expect(repository.searchFriends).toHaveBeenLastCalledWith({
      cursor: 'cursor-b',
      query: '나래',
      size: 20,
    });
    expect(result.current.searchResults.map(item => item.id)).toEqual([
      'friend-b',
      'friend-b2',
    ]);

    await act(async () => {
      staleLoadMore.resolve({hasNext: false, items: [], nextCursor: null});
      await staleLoadMorePromise;
    });
  });
});
