import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

interface FriendDataErrorBannerProps {
  error: string;
  onRetry: () => void | Promise<void>;
}

export const FriendDataErrorBanner = ({
  error,
  onRetry,
}: FriendDataErrorBannerProps) => (
  <View accessibilityLiveRegion="polite" style={styles.container}>
    <Icon color={COLORS.accent.orange} name="alert-circle-outline" size={18} />
    <Text numberOfLines={2} style={styles.message}>
      {error}
    </Text>
    <TouchableOpacity
      accessibilityLabel="다시 불러오기"
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={() => {
        Promise.resolve().then(onRetry).catch(() => undefined);
      }}
      style={styles.retryButton}>
      <Text style={styles.retryLabel}>재시도</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.orangeSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  message: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  retryLabel: {
    color: COLORS.accent.orange,
    fontSize: 12,
    fontWeight: '700',
  },
});
