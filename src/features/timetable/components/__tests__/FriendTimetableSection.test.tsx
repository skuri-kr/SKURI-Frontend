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

  it('동일 프로필 친구의 시간표 행에만 식별 코드를 표시한다', async () => {
    mockedUseFriendTimetableData.mockReturnValue({
      friends: [
        {
          department: '컴퓨터공학과',
          effectiveTimetableScope: 'DETAILS',
          favorite: false,
          id: 'friend-abc123',
          minecraftAccountCount: 0,
          nickname: '가람',
          photoUrl: null,
        },
        {
          department: '컴퓨터공학과',
          effectiveTimetableScope: 'BUSY_ONLY',
          favorite: true,
          id: 'friend-def456',
          minecraftAccountCount: 0,
          nickname: '가람',
          photoUrl: null,
        },
        {
          department: '경영학과',
          effectiveTimetableScope: 'PRIVATE',
          favorite: false,
          id: 'friend-ghi789',
          minecraftAccountCount: 0,
          nickname: '나래',
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
      updateFavorite: jest.fn().mockResolvedValue(undefined),
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

    const hasText = (expected: string) => view.root.findAll(node => {
      const {children} = node.props;
      return Array.isArray(children)
        && children.every(child => ['number', 'string'].includes(typeof child))
        && children.join('') === expected;
    }).length > 0;
    expect(hasText('식별 코드 · ABC123')).toBe(true);
    expect(hasText('식별 코드 · DEF456')).toBe(true);
    expect(hasText('식별 코드 · GHI789')).toBe(false);
    expect(view.root.findByProps({
      accessibilityLabel: '가람 시간표 보기, 식별 코드 ABC123',
    })).toBeTruthy();
    expect(view.root.findByProps({
      accessibilityLabel: '가람 즐겨찾기 추가, 식별 코드 ABC123',
    })).toBeTruthy();
  });
});
