import {act, renderHook, waitFor} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendRepository, useTimetableRepository} from '@/di';

import {useFriendTimetableData} from '../useFriendTimetableData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
  useTimetableRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
  useInvalidationVersion: jest.fn(() => 0),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);
const mockedUseTimetableRepository = jest.mocked(useTimetableRepository);
const mockedInvalidateData = jest.mocked(invalidateData);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

const friends = [
  {
    department: '컴퓨터공학과',
    favorite: false,
    id: 'friend-b',
    minecraftAccountCount: 0,
    nickname: '나래',
    photoUrl: null,
  },
  {
    department: '컴퓨터공학과',
    favorite: true,
    id: 'friend-a',
    minecraftAccountCount: 0,
    nickname: '가람',
    photoUrl: null,
  },
];

describe('useFriendTimetableData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('즐겨찾기 우선으로 친구를 정렬하고 선택한 친구 시간표만 조회한다', async () => {
    const getFriendTimetable = jest.fn().mockResolvedValue({
      courses: [],
      effectiveScope: 'BUSY_ONLY',
      hasTimetable: true,
      semester: '2026-2',
      slots: [{dayOfWeek: 1, endPeriod: 3, startPeriod: 2}],
    });
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));

    await waitFor(() => {
      expect(result.current.friends.map(friend => friend.id)).toEqual([
        'friend-a',
        'friend-b',
      ]);
    });
    expect(getFriendTimetable).not.toHaveBeenCalled();

    act(() => {
      result.current.selectFriend('friend-b');
    });

    await waitFor(() => {
      expect(getFriendTimetable).toHaveBeenCalledWith({
        friendId: 'friend-b',
        semesterId: '2026-2',
      });
      expect(result.current.selectedTimetable?.effectiveScope).toBe('BUSY_ONLY');
    });
  });

  it('즐겨찾기 저장 실패 시 원래 순서와 상태로 되돌린다', async () => {
    const updateFavorite = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite,
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable: jest.fn(),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    await expect(
      act(async () => result.current.updateFavorite(result.current.friends[0])),
    ).rejects.toThrow('network unavailable');

    expect(result.current.friends.map(friend => [friend.id, friend.favorite])).toEqual([
      ['friend-a', true],
      ['friend-b', false],
    ]);
  });

  it('초기 친구 목록 요청에 실패해도 로드 완료로 처리하지 않는다', async () => {
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockRejectedValue(new Error('network unavailable')),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable: jest.fn(),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));

    await waitFor(() => {
      expect(result.current.friendsError).toBe('network unavailable');
    });

    expect(result.current.hasLoadedFriends).toBe(false);
  });

  it('선택한 친구 시간표를 새로고침할 때 캐시를 무시한다', async () => {
    const getFriendTimetable = jest.fn().mockResolvedValue({
      courses: [],
      effectiveScope: 'BUSY_ONLY',
      hasTimetable: true,
      semester: '2026-2',
      slots: [],
    });
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(getFriendTimetable).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(getFriendTimetable).toHaveBeenCalledTimes(2);
  });

  it('같은 친구의 즐겨찾기 변경 요청을 한 번만 전송한다', async () => {
    let resolveUpdate: (() => void) | undefined;
    const updateFavorite = jest.fn(
      () => new Promise<void>(resolve => {
        resolveUpdate = resolve;
      }),
    );
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite,
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable: jest.fn(),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.updateFavorite(result.current.friends[0]).catch(() => undefined);
      result.current.updateFavorite(result.current.friends[0]).catch(() => undefined);
    });

    expect(updateFavorite).toHaveBeenCalledTimes(1);
    expect(result.current.updatingFavoriteIds).toEqual(new Set(['friend-a']));

    await act(async () => {
      resolveUpdate?.();
      await Promise.resolve();
    });

    expect(result.current.updatingFavoriteIds).toEqual(new Set());
    expect(mockedInvalidateData).toHaveBeenCalledWith(
      FRIEND_HUB_INVALIDATION_KEY,
    );
  });

  it('겹친 친구 목록 요청에서는 최신 응답만 반영한다', async () => {
    const olderFriends = createDeferred<typeof friends>();
    const latestFriends = createDeferred<typeof friends>();
    const getFriends = jest
      .fn()
      .mockReturnValueOnce(olderFriends.promise)
      .mockReturnValueOnce(latestFriends.promise);
    mockedUseFriendRepository.mockReturnValue({
      getFriends,
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable: jest.fn(),
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    let latestReload!: Promise<void>;
    act(() => {
      latestReload = result.current.reloadFriends();
    });

    await act(async () => {
      latestFriends.resolve([friends[0]]);
      await latestReload;
    });
    expect(result.current.friends.map(friend => friend.id)).toEqual(['friend-b']);

    await act(async () => {
      olderFriends.resolve(friends);
      await Promise.resolve();
    });
    expect(result.current.friends.map(friend => friend.id)).toEqual(['friend-b']);
  });

  it('캐시를 표시하면 이전 친구의 진행 중인 시간표 응답을 무효화한다', async () => {
    const friendBTimetable = createDeferred<{
      courses: [];
      effectiveScope: 'DETAILS';
      hasTimetable: true;
      semester: string;
      slots: [];
    }>();
    const getFriendTimetable = jest.fn(
      ({friendId}: {friendId: string; semesterId: string}) =>
        friendId === 'friend-a'
          ? Promise.resolve({
              courses: [],
              effectiveScope: 'BUSY_ONLY' as const,
              hasTimetable: true,
              semester: '2026-2',
              slots: [],
            })
          : friendBTimetable.promise,
    );
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(result.current.selectedTimetable?.effectiveScope).toBe('BUSY_ONLY');
    });

    act(() => {
      result.current.selectFriend('friend-b');
    });
    expect(result.current.selectedFriendId).toBe('friend-b');
    expect(result.current.selectedTimetable).toBeUndefined();
    expect(result.current.loadingTimetable).toBe(true);
    await waitFor(() => {
      expect(result.current.selectedFriendId).toBe('friend-b');
      expect(result.current.loadingTimetable).toBe(true);
    });

    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(result.current.selectedFriendId).toBe('friend-a');
      expect(result.current.selectedTimetable?.effectiveScope).toBe('BUSY_ONLY');
      expect(result.current.loadingTimetable).toBe(false);
    });

    await act(async () => {
      friendBTimetable.resolve({
        courses: [],
        effectiveScope: 'DETAILS',
        hasTimetable: true,
        semester: '2026-2',
        slots: [],
      });
    });

    expect(result.current.selectedFriendId).toBe('friend-a');
    expect(result.current.selectedTimetable?.effectiveScope).toBe('BUSY_ONLY');
  });

  it('선택한 친구를 유지한 학기 변경에서는 새 학기 시간표를 한 번만 조회한다', async () => {
    const getFriends = jest.fn().mockResolvedValue(friends);
    const getFriendTimetable = jest.fn(
      ({semesterId}: {friendId: string; semesterId: string}) =>
        Promise.resolve({
          courses: [],
          effectiveScope: 'BUSY_ONLY' as const,
          hasTimetable: true,
          semester: semesterId,
          slots: [],
        }),
    );
    mockedUseFriendRepository.mockReturnValue({
      getFriends,
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result, rerender} = renderHook(
      ({semesterId}: {semesterId: string}) =>
        useFriendTimetableData(semesterId),
      {initialProps: {semesterId: '2026-1'}},
    );
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(result.current.selectedTimetable?.semester).toBe('2026-1');
    });

    rerender({semesterId: '2026-2'});
    await waitFor(() => {
      expect(result.current.selectedTimetable?.semester).toBe('2026-2');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(getFriends).toHaveBeenCalledTimes(1);
    expect(getFriendTimetable).toHaveBeenCalledTimes(2);
    expect(getFriendTimetable).toHaveBeenLastCalledWith({
      friendId: 'friend-a',
      semesterId: '2026-2',
    });
  });

  it('강제 새로고침 실패 후 오래된 캐시를 다시 표시하지 않는다', async () => {
    const retryTimetable = createDeferred<{
      courses: [];
      effectiveScope: 'PRIVATE';
      hasTimetable: false;
      semester: string;
      slots: [];
    }>();
    const getFriendTimetable = jest
      .fn()
      .mockResolvedValueOnce({
        courses: [],
        effectiveScope: 'DETAILS',
        hasTimetable: true,
        semester: '2026-2',
        slots: [],
      })
      .mockRejectedValueOnce(new Error('공개 범위를 확인하지 못했습니다.'))
      .mockReturnValueOnce(retryTimetable.promise);
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);

    const {result} = renderHook(() => useFriendTimetableData('2026-2'));
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(result.current.selectedTimetable?.effectiveScope).toBe('DETAILS');
    });

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.timetableError).toBe(
      '공개 범위를 확인하지 못했습니다.',
    );
    expect(result.current.selectedTimetable).toBeUndefined();

    act(() => {
      result.current.selectFriend('friend-a');
    });
    act(() => {
      result.current.selectFriend('friend-a');
    });

    await waitFor(() => {
      expect(getFriendTimetable).toHaveBeenCalledTimes(3);
    });
    expect(result.current.selectedTimetable).toBeUndefined();
    expect(result.current.loadingTimetable).toBe(true);
  });

  it('학기 prop이 바뀐 첫 렌더부터 이전 학기 친구 시간표를 숨긴다', async () => {
    const nextSemesterTimetable = createDeferred<{
      courses: [];
      effectiveScope: 'BUSY_ONLY';
      hasTimetable: true;
      semester: string;
      slots: [];
    }>();
    const getFriendTimetable = jest
      .fn()
      .mockResolvedValueOnce({
        courses: [],
        effectiveScope: 'BUSY_ONLY',
        hasTimetable: true,
        semester: '2026-1',
        slots: [],
      })
      .mockReturnValueOnce(nextSemesterTimetable.promise);
    mockedUseFriendRepository.mockReturnValue({
      getFriends: jest.fn().mockResolvedValue(friends),
      updateFavorite: jest.fn(),
    } as unknown as ReturnType<typeof useFriendRepository>);
    mockedUseTimetableRepository.mockReturnValue({
      getFriendTimetable,
    } as unknown as ReturnType<typeof useTimetableRepository>);
    const renderedSemesters: Array<string | undefined> = [];

    const {result, rerender} = renderHook(
      ({semesterId}: {semesterId: string}) => {
        const hookResult = useFriendTimetableData(semesterId);
        renderedSemesters.push(hookResult.selectedTimetable?.semester);
        return hookResult;
      },
      {initialProps: {semesterId: '2026-1'}},
    );
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });
    act(() => {
      result.current.selectFriend('friend-a');
    });
    await waitFor(() => {
      expect(result.current.selectedTimetable?.semester).toBe('2026-1');
    });

    renderedSemesters.length = 0;
    rerender({semesterId: '2026-2'});

    expect(renderedSemesters[0]).toBeUndefined();
    expect(result.current.selectedTimetable).toBeUndefined();
  });
});
