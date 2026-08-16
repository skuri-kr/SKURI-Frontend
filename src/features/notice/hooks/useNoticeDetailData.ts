import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  NOTICE_BOOKMARK_INVALIDATION_KEYS,
  NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS,
  NOTICE_MUTATION_INVALIDATION_KEYS,
  NOTICE_READ_STATUS_INVALIDATION_KEYS,
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

import {buildNoticeBodyBlocks} from '../model/noticeBodyBlocks';
import type {Notice, NoticeCommentTreeNode} from '../model/types';
import {
  getNoticeCategoryDisplayLabel,
  getNoticeCategoryTone,
} from '../utils/noticePresentation';
import {useNoticeRepository} from './useNoticeRepository';

const RECENT_NOTICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const countComments = (comments: NoticeCommentTreeNode[]) =>
  flattenVisibleCommentTree(comments).length;

const formatViewCountLabel = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('ko-KR') : undefined;

const isRecentNotice = (postedAt: unknown) => {
  const millis = new Date(String(postedAt)).getTime();

  return (
    Number.isFinite(millis) && Date.now() - millis <= RECENT_NOTICE_WINDOW_MS
  );
};

const getCommentAuthorLabel = (comment: NoticeCommentTreeNode) => {
  if (!comment.isAnonymous) {
    return comment.userDisplayName;
  }

  return `익명${comment.anonymousOrder ?? ''}`;
};

const getReplyTargetLabel = (comment: NoticeCommentTreeNode) => {
  if (comment.isDeleted) {
    return '삭제된 댓글/답글에 답글';
  }

  return `${getCommentAuthorLabel(comment)} 님에게 답글`;
};

const updateCommentTree = (
  comments: NoticeCommentTreeNode[],
  commentId: string,
  updater: (comment: NoticeCommentTreeNode) => NoticeCommentTreeNode,
): NoticeCommentTreeNode[] =>
  comments.map(comment => {
    const nextComment = comment.id === commentId ? updater(comment) : comment;

    return {
      ...nextComment,
      replies: updateCommentTree(nextComment.replies, commentId, updater),
    };
  });

export interface NoticeDetailCommentItem extends ContentDetailCommentViewData {
  isEditable: boolean;
}

const toCommentItems = (
  comments: FlattenedCommentTreeEntry<NoticeCommentTreeNode>[],
): NoticeDetailCommentItem[] =>
  comments.map(({comment, parent}) => ({
    authorLabel: getCommentAuthorLabel(comment),
    body: comment.content,
    dateLabel: formatKoreanCompactDateTime(comment.createdAt),
    id: comment.id,
    isDeleted: Boolean(comment.isDeleted),
    isEditable: Boolean(comment.isAuthor && !comment.isDeleted),
    isLiked: Boolean(comment.isLiked),
    isMine: Boolean(comment.isAuthor),
    isReply: Boolean(comment.parentId),
    likeCount: comment.likeCount ?? 0,
    replyTargetLabel: parent ? getReplyTargetLabel(parent) : undefined,
  }));

const toViewData = (
  notice: Notice,
  comments: NoticeDetailCommentItem[],
): ContentDetailViewData => {
  const categoryLabel = getNoticeCategoryDisplayLabel(notice.category);

  return {
    authorLabel: notice.author,
    attachments: notice.contentAttachments.map((attachment, index) => ({
      fileName: attachment.name,
      id: `${notice.id}-attachment-${index + 1}`,
      sizeLabel: '첨부파일',
    })),
    bodyBlocks: buildNoticeBodyBlocks(notice),
    commentInputPlaceholder: '댓글을 입력하세요...',
    comments,
    dateLabel: formatKoreanAbsoluteWithRelativeTime(notice.postedAt),
    emptyCommentsLabel: '첫 댓글을 남겨보세요!',
    metaBadges: [
      {
        id: `${notice.id}-category`,
        label: categoryLabel,
        tone: getNoticeCategoryTone(categoryLabel),
      },
      ...(isRecentNotice(notice.postedAt)
        ? [
            {
              id: `${notice.id}-new`,
              label: 'NEW',
              tone: 'green' as const,
            },
          ]
        : []),
    ],
    reactions: [
      {
        count: notice.likeCount ?? 0,
        iconName: notice.isLiked ? 'heart' : 'heart-outline',
        id: `${notice.id}-likes`,
      },
    ],
    title: notice.title,
    viewCountLabel: formatViewCountLabel(notice.viewCount),
  };
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '공지사항을 다시 불러와주세요.';
};

