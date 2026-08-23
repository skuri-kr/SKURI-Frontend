import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';

import {useFriendInvitationRepository} from '@/di';

import type {FriendInvitationEligibleFriends} from '../../model/friend';
import {FriendInviteSheet} from '../FriendInviteSheet';

jest.mock('@/di', () => ({
  useFriendInvitationRepository: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');

  return {
    BottomSheetBackdrop: ReactNative.View,
    BottomSheetFooter: ({children}: {children: React.ReactNode}) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
    BottomSheetModal: ReactModule.forwardRef(
      (
        {
          children,
          footerComponent,
        }: {
          children: React.ReactNode;
          footerComponent?: (props: Record<string, unknown>) => React.ReactNode;
        },
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          dismiss: jest.fn(),
          present: jest.fn(),
        }));
        return (
          <ReactNative.View>
            {children}
            {footerComponent?.({})}
          </ReactNative.View>
        );
      },
    ),
    BottomSheetScrollView: ReactModule.forwardRef(
      (
        {children}: {children: React.ReactNode},
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({scrollTo: jest.fn()}));
        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
    BottomSheetTextInput: ReactNative.TextInput,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  return {
    StateCard: ({title}: {title: string}) =>
      ReactModule.createElement(ReactNative.Text, null, title),
  };
});

jest.mock('@/shared/ui/Button', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  return ({
    disabled,
    onPress,
    title,
  }: {
    disabled?: boolean;
    onPress: () => void;
    title: string;
  }) =>
    ReactModule.createElement(
      ReactNative.TouchableOpacity,
      {disabled, onPress},
      ReactModule.createElement(ReactNative.Text, null, title),
    );
});

jest.mock('../FriendAvatar', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  return {FriendAvatar: () => ReactModule.createElement(ReactNative.View)};
});

const mockedUseRepository = jest.mocked(useFriendInvitationRepository);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

const eligible = (
  targetId: string,
  targetName: string,
  nickname: string,
): FriendInvitationEligibleFriends => ({
  alreadyMemberCount: 0,
  alreadyPendingCount: 0,
  expiresInDays: targetId.startsWith('room') ? 7 : null,
  friends: [
    {
      department: '컴퓨터공학과',
      favorite: false,
      id: `friend-${targetId}`,
      nickname,
      photoUrl: null,
    },
  ],
  notEligibleCount: 0,
  remainingCapacity: 2,
  targetId,
  targetName,
});

describe('FriendInviteSheet', () => {
  it('이전 대상의 늦은 조회 응답을 새 대상 목록에 적용하지 않는다', async () => {
    const staleParty = deferred<FriendInvitationEligibleFriends>();
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn(),
      getChatRoomInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValue(eligible('room-1', '채팅방', '채팅 친구')),
      getPartyInvitationEligibleFriends: jest.fn().mockReturnValue(staleParty.promise),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendInvitationRepository>,
    );

    const view = render(
      <FriendInviteSheet
        context={{targetId: 'party-1', type: 'PARTY'}}
        onClose={jest.fn()}
        visible
      />,
    );

    view.rerender(
      <FriendInviteSheet
        context={{targetId: 'room-1', type: 'CHAT_ROOM'}}
        onClose={jest.fn()}
        visible
      />,
    );

    await waitFor(() => expect(view.getByText('채팅 친구')).toBeTruthy());

    await act(async () => {
      staleParty.resolve(eligible('party-1', '택시파티', '이전 파티 친구'));
      await staleParty.promise;
    });

    expect(view.queryByText('이전 파티 친구')).toBeNull();
    expect(view.getByText('채팅 친구')).toBeTruthy();
  });
});
