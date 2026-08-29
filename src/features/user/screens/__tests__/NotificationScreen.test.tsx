import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {useFocusEffect} from '@react-navigation/native';

import {useAppNoticeFeedData} from '@/features/settings';

import {useNotificationCenterData} from '../../hooks/useNotificationCenterData';
import {NotificationScreen} from '../NotificationScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(() => ({goBack: jest.fn(), navigate: jest.fn(), popToTop: jest.fn()})),
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View};
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@/app/navigation/services/notificationNavigation', () => ({
  getStoredNotificationNavigationIntent: jest.fn(),
  openNotificationNavigationIntent: jest.fn(),
}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('@/shared/design-system/components', () => {
  const {View} = require('react-native');
  return {
    StackHeader: () => null,
    StateCard: ({title}: {title: string}) => <View testID={`state-card-${title}`} />,
  };
});
jest.mock('@/features/settings', () => {
  const {View} = require('react-native');
  return {
    AppNoticeFeedList: () => <View testID="app-notice-feed-list" />,
    useAppNoticeFeedData: jest.fn(),
  };
});
jest.mock('../../components/NotificationHubTabBar', () => {
  const {TouchableOpacity} = require('react-native');
  return {
    NotificationHubTabBar: ({onSelectTab}: {onSelectTab: (tab: 'appNotice') => void}) => (
      <TouchableOpacity
        onPress={() => onSelectTab('appNotice')}
        testID="notification-tab-app-notice"
      />
    ),
  };
});
jest.mock('../../components/NotificationInboxList', () => ({NotificationInboxList: () => null}));
jest.mock('../../hooks/useNotificationCenterData', () => ({useNotificationCenterData: jest.fn()}));

const mockedUseFocusEffect = jest.mocked(useFocusEffect);
const mockedUseAppNoticeFeedData = jest.mocked(useAppNoticeFeedData);
const mockedUseNotificationCenterData = jest.mocked(useNotificationCenterData);

describe('NotificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNotificationCenterData.mockReturnValue({
      data: {sections: [], unreadCount: 0},
      error: null,
      loading: false,
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
      reload: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useNotificationCenterData>);
  });

  it('상세 화면에서 돌아온 focus에만 앱 공지 목록을 다시 불러온다', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockedUseAppNoticeFeedData.mockReturnValue({
      data: {items: []},
      error: null,
      loading: false,
      reload,
    } as ReturnType<typeof useAppNoticeFeedData>);

    render(<NotificationScreen />);
    const focusCallback = mockedUseFocusEffect.mock.calls[0]?.[0];
    if (!focusCallback) throw new Error('focus callback이 등록되지 않았습니다.');

    act(() => {
      focusCallback();
    });
    expect(reload).not.toHaveBeenCalled();

    await act(async () => {
      focusCallback();
      await Promise.resolve();
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('캐시된 앱 공지 목록이 있으면 재조회 실패 후에도 목록을 유지한다', () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockedUseAppNoticeFeedData.mockReturnValue({
      data: {items: []},
      error: '앱 공지사항을 불러오지 못했습니다.',
      loading: false,
      reload,
    } as ReturnType<typeof useAppNoticeFeedData>);

    const screen = render(<NotificationScreen />);
    fireEvent.press(screen.getByTestId('notification-tab-app-notice'));

    expect(screen.getByTestId('app-notice-feed-list')).toBeTruthy();
    expect(screen.getByText('앱 공지사항을 불러오지 못했습니다.')).toBeTruthy();
    expect(screen.queryByTestId('state-card-앱 공지사항을 불러오지 못했습니다')).toBeNull();

    fireEvent.press(screen.getByText('다시 시도'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
