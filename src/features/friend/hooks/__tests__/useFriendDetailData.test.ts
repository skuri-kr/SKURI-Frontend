import {act, renderHook, waitFor} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendRepository} from '@/di';

import {useFriendDetailData} from '../useFriendDetailData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
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
  getFriend: jest.fn().mockResolvedValue({
    department: null,
    favorite: false,
    id: 'friend-1',
    nickname: '가람',
    photoUrl: null,
  }),
  getFriendMinecraftAccounts: jest.fn().mockResolvedValue({selfAccounts: []}),
  getFriendRequests: jest.fn(),
  getFriends: jest.fn(),
  getInboxCounts: jest.fn(),
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

describe('useFriendDetailData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('즐겨찾기 저장이 진행 중이면 중복 요청을 보내지 않는다', async () => {
    const repository = createRepository();
    const favoriteDeferred = createDeferred<void>();
    repository.updateFavorite.mockReturnValue(favoriteDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await waitFor(() => {
      expect(result.current.friend?.id).toBe('friend-1');
    });

    await act(async () => {
      const firstUpdate = result.current.updateFavorite();
      const secondUpdate = result.current.updateFavorite();
      favoriteDeferred.resolve();
      await Promise.all([firstUpdate, secondUpdate]);
    });

    expect(repository.updateFavorite).toHaveBeenCalledTimes(1);
    expect(repository.updateFavorite).toHaveBeenCalledWith('friend-1', true);
    expect(result.current.friend?.favorite).toBe(true);
  });

  it('마인크래프트 조회가 지연돼도 친구 기본 정보를 먼저 표시한다', async () => {
    const repository = createRepository();
    const minecraftAccountsDeferred = createDeferred<{selfAccounts: []}>();
    repository.getFriendMinecraftAccounts.mockReturnValue(minecraftAccountsDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await waitFor(() => {
      expect(result.current.friend?.id).toBe('friend-1');
      expect(result.current.loading).toBe(false);
      expect(result.current.minecraftAccountsLoading).toBe(true);
    });

    await act(async () => {
      minecraftAccountsDeferred.resolve({selfAccounts: []});
    });

    await waitFor(() => {
      expect(result.current.minecraftAccountsLoading).toBe(false);
    });
  });

  it('이전 마인크래프트 조회가 늦게 끝나도 재시도 결과를 덮어쓰지 않는다', async () => {
    const repository = createRepository();
    const initialFriendDeferred = createDeferred<never>();
    const firstMinecraftDeferred = createDeferred<{selfAccounts: []}>();
    const retryMinecraftDeferred = createDeferred<{selfAccounts: []}>();
    repository.getFriend
      .mockReturnValueOnce(initialFriendDeferred.promise)
      .mockResolvedValueOnce({
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      });
    repository.getFriendMinecraftAccounts
      .mockReturnValueOnce(firstMinecraftDeferred.promise)
      .mockReturnValueOnce(retryMinecraftDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await act(async () => {
      initialFriendDeferred.reject(new Error('friend unavailable'));
    });
    await waitFor(() => {
      expect(result.current.error).toBe('friend unavailable');
    });

    await act(async () => {
      await result.current.reload();
    });
    await waitFor(() => {
      expect(repository.getFriendMinecraftAccounts).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      retryMinecraftDeferred.resolve({selfAccounts: []});
    });
    await waitFor(() => {
      expect(result.current.minecraftAccounts).toEqual({selfAccounts: []});
      expect(result.current.minecraftAccountsError).toBeUndefined();
      expect(result.current.minecraftAccountsLoading).toBe(false);
    });

    await act(async () => {
      firstMinecraftDeferred.reject(new Error('stale unavailable'));
    });

    expect(result.current.minecraftAccounts).toEqual({selfAccounts: []});
    expect(result.current.minecraftAccountsError).toBeUndefined();
    expect(result.current.minecraftAccountsLoading).toBe(false);
  });

  it('즐겨찾기를 즉시 반영하고 저장에 실패하면 이전 상태로 되돌린다', async () => {
    const repository = createRepository();
    const favoriteDeferred = createDeferred<void>();
    repository.updateFavorite.mockReturnValue(favoriteDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await waitFor(() => {
      expect(result.current.friend?.id).toBe('friend-1');
    });

    let favoriteMutation!: Promise<boolean>;
    act(() => {
      favoriteMutation = result.current.updateFavorite();
    });

    expect(result.current.friend?.favorite).toBe(true);
    expect(result.current.mutating).toBe(true);

    await act(async () => {
      favoriteDeferred.reject(new Error('network unavailable'));
      await expect(favoriteMutation).rejects.toThrow('network unavailable');
    });

    expect(result.current.friend?.favorite).toBe(false);
    expect(result.current.mutating).toBe(false);
  });

  it('친구 끊기 중에는 다른 친구 관리 요청을 실행하지 않는다', async () => {
    const repository = createRepository();
    const removalDeferred = createDeferred<void>();
    repository.removeFriend.mockReturnValue(removalDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await waitFor(() => {
      expect(result.current.friend?.id).toBe('friend-1');
    });

    let removalMutation!: Promise<boolean>;
    await act(async () => {
      removalMutation = result.current.removeFriend();
      await result.current.blockFriend();
      await result.current.updateFavorite();
    });

    expect(repository.removeFriend).toHaveBeenCalledTimes(1);
    expect(repository.blockMember).not.toHaveBeenCalled();
    expect(repository.updateFavorite).not.toHaveBeenCalled();
    expect(result.current.mutating).toBe(true);

    await act(async () => {
      removalDeferred.resolve();
      await removalMutation;
    });

    expect(result.current.mutating).toBe(false);
  });

  it('진행 중인 작업 때문에 건너뛴 상세 작업을 성공으로 반환하지 않는다', async () => {
    const repository = createRepository();
    const favoriteDeferred = createDeferred<void>();
    repository.updateFavorite.mockReturnValue(favoriteDeferred.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));

    await waitFor(() => {
      expect(result.current.friend?.id).toBe('friend-1');
    });

    let favoriteMutation!: Promise<boolean>;
    let removalMutation!: Promise<boolean>;
    let blockMutation!: Promise<boolean>;
    act(() => {
      favoriteMutation = result.current.updateFavorite();
      removalMutation = result.current.removeFriend();
      blockMutation = result.current.blockFriend();
    });

    await expect(removalMutation).resolves.toBe(false);
    await expect(blockMutation).resolves.toBe(false);
    expect(repository.removeFriend).not.toHaveBeenCalled();
    expect(repository.blockMember).not.toHaveBeenCalled();

    await act(async () => {
      favoriteDeferred.resolve(undefined);
      await expect(favoriteMutation).resolves.toBe(true);
    });
  });

  it('친구 데이터가 무효화되면 상세 정보를 다시 조회한다', async () => {
    const repository = createRepository();
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    renderHook(() => useFriendDetailData('friend-1'));
    await waitFor(() => {
      expect(repository.getFriend).toHaveBeenCalledTimes(1);
    });

    act(() => {
      invalidateData(FRIEND_HUB_INVALIDATION_KEY);
    });

    await waitFor(() => {
      expect(repository.getFriend).toHaveBeenCalledTimes(2);
    });
  });

  it('겹친 상세 조회에서는 최신 응답만 반영한다', async () => {
    const repository = createRepository();
    const olderFriend = createDeferred<{
      department: null;
      favorite: false;
      id: string;
      nickname: string;
      photoUrl: null;
    }>();
    const latestFriend = createDeferred<{
      department: null;
      favorite: true;
      id: string;
      nickname: string;
      photoUrl: null;
    }>();
    repository.getFriend
      .mockReturnValueOnce(olderFriend.promise)
      .mockReturnValueOnce(latestFriend.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendDetailData('friend-1'));
    let latestReload!: Promise<void>;
    act(() => {
      latestReload = result.current.reload();
    });

    await act(async () => {
      latestFriend.resolve({
        department: null,
        favorite: true,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      });
      await latestReload;
    });
    expect(result.current.friend?.favorite).toBe(true);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      olderFriend.resolve({
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      });
    });

    expect(result.current.friend?.favorite).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });
});
