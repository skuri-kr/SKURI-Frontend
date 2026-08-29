const mockSubscribeForegroundMessages = jest.fn();

jest.mock('@/shared/lib/firebase/messaging', () => ({
  getInitialNotificationMessage: jest.fn(),
  registerBackgroundMessageHandler: jest.fn(),
  subscribeForegroundMessages: (...args: unknown[]) =>
    mockSubscribeForegroundMessages(...args),
  subscribeNotificationOpenedApp: jest.fn(),
}));

jest.mock('@/app/navigation/services/appRouteNavigation', () => ({
  navigateToAppNoticeDetail: jest.fn(),
  navigateToBoardDetail: jest.fn(),
  navigateToCommunityChat: jest.fn(),
  navigateToNoticeDetail: jest.fn(),
  navigateToTaxiChat: jest.fn(),
  navigateToTaxiScreen: jest.fn(),
}));

jest.mock('@/features/campus/services/academicNavigationService', () => ({
  navigateToAcademicCalendarDetail: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  FRIEND_HUB_INVALIDATION_KEY,
  FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {initForegroundMessageHandler} from '../pushNotificationRuntime';

const mockedInvalidateData = jest.mocked(invalidateData);

describe('pushNotificationRuntime', () => {
  beforeEach(() => {
    mockSubscribeForegroundMessages.mockReset();
    mockedInvalidateData.mockReset();
  });

  it('foreground PARTY_JOIN_REQUEST는 배너와 택시 채팅 intent를 함께 전달한다', async () => {
    let listener:
      | ((remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>)
      | undefined;

    mockSubscribeForegroundMessages.mockImplementation(
      (
        nextListener: (remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>,
      ) => {
        listener = nextListener;
        return jest.fn();
      },
    );

    const onForegroundNotification = jest.fn();
    const onJoinRequestReceived = jest.fn();

    initForegroundMessageHandler({
      onForegroundNotification,
      onJoinRequestReceived,
    });

    await listener?.({
      data: {
        contractVersion: '1',
        partyId: 'party-1',
        requestId: 'request-1',
        type: 'PARTY_JOIN_REQUEST',
      },
      notification: {
        body: '채팅방에서 동승 요청을 확인해보세요.',
        title: '새 동승 요청이 도착했어요',
      },
    });

    expect(onJoinRequestReceived).toHaveBeenCalledWith({
      partyId: 'party-1',
      requestId: 'request-1',
      type: 'PARTY_JOIN_REQUEST',
    });
    expect(onForegroundNotification).toHaveBeenCalledWith({
      body: '채팅방에서 동승 요청을 확인해보세요.',
      intent: {
        kind: 'taxiChat',
        partyId: 'party-1',
      },
      title: '새 동승 요청이 도착했어요',
    });
    expect(mockedInvalidateData).not.toHaveBeenCalled();
  });

  it('foreground 친구 알림은 배너와 친구 목록 invalidation을 함께 전달한다', async () => {
    let listener:
      | ((remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>)
      | undefined;

    mockSubscribeForegroundMessages.mockImplementation(
      (
        nextListener: (remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>,
      ) => {
        listener = nextListener;
        return jest.fn();
      },
    );

    const onForegroundNotification = jest.fn();
    initForegroundMessageHandler({onForegroundNotification});

    await listener?.({
      data: {
        contractVersion: '1',
        requestId: 'friend-request-1',
        type: 'FRIEND_REQUEST',
      },
    });

    expect(mockedInvalidateData).toHaveBeenCalledWith([
      FRIEND_HUB_INVALIDATION_KEY,
      FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
    ]);
    expect(onForegroundNotification).toHaveBeenCalledWith({
      body: '친구 요청을 확인해보세요.',
      intent: {initialTab: 'requests', kind: 'friendHub'},
      title: '친구 요청이 도착했어요',
    });
  });

  it('foreground 앱 공지 댓글은 앱 공지용 기본 문구와 intent를 전달한다', async () => {
    let listener:
      | ((remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>)
      | undefined;
    mockSubscribeForegroundMessages.mockImplementation(
      (
        nextListener: (remoteMessage: {
          data?: Record<string, unknown>;
          notification?: {body?: string; title?: string};
        }) => Promise<void>,
      ) => {
        listener = nextListener;
        return jest.fn();
      },
    );

    const onForegroundNotification = jest.fn();
    initForegroundMessageHandler({onForegroundNotification});

    await listener?.({
      data: {
        appNoticeId: 'app-notice-1',
        commentId: 'app-comment-1',
        contractVersion: '1',
        type: 'COMMENT_CREATED',
      },
    });

    expect(onForegroundNotification).toHaveBeenCalledWith({
      body: '새 댓글이 달렸어요.',
      intent: {
        initialCommentId: 'app-comment-1',
        kind: 'appNoticeDetail',
        noticeId: 'app-notice-1',
      },
      title: '앱 공지 댓글',
    });
  });
});
