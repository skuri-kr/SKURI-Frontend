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
});
