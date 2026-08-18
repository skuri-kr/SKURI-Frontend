import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

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
});
