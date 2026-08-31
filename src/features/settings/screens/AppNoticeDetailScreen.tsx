import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type {CampusStackParamList} from '@/app/navigation/types';
import {useReportRepository} from '@/di';
import {useContentBlockAction} from '@/features/content-block';
import type {ReportCategory} from '@/features/report';
import {
  ArticleDetailSkeleton,
  DetailCommentCard,
  DetailComposer,
  DetailReactionChip,
  LinkifiedText,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';
import {openExternalWebUrl} from '@/shared/lib/device/openExternalWebUrl';
import {useScreenView} from '@/shared/hooks/useScreenView';
import {ReportReasonModal} from '@/shared/ui/ReportReasonModal';

import {AppNoticeBadge} from '../components/AppNoticeBadge';
import {AppNoticeHeroCarousel} from '../components/AppNoticeHeroCarousel';
import {useAppNoticeDetailData} from '../hooks/useAppNoticeDetailData';
import {
  APP_NOTICE_REPORT_CATEGORIES,
  submitAppNoticeCommentReport,
} from '../services/appNoticeReportService';

type Navigation = NativeStackNavigationProp<CampusStackParamList, 'AppNoticeDetail'>;
type Route = RouteProp<CampusStackParamList, 'AppNoticeDetail'>;

export const AppNoticeDetailScreen = () => {
  useScreenView();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const reportRepository = useReportRepository();
  const [refreshing, setRefreshing] = React.useState(false);
  const [reportVisible, setReportVisible] = React.useState(false);
  const [reportTargetId, setReportTargetId] = React.useState<string | null>(null);
  const [reportTargetNoticeId, setReportTargetNoticeId] = React.useState<string | null>(null);
  const [reportCategory, setReportCategory] = React.useState<ReportCategory | null>(null);
  const [reportReason, setReportReason] = React.useState('');
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const composerRef = React.useRef<TextInput>(null);
  const commentOffsetsRef = React.useRef(new Map<string, number>());
  const bodyCardOffsetRef = React.useRef(0);
  const commentSectionOffsetRef = React.useRef(0);
  const bodyCardMeasuredRef = React.useRef(false);
  const commentSectionMeasuredRef = React.useRef(false);
  const appliedInitialCommentRef = React.useRef<string | null>(null);
  const pendingInitialCommentRef = React.useRef<string | null>(null);
  const pendingSubmittedCommentRef = React.useRef<string | null>(null);
  const reportSessionRef = React.useRef(0);
  const interactionSessionRef = React.useRef(0);
  const reportSubmissionRequestIdRef = React.useRef(0);
  const pendingReportSubmissionRequestIdRef = React.useRef<number | null>(null);
  const initialCommentIntentRef = React.useRef({
    commentId: route.params?.initialCommentId,
    noticeId: route.params?.noticeId,
  });
  const currentNoticeIdRef = React.useRef(route.params?.noticeId);
  currentNoticeIdRef.current = route.params?.noticeId;
  const isCurrentInteraction = React.useCallback(
    (interactionSession: number, noticeId?: string) =>
      interactionSessionRef.current === interactionSession &&
      currentNoticeIdRef.current === noticeId,
    [],
  );
  const {
    cancelCommentEdit,
    cancelCommentReply,
    commentAnonymousDisabled,
    commentAnonymousValue,
    commentDraft,
    commentError,
    commentDeletePendingIds,
    commentItems,
    commentLikePendingIds,
    commentsLoading,
    data,
    deleteComment,
    editingCommentId,
    error,
    isEditingComment,
    isCommentComposerLocked,
    isCommentComposerUnavailable,
    isReplyingComment,
    loading,
    notice,
    reload,
    retryComments,
    replyTargetLabel,
    replyTargetCommentId,
    setCommentDraft,
    startEditingComment,
    startReplyingComment,
    submitComment,
    submittingComment,
    toggleCommentAnonymousPreference,
    toggleCommentLike,
    toggleLike,
    togglingLike,
  } = useAppNoticeDetailData(route.params?.noticeId);

  const handleContentBlocked = React.useCallback(async () => {
    await reload();
  }, [reload]);
  const {requestContentBlock} = useContentBlockAction({
    onBlocked: handleContentBlocked,
    scopeId: route.params?.noticeId,
  });

  const handlePressBlockComment = React.useCallback(
    (commentId: string) => {
      requestContentBlock({
        targetId: commentId,
        targetType: 'APP_NOTICE_COMMENT',
      });
    },
    [requestContentBlock],
  );

  const showError = (caught: unknown, fallback: string) =>
    Alert.alert('오류', caught instanceof Error ? caught.message : fallback);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const focusComposer = React.useCallback(() => {
    setTimeout(() => composerRef.current?.focus(), Platform.OS === 'ios' ? 180 : 80);
  }, []);

  const scrollToCommentIfMeasured = React.useCallback((commentId: string) => {
    if (
      !bodyCardMeasuredRef.current ||
      !commentSectionMeasuredRef.current
    ) return false;

    const offset = commentOffsetsRef.current.get(commentId);
    if (offset == null) return false;

    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(
        0,
        bodyCardOffsetRef.current +
          commentSectionOffsetRef.current +
          offset -
          SPACING.lg,
      ),
    });
    return true;
  }, []);

  const scrollToPendingInitialComment = React.useCallback(() => {
    const commentId = pendingInitialCommentRef.current;
    if (!commentId || !scrollToCommentIfMeasured(commentId)) return;
    appliedInitialCommentRef.current = commentId;
    pendingInitialCommentRef.current = null;
  }, [scrollToCommentIfMeasured]);

  const scrollToPendingSubmittedComment = React.useCallback(() => {
    const commentId = pendingSubmittedCommentRef.current;
    if (!commentId || !scrollToCommentIfMeasured(commentId)) return;
    pendingSubmittedCommentRef.current = null;
  }, [scrollToCommentIfMeasured]);

  const handleNoticeLike = React.useCallback(() => {
    const interactionSession = interactionSessionRef.current;
    const interactionNoticeId = route.params?.noticeId;
    toggleLike().catch(caughtError => {
      if (!isCurrentInteraction(interactionSession, interactionNoticeId)) return;
      showError(caughtError, '좋아요 처리에 실패했습니다.');
    });
  }, [isCurrentInteraction, route.params?.noticeId, toggleLike]);

  const handleCommentLike = React.useCallback((commentId: string) => {
    const interactionSession = interactionSessionRef.current;
    const interactionNoticeId = route.params?.noticeId;
    toggleCommentLike(commentId).catch(caughtError => {
      if (!isCurrentInteraction(interactionSession, interactionNoticeId)) return;
      showError(caughtError, '댓글 좋아요 처리에 실패했습니다.');
    });
  }, [isCurrentInteraction, route.params?.noticeId, toggleCommentLike]);

  const handleDeleteComment = React.useCallback((commentId: string) => {
    const interactionSession = interactionSessionRef.current;
    const interactionNoticeId = route.params?.noticeId;
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => deleteComment(commentId).catch(caughtError => {
          if (!isCurrentInteraction(interactionSession, interactionNoticeId)) return;
          showError(caughtError, '댓글 삭제에 실패했습니다.');
        }),
      },
    ]);
  }, [deleteComment, isCurrentInteraction, route.params?.noticeId]);

  const handleSubmitComment = React.useCallback(() => {
    const interactionSession = interactionSessionRef.current;
    const submittedNoticeId = route.params?.noticeId;
    submitComment()
      .then(result => {
        const commentId = result.commentId;
        if (!commentId || !isCurrentInteraction(interactionSession, submittedNoticeId)) return;
        Keyboard.dismiss();
        pendingSubmittedCommentRef.current = commentId;
        setTimeout(scrollToPendingSubmittedComment, 120);
      })
      .catch(caughtError => {
        if (!isCurrentInteraction(interactionSession, submittedNoticeId)) return;
        showError(caughtError, '댓글 처리에 실패했습니다.');
      });
  }, [isCurrentInteraction, route.params?.noticeId, scrollToPendingSubmittedComment, submitComment]);

  React.useEffect(() => {
    const interactionSession = ++interactionSessionRef.current;
    reportSessionRef.current += 1;
    setReportVisible(false);
    setReportTargetId(null);
    setReportTargetNoticeId(null);
    setReportCategory(null);
    setReportReason('');
    setReportSubmitting(false);
    pendingReportSubmissionRequestIdRef.current = null;
    commentOffsetsRef.current.clear();
    bodyCardMeasuredRef.current = false;
    commentSectionMeasuredRef.current = false;
    appliedInitialCommentRef.current = null;
    pendingInitialCommentRef.current = null;
    pendingSubmittedCommentRef.current = null;
    return () => {
      if (interactionSessionRef.current === interactionSession) {
        interactionSessionRef.current += 1;
      }
      reportSessionRef.current += 1;
    };
  }, [route.params?.noticeId]);

  React.useEffect(() => {
    const nextIntent = {
      commentId: route.params?.initialCommentId,
      noticeId: route.params?.noticeId,
    };
    const previousIntent = initialCommentIntentRef.current;
    initialCommentIntentRef.current = nextIntent;
    if (
      previousIntent.noticeId === nextIntent.noticeId &&
      previousIntent.commentId !== nextIntent.commentId &&
      nextIntent.commentId
    ) {
      retryComments().catch(() => undefined);
    }
  }, [retryComments, route.params?.initialCommentId, route.params?.noticeId]);

  React.useEffect(() => {
    const initialCommentId = route.params?.initialCommentId;
    const hasInitialComment = Boolean(
      initialCommentId && commentItems.some(comment => comment.id === initialCommentId),
    );
    if (
      !initialCommentId ||
      appliedInitialCommentRef.current === initialCommentId ||
      !hasInitialComment
    ) return;
    pendingInitialCommentRef.current = initialCommentId;
    const timeoutId = setTimeout(scrollToPendingInitialComment, 160);
    return () => clearTimeout(timeoutId);
  }, [commentItems, route.params?.initialCommentId, scrollToPendingInitialComment]);

  const closeReport = () => {
    if (reportSubmitting) return;
    reportSessionRef.current += 1;
    setReportVisible(false);
    setReportTargetId(null);
    setReportTargetNoticeId(null);
    setReportCategory(null);
    setReportReason('');
  };

  const submitReport = async () => {
    if (
      !reportTargetId ||
      !reportCategory ||
      !reportReason.trim() ||
      reportTargetNoticeId !== route.params?.noticeId
    ) return;
    if (pendingReportSubmissionRequestIdRef.current !== null) return;
    const reportSession = reportSessionRef.current;
    const reportSubmissionRequestId = ++reportSubmissionRequestIdRef.current;
    const targetId = reportTargetId;
    const targetNoticeId = reportTargetNoticeId;
    const reason = reportReason.trim();
    pendingReportSubmissionRequestIdRef.current = reportSubmissionRequestId;
    setReportSubmitting(true);
    try {
      await submitAppNoticeCommentReport(
        reportRepository,
        targetId,
        reportCategory,
        reason,
      );
      if (
        reportSessionRef.current !== reportSession ||
        currentNoticeIdRef.current !== targetNoticeId
      ) return;
      setReportSubmitting(false);
      reportSessionRef.current += 1;
      setReportVisible(false);
      setReportTargetId(null);
      setReportTargetNoticeId(null);
      setReportCategory(null);
      setReportReason('');
      Alert.alert('신고 접수 완료', '운영팀이 확인 후 처리할 예정입니다.');
    } catch (caught) {
      if (
        reportSessionRef.current !== reportSession ||
        currentNoticeIdRef.current !== targetNoticeId
      ) return;
      setReportSubmitting(false);
      showError(caught, '신고 접수에 실패했습니다.');
    } finally {
      if (pendingReportSubmissionRequestIdRef.current === reportSubmissionRequestId) {
        pendingReportSubmissionRequestIdRef.current = null;
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StackHeader onPressBack={() => navigation.goBack()} title="앱 공지사항" />

      {loading && !data ? <ArticleDetailSkeleton /> : null}
      {!loading && !data ? (
        <View style={styles.stateContainer}>
          <StateCard
            actionLabel="다시 시도"
            description={error ?? '앱 공지사항을 찾을 수 없습니다.'}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={26} />}
            onPressAction={() => reload().catch(() => undefined)}
            title="앱 공지사항을 열 수 없습니다"
          />
        </View>
      ) : null}

      {data ? (
        <>
          {error ? (
            <View style={styles.refreshErrorBanner}>
              <Text style={styles.refreshErrorText}>{error}</Text>
              <TouchableOpacity onPress={() => reload().catch(() => undefined)}>
                <Text style={styles.refreshErrorAction}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                onRefresh={handleRefresh}
                refreshing={refreshing}
                tintColor={COLORS.brand.primary}
              />
            }
            showsVerticalScrollIndicator={false}>
            {data.galleryImages.length ? (
              <AppNoticeHeroCarousel images={data.galleryImages} />
            ) : null}

            <View
              onLayout={event => {
                bodyCardOffsetRef.current = event.nativeEvent.layout.y;
                bodyCardMeasuredRef.current = true;
                scrollToPendingInitialComment();
                scrollToPendingSubmittedComment();
              }}
              style={styles.bodyCard}
              testID="app-notice-body-card">
              <View style={styles.badgeRow}>
                {data.badges.map(badge => <AppNoticeBadge key={badge.id} badge={badge} />)}
              </View>
              <Text style={styles.title}>{data.title}</Text>
              <View style={styles.metaRow}>
                <Icon color={COLORS.brand.primaryStrong} name="shield-checkmark" size={15} />
                <Text style={styles.authorLabel}>{data.authorLabel}</Text>
                <Text style={styles.metaSeparator}>|</Text>
                <Text style={styles.metaLabel}>{data.publishedLabel}</Text>
                <Text style={styles.metaSeparator}>|</Text>
                <Icon color={COLORS.text.muted} name="eye-outline" size={14} />
                <Text style={styles.metaLabel}>{data.viewCountLabel ?? '0'}</Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.paragraphGroup}>
                {data.bodyParagraphs.map((paragraph, index) => (
                  <LinkifiedText
                    key={`${data.id}-paragraph-${index}`}
                    style={styles.bodyText}
                    text={paragraph}
                  />
                ))}
              </View>

              {data.actionUrl ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.84}
                  onPress={() => {
                    openExternalWebUrl(data.actionUrl!).catch(() =>
                      Alert.alert('링크 열기 오류', '외부 브라우저에서 링크를 열지 못했습니다.'),
                    );
                  }}
                  style={styles.actionButton}>
                  <Text style={styles.actionButtonLabel}>
                    {data.actionLabel?.trim() || '관련 페이지 보기'}
                  </Text>
                  <Icon color={COLORS.text.inverse} name="open-outline" size={18} />
                </TouchableOpacity>
              ) : null}

              <View style={styles.reactionRow}>
                <DetailReactionChip
                  accessibilityLabel="앱 공지 좋아요"
                  active={notice?.isLiked}
                  count={notice?.likeCount ?? 0}
                  disabled={togglingLike}
                  iconName={notice?.isLiked ? 'heart' : 'heart-outline'}
                  onPress={handleNoticeLike}
                />
              </View>

              <View style={styles.divider} />
              <Text style={styles.commentsTitle}>댓글 {notice?.commentCount ?? 0}</Text>
              {commentError ? (
                <View style={styles.commentsError}>
                  <Text style={styles.commentsErrorText}>{commentError}</Text>
                  <TouchableOpacity onPress={() => retryComments().catch(() => undefined)}>
                    <Text style={styles.commentsErrorAction}>댓글 다시 불러오기</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {commentsLoading ? (
                <View style={styles.commentsLoading} testID="app-notice-comments-loading">
                  <ActivityIndicator color={COLORS.brand.primary} size="small" />
                  <Text style={styles.commentsLoadingText}>댓글을 불러오는 중입니다.</Text>
                </View>
              ) : null}
              {!commentsLoading && !commentError && commentItems.length === 0 ? (
                <Text style={styles.emptyComments}>첫 댓글을 남겨보세요!</Text>
              ) : commentItems.length > 0 ? (
                <View
                  onLayout={event => {
                    commentSectionOffsetRef.current = event.nativeEvent.layout.y;
                    commentSectionMeasuredRef.current = true;
                    scrollToPendingInitialComment();
                    scrollToPendingSubmittedComment();
                  }}
                  style={styles.commentsList}
                  testID="app-notice-comments-list">
                  {commentItems.map(comment => (
                    <View
                      key={comment.id}
                      onLayout={(event: LayoutChangeEvent) => {
                        commentOffsetsRef.current.set(comment.id, event.nativeEvent.layout.y);
                        if (pendingInitialCommentRef.current === comment.id) {
                          scrollToPendingInitialComment();
                        }
                        if (pendingSubmittedCommentRef.current === comment.id) {
                          scrollToPendingSubmittedComment();
                        }
                      }}
                      testID={`app-notice-comment-${comment.id}`}>
                      <DetailCommentCard
                        comment={comment}
                        deleteDisabled={
                          commentDeletePendingIds.includes(comment.id) ||
                          commentLikePendingIds.includes(comment.id) ||
                          (submittingComment && (
                            editingCommentId === comment.id ||
                            replyTargetCommentId === comment.id
                          ))
                        }
                        likeDisabled={
                          commentLikePendingIds.includes(comment.id) ||
                          commentDeletePendingIds.includes(comment.id) ||
                          (submittingComment && editingCommentId === comment.id)
                        }
                        onPressDelete={comment.isEditable ? () => handleDeleteComment(comment.id) : undefined}
                        onPressEdit={comment.isEditable && !submittingComment && !commentDeletePendingIds.includes(comment.id) ? () => { startEditingComment(comment.id); focusComposer(); } : undefined}
                        onPressLike={comment.isDeleted ? undefined : () => handleCommentLike(comment.id)}
                        onPressReply={comment.isDeleted || commentDeletePendingIds.includes(comment.id) ? undefined : () => { startReplyingComment(comment.id); focusComposer(); }}
                        replyDisabled={submittingComment || commentDeletePendingIds.includes(comment.id)}
                        onPressReport={comment.isDeleted || comment.isMine ? undefined : () => {
                          setReportTargetNoticeId(route.params?.noticeId);
                          setReportTargetId(comment.id);
                          setReportCategory(null);
                          setReportReason('');
                          setReportVisible(true);
                        }}
                        onPressBlock={comment.isDeleted || comment.isMine ? undefined : () => {
                          handlePressBlockComment(comment.id);
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : 'height'}>
            {isEditingComment || isReplyingComment ? (
              <View style={styles.composerBanner}>
                <Text style={styles.composerBannerText}>
                  {isEditingComment ? '댓글 수정 중' : replyTargetLabel}
                </Text>
                <TouchableOpacity onPress={isEditingComment ? cancelCommentEdit : cancelCommentReply}>
                  <Text style={styles.composerBannerAction}>취소</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <DetailComposer
              anonymousChecked={commentAnonymousValue}
              anonymousDisabled={commentAnonymousDisabled}
              anonymousLabel="익명"
              editable={!isCommentComposerUnavailable && !submittingComment && !isCommentComposerLocked}
              onChangeText={setCommentDraft}
              onSend={handleSubmitComment}
              onToggleAnonymous={toggleCommentAnonymousPreference}
              placeholder={editingCommentId ? '댓글을 수정하세요...' : isReplyingComment ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
              ref={composerRef}
              sendEnabled={
                !isCommentComposerUnavailable &&
                !submittingComment &&
                !isCommentComposerLocked &&
                Boolean(commentDraft.trim())
              }
              value={commentDraft}
            />
          </KeyboardAvoidingView>
        </>
      ) : null}

      <ReportReasonModal
        categories={APP_NOTICE_REPORT_CATEGORIES}
        onChangeReason={setReportReason}
        onClose={closeReport}
        onSelectCategory={setReportCategory}
        onSubmit={() => submitReport().catch(() => undefined)}
        reason={reportReason}
        selectedCategory={reportCategory}
        submitting={reportSubmitting}
        title="앱 공지 댓글 신고"
        visible={reportVisible && reportTargetNoticeId === route.params?.noticeId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center', backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md,
    flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginTop: SPACING.xl,
    minHeight: 50, paddingHorizontal: SPACING.lg,
  },
  actionButtonLabel: {color: COLORS.text.inverse, fontSize: 15, fontWeight: '700'},
  authorLabel: {color: COLORS.brand.primaryStrong, fontSize: 12, fontWeight: '700'},
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md},
  bodyCard: {backgroundColor: COLORS.background.surface, padding: SPACING.xl},
  bodyText: {color: COLORS.text.strong, fontSize: 14, lineHeight: 28},
  commentsList: {gap: SPACING.sm, marginTop: SPACING.md},
  commentsError: {gap: SPACING.sm, paddingVertical: SPACING.lg},
  commentsErrorAction: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  commentsErrorText: {color: COLORS.status.danger, fontSize: 13},
  commentsLoading: {alignItems: 'center', flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.lg},
  commentsLoadingText: {color: COLORS.text.muted, fontSize: 13},
  commentsTitle: {color: COLORS.text.primary, fontSize: 17, fontWeight: '700'},
  composerBanner: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderTopColor: COLORS.border.subtle, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm},
  composerBannerAction: {color: COLORS.brand.primaryStrong, fontWeight: '700'},
  composerBannerText: {color: COLORS.text.secondary, flex: 1, fontSize: 13},
  container: {backgroundColor: COLORS.background.page, flex: 1},
  divider: {backgroundColor: COLORS.border.subtle, height: 1, marginVertical: SPACING.xl},
  emptyComments: {color: COLORS.text.muted, paddingVertical: SPACING.xl, textAlign: 'center'},
  metaLabel: {color: COLORS.text.muted, fontSize: 12},
  metaRow: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  metaSeparator: {color: COLORS.border.default, fontSize: 12},
  paragraphGroup: {gap: SPACING.md},
  reactionRow: {flexDirection: 'row', marginTop: SPACING.xl},
  refreshErrorAction: {color: COLORS.status.danger, fontSize: 13, fontWeight: '700'},
  refreshErrorBanner: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.pinkSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  refreshErrorText: {color: COLORS.status.danger, flex: 1, fontSize: 13},
  scrollContent: {paddingBottom: 100},
  stateContainer: {flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg},
  title: {color: COLORS.text.primary, fontSize: 20, fontWeight: '700', lineHeight: 30, marginBottom: SPACING.md},
});
