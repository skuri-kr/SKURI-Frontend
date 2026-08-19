import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import {useFriendSettingsData} from '../useFriendSettingsData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
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
});
