import {formatKoreanRelativeTime} from '@/shared/lib/date';

import type {Notification} from '../data/repositories/INotificationRepository';
import type {
  NotificationInboxItemViewData,
  NotificationInboxSectionViewData,
  NotificationInboxViewData,
} from '../model/notificationCenterViewData';

const buildIconMeta = (
  notification: Notification,
): Pick<
  NotificationInboxItemViewData,
  'contextLabel' | 'iconName' | 'iconTone'
> => {
  switch (notification.type) {
    case 'APP_NOTICE':
      return {
        contextLabel: '앱 공지',
        iconName: 'megaphone-outline',
        iconTone: 'orange',
      };
    case 'NOTICE':
      return {
        contextLabel: '공지사항',
        iconName: 'notifications-outline',
        iconTone: 'orange',
      };
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
    case 'FRIEND_DECLINED':
      return {
        contextLabel: '친구',
        iconName: 'people-outline',
        iconTone: 'green',
      };
    case 'PARTY_INVITATION':
    case 'CHAT_ROOM_INVITATION':
      return {
        contextLabel: '친구 초대',
        iconName: 'person-add-outline',
        iconTone: 'green',
      };
    case 'PARTY_JOIN_REQUEST':
    case 'PARTY_JOIN_ACCEPTED':
    case 'PARTY_JOIN_DECLINED':
    case 'PARTY_CLOSED':
    case 'PARTY_ARRIVED':
    case 'PARTY_CREATED':
    case 'PARTY_ENDED':
    case 'PARTY_REOPENED':
    case 'SETTLEMENT_COMPLETED':
      return {
        contextLabel: '택시 파티',
        iconName: 'car-sport-outline',
        iconTone: 'yellow',
      };
    case 'CHAT_MESSAGE':
      return {
        contextLabel: notification.data.chatRoomId?.startsWith('party:')
          ? '택시 채팅'
          : '커뮤니티',
        iconName: 'chatbubble-outline',
        iconTone: 'green',
      };
    case 'MEMBER_KICKED':
      return {
        contextLabel: '보안 알림',
        iconName: 'shield-checkmark-outline',
        iconTone: 'purple',
      };
    case 'POST_LIKED':
      return {
        contextLabel: notification.data.noticeId ? '공지사항' : '커뮤니티',
        iconName: notification.data.noticeId
          ? 'notifications-outline'
          : 'heart-outline',
        iconTone: 'orange',
      };
    case 'COMMENT_CREATED':
      return {
        contextLabel: notification.data.appNoticeId
          ? '앱 공지'
          : notification.data.noticeId
            ? '공지사항'
            : '커뮤니티',
        iconName: 'chatbubble-outline',
        iconTone: 'green',
      };
    case 'ACADEMIC_SCHEDULE':
      return {
        contextLabel: '학사 일정',
        iconName: 'calendar-outline',
        iconTone: 'blue',
      };
    default:
      return {
        iconName: 'notifications-outline',
        iconTone: 'blue',
      };
  }
};

export const mapNotificationToInboxItemViewData = (
  notification: Notification,
): NotificationInboxItemViewData => {
  const iconMeta = buildIconMeta(notification);

  return {
    contextLabel: iconMeta.contextLabel,
    iconName: iconMeta.iconName,
    iconTone: iconMeta.iconTone,
    id: notification.id,
    isRead: notification.isRead,
    message: notification.message,
    notification,
    timeLabel: formatKoreanRelativeTime(notification.createdAt),
    title: notification.title,
  };
};

export const buildNotificationCenterViewData = (
  items: NotificationInboxItemViewData[],
): NotificationInboxViewData => {
  const unreadItems = items.filter(item => !item.isRead);
  const readItems = items.filter(item => item.isRead);
  const sections: NotificationInboxSectionViewData[] = [];

  if (unreadItems.length > 0) {
    sections.push({
      id: 'unread',
      items: unreadItems,
    });
  }

  if (readItems.length > 0) {
    sections.push({
      id: 'read',
      items: readItems,
    });
  }

  return {
    sections,
    unreadCount: unreadItems.length,
  };
};
