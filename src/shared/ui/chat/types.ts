export interface ChatThreadHeaderViewData {
  iconBackgroundColor: string;
  iconColor: string;
  iconName: string;
  subtitle: string;
  title: string;
}

export interface ChatThreadMenuViewData {
  canReport?: boolean;
  canLeave?: boolean;
  canToggleNotification?: boolean;
  leaveLabel: string;
  notificationEnabled: boolean;
}

export type ChatAvatarViewData =
  | {
      backgroundColor: string;
      kind: 'image';
      uri: string;
    }
  | {
      backgroundColor: string;
      kind: 'icon';
      iconColor: string;
      iconName: string;
    }
  | {
      backgroundColor: string;
      kind: 'label';
      label: string;
      textColor: string;
    };

export interface ChatThreadDateDividerViewData {
  id: string;
  label: string;
  type: 'date-divider';
}

export interface ChatThreadSystemMessageViewData {
  id: string;
  text: string;
  type: 'system-message';
}

export interface ChatThreadMessageViewData {
  avatar?: ChatAvatarViewData;
  createdAt?: unknown;
  editedAt?: unknown;
  direction: 'incoming' | 'outgoing';
  id: string;
  imageUrl?: string;
  isDeleted?: boolean;
  messageKind: 'text' | 'image';
  minuteKey: string;
  senderId: string;
  senderName: string;
  text: string;
  timeLabel: string;
  type: 'text-message';
}

export interface ChatThreadNewMessagePreviewViewData {
  id: string;
  senderName: string;
  text: string;
}

export type ChatThreadItemViewData =
  | ChatThreadDateDividerViewData
  | ChatThreadSystemMessageViewData
  | ChatThreadMessageViewData;

export interface ChatThreadListViewData {
  currentUserId: string;
  header: ChatThreadHeaderViewData;
  items: ChatThreadItemViewData[];
  menu: ChatThreadMenuViewData;
  roomId: string;
}
