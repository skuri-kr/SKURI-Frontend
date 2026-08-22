import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SHADOWS} from '@/shared/design-system/tokens';

import {TIMETABLE_COURSE_TONES} from '../model/timetableCourseTones';
import type {TimetableSupplementItemViewData} from '../model/timetableViewData';

interface TimetableSupplementSectionProps {
  items: TimetableSupplementItemViewData[];
  kind: 'online' | 'saturday';
  onPressItem?: (courseId: string) => void;
  readOnly?: boolean;
  selectedCourseId?: string;
  title: string;
}

export const TimetableSupplementSection = ({
  items,
  kind,
  onPressItem,
  readOnly = false,
  selectedCourseId,
  title,
}: TimetableSupplementSectionProps) => {
  if (items.length === 0) {
    return null;
  }

  const iconName = kind === 'online' ? 'desktop-outline' : 'calendar-outline';
  const iconColor = kind === 'online' ? '#60A5FA' : '#FB923C';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon color={iconColor} name={iconName} size={14} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <View style={styles.list}>
        {items.map(item => {
          const tone = TIMETABLE_COURSE_TONES[item.toneId];
          const selected = item.courseId === selectedCourseId;
          const isInteractive = !readOnly && Boolean(onPressItem);
          const content = <>
              <View style={[styles.accentBar, {backgroundColor: tone.accent}]} />

              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={styles.itemTitle}>
                    {item.title}
                  </Text>
                  {kind === 'online' ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeLabel}>온라인</Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={styles.metaLabel}>
                  {item.metaLabel}
                </Text>
              </View>

              {isInteractive ? (
                <Icon
                  color={COLORS.border.default}
                  name="chevron-forward"
                  size={18}
                />
              ) : null}
            </>;

          return isInteractive ? (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={() => onPressItem?.(item.courseId)}
              style={[
                styles.card,
                selected ? {backgroundColor: tone.softBackground} : null,
              ]}>
              {content}
            </TouchableOpacity>
          ) : (
            <View
              key={item.id}
              style={[
                styles.card,
                selected ? {backgroundColor: tone.softBackground} : null,
              ]}>
              {content}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginLeft: 8,
  },
  list: {
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    height: 62,
    paddingHorizontal: 16,
    ...SHADOWS.card,
  },
  accentBar: {
    borderRadius: RADIUS.pill,
    height: 38,
    marginRight: 12,
    width: 4,
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 2,
  },
  itemTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.pill,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLabel: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  metaLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
