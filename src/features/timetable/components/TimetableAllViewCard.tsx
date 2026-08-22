import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {StyleSheet, Text, TouchableOpacity, View, useWindowDimensions} from 'react-native';

import {COLORS, SHADOWS} from '@/shared/design-system/tokens';

import {TIMETABLE_COURSE_TONES} from '../model/timetableCourseTones';
import type {
  TimetableDayColumnViewData,
  TimetableGridBlockViewData,
  TimetablePeriodViewData,
} from '../model/timetableViewData';

interface TimetableAllViewCardProps {
  blocks: TimetableGridBlockViewData[];
  collapsed: boolean;
  columns: TimetableDayColumnViewData[];
  hasNightClasses: boolean;
  onPressBlock?: (courseId: string) => void;
  onToggleNightClasses: () => void;
  periods: TimetablePeriodViewData[];
  toggleLabel: string;
}

const HEADER_HEIGHT = 37;
const ROW_HEIGHT = 44;
const CARD_HORIZONTAL_MARGIN = 8;
const CARD_RADIUS = 16;
const BLOCK_INSET_X = 2;
const BLOCK_INSET_Y = 2;
const BLOCK_RADIUS = 8;
const GRID_LINE_WIDTH = 1;

export const TimetableAllViewCard = ({
  blocks,
  collapsed,
  columns,
  hasNightClasses,
  onPressBlock,
  onToggleNightClasses,
  periods,
  toggleLabel,
}: TimetableAllViewCardProps) => {
  const {width} = useWindowDimensions();
  const cardWidth = width - CARD_HORIZONTAL_MARGIN * 2;
  const columnWidth = cardWidth / (columns.length + 1);
  const cardHeight = HEADER_HEIGHT + periods.length * ROW_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={[styles.card, {height: cardHeight, width: cardWidth}]}>
        <View style={[styles.gridLineHorizontal, {top: HEADER_HEIGHT - 1, width: cardWidth}]} />

        {Array.from({length: columns.length + 1}).map((_, index) => (
          <View
            key={`col-${index}`}
            style={[
              styles.gridLineVertical,
              {
                height: cardHeight - HEADER_HEIGHT,
                left: columnWidth * index,
                top: HEADER_HEIGHT,
              },
            ]}
          />
        ))}

        {periods.map((period, index) => (
          <View
            key={`row-${period.id}`}
            style={[
              styles.gridLineHorizontal,
              {
                top: HEADER_HEIGHT + index * ROW_HEIGHT,
                width: cardWidth,
              },
            ]}
          />
        ))}

        <View style={styles.headerRow}>
          <View style={[styles.headerCell, {width: columnWidth}]}>
            <Text style={styles.axisLabel}>교시</Text>
          </View>
          {columns.map(column => (
            <View
              key={column.id}
              style={[styles.headerCell, {width: columnWidth}]}>
              <Text style={styles.dayLabel}>{column.label}</Text>
            </View>
          ))}
        </View>

        {periods.map((period, index) => (
          <View
            key={period.id}
            style={[
              styles.timeCell,
              {
                height: ROW_HEIGHT,
                top: HEADER_HEIGHT + index * ROW_HEIGHT,
                width: columnWidth,
              },
            ]}>
            <Text style={styles.periodIndex}>{period.periodNumber}</Text>
            <Text style={styles.periodTime}>{period.startTimeLabel}</Text>
          </View>
        ))}

        {blocks.map(block => {
          const tone = TIMETABLE_COURSE_TONES[block.toneId];
          const dayIndex = columns.findIndex(column => column.id === block.weekdayId);
          const rowSpan = block.endPeriod - block.startPeriod + 1;
          const showSubtitle = rowSpan > 1 && Boolean(block.roomLabel);

          if (dayIndex < 0) {
            return null;
          }

          const blockStyle = [
            styles.block,
            {
              height: rowSpan * ROW_HEIGHT - BLOCK_INSET_Y * 2,
              left:
                columnWidth +
                dayIndex * columnWidth +
                GRID_LINE_WIDTH +
                BLOCK_INSET_X,
              top:
                HEADER_HEIGHT +
                (block.startPeriod - 1) * ROW_HEIGHT +
                BLOCK_INSET_Y,
              width:
                columnWidth -
                GRID_LINE_WIDTH -
                BLOCK_INSET_X * 2,
            },
          ];
          const blockContent = <>
              <View style={styles.blockBase} />
              <View
                style={[
                  styles.blockTint,
                  {backgroundColor: tone.softBackground},
                ]}
              />
              <Text
                numberOfLines={showSubtitle ? 2 : 3}
                style={[styles.blockTitle, {color: tone.text}]}>
                {block.title}
              </Text>
              {showSubtitle ? (
                <Text numberOfLines={1} style={[styles.blockSubtitle, {color: tone.text}]}>
                  {block.roomLabel}
                </Text>
              ) : null}
            </>;

          return onPressBlock ? (
            <TouchableOpacity
              key={block.id}
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={() => onPressBlock(block.courseId)}
              style={blockStyle}>
              {blockContent}
            </TouchableOpacity>
          ) : (
            <View key={block.id} style={blockStyle}>
              {blockContent}
            </View>
          );
        })}
      </View>

      {hasNightClasses ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={onToggleNightClasses}
          style={styles.toggleButton}>
          <Text style={styles.toggleLabel}>{toggleLabel}</Text>
          <Icon
            color={COLORS.text.secondary}
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
  },
  headerCell: {
    alignItems: 'center',
    height: HEADER_HEIGHT,
    justifyContent: 'center',
  },
  axisLabel: {
    color: COLORS.text.secondary,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15,
  },
  dayLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
  },
  periodIndex: {
    color: COLORS.text.secondary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
  },
  periodTime: {
    color: COLORS.text.secondary,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 2,
  },
  gridLineHorizontal: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    left: 0,
    position: 'absolute',
  },
  gridLineVertical: {
    backgroundColor: COLORS.border.subtle,
    position: 'absolute',
    width: GRID_LINE_WIDTH,
  },
  block: {
    alignItems: 'center',
    borderRadius: BLOCK_RADIUS,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 2,
    position: 'absolute',
  },
  blockBase: {
    backgroundColor: COLORS.background.surface,
    borderRadius: BLOCK_RADIUS,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  blockTint: {
    borderRadius: BLOCK_RADIUS,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  blockTitle: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
    textAlign: 'center',
  },
  blockSubtitle: {
    fontSize: 8,
    lineHeight: 10,
    marginTop: 2,
    opacity: 0.7,
    textAlign: 'center',
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderWidth: 1,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 18,
    paddingVertical: 10,
    zIndex: 1,
    ...SHADOWS.card,
  },
  toggleLabel: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginRight: 4,
  },
});
