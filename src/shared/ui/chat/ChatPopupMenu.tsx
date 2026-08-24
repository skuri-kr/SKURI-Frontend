import React from 'react';

import {PopupMenu} from '@/shared/ui/PopupMenu';

interface ChatPopupMenuProps {
  canReport?: boolean;
  canInviteFriends?: boolean;
  canToggleNotification?: boolean;
  leaveLabel: string;
  notificationDisabled?: boolean;
  notificationEnabled: boolean;
  onClose: () => void;
  onLeave?: () => void;
  onInviteFriends?: () => void;
  onReport?: () => void;
  onToggleNotification: () => void;
  right?: number;
  top?: number;
  visible: boolean;
}

export const ChatPopupMenu = ({
  canReport = false,
  canInviteFriends = false,
  canToggleNotification = true,
  leaveLabel,
  notificationDisabled = false,
  notificationEnabled,
  onClose,
  onLeave,
  onInviteFriends,
  onReport,
  onToggleNotification,
  right = 12,
  top = 64,
  visible,
}: ChatPopupMenuProps) => {
  const items = [
    ...(canToggleNotification
      ? [
          {
            iconName: 'notifications-outline',
            id: 'notification',
            label: '알림',
            disabled: notificationDisabled,
            onPress: onToggleNotification,
            type: 'toggle' as const,
            value: notificationEnabled,
          },
        ]
      : []),
    ...(canReport && onReport
      ? [
          {
            iconName: 'flag-outline',
            id: 'report',
            label: '신고하기',
            onPress: onReport,
            type: 'action' as const,
          },
        ]
      : []),
    ...(canInviteFriends && onInviteFriends
      ? [
          {
            iconName: 'person-add-outline',
            id: 'invite-friends',
            label: '친구 초대',
            onPress: onInviteFriends,
            type: 'action' as const,
          },
        ]
      : []),
    ...(onLeave
      ? [
          {
            iconName: 'log-out-outline',
            id: 'leave',
            label: leaveLabel,
            onPress: onLeave,
            tone: 'danger' as const,
            type: 'action' as const,
          },
        ]
      : []),
  ];

  return (
    <PopupMenu
      items={items}
      onClose={onClose}
      right={right}
      top={top}
      visible={visible}
    />
  );
};
