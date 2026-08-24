import React from 'react';

import {PopupMenu} from '@/shared/ui/PopupMenu';

interface TaxiChatHeaderMenuProps {
  canCancelParty: boolean;
  canEditParty: boolean;
  canLeave: boolean;
  canInviteFriends?: boolean;
  canReport?: boolean;
  destructiveActionLabel: string;
  notificationDisabled?: boolean;
  notificationEnabled: boolean;
  onPressDestructiveAction: () => void;
  onClose: () => void;
  onEditParty: () => void;
  onLeaveParty: () => void;
  onInviteFriends?: () => void;
  onReport?: () => void;
  onToggleNotification: () => void;
  visible: boolean;
}

export const TaxiChatHeaderMenu = ({
  canCancelParty,
  canEditParty,
  canLeave,
  canInviteFriends = false,
  canReport = false,
  destructiveActionLabel,
  notificationDisabled = false,
  notificationEnabled,
  onPressDestructiveAction,
  onClose,
  onEditParty,
  onLeaveParty,
  onInviteFriends,
  onReport,
  onToggleNotification,
  visible,
}: TaxiChatHeaderMenuProps) => {
  const items = [
    {
      disabled: notificationDisabled,
      iconName: 'notifications-outline',
      id: 'notification',
      label: '알림',
      onPress: onToggleNotification,
      type: 'toggle' as const,
      value: notificationEnabled,
    },
    ...(canEditParty
      ? [
          {
            iconName: 'create-outline',
            id: 'edit',
            label: '수정하기',
            onPress: onEditParty,
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
    ...(canCancelParty
      ? [
          {
            iconName: 'close-circle-outline',
            id: 'destructive',
            label: destructiveActionLabel,
            onPress: onPressDestructiveAction,
            tone: 'danger' as const,
            type: 'action' as const,
          },
        ]
      : []),
    ...(canLeave
      ? [
          {
            iconName: 'log-out-outline',
            id: 'leave',
            label: '파티 나가기',
            onPress: onLeaveParty,
            tone: 'danger' as const,
            type: 'action' as const,
          },
        ]
      : []),
  ];

  return <PopupMenu items={items} onClose={onClose} visible={visible} />;
};
