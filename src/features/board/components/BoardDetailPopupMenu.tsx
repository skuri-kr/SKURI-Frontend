import React from 'react';

import {PopupMenu} from '@/shared/ui/PopupMenu';

interface BoardDetailPopupMenuProps {
  onClose: () => void;
  onPressBlock: () => void;
  onPressDelete: () => void;
  onPressEdit: () => void;
  onPressReport: () => void;
  onPressShare: () => void;
  right?: number;
  showBlockAction?: boolean;
  showManageActions?: boolean;
  top: number;
  visible: boolean;
}

export const BoardDetailPopupMenu = ({
  onClose,
  onPressBlock,
  onPressDelete,
  onPressEdit,
  onPressReport,
  onPressShare,
  right = 12,
  showBlockAction = false,
  showManageActions = true,
  top,
  visible,
}: BoardDetailPopupMenuProps) => {
  const items = [
    {
      iconName: 'link-outline',
      id: 'share',
      label: '링크 복사',
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
    ...(showBlockAction
      ? [
          {
            iconName: 'ban-outline',
            id: 'block',
            label: '사용자 차단',
            onPress: onPressBlock,
            tone: 'danger' as const,
            type: 'action' as const,
          },
        ]
      : []),
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
