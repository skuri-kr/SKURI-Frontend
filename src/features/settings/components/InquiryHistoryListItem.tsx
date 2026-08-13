import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {ListCardThumbnail, ToneBadge} from '@/shared/design-system/components';
import {
  COLORS,
  MOTION,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {layoutTransitions} from '@/shared/design-system/motion';

import type {InquiryHistoryItemViewData} from '../model/inquiryHistoryViewData';

interface InquiryHistoryListItemProps {
  expanded: boolean;
  item: InquiryHistoryItemViewData;
  onToggle: () => void;
}

const CARD_LAYOUT_TRANSITION = layoutTransitions.cardExpand();

const AnimatedChevron = ({expanded}: {expanded: boolean}) => {
  const progress = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: MOTION.duration.fast,
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon color={COLORS.text.muted} name="chevron-down" size={18} />
    </Animated.View>
  );
};

export const InquiryHistoryListItem = ({
  expanded,
  item,
  onToggle,
}: InquiryHistoryListItemProps) => {
  return (
    <Animated.View layout={CARD_LAYOUT_TRANSITION}>
      <TouchableOpacity
        accessibilityLabel={`${item.subject} 문의 내용 ${
          expanded ? '접기' : '펼치기'
        }`}
        accessibilityRole="button"
        accessibilityState={{expanded}}
        activeOpacity={0.82}
        onPress={onToggle}
        style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <ToneBadge label={item.typeLabel} tone={item.typeTone} />
            <ToneBadge label={item.statusLabel} tone={item.statusTone} />
            {item.adminAnswer ? (
              <ToneBadge label="답변 있음" tone="blue" />
            ) : null}
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.dateLabel}>{item.createdAtLabel}</Text>
            <AnimatedChevron expanded={expanded} />
          </View>
        </View>

        <View style={styles.bodyRow}>
          <View style={styles.body}>
            <Text
              numberOfLines={expanded ? undefined : 2}
              style={styles.subject}>
              {item.subject}
            </Text>
            <Text
              numberOfLines={expanded ? undefined : 3}
              style={styles.preview}>
              {item.content}
            </Text>

            {item.attachmentCountLabel ? (
              <Text style={styles.attachmentLabel}>
                {item.attachmentCountLabel}
              </Text>
            ) : null}
          </View>

          {item.thumbnailUri ? (
            <ListCardThumbnail
              accessibilityLabel={`${item.subject} 첨부 이미지`}
              size={84}
              uri={item.thumbnailUri}
            />
          ) : null}
        </View>

        {expanded && item.adminAnswer ? (
          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>관리자 답변</Text>
            <Text style={styles.answerContent}>{item.adminAnswer}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  badgeRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    minWidth: 0,
  },
  dateLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  headerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  bodyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  body: {
    flex: 1,
    gap: SPACING.sm,
    minWidth: 0,
  },
  subject: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  preview: {
    color: COLORS.text.secondary,
    fontSize: 14,
    lineHeight: 21,
  },
  attachmentLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  answerSection: {
    borderColor: COLORS.border.subtle,
    borderTopWidth: 1,
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  answerLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  answerContent: {
    color: COLORS.text.secondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
