import React from 'react';
import {AccessibilityInfo, Alert} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {useNavigation, useRoute} from '@react-navigation/native';

import {useTimetableDetailData} from '../../hooks/useTimetableDetailData';
import {TimetableDetailScreen} from '../TimetableDetailScreen';

let mockFriendTimetableSectionProps: {
  onInitialFriendHandled?: () => void;
  onInitialFriendUnavailable?: () => void;
} | undefined;
let mockIsFocused: jest.Mock;
let mockSetParams: jest.Mock;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => ({
  SegmentedControl: () => null,
  StateCard: () => null,
  TimetableDetailSkeleton: () => null,
}));

jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));

jest.mock('../../components/TimetableAddCourseSheet', () => ({
  TimetableAddCourseSheet: () => null,
}));
jest.mock('../../components/TimetableAllViewCard', () => ({
  TimetableAllViewCard: () => null,
}));
jest.mock('../../components/TimetableCourseDetailSheet', () => ({
  TimetableCourseDetailSheet: () => null,
}));
jest.mock('../../components/TimetableDetailHeader', () => ({
  TimetableDetailHeader: () => null,
}));
jest.mock('../../components/FriendTimetableSection', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');
  return {
    FriendTimetableSection: ReactModule.forwardRef(
      (
        props: {
          onInitialFriendHandled?: () => void;
          onInitialFriendUnavailable?: () => void;
        },
        _ref: unknown,
      ) => {
        mockFriendTimetableSectionProps = props;
        return ReactModule.createElement(Text, undefined, '친구 시간표 목록');
      },
    ),
  };
});
jest.mock('../../components/TimetableSemesterSheet', () => ({
  TimetableSemesterSheet: () => null,
}));
jest.mock('../../components/TimetableSupplementSection', () => ({
  TimetableSupplementSection: () => null,
}));
jest.mock('../../components/TimetableTodayViewCard', () => ({
  TimetableTodayViewCard: () => null,
}));
jest.mock('../../hooks/useTimetableDetailData', () => ({
  useTimetableDetailData: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseTimetableDetailData = jest.mocked(useTimetableDetailData);

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

describe('TimetableDetailScreen', () => {
  const frameCallbacks = new Map<number, (timestamp: number) => void>();
  let nextFrameId = 0;

  beforeEach(() => {
    jest.resetAllMocks();
    frameCallbacks.clear();
    nextFrameId = 0;
    mockFriendTimetableSectionProps = undefined;
    mockIsFocused = jest.fn(() => true);
    mockSetParams = jest.fn();
    globalThis.requestAnimationFrame = jest.fn(callback => {
      const frameId = ++nextFrameId;
      frameCallbacks.set(frameId, callback);
      return frameId;
    });
    globalThis.cancelAnimationFrame = jest.fn(frameId => {
      if (typeof frameId === 'number') {
        frameCallbacks.delete(frameId);
      }
    });
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
      isFocused: mockIsFocused,
      navigate: jest.fn(),
      setParams: mockSetParams,
    } as unknown as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({
      params: {initialView: 'all', targetFriendPublicId: 'friend-1'},
    } as ReturnType<typeof useRoute>);
    mockedUseTimetableDetailData.mockReturnValue({
      activeMode: 'all',
      addCatalogCourse: jest.fn(),
      addManualCourse: jest.fn(),
      addSheetVisible: false,
      closeAddSheet: jest.fn(),
      closeCourseDetail: jest.fn(),
      data: {
        addCourseSheet: {},
        allView: {blocks: [], onlineItems: [], saturdayItems: []},
        courses: [],
        selectedCourse: undefined,
        semesterId: '2026-1',
        semesterLabel: '2026년 1학기',
        semesterOptions: [],
        todayView: {},
        totalCreditsLabel: '총 0학점',
      },
      error: undefined,
      loadMoreCatalogCourses: jest.fn(),
      loading: false,
      openAddSheet: jest.fn(),
      openCourseDetail: jest.fn(),
      reload: jest.fn(),
      removeSelectedCourse: jest.fn(),
      retryCatalogCourseSearch: jest.fn(),
      retryCourseFilterOptions: jest.fn(),
      retryDepartmentOptions: jest.fn(),
      selectColor: jest.fn(),
      selectMode: jest.fn(),
      selectSemester: jest.fn(),
      setAddSheetTab: jest.fn(),
      setCatalogCategory: jest.fn(),
      setCatalogDepartment: jest.fn(),
      setCatalogGrade: jest.fn(),
      setManualCredits: jest.fn(),
      setManualDay: jest.fn(),
      setManualEndPeriod: jest.fn(),
      setManualField: jest.fn(),
      setManualOnline: jest.fn(),
      setManualStartPeriod: jest.fn(),
      setQuery: jest.fn(),
      shareTimetable: jest.fn(),
      toggleNightClasses: jest.fn(),
    } as unknown as ReturnType<typeof useTimetableDetailData>);
  });

  afterAll(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('레이아웃 변경으로 스크롤 frame이 취소되면 새 위치로 다시 예약한다', () => {
    const view = render(<TimetableDetailScreen />);
    const friendSection = view.getByTestId('friend-timetable-section-container');

    fireEvent(friendSection, 'layout', {nativeEvent: {layout: {y: 100}}});
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1);

    fireEvent(friendSection, 'layout', {nativeEvent: {layout: {y: 140}}});
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);

    act(() => {
      frameCallbacks.get(2)?.(0);
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      '친구 시간표로 이동했습니다.',
    );
  });

  it('친구 전개와 스크롤이 모두 끝난 뒤 route target을 소비한다', () => {
    const view = render(<TimetableDetailScreen />);
    const friendSection = view.getByTestId('friend-timetable-section-container');

    fireEvent(friendSection, 'layout', {nativeEvent: {layout: {y: 100}}});
    act(() => {
      mockFriendTimetableSectionProps?.onInitialFriendHandled?.();
    });

    expect(mockSetParams).not.toHaveBeenCalled();

    act(() => {
      frameCallbacks.get(1)?.(0);
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      targetFriendPublicId: undefined,
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      '친구 시간표로 이동했습니다.',
    );
  });

  it('화면이 비활성 상태이면 친구 target 부재 알림을 표시하지 않는다', () => {
    mockIsFocused.mockReturnValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<TimetableDetailScreen />);

    act(() => {
      mockFriendTimetableSectionProps?.onInitialFriendUnavailable?.();
    });

    expect(mockSetParams).toHaveBeenCalledWith({
      targetFriendPublicId: undefined,
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
