import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {ContentDetailBadgeViewData} from '@/shared/types/contentDetailViewData';
import {COLORS, SPACING} from '@/shared/design-system/tokens';

import {ProfileAvatar} from './ProfileAvatar';
import {ToneBadge} from './ToneBadge';

interface DetailTitleHeaderProps {
  authorLabel?: string;
  authorProfileImage?: string | null;
  badges?: ContentDetailBadgeViewData[];
  dateLabel?: string;
  title: string;
  viewCountLabel?: string;
}

export const DetailTitleHeader = ({
  authorLabel,
  authorProfileImage,
  badges = [],
  dateLabel,
  title,
  viewCountLabel,
}: DetailTitleHeaderProps) => {
  const [primaryBadge, ...secondaryBadges] = badges;

  return (
    <View style={styles.container}>
      {primaryBadge || dateLabel || secondaryBadges.length > 0 ? (
        <View style={styles.metaRow}>
          {primaryBadge ? (
            <ToneBadge label={primaryBadge.label} tone={primaryBadge.tone} />
          ) : null}
          {dateLabel ? <Text style={styles.dateLabel}>{dateLabel}</Text> : null}
          {secondaryBadges.map(badge => (
            <ToneBadge key={badge.id} label={badge.label} tone={badge.tone} />
          ))}
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>

      {authorLabel || viewCountLabel ? (
        <View style={styles.authorRow}>
          <View style={styles.authorMetaGroup}>
            {authorLabel ? (
              <>
                <ProfileAvatar photoUrl={authorProfileImage} />
                <Text style={styles.authorLabel}>{authorLabel}</Text>
              </>
            ) : null}
          </View>

          {viewCountLabel ? (
            <View style={styles.viewCountRow}>
              <Icon color={COLORS.text.muted} name="eye-outline" size={14} />
              <Text style={styles.viewCountLabel}>{viewCountLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  authorLabel: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  authorRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  authorMetaGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    minWidth: 0,
  },
  container: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  dateLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    alignItems: 'center',
    columnGap: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: SPACING.xs,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  viewCountLabel: {
    color: COLORS.text.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  viewCountRow: {
    alignItems: 'center',
    columnGap: 4,
    flexDirection: 'row',
    flexShrink: 0,
  },
});
