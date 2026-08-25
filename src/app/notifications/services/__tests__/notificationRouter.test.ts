import {
  getStoredNotificationNavigationIntent,
  openNotificationNavigationIntent,
} from '../notificationRouter';
import {mapNotificationResponseDto} from '@/features/user/data/mappers/notificationMapper';
import {navigateToCampusScreen} from '@/app/navigation/services/appRouteNavigation';

jest.mock('@/features/campus/services/academicNavigationService', () => ({
  navigateToAcademicCalendarDetail: jest.fn(),
}));

jest.mock('@/app/navigation/services/appRouteNavigation', () => ({
  navigateToAppNoticeDetail: jest.fn(),
  navigateToBoardDetail: jest.fn(),
  navigateToCampusScreen: jest.fn(),
  navigateToCommunityChat: jest.fn(),
  navigateToNoticeDetail: jest.fn(),
  navigateToTaxiChat: jest.fn(),
  navigateToTaxiScreen: jest.fn(),
}));

const mockedNavigateToCampusScreen = jest.mocked(navigateToCampusScreen);

describe('notificationRouter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('stored 친구 수락 알림을 friendPublicId 기반 친구 상세 이동으로 변환한다', () => {
    const notification = mapNotificationResponseDto({
      createdAt: '2026-08-25T09:00:00.000Z',
      data: {friendPublicId: 'friend-public-1'},
      id: 'notification-friend-accepted',
      isRead: false,
      message: '친구가 되었어요.',
      title: '친구 수락',
      type: 'FRIEND_ACCEPTED',
    });

    expect(getStoredNotificationNavigationIntent(notification)).toEqual({
      kind: 'friendDetail',
      friendPublicId: 'friend-public-1',
    });
  });

  it('친구 수락 알림에 friendPublicId가 없으면 친구 탭으로 안전하게 이동한다', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const notification = mapNotificationResponseDto({
      createdAt: '2026-08-25T09:00:00.000Z',
      data: {},
      id: 'notification-friend-accepted-without-public-id',
      isRead: false,
      message: '친구가 되었어요.',
      title: '친구 수락',
      type: 'FRIEND_ACCEPTED',
    });
    const intent = getStoredNotificationNavigationIntent(notification);

    expect(intent).toEqual({kind: 'friendHub', initialTab: 'friends'});

    openNotificationNavigationIntent(intent);

    expect(mockedNavigateToCampusScreen).toHaveBeenCalledWith('FriendHub', {
      initialTab: 'friends',
    });
    warning.mockRestore();
  });

  it('초대 알림은 초대 카드 대상까지 보존해 친구 허브로 이동한다', () => {
    const notification = mapNotificationResponseDto({
      createdAt: '2026-08-25T09:00:00.000Z',
      data: {
        invitationId: 'party-invitation-1',
        invitationType: 'PARTY',
      },
      id: 'notification-party-invitation',
      isRead: false,
      message: '택시파티에 초대했어요.',
      title: '친구 초대',
      type: 'PARTY_INVITATION',
    });
    const intent = getStoredNotificationNavigationIntent(notification);

    expect(intent).toEqual({
      kind: 'friendHub',
      initialTab: 'invitations',
      targetInvitation: {id: 'party-invitation-1', type: 'PARTY'},
    });

    openNotificationNavigationIntent(intent);

    expect(mockedNavigateToCampusScreen).toHaveBeenCalledWith('FriendHub', {
      initialTab: 'invitations',
      targetInvitationId: 'party-invitation-1',
      targetInvitationType: 'PARTY',
    });
  });

  it('친구 요청과 거절 알림은 요청 탭으로 이동한다', () => {
    const notification = mapNotificationResponseDto({
      createdAt: '2026-08-25T09:00:00.000Z',
      data: {requestId: 'friend-request-1'},
      id: 'notification-friend-declined',
      isRead: false,
      message: '친구 요청이 거절되었어요.',
      title: '친구 요청',
      type: 'FRIEND_DECLINED',
    });
    const intent = getStoredNotificationNavigationIntent(notification);

    expect(intent).toEqual({kind: 'friendHub', initialTab: 'requests'});

    openNotificationNavigationIntent(intent);

    expect(mockedNavigateToCampusScreen).toHaveBeenCalledWith('FriendHub', {
      initialTab: 'requests',
    });
  });
});
