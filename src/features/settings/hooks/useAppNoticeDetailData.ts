import React from 'react';

import {useAppNoticeRepository} from '@/di/useRepository';
import {useAuth} from '@/features/auth';
import type {
  NoticeComment,
  NoticeCommentTreeNode,
} from '@/features/notice/model/types';
import {useCommentAnonymousPreference} from '@/shared/hooks';
import {
  flattenVisibleCommentTree,
  type FlattenedCommentTreeEntry,
} from '@/shared/lib/comments';
import {formatKoreanCompactDateTime} from '@/shared/lib/date';
import type {ContentDetailCommentViewData} from '@/shared/types/contentDetailViewData';

import {assembleAppNoticeDetailViewData} from '../application/appNoticeViewAssembler';
import type {AppNotice} from '../data/repositories/IAppNoticeRepository';
import type {AppNoticeBadgeViewData} from '../model/appNoticeViewData';

export interface AppNoticeDetailCommentItem
  extends ContentDetailCommentViewData {
  isEditable: boolean;
}

const buildBadges = (
  important: boolean,
  categoryLabel: string,
): AppNoticeBadgeViewData[] => [
  ...(important
    ? [{id: 'important', label: '중요', tone: 'danger' as const}]
    : []),
  {id: 'category', label: categoryLabel, tone: 'neutral'},
];

const updateCommentTree = (
  comments: NoticeCommentTreeNode[],
  commentId: string,
  updater: (comment: NoticeCommentTreeNode) => NoticeCommentTreeNode,
): NoticeCommentTreeNode[] =>
  comments.map(comment => {
    const next = comment.id === commentId ? updater(comment) : comment;
    return {...next, replies: updateCommentTree(next.replies, commentId, updater)};
  });

const appendCommentToTree = (
  comments: NoticeCommentTreeNode[],
  createdComment: NoticeComment,
): NoticeCommentTreeNode[] => {
  const nextComment: NoticeCommentTreeNode = {...createdComment, replies: []};
  if (!createdComment.parentId) {
    return [...comments, nextComment];
  }

  let inserted = false;
  const appendToParent = (nodes: NoticeCommentTreeNode[]): NoticeCommentTreeNode[] =>
    nodes.map(node => {
      if (node.id === createdComment.parentId) {
        inserted = true;
        return {...node, replies: [...node.replies, nextComment]};
      }
      return {...node, replies: appendToParent(node.replies)};
    });
  const nextComments = appendToParent(comments);
  return inserted ? nextComments : [...nextComments, nextComment];
};

const getAuthorLabel = (comment: NoticeCommentTreeNode) =>
  comment.isAnonymous
    ? `익명${comment.anonymousOrder ?? ''}`
    : comment.userDisplayName;

const getReplyTargetLabel = (comment: NoticeCommentTreeNode) =>
  comment.isDeleted
    ? '삭제된 댓글/답글에 답글'
    : `${getAuthorLabel(comment)} 님에게 답글`;

const toCommentItems = (
  entries: FlattenedCommentTreeEntry<NoticeCommentTreeNode>[],
): AppNoticeDetailCommentItem[] =>
  entries.map(({comment, parent}) => ({
    authorLabel: getAuthorLabel(comment),
    authorProfileImage:
      comment.isAnonymous || comment.isDeleted
        ? null
        : comment.authorProfileImage,
    body: comment.content,
    dateLabel: formatKoreanCompactDateTime(comment.createdAt),
    id: comment.id,
    isAuthorAdmin:
      !comment.isAnonymous && !comment.isDeleted && Boolean(comment.isAuthorAdmin),
    isDeleted: Boolean(comment.isDeleted),
    isEditable: Boolean(comment.isAuthor && !comment.isDeleted),
    isLiked: Boolean(comment.isLiked),
    isMine: Boolean(comment.isAuthor),
    isReply: Boolean(comment.parentId),
    likeCount: comment.likeCount ?? 0,
    replyTargetLabel: parent ? getReplyTargetLabel(parent) : undefined,
  }));

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : '앱 공지사항을 다시 불러와주세요.';

