export type CommunityBoardCategory =
  | 'announcement'
  | 'general'
  | 'question'
  | 'review';

export type CommunityBoardSortBy =
  | 'latest'
  | 'mostCommented'
  | 'mostViewed'
  | 'popular';

export interface CommunityBoardSearchFilters {
  category?: CommunityBoardCategory;
  searchText?: string;
  sortBy: CommunityBoardSortBy;
}

export interface CommunityBoardSourceItem {
  authorName: string;
  authorProfileImage?: string | null;
  isAuthorAdmin?: boolean;
  bookmarkCount: number;
  category: CommunityBoardCategory;
  commentCount: number;
  content: string;
  createdAt: string;
  hashtags: string[];
  id: string;
  isAnonymous: boolean;
  isBookmarked: boolean;
  isCommentedByMe: boolean;
  isLiked: boolean;
  likeCount: number;
  thumbnailUrl?: string;
  title: string;
  viewCount: number;
}

export type CommunityChatRoomTone =
  | 'custom'
  | 'department'
  | 'game'
  | 'university';

export interface CommunityChatRoomSourceItem {
  description: string;
  id: string;
  isJoined: boolean;
  lastMessageText: string;
  memberCount: number;
  title: string;
  tone: CommunityChatRoomTone;
  unreadCount: number;
  updatedAt: string;
}

export interface CommunityBoardPageResult {
  featuredPost?: CommunityBoardSourceItem;
  items: CommunityBoardSourceItem[];
  nextCursor?: unknown;
}
