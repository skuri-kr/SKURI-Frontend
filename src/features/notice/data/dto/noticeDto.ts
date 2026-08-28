export interface NoticePageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface NoticeAttachmentDto {
  name: string;
  downloadUrl: string;
  previewUrl: string;
}

export interface NoticeSummaryDto {
  id: string;
  title: string;
  rssPreview: string;
  category: string;
  department: string;
  author: string;
  postedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isRead: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  isCommentedByMe: boolean;
  thumbnailUrl?: string | null;
}

export interface NoticeDetailDto {
  id: string;
  title: string;
  rssPreview: string;
  bodyHtml: string;
  link: string;
  category: string;
  department: string;
  author: string;
  source: string;
  postedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  attachments: NoticeAttachmentDto[];
  isRead: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface NoticeCommentDto {
  id: string;
  parentId?: string | null;
  depth: number;
  content: string;
  authorId?: string | null;
  authorName?: string | null;
  authorProfileImage?: string | null;
  isAuthorAdmin?: boolean;
  isAnonymous: boolean;
  anonymousOrder?: number | null;
  isAuthor: boolean;
  isDeleted: boolean;
  isLiked: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeLikeResponseDto {
  isLiked: boolean;
  likeCount: number;
}

export interface NoticeBookmarkResponseDto {
  isBookmarked: boolean;
  bookmarkCount: number;
}

export interface NoticeBookmarkSummaryDto {
  id: string;
  title: string;
  rssPreview: string;
  category: string;
  postedAt: string;
}

export interface NoticeReadResponseDto {
  noticeId: string;
  isRead: boolean;
  readAt: string;
}

export interface NoticeCommentLikeResponseDto {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
}

export interface CreateNoticeCommentRequestDto {
  content: string;
  isAnonymous: boolean;
  parentId?: string | null;
}

export interface UpdateNoticeCommentRequestDto {
  content: string;
  isAnonymous?: boolean;
}
