import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import type {
  MyPageMenuItemViewData,
  MyPageMenuSectionViewData,
} from '../model/myPageViewData';

interface MyPageMenuSectionProps {
  badgeCounts?: Partial<Record<MyPageMenuItemViewData['actionKey'], number>>;
  onPressItem: (item: MyPageMenuItemViewData) => void;
  section: MyPageMenuSectionViewData;
}

export const MyPageMenuSection = ({
  badgeCounts,
  onPressItem,
  section,
}: MyPageMenuSectionProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>

      <View style={styles.card}>
        {section.items.map((item, index) => {
          const badgeCount = badgeCounts?.[item.actionKey] ?? 0;

          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => onPressItem(item)}
              style={[
                styles.row,
                index < section.items.length - 1
                  ? styles.rowBorder
                  : undefined,
              ]}>
              <View style={styles.leftGroup}>
                <View
                  style={[
                    styles.iconWrap,
                    {backgroundColor: item.iconBackgroundColor},
                  ]}>
                  {item.imageSource ? (
                    <Image source={item.imageSource} style={styles.iconImage} />
                  ) : (
                    <Icon color={item.iconColor} name={item.iconName} size={20} />
                  )}
                </View>

                <Text style={styles.label}>{item.label}</Text>
              </View>

              <View style={styles.rightGroup}>
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                ) : null}
                <Icon
                  color={COLORS.text.muted}
                  name="chevron-forward"
                  size={16}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  rowBorder: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
  },
  leftGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rightGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: COLORS.status.danger,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
  },
  badgeLabel: {
    color: COLORS.text.inverse,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  label: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
