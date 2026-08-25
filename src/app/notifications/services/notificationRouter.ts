import {navigateToAcademicCalendarDetail} from '@/features/campus/services/academicNavigationService';

import {
  navigateToAppNoticeDetail,
  navigateToBoardDetail,
  navigateToCampusScreen,
  navigateToCommunityChat,
  navigateToNoticeDetail,
  navigateToTaxiChat,
  navigateToTaxiScreen,
} from '@/app/navigation/services/appRouteNavigation';

import type {NotificationNavigationIntent} from '../model/notificationNavigationIntent';
import type {NotificationPayload} from '../model/notificationPayload';
import {
  parsePushNotificationPayload,
  parseStoredNotificationPayload,
} from './notificationPayloadParser';
import type {Notification} from '@/features/user/data/repositories/INotificationRepository';

const getPartyIdFromChatRoomId = (chatRoomId: string) => {
  if (!chatRoomId.startsWith('party:')) {
    return null;
  }

  const partyId = chatRoomId.slice('party:'.length);
  return partyId.length > 0 ? partyId : null;
};

export const getNotificationNavigationIntent = (
  payload: NotificationPayload,
): NotificationNavigationIntent | null => {
  switch (payload.type) {
    case 'PARTY_CREATED':
    case 'MEMBER_KICKED':
      return {kind: 'taxiScreen'};
    case 'PARTY_JOIN_REQUEST':
    case 'PARTY_JOIN_ACCEPTED':
    case 'PARTY_CLOSED':
    case 'PARTY_REOPENED':
    case 'PARTY_ARRIVED':
    case 'SETTLEMENT_COMPLETED':
      return {kind: 'taxiChat', partyId: payload.partyId};
    case 'PARTY_JOIN_DECLINED':
    case 'PARTY_ENDED':
      return null;
    case 'CHAT_MESSAGE': {
      const taxiPartyId = getPartyIdFromChatRoomId(payload.chatRoomId);
      return taxiPartyId
        ? {kind: 'taxiChat', partyId: taxiPartyId}
        : {kind: 'communityChat', chatRoomId: payload.chatRoomId};
    }
    case 'FRIEND_REQUEST':
    case 'FRIEND_DECLINED':
      return {kind: 'friendHub', initialTab: 'requests'};
    case 'FRIEND_ACCEPTED':
      return {kind: 'friendDetail', friendPublicId: payload.friendPublicId};
    case 'PARTY_INVITATION':
    case 'CHAT_ROOM_INVITATION':
      return {
        kind: 'friendHub',
        initialTab: 'invitations',
        targetInvitation: {
          id: payload.invitationId,
          type: payload.invitationType,
        },
      };
    case 'POST_LIKED':
      return {kind: 'boardDetail', postId: payload.postId};
    case 'COMMENT_CREATED':
      if ('postId' in payload) {
        return {
          kind: 'boardDetail',
          postId: payload.postId,
          initialCommentId: payload.commentId,
        };
      }

      return {
        kind: 'noticeDetail',
        noticeId: payload.noticeId,
        initialCommentId: payload.commentId,
      };
    case 'NOTICE':
      return {kind: 'noticeDetail', noticeId: payload.noticeId};
    case 'APP_NOTICE':
      return {kind: 'appNoticeDetail', noticeId: payload.appNoticeId};
    case 'ACADEMIC_SCHEDULE':
      return {
        kind: 'academicCalendarDetail',
        scheduleId: payload.academicScheduleId,
      };
    default:
      return null;
  }
};

export const openNotificationNavigationIntent = (
  intent: NotificationNavigationIntent | null,
) => {
  if (!intent) {
    return false;
  }

  switch (intent.kind) {
    case 'taxiScreen':
      return navigateToTaxiScreen();
    case 'taxiChat':
      return navigateToTaxiChat(intent.partyId);
    case 'communityChat':
      return navigateToCommunityChat(intent.chatRoomId);
    case 'friendHub':
      return navigateToCampusScreen('FriendHub', {
        initialTab: intent.initialTab,
        ...(intent.targetInvitation
          ? {
              targetInvitationId: intent.targetInvitation.id,
              targetInvitationType: intent.targetInvitation.type,
            }
          : {}),
      });
    case 'friendDetail':
      return navigateToCampusScreen('FriendDetail', {
        friendId: intent.friendPublicId,
      });
    case 'boardDetail':
      return navigateToBoardDetail(intent.postId, {
        initialCommentId: intent.initialCommentId,
      });
    case 'noticeDetail':
      return navigateToNoticeDetail(intent.noticeId, {
        initialCommentId: intent.initialCommentId,
      });
    case 'appNoticeDetail':
      return navigateToAppNoticeDetail(intent.noticeId);
    case 'academicCalendarDetail':
      return navigateToAcademicCalendarDetail(intent.scheduleId);
    default:
      return false;
  }
};

export const getPushNotificationNavigationIntent = (
  data: Record<string, unknown>,
) => {
  const payload = parsePushNotificationPayload(data);
  return payload ? getNotificationNavigationIntent(payload) : null;
};

export const getStoredNotificationNavigationIntent = (
  notification: Notification,
) => {
  const payload = parseStoredNotificationPayload(notification);
  return payload ? getNotificationNavigationIntent(payload) : null;
};
