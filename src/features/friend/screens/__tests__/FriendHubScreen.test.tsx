import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';

import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';

import {useFriendHubData} from '../../hooks/useFriendHubData';
import {FriendHubScreen} from '../FriendHubScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  useInvalidationVersion: jest.fn(),
}));

jest.mock('@/shared/design-system/components', () => ({
  SegmentedControl: () => null,
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

const mockedUseFriendHubData = jest.mocked(useFriendHubData);
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
});
