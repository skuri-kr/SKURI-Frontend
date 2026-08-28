import type {ImageSourcePropType} from 'react-native';

export type AppNoticeBadgeTone = 'danger' | 'neutral';

export interface AppNoticeBadgeViewData {
  id: string;
  label: string;
  tone: AppNoticeBadgeTone;
}

export interface AppNoticeFeedCardViewData {
  badges: AppNoticeBadgeViewData[];
  id: string;
  previewImage?: ImageSourcePropType;
  publishedLabel: string;
  summary: string;
  title: string;
  viewCountLabel?: string;
}

export interface AppNoticeFeedViewData {
  items: AppNoticeFeedCardViewData[];
}

export interface AppNoticeDetailViewData {
  actionLabel?: string;
  actionUrl?: string;
  authorLabel: string;
  badges: AppNoticeBadgeViewData[];
  bodyParagraphs: string[];
  categoryLabel: string;
  galleryImages: ImageSourcePropType[];
  id: string;
  publishedLabel: string;
  title: string;
  viewCountLabel?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}
