import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';
import type {PaginatedResult} from '@/shared/types/pagination';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';

import type {BoardComment, BoardImage, BoardPost} from '../../model/types';
import {boardApiClient, BoardApiClient} from '../api/boardApiClient';
import {
  mapBoardBookmarkResponseDto,
  mapBoardCategoryToDto,
  mapBoardCommentDto,
  mapBoardCommentLikeResponseDto,
  mapBoardImageUploadResponseDto,
  mapBoardLikeResponseDto,
  mapBoardPostDetailDto,
  mapBoardPostSummaryDto,
} from '../mappers/boardMapper';
import type {BoardPageResponseDto} from '../dto/boardDto';
import type {
  BoardCommentTreeNode,
  BoardFilterOptions,
  IBoardRepository,
} from './IBoardRepository';

interface BoardPageCursor {
  page: number;
}

const PAGE_CURSOR_FALLBACK: BoardPageCursor = {page: 0};

const cloneBoardImage = (image: BoardImage): BoardImage => ({
  ...image,
});

const clonePost = (post: BoardPost): BoardPost => ({
  ...post,
  createdAt: new Date(post.createdAt),
  images: post.images?.map(cloneBoardImage),
  updatedAt: new Date(post.updatedAt),
});

const cloneComment = (comment: BoardComment): BoardComment => ({
  ...comment,
  createdAt: new Date(comment.createdAt),
  updatedAt: new Date(comment.updatedAt),
});

const cloneCommentTree = (
  comments: BoardCommentTreeNode[],
): BoardCommentTreeNode[] =>
  comments.map(comment => ({
    ...cloneComment(comment),
    replies: cloneCommentTree(comment.replies),
  }));

