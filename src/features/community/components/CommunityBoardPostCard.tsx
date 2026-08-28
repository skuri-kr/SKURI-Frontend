import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {
  ContentStatsRow,
  ListCardThumbnail,
  ProfileAvatar,
  VerifiedAuthorBadge,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

import type {CommunityBoardPostViewData} from '../model/communityViewData';

interface CommunityBoardPostCardProps {
  item: CommunityBoardPostViewData;
  onPress: (postId: string) => void;
}

export const CommunityBoardPostCard = ({
  item,
  onPress,
}: CommunityBoardPostCardProps) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      onPress={() => onPress(item.id)}
      style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryLabel}>{item.categoryLabel}</Text>
        </View>
        <Text style={styles.timeLabel}>{item.timeLabel}</Text>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.contentTextColumn}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>

          <Text
            numberOfLines={item.thumbnailUrl ? 2 : 3}
            style={styles.excerpt}>
            {item.excerpt}
          </Text>
        </View>

        {item.thumbnailUrl ? (
          <ListCardThumbnail
            accessibilityLabel={`${item.title} 썸네일`}
            uri={item.thumbnailUrl}
          />
        ) : null}
      </View>

      <View style={styles.footerRow}>
        <View style={styles.authorRow}>
          <ProfileAvatar photoUrl={item.authorProfileImage} size={20} />
          <Text style={styles.authorLabel}>{item.authorLabel}</Text>
          {item.isAuthorAdmin ? <VerifiedAuthorBadge /> : null}
        </View>
        <ContentStatsRow
          bookmarkCount={item.bookmarkCount}
          commentCount={item.commentCount}
          isBookmarked={item.isBookmarked}
          isCommentedByMe={item.isCommentedByMe}
          isLiked={item.isLiked}
          likeCount={item.likeCount}
          viewCount={item.viewCount}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    minHeight: 136,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  categoryLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  contentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  contentTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  timeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.xs,
    minWidth: 0,
  },
  excerpt: {
    color: COLORS.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  authorLabel: {
    color: '#6B7280',
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    marginRight: SPACING.sm,
  },
  authorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    minWidth: 0,
  },
});
