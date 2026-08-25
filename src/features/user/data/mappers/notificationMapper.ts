import type {Notification} from '../repositories/INotificationRepository';
import type {
  NotificationData,
  NotificationType,
} from '../../model/notificationContract';
import type {
  NotificationDataDto,
  NotificationResponseDto,
} from '../dto/notificationDto';

const pushIfString = (
  target: NotificationData,
  key: keyof NotificationData,
  value?: string | null,
) => {
  if (typeof value === 'string' && value) {
    target[key] = value;
  }
};

const mapNotificationDataDto = (
  data?: NotificationDataDto | null,
): NotificationData => {
  const result: NotificationData = {};

  if (!data) {
    return result;
  }

  pushIfString(result, 'academicScheduleId', data.academicScheduleId);
  pushIfString(result, 'appNoticeId', data.appNoticeId);
  pushIfString(result, 'chatRoomId', data.chatRoomId);
  pushIfString(result, 'commentId', data.commentId);
  pushIfString(result, 'friendPublicId', data.friendPublicId);
  pushIfString(result, 'invitationId', data.invitationId);
  pushIfString(result, 'invitationType', data.invitationType);
  pushIfString(result, 'noticeId', data.noticeId);
  pushIfString(result, 'partyId', data.partyId);
  pushIfString(result, 'postId', data.postId);
  pushIfString(result, 'requestId', data.requestId);

  return result;
};

export const mapNotificationResponseDto = (
  notification: NotificationResponseDto,
): Notification => {
  return {
    createdAt: new Date(notification.createdAt),
    data: mapNotificationDataDto(notification.data),
    id: notification.id,
    isRead: Boolean(notification.isRead),
    message: notification.message,
    title: notification.title,
    type: notification.type as NotificationType,
  };
};
