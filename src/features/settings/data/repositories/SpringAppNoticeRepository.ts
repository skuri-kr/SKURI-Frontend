import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';
import type {
  NoticeComment,
  NoticeCommentFormData,
  NoticeCommentTreeNode,
} from '@/features/notice/model/types';
import {
  mapNoticeCommentDto,
  mapNoticeCommentLikeResponseDto,
  mapNoticeLikeResponseDto,
} from '@/features/notice/data/mappers/noticeMapper';

import {appNoticeApiClient} from '../api/appNoticeApiClient';
import {mapAppNoticeResponseDto} from '../mappers/appNoticeMapper';
import type {
  AppNotice,
  AppNoticeReadState,
  IAppNoticeRepository,
} from './IAppNoticeRepository';

export class SpringAppNoticeRepository implements IAppNoticeRepository {
  private readonly getCurrentUserId: () => string | null;

  private cacheUserId: string | null | undefined;

  private cacheUserSession = 0;

  private readonly commentCache = new Map<string, NoticeCommentTreeNode[]>();

  private readonly commentCacheGeneration = new Map<string, number>();

  private readonly commentReadGeneration = new Map<string, number>();

  private readonly noticeCache = new Map<string, AppNotice>();

  private readonly noticeCacheGeneration = new Map<string, number>();

  private readonly noticeReadGeneration = new Map<string, number>();

  constructor(getCurrentUserId: () => string | null = () => null) {
    this.getCurrentUserId = getCurrentUserId;
  }

  async getUnreadCount(): Promise<number> {
    const response = await appNoticeApiClient.getUnreadCount();
    return response.data.count;
  }

  async getAppNotice(noticeId: string): Promise<AppNotice | null> {
    const userSession = this.getCurrentUserSession();
    const cacheGeneration = this.noticeCacheGeneration.get(noticeId) ?? 0;
    const readGeneration = (this.noticeReadGeneration.get(noticeId) ?? 0) + 1;
    this.noticeReadGeneration.set(noticeId, readGeneration);
    try {
      const response = await appNoticeApiClient.getAppNotice(noticeId);
      const notice = mapAppNoticeResponseDto(response.data);
      if (
        this.isCurrentUserSession(userSession) &&
        (this.noticeCacheGeneration.get(noticeId) ?? 0) === cacheGeneration &&
        this.noticeReadGeneration.get(noticeId) === readGeneration
      ) {
        this.noticeCache.set(noticeId, notice);
      }
      return notice;
    } catch (error) {
      if (
        error instanceof RepositoryError &&
        error.code === RepositoryErrorCode.NOT_FOUND
      ) {
        return null;
      }

      throw error;
    }
  }

  async getAppNotices(): Promise<AppNotice[]> {
    const response = await appNoticeApiClient.getAppNotices();
    return response.data.map(mapAppNoticeResponseDto);
  }

  async getComments(noticeId: string): Promise<NoticeCommentTreeNode[]> {
    const userSession = this.getCurrentUserSession();
    const cacheGeneration = this.commentCacheGeneration.get(noticeId) ?? 0;
    const readGeneration = (this.commentReadGeneration.get(noticeId) ?? 0) + 1;
    this.commentReadGeneration.set(noticeId, readGeneration);
    const response = await appNoticeApiClient.getComments(noticeId);
    const tree = buildCommentTree(
      response.data.map(comment => mapNoticeCommentDto(noticeId, comment)),
    );
    if (
      this.isCurrentUserSession(userSession) &&
      (this.commentCacheGeneration.get(noticeId) ?? 0) === cacheGeneration &&
      this.commentReadGeneration.get(noticeId) === readGeneration
    ) {
      this.commentCache.set(noticeId, tree);
    }
    return cloneCommentTree(tree);
  }

