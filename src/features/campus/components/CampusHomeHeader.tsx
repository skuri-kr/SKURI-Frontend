import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {TabBadge} from '@/shared/ui/TabBadge';
import {
  COLORS,
  FONT_FAMILIES,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

type CampusHomeHeaderProps = {
  notificationBadgeCount?: number;
  onPressProfile: () => void;
  onPressNotification: () => void;
};

export const CampusHomeHeader = ({
  notificationBadgeCount = 0,
  onPressProfile,
  onPressNotification,
}: CampusHomeHeaderProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>SKURI</Text>
      <View style={styles.rightButtonContainer}>
        <View style={styles.buttonWrap}>
          <TouchableOpacity
            accessibilityLabel="알림"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={onPressNotification}
            style={styles.button}>
            <Icon
              color={COLORS.text.secondary}
              name="notifications-outline"
              size={20}
            />
          </TouchableOpacity>
          <TabBadge
            count={notificationBadgeCount}
            size="small"
            style={styles.badge}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel="프로필"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={onPressProfile}
          style={styles.button}>
          <Icon color={COLORS.text.secondary} name="person-outline" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.background.pageHeader,
    /* height: 72, */
  },
  wordmark: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILIES.brand.wordmark,
    fontSize: 30,
    letterSpacing: -1,
    lineHeight: 36,
  },
  rightButtonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  badge: {
    right: -6,
    top: -4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
    ...SHADOWS.card,
  },
  buttonWrap: {
    position: 'relative',
  },
});
