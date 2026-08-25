import type {NotificationType} from '../../model/notificationContract';

export type NotificationTypeDto = NotificationType;

export interface NotificationDataDto {
  academicScheduleId?: string | null;
  appNoticeId?: string | null;
  chatRoomId?: string | null;
  commentId?: string | null;
  friendPublicId?: string | null;
  invitationId?: string | null;
  invitationType?: 'PARTY' | 'CHAT_ROOM' | null;
  noticeId?: string | null;
  partyId?: string | null;
  postId?: string | null;
  requestId?: string | null;
}

export interface NotificationResponseDto {
  createdAt: string;
  data?: NotificationDataDto | null;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: NotificationTypeDto;
}

export interface NotificationListResponseDto {
  content: NotificationResponseDto[];
  hasNext: boolean;
  hasPrevious: boolean;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationUnreadCountResponseDto {
  count: number;
}

export interface NotificationSnapshotResponseDto {
  unreadCount: number;
}
