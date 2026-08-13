import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  BOARD_DETAIL_READ_INVALIDATION_KEYS,
  BOARD_MUTATION_INVALIDATION_KEYS,
} from '@/app/data-freshness/invalidationKeys';
import {useAuth} from '@/features/auth';
import {useCommentAnonymousPreference} from '@/shared/hooks';
import {
  flattenVisibleCommentTree,
  type FlattenedCommentTreeEntry,
} from '@/shared/lib/comments';
import {
  formatKoreanAbsoluteWithRelativeTime,
  formatKoreanCompactDateTime,
} from '@/shared/lib/date';
import type {
  ContentDetailCommentViewData,
  ContentDetailViewData,
} from '@/shared/types/contentDetailViewData';

import type {BoardCommentTreeNode} from '../data/repositories/IBoardRepository';
import type {BoardComment, BoardPost} from '../model/types';
import {useBoardRepository} from './useBoardRepository';

const CATEGORY_LABEL_MAP: Record<BoardPost['category'], string> = {
  announcement: '정보게시판',
  general: '자유게시판',
  question: '질문게시판',
  review: '후기게시판',
};

const splitParagraphs = (content: string) =>
  content
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

const formatViewCountLabel = (value: number) => value.toLocaleString('ko-KR');

const countComments = (comments: BoardCommentTreeNode[]) =>
  flattenVisibleCommentTree(comments).length;

const getCommentAuthorLabel = (comment: BoardComment) => {
  if (!comment.isAnonymous) {
    return comment.authorName;
  }

  return `익명${comment.anonymousOrder ?? ''}`;
};

const getReplyTargetLabel = (comment: BoardComment) => {
  if (comment.isDeleted) {
    return '삭제된 댓글/답글에 답글';
  }

  return `${getCommentAuthorLabel(comment)} 님에게 답글`;
};

const updateCommentTree = (
  comments: BoardCommentTreeNode[],
  commentId: string,
  updater: (comment: BoardCommentTreeNode) => BoardCommentTreeNode,
): BoardCommentTreeNode[] =>
  comments.map(comment => {
    const nextComment =
      comment.id === commentId ? updater(comment) : comment;

    return {
      ...nextComment,
      replies: updateCommentTree(nextComment.replies, commentId, updater),
    };
  });

export interface BoardDetailCommentItem extends ContentDetailCommentViewData {
  isEditable: boolean;
}

const toCommentItems = (
  comments: FlattenedCommentTreeEntry<BoardCommentTreeNode>[],
): BoardDetailCommentItem[] =>
  comments.map(({comment, parent}) => ({
    authorLabel: getCommentAuthorLabel(comment),
    body: comment.content,
    dateLabel: formatKoreanCompactDateTime(comment.createdAt),
    id: comment.id,
    isDeleted: Boolean(comment.isDeleted),
    isEditable: Boolean(comment.isAuthor && !comment.isDeleted),
    isLiked: Boolean(comment.isLiked),
    isMine: Boolean(comment.isAuthor),
    isPostAuthor: Boolean(comment.isPostAuthor),
    isReply: Boolean(comment.parentId),
    likeCount: comment.likeCount,
    replyTargetLabel: parent ? getReplyTargetLabel(parent) : undefined,
  }));