export const useNoticeDetailData = (noticeId?: string) => {
  const {user} = useAuth();
  const noticeRepository = useNoticeRepository();
  const {
    isAnonymous: isCommentAnonymousPreferred,
    toggleAnonymousPreference: toggleStoredAnonymousPreference,
  } = useCommentAnonymousPreference();
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [comments, setComments] = React.useState<NoticeCommentTreeNode[]>([]);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [togglingLike, setTogglingLike] = React.useState(false);
  const [togglingBookmark, setTogglingBookmark] = React.useState(false);
  const [submittingComment, setSubmittingComment] = React.useState(false);
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
  const lastInvalidatedLoadedNoticeIdRef = React.useRef<string | null>(null);
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
    if (!noticeId) {
      setComments([]);
      return [];
    }

    const nextComments = await noticeRepository.getComments(noticeId);
    setComments(nextComments);
    setNotice(currentNotice =>
      currentNotice
        ? {
            ...currentNotice,
            commentCount: countComments(nextComments),
          }
        : currentNotice,
    );

    return nextComments;
  }, [noticeId, noticeRepository]);

  const loadDetail = React.useCallback(async () => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setLoading(true);

    try {
      if (!noticeId) {
        setNotice(null);
        setComments([]);
        setNotFound(true);
        setError(null);
        return;
      }

      const [nextNotice, nextComments] = await Promise.all([
        noticeRepository.getNotice(noticeId),
        noticeRepository.getComments(noticeId),
      ]);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (!nextNotice) {
        setNotice(null);
        setComments([]);
        setNotFound(true);
        setError(null);
        return;
      }

      setNotice(nextNotice);
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
  }, [noticeId, noticeRepository]);

  React.useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  React.useEffect(() => {
    if (
      !noticeId ||
      !notice ||
      lastInvalidatedLoadedNoticeIdRef.current === noticeId
    ) {
      return;
    }

    lastInvalidatedLoadedNoticeIdRef.current = noticeId;
    invalidateData(NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS);
  }, [notice, noticeId]);

  React.useEffect(() => {
    setCommentDraft('');
    setEditingCommentId(null);
    setReplyTargetCommentId(null);
    setCommentAnonymousDraft(null);
  }, [noticeId]);

  React.useEffect(() => {
    if (!noticeId || !user?.uid || !notice || notice.isRead) {
      return;
    }

    noticeRepository
      .markAsRead(user.uid, noticeId)
      .then(() => {
        setNotice(currentNotice =>
          currentNotice
            ? {
                ...currentNotice,
                isRead: true,
              }
            : currentNotice,
        );
        invalidateData(NOTICE_READ_STATUS_INVALIDATION_KEYS);
      })
      .catch(markError => {
        console.error('공지사항 읽음 처리 실패:', markError);
      });
  }, [notice, noticeId, noticeRepository, user?.uid]);

  const toggleCommentLike = React.useCallback(
    async (commentId: string) => {
      if (!noticeId || !user?.uid) {
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
        likeCount: targetComment.likeCount ?? 0,
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
        const nextLikeState = await noticeRepository.toggleCommentLike(
          noticeId,
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
      commentLikePendingIds,
      flattenedCommentEntries,
      noticeId,
      noticeRepository,
      user?.uid,
    ],
  );

  const toggleLike = React.useCallback(async () => {
    if (!noticeId || !user?.uid || togglingLike || !notice) {
      throw new Error('로그인이 필요합니다.');
    }

    const previousLikeState = {
      isLiked: Boolean(notice.isLiked),
      likeCount: notice.likeCount ?? 0,
    };
    const optimisticLikeState = {
      isLiked: !previousLikeState.isLiked,
      likeCount: Math.max(
        0,
        previousLikeState.likeCount + (!previousLikeState.isLiked ? 1 : -1),
      ),
    };

    setNotice(currentNotice =>
      currentNotice
        ? {
            ...currentNotice,
            isLiked: optimisticLikeState.isLiked,
            likeCount: optimisticLikeState.likeCount,
          }
        : currentNotice,
    );

    setTogglingLike(true);

    try {
      const nextIsLiked = await noticeRepository.toggleLike(noticeId, user.uid);
      const nextLikeCount = Math.max(
        0,
        previousLikeState.likeCount + (nextIsLiked ? 1 : -1),
      );

      setNotice(currentNotice =>
        currentNotice
          ? {
              ...currentNotice,
              isLiked: nextIsLiked,
              likeCount: nextLikeCount,
            }
          : currentNotice,
      );
      invalidateData(NOTICE_MUTATION_INVALIDATION_KEYS);
    } catch (toggleError) {
      setNotice(currentNotice =>
        currentNotice
          ? {
              ...currentNotice,
              isLiked: previousLikeState.isLiked,
              likeCount: previousLikeState.likeCount,
            }
          : currentNotice,
      );
      throw toggleError;
    } finally {
      setTogglingLike(false);
    }
  }, [notice, noticeId, noticeRepository, togglingLike, user?.uid]);

  const toggleBookmark = React.useCallback(async () => {
    if (!noticeId || !user?.uid || togglingBookmark || !notice) {
      throw new Error('로그인이 필요합니다.');
    }

    const previousBookmarkState = {
      bookmarkCount: notice.bookmarkCount ?? 0,
      isBookmarked: Boolean(notice.isBookmarked),
    };
    const optimisticBookmarkState = {
      bookmarkCount: Math.max(
        0,
        previousBookmarkState.bookmarkCount +
          (!previousBookmarkState.isBookmarked ? 1 : -1),
      ),
      isBookmarked: !previousBookmarkState.isBookmarked,
    };

    setNotice(currentNotice =>
      currentNotice
        ? {
            ...currentNotice,
            bookmarkCount: optimisticBookmarkState.bookmarkCount,
            isBookmarked: optimisticBookmarkState.isBookmarked,
          }
        : currentNotice,
    );

    setTogglingBookmark(true);

    try {
      const nextIsBookmarked = await noticeRepository.toggleBookmark(
        noticeId,
        user.uid,
      );
      const nextBookmarkCount = Math.max(
        0,
        previousBookmarkState.bookmarkCount + (nextIsBookmarked ? 1 : -1),
      );

      setNotice(currentNotice =>
        currentNotice
          ? {
              ...currentNotice,
              bookmarkCount: nextBookmarkCount,
              isBookmarked: nextIsBookmarked,
            }
          : currentNotice,
      );
      invalidateData(NOTICE_BOOKMARK_INVALIDATION_KEYS);
    } catch (toggleError) {
      setNotice(currentNotice =>
        currentNotice
          ? {
              ...currentNotice,
              bookmarkCount: previousBookmarkState.bookmarkCount,
              isBookmarked: previousBookmarkState.isBookmarked,
            }
          : currentNotice,
      );
      throw toggleError;
    } finally {
      setTogglingBookmark(false);
    }
  }, [notice, noticeId, noticeRepository, togglingBookmark, user?.uid]);

  const submitComment = React.useCallback(async () => {
    if (!noticeId || !user?.uid) {
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
        await noticeRepository.updateComment(
          noticeId,
          editingCommentId,
          trimmedComment,
          commentAnonymousValue,
        );
      } else {
        targetCommentId = await noticeRepository.createComment(noticeId, {
          content: trimmedComment,
          isAnonymous: isCommentAnonymousPreferred,
          parentId: replyTargetCommentId,
          userDisplayName: user.displayName ?? '익명',
          userId: user.uid,
        });
      }

      await refreshComments();
      setCommentDraft('');
      setEditingCommentId(null);
      setReplyTargetCommentId(null);
      setCommentAnonymousDraft(null);
      invalidateData(NOTICE_MUTATION_INVALIDATION_KEYS);

      return {
        commentId: targetCommentId,
      };
    } finally {
      setSubmittingComment(false);
    }
  }, [
    commentDraft,
    commentAnonymousValue,
    editingCommentId,
    isCommentAnonymousPreferred,
    noticeId,
    noticeRepository,
    refreshComments,
    replyTargetCommentId,
    user,
  ]);

  const startEditingComment = React.useCallback(
    (commentId: string) => {
      const targetComment = flattenedCommentEntries.find(
        entry => entry.comment.id === commentId,
      )?.comment;

      if (
        !targetComment ||
        !targetComment.isAuthor ||
        targetComment.isDeleted
      ) {
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
      if (!noticeId || !user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      await noticeRepository.deleteComment(noticeId, commentId);
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

      invalidateData(NOTICE_MUTATION_INVALIDATION_KEYS);
    },
    [
      editingCommentId,
      noticeId,
      noticeRepository,
      refreshComments,
      replyTargetCommentId,
      user?.uid,
    ],
  );

  const data = React.useMemo(
    () => (notice ? toViewData(notice, commentItems) : null),
    [commentItems, notice],
  );

  return {
    cancelCommentEdit,
    cancelCommentReply,
    commentAnonymousDisabled,
    commentAnonymousValue,
    commentLikePendingIds,
    commentDraft,
    commentItems,
    data,
    deleteComment,
    editingCommentId,
    error,
    isEditingComment: Boolean(editingCommentId),
    isReplyingComment: Boolean(replyTargetCommentId),
    loading,
    notice,
    notFound,
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
