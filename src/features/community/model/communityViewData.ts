export type CommunitySegmentId = 'board' | 'chat';

export interface CommunityBoardFeaturedViewData {
  categoryLabel: string;
  commentCount: number;
  id: string;
  likeCount: number;
  timeLabel: string;
  title: string;
}

export interface CommunityBoardPostViewData {
  authorLabel: string;
  authorProfileImage?: string | null;
  isAuthorAdmin?: boolean;
  bookmarkCount: number;
  categoryLabel: string;
  commentCount: number;
  excerpt: string;
  id: string;
  isBookmarked: boolean;
  isCommentedByMe: boolean;
  isLiked: boolean;
  likeCount: number;
  thumbnailUrl?: string;
  timeLabel: string;
  title: string;
  viewCount: number;
}

export interface CommunityChatRoomViewData {
  description: string;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: string;
  id: string;
  isJoined: boolean;
  memberCountLabel: string;
  previewLabel: string;
  previewStatusBackgroundColor?: string;
  previewStatusLabel?: string;
  previewStatusTextColor?: string;
  titleStatusBackgroundColor?: string;
  titleStatusLabel?: string;
  titleStatusTextColor?: string;
  timeLabel: string;
  title: string;
  unreadCount: number;
}
