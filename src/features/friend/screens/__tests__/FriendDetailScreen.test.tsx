import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {useNavigation, useRoute} from '@react-navigation/native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';

import {useFriendDetailData} from '../../hooks/useFriendDetailData';
import {FriendDetailScreen} from '../FriendDetailScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const {createElement} = require('react');
    const {View} = require('react-native');
    return createElement(View, undefined, children);
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => ({
  SettingsRow: ({disabled, onPress, title}: {disabled?: boolean; onPress: () => void; title: string}) => {
    const {createElement} = require('react');
    const {Text, TouchableOpacity} = require('react-native');
    return createElement(TouchableOpacity, {disabled, onPress}, createElement(Text, undefined, title));
  },
  SettingsSection: ({children}: {children: React.ReactNode}) => children,
  StackHeader: () => null,
  StateCard: () => null,
}));

jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

jest.mock('../../components/FriendAvatar', () => ({FriendAvatar: () => null}));

jest.mock('../../hooks/useFriendDetailData', () => ({
  useFriendDetailData: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseFriendDetailData = jest.mocked(useFriendDetailData);
const mockedInvalidateData = jest.mocked(invalidateData);

describe('FriendDetailScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('화면을 떠난 뒤 친구 끊기와 차단이 완료되어도 현재 화면을 뒤로 이동하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const removeFriend = jest.fn().mockResolvedValue(undefined);
    const blockFriend = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue({
      blockFriend,
      error: undefined,
      friend: {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      loading: false,
      mutating: false,
      reload: jest.fn(),
      removeFriend,
      updateFavorite: jest.fn(),
    } as ReturnType<typeof useFriendDetailData>);
    jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text !== '취소');
      action?.onPress?.();
    });

    const view = render(<FriendDetailScreen />);

    fireEvent.press(view.getByText('친구 끊기'));
    fireEvent.press(view.getByText('차단하기'));

    await waitFor(() => {
      expect(removeFriend).toHaveBeenCalled();
      expect(blockFriend).toHaveBeenCalled();
    });

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.isFocused).toHaveBeenCalledTimes(2);
    expect(mockedInvalidateData).toHaveBeenCalledTimes(2);
    expect(mockedInvalidateData).toHaveBeenNthCalledWith(1, FRIEND_HUB_INVALIDATION_KEY);
    expect(mockedInvalidateData).toHaveBeenNthCalledWith(2, FRIEND_HUB_INVALIDATION_KEY);
  });

  it('친구 관리 요청이 진행 중이면 모든 친구 관리 액션을 비활성화한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const removeFriend = jest.fn();
    const blockFriend = jest.fn();
    const updateFavorite = jest.fn();
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue({
      blockFriend,
      error: undefined,
      friend: {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      loading: false,
      mutating: true,
      reload: jest.fn(),
      removeFriend,
      updateFavorite,
    } as ReturnType<typeof useFriendDetailData>);

    const view = render(<FriendDetailScreen />);

    fireEvent.press(view.getByText('즐겨찾기에 추가'));
    fireEvent.press(view.getByText('친구 끊기'));
    fireEvent.press(view.getByText('차단하기'));

    expect(updateFavorite).not.toHaveBeenCalled();
    expect(removeFriend).not.toHaveBeenCalled();
    expect(blockFriend).not.toHaveBeenCalled();
  });

  it('즐겨찾기 저장 성공 후에는 화면 포커스와 무관하게 허브를 무효화한다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const updateFavorite = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue({
      blockFriend: jest.fn(),
      error: undefined,
      friend: {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      loading: false,
      mutating: false,
      reload: jest.fn(),
      removeFriend: jest.fn(),
      updateFavorite,
    } as ReturnType<typeof useFriendDetailData>);

    const view = render(<FriendDetailScreen />);

    fireEvent.press(view.getByText('즐겨찾기에 추가'));

    await waitFor(() => {
      expect(updateFavorite).toHaveBeenCalled();
      expect(mockedInvalidateData).toHaveBeenCalledWith(FRIEND_HUB_INVALIDATION_KEY);
    });
  });
});
