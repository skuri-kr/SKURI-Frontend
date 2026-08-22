import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository, useTimetableRepository} from '@/di';

import {useFriendTimetableData} from '../useFriendTimetableData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
  useTimetableRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  useInvalidationVersion: jest.fn(() => 0),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);
const mockedUseTimetableRepository = jest.mocked(useTimetableRepository);

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
});
