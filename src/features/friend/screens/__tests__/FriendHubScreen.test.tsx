import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';

import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';

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
  navigateToTaxiChat: jest.fn(),
}));

jest.mock('@/shared/design-system/components', () => ({
  SegmentedControl: ({items}: {items: Array<{label: string}>}) => {
    const {createElement} = require('react');
    const {Text} = require('react-native');
    return createElement(Text, undefined, items.map(item => item.label).join(' '));
  },
  StackHeader: () => null,
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
const mockedUseFriendInvitationsData = jest.mocked(useFriendInvitationsData);
const mockedUseInvalidationVersion = jest.mocked(useInvalidationVersion);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);

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
  reload: jest.fn().mockResolvedValue(undefined),
  reloadFriends: jest.fn().mockResolvedValue(undefined),
  reloadRequestDirection: jest.fn().mockResolvedValue(undefined),
  sentNextCursor: null,
  sentRequests: [],
  sentRequestsError: undefined,
  updateFavorite: jest.fn().mockResolvedValue(undefined),
  updatingFavoriteIds: new Set(),
  ...overrides,
}) as ReturnType<typeof useFriendHubData>;

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
      reload: jest.fn().mockResolvedValue(undefined),
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
      reload: jest.fn().mockResolvedValue(undefined),
    });

    const view = render(<FriendHubScreen />);

    expect(view.getByText('친구 0 요청 0 초대')).toBeTruthy();
    expect(view.queryByText(/undefined/)).toBeNull();
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