export const useAppNoticeDetailData = (noticeId?: string) => {
  const {user} = useAuth();
  const repository = useAppNoticeRepository();
  const {
    isAnonymous: storedAnonymous,
    toggleAnonymousPreference: toggleStoredAnonymous,
  } = useCommentAnonymousPreference();
  const [notice, setNotice] = React.useState<AppNotice | null>(null);
  const [comments, setComments] = React.useState<NoticeCommentTreeNode[]>([]);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [replyTargetCommentId, setReplyTargetCommentId] = React.useState<string | null>(null);
  const [commentAnonymousDraft, setCommentAnonymousDraft] = React.useState<boolean | null>(null);
  const [commentDeletePendingIds, setCommentDeletePendingIds] = React.useState<string[]>([]);
  const [commentLikePendingIds, setCommentLikePendingIds] = React.useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [togglingLike, setTogglingLike] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [commentError, setCommentError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const commentRequestIdRef = React.useRef(0);
  const commentRevisionRef = React.useRef(0);
  const noticeRevisionRef = React.useRef(0);
  const commentDeletePendingIdsRef = React.useRef(new Set<string>());
  const activeNoticeIdRef = React.useRef<string | null>(null);
  const latestNoticeIdRef = React.useRef(noticeId);
  latestNoticeIdRef.current = noticeId;

  const flattenedEntries = React.useMemo(
    () => flattenVisibleCommentTree(comments),
    [comments],
  );
  const commentItems = React.useMemo(
    () => toCommentItems(flattenedEntries),
    [flattenedEntries],
  );
  const editingComment = flattenedEntries.find(
    entry => entry.comment.id === editingCommentId,
  )?.comment;
  const replyTargetComment = flattenedEntries.find(
    entry => entry.comment.id === replyTargetCommentId,
  )?.comment;
  const commentComposerTargetId = editingCommentId ?? replyTargetCommentId;
  const isCommentComposerLocked = Boolean(
    commentComposerTargetId && commentDeletePendingIds.includes(commentComposerTargetId),
  );
  const commentAnonymousValue = commentAnonymousDraft ?? storedAnonymous;

  const invalidatePendingNoticeLoads = React.useCallback(() => {
    noticeRevisionRef.current += 1;
  }, []);

  const invalidatePendingCommentLoads = React.useCallback(() => {
    commentRevisionRef.current += 1;
  }, []);

  const invalidatePendingContentLoads = React.useCallback(() => {
    invalidatePendingNoticeLoads();
    invalidatePendingCommentLoads();
  }, [invalidatePendingCommentLoads, invalidatePendingNoticeLoads]);

  const completeNoticeMutation = React.useCallback((mutationNoticeId: string) => {
    if (latestNoticeIdRef.current === mutationNoticeId) {
      invalidatePendingNoticeLoads();
    }
  }, [invalidatePendingNoticeLoads]);

  const completeCommentMutation = React.useCallback((mutationNoticeId: string) => {
    if (latestNoticeIdRef.current === mutationNoticeId) {
      invalidatePendingCommentLoads();
    }
  }, [invalidatePendingCommentLoads]);

  const completeContentMutation = React.useCallback((mutationNoticeId: string) => {
    completeNoticeMutation(mutationNoticeId);
    completeCommentMutation(mutationNoticeId);
  }, [completeCommentMutation, completeNoticeMutation]);

  const refreshComments = React.useCallback(async () => {
    const requestedNoticeId = noticeId;
    const commentRequestId = ++commentRequestIdRef.current;
    const commentRevision = commentRevisionRef.current;
    if (!requestedNoticeId || !user?.uid) {
      if (
        latestNoticeIdRef.current === requestedNoticeId &&
        commentRequestId === commentRequestIdRef.current
      ) {
        setComments([]);
        setCommentError(null);
      }
      return;
    }
    try {
      const nextComments = await repository.getComments(requestedNoticeId);
      if (
        latestNoticeIdRef.current !== requestedNoticeId ||
        commentRequestId !== commentRequestIdRef.current ||
        commentRevision !== commentRevisionRef.current
      ) return;
      setComments(nextComments);
      setCommentError(null);
    } catch (refreshError) {
      if (
        latestNoticeIdRef.current !== requestedNoticeId ||
        commentRequestId !== commentRequestIdRef.current ||
        commentRevision !== commentRevisionRef.current
      ) return;
      setCommentError(getErrorMessage(refreshError));
      throw refreshError;
    }
  }, [noticeId, repository, user?.uid]);

  const load = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const commentRequestId = ++commentRequestIdRef.current;
    const commentRevision = commentRevisionRef.current;
    const noticeRevision = noticeRevisionRef.current;
    const routeChanged = activeNoticeIdRef.current !== noticeId;
    setLoading(true);
    setError(null);
    if (routeChanged) {
      setNotice(null);
      setComments([]);
      setCommentError(null);
    }
    try {
      if (!noticeId) {
        setNotice(null);
        setComments([]);
        setError('앱 공지사항 ID가 없습니다.');
        return;
      }
      const nextNotice = await repository.getAppNotice(noticeId);
      if (
        requestId !== requestIdRef.current ||
        noticeRevision !== noticeRevisionRef.current
      ) return;
      if (!nextNotice) {
        setNotice(null);
        setComments([]);
        setError('앱 공지사항을 찾을 수 없습니다.');
        return;
      }
      setNotice(nextNotice);
      activeNoticeIdRef.current = noticeId;
      if (user?.uid) {
        repository.markAsRead(noticeId).catch(markError => {
          console.error('앱 공지 읽음 처리에 실패했습니다.', markError);
        });
      }
      const loadComments = async () => {
        if (!user?.uid) {
          if (
            latestNoticeIdRef.current === noticeId &&
            commentRequestId === commentRequestIdRef.current
          ) {
            setComments([]);
            setCommentError(null);
          }
          return;
        }
        try {
          const nextComments = await repository.getComments(noticeId);
          if (
            latestNoticeIdRef.current !== noticeId ||
            commentRequestId !== commentRequestIdRef.current ||
            commentRevision !== commentRevisionRef.current
          ) return;
          setComments(nextComments);
          setCommentError(null);
        } catch (commentsLoadError) {
          if (
            latestNoticeIdRef.current !== noticeId ||
            commentRequestId !== commentRequestIdRef.current ||
            commentRevision !== commentRevisionRef.current
          ) return;
          setCommentError(getErrorMessage(commentsLoadError));
        }
      };
      loadComments().catch(() => undefined);
    } catch (loadError) {
      if (
        requestId === requestIdRef.current &&
        noticeRevision === noticeRevisionRef.current
      ) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [noticeId, repository, user?.uid]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  React.useEffect(() => {
    setCommentDraft('');
    setEditingCommentId(null);
    setReplyTargetCommentId(null);
    setCommentAnonymousDraft(null);
    commentDeletePendingIdsRef.current.clear();
    setCommentDeletePendingIds([]);
    setCommentError(null);
    setCommentLikePendingIds([]);
    setSubmittingComment(false);
    setTogglingLike(false);
  }, [noticeId]);

  React.useEffect(() => {
    if (
      editingCommentId &&
      (!editingComment || !editingComment.isAuthor || editingComment.isDeleted)
    ) {
      setEditingCommentId(null);
      setCommentDraft('');
      setCommentAnonymousDraft(null);
    }
    if (replyTargetCommentId && (!replyTargetComment || replyTargetComment.isDeleted)) {
      setReplyTargetCommentId(null);
      setCommentDraft('');
      setCommentAnonymousDraft(null);
    }
  }, [
    editingComment,
    editingCommentId,
    replyTargetComment,
    replyTargetCommentId,
  ]);

  const toggleLike = React.useCallback(async () => {
    if (!noticeId || !user?.uid || !notice || notice.id !== noticeId || togglingLike) {
      throw new Error('로그인이 필요합니다.');
    }
    const mutationNoticeId = noticeId;
    const previous = {isLiked: notice.isLiked, likeCount: notice.likeCount};
    const optimistic = {
      isLiked: !previous.isLiked,
      likeCount: Math.max(0, previous.likeCount + (previous.isLiked ? -1 : 1)),
    };
    invalidatePendingNoticeLoads();
    setNotice(current => (current ? {...current, ...optimistic} : current));
    setTogglingLike(true);
    try {
      const state = await repository.toggleLike(mutationNoticeId);
      if (latestNoticeIdRef.current !== mutationNoticeId) return;
      setNotice(current =>
        current?.id === mutationNoticeId ? {...current, ...state} : current,
      );
    } catch (toggleError) {
      if (latestNoticeIdRef.current !== mutationNoticeId) return;
      setNotice(current =>
        current?.id === mutationNoticeId ? {...current, ...previous} : current,
      );
      throw toggleError;
    } finally {
      if (latestNoticeIdRef.current === mutationNoticeId) {
        setTogglingLike(false);
      }
      completeNoticeMutation(mutationNoticeId);
    }
  }, [completeNoticeMutation, invalidatePendingNoticeLoads, notice, noticeId, repository, togglingLike, user?.uid]);

  const toggleCommentLike = React.useCallback(async (commentId: string) => {
    if (!noticeId || !user?.uid || commentLikePendingIds.includes(commentId)) {
      throw new Error('로그인이 필요합니다.');
    }
    if (commentDeletePendingIdsRef.current.has(commentId)) return;
    const target = flattenedEntries.find(entry => entry.comment.id === commentId)?.comment;
    if (!target) throw new Error('댓글을 찾을 수 없습니다.');
    const mutationNoticeId = noticeId;
    const previous = {isLiked: Boolean(target.isLiked), likeCount: target.likeCount ?? 0};
    const optimistic = {
      isLiked: !previous.isLiked,
      likeCount: Math.max(0, previous.likeCount + (previous.isLiked ? -1 : 1)),
    };
    invalidatePendingCommentLoads();
    setComments(current => updateCommentTree(current, commentId, comment => ({...comment, ...optimistic})));
    setCommentLikePendingIds(current => [...current, commentId]);
    try {
      const state = await repository.toggleCommentLike(mutationNoticeId, commentId);
      if (latestNoticeIdRef.current !== mutationNoticeId) return;
      setComments(current => updateCommentTree(
        current,
        commentId,
        comment => comment.isDeleted ? comment : {...comment, ...state},
      ));
    } catch (toggleError) {
      if (latestNoticeIdRef.current !== mutationNoticeId) return;
      setComments(current => updateCommentTree(
        current,
        commentId,
        comment => comment.isDeleted ? comment : {...comment, ...previous},
      ));
      throw toggleError;
    } finally {
      if (latestNoticeIdRef.current === mutationNoticeId) {
        setCommentLikePendingIds(current => current.filter(id => id !== commentId));
      }
      completeCommentMutation(mutationNoticeId);
    }
  }, [commentLikePendingIds, completeCommentMutation, flattenedEntries, invalidatePendingCommentLoads, noticeId, repository, user?.uid]);

  const submitComment = React.useCallback(async () => {
    if (!noticeId || !user?.uid || !notice || notice.id !== noticeId) {
      throw new Error('로그인이 필요합니다.');
    }
    const targetCommentId = editingCommentId ?? replyTargetCommentId;
    if (targetCommentId && commentDeletePendingIdsRef.current.has(targetCommentId)) {
      throw new Error('삭제 중인 댓글은 수정하거나 답글을 작성할 수 없습니다.');
    }
    const mutationNoticeId = noticeId;
    const content = commentDraft.trim();
    if (!content) throw new Error('댓글 내용을 입력해주세요.');
    invalidatePendingContentLoads();
    setSubmittingComment(true);
    try {
      let commentId = editingCommentId;
      if (editingCommentId) {
        const updatedComment = await repository.updateComment(
          mutationNoticeId,
          editingCommentId,
          content,
          commentAnonymousValue,
        );
        if (latestNoticeIdRef.current !== mutationNoticeId) {
          return {commentId: undefined};
        }
        setComments(current => updateCommentTree(
          current,
          editingCommentId,
          currentComment => ({...updatedComment, replies: currentComment.replies}),
        ));
      } else {
        const createdComment = await repository.createComment(mutationNoticeId, {
          content,
          isAnonymous: storedAnonymous,
          parentId: replyTargetCommentId,
          userDisplayName: user.displayName ?? '익명',
          userId: user.uid,
        });
        if (latestNoticeIdRef.current !== mutationNoticeId) {
          return {commentId: undefined};
        }
        commentId = createdComment.id;
        setComments(current => appendCommentToTree(current, createdComment));
        setNotice(current =>
          current?.id === mutationNoticeId
            ? {...current, commentCount: current.commentCount + 1}
            : current,
        );
      }
      setCommentDraft('');
      setEditingCommentId(null);
      setReplyTargetCommentId(null);
      setCommentAnonymousDraft(null);
      return {commentId};
    } catch (submitError) {
      if (latestNoticeIdRef.current === mutationNoticeId) {
        throw submitError;
      }
      return {commentId: undefined};
    } finally {
      if (latestNoticeIdRef.current === mutationNoticeId) {
        setSubmittingComment(false);
      }
      completeContentMutation(mutationNoticeId);
    }
  }, [commentAnonymousValue, commentDraft, completeContentMutation, editingCommentId, invalidatePendingContentLoads, notice, noticeId, replyTargetCommentId, repository, storedAnonymous, user]);

  const deleteComment = React.useCallback(async (commentId: string) => {
    if (!noticeId || !user?.uid || notice?.id !== noticeId) {
      throw new Error('앱 공지사항을 다시 불러와주세요.');
    }
    if (commentDeletePendingIdsRef.current.has(commentId)) return;
    const mutationNoticeId = noticeId;
    commentDeletePendingIdsRef.current.add(commentId);
    setCommentDeletePendingIds(current => [...current, commentId]);
    invalidatePendingContentLoads();
    try {
      await repository.deleteComment(mutationNoticeId, commentId);
      if (latestNoticeIdRef.current !== mutationNoticeId) return;
      setComments(current => updateCommentTree(current, commentId, comment => ({
        ...comment,
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
      })));
      setNotice(current =>
        current?.id === mutationNoticeId
          ? {...current, commentCount: Math.max(0, current.commentCount - 1)}
          : current,
      );
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
    } catch (deleteError) {
      if (latestNoticeIdRef.current === mutationNoticeId) {
        throw deleteError;
      }
    } finally {
      commentDeletePendingIdsRef.current.delete(commentId);
      if (latestNoticeIdRef.current === mutationNoticeId) {
        setCommentDeletePendingIds(current => current.filter(id => id !== commentId));
      }
      completeContentMutation(mutationNoticeId);
    }
  }, [completeContentMutation, editingCommentId, invalidatePendingContentLoads, notice, noticeId, replyTargetCommentId, repository, user?.uid]);

  const startEditingComment = React.useCallback((commentId: string) => {
    if (submittingComment || commentDeletePendingIdsRef.current.has(commentId)) return;
    const target = flattenedEntries.find(entry => entry.comment.id === commentId)?.comment;
    if (!target?.isAuthor || target.isDeleted) return;
    setEditingCommentId(commentId);
    setReplyTargetCommentId(null);
    setCommentDraft(target.content);
    setCommentAnonymousDraft(Boolean(target.isAnonymous));
  }, [flattenedEntries, submittingComment]);

  const startReplyingComment = React.useCallback((commentId: string) => {
    if (submittingComment || commentDeletePendingIdsRef.current.has(commentId)) return;
    const target = flattenedEntries.find(entry => entry.comment.id === commentId)?.comment;
    if (!target || target.isDeleted) return;
    setEditingCommentId(null);
    setReplyTargetCommentId(commentId);
    setCommentDraft('');
    setCommentAnonymousDraft(null);
  }, [flattenedEntries, submittingComment]);

  const toggleCommentAnonymousPreference = React.useCallback(() => {
    if (editingCommentId) {
      setCommentAnonymousDraft(current => !(current ?? Boolean(editingComment?.isAnonymous)));
    } else {
      toggleStoredAnonymous();
    }
  }, [editingComment?.isAnonymous, editingCommentId, toggleStoredAnonymous]);

  const viewData = React.useMemo(() => {
    if (!notice || notice.id !== noticeId) return null;
    const data = assembleAppNoticeDetailViewData(notice);
    return {...data, badges: buildBadges(notice.priority === 'urgent', data.categoryLabel)};
  }, [notice, noticeId]);

  return {
    cancelCommentEdit: () => { setEditingCommentId(null); setCommentDraft(''); setCommentAnonymousDraft(null); },
    cancelCommentReply: () => { setReplyTargetCommentId(null); setCommentDraft(''); },
    commentAnonymousDisabled: submittingComment || isCommentComposerLocked,
    commentAnonymousValue,
    commentDraft,
    commentError,
    commentDeletePendingIds,
    commentItems,
    commentLikePendingIds,
    data: viewData,
    deleteComment,
    editingCommentId,
    error,
    isEditingComment: Boolean(editingCommentId),
    isCommentComposerLocked,
    isReplyingComment: Boolean(replyTargetCommentId),
    loading,
    notice,
    reload: load,
    retryComments: refreshComments,
    replyTargetLabel: replyTargetComment ? getReplyTargetLabel(replyTargetComment) : null,
    setCommentDraft,
    startEditingComment,
    startReplyingComment,
    submitComment,
    submittingComment,
    toggleCommentAnonymousPreference,
    toggleCommentLike,
    toggleLike,
    togglingLike,
  };
};
