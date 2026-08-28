import type {
  BoardBookmarkResponseDto,
  BoardCommentDto,
  BoardCommentLikeResponseDto,
  BoardImageUploadResponseDto,
  BoardLikeResponseDto,
  BoardPostCategoryDto,
  BoardPostDetailDto,
  BoardPostImageDto,
  BoardPostSummaryDto,
} from '../dto/boardDto';
import type {
  BoardComment,
  BoardImage,
  BoardPost,
  BoardPostCategoryId,
} from '../../model/types';

const BOARD_CATEGORY_FROM_DTO: Record<
  BoardPostCategoryDto,
  BoardPostCategoryId
> = {
  ANNOUNCEMENT: 'announcement',
  GENERAL: 'general',
  QUESTION: 'question',
  REVIEW: 'review',
};

const BOARD_CATEGORY_TO_DTO: Record<BoardPostCategoryId, BoardPostCategoryDto> =
  {
    announcement: 'ANNOUNCEMENT',
    general: 'GENERAL',
    question: 'QUESTION',
    review: 'REVIEW',
  };

const toDate = (value: string) => new Date(value);

export const mapBoardCategoryToDto = (
  category?: string,
): BoardPostCategoryDto | undefined => {
  if (!category) {
    return undefined;
  }

  return BOARD_CATEGORY_TO_DTO[category as BoardPostCategoryId];
};

export const mapBoardImageDto = (dto: BoardPostImageDto): BoardImage => ({
  height: dto.height ?? 0,
  mime: dto.mime ?? undefined,
  size: dto.size ?? undefined,
  thumbUrl: dto.thumbUrl ?? undefined,
  url: dto.url,
  width: dto.width ?? 0,
});

const mapBoardPostBase = (
  dto: Pick<
    BoardPostDetailDto,
    | 'authorId'
    | 'authorName'
    | 'authorProfileImage'
    | 'isAuthorAdmin'
    | 'category'
    | 'commentCount'
    | 'content'
    | 'createdAt'
    | 'id'
    | 'isAnonymous'
    | 'likeCount'
    | 'title'
    | 'viewCount'
  >,
) => ({
  authorId: dto.authorId ?? '',
  authorName: dto.authorName ?? '익명',
  authorProfileImage: dto.authorProfileImage ?? null,
  isAuthorAdmin: Boolean(dto.isAuthorAdmin),
  category: BOARD_CATEGORY_FROM_DTO[dto.category],
  commentCount: dto.commentCount,
  content: dto.content,
  createdAt: toDate(dto.createdAt),
  id: dto.id,
  isAnonymous: dto.isAnonymous,
  likeCount: dto.likeCount,
  title: dto.title,
  viewCount: dto.viewCount,
});

export const mapBoardPostSummaryDto = (
  dto: BoardPostSummaryDto,
): BoardPost => ({
  ...mapBoardPostBase(dto),
  bookmarkCount: dto.bookmarkCount,
  images: dto.hasImage ? [] : undefined,
  isBookmarked: dto.isBookmarked,
  isCommentedByMe: dto.isCommentedByMe,
  isDeleted: false,
  isLiked: dto.isLiked,
  isPinned: dto.isPinned,
  thumbnailUrl: dto.thumbnailUrl ?? undefined,
  updatedAt: toDate(dto.createdAt),
});

export const mapBoardPostDetailDto = (dto: BoardPostDetailDto): BoardPost => ({
  ...mapBoardPostBase(dto),
  bookmarkCount: dto.bookmarkCount,
  images: dto.images.map(mapBoardImageDto),
  isAuthor: dto.isAuthor,
  isBookmarked: dto.isBookmarked,
  isDeleted: false,
  isLiked: dto.isLiked,
  isPinned: false,
  updatedAt: toDate(dto.updatedAt),
});

export const mapBoardCommentDto = (
  postId: string,
  dto: BoardCommentDto,
): BoardComment => ({
  anonId: dto.isAnonymous
    ? `${postId}:${dto.anonymousOrder ?? dto.authorId ?? dto.id}`
    : null,
  anonymousOrder: dto.anonymousOrder ?? undefined,
  authorId: dto.authorId ?? '',
  authorName: dto.authorName ?? '익명',
  authorProfileImage: dto.authorProfileImage ?? null,
  isAuthorAdmin: Boolean(dto.isAuthorAdmin),
  content: dto.content,
  createdAt: toDate(dto.createdAt),
  id: dto.id,
  isAnonymous: dto.isAnonymous,
  isAuthor: dto.isAuthor,
  isDeleted: dto.isDeleted,
  isLiked: dto.isLiked,
  isPostAuthor: dto.isPostAuthor,
  likeCount: dto.likeCount,
  parentId: dto.parentId ?? null,
  postId,
  updatedAt: toDate(dto.updatedAt),
});

export const mapBoardLikeResponseDto = (dto: BoardLikeResponseDto) => ({
  isLiked: dto.isLiked,
  likeCount: dto.likeCount,
});

export const mapBoardBookmarkResponseDto = (dto: BoardBookmarkResponseDto) => ({
  bookmarkCount: dto.bookmarkCount,
  isBookmarked: dto.isBookmarked,
});

export const mapBoardCommentLikeResponseDto = (
  dto: BoardCommentLikeResponseDto,
) => ({
  commentId: dto.commentId,
  isLiked: dto.isLiked,
  likeCount: dto.likeCount,
});

export const mapBoardImageUploadResponseDto = (
  dto: BoardImageUploadResponseDto,
): BoardImage => mapBoardImageDto(dto);
