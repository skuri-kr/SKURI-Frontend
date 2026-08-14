import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

import {TIMETABLE_COURSE_TONES} from '../model/timetableCourseTones';
import type {TimetableCourseDetailViewData} from '../model/timetableViewData';
import {TimetableBottomSheet} from './TimetableBottomSheet';

const DETAIL_SNAP_POINTS = ['63%'];

const ROW_ICON_STYLES = {
  credits: {
    backgroundColor: COLORS.accent.blueSoft,
    iconColor: COLORS.accent.blue,
  },
  location: {
    backgroundColor: COLORS.brand.primaryTint,
    iconColor: COLORS.brand.primary,
  },
  professor: {
    backgroundColor: COLORS.accent.purpleSoft,
    iconColor: COLORS.accent.purple,
  },
  time: {
    backgroundColor: COLORS.accent.orangeSoft,
    iconColor: COLORS.accent.orange,
  },
} as const;

const DEFAULT_ROW_ICON_STYLE = {
  backgroundColor: COLORS.background.subtle,
  iconColor: COLORS.text.secondary,
} as const;

interface TimetableCourseDetailSheetProps {
  course?: TimetableCourseDetailViewData;
  onClose: () => void;
  onDelete: () => void;
}

export const TimetableCourseDetailSheet = ({
  course,
  onClose,
  onDelete,
}: TimetableCourseDetailSheetProps) => {
  if (!course) {
    return null;
  }

  const tone = TIMETABLE_COURSE_TONES[course.toneId];

  return (
    <TimetableBottomSheet
      onClose={onClose}
      snapPoints={DETAIL_SNAP_POINTS}
      visible={Boolean(course)}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.titleDot, {backgroundColor: tone.accent}]} />
            <View style={styles.titleCopy}>
              <Text numberOfLines={1} style={styles.title}>
                {course.title}
              </Text>
              <Text style={styles.codeLabel}>{course.codeLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel="닫기"
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={onClose}
            style={styles.closeButton}>
            <Icon color={COLORS.text.secondary} name="close" size={18} />
          </TouchableOpacity>
        </View>

        <View style={styles.rows}>
          {course.rows.map(row => {
            const iconStyle =
              ROW_ICON_STYLES[row.id as keyof typeof ROW_ICON_STYLES] ??
              DEFAULT_ROW_ICON_STYLE;

            return (
              <View key={row.id} style={styles.row}>
                <View
                  style={[
                    styles.iconBox,
                    {backgroundColor: iconStyle.backgroundColor},
                  ]}>
                  <Icon
                    color={iconStyle.iconColor}
                    name={row.iconName}
                    size={15}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={onDelete}
          style={styles.deleteButton}>
          <Icon
            color={COLORS.status.danger}
            name="trash-outline"
            size={16}
          />
          <Text style={styles.deleteLabel}>{course.deleteLabel}</Text>
        </TouchableOpacity>
      </View>
    </TimetableBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 8,
  },
  titleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  titleDot: {
    borderRadius: RADIUS.pill,
    height: 12,
    marginRight: 12,
    width: 12,
  },
  titleCopy: {
    flexShrink: 1,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
  },
  codeLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rows: {
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingVertical: 12,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 32,
    justifyContent: 'center',
    marginRight: 12,
    width: 32,
  },
  rowCopy: {
    flex: 1,
  },
  rowLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 2,
  },
  rowValue: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 52,
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  deleteLabel: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
