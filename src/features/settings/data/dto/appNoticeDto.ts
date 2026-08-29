export type AppNoticeCategoryDto =
  | 'UPDATE'
  | 'MAINTENANCE'
  | 'EVENT'
  | 'GENERAL';

export type AppNoticePriorityDto = 'HIGH' | 'NORMAL' | 'LOW';

export interface AppNoticeResponseDto {
  actionLabel?: string | null;
  actionUrl?: string | null;
  category: AppNoticeCategoryDto;
  content: string;
  createdAt: string;
  id: string;
  imageUrls?: string[] | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  priority: AppNoticePriorityDto;
  publishedAt: string;
  title: string;
  updatedAt: string;
}

export interface AppNoticeUnreadCountResponseDto {
  count: number;
}

export interface AppNoticeReadResponseDto {
  appNoticeId: string;
  isRead: boolean;
  readAt: string;
}
