import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('같은 대상을 다시 열어도 이전 세션의 발송 응답을 적용하지 않는다', async () => {
    const staleSend =
      deferred<
        Array<{friendId: string; invitationId: string; outcome: 'SENT'}>
      >();
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn().mockReturnValue(staleSend.promise),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getPartyInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValue(eligible('party-1', '택시파티', '가람')),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendInvitationRepository>,
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onClose = jest.fn();
    const context = {targetId: 'party-1', type: 'PARTY' as const};
    const view = render(
      <FriendInviteSheet context={context} onClose={onClose} visible />,
    );

    await waitFor(() => expect(view.getByText('가람')).toBeTruthy());
    fireEvent.press(view.getByText('가람'));
    fireEvent.press(view.getByText('1명 초대하기'));
    await waitFor(() =>
      expect(repository.createPartyInvitations).toHaveBeenCalledTimes(1),
    );

    view.rerender(
      <FriendInviteSheet context={context} onClose={onClose} visible={false} />,
    );
    view.rerender(
      <FriendInviteSheet context={context} onClose={onClose} visible />,
    );
    await waitFor(() =>
      expect(
        repository.getPartyInvitationEligibleFriends,
      ).toHaveBeenCalledTimes(2),
    );
    fireEvent.press(view.getByText('가람'));

    await act(async () => {
      staleSend.resolve([
        {
          friendId: 'friend-party-1',
          invitationId: 'invitation-1',
          outcome: 'SENT',
        },
      ]);
      await staleSend.promise;
    });

    expect(view.getByText('1명 초대하기')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(repository.getPartyInvitationEligibleFriends).toHaveBeenCalledTimes(
      2,
    );
  });

  it('초대 전송 중에는 후보 선택을 바꾸지 않는다', async () => {
    const pendingSend = deferred<
      Array<{friendId: string; invitationId: string; outcome: 'SENT'}>
    >();
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn().mockReturnValue(pendingSend.promise),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getPartyInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValue(eligible('party-1', '택시파티', '가람')),
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

    await waitFor(() => expect(view.getByText('가람')).toBeTruthy());
    fireEvent.press(view.getByText('가람'));
    fireEvent.press(view.getByText('1명 초대하기'));
    await waitFor(() =>
      expect(repository.createPartyInvitations).toHaveBeenCalledWith(
        'party-1',
        ['friend-party-1'],
      ),
    );

    const candidate = view.UNSAFE_getByProps({
      accessibilityLabel: '가람 선택 해제',
    });
    expect(candidate.props.disabled).toBe(true);
    fireEvent.press(candidate);
    expect(view.getByText('1명 초대하기')).toBeTruthy();

    await act(async () => {
      pendingSend.resolve([
        {
          friendId: 'friend-party-1',
          invitationId: 'invitation-1',
          outcome: 'SENT',
        },
      ]);
      await pendingSend.promise;
    });
  });

  it('혼합 발송 결과에 친구 이름과 일반화된 결과를 표시한다', async () => {
    const mixedEligible: FriendInvitationEligibleFriends = {
      ...eligible('party-1', '택시파티', '가람'),
      friends: [
        {
          department: '컴퓨터공학과',
          favorite: false,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
        {
          department: '컴퓨터공학과',
          favorite: false,
          id: 'friend-2',
          nickname: '나래',
          photoUrl: null,
        },
      ],
    };
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn().mockResolvedValue([
        {friendId: 'friend-1', invitationId: 'invitation-1', outcome: 'SENT'},
        {friendId: 'friend-2', invitationId: null, outcome: 'NOT_ELIGIBLE'},
      ]),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getPartyInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValue(mixedEligible),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendInvitationRepository>,
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const view = render(
      <FriendInviteSheet
        context={{targetId: 'party-1', type: 'PARTY'}}
        onClose={jest.fn()}
        visible
      />,
    );

    await waitFor(() => expect(view.getByText('가람')).toBeTruthy());
    fireEvent.press(view.getByText('가람'));
    fireEvent.press(view.getByText('나래'));
    fireEvent.press(view.getByText('2명 초대하기'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '친구 초대 결과',
        '초대할 수 없음: 나래\n전송 완료: 가람',
      );
    });
  });

  it('발송 실패 후 최신 목록 확인도 실패하면 재전송을 막는다', async () => {
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn().mockRejectedValue(new Error('timeout')),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getPartyInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValueOnce(eligible('party-1', '택시파티', '가람'))
        .mockRejectedValueOnce(new Error('refresh failed'))
        .mockResolvedValueOnce(eligible('party-1', '택시파티', '가람')),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendInvitationRepository>,
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const view = render(
      <FriendInviteSheet
        context={{targetId: 'party-1', type: 'PARTY'}}
        onClose={jest.fn()}
        visible
      />,
    );

    await waitFor(() => expect(view.getByText('가람')).toBeTruthy());
    fireEvent.press(view.getByText('가람'));
    fireEvent.press(view.getByText('1명 초대하기'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '초대 전송 실패',
        expect.stringContaining('목록을 다시 불러온 뒤 재시도해 주세요.'),
      );
    });
    fireEvent.press(view.getByText('1명 초대하기'));

    expect(repository.createPartyInvitations).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByText('목록 다시 불러오기'));
    await waitFor(() =>
      expect(repository.getPartyInvitationEligibleFriends).toHaveBeenCalledTimes(
        3,
      ),
    );
    fireEvent.press(view.getByText('1명 초대하기'));
    await waitFor(() =>
      expect(repository.createPartyInvitations).toHaveBeenCalledTimes(2),
    );
  });

  it('발송 성공 뒤 최신 목록 확인이 실패하면 다시 불러오기 전까지 후보 선택을 잠근다', async () => {
    const repository = {
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn().mockResolvedValue([
        {
          friendId: 'friend-party-1',
          invitationId: 'invitation-1',
          outcome: 'SENT',
        },
      ]),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getPartyInvitationEligibleFriends: jest
        .fn()
        .mockResolvedValueOnce(eligible('party-1', '택시파티', '가람'))
        .mockRejectedValueOnce(new Error('refresh failed'))
        .mockResolvedValueOnce(eligible('party-1', '택시파티', '가람')),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendInvitationRepository>,
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const view = render(
      <FriendInviteSheet
        context={{targetId: 'party-1', type: 'PARTY'}}
        onClose={jest.fn()}
        visible
      />,
    );

    await waitFor(() => expect(view.getByText('가람')).toBeTruthy());
    fireEvent.press(view.getByText('가람'));
    fireEvent.press(view.getByText('1명 초대하기'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '친구 초대 결과',
        expect.stringContaining('최신 상태를 확인하지 못했습니다.'),
      );
    });
    const candidate = view.UNSAFE_getByProps({
      accessibilityLabel: '가람 선택',
    });
    expect(candidate.props.disabled).toBe(true);

    fireEvent.press(view.getByText('목록 다시 불러오기'));
    await waitFor(() => expect(candidate.props.disabled).toBe(false));
  });
});
