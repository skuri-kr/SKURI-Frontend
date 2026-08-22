import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import {useFriendSettingsData} from '../useFriendSettingsData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

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
  getFriendMinecraftAccounts: jest.fn(),
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

describe('useFriendSettingsData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('검색 공개 설정 조회가 실패해도 차단 목록을 표시한다', async () => {
    const repository = createRepository();
    repository.getMyPrivacy.mockRejectedValue(new Error('privacy unavailable'));
    repository.getBlocks.mockResolvedValue([
      {
        blockedAt: '2026-08-18T10:00:00',
        department: '컴퓨터공학과',
        id: 'blocked-1',
        nickname: '가람',
        photoUrl: null,
      },
    ]);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.loadingPrivacy).toBe(false);
      expect(result.current.hasLoadedBlocks).toBe(true);
    });

    expect(result.current.privacyError).toBe('privacy unavailable');
    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocksError).toBeUndefined();
  });

  it('차단 목록 조회가 실패해도 검색 공개 설정을 표시한다', async () => {
    const repository = createRepository();
    repository.getMyPrivacy.mockResolvedValue({nicknameSearchable: true});
    repository.getBlocks.mockRejectedValue(new Error('blocks unavailable'));
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.loadingBlocks).toBe(false);
      expect(result.current.privacy).toEqual({nicknameSearchable: true});
    });

    expect(result.current.blocksError).toBe('blocks unavailable');
    expect(result.current.hasLoadedBlocks).toBe(false);
  });

  it('서로 다른 사용자의 차단 해제 상태를 독립적으로 유지한다', async () => {
    const repository = createRepository();
    const firstUnblock = createDeferred<void>();
    const secondUnblock = createDeferred<void>();
    repository.getMyPrivacy.mockResolvedValue({nicknameSearchable: true});
    repository.getBlocks.mockResolvedValue([
      {
        blockedAt: '2026-08-18T10:00:00',
        department: null,
        id: 'blocked-1',
        nickname: '가람',
        photoUrl: null,
      },
      {
        blockedAt: '2026-08-18T10:00:00',
        department: null,
        id: 'blocked-2',
        nickname: '나래',
        photoUrl: null,
      },
    ]);
    repository.unblockMember.mockImplementation((friendId: string) =>
      friendId === 'blocked-1' ? firstUnblock.promise : secondUnblock.promise,
    );
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.blocks).toHaveLength(2);
    });

    let firstPromise!: Promise<void>;
    let secondPromise!: Promise<void>;
    await act(async () => {
      firstPromise = result.current.unblockMember('blocked-1');
      secondPromise = result.current.unblockMember('blocked-2');
    });

    expect(result.current.unblockingIds).toEqual(new Set(['blocked-1', 'blocked-2']));

    await act(async () => {
      firstUnblock.resolve(undefined);
      await firstPromise;
    });

    expect(result.current.unblockingIds).toEqual(new Set(['blocked-2']));

    await act(async () => {
      secondUnblock.resolve(undefined);
      await secondPromise;
    });

    expect(result.current.unblockingIds).toEqual(new Set());
  });

  it('차단 해제보다 먼저 시작한 목록 재조회가 해제한 사용자를 되돌리지 않는다', async () => {
    const repository = createRepository();
    const staleBlocks = createDeferred<Array<{
      blockedAt: string;
      department: string | null;
      id: string;
      nickname: string;
      photoUrl: string | null;
    }>>();
    const blockedMember = {
      blockedAt: '2026-08-18T10:00:00',
      department: null,
      id: 'blocked-1',
      nickname: '가람',
      photoUrl: null,
    };
    repository.getMyPrivacy.mockResolvedValue({nicknameSearchable: true});
    repository.getBlocks
      .mockResolvedValueOnce([blockedMember])
      .mockReturnValueOnce(staleBlocks.promise);
    repository.unblockMember.mockResolvedValue(undefined);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.blocks).toEqual([blockedMember]);
    });

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = result.current.reloadBlocks();
      await result.current.unblockMember('blocked-1');
      staleBlocks.resolve([blockedMember]);
      await reloadPromise;
    });

    expect(result.current.blocks).toEqual([]);
  });

  it('설정 저장보다 먼저 시작한 공개 설정 조회가 저장 값을 되돌리지 않는다', async () => {
    const repository = createRepository();
    const stalePrivacy = createDeferred<{nicknameSearchable: boolean}>();
    repository.getMyPrivacy
      .mockResolvedValueOnce({nicknameSearchable: true})
      .mockReturnValueOnce(stalePrivacy.promise);
    repository.getBlocks.mockResolvedValue([]);
    repository.updateMyPrivacy.mockResolvedValue({nicknameSearchable: false});
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.privacy).toEqual({nicknameSearchable: true});
    });

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = result.current.reloadPrivacy();
      await result.current.updateNicknameSearchable(false);
      stalePrivacy.resolve({nicknameSearchable: true});
      await reloadPromise;
    });

    expect(result.current.privacy).toEqual({nicknameSearchable: false});
  });

  it('검색 공개 설정을 즉시 반영하고 저장 실패 시 이전 값으로 되돌린다', async () => {
    const repository = createRepository();
    const updatePrivacy = createDeferred<{nicknameSearchable: boolean}>();
    repository.getMyPrivacy.mockResolvedValue({nicknameSearchable: true});
    repository.getBlocks.mockResolvedValue([]);
    repository.updateMyPrivacy.mockReturnValue(updatePrivacy.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.privacy).toEqual({nicknameSearchable: true});
    });

    let updatePromise!: Promise<void>;
    act(() => {
      updatePromise = result.current.updateNicknameSearchable(false);
    });

    expect(result.current.privacy).toEqual({nicknameSearchable: false});
    expect(result.current.savingPrivacy).toBe(true);

    await act(async () => {
      updatePrivacy.reject(new Error('save failed'));
      await expect(updatePromise).rejects.toThrow('save failed');
    });

    expect(result.current.privacy).toEqual({nicknameSearchable: true});
    expect(result.current.savingPrivacy).toBe(false);
  });
});