const buildCommentTree = (comments: BoardComment[]): BoardCommentTreeNode[] => {
  const roots: BoardCommentTreeNode[] = [];
  const nodeById = new Map<string, BoardCommentTreeNode>();

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

const extractCursor = (cursor: unknown): BoardPageCursor => {
  if (
    cursor &&
    typeof cursor === 'object' &&
    typeof (cursor as BoardPageCursor).page === 'number'
  ) {
    return cursor as BoardPageCursor;
  }

  return PAGE_CURSOR_FALLBACK;
};

const mergeSummaryPost = (
  summary: BoardPost,
  cached?: BoardPost,
): BoardPost => {
  if (!cached) {
    return summary;
  }

  return {
    ...summary,
    images: cached.images,
    isAuthor: cached.isAuthor,
    isBookmarked: cached.isBookmarked ?? summary.isBookmarked,
    isCommentedByMe: cached.isCommentedByMe ?? summary.isCommentedByMe,
    isLiked: cached.isLiked ?? summary.isLiked,
    updatedAt: cached.updatedAt,
  };
};

const toPaginatedResult = (
  page: BoardPageResponseDto<unknown>,
  data: BoardPost[],
  currentPage: number,
): PaginatedResult<BoardPost> => ({
  cursor: page.hasNext
    ? ({page: currentPage + 1} satisfies BoardPageCursor)
    : null,
  data,
  hasMore: page.hasNext,
});

const toUpdatePostRequest = (updates: Partial<BoardPost>) => {
  const request = {
    category: mapBoardCategoryToDto(updates.category),
    content: updates.content?.trim(),
    images: updates.images?.map(image => ({
      height: image.height,
      mime: image.mime,
      size: image.size,
      thumbUrl: image.thumbUrl,
      url: image.url,
      width: image.width,
    })),
    isAnonymous: updates.isAnonymous,
    title: updates.title?.trim(),
  };

  if (
    !request.category &&
    !request.content &&
    !request.title &&
    request.isAnonymous === undefined &&
    request.images === undefined
  ) {
    return null;
  }

  return request;
};

export class SpringBoardRepository implements IBoardRepository {
  private readonly commentCache = new Map<string, BoardCommentTreeNode[]>();

  private readonly postCache = new Map<string, BoardPost>();

  constructor(private readonly apiClient: BoardApiClient = boardApiClient) {}

  async createComment(
    postId: string,
    comment: Omit<BoardComment, 'id' | 'postId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const response = await this.apiClient.createComment(postId, {
      content: comment.content.trim(),
      isAnonymous: Boolean(comment.isAnonymous),
      parentId: comment.parentId,
    });
    const createdComment = mapBoardCommentDto(postId, response.data);
    const nextComments = [
      ...this.flattenComments(this.commentCache.get(postId) ?? []),
      createdComment,
    ];
    this.commentCache.set(postId, buildCommentTree(nextComments));
    this.updateCachedPost(postId, cachedPost => ({
      ...cachedPost,
      commentCount: cachedPost.commentCount + 1,
    }));
    return createdComment.id;
  }

  async createPost(
    post: Omit<
      BoardPost,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'viewCount'
      | 'likeCount'
      | 'commentCount'
      | 'bookmarkCount'
    >,
  ): Promise<string> {
    const response = await this.apiClient.createPost({
      category: mapBoardCategoryToDto(post.category)!,
      content: post.content,
      images: (post.images ?? []).map(image => ({
        height: image.height,
        mime: image.mime,
        size: image.size,
        thumbUrl: image.thumbUrl,
        url: image.url,
        width: image.width,
      })),
      isAnonymous: Boolean(post.isAnonymous),
      title: post.title,
    });
    const createdPost = mapBoardPostDetailDto(response.data);
    this.postCache.set(createdPost.id, createdPost);
    return createdPost.id;
  }

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await this.apiClient.deleteComment(commentId);
    const nextComments = await this.getComments(postId);
    this.commentCache.set(postId, nextComments);
    this.updateCachedPost(postId, cachedPost => ({
      ...cachedPost,
      commentCount: Math.max(0, cachedPost.commentCount - 1),
    }));
  }

  async deleteImage(_imageUrl: string): Promise<void> {}

  async deletePost(postId: string): Promise<void> {
    await this.apiClient.deletePost(postId);
    this.commentCache.delete(postId);
    this.postCache.delete(postId);
  }

  async getCategoryCounts(
    categories: string[],
  ): Promise<Record<string, number>> {
    const entries = await Promise.all(
      categories.map(async category => {
        const response = await this.apiClient.getPosts({
          category: mapBoardCategoryToDto(category),
          page: 0,
          size: 1,
        });

        return [category, response.data.totalElements] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  async getComments(postId: string): Promise<BoardCommentTreeNode[]> {
    const response = await this.apiClient.getComments(postId);
    const comments = response.data.map(comment =>
      mapBoardCommentDto(postId, comment),
    );
    const tree = buildCommentTree(comments);
    this.commentCache.set(postId, tree);
    return cloneCommentTree(tree);
  }

  async getMorePosts(
    filters: BoardFilterOptions,
    cursor: unknown,
    limit: number,
  ): Promise<PaginatedResult<BoardPost>> {
    return this.fetchPosts(filters, limit, extractCursor(cursor).page);
  }

  async getPost(postId: string): Promise<BoardPost | null> {
    try {
      const response = await this.apiClient.getPost(postId);
      const post = mapBoardPostDetailDto(response.data);
      this.postCache.set(post.id, post);
      return clonePost(post);
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

  async getPosts(
    filters: BoardFilterOptions,
    limit: number,
  ): Promise<PaginatedResult<BoardPost>> {
    return this.fetchPosts(filters, limit, 0);
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.getPost(postId);
  }

  async isBookmarked(postId: string, _userId: string): Promise<boolean> {
    const post = await this.requirePostDetail(postId);
    return Boolean(post.isBookmarked);
  }

  async isLiked(postId: string, _userId: string): Promise<boolean> {
    const post = await this.requirePostDetail(postId);
    return Boolean(post.isLiked);
  }

  subscribeToComments(
    postId: string,
    callbacks: SubscriptionCallbacks<BoardCommentTreeNode[]>,
  ): Unsubscribe {
    this.getComments(postId)
      .then(comments => callbacks.onData(comments))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  subscribeToPost(
    postId: string,
    callbacks: SubscriptionCallbacks<BoardPost | null>,
  ): Unsubscribe {
    this.getPost(postId)
      .then(post => callbacks.onData(post))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  subscribeToPosts(
    filters: BoardFilterOptions,
    limit: number,
    callbacks: SubscriptionCallbacks<BoardPost[]>,
  ): Unsubscribe {
    this.getPosts(filters, limit)
      .then(result => callbacks.onData(result.data))
      .catch(error => callbacks.onError(error as Error));

    return () => {};
  }

  async toggleBookmark(postId: string, _userId: string): Promise<boolean> {
    const currentPost = await this.requirePostDetail(postId);
    const response = currentPost.isBookmarked
      ? await this.apiClient.unbookmarkPost(postId)
      : await this.apiClient.bookmarkPost(postId);
    const nextBookmarkState = mapBoardBookmarkResponseDto(response.data);
    const nextPost: BoardPost = {
      ...currentPost,
      bookmarkCount: nextBookmarkState.bookmarkCount,
      isBookmarked: nextBookmarkState.isBookmarked,
    };

    this.postCache.set(postId, nextPost);
    return nextBookmarkState.isBookmarked;
  }

  async toggleLike(postId: string, _userId: string): Promise<boolean> {
    const currentPost = await this.requirePostDetail(postId);
    const response = currentPost.isLiked
      ? await this.apiClient.unlikePost(postId)
      : await this.apiClient.likePost(postId);
    const nextLikeState = mapBoardLikeResponseDto(response.data);
    const nextPost: BoardPost = {
      ...currentPost,
      isLiked: nextLikeState.isLiked,
      likeCount: nextLikeState.likeCount,
    };

    this.postCache.set(postId, nextPost);
    return nextLikeState.isLiked;
  }

  async toggleCommentLike(
    postId: string,
    commentId: string,
    _userId: string,
  ) {
    const currentComments =
      this.commentCache.get(postId) ?? (await this.getComments(postId));
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
    const nextLikeState = mapBoardCommentLikeResponseDto(response.data);
    const nextComments = this.flattenComments(currentComments).map(comment =>
      comment.id === commentId
        ? {
            ...comment,
            isLiked: nextLikeState.isLiked,
            likeCount: nextLikeState.likeCount,
          }
        : comment,
    );

    this.commentCache.set(postId, buildCommentTree(nextComments));
    return nextLikeState;
  }

  async updateComment(
    postId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void> {
    const response = await this.apiClient.updateComment(commentId, {
      content: content.trim(),
      ...(isAnonymous === undefined ? {} : {isAnonymous}),
    });
    const updatedComment = mapBoardCommentDto(postId, response.data);

    const nextComments = this.flattenComments(
      this.commentCache.get(postId) ?? [],
    ).map(comment => (comment.id === commentId ? updatedComment : comment));

    this.commentCache.set(postId, buildCommentTree(nextComments));
  }

  async updatePost(postId: string, updates: Partial<BoardPost>): Promise<void> {
    const request = toUpdatePostRequest(updates);

    if (!request) {
      return;
    }

    const response = await this.apiClient.updatePost(postId, request);
    const updatedPost = mapBoardPostDetailDto(response.data);
    this.postCache.set(postId, updatedPost);
  }

  async uploadImage(uri: string, _postId?: string): Promise<BoardImage> {
    const response = await this.apiClient.uploadPostImage(uri);
    return mapBoardImageUploadResponseDto(response.data);
  }

  private async fetchPosts(
    filters: BoardFilterOptions,
    limit: number,
    page: number,
  ): Promise<PaginatedResult<BoardPost>> {
    const response = await this.apiClient.getPosts({
      authorId: filters.authorId,
      category: mapBoardCategoryToDto(filters.category),
      page,
      search: filters.searchText?.trim() || undefined,
      size: limit,
      sort: filters.sortBy,
    });

    const posts = response.data.content.map(summaryDto => {
      const summaryPost = mapBoardPostSummaryDto(summaryDto);
      const mergedPost = mergeSummaryPost(
        summaryPost,
        this.postCache.get(summaryPost.id),
      );
      this.postCache.set(mergedPost.id, mergedPost);
      return clonePost(mergedPost);
    });

    return toPaginatedResult(response.data, posts, page);
  }

  private flattenComments(comments: BoardCommentTreeNode[]): BoardComment[] {
    return comments.flatMap(comment => [
      cloneComment(comment),
      ...this.flattenComments(comment.replies),
    ]);
  }

  private async requirePostDetail(postId: string): Promise<BoardPost> {
    const cachedPost = this.postCache.get(postId);

    if (
      cachedPost &&
      (cachedPost.isAuthor !== undefined ||
        cachedPost.isLiked !== undefined ||
        cachedPost.isBookmarked !== undefined)
    ) {
      return cachedPost;
    }

    const post = await this.getPost(postId);
    if (!post) {
      throw new RepositoryError(
        RepositoryErrorCode.NOT_FOUND,
        '게시글을 찾을 수 없습니다.',
      );
    }

    return post;
  }

  private updateCachedPost(
    postId: string,
    updater: (post: BoardPost) => BoardPost,
  ) {
    const cachedPost = this.postCache.get(postId);
    if (!cachedPost) {
      return;
    }

    this.postCache.set(postId, updater(cachedPost));
  }
}