const toViewData = (
  post: BoardPost,
  comments: BoardDetailCommentItem[],
): ContentDetailViewData => ({
  authorLabel: post.isAnonymous ? '익명' : post.authorName,
  bodyBlocks: [
    ...splitParagraphs(post.content).map((paragraph, index) => ({
      id: `${post.id}-paragraph-${index + 1}`,
      text: paragraph,
      type: 'paragraph' as const,
    })),
    ...(post.images ?? []).map((image, index) => ({
      aspectRatio:
        image.width && image.height ? image.width / image.height : undefined,
      id: `${post.id}-image-${index + 1}`,
      imageUrl: image.url,
      type: 'image' as const,
    })),
  ],
  commentInputPlaceholder: '댓글을 입력하세요...',
  comments,
  dateLabel: formatKoreanAbsoluteWithRelativeTime(post.createdAt),
  emptyCommentsLabel: '첫 댓글을 남겨보세요!',
  metaBadges: [
    {
      id: `${post.id}-category`,
      label: CATEGORY_LABEL_MAP[post.category],
      tone: 'gray',
    },
  ],
  reactions: [
    {
      count: post.likeCount,
      iconName: post.isLiked ? 'heart' : 'heart-outline',
      id: `${post.id}-likes`,
    },
    {
      count: post.bookmarkCount,
      iconName: post.isBookmarked ? 'bookmark' : 'bookmark-outline',
      id: `${post.id}-bookmarks`,
    },
  ],
  title: post.title,
  viewCountLabel: formatViewCountLabel(post.viewCount),
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '게시물을 다시 불러와주세요.';
};

export const useBoardDetailData = (postId?: string) => {
  const {user} = useAuth();
  const boardRepository = useBoardRepository();
  const {
    isAnonymous: isCommentAnonymousPreferred,
    toggleAnonymousPreference: toggleStoredAnonymousPreference,
  } = useCommentAnonymousPreference();
  const [post, setPost] = React.useState<BoardPost | null>(null);
  const [comments, setComments] = React.useState<BoardCommentTreeNode[]>([]);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [togglingLike, setTogglingLike] = React.useState(false);
  const [togglingBookmark, setTogglingBookmark] = React.useState(false);
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [deletingPost, setDeletingPost] = React.useState(false);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(
    null,
  );
  const [replyTargetCommentId, setReplyTargetCommentId] = React.useState<
    string | null
  >(null);
  const [commentAnonymousDraft, setCommentAnonymousDraft] = React.useState<
    boolean | null
  >(null);
  const [commentLikePendingIds, setCommentLikePendingIds] = React.useState<
    string[]
  >([]);
  const requestIdRef = React.useRef(0);
  const lastInvalidatedLoadedPostIdRef = React.useRef<string | null>(null);
  const flattenedCommentEntries = React.useMemo(
    () => flattenVisibleCommentTree(comments),
    [comments],
  );
  const commentItems = React.useMemo(
    () => toCommentItems(flattenedCommentEntries),
    [flattenedCommentEntries],
  );
  const replyTargetComment = React.useMemo(
    () =>
      flattenedCommentEntries.find(
        entry => entry.comment.id === replyTargetCommentId,
      )?.comment ?? null,
    [flattenedCommentEntries, replyTargetCommentId],
  );
  const replyTargetLabel = React.useMemo(
    () => (replyTargetComment ? getReplyTargetLabel(replyTargetComment) : null),
    [replyTargetComment],
  );
  const editingComment = React.useMemo(
    () =>
      flattenedCommentEntries.find(
        entry => entry.comment.id === editingCommentId,
      )?.comment ?? null,
    [editingCommentId, flattenedCommentEntries],
  );
  const commentAnonymousValue =
    commentAnonymousDraft ?? isCommentAnonymousPreferred;
  const commentAnonymousDisabled = submittingComment;

  const refreshComments = React.useCallback(async () => {
    if (!postId) {
      setComments([]);
      return [];
    }

    const nextComments = await boardRepository.getComments(postId);
    setComments(nextComments);
    setPost(currentPost =>
      currentPost
        ? {
            ...currentPost,
            commentCount: countComments(nextComments),
          }
        : currentPost,
    );

    return nextComments;
  }, [boardRepository, postId]);

  const loadDetail = React.useCallback(async () => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setLoading(true);

    try {
      if (!postId) {
        setPost(null);
        setComments([]);
        setNotFound(true);
        setError(null);
        return;
      }

      const [nextPost, nextComments] = await Promise.all([
        boardRepository.getPost(postId),
        boardRepository.getComments(postId),
      ]);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (!nextPost) {
        setPost(null);
        setComments([]);
        setNotFound(true);
        setError(null);
        return;
      }

      setPost(nextPost);
      setComments(nextComments);
      setNotFound(false);
      setError(null);
    } catch (loadError) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setError(getErrorMessage(loadError));
      setNotFound(false);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [boardRepository, postId]);

  React.useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  React.useEffect(() => {
    if (!postId || !post || lastInvalidatedLoadedPostIdRef.current === postId) {
      return;
    }

    lastInvalidatedLoadedPostIdRef.current = postId;
    invalidateData(BOARD_DETAIL_READ_INVALIDATION_KEYS);
  }, [post, postId]);

  React.useEffect(() => {
    setCommentDraft('');
    setEditingCommentId(null);
    setReplyTargetCommentId(null);
    setCommentAnonymousDraft(null);
  }, [postId]);

  const canManageActions = React.useMemo(() => {
    if (!post) {
      return false;
    }

    return Boolean(post.isAuthor ?? (user?.uid && post.authorId === user.uid));
  }, [post, user?.uid]);

  const toggleCommentLike = React.useCallback(
    async (commentId: string) => {
      if (!postId || !user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      if (commentLikePendingIds.includes(commentId)) {
        return;
      }

      const targetComment = flattenedCommentEntries.find(
        entry => entry.comment.id === commentId,
      )?.comment;

      if (!targetComment) {
        throw new Error('댓글을 찾을 수 없습니다.');
      }

      const previousLikeState = {
        isLiked: Boolean(targetComment.isLiked),
        likeCount: targetComment.likeCount,
      };
      const optimisticLikeState = {
        isLiked: !previousLikeState.isLiked,
        likeCount: Math.max(
          0,
          previousLikeState.likeCount + (!previousLikeState.isLiked ? 1 : -1),
        ),
      };

      setComments(currentComments =>
        updateCommentTree(currentComments, commentId, comment => ({
          ...comment,
          isLiked: optimisticLikeState.isLiked,
          likeCount: optimisticLikeState.likeCount,
        })),
      );

      setCommentLikePendingIds(currentIds => [...currentIds, commentId]);

      try {
        const nextLikeState = await boardRepository.toggleCommentLike(
          postId,
          commentId,
          user.uid,
        );

        setComments(currentComments =>
          updateCommentTree(currentComments, commentId, comment => ({
            ...comment,
            isLiked: nextLikeState.isLiked,
            likeCount: nextLikeState.likeCount,
          })),
        );

        return nextLikeState;
      } catch (toggleError) {
        setComments(currentComments =>
          updateCommentTree(currentComments, commentId, comment => ({
            ...comment,
            isLiked: previousLikeState.isLiked,
            likeCount: previousLikeState.likeCount,
          })),
        );
        throw toggleError;
      } finally {
        setCommentLikePendingIds(currentIds =>
          currentIds.filter(currentId => currentId !== commentId),
        );
      }
    },
    [
      boardRepository,
      commentLikePendingIds,
      flattenedCommentEntries,
      postId,
      user?.uid,
    ],
  );

  const toggleLike = React.useCallback(async () => {
    if (!postId || !user?.uid || togglingLike || !post) {
      throw new Error('로그인이 필요합니다.');
    }

    const previousLikeState = {
      isLiked: Boolean(post.isLiked),
      likeCount: post.likeCount,
    };
    const optimisticLikeState = {
      isLiked: !previousLikeState.isLiked,
      likeCount: Math.max(
        0,
        previousLikeState.likeCount + (!previousLikeState.isLiked ? 1 : -1),
      ),
    };

    setPost(currentPost =>
      currentPost
        ? {
            ...currentPost,
            isLiked: optimisticLikeState.isLiked,
            likeCount: optimisticLikeState.likeCount,
          }
        : currentPost,
    );

    setTogglingLike(true);

    try {
      const nextIsLiked = await boardRepository.toggleLike(postId, user.uid);
      const nextLikeCount = Math.max(
        0,
        previousLikeState.likeCount + (nextIsLiked ? 1 : -1),
      );

      setPost(currentPost =>
        currentPost
          ? {
              ...currentPost,
              isLiked: nextIsLiked,
              likeCount: nextLikeCount,
            }
          : currentPost,
      );
      invalidateData(BOARD_MUTATION_INVALIDATION_KEYS);
    } catch (toggleError) {
      setPost(currentPost =>
        currentPost
          ? {
              ...currentPost,
              isLiked: previousLikeState.isLiked,
              likeCount: previousLikeState.likeCount,
            }
          : currentPost,
      );
      throw toggleError;
    } finally {
      setTogglingLike(false);
    }
  }, [boardRepository, post, postId, togglingLike, user?.uid]);

  const toggleBookmark = React.useCallback(async () => {
    if (!postId || !user?.uid || togglingBookmark || !post) {
      throw new Error('로그인이 필요합니다.');
    }

    const previousBookmarkState = {
      bookmarkCount: post.bookmarkCount,
      isBookmarked: Boolean(post.isBookmarked),
    };
    const optimisticBookmarkState = {
      bookmarkCount: Math.max(
        0,
        previousBookmarkState.bookmarkCount +
          (!previousBookmarkState.isBookmarked ? 1 : -1),
      ),
      isBookmarked: !previousBookmarkState.isBookmarked,
    };

    setPost(currentPost =>
      currentPost
        ? {
            ...currentPost,
            bookmarkCount: optimisticBookmarkState.bookmarkCount,
            isBookmarked: optimisticBookmarkState.isBookmarked,
          }
        : currentPost,
    );

    setTogglingBookmark(true);

    try {
      const nextIsBookmarked = await boardRepository.toggleBookmark(
        postId,
        user.uid,
      );
      const nextBookmarkCount = Math.max(
        0,
        previousBookmarkState.bookmarkCount + (nextIsBookmarked ? 1 : -1),
      );

      setPost(currentPost =>
        currentPost
          ? {
              ...currentPost,
              bookmarkCount: nextBookmarkCount,
              isBookmarked: nextIsBookmarked,
            }
          : currentPost,
      );
      invalidateData(BOARD_MUTATION_INVALIDATION_KEYS);
    } catch (toggleError) {
      setPost(currentPost =>
        currentPost
          ? {
              ...currentPost,
              bookmarkCount: previousBookmarkState.bookmarkCount,
              isBookmarked: previousBookmarkState.isBookmarked,
            }
          : currentPost,
      );
      throw toggleError;
    } finally {
      setTogglingBookmark(false);
    }
  }, [boardRepository, post, postId, togglingBookmark, user?.uid]);

  const submitComment = React.useCallback(async () => {
    if (!postId || !user?.uid) {
      throw new Error('로그인이 필요합니다.');
    }

    const trimmedComment = commentDraft.trim();
    if (!trimmedComment) {
      throw new Error('댓글 내용을 입력해주세요.');
    }

    setSubmittingComment(true);

    try {
      let targetCommentId = editingCommentId;

      if (editingCommentId) {
        await boardRepository.updateComment(
          postId,
          editingCommentId,
          trimmedComment,
          commentAnonymousValue,
        );
      } else {
        targetCommentId = await boardRepository.createComment(postId, {
          anonId: null,
          authorId: user.uid,
          authorName: user.displayName ?? '익명',
          authorProfileImage: user.photoURL ?? null,
          content: trimmedComment,
          isAnonymous: isCommentAnonymousPreferred,
          isAuthor: true,
          isDeleted: false,
          isLiked: false,
          isPostAuthor: false,
          likeCount: 0,
          parentId: replyTargetCommentId,
        });
      }

      await refreshComments();
      setCommentDraft('');
      setEditingCommentId(null);
      setReplyTargetCommentId(null);
      setCommentAnonymousDraft(null);
      invalidateData(BOARD_MUTATION_INVALIDATION_KEYS);

      return {
        commentId: targetCommentId,
      };
    } finally {
      setSubmittingComment(false);
    }
  }, [
    boardRepository,
    commentDraft,
    editingCommentId,
    commentAnonymousValue,
    isCommentAnonymousPreferred,
    postId,
    refreshComments,
    replyTargetCommentId,
    user,
  ]);

  const startEditingComment = React.useCallback(
    (commentId: string) => {
      const targetComment = flattenedCommentEntries.find(
        entry => entry.comment.id === commentId,
      )?.comment;

      if (!targetComment || !targetComment.isAuthor || targetComment.isDeleted) {
        return;
      }

      setEditingCommentId(commentId);
      setReplyTargetCommentId(null);
      setCommentDraft(targetComment.content);
      setCommentAnonymousDraft(Boolean(targetComment.isAnonymous));
    },
    [flattenedCommentEntries],
  );

  const startReplyingComment = React.useCallback(
    (commentId: string) => {
      const targetComment = flattenedCommentEntries.find(
        entry => entry.comment.id === commentId,
      )?.comment;

      if (!targetComment || targetComment.isDeleted) {
        return;
      }

      setEditingCommentId(null);
      setReplyTargetCommentId(commentId);
      setCommentDraft('');
      setCommentAnonymousDraft(null);
    },
    [flattenedCommentEntries],
  );

  const cancelCommentEdit = React.useCallback(() => {
    setEditingCommentId(null);
    setCommentDraft('');
    setCommentAnonymousDraft(null);
  }, []);

  const cancelCommentReply = React.useCallback(() => {
    setReplyTargetCommentId(null);
    setCommentDraft('');
    setCommentAnonymousDraft(null);
  }, []);

  const toggleCommentAnonymousPreference = React.useCallback(() => {
    if (editingCommentId) {
      setCommentAnonymousDraft(currentValue => {
        const resolvedValue =
          currentValue ?? Boolean(editingComment?.isAnonymous);
        return !resolvedValue;
      });
      return;
    }

    toggleStoredAnonymousPreference();
  }, [editingComment?.isAnonymous, editingCommentId, toggleStoredAnonymousPreference]);

  const deleteComment = React.useCallback(
    async (commentId: string) => {
      if (!postId || !user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      await boardRepository.deleteComment(postId, commentId);
      await refreshComments();

      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setCommentDraft('');
        setCommentAnonymousDraft(null);
      }

      if (replyTargetCommentId === commentId) {
        setReplyTargetCommentId(null);
        setCommentDraft('');
        setCommentAnonymousDraft(null);
      }

      invalidateData(BOARD_MUTATION_INVALIDATION_KEYS);
    },
    [
      boardRepository,
      editingCommentId,
      postId,
      refreshComments,
      replyTargetCommentId,
      user?.uid,
    ],
  );

  const deletePost = React.useCallback(async () => {
    if (!postId) {
      throw new Error('게시글 정보를 찾을 수 없습니다.');
    }

    setDeletingPost(true);

    try {
      await boardRepository.deletePost(postId);
      invalidateData(BOARD_MUTATION_INVALIDATION_KEYS);
    } finally {
      setDeletingPost(false);
    }
  }, [boardRepository, postId]);

  const data = React.useMemo(
    () => (post ? toViewData(post, commentItems) : null),
    [commentItems, post],
  );

  return {
    cancelCommentEdit,
    cancelCommentReply,
    canManageActions,
    commentAnonymousDisabled,
    commentAnonymousValue,
    commentDraft,
    commentLikePendingIds,
    commentItems,
    data,
    deleteComment,
    deletePost,
    deletingPost,
    editingCommentId,
    error,
    isEditingComment: Boolean(editingCommentId),
    isReplyingComment: Boolean(replyTargetCommentId),
    loading,
    notFound,
    post,
    reload: loadDetail,
    replyTargetLabel,
    setCommentDraft,
    startEditingComment,
    startReplyingComment,
    submitComment,
    submittingComment,
    toggleCommentAnonymousPreference,
    toggleCommentLike,
    toggleBookmark,
    toggleLike,
    togglingBookmark,
    togglingLike,
  };
};
