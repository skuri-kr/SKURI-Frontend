import React from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Linking,
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
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {
  copyShareUrlToClipboard,
  createContentShareUrl,
} from '@/app/linking';
import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS} from '@/app/data-freshness/invalidationKeys';
import {useReportRepository} from '@/di';
import {useContentBlockAction} from '@/features/content-block';
import type {ReportCategory} from '@/features/report';
import {
  InlineBannerAd,
  isDetailAdEligible,
  useScrollViewAdVisibility,
} from '@/shared/ads';
import {
  ArticleDetailSkeleton,
  DetailBackHeader,
  DetailBodyBlocks,
  DetailCommentCard,
  DetailComposer,
  DetailNotFoundState,
  DetailReactionChip,
  DetailTitleHeader,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {ReportReasonModal} from '@/shared/ui/ReportReasonModal';
import {useToast} from '@/shared/ui/ToastProvider';
import {
  useKeyboardInset,
  useScreenEnterAnimation,
  useScreenView,
} from '@/shared/hooks';

import {NoticeDetailAttachments} from '../components/NoticeDetailAttachments';
import {useNoticeDetailData} from '../hooks/useNoticeDetailData';
import type {NoticeStackParamList} from '../model/navigation';
import {
  NOTICE_REPORT_CATEGORIES,
  submitNoticeCommentReport,
} from '../services/noticeReportService';

type NoticeDetailNavigationProp = NativeStackNavigationProp<
  NoticeStackParamList,
  'NoticeDetail'
>;

export const NoticeDetailScreen = () => {
  useScreenView();

  const navigation = useNavigation<NoticeDetailNavigationProp>();
  const route =
    useRoute<
      NativeStackScreenProps<NoticeStackParamList, 'NoticeDetail'>['route']
    >();
  const reportRepository = useReportRepository();
  const {showToast} = useToast();
  const insets = useSafeAreaInsets();
  const initialCommentId = route.params?.initialCommentId;
  const {height: keyboardHeight, isVisible: isKeyboardVisible} =
    useKeyboardInset();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isCopyingShareUrl, setIsCopyingShareUrl] = React.useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = React.useState(false);
  const [isReportVisible, setIsReportVisible] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [reportTargetCommentId, setReportTargetCommentId] = React.useState<
    string | null
  >(null);
  const [selectedReportCategory, setSelectedReportCategory] =
    React.useState<ReportCategory | null>(null);
  const [bodyContentHeight, setBodyContentHeight] = React.useState(0);
  const {
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
    isEditingComment,
    isReplyingComment,
    loading,
    notice,
    notFound,
    reload,
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
  } = useNoticeDetailData(route.params?.noticeId);

  React.useEffect(() => {
    setBodyContentHeight(0);
  }, [route.params?.noticeId]);

  const headerOffset = insets.top + 56;
  const scrollBottomPadding = isKeyboardVisible
    ? keyboardHeight + 88 + insets.bottom
    : 88;
  const scrollViewRef = React.useRef<ScrollView>(null);
  const composerRef = React.useRef<TextInput>(null);
  const commentOffsetMapRef = React.useRef(new Map<string, number>());
  const commentsListOffsetRef = React.useRef(0);
  const pendingScrollCommentIdRef = React.useRef<string | null>(null);
  const lastAppliedInitialCommentIdRef = React.useRef<string | null>(null);
  const commentScrollAnimationDelay = Platform.OS === 'ios' ? 220 : 120;
  const {
    handleAdLayout,
    handleScroll,
    handleViewportLayout,
    visible: isAdVisible,
  } = useScrollViewAdVisibility();

  const handlePressBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('NoticeMain');
  }, [navigation]);

  const handlePressReturnToList = React.useCallback(() => {
    navigation.navigate('NoticeMain');
  }, [navigation]);

  const handleContentBlocked = React.useCallback(async () => {
    invalidateData(NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS);
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
        targetType: 'NOTICE_COMMENT',
      });
    },
    [requestContentBlock],
  );

  const handlePressShare = React.useCallback(async () => {
    const noticeId = route.params?.noticeId;
    if (!noticeId || isCopyingShareUrl) {
      return;
    }

    setIsCopyingShareUrl(true);
    try {
      const shareUrl = await createContentShareUrl('NOTICE', noticeId);
      copyShareUrlToClipboard(shareUrl, showToast);
    } catch {
      Alert.alert('복사 오류', '공지 링크를 복사하지 못했습니다.');
    } finally {
      setIsCopyingShareUrl(false);
    }
  }, [isCopyingShareUrl, route.params?.noticeId, showToast]);

  const handleCloseReportModal = React.useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setIsReportVisible(false);
    setReportTargetCommentId(null);
    setSelectedReportCategory(null);
    setReportReason('');
  }, [isReportSubmitting]);

  const handleOpenCommentReport = React.useCallback((commentId: string) => {
    setReportTargetCommentId(commentId);
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, []);

  const handleSubmitReport = React.useCallback(async () => {
    if (!reportTargetCommentId) {
      return;
    }

    if (!selectedReportCategory) {
      Alert.alert('신고 유형 선택', '신고 유형을 선택해주세요.');
      return;
    }

    if (!reportReason.trim()) {
      Alert.alert('신고 사유 입력', '신고 사유를 입력해주세요.');
      return;
    }

    try {
      setIsReportSubmitting(true);
      await submitNoticeCommentReport(
        reportRepository,
        reportTargetCommentId,
        selectedReportCategory,
        reportReason,
      );

      handleCloseReportModal();
      Alert.alert(
        '신고 접수 완료',
        '신고가 접수되었습니다. 운영팀이 확인 후 처리할 예정입니다.',
      );
    } catch (caughtError) {
      Alert.alert(
        '오류',
        caughtError instanceof Error
          ? caughtError.message
          : '신고 접수에 실패했습니다.',
      );
    } finally {
      setIsReportSubmitting(false);
    }
  }, [
    handleCloseReportModal,
    reportReason,
    reportRepository,
    reportTargetCommentId,
    selectedReportCategory,
  ]);

  const handleToggleLike = React.useCallback(() => {
    toggleLike().catch(toggleError => {
      Alert.alert(
        '오류',
        toggleError instanceof Error
          ? toggleError.message
          : '좋아요 처리에 실패했습니다.',
      );
    });
  }, [toggleLike]);

  const handleToggleBookmark = React.useCallback(() => {
    toggleBookmark().catch(toggleError => {
      Alert.alert(
        '오류',
        toggleError instanceof Error
          ? toggleError.message
          : '북마크 처리에 실패했습니다.',
      );
    });
  }, [toggleBookmark]);

  const handleToggleCommentLike = React.useCallback(
    (commentId: string) => {
      toggleCommentLike(commentId).catch(toggleError => {
        Alert.alert(
          '오류',
          toggleError instanceof Error
            ? toggleError.message
            : '댓글 좋아요 처리에 실패했습니다.',
        );
      });
    },
    [toggleCommentLike],
  );

  const handleDeleteComment = React.useCallback(
    (commentId: string) => {
      Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteComment(commentId).catch(deleteError => {
              Alert.alert(
                '오류',
                deleteError instanceof Error
                  ? deleteError.message
                  : '댓글 삭제에 실패했습니다.',
              );
            });
          },
        },
      ]);
    },
    [deleteComment],
  );

  const handleSubmitComment = React.useCallback(() => {
    submitComment()
      .then(result => {
        const targetCommentId = result?.commentId;

        composerRef.current?.blur();
        Keyboard.dismiss();

        if (!targetCommentId) {
          return;
        }

        pendingScrollCommentIdRef.current = targetCommentId;

        setTimeout(() => {
          const commentOffset = commentOffsetMapRef.current.get(targetCommentId);
          const commentsListOffset = commentsListOffsetRef.current;

          if (commentOffset == null) {
            return;
          }

          pendingScrollCommentIdRef.current = null;
          scrollViewRef.current?.scrollTo({
            animated: true,
            y: Math.max(
              0,
              commentsListOffset + commentOffset - headerOffset - SPACING.md,
            ),
          });
        }, commentScrollAnimationDelay);
      })
      .catch(submitError => {
        Alert.alert(
          '오류',
          submitError instanceof Error
            ? submitError.message
            : isEditingComment
            ? '댓글 수정에 실패했습니다.'
            : isReplyingComment
            ? '답글 작성에 실패했습니다.'
            : '댓글 작성에 실패했습니다.',
        );
      });
  }, [
    commentScrollAnimationDelay,
    headerOffset,
    isEditingComment,
    isReplyingComment,
    submitComment,
  ]);

  const handleStartEditingComment = React.useCallback(
    (commentId: string) => {
      startEditingComment(commentId);
      pendingScrollCommentIdRef.current = commentId;
      const commentOffset = commentOffsetMapRef.current.get(commentId);
      const commentsListOffset = commentsListOffsetRef.current;

      if (commentOffset != null) {
        pendingScrollCommentIdRef.current = null;
        scrollViewRef.current?.scrollTo({
          animated: true,
          y: Math.max(
            0,
            commentsListOffset + commentOffset - headerOffset - SPACING.md,
          ),
        });
      }

      setTimeout(() => {
        composerRef.current?.focus();
      }, commentScrollAnimationDelay);
    },
    [commentScrollAnimationDelay, headerOffset, startEditingComment],
  );

  const handleStartReplyingComment = React.useCallback(
    (commentId: string) => {
      startReplyingComment(commentId);
      pendingScrollCommentIdRef.current = commentId;
      const commentOffset = commentOffsetMapRef.current.get(commentId);
      const commentsListOffset = commentsListOffsetRef.current;

      if (commentOffset != null) {
        pendingScrollCommentIdRef.current = null;
        scrollViewRef.current?.scrollTo({
          animated: true,
          y: Math.max(
            0,
            commentsListOffset + commentOffset - headerOffset - SPACING.md,
          ),
        });
      }

      setTimeout(() => {
        composerRef.current?.focus();
      }, commentScrollAnimationDelay);
    },
    [commentScrollAnimationDelay, headerOffset, startReplyingComment],
  );

  const handleCancelCommentEdit = React.useCallback(() => {
    cancelCommentEdit();
    composerRef.current?.blur();
    Keyboard.dismiss();
  }, [cancelCommentEdit]);

  const handleCancelCommentReply = React.useCallback(() => {
    cancelCommentReply();
  }, [cancelCommentReply]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const handleCommentLayout = React.useCallback(
    (commentId: string, event: LayoutChangeEvent) => {
      const nextOffset = event.nativeEvent.layout.y;
      commentOffsetMapRef.current.set(commentId, nextOffset);

      if (pendingScrollCommentIdRef.current !== commentId) {
        return;
      }

      pendingScrollCommentIdRef.current = null;
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(
          0,
          commentsListOffsetRef.current + nextOffset - headerOffset - SPACING.md,
        ),
      });
    },
    [headerOffset],
  );

  const handleCommentsListLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      commentsListOffsetRef.current = event.nativeEvent.layout.y;

      const pendingCommentId = pendingScrollCommentIdRef.current;

      if (!pendingCommentId) {
        return;
      }

      const commentOffset = commentOffsetMapRef.current.get(pendingCommentId);

      if (commentOffset == null) {
        return;
      }

      pendingScrollCommentIdRef.current = null;
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(
          0,
          commentsListOffsetRef.current + commentOffset - headerOffset - SPACING.md,
        ),
      });
    },
    [headerOffset],
  );

  React.useEffect(() => {
    if (
      !initialCommentId ||
      lastAppliedInitialCommentIdRef.current === initialCommentId ||
      commentItems.length === 0
    ) {
      return;
    }

    lastAppliedInitialCommentIdRef.current = initialCommentId;
    pendingScrollCommentIdRef.current = initialCommentId;

    const timeoutId = setTimeout(() => {
      const commentOffset = commentOffsetMapRef.current.get(initialCommentId);
      const commentsListOffset = commentsListOffsetRef.current;

      if (commentOffset == null) {
        return;
      }

      pendingScrollCommentIdRef.current = null;
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(
          0,
          commentsListOffset + commentOffset - headerOffset - SPACING.md,
        ),
      });
    }, commentScrollAnimationDelay);

    return () => clearTimeout(timeoutId);
  }, [commentItems.length, commentScrollAnimationDelay, headerOffset, initialCommentId]);

  const handleOpenExternalLink = React.useCallback(() => {
    const targetUrl = notice?.link?.trim();

    if (!targetUrl) {
      Alert.alert('안내', '외부 링크를 찾을 수 없습니다.');
      return;
    }

    Linking.openURL(targetUrl).catch(openError => {
      Alert.alert(
        '오류',
        openError instanceof Error
          ? openError.message
          : '외부 브라우저를 열지 못했습니다.',
      );
    });
  }, [notice?.link]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        {loading && !data ? (
          <ArticleDetailSkeleton headerOffset={headerOffset} />
        ) : notFound && !data ? (
          <View style={[styles.centeredState, {paddingTop: headerOffset}]}>
            <DetailNotFoundState
              actionLabel="목록으로 돌아가기"
              onPressAction={handlePressReturnToList}
              title="공지사항을 찾을 수 없어요"
            />
          </View>
        ) : error && !data ? (
          <View style={[styles.centeredState, {paddingTop: headerOffset}]}>
            <StateCard
              actionLabel="다시 시도"
              description={error}
              icon={
                <Icon
                  color={COLORS.accent.orange}
                  name="alert-circle-outline"
                  size={28}
                />
              }
              onPressAction={() => {
                reload().catch(() => undefined);
              }}
              title="공지사항을 불러오지 못했습니다"
            />
          </View>
        ) : data ? (
          <>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom: scrollBottomPadding,
                  paddingTop: headerOffset,
                },
              ]}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              onLayout={handleViewportLayout}
              onScroll={handleScroll}
              refreshControl={
                <RefreshControl
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                  tintColor={COLORS.brand.primary}
                  progressViewOffset={headerOffset}
                />
              }
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}>
              <DetailTitleHeader
                authorLabel={data.authorLabel}
                badges={data.metaBadges}
                dateLabel={data.dateLabel}
                title={data.title}
                viewCountLabel={data.viewCountLabel}
              />
              <View style={styles.divider} />

              <View
                onLayout={event =>
                  setBodyContentHeight(event.nativeEvent.layout.height)
                }>
                <DetailBodyBlocks blocks={data.bodyBlocks} />

                {notice?.contentAttachments.length ? (
                  <View style={styles.attachmentsSection}>
                    <NoticeDetailAttachments
                      attachments={notice.contentAttachments}
                    />
                  </View>
                ) : null}
              </View>

              {isDetailAdEligible(bodyContentHeight) ? (
                <InlineBannerAd
                  onLayout={handleAdLayout}
                  placement="noticeDetail"
                  visible={isAdVisible}
                />
              ) : null}

              <View style={styles.reactionsRow}>
                <View style={styles.reactionsGroup}>
                  <DetailReactionChip
                    accessibilityLabel="공지사항 좋아요"
                    active={Boolean(notice?.isLiked)}
                    count={notice?.likeCount ?? 0}
                    disabled={togglingLike}
                    iconName={notice?.isLiked ? 'heart' : 'heart-outline'}
                    onPress={handleToggleLike}
                  />
                  <DetailReactionChip
                    accessibilityLabel="공지사항 북마크"
                    active={Boolean(notice?.isBookmarked)}
                    count={notice?.bookmarkCount ?? 0}
                    disabled={togglingBookmark}
                    iconName={
                      notice?.isBookmarked ? 'bookmark' : 'bookmark-outline'
                    }
                    onPress={handleToggleBookmark}
                  />
                </View>
                {notice?.link?.trim() ? (
                  <TouchableOpacity
                    accessibilityLabel="외부 브라우저에서 공지 열기"
                    accessibilityRole="button"
                    activeOpacity={0.86}
                    onPress={handleOpenExternalLink}
                    style={styles.externalLinkButton}>
                    <Icon
                      color={COLORS.brand.primaryStrong}
                      name="open-outline"
                      size={16}
                    />
                    <Text style={styles.externalLinkButtonLabel}>
                      원문 보기
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={[styles.divider, styles.commentsDivider]} />
              <Text style={styles.commentsTitle}>
                댓글 {commentItems.length}
              </Text>

              {commentItems.length === 0 ? (
                <View style={styles.emptyCommentsWrap}>
                  <Text style={styles.emptyCommentsLabel}>
                    {data.emptyCommentsLabel}
                  </Text>
                </View>
              ) : (
                <View
                  onLayout={handleCommentsListLayout}
                  style={styles.commentsList}>
                  {commentItems.map(comment => (
                    <View
                      key={comment.id}
                      onLayout={event => handleCommentLayout(comment.id, event)}>
                      <DetailCommentCard
                        comment={comment}
                        likeDisabled={commentLikePendingIds.includes(comment.id)}
                        onPressEdit={
                          comment.isEditable
                            ? () => handleStartEditingComment(comment.id)
                            : undefined
                        }
                        onPressDelete={
                          comment.isEditable
                            ? () => handleDeleteComment(comment.id)
                            : undefined
                        }
                        onPressLike={
                          comment.isDeleted
                            ? undefined
                            : () => handleToggleCommentLike(comment.id)
                        }
                        onPressReply={
                          comment.isDeleted
                            ? undefined
                            : () => handleStartReplyingComment(comment.id)
                        }
                        onPressReport={
                          comment.isDeleted || comment.isMine
                            ? undefined
                            : () => handleOpenCommentReport(comment.id)
                        }
                        onPressBlock={
                          comment.isDeleted || comment.isMine
                            ? undefined
                            : () => handlePressBlockComment(comment.id)
                        }
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'position' : 'height'}
              keyboardVerticalOffset={0}
              pointerEvents="box-none"
              style={styles.composerAvoidingView}>
              {isEditingComment ? (
                <View style={styles.editingBanner}>
                  <Text style={styles.editingBannerText}>댓글 수정 중</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleCancelCommentEdit}>
                    <Text style={styles.editingBannerAction}>취소</Text>
                  </TouchableOpacity>
                </View>
              ) : isReplyingComment ? (
                <View style={styles.editingBanner}>
                  <Text style={styles.editingBannerText}>
                    {replyTargetLabel}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleCancelCommentReply}>
                    <Text style={styles.editingBannerAction}>취소</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <DetailComposer
                anonymousChecked={commentAnonymousValue}
                anonymousDisabled={commentAnonymousDisabled}
                anonymousLabel="익명"
                ref={composerRef}
                onChangeText={setCommentDraft}
                onSend={handleSubmitComment}
                onToggleAnonymous={toggleCommentAnonymousPreference}
                placeholder={
                  editingCommentId
                    ? '댓글을 수정하세요...'
                    : isReplyingComment
                    ? '답글을 입력하세요...'
                    : data.commentInputPlaceholder
                }
                sendEnabled={
                  !submittingComment && commentDraft.trim().length > 0
                }
                textInputProps={{
                  blurOnSubmit: false,
                  returnKeyType: 'done',
                }}
                value={commentDraft}
              />
            </KeyboardAvoidingView>
          </>
        ) : null}

        <DetailBackHeader
          onPressBack={handlePressBack}
          rightAccessory={
            notice ? (
              <TouchableOpacity
                accessibilityLabel="공지 링크 복사"
                accessibilityRole="button"
                accessibilityState={{disabled: isCopyingShareUrl}}
                activeOpacity={0.82}
                disabled={isCopyingShareUrl}
                onPress={handlePressShare}
                style={styles.shareButton}>
                <Icon
                  color={COLORS.text.secondary}
                  name="link"
                  size={20}
                />
                <Text style={styles.shareButtonLabel}>공지 공유하기</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
        <ReportReasonModal
          categories={NOTICE_REPORT_CATEGORIES}
          onChangeReason={setReportReason}
          onClose={handleCloseReportModal}
          onSelectCategory={setSelectedReportCategory}
          onSubmit={() => {
            handleSubmitReport().catch(() => undefined);
          }}
          reason={reportReason}
          selectedCategory={selectedReportCategory}
          submitting={isReportSubmitting}
          title="공지 댓글 신고"
          visible={isReportVisible}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  attachmentsSection: {
    marginTop: SPACING.xxl,
  },
  centeredState: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  commentsDivider: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  commentsList: {
    paddingBottom: SPACING.md,
  },
  commentsTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  composerAvoidingView: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  divider: {
    backgroundColor: COLORS.border.default,
    height: 1,
    marginBottom: SPACING.xxl,
  },
  editingBanner: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  editingBannerAction: {
    color: COLORS.brand.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  editingBannerText: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCommentsLabel: {
    color: COLORS.text.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCommentsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 84,
    paddingVertical: 32,
  },
  externalLinkButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.brand.primarySoft,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: SPACING.md,
  },
  externalLinkButtonLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  reactionsGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  reactionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  shareButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  shareButtonLabel: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
