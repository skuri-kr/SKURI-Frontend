import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type {ContentDetailCommentViewData} from '@/shared/types/contentDetailViewData';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../tokens';
import {LinkifiedText} from './LinkifiedText';
import {ProfileAvatar} from './ProfileAvatar';
import {VerifiedAuthorBadge} from './VerifiedAuthorBadge';

interface DetailCommentCardProps {
  comment: ContentDetailCommentViewData;
  deleteDisabled?: boolean;
  likeDisabled?: boolean;
  onPressDelete?: () => void;
  onPressEdit?: () => void;
  onPressLike?: () => void;
  onPressReport?: () => void;
  onPressReply?: () => void;
  replyDisabled?: boolean;
}

export const DetailCommentCard = ({
  comment,
  deleteDisabled = false,
  likeDisabled = false,
  onPressDelete,
  onPressEdit,
  onPressLike,
  onPressReport,
  onPressReply,
  replyDisabled = false,
}: DetailCommentCardProps) => {
  const showManageActions = Boolean(
    comment.isMine && (onPressEdit || onPressDelete),
  );
  const showReportAction = Boolean(!comment.isMine && onPressReport);

  return (
    <View style={[styles.card, comment.isReply ? styles.replyCard : null]}>
      <View style={styles.headerRow}>
        <View style={styles.authorRow}>
          <ProfileAvatar
            fallbackBackgroundColor={COLORS.background.subtle}
            photoUrl={comment.authorProfileImage}
            size={24}
          />
          <Text style={styles.authorLabel}>{comment.authorLabel}</Text>
          {comment.isAuthorAdmin ? <VerifiedAuthorBadge /> : null}
          {comment.isPostAuthor ? (
            <View style={[styles.metaBadge, styles.postAuthorBadge]}>
              <Text style={[styles.metaBadgeLabel, styles.postAuthorBadgeLabel]}>
                작성자
              </Text>
            </View>
          ) : null}
          {comment.isMine ? (
            <View style={[styles.metaBadge, styles.mineBadge]}>
              <Text style={[styles.metaBadgeLabel, styles.mineBadgeLabel]}>
                나
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.dateLabel}>{comment.dateLabel}</Text>
      </View>

      {comment.replyTargetLabel ? (
        <View style={styles.replyTargetBadge}>
          <Text style={styles.replyTargetText}>{comment.replyTargetLabel}</Text>
        </View>
      ) : null}

      {comment.isDeleted ? (
        <Text selectable={false} style={styles.bodyText}>
          {comment.body}
        </Text>
      ) : (
        <LinkifiedText selectable style={styles.bodyText} text={comment.body} />
      )}

      {!comment.isDeleted ? (
        <View style={styles.footerRow}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={likeDisabled ? 1 : 0.8}
              disabled={likeDisabled || !onPressLike}
              onPress={onPressLike}
              style={styles.actionButton}>
              <Icon
                color={
                  comment.isLiked
                    ? COLORS.brand.primary
                    : COLORS.text.secondary
                }
                name={comment.isLiked ? 'heart' : 'heart-outline'}
                size={14}
              />
              <Text
                style={[
                  styles.actionButtonLabel,
                  comment.isLiked ? styles.activeActionButtonLabel : null,
                ]}>
                좋아요 {comment.likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={replyDisabled ? 1 : 0.8}
              disabled={replyDisabled || !onPressReply}
              onPress={onPressReply}
              style={styles.actionButton}>
              <Icon
                color={COLORS.text.secondary}
                name="chatbubble-ellipses-outline"
                size={14}
              />
              <Text style={styles.actionButtonLabel}>답글</Text>
            </TouchableOpacity>
          </View>

          {showManageActions || showReportAction ? (
            <View style={styles.trailingActionsRow}>
              {showManageActions && onPressEdit ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={onPressEdit}>
                  <Text style={styles.actionLabel}>수정</Text>
                </TouchableOpacity>
              ) : null}
              {showManageActions && onPressDelete ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={deleteDisabled ? 1 : 0.8}
                  disabled={deleteDisabled}
                  onPress={onPressDelete}>
                  <Text style={styles.deleteActionLabel}>삭제</Text>
                </TouchableOpacity>
              ) : null}
              {showReportAction && onPressReport ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={onPressReport}
                  style={styles.reportButton}>
                  <Text style={styles.reportButtonLabel}>신고</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  replyCard: {
    marginLeft: SPACING.xl,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  authorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  authorLabel: {
    color: COLORS.text.strong,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  metaBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  metaBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  postAuthorBadge: {
    backgroundColor: COLORS.accent.orangeSoft,
  },
  postAuthorBadgeLabel: {
    color: COLORS.accent.orange,
  },
  mineBadge: {
    backgroundColor: COLORS.brand.primaryTint,
  },
  mineBadgeLabel: {
    color: COLORS.brand.primaryStrong,
  },
  actionLabel: {
    color: COLORS.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  deleteActionLabel: {
    color: COLORS.status.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  dateLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: SPACING.sm,
  },
  bodyText: {
    color: COLORS.text.strong,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: SPACING.sm,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButtonLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  activeActionButtonLabel: {
    color: COLORS.brand.primary,
    fontWeight: '700',
  },
  replyTargetBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  replyTargetText: {
    color: COLORS.brand.primaryStrong,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  trailingActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  reportButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  reportButtonLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