  async createComment(
    noticeId: string,
    comment: NoticeCommentFormData & {userId: string; userDisplayName: string},
  ): Promise<NoticeComment> {
    const userSession = this.getCurrentUserSession();
    this.invalidateCommentCache(noticeId);
    const response = await appNoticeApiClient.createComment(noticeId, {
      content: comment.content.trim(),
      isAnonymous: Boolean(comment.isAnonymous),
      parentId: comment.parentId,
    });
    const createdComment = mapNoticeCommentDto(noticeId, response.data);
    if (this.isCurrentUserSession(userSession)) {
      const nextComments = [
        ...flattenComments(this.commentCache.get(noticeId) ?? []),
        createdComment,
      ];
      this.commitCommentCache(noticeId, buildCommentTree(nextComments));
    }
    return createdComment;
  }

  async updateComment(
    noticeId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<NoticeComment> {
    const userSession = this.getCurrentUserSession();
    this.invalidateCommentCache(noticeId);
    const response = await appNoticeApiClient.updateComment(commentId, {
      content: content.trim(),
      ...(isAnonymous === undefined ? {} : {isAnonymous}),
    });
    const updatedComment = mapNoticeCommentDto(noticeId, response.data);
    const comments = this.commentCache.get(noticeId);
    if (comments && this.isCurrentUserSession(userSession)) {
      const next = flattenComments(comments).map(comment =>
        comment.id === commentId ? updatedComment : comment,
      );
      this.commitCommentCache(noticeId, buildCommentTree(next));
    }
    return updatedComment;
  }

  async deleteComment(noticeId: string, commentId: string): Promise<void> {
    const userSession = this.getCurrentUserSession();
    this.invalidateCommentCache(noticeId);
    await appNoticeApiClient.deleteComment(commentId);
    const comments = this.commentCache.get(noticeId);
    if (comments && this.isCurrentUserSession(userSession)) {
      this.commitCommentCache(noticeId, markCommentDeleted(comments, commentId));
    }
  }

  async toggleLike(noticeId: string) {
    const userSession = this.getCurrentUserSession();
    const current = this.noticeCache.get(noticeId) ?? (await this.getAppNotice(noticeId));
    if (!this.isCurrentUserSession(userSession)) {
      throw new RepositoryError(RepositoryErrorCode.UNAUTHENTICATED, '로그인 정보가 변경되었습니다.');
    }
    if (!current) {
      throw new RepositoryError(RepositoryErrorCode.NOT_FOUND, '앱 공지사항을 찾을 수 없습니다.');
    }
    this.invalidateNoticeCache(noticeId);
    const response = current.isLiked
      ? await appNoticeApiClient.unlikeNotice(noticeId)
      : await appNoticeApiClient.likeNotice(noticeId);
    const state = mapNoticeLikeResponseDto(response.data);
    if (this.isCurrentUserSession(userSession)) {
      this.commitNoticeCache(noticeId, {...current, ...state});
    }
    return state;
  }

  async toggleCommentLike(noticeId: string, commentId: string) {
    const userSession = this.getCurrentUserSession();
    const comments = this.commentCache.get(noticeId) ?? (await this.getComments(noticeId));
    if (!this.isCurrentUserSession(userSession)) {
      throw new RepositoryError(RepositoryErrorCode.UNAUTHENTICATED, '로그인 정보가 변경되었습니다.');
    }
    const target = flattenComments(comments).find(comment => comment.id === commentId);
    if (!target) {
      throw new RepositoryError(RepositoryErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다.');
    }
    this.invalidateCommentCache(noticeId);
    const response = target.isLiked
      ? await appNoticeApiClient.unlikeComment(commentId)
      : await appNoticeApiClient.likeComment(commentId);
    const state = mapNoticeCommentLikeResponseDto(response.data);
    if (this.isCurrentUserSession(userSession)) {
      const latestComments = this.commentCache.get(noticeId) ?? comments;
      const next = flattenComments(latestComments).map(comment =>
        comment.id === commentId ? {...comment, ...state} : comment,
      );
      this.commitCommentCache(noticeId, buildCommentTree(next));
    }
    return state;
  }

  async markAsRead(noticeId: string): Promise<AppNoticeReadState> {
    const response = await appNoticeApiClient.markAsRead(noticeId);

    return {
      appNoticeId: response.data.appNoticeId,
      isRead: response.data.isRead,
      readAt: new Date(response.data.readAt),
    };
  }

  subscribeToAppNotice(
    noticeId: string,
    callbacks: SubscriptionCallbacks<AppNotice | null>,
  ): Unsubscribe {
    this.getAppNotice(noticeId)
      .then(notice => callbacks.onData(notice))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  subscribeToAppNotices(
    callbacks: SubscriptionCallbacks<AppNotice[]>,
  ): Unsubscribe {
    this.getAppNotices()
      .then(notices => callbacks.onData(notices))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  private invalidateCommentCache(noticeId: string) {
    this.commentCacheGeneration.set(
      noticeId,
      (this.commentCacheGeneration.get(noticeId) ?? 0) + 1,
    );
  }

  private getCurrentUserSession() {
    const userId = this.getCurrentUserId();
    if (this.cacheUserId !== userId) {
      this.cacheUserId = userId;
      this.cacheUserSession += 1;
      this.commentCache.clear();
      this.commentCacheGeneration.clear();
      this.commentReadGeneration.clear();
      this.noticeCache.clear();
      this.noticeCacheGeneration.clear();
      this.noticeReadGeneration.clear();
    }
    return this.cacheUserSession;
  }

  private isCurrentUserSession(userSession: number) {
    return this.getCurrentUserSession() === userSession;
  }

  private invalidateNoticeCache(noticeId: string) {
    this.noticeCacheGeneration.set(
      noticeId,
      (this.noticeCacheGeneration.get(noticeId) ?? 0) + 1,
    );
  }

  private commitCommentCache(
    noticeId: string,
    comments: NoticeCommentTreeNode[],
  ) {
    this.invalidateCommentCache(noticeId);
    this.commentCache.set(noticeId, comments);
  }

  private commitNoticeCache(noticeId: string, notice: AppNotice) {
    this.invalidateNoticeCache(noticeId);
    this.noticeCache.set(noticeId, notice);
  }
}

const cloneComment = (comment: NoticeComment): NoticeCommentTreeNode => ({
  ...comment,
  createdAt: new Date(comment.createdAt),
  replies: (comment.replies ?? []).map(cloneComment),
  updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
});

const cloneCommentTree = (
  comments: NoticeCommentTreeNode[],
): NoticeCommentTreeNode[] => comments.map(cloneComment);

const markCommentDeleted = (
  comments: NoticeCommentTreeNode[],
  commentId: string,
): NoticeCommentTreeNode[] =>
  comments.map(comment => ({
    ...comment,
    ...(comment.id === commentId
      ? {
          anonymousOrder: undefined,
          authorProfileImage: null,
          content: '삭제된 댓글입니다',
          isAnonymous: false,
          isAuthor: false,
          isAuthorAdmin: false,
          isDeleted: true,
          isLiked: false,
          userDisplayName: '',
          userId: '',
        }
      : {}),
    replies: markCommentDeleted(comment.replies, commentId),
  }));

const flattenComments = (comments: NoticeCommentTreeNode[]): NoticeComment[] =>
  comments.flatMap(comment => [comment, ...flattenComments(comment.replies)]);

const buildCommentTree = (comments: NoticeComment[]): NoticeCommentTreeNode[] => {
  const roots: NoticeCommentTreeNode[] = [];
  const nodes = new Map<string, NoticeCommentTreeNode>();
  comments.forEach(comment => nodes.set(comment.id, {...cloneComment(comment), replies: []}));
  comments.forEach(comment => {
    const node = nodes.get(comment.id);
    if (!node) return;
    if (comment.parentId) {
      nodes.get(comment.parentId)?.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};
