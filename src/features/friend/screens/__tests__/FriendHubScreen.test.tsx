import React from 'react';
import {Alert, ScrollView, View as RNView} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';

import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';
import {
  navigateToCommunityChat,
  navigateToTaxiAcceptancePendingBySeed,
  navigateToTaxiChat,
} from '@/app/navigation/services/appRouteNavigation';

import {useFriendHubData} from '../../hooks/useFriendHubData';
import {useFriendInvitationsData} from '../../hooks/useFriendInvitationsData';
import {FriendHubScreen} from '../FriendHubScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const transition = {
    damping: () => transition,
    duration: () => transition,
    mass: () => transition,
    springify: () => transition,
    stiffness: () => transition,
  };
  return {
    __esModule: true,
    default: {View},
    FadeInDown: transition,
    FadeOutUp: transition,
    LinearTransition: transition,
  };
});

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  useInvalidationVersion: jest.fn(),
}));

jest.mock('@/app/navigation/services/appRouteNavigation', () => ({
  navigateToCommunityChat: jest.fn(),
  navigateToTaxiAcceptancePendingBySeed: jest.fn(),
  navigateToTaxiChat: jest.fn(),
}));

jest.mock('@/shared/design-system/components', () => ({
  SegmentedControl: ({items}: {items: Array<{label: string}>}) => {
    const {createElement} = require('react');
    const {Text} = require('react-native');
    return createElement(Text, undefined, items.map(item => item.label).join(' '));
  },
  StackHeader: () => null,
  ToneBadge: () => null,
  StateCard: ({title}: {title: string}) => {
    const {createElement} = require('react');
    const {Text} = require('react-native');
    return createElement(Text, undefined, title);
  },
}));

jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));

jest.mock('../../components/FriendAvatar', () => ({FriendAvatar: () => null}));

jest.mock('../../hooks/useFriendHubData', () => ({
  useFriendHubData: jest.fn(),
}));

jest.mock('../../hooks/useFriendInvitationsData', () => ({
  useFriendInvitationsData: jest.fn(),
}));

const mockedUseFriendHubData = jest.mocked(useFriendHubData);
const mockedNavigateToTaxiAcceptancePendingBySeed = jest.mocked(
  navigateToTaxiAcceptancePendingBySeed,
);
const mockedUseFriendInvitationsData = jest.mocked(useFriendInvitationsData);
const mockedUseInvalidationVersion = jest.mocked(useInvalidationVersion);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedNavigateToCommunityChat = jest.mocked(navigateToCommunityChat);
const mockedNavigateToTaxiChat = jest.mocked(navigateToTaxiChat);

const createFriendHubData = (
  overrides: Partial<ReturnType<typeof useFriendHubData>> = {},
) => ({
  acceptRequest: jest.fn().mockResolvedValue(undefined),
  cancelRequest: jest.fn().mockResolvedValue(undefined),
  completedRequestActions: new Map(),
  declineRequest: jest.fn().mockResolvedValue(undefined),
  friendError: undefined,
  friends: [],
  hasLoadedFriends: true,
  hasLoadedReceivedRequests: true,
  hasLoadedSentRequests: true,
  incomingRequestCount: 0,
  loadingMoreDirections: new Set(),
  loadMoreRequests: jest.fn().mockResolvedValue(undefined),
  mutatingRequestActions: new Map(),
  mutatingRequestIds: new Set(),
  receivedNextCursor: null,
  receivedRequests: [],
  receivedRequestsError: undefined,
  reload: jest.fn().mockResolvedValue(true),
  reloadFriends: jest.fn().mockResolvedValue(undefined),
  reloadRequestDirection: jest.fn().mockResolvedValue(undefined),
  sentNextCursor: null,
  sentRequests: [],
  sentRequestsError: undefined,
  updateFavorite: jest.fn().mockResolvedValue(undefined),
  updatingFavoriteIds: new Set(),
  ...overrides,
}) as ReturnType<typeof useFriendHubData>;

const createDeferred = <T,>() => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });

  return {promise, reject, resolve};
};

