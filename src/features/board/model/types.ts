export type BoardPostCategoryId =
  | 'general'
  | 'question'
  | 'review'
  | 'announcement';

export type BoardSortOption =
  | 'latest'
  | 'popular'
  | 'mostCommented'
  | 'mostViewed';

export interface BoardImage {
  url: string;
  width: number;
  height: number;
  thumbUrl?: string;
  size?: number;
  mime?: string;
}

export interface BoardSelectedImage {
  id: string;
  localUri: string;
  width: number;
  height: number;
  size: number;
  mime: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
  remoteUrl?: string;
  thumbUrl?: string;
}

export interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfileImage?: string | null;
  isAuthorAdmin?: boolean;
  isAnonymous?: boolean;
  anonId?: string;
  category: BoardPostCategoryId;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isPinned: boolean;
  isDeleted: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isCommentedByMe?: boolean;
  isAuthor?: boolean;
  images?: BoardImage[];
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastCommentAt?: Date;
}

export interface BoardComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfileImage: string | null;
  isAuthorAdmin?: boolean;
  isAnonymous?: boolean;
  isAuthor?: boolean;
  isPostAuthor?: boolean;
  isLiked?: boolean;
  anonId: string | null;
  anonymousOrder?: number;
  likeCount: number;
  parentId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardCategory {
  id: BoardPostCategoryId;
  name: string;
  shortName: string;
  description: string;
  postCount: number;
  color: string;
}

export interface BoardSearchFilters {
  searchText?: string;
  category?: BoardPostCategoryId | string;
  authorId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy: BoardSortOption;
}

export interface BoardFormData {
  title: string;
  content: string;
  category: BoardPostCategoryId;
  isAnonymous?: boolean;
}
