import {
  parsePushNotificationPayload,
  parseStoredNotificationPayload,
} from '../notificationPayloadParser';

describe('notificationPayloadParser', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('canonical push payload를 파싱한다', () => {
    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'PARTY_JOIN_ACCEPTED',
        partyId: 'party-1',
        requestId: 'request-1',
      }),
    ).toEqual({
      type: 'PARTY_JOIN_ACCEPTED',
      partyId: 'party-1',
      requestId: 'request-1',
    });
  });

  it('legacy payload type은 무시한다', () => {
    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'party_join_accepted',
        partyId: 'party-1',
        requestId: 'request-1',
      }),
    ).toBeNull();
  });

  it('commentId가 없는 COMMENT_CREATED는 무시한다', () => {
    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'COMMENT_CREATED',
        postId: 'post-1',
      }),
    ).toBeNull();
  });

  it('stored notification도 canonical payload로 해석한다', () => {
    expect(
      parseStoredNotificationPayload({
        id: 'notification-1',
        type: 'COMMENT_CREATED',
        title: '댓글 알림',
        message: '새 댓글이 달렸어요.',
        data: {
          commentId: 'comment-1',
          noticeId: 'notice-1',
        },
        isRead: false,
        createdAt: new Date('2026-04-01T09:00:00.000Z'),
      }),
    ).toEqual({
      type: 'COMMENT_CREATED',
      commentId: 'comment-1',
      noticeId: 'notice-1',
    });
  });

  it('친구 수락과 초대 payload의 이동 식별자를 보존한다', () => {
    expect(
      parseStoredNotificationPayload({
        id: 'notification-friend-accepted',
        type: 'FRIEND_ACCEPTED',
        title: '친구 수락',
        message: '친구가 되었어요.',
        data: {friendPublicId: 'friend-public-1'},
        isRead: false,
        createdAt: new Date('2026-08-25T09:00:00.000Z'),
      }),
    ).toEqual({
      type: 'FRIEND_ACCEPTED',
      friendPublicId: 'friend-public-1',
    });

    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'PARTY_INVITATION',
        invitationId: 'party-invitation-1',
        invitationType: 'PARTY',
      }),
    ).toEqual({
      type: 'PARTY_INVITATION',
      invitationId: 'party-invitation-1',
      invitationType: 'PARTY',
    });

    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'CHAT_ROOM_INVITATION',
        invitationId: 'chat-invitation-1',
        invitationType: 'CHAT_ROOM',
      }),
    ).toEqual({
      type: 'CHAT_ROOM_INVITATION',
      invitationId: 'chat-invitation-1',
      invitationType: 'CHAT_ROOM',
    });
  });

  it('초대 type과 invitationType이 일치하지 않으면 무시한다', () => {
    expect(
      parsePushNotificationPayload({
        contractVersion: '1',
        type: 'PARTY_INVITATION',
        invitationId: 'party-invitation-1',
        invitationType: 'CHAT_ROOM',
      }),
    ).toBeNull();
  });
});