const createPartyInvitation = (id: string, partyId: string) => ({
  createdAt: '2026-08-23T12:00:00',
  expiresAt: null,
  expiryReason: null,
  id,
  inviter: {
    department: null,
    favorite: false,
    id: `friend-${id}`,
    nickname: '가람',
    photoUrl: null,
  },
  respondedAt: null,
  status: 'PENDING' as const,
  target: {
    currentMembers: 2,
    departureName: '성결대학교',
    departureTime: '2026-08-23T14:00:00',
    destinationName: '안양역',
    id: partyId,
    maxMembers: 4,
    status: 'OPEN' as const,
    type: 'PARTY' as const,
  },
  type: 'PARTY' as const,
});

const createFriendRequest = (id: string) => ({
  createdAt: '2026-08-25T09:00:00',
  department: null,
  expiresAt: '2026-09-24T09:00:00',
  friend: {
    department: null,
    id: `friend-${id}`,
    nickname: '가람',
    photoUrl: null,
  },
  id,
});

describe('FriendHubScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseInvalidationVersion.mockReturnValue(0);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
      setParams: jest.fn(),
    } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({params: {}} as ReturnType<typeof useRoute>);
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: jest.fn().mockResolvedValue(true),
    });
  });

  it('다른 친구 요청 조회가 진행 중이어도 친구 목록 실패를 즉시 표시한다', () => {
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        friendError: 'network unavailable',
        hasLoadedFriends: false,
        hasLoadedReceivedRequests: false,
        hasLoadedSentRequests: false,
      }),
    );

    const view = render(<FriendHubScreen />);

    expect(view.getByText('친구 목록을 불러오지 못했습니다')).toBeTruthy();
    expect(view.queryByText('친구를 불러오는 중')).toBeNull();
  });

  it('정확한 요청 수를 알 수 없고 다음 페이지가 있으면 하한으로 표시한다', () => {
    const receivedRequests = Array.from({length: 20}, (_, index) => ({
      createdAt: '2026-08-18T11:00:00',
      department: null,
      expiresAt: '2026-09-17T11:00:00',
      friend: {
        department: null,
        id: `friend-${index + 1}`,
        nickname: `친구${index + 1}`,
        photoUrl: null,
      },
      id: `request-${index + 1}`,
    }));
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        hasLoadedReceivedRequests: true,
        incomingRequestCount: undefined,
        receivedNextCursor: 'received-cursor',
        receivedRequests,
      }),
    );

    const view = render(<FriendHubScreen />);

    expect(view.getByText('친구 0 요청 20+ 초대 0')).toBeTruthy();
  });

  it('신뢰할 수 있는 초대 수가 없으면 undefined 대신 기본 탭 이름을 표시한다', () => {
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: 'chat unavailable',
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: 'party unavailable',
      pendingCount: undefined,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);

    expect(view.getByText('친구 0 요청 0 초대')).toBeTruthy();
    expect(view.queryByText(/undefined/)).toBeNull();
  });

  it('대상 없는 알림 route는 친구 허브 스크롤을 최상단으로 되돌린다', () => {
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());

    render(<FriendHubScreen />);

    expect(scrollToSpy).toHaveBeenCalledWith({animated: false, y: 0});
    scrollToSpy.mockRestore();
  });

  it('알림에서 연 초대는 초대 탭의 해당 카드에 강조 표시한다', () => {
    const invitation = {
      createdAt: '2026-08-25T09:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: '소프트웨어학과',
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-25T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: jest.fn(() => new Promise<boolean>(() => undefined)),
    });

    const view = render(<FriendHubScreen />);

    expect(view.getByLabelText('알림에서 선택한 초대')).toBeTruthy();
    expect(navigation.setParams).toHaveBeenCalledWith({
      initialTab: undefined,
      targetInvitationId: undefined,
      targetInvitationType: undefined,
    });
  });

  it('대상 없는 초대 탭 경로는 이전 알림 초대 강조를 유지하지 않는다', async () => {
    const invitation = {
      createdAt: '2026-08-25T09:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: '소프트웨어학과',
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-25T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    const reloadInvitations = jest.fn(() => new Promise<boolean>(() => undefined));
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);

    expect(view.getByLabelText('알림에서 선택한 초대')).toBeTruthy();

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'invitations'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await waitFor(() => {
      expect(view.queryByLabelText('알림에서 선택한 초대')).toBeNull();
      expect(reloadInvitations).toHaveBeenCalledTimes(2);
    });
  });

  it('대상 없는 초대 탭 경로는 이전 대상 재조회의 재시도를 취소한다', async () => {
    const invitation = createPartyInvitation('party-invitation-reload-a', 'party-reload-a');
    const targetReload = createDeferred<boolean>();
    const fallbackReload = createDeferred<boolean>();
    const reloadInvitations = jest
      .fn()
      .mockReturnValueOnce(targetReload.promise)
      .mockReturnValueOnce(fallbackReload.promise);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);
    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(1);
    });

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'invitations'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);
    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      targetReload.resolve(false);
    });

    expect(reloadInvitations).toHaveBeenCalledTimes(2);
    await act(async () => {
      fallbackReload.resolve(true);
    });
  });

  it('같은 초대 알림을 다시 열면 저장된 카드 위치로 다시 스크롤한다', async () => {
    const invitation = {
      createdAt: '2026-08-25T09:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: '소프트웨어학과',
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-25T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const reloadInvitations = jest.fn().mockResolvedValue(true);
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (callback: (time: number) => void) => {
      callback(0);
      return 0;
    };
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);
    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(1);
    });
    const invitationLayout = view.UNSAFE_getAllByType(RNView).find(
      node => typeof node.props.onLayout === 'function',
    );

    fireEvent(invitationLayout!, 'layout', {nativeEvent: {layout: {y: 120}}});

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({animated: true, y: 112});
    });
    scrollToSpy.mockClear();

    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(2);
      expect(scrollToSpy).toHaveBeenCalledWith({animated: true, y: 112});
    });

    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    scrollToSpy.mockRestore();
  });

  it('이미 열린 허브에서는 새 초대 목록을 받기 전 대상 강조를 지우지 않는다', () => {
    const invitation = {
      createdAt: '2026-08-25T09:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: '소프트웨어학과',
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-25T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const reloadInvitations = jest.fn(
      () => new Promise<boolean>(() => undefined),
    );
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: true,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);

    expect(reloadInvitations).toHaveBeenCalledTimes(1);

    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });
    view.rerender(<FriendHubScreen />);

    expect(view.getByLabelText('알림에서 선택한 초대')).toBeTruthy();
  });

  it('처리되었거나 만료된 알림 대상 초대는 안내 후 목록을 유지한다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: 'processed-party-invitation-1',
        targetInvitationType: 'PARTY',
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '초대를 찾을 수 없어요',
        '해당 초대는 이미 처리되었거나 만료되었어요.',
      );
    });
    expect(view.getByText('받은 초대가 없어요')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('대상과 무관한 초대 목록 오류는 처리·만료 안내를 막지 않는다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: 'processed-party-invitation-1',
        targetInvitationType: 'PARTY',
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: '채팅방 초대를 불러오지 못했습니다.',
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: jest.fn().mockResolvedValue(true),
    });

    render(<FriendHubScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '초대를 찾을 수 없어요',
        '해당 초대는 이미 처리되었거나 만료되었어요.',
      );
    });
  });

  it('알림에서 연 초대를 직접 거절하면 처리·만료 안내를 다시 띄우지 않는다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const invitation = {
      createdAt: '2026-08-25T09:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: '소프트웨어학과',
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-25T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const declineInvitation = jest.fn().mockResolvedValue(undefined);
    const reloadInvitations = jest.fn().mockResolvedValue(true);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation,
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);

    await act(async () => {});

    fireEvent.press(view.getByText('거절'));
    await waitFor(() => {
      expect(declineInvitation).toHaveBeenCalledWith(invitation);
    });

    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation,
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: reloadInvitations,
    });
    view.rerender(<FriendHubScreen />);

    expect(view.getByText('받은 초대가 없어요')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('다른 초대 알림으로 전환된 뒤 이전 초대 거절 실패 오류는 표시하지 않는다', async () => {
    const invitationA = createPartyInvitation('party-invitation-decline-a', 'party-decline-a');
    const invitationB = {
      ...invitationA,
      id: 'party-invitation-decline-b',
      inviter: {...invitationA.inviter, id: 'friend-decline-b', nickname: '나래'},
      target: {...invitationA.target, id: 'party-decline-b'},
    };
    const declineDeferred = createDeferred<void>();
    const declineInvitation = jest.fn().mockReturnValue(declineDeferred.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationA.id,
        targetInvitationType: invitationA.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation,
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitationA, invitationB],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 2,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getAllByText('거절')[0]);
    await waitFor(() => {
      expect(declineInvitation).toHaveBeenCalledWith(invitationA);
    });

    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationB.id,
        targetInvitationType: invitationB.type,
      },
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);
    alertSpy.mockClear();

    await act(async () => {
      declineDeferred.reject(new Error('decline failed'));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('다른 초대 알림으로 전환된 뒤 이전 초대 삭제 실패 오류는 표시하지 않는다', async () => {
    const invitationA = {
      ...createPartyInvitation('party-invitation-delete-a', 'party-delete-a'),
      expiresAt: '2026-08-25T10:00:00',
      expiryReason: 'CAPACITY_FULL' as const,
      status: 'EXPIRED' as const,
    };
    const invitationB = createPartyInvitation('party-invitation-delete-b', 'party-delete-b');
    const deleteDeferred = createDeferred<void>();
    const deleteInvitation = jest.fn().mockReturnValue(deleteDeferred.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationA.id,
        targetInvitationType: invitationA.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation,
      hasLoaded: true,
      invitations: [invitationA, invitationB],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('목록에서 지우기'));
    await waitFor(() => {
      expect(deleteInvitation).toHaveBeenCalledWith(invitationA);
    });

    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationB.id,
        targetInvitationType: invitationB.type,
      },
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);
    alertSpy.mockClear();

    await act(async () => {
      deleteDeferred.reject(new Error('delete failed'));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('다른 FriendHub 알림 route로 전환된 뒤 이전 친구 요청 수락 실패 오류는 표시하지 않는다', async () => {
    const request = createFriendRequest('request-accept-a');
    const acceptDeferred = createDeferred<void>();
    const acceptRequest = jest.fn().mockReturnValue(acceptDeferred.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        acceptRequest,
        incomingRequestCount: 1,
        receivedRequests: [request],
      }),
    );

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('수락'));
    await waitFor(() => {
      expect(acceptRequest).toHaveBeenCalledWith(request.id);
    });

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'friends'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await act(async () => {
      acceptDeferred.reject(new Error('accept failed'));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('다른 FriendHub 알림 route로 전환된 뒤 이전 친구 요청 거절 실패 오류는 표시하지 않는다', async () => {
    const request = createFriendRequest('request-decline-a');
    const declineDeferred = createDeferred<void>();
    const declineRequest = jest.fn().mockReturnValue(declineDeferred.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        declineRequest,
        incomingRequestCount: 1,
        receivedRequests: [request],
      }),
    );

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('거절'));
    await waitFor(() => {
      expect(declineRequest).toHaveBeenCalledWith(request.id);
    });

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'friends'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await act(async () => {
      declineDeferred.reject(new Error('decline failed'));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('다른 FriendHub 알림 route로 전환된 뒤 이전 친구 요청 취소 실패 오류는 표시하지 않는다', async () => {
    const request = createFriendRequest('request-cancel-a');
    const cancelDeferred = createDeferred<void>();
    const cancelRequest = jest.fn().mockReturnValue(cancelDeferred.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => {
        buttons?.find(button => button.text === '요청 취소')?.onPress?.();
      },
    );
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        cancelRequest,
        sentRequests: [request],
      }),
    );

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('요청 취소'));
    await waitFor(() => {
      expect(cancelRequest).toHaveBeenCalledWith(request.id);
    });

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'friends'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await act(async () => {
      cancelDeferred.reject(new Error('cancel failed'));
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('친구 요청 취소 확인 전에 route가 전환되면 이전 요청을 취소하지 않는다', async () => {
    const request = createFriendRequest('request-cancel-b');
    const cancelRequest = jest.fn().mockResolvedValue(undefined);
    let confirmCancel: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      confirmCancel = buttons?.find(button => button.text === '요청 취소')?.onPress;
    });
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        cancelRequest,
        sentRequests: [request],
      }),
    );

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('요청 취소'));
    expect(confirmCancel).toBeDefined();

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'friends'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);
    act(() => {
      confirmCancel?.();
    });

    expect(cancelRequest).not.toHaveBeenCalled();
  });

  it('초대 수락 완료 전에 화면을 떠났으면 대상 화면으로 이동하지 않는다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(false),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    const invitation = {
      createdAt: '2026-08-23T12:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-23T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const acceptInvitation = jest.fn().mockResolvedValue({
      invitationId: invitation.id,
      status: 'ACCEPTED',
      targetId: 'party-1',
      type: 'PARTY',
    });
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'invitations'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation,
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('수락'));

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledWith(invitation);
    });
    expect(mockedNavigateToTaxiChat).not.toHaveBeenCalled();
    expect(mockedNavigateToCommunityChat).not.toHaveBeenCalled();
  });

  it('다른 초대 알림으로 전환된 뒤 이전 초대 수락이 완료되어도 이동하지 않는다', async () => {
    const invitationA = {
      createdAt: '2026-08-23T12:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-a',
      inviter: {
        department: null,
        favorite: false,
        id: 'friend-a',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-23T14:00:00',
        destinationName: '안양역',
        id: 'party-a',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const invitationB = {
      ...invitationA,
      id: 'party-invitation-b',
      inviter: {...invitationA.inviter, id: 'friend-b', nickname: '나래'},
      target: {...invitationA.target, id: 'party-b'},
    };
    const acceptDeferred = createDeferred<{
      invitationId: string;
      status: 'ACCEPTED';
      targetId: string;
      type: 'PARTY';
    }>();
    const acceptInvitation = jest.fn().mockReturnValue(acceptDeferred.promise);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationA.id,
        targetInvitationType: invitationA.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation,
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitationA, invitationB],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 2,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getAllByText('수락')[0]);

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledWith(invitationA);
    });

    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationB.id,
        targetInvitationType: invitationB.type,
      },
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await act(async () => {
      acceptDeferred.resolve({
        invitationId: invitationA.id,
        status: 'ACCEPTED',
        targetId: invitationA.target.id,
        type: 'PARTY',
      });
    });

    expect(mockedNavigateToTaxiAcceptancePendingBySeed).not.toHaveBeenCalled();
    expect(mockedNavigateToTaxiChat).not.toHaveBeenCalled();
    expect(mockedNavigateToCommunityChat).not.toHaveBeenCalled();
  });

  it('다른 초대 알림으로 전환된 뒤 이전 초대 수락 실패 오류는 표시하지 않는다', async () => {
    const invitationA = {
      createdAt: '2026-08-23T12:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-a',
      inviter: {
        department: null,
        favorite: false,
        id: 'friend-a',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-23T14:00:00',
        destinationName: '안양역',
        id: 'party-a',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const invitationB = {
      ...invitationA,
      id: 'party-invitation-b',
      inviter: {...invitationA.inviter, id: 'friend-b', nickname: '나래'},
      target: {...invitationA.target, id: 'party-b'},
    };
    const acceptDeferred = createDeferred<never>();
    const acceptInvitation = jest.fn().mockReturnValue(acceptDeferred.promise);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationA.id,
        targetInvitationType: invitationA.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation,
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitationA, invitationB],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 2,
      reload: jest.fn().mockResolvedValue(true),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getAllByText('수락')[0]);

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledWith(invitationA);
    });

    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitationB.id,
        targetInvitationType: invitationB.type,
      },
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);
    alertSpy.mockClear();

    await act(async () => {
      acceptDeferred.reject(new Error('accept failed'));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('대상 없는 FriendHub 알림 route로 전환된 뒤 이전 초대 수락이 완료되어도 이동하지 않는다', async () => {
    const invitation = createPartyInvitation('party-invitation-a', 'party-a');
    const acceptDeferred = createDeferred<{
      invitationId: string;
      status: 'ACCEPTED';
      targetId: string;
      type: 'PARTY';
    }>();
    const acceptInvitation = jest.fn().mockReturnValue(acceptDeferred.promise);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation,
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('수락'));

    await waitFor(() => {
      expect(acceptInvitation).toHaveBeenCalledWith(invitation);
    });

    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    view.rerender(<FriendHubScreen />);

    await act(async () => {
      acceptDeferred.resolve({
        invitationId: invitation.id,
        status: 'ACCEPTED',
        targetId: invitation.target.id,
        type: 'PARTY',
      });
    });

    expect(mockedNavigateToTaxiAcceptancePendingBySeed).not.toHaveBeenCalled();
    expect(mockedNavigateToTaxiChat).not.toHaveBeenCalled();
    expect(mockedNavigateToCommunityChat).not.toHaveBeenCalled();
  });

  it('폐기된 초대 대상 재조회는 적용된 목록을 받을 때까지 대기한다', async () => {
    const invitation = createPartyInvitation('party-invitation-b', 'party-b');
    const firstReload = createDeferred<boolean>();
    const secondReload = createDeferred<boolean>();
    const reloadInvitations = jest
      .fn()
      .mockReturnValueOnce(firstReload.promise)
      .mockReturnValueOnce(secondReload.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUseRoute.mockReturnValue({
      params: {
        initialTab: 'invitations',
        targetInvitationId: invitation.id,
        targetInvitationType: invitation.type,
      },
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 0,
      reload: reloadInvitations,
    });

    const view = render(<FriendHubScreen />);
    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      firstReload.resolve(false);
    });
    await waitFor(() => {
      expect(reloadInvitations).toHaveBeenCalledTimes(2);
    });

    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation: jest.fn(),
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: reloadInvitations,
    });
    view.rerender(<FriendHubScreen />);

    expect(alertSpy).not.toHaveBeenCalled();
    await act(async () => {
      secondReload.resolve(true);
    });

    expect(view.getByText('가람님의 초대')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('알림에서 연 초대는 잠시 강조한 뒤 소비해 이후 목록 변경을 알리지 않는다', async () => {
    jest.useFakeTimers();
    try {
      const invitation = createPartyInvitation('party-invitation-c', 'party-c');
      const targetReload = createDeferred<boolean>();
      const reloadInvitations = jest
        .fn()
        .mockReturnValue(targetReload.promise);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockedUseRoute.mockReturnValue({
        params: {
          initialTab: 'invitations',
          targetInvitationId: invitation.id,
          targetInvitationType: invitation.type,
        },
      } as ReturnType<typeof useRoute>);
      mockedUseFriendHubData.mockReturnValue(createFriendHubData());
      mockedUseFriendInvitationsData.mockReturnValue({
        acceptInvitation: jest.fn(),
        chatError: undefined,
        declineInvitation: jest.fn(),
        deleteInvitation: jest.fn(),
        hasLoaded: true,
        invitations: [invitation],
        loading: false,
        mutatingIds: new Set(),
        partyError: undefined,
        pendingCount: 1,
        reload: reloadInvitations,
      });

      const view = render(<FriendHubScreen />);
      expect(reloadInvitations).toHaveBeenCalledTimes(1);
      await act(async () => {
        targetReload.resolve(true);
      });
      const invitationLayout = view.UNSAFE_getAllByType(RNView).find(
        node => typeof node.props.onLayout === 'function',
      );
      fireEvent(invitationLayout!, 'layout', {
        nativeEvent: {layout: {y: 120}},
      });

      expect(view.getByLabelText('알림에서 선택한 초대')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      expect(view.queryByLabelText('알림에서 선택한 초대')).toBeNull();

      mockedUseFriendInvitationsData.mockReturnValue({
        acceptInvitation: jest.fn(),
        chatError: undefined,
        declineInvitation: jest.fn(),
        deleteInvitation: jest.fn(),
        hasLoaded: true,
        invitations: [],
        loading: false,
        mutatingIds: new Set(),
        partyError: undefined,
        pendingCount: 0,
        reload: reloadInvitations,
      });
      view.rerender(<FriendHubScreen />);

      expect(alertSpy).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('파티원이 보낸 초대를 수락하면 파티장 승인 대기 화면으로 이동한다', async () => {
    const invitation = {
      createdAt: '2026-08-23T12:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: {
        department: null,
        favorite: false,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      },
      respondedAt: null,
      status: 'PENDING' as const,
      target: {
        currentMembers: 2,
        departureName: '성결대학교',
        departureTime: '2026-08-23T14:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN' as const,
        type: 'PARTY' as const,
      },
      type: 'PARTY' as const,
    };
    const acceptInvitation = jest.fn().mockResolvedValue({
      acceptResult: 'LEADER_APPROVAL_PENDING',
      invitationId: invitation.id,
      joinRequestId: 'join-request-1',
      status: 'ACCEPTED',
      targetId: 'party-1',
      type: 'PARTY',
    });
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'invitations'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());
    mockedUseFriendInvitationsData.mockReturnValue({
      acceptInvitation,
      chatError: undefined,
      declineInvitation: jest.fn(),
      deleteInvitation: jest.fn(),
      hasLoaded: true,
      invitations: [invitation],
      loading: false,
      mutatingIds: new Set(),
      partyError: undefined,
      pendingCount: 1,
      reload: jest.fn().mockResolvedValue(true),
    });

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByText('수락'));

    await waitFor(() => {
      expect(mockedNavigateToTaxiAcceptancePendingBySeed).toHaveBeenCalledWith(
        expect.objectContaining({
          partyId: 'party-1',
          requestId: 'join-request-1',
        }),
      );
    });
    expect(mockedNavigateToTaxiChat).not.toHaveBeenCalled();
  });

  it('화면을 떠난 뒤 즐겨찾기 저장이 실패해도 오류를 표시하지 않는다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(false),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    mockedUseNavigation.mockReturnValue(
      navigation as ReturnType<typeof useNavigation>,
    );
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        friends: [{
          department: null,
          favorite: false,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        }],
        updateFavorite: jest.fn().mockRejectedValue(new Error('network unavailable')),
      }),
    );
    const alertSpy = jest.spyOn(Alert, 'alert');

    const view = render(<FriendHubScreen />);
    fireEvent.press(view.getByLabelText('가람 즐겨찾기 추가'));

    await waitFor(() => {
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  it('받은 요청과 보낸 요청이 모두 없으면 통합 빈 상태만 표시한다', () => {
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData());

    const view = render(<FriendHubScreen />);

    expect(view.getByText('대기 중인 요청이 없어요')).toBeTruthy();
    expect(view.queryByText('받은 요청')).toBeNull();
    expect(view.queryByText('보낸 요청')).toBeNull();
  });

  it('요청 알림 경로는 이미 열린 화면의 받은·보낸 요청을 다시 불러온다', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData({reload}));

    render(<FriendHubScreen />);

    await waitFor(() => {
      expect(reload).toHaveBeenCalledWith({
        friends: false,
        receivedRequests: true,
        sentRequests: true,
      });
    });
  });

  it('식별자 없는 친구 수락 경로는 친구 목록을 다시 불러온다', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'friends'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(createFriendHubData({reload}));

    render(<FriendHubScreen />);

    await waitFor(() => {
      expect(reload).toHaveBeenCalledWith({
        friends: true,
        receivedRequests: false,
        sentRequests: false,
      });
    });
  });

  it('한 방향의 초기 요청 조회가 아직 끝나지 않았으면 빈 화면 대신 로딩 상태를 표시한다', () => {
    mockedUseRoute.mockReturnValue({
      params: {initialTab: 'requests'},
    } as ReturnType<typeof useRoute>);
    mockedUseFriendHubData.mockReturnValue(
      createFriendHubData({
        hasLoadedReceivedRequests: true,
        hasLoadedSentRequests: false,
      }),
    );

    const view = render(<FriendHubScreen />);

    expect(view.getByText('친구 요청을 불러오는 중')).toBeTruthy();
    expect(view.queryByText('대기 중인 요청이 없어요')).toBeNull();
  });
});
