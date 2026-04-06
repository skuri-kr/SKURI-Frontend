import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';

import type {
  Comment,
  CommentFormData,
  INoticeRepository,
  Notice,
  NoticeCommentTreeNode,
  NoticeListPage,
  ReadStatusMap,
} from './INoticeRepository';
import {noticeApiClient, NoticeApiClient} from '../api/noticeApiClient';
import {
  mapNoticeBookmarkResponseDto,
  mapNoticeCommentDto,
  mapNoticeCommentLikeResponseDto,
  mapNoticeDetailDto,
  mapNoticeLikeResponseDto,
  mapNoticeSummaryDto,
} from '../mappers/noticeMapper';

interface NoticePageCursor {
  page: number;
}

const PAGE_CURSOR_FALLBACK: NoticePageCursor = {page: 0};

const cloneNotice = (notice: Notice): Notice => ({
  ...notice,
  contentAttachments: notice.contentAttachments.map(attachment => ({
    ...attachment,
  })),
});

const cloneComment = (comment: Comment): Comment => ({
  ...comment,
  createdAt: new Date(comment.createdAt),
  replies: comment.replies?.map(cloneComment) ?? [],
  updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
});

const cloneCommentTree = (
  comments: NoticeCommentTreeNode[],
): NoticeCommentTreeNode[] =>
  comments.map(comment => ({
    ...cloneComment(comment),
    replies: cloneCommentTree(comment.replies),
  }));

