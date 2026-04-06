import type {PaginatedResult} from '@/shared/types/pagination';
import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';

import type {
  Comment,
  CommentFormData,
  Notice,
  NoticeCommentTreeNode,
  NoticeFilterOptions,
  ReadStatusMap,
} from '../../model/types';

export interface NoticeListPage extends PaginatedResult<Notice> {
  totalElements?: number;
}

export interface NoticeCommentLikeState {
  commentId: string;
  isLiked: boolean;
  likeCount: number;
}

export interface INoticeRepository {
  getRecentNotices(limit: number): Promise<Notice[]>;
  subscribeToNotices(
    category: string,
    limit: number,
    callbacks: SubscriptionCallbacks<NoticeListPage>,
  ): Unsubscribe;
  getMoreNotices(
    category: string,
    cursor: unknown,
    limit: number,
  ): Promise<NoticeListPage>;
  searchNotices(
    search: string,
    cursor: unknown,
    limit: number,
  ): Promise<NoticeListPage>;
  getNotice(noticeId: string): Promise<Notice | null>;
  subscribeToNotice(
    noticeId: string,
    callbacks: SubscriptionCallbacks<Notice | null>,
  ): Unsubscribe;
  getReadStatus(userId: string, noticeIds: string[]): Promise<ReadStatusMap>;
  markAsRead(userId: string, noticeId: string): Promise<void>;
  markAllAsRead(userId: string, noticeIds: string[]): Promise<void>;
  toggleLike(noticeId: string, userId: string): Promise<boolean>;
  isLiked(noticeId: string, userId: string): Promise<boolean>;
  toggleBookmark(noticeId: string, userId: string): Promise<boolean>;
  isBookmarked(noticeId: string, userId: string): Promise<boolean>;
  getComments(noticeId: string): Promise<NoticeCommentTreeNode[]>;
  subscribeToComments(
    noticeId: string,
    callbacks: SubscriptionCallbacks<NoticeCommentTreeNode[]>,
  ): Unsubscribe;
  createComment(
    noticeId: string,
    comment: CommentFormData & {userId: string; userDisplayName: string},
  ): Promise<string>;
  toggleCommentLike(
    noticeId: string,
    commentId: string,
    userId: string,
  ): Promise<NoticeCommentLikeState>;
  updateComment(
    noticeId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void>;
  deleteComment(noticeId: string, commentId: string): Promise<void>;
  incrementViewCount(noticeId: string): Promise<void>;
}

export type {
  Comment,
  CommentFormData,
  Notice,
  NoticeCommentTreeNode,
  NoticeFilterOptions,
  ReadStatusMap,
};
