import React from 'react';

import {PopupMenu} from '@/shared/ui/PopupMenu';

interface BoardDetailPopupMenuProps {
  onClose: () => void;
  onPressDelete: () => void;
  onPressEdit: () => void;
  onPressReport: () => void;
  onPressShare: () => void;
  right?: number;
  showManageActions?: boolean;
  top: number;
  visible: boolean;
}

export const BoardDetailPopupMenu = ({
  onClose,
  onPressDelete,
  onPressEdit,
  onPressReport,
  onPressShare,
  right = 12,
  showManageActions = true,
  top,
  visible,
}: BoardDetailPopupMenuProps) => {
  const items = [
    {
      iconName: 'share-outline',
      id: 'share',
      label: '공유',
      onPress: onPressShare,
      type: 'action' as const,
    },
    {
      iconName: 'flag-outline',
      id: 'report',
      label: '신고',
      onPress: onPressReport,
      type: 'action' as const,
    },
    ...(showManageActions
      ? [
          {
            iconName: 'create-outline',
            id: 'edit',
            label: '수정',
            onPress: onPressEdit,
            type: 'action' as const,
          },
          {
            iconName: 'trash-outline',
            id: 'delete',
            label: '삭제',
            onPress: onPressDelete,
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
