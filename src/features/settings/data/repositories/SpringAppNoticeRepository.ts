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
  private readonly commentCache = new Map<string, NoticeCommentTreeNode[]>();

  private readonly noticeCache = new Map<string, AppNotice>();

  async getUnreadCount(): Promise<number> {
    const response = await appNoticeApiClient.getUnreadCount();
    return response.data.count;
  }

  async getAppNotice(noticeId: string): Promise<AppNotice | null> {
    try {
      const response = await appNoticeApiClient.getAppNotice(noticeId);
      const notice = mapAppNoticeResponseDto(response.data);
      this.noticeCache.set(noticeId, notice);
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
    const response = await appNoticeApiClient.getComments(noticeId);
    const tree = buildCommentTree(
      response.data.map(comment => mapNoticeCommentDto(noticeId, comment)),
    );
    this.commentCache.set(noticeId, tree);
    return cloneCommentTree(tree);
  }

  async createComment(
    noticeId: string,
    comment: NoticeCommentFormData & {userId: string; userDisplayName: string},
  ): Promise<string> {
    const response = await appNoticeApiClient.createComment(noticeId, {
      content: comment.content.trim(),
      isAnonymous: Boolean(comment.isAnonymous),
      parentId: comment.parentId,
    });
    return response.data.id;
  }

  async updateComment(
    noticeId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void> {
    await appNoticeApiClient.updateComment(commentId, {
      content: content.trim(),
      ...(isAnonymous === undefined ? {} : {isAnonymous}),
    });
    await this.getComments(noticeId);
  }

  async deleteComment(noticeId: string, commentId: string): Promise<void> {
    await appNoticeApiClient.deleteComment(commentId);
    await this.getComments(noticeId);
  }

  async toggleLike(noticeId: string) {
    const current = this.noticeCache.get(noticeId) ?? (await this.getAppNotice(noticeId));
    if (!current) {
      throw new RepositoryError(RepositoryErrorCode.NOT_FOUND, '앱 공지사항을 찾을 수 없습니다.');
    }
    const response = current.isLiked
      ? await appNoticeApiClient.unlikeNotice(noticeId)
      : await appNoticeApiClient.likeNotice(noticeId);
    const state = mapNoticeLikeResponseDto(response.data);
    this.noticeCache.set(noticeId, {...current, ...state});
    return state;
  }

  async toggleCommentLike(noticeId: string, commentId: string) {
    const comments = this.commentCache.get(noticeId) ?? (await this.getComments(noticeId));
    const target = flattenComments(comments).find(comment => comment.id === commentId);
    if (!target) {
      throw new RepositoryError(RepositoryErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다.');
    }
    const response = target.isLiked
      ? await appNoticeApiClient.unlikeComment(commentId)
      : await appNoticeApiClient.likeComment(commentId);
    const state = mapNoticeCommentLikeResponseDto(response.data);
    const next = flattenComments(comments).map(comment =>
      comment.id === commentId ? {...comment, ...state} : comment,
    );
    this.commentCache.set(noticeId, buildCommentTree(next));
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
