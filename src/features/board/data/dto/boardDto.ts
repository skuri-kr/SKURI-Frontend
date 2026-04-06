export type BoardPostCategoryDto =
  | 'GENERAL'
  | 'QUESTION'
  | 'REVIEW'
  | 'ANNOUNCEMENT';

export interface BoardPageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface BoardPostImageDto {
  url: string;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mime?: string | null;
}

export interface BoardPostSummaryDto {
  id: string;
  title: string;
  content: string;
  authorId?: string | null;
  authorName?: string | null;
  authorProfileImage?: string | null;
  isAnonymous: boolean;
  category: BoardPostCategoryDto;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isCommentedByMe: boolean;
  hasImage: boolean;
  thumbnailUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface BoardPostDetailDto {
  id: string;
  title: string;
  content: string;
  authorId?: string | null;
  authorName?: string | null;
  authorProfileImage?: string | null;
  isAnonymous: boolean;
  category: BoardPostCategoryDto;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  images: BoardPostImageDto[];
  isLiked: boolean;
  isBookmarked: boolean;
  isAuthor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCommentDto {
  id: string;
  parentId?: string | null;
  depth: number;
  content: string;
  authorId?: string | null;
  authorName?: string | null;
  authorProfileImage?: string | null;
  isAnonymous: boolean;
  anonymousOrder?: number | null;
  isAuthor: boolean;
  isPostAuthor: boolean;
  isDeleted: boolean;
  isLiked: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardLikeResponseDto {
  isLiked: boolean;
  likeCount: number;
}

export interface BoardBookmarkResponseDto {
  isBookmarked: boolean;
  bookmarkCount: number;
}

export interface BoardCommentLikeResponseDto {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
}

export interface BoardCreatePostRequestDto {
  title: string;
  content: string;
  category: BoardPostCategoryDto;
  isAnonymous: boolean;
  images: BoardPostImageDto[];
}

export interface BoardUpdatePostRequestDto {
  title?: string;
  content?: string;
  category?: BoardPostCategoryDto;
  isAnonymous?: boolean;
  images?: BoardPostImageDto[];
}

export interface BoardCreateCommentRequestDto {
  content: string;
  isAnonymous: boolean;
  parentId?: string | null;
}

export interface BoardUpdateCommentRequestDto {
  content: string;
  isAnonymous?: boolean;
}

export interface BoardImageUploadResponseDto {
  url: string;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  mime?: string | null;
}
