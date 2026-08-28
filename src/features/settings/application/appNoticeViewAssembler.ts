import type {ImageSourcePropType} from 'react-native';

import {formatKoreanRelativeTime} from '@/shared/lib/date';

import type {AppNotice} from '../data/repositories/IAppNoticeRepository';
import type {
  AppNoticeDetailViewData,
  AppNoticeFeedCardViewData,
  AppNoticeFeedViewData,
} from '../model/appNoticeViewData';

const CATEGORY_LABEL_MAP: Record<AppNotice['category'], string> = {
  event: '이벤트',
  policy: '안내',
  service: '점검',
  update: '업데이트',
};

const APP_NOTICE_AUTHOR_LABEL = 'SKURI 운영팀';

const toImageSource = (imageUrl: string): ImageSourcePropType => ({
  uri: imageUrl,
});

const toImageSources = (imageUrls?: string[]): ImageSourcePropType[] => {
  if (!imageUrls?.length) {
    return [];
  }

  return imageUrls.map(toImageSource);
};

const toParagraphs = (content: string): string[] => {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const normalizedContent = content.trim();
  return normalizedContent ? [normalizedContent] : [];
};

const toSummary = (content: string): string => {
  const collapsed = content.replace(/\s+/g, ' ').trim();

  if (!collapsed) {
    return '본문이 등록되지 않았습니다.';
  }

  if (collapsed.length <= 88) {
    return collapsed;
  }

  return `${collapsed.slice(0, 88).trimEnd()}...`;
};

const toCategoryLabel = (category: AppNotice['category']) =>
  CATEGORY_LABEL_MAP[category] ?? '안내';

const toFeedItem = (notice: AppNotice): AppNoticeFeedCardViewData => ({
  badges: [],
  content: notice.content,
  id: notice.id,
  previewImage: notice.imageUrls?.[0]
    ? toImageSource(notice.imageUrls[0])
    : undefined,
  publishedLabel: formatKoreanRelativeTime(notice.publishedAt),
  summary: toSummary(notice.content),
  title: notice.title,
  viewCountLabel: (notice.viewCount ?? 0).toLocaleString('ko-KR'),
});

export const assembleAppNoticeFeedViewData = (
  notices: AppNotice[],
): AppNoticeFeedViewData => {
  return {
    items: notices.map(toFeedItem),
  };
};

export const assembleAppNoticeDetailViewData = (
  notice: AppNotice,
): AppNoticeDetailViewData => {
  return {
    actionLabel: notice.actionLabel,
    actionUrl: notice.actionUrl,
    authorLabel: APP_NOTICE_AUTHOR_LABEL,
    badges: [],
    bodyParagraphs: toParagraphs(notice.content),
    categoryLabel: toCategoryLabel(notice.category),
    galleryImages: toImageSources(notice.imageUrls),
    id: notice.id,
    publishedLabel: formatKoreanRelativeTime(notice.publishedAt),
    title: notice.title,
    viewCountLabel: (notice.viewCount ?? 0).toLocaleString('ko-KR'),
    likeCount: notice.likeCount ?? 0,
    commentCount: notice.commentCount ?? 0,
    isLiked: Boolean(notice.isLiked),
  };
};
