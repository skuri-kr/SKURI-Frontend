import React from 'react';
import {
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
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {
  copyShareUrlToClipboard,
  createContentShareUrl,
} from '@/app/linking';
import {
  invalidateData,
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {
  BOARD_DETAIL_READ_INVALIDATION_KEYS,
  CONTENT_BLOCKS_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {useReportRepository} from '@/di';
import {
  useContentBlockAction,
  type ContentBlockTarget,
} from '@/features/content-block';
import type {ReportCategory} from '@/features/report';
import {
  InlineBannerAd,
  isDetailAdEligible,
  useScrollViewAdVisibility,
} from '@/shared/ads';
import {
  DetailBackHeader,
  DetailBodyBlocks,
  DetailCommentCard,
  DetailComposer,
  ArticleDetailSkeleton,
  DetailNotFoundState,
  DetailReactionChip,
  DetailTitleHeader,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useToast} from '@/shared/ui/ToastProvider';
import {
  useKeyboardInset,
  useScreenEnterAnimation,
  useScreenView,
} from '@/shared/hooks';

import {BoardDetailPopupMenu} from '../components/BoardDetailPopupMenu';
import {BoardReportModal} from '../components/BoardReportModal';
import {useBoardDetailData} from '../hooks/useBoardDetailData';
import type {BoardStackParamList} from '../model/navigation';
import {
  BOARD_REPORT_CATEGORIES,
  submitBoardCommentReport,
  submitBoardPostReport,
} from '../services/boardReportService';

type BoardDetailNavigationProp = NativeStackNavigationProp<
  BoardStackParamList,
  'BoardDetail'
>;

export const BoardDetailScreen = () => {
  useScreenView();

  const navigation = useNavigation<BoardDetailNavigationProp>();
  const route =
    useRoute<
      NativeStackScreenProps<BoardStackParamList, 'BoardDetail'>['route']
    >();
  const reportRepository = useReportRepository();
  const {showToast} = useToast();
  const insets = useSafeAreaInsets();
  const {height: keyboardHeight, isVisible: isKeyboardVisible} =
    useKeyboardInset();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = React.useState(false);
  const [isReportVisible, setIsReportVisible] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [selectedReportCategory, setSelectedReportCategory] =
    React.useState<ReportCategory | null>(null);
  const [reportTarget, setReportTarget] = React.useState<
    | {id: string; type: 'comment'}
    | {id: string; type: 'post'}
    | null
  >(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isCopyingShareUrl, setIsCopyingShareUrl] = React.useState(false);
  const [bodyContentHeight, setBodyContentHeight] = React.useState(0);
  const {
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
    isEditingComment,
    isReplyingComment,
    loading,
    notFound,
    post,
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
  } = useBoardDetailData(route.params?.postId);

  useRefetchOnFocus({
    invalidationKey: CONTENT_BLOCKS_INVALIDATION_KEY,
    refetch: reload,
  });

  React.useEffect(() => {
    setBodyContentHeight(0);
  }, [route.params?.postId]);

  const headerOffset = insets.top + 56;
  const initialCommentId = route.params?.initialCommentId;
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

    navigation.navigate('BoardMain');
  }, [navigation]);

  const handlePressReturnToList = React.useCallback(() => {
    navigation.navigate('BoardMain');
  }, [navigation]);

  const handleContentBlocked = React.useCallback(
    async (target: ContentBlockTarget) => {
      invalidateData(BOARD_DETAIL_READ_INVALIDATION_KEYS);

      if (target.targetType === 'POST') {
        handlePressBack();
        return;
      }

      await reload();
    },
    [handlePressBack, reload],
  );
  const {requestContentBlock} = useContentBlockAction({
    onBlocked: handleContentBlocked,
    scopeId: route.params?.postId,
  });

  const handlePressBlockPost = React.useCallback(() => {
    if (!post || post.isDeleted || canManageActions) {
      return;
    }

    setIsMenuVisible(false);
    requestContentBlock({targetId: post.id, targetType: 'POST'});
  }, [canManageActions, post, requestContentBlock]);

  const handlePressBlockComment = React.useCallback(
    (commentId: string) => {
      requestContentBlock({targetId: commentId, targetType: 'COMMENT'});
    },
    [requestContentBlock],
  );

  const handleCloseReportModal = React.useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setIsReportVisible(false);
    setReportTarget(null);
    setSelectedReportCategory(null);
    setReportReason('');
  }, [isReportSubmitting]);

  const handleOpenPostReport = React.useCallback(() => {
    if (!post) {
      return;
    }

    setIsMenuVisible(false);
    setReportTarget({id: post.id, type: 'post'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, [post]);

  const handleOpenCommentReport = React.useCallback((commentId: string) => {
    setReportTarget({id: commentId, type: 'comment'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, []);

  const handleSubmitReport = React.useCallback(async () => {
    if (!reportTarget) {
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

      if (reportTarget.type === 'post') {
        await submitBoardPostReport(
          reportRepository,
          reportTarget.id,
          selectedReportCategory,
          reportReason,
        );
      } else {
        await submitBoardCommentReport(
          reportRepository,
          reportTarget.id,
          selectedReportCategory,
          reportReason,
        );
      }

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
    reportTarget,
    selectedReportCategory,
  ]);

  const handlePressEdit = React.useCallback(() => {
    if (route.params?.postId) {
      navigation.navigate('BoardEdit', {postId: route.params.postId});
      return;
    }

    Alert.alert('게시글 수정', '수정할 게시글 정보를 찾지 못했습니다.');
  }, [navigation, route.params?.postId]);

  const handlePressShare = React.useCallback(async () => {
    const postId = route.params?.postId;
    if (!postId || isCopyingShareUrl) {
      return;
    }

    setIsCopyingShareUrl(true);
    try {
      const shareUrl = await createContentShareUrl('BOARD', postId);
      copyShareUrlToClipboard(shareUrl, showToast);
    } catch {
      Alert.alert('복사 오류', '게시글 링크를 복사하지 못했습니다.');
    } finally {
      setIsCopyingShareUrl(false);
    }
  }, [isCopyingShareUrl, route.params?.postId, showToast]);

  const handlePressDelete = React.useCallback(() => {
    Alert.alert('게시글 삭제', '이 게시글을 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deletePost()
            .then(() => {
              navigation.reset({
                index: 0,
                routes: [{name: 'BoardMain'}],
              });
            })
            .catch(deleteError => {
              Alert.alert(
                '오류',
                deleteError instanceof Error
                  ? deleteError.message
                  : '게시글 삭제에 실패했습니다.',
              );
            });
        },
      },
    ]);
  }, [deletePost, navigation]);

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

  const rightAccessory = data ? (
    <TouchableOpacity
      accessibilityLabel="게시물 메뉴"
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={() => {
        setIsMenuVisible(previous => !previous);
      }}
      style={styles.menuButton}>
      <Icon color={COLORS.text.secondary} name="ellipsis-vertical" size={18} />
    </TouchableOpacity>
  ) : undefined;

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
              title="게시물을 찾을 수 없어요"
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
              title="게시물을 불러오지 못했습니다"
            />
          </View>
        ) : data ? (
          <>
            <ScrollView
              ref={scrollViewRef}
              contentInsetAdjustmentBehavior="never"
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
              onScrollBeginDrag={() => {
                if (isMenuVisible) {
                  setIsMenuVisible(false);
                }
              }}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  onRefresh={handleRefresh}
                  progressViewOffset={headerOffset}
                  refreshing={refreshing}
                  tintColor={COLORS.brand.primary}
                />
              }
              showsVerticalScrollIndicator={false}>
              <DetailTitleHeader
                authorLabel={data.authorLabel}
                authorProfileImage={data.authorProfileImage}
                isAuthorAdmin={data.isAuthorAdmin}
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
              </View>

              {isDetailAdEligible(bodyContentHeight) && !post?.isDeleted ? (
                <InlineBannerAd
                  onLayout={handleAdLayout}
                  placement="communityBoardDetail"
                  visible={isAdVisible}
                />
              ) : null}

              <View style={styles.reactionsRow}>
                <DetailReactionChip
                  accessibilityLabel="게시글 좋아요"
                  active={Boolean(post?.isLiked)}
                  count={post?.likeCount ?? 0}
                  disabled={togglingLike}
                  iconName={post?.isLiked ? 'heart' : 'heart-outline'}
                  onPress={handleToggleLike}
                />
                <DetailReactionChip
                  accessibilityLabel="게시글 북마크"
                  active={Boolean(post?.isBookmarked)}
                  count={post?.bookmarkCount ?? 0}
                  disabled={togglingBookmark}
                  iconName={
                    post?.isBookmarked ? 'bookmark' : 'bookmark-outline'
                  }
                  onPress={handleToggleBookmark}
                />
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
          rightAccessory={rightAccessory}
        />
        <BoardDetailPopupMenu
          onClose={() => {
            setIsMenuVisible(false);
          }}
          onPressBlock={handlePressBlockPost}
          onPressDelete={handlePressDelete}
          onPressEdit={handlePressEdit}
          onPressReport={handleOpenPostReport}
          onPressShare={handlePressShare}
          right={12}
          showBlockAction={Boolean(
            post && !post.isDeleted && !canManageActions,
          )}
          showManageActions={canManageActions}
          top={insets.top + 44}
          visible={isMenuVisible && !deletingPost}
        />
        <BoardReportModal
          categories={BOARD_REPORT_CATEGORIES}
          onChangeReason={setReportReason}
          onClose={handleCloseReportModal}
          onSelectCategory={setSelectedReportCategory}
          onSubmit={() => {
            handleSubmitReport().catch(() => undefined);
          }}
          reason={reportReason}
          selectedCategory={selectedReportCategory}
          submitting={isReportSubmitting}
          title={reportTarget?.type === 'comment' ? '댓글 신고' : '게시글 신고'}
          visible={isReportVisible}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: SPACING.xl,
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
  menuButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginRight: -6,
    width: 36,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
});
