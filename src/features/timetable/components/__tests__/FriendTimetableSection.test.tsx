import React from 'react';
import {Alert} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useFriendTimetableData} from '../../hooks/useFriendTimetableData';
import {FriendTimetableSection} from '../FriendTimetableSection';

const mockIsFocused = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({isFocused: mockIsFocused}),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: 'BottomSheetScrollView',
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@/features/friend/components/FriendAvatar', () => ({
  FriendAvatar: () => null,
}));
jest.mock('../TimetableBottomSheet', () => ({
  TimetableBottomSheet: 'TimetableBottomSheet',
}));
jest.mock('../../hooks/useFriendTimetableData', () => ({
  useFriendTimetableData: jest.fn(),
}));

const mockedUseFriendTimetableData = jest.mocked(useFriendTimetableData);

describe('FriendTimetableSection', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('화면을 떠난 뒤 즐겨찾기 저장이 실패해도 오류 알림을 표시하지 않는다', async () => {
    const updateFavorite = jest.fn().mockRejectedValue(new Error('network unavailable'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockIsFocused.mockReturnValue(false);
    mockedUseFriendTimetableData.mockReturnValue({
      friends: [
        {
          department: '컴퓨터공학과',
          effectiveTimetableScope: 'DETAILS',
          favorite: false,
          id: 'friend-1',
          minecraftAccountCount: 0,
          nickname: '가람',
          photoUrl: null,
        },
      ],
      friendsError: undefined,
      hasLoadedFriends: true,
      loadingTimetable: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      reloadFriends: jest.fn().mockResolvedValue(undefined),
      reloadSelectedTimetable: jest.fn().mockResolvedValue(undefined),
      selectedFriendId: undefined,
      selectedTimetable: undefined,
      selectFriend: jest.fn(),
      timetableError: undefined,
      updateFavorite,
      updatingFavoriteIds: new Set(),
    });

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(
        <FriendTimetableSection
          onPressSettings={jest.fn()}
          ownCourses={[]}
          semesterId="2026-2"
        />,
      );
    });

    const favoriteButton = view.root.findByProps({
      accessibilityLabel: '가람 즐겨찾기 추가',
    });
    await act(async () => {
      favoriteButton.props.onPress();
      await Promise.resolve();
    });

    expect(updateFavorite).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
