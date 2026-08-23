import React from 'react';
import {Alert, Text as RNText} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {useNavigation, useRoute} from '@react-navigation/native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useChatRooms} from '@/features/chat/hooks/useChatRooms';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';

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

jest.mock('../../components/FriendMinecraftAccountTree', () => ({
  FriendMinecraftAccountTree: () => null,
}));

jest.mock('../../components/FriendInviteSheet', () => ({
  FriendInviteSheet: () => null,
}));

jest.mock('../../components/FriendInviteTargetSheet', () => ({
  FriendInviteTargetSheet: () => null,
}));

jest.mock('@/features/taxi/hooks/useMyParty', () => ({
  useMyParty: () => ({myParty: null}),
}));

jest.mock('@/features/chat/hooks/useChatRooms', () => ({
  useChatRooms: jest.fn(),
}));

jest.mock('../../hooks/useFriendDetailData', () => ({
  useFriendDetailData: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseFriendDetailData = jest.mocked(useFriendDetailData);
const mockedUseChatRooms = jest.mocked(useChatRooms);
const mockedInvalidateData = jest.mocked(invalidateData);

const createFriendDetailData = (overrides: Partial<ReturnType<typeof useFriendDetailData>> = {}) => ({
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
  minecraftAccounts: {selfAccounts: []},
  minecraftAccountsError: undefined,
  minecraftAccountsLoading: false,
  mutating: false,
  reload: jest.fn(),
  reloadMinecraftAccounts: jest.fn(),
  removeFriend: jest.fn(),
  updateFavorite: jest.fn(),
  ...overrides,
}) as ReturnType<typeof useFriendDetailData>;

describe('FriendDetailScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseChatRooms.mockReturnValue({
      chatRooms: [],
      error: null,
      loading: false,
      refresh: jest.fn(),
    });
  });

  it('마인크래프트 계정은 친구 관리 기능보다 아래에 표시한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true), navigate: jest.fn()};
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData());

    const view = render(<FriendDetailScreen />);
    const visibleTexts = view.UNSAFE_getAllByType(RNText).map(node => node.props.children);

    expect(visibleTexts.indexOf('마인크래프트 계정')).toBeGreaterThan(
      visibleTexts.indexOf('차단하기'),
    );
    expect(mockedUseChatRooms).toHaveBeenCalledWith('all', {joinedOnly: true});
  });

  it('기존 친구 정보를 유지한 재조회 실패를 배너로 알리고 재시도할 수 있다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const reload = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      error: '최신 친구 정보를 불러오지 못했습니다.',
      reload,
    }));

    const view = render(<FriendDetailScreen />);

    expect(view.getByText('가람')).toBeTruthy();
    expect(view.getByText('최신 친구 정보를 불러오지 못했습니다.')).toBeTruthy();

    fireEvent.press(view.getByLabelText('다시 불러오기'));

    await waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  it('화면을 떠난 뒤 친구 끊기와 차단이 완료되어도 현재 화면을 뒤로 이동하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const removeFriend = jest.fn().mockResolvedValue(true);
    const blockFriend = jest.fn().mockResolvedValue(true);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));
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

  it('화면을 떠난 뒤 친구 끊기와 차단이 실패해도 오류를 표시하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const removeFriend = jest.fn().mockRejectedValue(new Error('network unavailable'));
    const blockFriend = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text !== '취소');
      action?.onPress?.();
    });

    const view = render(<FriendDetailScreen />);

    fireEvent.press(view.getByText('친구 끊기'));
    fireEvent.press(view.getByText('차단하기'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(removeFriend).toHaveBeenCalled();
    expect(blockFriend).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('실행되지 않은 친구 끊기와 차단을 성공으로 처리하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const removeFriend = jest.fn().mockResolvedValue(false);
    const blockFriend = jest.fn().mockResolvedValue(false);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));
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

    expect(mockedInvalidateData).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('친구 관리 요청이 진행 중이면 모든 친구 관리 액션을 비활성화한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const removeFriend = jest.fn();
    const blockFriend = jest.fn();
    const updateFavorite = jest.fn();
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));

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
    const updateFavorite = jest.fn().mockResolvedValue(true);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));

    const view = render(<FriendDetailScreen />);

    fireEvent.press(view.getByText('즐겨찾기에 추가'));

    await waitFor(() => {
      expect(updateFavorite).toHaveBeenCalled();
      expect(mockedInvalidateData).toHaveBeenCalledWith(FRIEND_HUB_INVALIDATION_KEY);
    });
  });

  it('친구 관계가 이미 사라졌으면 오류 확인 후 상세 화면을 나간다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const relationshipError = new RepositoryError(
      RepositoryErrorCode.NOT_FOUND,
      '친구 관계를 찾을 수 없습니다.',
      {context: {apiErrorCode: 'FRIENDSHIP_NOT_FOUND'}},
    );
    const updateFavorite = jest.fn().mockRejectedValue(relationshipError);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
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
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      args[2]?.find(button => button.text === '확인')?.onPress?.();
    });

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('즐겨찾기에 추가'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '오류',
        '친구 관계를 찾을 수 없습니다.',
        expect.any(Array),
      );
      expect(navigation.goBack).toHaveBeenCalled();
    });
    expect(mockedInvalidateData).toHaveBeenCalledWith(FRIEND_HUB_INVALIDATION_KEY);
  });
});
