import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SPACING,
} from '@/shared/design-system/tokens';

import type {TaxiChatSummaryViewData} from '../model/taxiChatViewData';

interface TaxiChatSummaryCardProps {
  summary: TaxiChatSummaryViewData;
}

const formatTagLabel = (tag: string) => {
  const trimmed = tag.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

const renderStatusCopy = (status: TaxiChatSummaryViewData['partyStatus']) => {
  switch (status) {
    case 'closed':
      return '모집 마감';
    case 'arrived':
      return '도착 / 정산 중';
    case 'ended':
      return '파티 종료';
    case 'open':
    default:
      return '모집 중';
  }
};

export const TaxiChatSummaryCard = ({
  summary,
}: TaxiChatSummaryCardProps) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.routeSide}>
            <View style={[styles.routeIconWrap, styles.departureIconWrap]}>
              <Icon color={COLORS.background.surface} name="location" size={12} />
            </View>
            <Text numberOfLines={1} style={styles.routeLabel}>
              {summary.departureLabel}
            </Text>
          </View>

          <Icon color={COLORS.text.muted} name="arrow-forward-outline" size={14} />

          <View style={[styles.routeSide, styles.routeSideEnd]}>
            <Text numberOfLines={1} style={styles.routeLabel}>
              {summary.destinationLabel}
            </Text>
            <View style={[styles.routeIconWrap, styles.destinationIconWrap]}>
              <Icon
                color={COLORS.background.surface}
                name="business-outline"
                size={12}
              />
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon color={COLORS.text.secondary} name="time-outline" size={12} />
            <Text style={styles.metaLabel}>{summary.departureTimeLabel}</Text>
          </View>

          <View style={styles.metaItem}>
            <Icon color={COLORS.accent.orange} name="people-outline" size={12} />
            <Text style={styles.metaLabel}>{summary.memberSummaryLabel}</Text>
          </View>

          <View style={styles.tagPill}>
            <Text style={styles.tagLabel}>{`예상 N빵요금 : ${summary.estimatedFareLabel}`}</Text>
          </View>
        </View>

        {summary.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {summary.tags.map(tag => {
              const formattedTag = formatTagLabel(tag);

              if (!formattedTag) {
                return null;
              }

              return (
                <View key={formattedTag} style={styles.secondaryTagPill}>
                  <Text style={styles.secondaryTagLabel}>{formattedTag}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <Text style={styles.statusLabel}>
              {renderStatusCopy(summary.partyStatus)}
            </Text>
          </View>

          {summary.detail ? (
            <Text numberOfLines={1} style={styles.detailLabel}>
              {summary.detail}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  departureIconWrap: {
    backgroundColor: COLORS.accent.yellow,
  },
  destinationIconWrap: {
    backgroundColor: COLORS.accent.orange,
  },
  detailLabel: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  routeCard: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.accent.yellowBorder,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
  },
  routeIconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  routeLabel: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  routeSide: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  routeSideEnd: {
    justifyContent: 'flex-end',
  },
  statusLabel: {
    color: COLORS.accent.yellowStrong,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.yellowSoft,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tagLabel: {
    color: COLORS.accent.yellowStrong,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.yellowSoft,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 18,
    marginLeft: 'auto',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  secondaryTagLabel: {
    color: COLORS.text.secondary,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  secondaryTagPill: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 18,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  wrap: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
});
