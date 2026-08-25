import React from 'react';
import {Alert, Text as RNText} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {useNavigation, useRoute} from '@react-navigation/native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useChatRooms} from '@/features/chat/hooks/useChatRooms';
import {useMyParty} from '@/features/taxi/hooks/useMyParty';
import {useFriendInvitationRepository} from '@/di';
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
  StateCard: ({actionLabel, onPressAction, title}: {actionLabel?: string; onPressAction?: () => void; title: string}) => {
    const {createElement} = require('react');
    const {Text, TouchableOpacity, View} = require('react-native');
    return createElement(View, undefined,
      createElement(Text, undefined, title),
      actionLabel ? createElement(TouchableOpacity, {onPress: onPressAction}, createElement(Text, undefined, actionLabel)) : null,
    );
  },
}));

jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));

jest.mock('@/di', () => ({
  useFriendInvitationRepository: jest.fn(),
}));

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
  useMyParty: jest.fn(),
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
const mockedUseMyParty = jest.mocked(useMyParty);
const mockedUseFriendInvitationRepository = jest.mocked(
  useFriendInvitationRepository,
);
const mockedInvalidateData = jest.mocked(invalidateData);

const createDeferred = <T,>() => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });

  return {promise, reject, resolve};
};

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
    mockedUseFriendInvitationRepository.mockReturnValue({
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn(),
    } as unknown as ReturnType<typeof useFriendInvitationRepository>);
    mockedUseChatRooms.mockReturnValue({
      chatRooms: [],
      error: null,
      loading: false,
      refresh: jest.fn(),
    });
    mockedUseMyParty.mockReturnValue({
      myParty: null,
    } as ReturnType<typeof useMyParty>);
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

  it('참여 채팅방 조회가 실패하면 초대 섹션에서 오류와 재시도를 제공한다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true), navigate: jest.fn()};
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData());
    mockedUseChatRooms.mockReturnValue({
      chatRooms: [],
      error: new Error('joined rooms unavailable'),
      loading: false,
      refresh,
    });

    const view = render(<FriendDetailScreen />);

    expect(view.getByText('채팅방을 불러오지 못했습니다')).toBeTruthy();
    fireEvent.press(view.getByText('다시 시도'));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('한 개의 공개 채팅방 초대는 확인 후 바로 전송하고 성공 Alert는 띄우지 않는다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
    };
    const createChatRoomInvitations = jest.fn().mockResolvedValue([
      {friendId: 'friend-1', invitationId: 'invitation-1', outcome: 'SENT'},
    ]);
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {friendId: 'friend-1'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData());
    mockedUseFriendInvitationRepository.mockReturnValue({
      createChatRoomInvitations,
      createPartyInvitations: jest.fn(),
    } as unknown as ReturnType<typeof useFriendInvitationRepository>);
    mockedUseChatRooms.mockReturnValue({
      chatRooms: [
        {
          id: 'room-1',
          isJoined: true,
          isPublic: true,
          memberCount: 3,
          name: '전체 채팅방',
          type: 'university',
        },
      ],
      error: null,
      loading: false,
      refresh: jest.fn(),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      args[2]?.find(button => button.text === '초대')?.onPress?.();
    });

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('공개 채팅방에 초대'));

    await waitFor(() => {
      expect(createChatRoomInvitations).toHaveBeenCalledWith('room-1', [
        'friend-1',
      ]);
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      '친구 초대',
      '가람 님을 공개 채팅방에 초대하시겠습니까?',
      expect.any(Array),
    );
  });

  it('다른 친구로 전환된 뒤 이전 친구 초대 결과는 표시하지 않는다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
    };
    const invitationDeferred = createDeferred<Array<{
      friendId: string;
      invitationId?: string;
      outcome: 'ALREADY_PENDING';
    }>>();
    const createChatRoomInvitations = jest
      .fn()
      .mockReturnValue(invitationDeferred.promise);
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {friendId: 'friend-1'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData());
    mockedUseFriendInvitationRepository.mockReturnValue({
      createChatRoomInvitations,
      createPartyInvitations: jest.fn(),
    } as unknown as ReturnType<typeof useFriendInvitationRepository>);
    mockedUseChatRooms.mockReturnValue({
      chatRooms: [
        {
          id: 'room-1',
          isJoined: true,
          isPublic: true,
          memberCount: 3,
          name: '전체 채팅방',
          type: 'university',
        },
      ],
      error: null,
      loading: false,
      refresh: jest.fn(),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('공개 채팅방에 초대'));
    const inviteAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 초대')?.[2]
      ?.find(button => button.text === '초대');
    act(() => {
      inviteAction?.onPress?.();
    });

    await waitFor(() => {
      expect(createChatRoomInvitations).toHaveBeenCalledWith('room-1', [
        'friend-1',
      ]);
    });

    mockedUseRoute.mockReturnValue({
      params: {friendId: 'friend-2'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      friend: {
        department: null,
        favorite: false,
        id: 'friend-2',
        nickname: '나래',
        photoUrl: null,
      },
    }));
    view.rerender(<FriendDetailScreen />);
    alertSpy.mockClear();

    await act(async () => {
      invitationDeferred.resolve([
        {friendId: 'friend-1', outcome: 'ALREADY_PENDING'},
      ]);
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('모집 마감된 현재 택시파티에서도 친구 초대를 제공한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true), navigate: jest.fn()};
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData());
    mockedUseMyParty.mockReturnValue({
      myParty: {
        departure: {name: '명학역'},
        destination: {name: '성결대학교'},
        id: 'party-1',
        status: 'closed',
      },
    } as ReturnType<typeof useMyParty>);

    const view = render(<FriendDetailScreen />);

    expect(view.getByText('택시파티에 초대')).toBeTruthy();
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

  it('다른 친구로 전환된 뒤 이전 친구 관리 요청이 완료되어도 현재 상세를 닫지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const removeDeferred = createDeferred<boolean>();
    const blockDeferred = createDeferred<boolean>();
    const removeFriend = jest.fn().mockReturnValue(removeDeferred.promise);
    const blockFriend = jest.fn().mockReturnValue(blockDeferred.promise);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      blockFriend,
      removeFriend,
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('친구 끊기'));
    fireEvent.press(view.getByText('차단하기'));

    const removeAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 끊기')?.[2]
      ?.find(button => button.text === '친구 끊기');
    const blockAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 차단')?.[2]
      ?.find(button => button.text === '차단');
    act(() => {
      removeAction?.onPress?.();
      blockAction?.onPress?.();
    });

    await waitFor(() => {
      expect(removeFriend).toHaveBeenCalledTimes(1);
      expect(blockFriend).toHaveBeenCalledTimes(1);
    });

    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-2'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      friend: {
        department: null,
        favorite: false,
        id: 'friend-2',
        nickname: '나래',
        photoUrl: null,
      },
    }));
    view.rerender(<FriendDetailScreen />);

    await act(async () => {
      removeDeferred.resolve(true);
      blockDeferred.resolve(true);
    });

    expect(mockedInvalidateData).toHaveBeenNthCalledWith(
      1,
      FRIEND_HUB_INVALIDATION_KEY,
    );
    expect(mockedInvalidateData).toHaveBeenNthCalledWith(
      2,
      FRIEND_HUB_INVALIDATION_KEY,
    );
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('다른 친구로 전환된 뒤 이전 친구 관리 요청이 실패하면 오류를 표시하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const removeDeferred = createDeferred<boolean>();
    const blockDeferred = createDeferred<boolean>();
    const removeFriend = jest.fn().mockReturnValue(removeDeferred.promise);
    const blockFriend = jest.fn().mockReturnValue(blockDeferred.promise);
    const relationshipError = new RepositoryError(
      RepositoryErrorCode.NOT_FOUND,
      '친구 관계를 찾을 수 없습니다.',
      {context: {apiErrorCode: 'FRIENDSHIP_NOT_FOUND'}},
    );
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      blockFriend,
      removeFriend,
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('친구 끊기'));
    fireEvent.press(view.getByText('차단하기'));

    const removeAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 끊기')?.[2]
      ?.find(button => button.text === '친구 끊기');
    const blockAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 차단')?.[2]
      ?.find(button => button.text === '차단');
    act(() => {
      removeAction?.onPress?.();
      blockAction?.onPress?.();
    });

    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-2'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      friend: {
        department: null,
        favorite: false,
        id: 'friend-2',
        nickname: '나래',
        photoUrl: null,
      },
    }));
    view.rerender(<FriendDetailScreen />);
    alertSpy.mockClear();

    await act(async () => {
      removeDeferred.reject(relationshipError);
      blockDeferred.reject(relationshipError);
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockedInvalidateData).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('이전 친구 오류 Alert를 연 뒤 대상이 바뀌면 확인해도 현재 상세를 닫지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const relationshipError = new RepositoryError(
      RepositoryErrorCode.NOT_FOUND,
      '친구 관계를 찾을 수 없습니다.',
      {context: {apiErrorCode: 'FRIENDSHIP_NOT_FOUND'}},
    );
    const removeFriend = jest.fn().mockRejectedValue(relationshipError);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-1'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({removeFriend}));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const view = render(<FriendDetailScreen />);
    fireEvent.press(view.getByText('친구 끊기'));
    const removeAction = alertSpy.mock.calls
      .find(([title]) => title === '친구 끊기')?.[2]
      ?.find(button => button.text === '친구 끊기');
    act(() => {
      removeAction?.onPress?.();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '오류',
        '친구 관계를 찾을 수 없습니다.',
        expect.any(Array),
      );
    });
    const errorConfirmAction = alertSpy.mock.calls
      .find(([title]) => title === '오류')?.[2]
      ?.find(button => button.text === '확인');

    mockedUseRoute.mockReturnValue({params: {friendId: 'friend-2'}} as ReturnType<typeof useRoute>);
    mockedUseFriendDetailData.mockReturnValue(createFriendDetailData({
      friend: {
        department: null,
        favorite: false,
        id: 'friend-2',
        nickname: '나래',
        photoUrl: null,
      },
    }));
    view.rerender(<FriendDetailScreen />);

    act(() => {
      errorConfirmAction?.onPress?.();
    });

    expect(mockedInvalidateData).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
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
