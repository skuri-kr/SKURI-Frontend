import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository, useTimetableRepository} from '@/di';

import {useTimetableSharingSettingsData} from '../useTimetableSharingSettingsData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
  useTimetableRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  useInvalidationVersion: jest.fn(() => 0),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);
const mockedUseTimetableRepository = jest.mocked(useTimetableRepository);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

describe('useTimetableSharingSettingsData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('친구별 예외를 낙관적으로 반영하고 서버에 저장한다', async () => {
    const updateShareOverride = jest.fn().mockResolvedValue(undefined);
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue([
        {
          department: '컴퓨터공학과',
          favorite: false,
          id: 'friend-1',
          minecraftAccountCount: 0,
          nickname: '가람',
          photoUrl: null,
        },
      ]),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getMySharingSettings: jest.fn().mockResolvedValue({
        defaultScope: 'PRIVATE',
        overrides: [],
      }),
      updateShareOverride,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useTimetableSharingSettingsData());
    await waitFor(() => {
      expect(result.current.settings?.defaultScope).toBe('PRIVATE');
    });

    await act(async () => {
      await result.current.updateFriendScope('friend-1', 'DETAILS');
    });

    expect(updateShareOverride).toHaveBeenCalledWith({
      friendId: 'friend-1',
      scope: 'DETAILS',
    });
    expect(result.current.getFriendScope('friend-1')).toBe('DETAILS');
  });

  it('친구 목록 실패와 기본 공개 범위 실패를 독립적으로 표시한다', async () => {
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockRejectedValue(new Error('friends offline')),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getMySharingSettings: jest.fn().mockResolvedValue({
        defaultScope: 'PRIVATE',
        overrides: [],
      }),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useTimetableSharingSettingsData());

    await waitFor(() => {
      expect(result.current.settings?.defaultScope).toBe('PRIVATE');
      expect(result.current.friendsError).toBe('friends offline');
    });

    expect(result.current.settingsError).toBeUndefined();
  });

  it('겹친 새로고침에서는 가장 최신 응답만 반영한다', async () => {
    let resolveOlderSettings: ((value: {
      defaultScope: 'PRIVATE';
      overrides: [];
    }) => void) | undefined;
    let resolveLatestSettings: ((value: {
      defaultScope: 'DETAILS';
      overrides: [];
    }) => void) | undefined;
    const getMySharingSettings = jest
      .fn()
      .mockResolvedValueOnce({defaultScope: 'BUSY_ONLY', overrides: []})
      .mockImplementationOnce(
        () => new Promise(resolve => {
          resolveOlderSettings = resolve;
        }),
      )
      .mockImplementationOnce(
        () => new Promise(resolve => {
          resolveLatestSettings = resolve;
        }),
      );
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getMySharingSettings,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useTimetableSharingSettingsData());
    await waitFor(() => {
      expect(result.current.settings?.defaultScope).toBe('BUSY_ONLY');
    });

    let olderReload: Promise<void>;
    let latestReload: Promise<void>;
    act(() => {
      olderReload = result.current.reload();
      latestReload = result.current.reload();
    });

    await act(async () => {
      resolveLatestSettings?.({defaultScope: 'DETAILS', overrides: []});
      await latestReload;
    });
    expect(result.current.settings?.defaultScope).toBe('DETAILS');

    await act(async () => {
      resolveOlderSettings?.({defaultScope: 'PRIVATE', overrides: []});
      await olderReload;
    });
    expect(result.current.settings?.defaultScope).toBe('DETAILS');
  });

  it('설정 변경이 진행 중인 새로고침을 대체하면 로딩 상태를 종료한다', async () => {
    const staleSettings = createDeferred<{
      defaultScope: 'PRIVATE';
      overrides: [];
    }>();
    const staleFriends = createDeferred<[]>();
    const getMySharingSettings = jest
      .fn()
      .mockResolvedValueOnce({defaultScope: 'BUSY_ONLY', overrides: []})
      .mockReturnValueOnce(staleSettings.promise);
    const getFriends = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(staleFriends.promise);
    mockedUseFriendRepository.mockReturnValue({
      getFriends,
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getMySharingSettings,
      updateMySharingSettings: jest.fn().mockResolvedValue({
        defaultScope: 'DETAILS',
        overrides: [],
      }),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useTimetableSharingSettingsData());
    await waitFor(() => {
      expect(result.current.settings?.defaultScope).toBe('BUSY_ONLY');
    });

    let staleReload!: Promise<void>;
    act(() => {
      staleReload = result.current.reload();
    });
    expect(result.current.loadingSettings).toBe(true);
    expect(result.current.loadingFriends).toBe(true);

    await act(async () => {
      await result.current.updateDefaultScope('DETAILS');
    });
    expect(result.current.loadingSettings).toBe(false);
    expect(result.current.loadingFriends).toBe(false);
    expect(result.current.settings?.defaultScope).toBe('DETAILS');

    await act(async () => {
      staleSettings.resolve({defaultScope: 'PRIVATE', overrides: []});
      staleFriends.resolve([]);
      await staleReload;
    });
    expect(result.current.settings?.defaultScope).toBe('DETAILS');
  });
});
