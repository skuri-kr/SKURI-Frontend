import type {Notification} from '@/features/user/data/repositories/INotificationRepository';
import type {
  NotificationData,
  NotificationType,
} from '@/features/user/model/notificationContract';

import type {NotificationPayload} from '../model/notificationPayload';

const CANONICAL_NOTIFICATION_TYPES: NotificationType[] = [
  'ACADEMIC_SCHEDULE',
  'APP_NOTICE',
  'CHAT_MESSAGE',
  'CHAT_ROOM_INVITATION',
  'COMMENT_CREATED',
  'FRIEND_ACCEPTED',
  'FRIEND_DECLINED',
  'FRIEND_REQUEST',
  'MEMBER_KICKED',
  'NOTICE',
  'PARTY_ARRIVED',
  'PARTY_CLOSED',
  'PARTY_CREATED',
  'PARTY_ENDED',
  'PARTY_INVITATION',
  'PARTY_REOPENED',
  'PARTY_JOIN_ACCEPTED',
  'PARTY_JOIN_DECLINED',
  'PARTY_JOIN_REQUEST',
  'POST_LIKED',
  'SETTLEMENT_COMPLETED',
];

const isCanonicalNotificationType = (
  value: unknown,
): value is NotificationType =>
  typeof value === 'string' &&
  CANONICAL_NOTIFICATION_TYPES.includes(value as NotificationType);

const getStringValue = (
  data: NotificationData,
  key: keyof NotificationData,
) => {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const warnInvalidNotification = (
  source: 'push' | 'stored',
  type: unknown,
  details: string,
) => {
  console.warn(
    `[notifications] ${source} 알림을 해석하지 못했습니다. type=${String(
      type,
    )} ${details}`,
  );
};

const parseCanonicalNotification = ({
  data,
  source,
  type,
}: {
  data: NotificationData;
  source: 'push' | 'stored';
  type: NotificationType;
}): NotificationPayload | null => {
  const partyId = getStringValue(data, 'partyId');
  const requestId = getStringValue(data, 'requestId');
  const chatRoomId = getStringValue(data, 'chatRoomId');
  const postId = getStringValue(data, 'postId');
  const commentId = getStringValue(data, 'commentId');
  const noticeId = getStringValue(data, 'noticeId');
  const appNoticeId = getStringValue(data, 'appNoticeId');
  const academicScheduleId = getStringValue(data, 'academicScheduleId');
  const friendPublicId = getStringValue(data, 'friendPublicId');
  const invitationId = getStringValue(data, 'invitationId');
  const invitationType = getStringValue(data, 'invitationType');

  switch (type) {
    case 'PARTY_CREATED':
    case 'PARTY_CLOSED':
    case 'PARTY_REOPENED':
    case 'PARTY_ARRIVED':
    case 'PARTY_ENDED':
    case 'MEMBER_KICKED':
    case 'SETTLEMENT_COMPLETED':
      if (!partyId) {
        warnInvalidNotification(source, type, 'partyId가 없습니다.');
        return null;
      }

      return {type, partyId};
    case 'PARTY_JOIN_REQUEST':
    case 'PARTY_JOIN_ACCEPTED':
    case 'PARTY_JOIN_DECLINED':
      if (!partyId || !requestId) {
        warnInvalidNotification(
          source,
          type,
          'partyId 또는 requestId가 없습니다.',
        );
        return null;
      }

      return {type, partyId, requestId};
    case 'CHAT_MESSAGE':
      if (!chatRoomId) {
        warnInvalidNotification(source, type, 'chatRoomId가 없습니다.');
        return null;
      }

      return {type, chatRoomId};
    case 'FRIEND_REQUEST':
    case 'FRIEND_DECLINED':
      if (!requestId) {
        warnInvalidNotification(source, type, 'requestId가 없습니다.');
        return null;
      }

      return {type, requestId};
    case 'FRIEND_ACCEPTED':
      if (!friendPublicId) {
        warnInvalidNotification(source, type, 'friendPublicId가 없습니다.');
        return null;
      }

      return {type, friendPublicId};
    case 'PARTY_INVITATION':
      if (!invitationId || invitationType !== 'PARTY') {
        warnInvalidNotification(
          source,
          type,
          'invitationId 또는 PARTY invitationType이 없습니다.',
        );
        return null;
      }

      return {type, invitationId, invitationType};
    case 'CHAT_ROOM_INVITATION':
      if (!invitationId || invitationType !== 'CHAT_ROOM') {
        warnInvalidNotification(
          source,
          type,
          'invitationId 또는 CHAT_ROOM invitationType이 없습니다.',
        );
        return null;
      }

      return {type, invitationId, invitationType};
    case 'POST_LIKED':
      if (!postId) {
        warnInvalidNotification(source, type, 'postId가 없습니다.');
        return null;
      }

      return {type, postId};
    case 'COMMENT_CREATED':
      if (!commentId) {
        warnInvalidNotification(source, type, 'commentId가 없습니다.');
        return null;
      }

      if (postId) {
        return {type, postId, commentId};
      }

      if (noticeId) {
        return {type, noticeId, commentId};
      }

      warnInvalidNotification(source, type, 'postId 또는 noticeId가 없습니다.');
      return null;
    case 'NOTICE':
      if (!noticeId) {
        warnInvalidNotification(source, type, 'noticeId가 없습니다.');
        return null;
      }

      return {type, noticeId};
    case 'APP_NOTICE':
      if (!appNoticeId) {
        warnInvalidNotification(source, type, 'appNoticeId가 없습니다.');
        return null;
      }

      return {type, appNoticeId};
    case 'ACADEMIC_SCHEDULE':
      if (!academicScheduleId) {
        warnInvalidNotification(source, type, 'academicScheduleId가 없습니다.');
        return null;
      }

      return {type, academicScheduleId};
    default:
      return null;
  }
};

export const parsePushNotificationPayload = (
  data: Record<string, unknown>,
): NotificationPayload | null => {
  if (data.contractVersion !== '1') {
    warnInvalidNotification('push', data.type, 'contractVersion=1이 아닙니다.');
    return null;
  }

  if (!isCanonicalNotificationType(data.type)) {
    warnInvalidNotification(
      'push',
      data.type,
      '정식 canonical type이 아닙니다.',
    );
    return null;
  }

  return parseCanonicalNotification({
    data: data as NotificationData,
    source: 'push',
    type: data.type,
  });
};

export const parseStoredNotificationPayload = (
  notification: Notification,
): NotificationPayload | null =>
  parseCanonicalNotification({
    data: notification.data,
    source: 'stored',
    type: notification.type,
  });
