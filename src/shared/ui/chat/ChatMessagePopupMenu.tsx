import React from 'react';

import {PopupMenu} from '@/shared/ui/PopupMenu';

interface ChatMessagePopupMenuProps {
  canCopy?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  canReport?: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReport: () => void;
  right: number;
  top: number;
  visible: boolean;
}

export const ChatMessagePopupMenu = ({
  canCopy = true,
  canDelete = false,
  canEdit = false,
  canReport = true,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onReport,
  right,
  top,
  visible,
}: ChatMessagePopupMenuProps) => {
  return (
    <PopupMenu
      items={[
        ...(canCopy
          ? [
              {
                iconName: 'copy-outline',
                id: 'copy',
                label: '복사',
                onPress: onCopy,
                type: 'action' as const,
              },
            ]
          : []),
        ...(canEdit && onEdit
          ? [
              {
                iconName: 'create-outline',
                id: 'edit',
                label: '수정',
                onPress: onEdit,
                type: 'action' as const,
              },
            ]
          : []),
        ...(canDelete && onDelete
          ? [
              {
                iconName: 'trash-outline',
                id: 'delete',
                label: '삭제',
                onPress: onDelete,
                tone: 'danger' as const,
                type: 'action' as const,
              },
            ]
          : []),
        ...(canReport
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
      ]}
      onClose={onClose}
      right={right}
      top={top}
      visible={visible}
      width={156}
    />
  );
};
