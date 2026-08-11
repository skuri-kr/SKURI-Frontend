import React from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {ToneBadge} from '@/shared/design-system/components';

import type {TaxiChatSettlementNoticeViewData} from '../model/taxiChatViewData';

interface TaxiChatHeaderNoticeProps {
  settlementNotice?: TaxiChatSettlementNoticeViewData;
}

const formatCurrency = (value?: number) =>
  value ? `${value.toLocaleString('ko-KR')}원` : '미정';

const buildSettlementSubtitle = (
  settlementNotice: TaxiChatSettlementNoticeViewData,
) => {
  const segments: string[] = [];

  if (settlementNotice.perPersonAmount) {
    segments.push(`1인당 ${formatCurrency(settlementNotice.perPersonAmount)}`);
  }

  if (settlementNotice.accountLabel) {
    segments.push(settlementNotice.accountLabel);
  }

  return segments.join(' · ') || settlementNotice.description;
};

const buildSettlementMemberStatusLabel = (
  member: TaxiChatSettlementNoticeViewData['members'][number],
) => {
  if (member.leftParty) {
    return member.settled ? '파티 나감' : '파티 나감 · 미정산';
  }

  return member.settled ? '정산 완료' : '정산 중';
};

const SETTLEMENT_NOTICE_DURATION = 160;

export const TaxiChatHeaderNotice = ({
  settlementNotice,
}: TaxiChatHeaderNoticeProps) => {
  const [expanded, setExpanded] = React.useState(false);
  const [expandedContentHeight, setExpandedContentHeight] = React.useState(0);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    setExpanded(false);
  }, [
    settlementNotice?.completedCount,
    settlementNotice?.summaryLabel,
    settlementNotice?.totalCount,
  ]);

  React.useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: SETTLEMENT_NOTICE_DURATION,
    });
  }, [expanded, progress]);

  const handleExpandedCardLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const {height} = event.nativeEvent.layout;

      if (height !== expandedContentHeight) {
        setExpandedContentHeight(height);
      }
    },
    [expandedContentHeight],
  );

  const expandedAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, expandedContentHeight]),
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [-8, 0]),
      },
    ],
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  if (settlementNotice) {
    return (
      <View style={styles.settlementWrap}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={() => {
            setExpanded(current => !current);
          }}
          style={styles.settlementHeader}>
          <View style={styles.settlementHeaderMain}>
            <View style={styles.settlementIconWrap}>
              <Icon color={COLORS.accent.purple} name="wallet-outline" size={14} />
            </View>

            <View style={styles.settlementCopy}>
              <View style={styles.settlementTitleRow}>
                <Text style={styles.settlementTitle}>정산 현황</Text>
                <View
                  style={[
                    styles.settlementStatusPill,
                    settlementNotice.completedCount === settlementNotice.totalCount &&
                    settlementNotice.totalCount > 0
                      ? styles.settlementStatusPillDone
                      : styles.settlementStatusPillPending,
                  ]}>
                  <Text
                    style={[
                      styles.settlementStatusLabel,
                      settlementNotice.completedCount === settlementNotice.totalCount &&
                      settlementNotice.totalCount > 0
                        ? styles.settlementStatusLabelDone
                        : styles.settlementStatusLabelPending,
                    ]}>
                    {`${settlementNotice.completedCount}/${settlementNotice.totalCount}`}
                  </Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.settlementSubtitle}>
                {buildSettlementSubtitle(settlementNotice)}
              </Text>
            </View>
          </View>

          <Animated.View style={chevronAnimatedStyle}>
            <Icon
              color={COLORS.text.muted}
              name="chevron-down"
              size={18}
            />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          pointerEvents={expanded ? 'auto' : 'none'}
          style={[styles.settlementExpandedAnimated, expandedAnimatedStyle]}>
          <View onLayout={handleExpandedCardLayout} style={styles.settlementExpandedWrap}>
            <View style={styles.settlementExpandedCard}>
              <View style={styles.settlementTotalRow}>
                <Text style={styles.settlementTotalLabel}>총 택시비</Text>
                <Text style={styles.settlementTotalValue}>
                  {formatCurrency(settlementNotice.taxiFare)}
                </Text>
              </View>

              {settlementNotice.members.length > 0 ? (
                <View style={styles.settlementDivider} />
              ) : null}

              {settlementNotice.members.map(member => (
                <View key={member.id} style={styles.settlementMemberRow}>
                  <View style={styles.settlementMemberLeft}>
                    <ToneBadge
                      label={buildSettlementMemberStatusLabel(member)}
                      badgeStyle={styles.settlementMemberBadge}
                      tone={
                        member.leftParty
                          ? 'pink'
                          : member.settled
                            ? 'green'
                            : 'orange'
                      }
                    />

                    <View style={styles.settlementMemberLabelRow}>
                      <Text
                        style={[
                          styles.settlementMemberLabel,
                          member.leftParty
                            ? styles.settlementMemberLabelLeft
                            : undefined,
                        ]}>
                        {member.label}
                      </Text>
                      {member.isCurrentUser ? (
                        <Text style={styles.settlementMemberCurrentUser}>
                          {'(나)'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.settlementMemberAmount}>
                    {formatCurrency(settlementNotice.perPersonAmount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  emptySpacer: {
    height: 48,
  },
  settlementCopy: {
    flex: 1,
    gap: 1,
  },
  settlementDivider: {
    backgroundColor: COLORS.border.default,
    height: 1,
    marginTop: 8,
    width: '100%',
  },
  settlementExpandedAnimated: {
    overflow: 'hidden',
  },
  settlementExpandedCard: {
    backgroundColor: COLORS.background.page,
    borderRadius: 12,
    padding: 12,
  },
  settlementExpandedWrap: {
    paddingBottom: 12,
    paddingHorizontal: SPACING.lg,
  },
  settlementHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 53,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settlementHeaderMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  settlementIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.purpleSoft,
    borderRadius: RADIUS.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  settlementMemberAmount: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  settlementMemberBadge: {
    minHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  settlementMemberCurrentUser: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  settlementMemberLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  settlementMemberLabelLeft: {
    color: COLORS.status.danger,
    textDecorationLine: 'line-through',
  },
  settlementMemberLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  settlementMemberLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  settlementMemberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  settlementStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  settlementStatusLabelDone: {
    color: COLORS.status.success,
  },
  settlementStatusLabelPending: {
    color: COLORS.accent.yellowStrong,
  },
  settlementStatusPill: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 19,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  settlementStatusPillDone: {
    backgroundColor: COLORS.brand.primarySoft,
  },
  settlementStatusPillPending: {
    backgroundColor: COLORS.accent.yellowSoft,
  },
  settlementSubtitle: {
    color: COLORS.text.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  settlementTitle: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  settlementTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  settlementTotalLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  settlementTotalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settlementTotalValue: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  settlementWrap: {
    // position: 'absolute',
    // top: 0,
    // left: 0,
    // right: 0,
    // zIndex: 10,
    backgroundColor: COLORS.background.surface,
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
});
