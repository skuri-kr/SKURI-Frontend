import type { PaginatedResult } from '@/shared/types/pagination';
import type {
  BoardComment,
  BoardImage,
  BoardPost,
  BoardSortOption,
} from '@/features/board/model/types';
import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';

export interface BoardFilterOptions {
  category?: string;
  authorId?: string;
  searchText?: string;
  sortBy?: BoardSortOption;
}

export interface BoardCommentTreeNode extends BoardComment {
  replies: BoardCommentTreeNode[];
}

export interface BoardCommentLikeState {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
}

export interface IBoardRepository {
  getPosts(filters: BoardFilterOptions, limit: number): Promise<PaginatedResult<BoardPost>>;
  getMorePosts(
    filters: BoardFilterOptions,
    cursor: unknown,
    limit: number,
  ): Promise<PaginatedResult<BoardPost>>;
  subscribeToPosts(
    filters: BoardFilterOptions,
    limit: number,
    callbacks: SubscriptionCallbacks<BoardPost[]>,
  ): Unsubscribe;
  getPost(postId: string): Promise<BoardPost | null>;
  subscribeToPost(
    postId: string,
    callbacks: SubscriptionCallbacks<BoardPost | null>,
  ): Unsubscribe;
  createPost(
    post: Omit<
      BoardPost,
      'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'bookmarkCount'
    >,
  ): Promise<string>;
  updatePost(postId: string, updates: Partial<BoardPost>): Promise<void>;
  deletePost(postId: string): Promise<void>;
  toggleLike(postId: string, userId: string): Promise<boolean>;
  isLiked(postId: string, userId: string): Promise<boolean>;
  toggleBookmark(postId: string, userId: string): Promise<boolean>;
  isBookmarked(postId: string, userId: string): Promise<boolean>;
  incrementViewCount(postId: string): Promise<void>;
  getComments(postId: string): Promise<BoardCommentTreeNode[]>;
  subscribeToComments(
    postId: string,
    callbacks: SubscriptionCallbacks<BoardCommentTreeNode[]>,
  ): Unsubscribe;
  createComment(
    postId: string,
    comment: Omit<BoardComment, 'id' | 'postId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string>;
  toggleCommentLike(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<BoardCommentLikeState>;
  updateComment(
    postId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void>;
  deleteComment(postId: string, commentId: string): Promise<void>;
  uploadImage(uri: string, postId?: string): Promise<BoardImage>;
  deleteImage(imageUrl: string): Promise<void>;
  getCategoryCounts(categories: string[]): Promise<Record<string, number>>;
}