const buildCommentTree = (comments: Comment[]): NoticeCommentTreeNode[] => {
  const roots: NoticeCommentTreeNode[] = [];
  const nodeById = new Map<string, NoticeCommentTreeNode>();

  comments.forEach(comment => {
    nodeById.set(comment.id, {
      ...cloneComment(comment),
      replies: [],
    });
  });

  comments.forEach(comment => {
    const node = nodeById.get(comment.id);
    if (!node) {
      return;
    }

    if (comment.parentId) {
      nodeById.get(comment.parentId)?.replies.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
};

const extractCursor = (cursor: unknown): NoticePageCursor => {
  if (
    cursor &&
    typeof cursor === 'object' &&
    typeof (cursor as NoticePageCursor).page === 'number'
  ) {
    return cursor as NoticePageCursor;
  }

  return PAGE_CURSOR_FALLBACK;
};

export class SpringNoticeRepository implements INoticeRepository {
  private readonly commentCache = new Map<string, NoticeCommentTreeNode[]>();

  private readonly noticeCache = new Map<string, Notice>();

  constructor(private readonly apiClient: NoticeApiClient = noticeApiClient) {}

  async createComment(
    noticeId: string,
    comment: CommentFormData & {userId: string; userDisplayName: string},
  ): Promise<string> {
    const response = await this.apiClient.createComment(noticeId, {
      content: comment.content.trim(),
      isAnonymous: Boolean(comment.isAnonymous),
      parentId: comment.parentId,
    });
    const createdComment = mapNoticeCommentDto(noticeId, response.data);
    const nextComments = [
      ...this.flattenComments(this.commentCache.get(noticeId) ?? []),
      createdComment,
    ];
    this.commentCache.set(noticeId, buildCommentTree(nextComments));
    this.updateCachedNotice(noticeId, cachedNotice => ({
      ...cachedNotice,
      commentCount: (cachedNotice.commentCount ?? 0) + 1,
    }));
    return createdComment.id;
  }

  async deleteComment(noticeId: string, commentId: string): Promise<void> {
    await this.apiClient.deleteComment(commentId);
    const nextComments = await this.getComments(noticeId);
    this.commentCache.set(noticeId, nextComments);
    this.updateCachedNotice(noticeId, cachedNotice => ({
      ...cachedNotice,
      commentCount: Math.max(0, (cachedNotice.commentCount ?? 0) - 1),
    }));
  }

  async getComments(noticeId: string): Promise<NoticeCommentTreeNode[]> {
    const response = await this.apiClient.getComments(noticeId);
    const comments = response.data.map(comment =>
      mapNoticeCommentDto(noticeId, comment),
    );
    const tree = buildCommentTree(comments);
    this.commentCache.set(noticeId, tree);
    return cloneCommentTree(tree);
  }

  async getMoreNotices(
    category: string,
    cursor: unknown,
    limit: number,
  ): Promise<NoticeListPage> {
    return this.fetchNotices(category, limit, extractCursor(cursor).page);
  }

  async searchNotices(
    search: string,
    cursor: unknown,
    limit: number,
  ): Promise<NoticeListPage> {
    return this.fetchNotices(
      '전체',
      limit,
      extractCursor(cursor).page,
      search,
    );
  }

  async getNotice(noticeId: string): Promise<Notice | null> {
    try {
      const response = await this.apiClient.getNotice(noticeId);
      const notice = mapNoticeDetailDto(response.data);
      this.noticeCache.set(notice.id, notice);
      return cloneNotice(notice);
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

  async getReadStatus(
    _userId: string,
    noticeIds: string[],
  ): Promise<ReadStatusMap> {
    return noticeIds.reduce<ReadStatusMap>((result, noticeId) => {
      result[noticeId] = Boolean(this.noticeCache.get(noticeId)?.isRead);
      return result;
    }, {});
  }

  async getRecentNotices(limit: number): Promise<Notice[]> {
    const page = await this.fetchNotices('전체', limit, 0);
    return page.data;
  }

  async incrementViewCount(noticeId: string): Promise<void> {
    await this.getNotice(noticeId);
  }

  async isLiked(noticeId: string, _userId: string): Promise<boolean> {
    const notice = await this.requireNoticeDetail(noticeId);
    return Boolean(notice.isLiked);
  }

  async isBookmarked(noticeId: string, _userId: string): Promise<boolean> {
    const notice = await this.requireNoticeDetail(noticeId);
    return Boolean(notice.isBookmarked);
  }

  async markAllAsRead(userId: string, noticeIds: string[]): Promise<void> {
    await Promise.all(
      noticeIds.map(noticeId => this.markAsRead(userId, noticeId)),
    );
  }

  async markAsRead(_userId: string, noticeId: string): Promise<void> {
    await this.apiClient.markAsRead(noticeId);
    this.updateCachedNotice(noticeId, cachedNotice => ({
      ...cachedNotice,
      isRead: true,
    }));
  }

  subscribeToComments(
    noticeId: string,
    callbacks: SubscriptionCallbacks<NoticeCommentTreeNode[]>,
  ): Unsubscribe {
    this.getComments(noticeId)
      .then(comments => callbacks.onData(comments))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  subscribeToNotice(
    noticeId: string,
    callbacks: SubscriptionCallbacks<Notice | null>,
  ): Unsubscribe {
    this.getNotice(noticeId)
      .then(notice => callbacks.onData(notice))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  subscribeToNotices(
    category: string,
    limit: number,
    callbacks: SubscriptionCallbacks<NoticeListPage>,
  ): Unsubscribe {
    this.fetchNotices(category, limit, 0)
      .then(page => callbacks.onData(page))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  async toggleLike(noticeId: string, _userId: string): Promise<boolean> {
    const currentNotice = await this.requireNoticeDetail(noticeId);
    const response = currentNotice.isLiked
      ? await this.apiClient.unlikeNotice(noticeId)
      : await this.apiClient.likeNotice(noticeId);
    const nextLikeState = mapNoticeLikeResponseDto(response.data);
    this.noticeCache.set(noticeId, {
      ...currentNotice,
      isLiked: nextLikeState.isLiked,
      likeCount: nextLikeState.likeCount,
    });
    return nextLikeState.isLiked;
  }

  async toggleCommentLike(
    noticeId: string,
    commentId: string,
    _userId: string,
  ) {
    const currentComments =
      this.commentCache.get(noticeId) ?? (await this.getComments(noticeId));
    const targetComment = this.flattenComments(currentComments).find(
      comment => comment.id === commentId,
    );

    if (!targetComment) {
      throw new RepositoryError(
        RepositoryErrorCode.NOT_FOUND,
        '댓글을 찾을 수 없습니다.',
      );
    }

    const response = targetComment.isLiked
      ? await this.apiClient.unlikeComment(commentId)
      : await this.apiClient.likeComment(commentId);
    const nextLikeState = mapNoticeCommentLikeResponseDto(response.data);
    const nextComments = this.flattenComments(currentComments).map(comment =>
      comment.id === commentId
        ? {
            ...comment,
            isLiked: nextLikeState.isLiked,
            likeCount: nextLikeState.likeCount,
          }
        : comment,
    );

    this.commentCache.set(noticeId, buildCommentTree(nextComments));
    return nextLikeState;
  }

  async toggleBookmark(noticeId: string, _userId: string): Promise<boolean> {
    const currentNotice = await this.requireNoticeDetail(noticeId);
    const response = currentNotice.isBookmarked
      ? await this.apiClient.unbookmarkNotice(noticeId)
      : await this.apiClient.bookmarkNotice(noticeId);
    const nextBookmarkState = mapNoticeBookmarkResponseDto(response.data);
    this.noticeCache.set(noticeId, {
      ...currentNotice,
      bookmarkCount: nextBookmarkState.bookmarkCount,
      isBookmarked: nextBookmarkState.isBookmarked,
    });
    return nextBookmarkState.isBookmarked;
  }

  async updateComment(
    noticeId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void> {
    const response = await this.apiClient.updateComment(commentId, {
      content: content.trim(),
      ...(isAnonymous === undefined ? {} : {isAnonymous}),
    });
    const updatedComment = mapNoticeCommentDto(noticeId, response.data);
    const nextComments = this.flattenComments(
      this.commentCache.get(noticeId) ?? [],
    ).map(comment => (comment.id === commentId ? updatedComment : comment));

    this.commentCache.set(noticeId, buildCommentTree(nextComments));
  }

  private async fetchNotices(
    category: string,
    limit: number,
    page: number,
    search?: string,
  ): Promise<NoticeListPage> {
    const response = await this.apiClient.getNotices({
      category: category === '전체' ? undefined : category,
      page,
      search: search?.trim() || undefined,
      size: limit,
    });
    const pageData = response.data;
    const notices = pageData.content.map(summaryDto => {
      const notice = mapNoticeSummaryDto(summaryDto);
      const cachedNotice = this.noticeCache.get(notice.id);
      const mergedNotice: Notice = cachedNotice
        ? {
            ...cachedNotice,
            ...notice,
            contentAttachments:
              cachedNotice.contentAttachments.length > 0
                ? cachedNotice.contentAttachments
                : notice.contentAttachments,
            contentDetail: cachedNotice.contentDetail || notice.contentDetail,
            link: cachedNotice.link || notice.link,
            source: cachedNotice.source || notice.source,
          }
        : notice;
      this.noticeCache.set(mergedNotice.id, mergedNotice);
      return cloneNotice(mergedNotice);
    });

    return {
      cursor: pageData.hasNext
        ? ({page: page + 1} satisfies NoticePageCursor)
        : null,
      data: notices,
      hasMore: pageData.hasNext,
      totalElements: pageData.totalElements,
    };
  }

  private flattenComments(comments: NoticeCommentTreeNode[]): Comment[] {
    return comments.flatMap(comment => [
      cloneComment(comment),
      ...this.flattenComments(comment.replies),
    ]);
  }

  private async requireNoticeDetail(noticeId: string): Promise<Notice> {
    const cachedNotice = this.noticeCache.get(noticeId);
    if (
      cachedNotice &&
      (cachedNotice.link ||
        cachedNotice.contentDetail ||
        cachedNotice.contentAttachments.length > 0)
    ) {
      return cachedNotice;
    }

    const notice = await this.getNotice(noticeId);
    if (!notice) {
      throw new RepositoryError(
        RepositoryErrorCode.NOT_FOUND,
        '공지사항을 찾을 수 없습니다.',
      );
    }

    return notice;
  }

  private updateCachedNotice(
    noticeId: string,
    updater: (notice: Notice) => Notice,
  ) {
    const cachedNotice = this.noticeCache.get(noticeId);
    if (!cachedNotice) {
      return;
    }

    this.noticeCache.set(noticeId, updater(cachedNotice));
  }
}
