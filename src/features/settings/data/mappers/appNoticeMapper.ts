import type {AppNotice} from '../repositories/IAppNoticeRepository';
import type {
  AppNoticeCategoryDto,
  AppNoticePriorityDto,
  AppNoticeResponseDto,
} from '../dto/appNoticeDto';

const CATEGORY_MAP: Record<AppNoticeCategoryDto, AppNotice['category']> = {
  EVENT: 'event',
  GENERAL: 'policy',
  MAINTENANCE: 'service',
  UPDATE: 'update',
};

const PRIORITY_MAP: Record<AppNoticePriorityDto, AppNotice['priority']> = {
  HIGH: 'urgent',
  LOW: 'info',
  NORMAL: 'normal',
};

export const mapAppNoticeResponseDto = (
  notice: AppNoticeResponseDto,
): AppNotice => {
  return {
    actionLabel: notice.actionLabel ?? undefined,
    actionUrl: notice.actionUrl ?? undefined,
    category: CATEGORY_MAP[notice.category],
    content: notice.content,
    id: notice.id,
    imageUrls:
      notice.imageUrls?.filter(
        (imageUrl): imageUrl is string => typeof imageUrl === 'string' && Boolean(imageUrl),
      ) ?? undefined,
    priority: PRIORITY_MAP[notice.priority],
    viewCount: notice.viewCount ?? 0,
    likeCount: notice.likeCount ?? 0,
    commentCount: notice.commentCount ?? 0,
    isLiked: Boolean(notice.isLiked),
    publishedAt: new Date(notice.publishedAt),
    title: notice.title,
    updatedAt: notice.updatedAt ? new Date(notice.updatedAt) : undefined,
  };
};
