import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  FRIEND_HUB_INVALIDATION_KEY,
  FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {useNotificationRepository} from '@/di';
import {useAuth} from '@/features/auth';
import type {NotificationType} from '@/features/user/model/notificationContract';

const NOTIFICATION_LIMIT = 100;

const FRIEND_NOTIFICATION_TYPES = new Set<NotificationType>([
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'FRIEND_DECLINED',
  'PARTY_INVITATION',
  'CHAT_ROOM_INVITATION',
]);

const getFriendNotificationIds = (
  notifications: Array<{id: string; type: NotificationType}>,
) =>
  new Set(
    notifications
      .filter(notification => FRIEND_NOTIFICATION_TYPES.has(notification.type))
      .map(notification => notification.id),
  );

export const useFriendNotificationRealtimeInvalidation = ({
  enabled,
}: {
  enabled: boolean;
}) => {
  const notificationRepository = useNotificationRepository();
  const {user} = useAuth();
  const previousFriendNotificationIdsRef = React.useRef<Set<string> | null>(
    null,
  );

  React.useEffect(() => {
    previousFriendNotificationIdsRef.current = null;

    if (!enabled || !user?.uid) {
      return undefined;
    }

    return notificationRepository.subscribeToNotifications(
      user.uid,
      NOTIFICATION_LIMIT,
      {
        onData: notifications => {
          const nextFriendNotificationIds =
            getFriendNotificationIds(notifications);
          const previousFriendNotificationIds =
            previousFriendNotificationIdsRef.current;

          previousFriendNotificationIdsRef.current = nextFriendNotificationIds;

          if (!previousFriendNotificationIds) {
            if (nextFriendNotificationIds.size > 0) {
              invalidateData([
                FRIEND_HUB_INVALIDATION_KEY,
                FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
              ]);
            }
            return;
          }

          const receivedNewFriendNotification = [
            ...nextFriendNotificationIds,
          ].some(id => !previousFriendNotificationIds.has(id));

          if (receivedNewFriendNotification) {
            invalidateData([
              FRIEND_HUB_INVALIDATION_KEY,
              FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
            ]);
          }
        },
        onError: () => {
          // 알림함 화면과 Repository의 재연결 로직이 오류를 처리한다.
        },
      },
    );
  }, [enabled, notificationRepository, user?.uid]);
};
