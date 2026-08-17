import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

export const TAXI_SETTLEMENT_PROMPT_BANNER_HEIGHT = 158;

interface TaxiSettlementPromptBannerProps {
  onDismiss: () => void;
  onPressAccountOnly: () => void;
  onPressSettlement: () => void;
}

export const TaxiSettlementPromptBanner = ({
  onDismiss,
  onPressAccountOnly,
  onPressSettlement,
}: TaxiSettlementPromptBannerProps) => (
  <View style={styles.container}>
    <TouchableOpacity
      accessibilityLabel="정산 안내 닫기"
      accessibilityRole="button"
      activeOpacity={0.8}
      hitSlop={8}
      onPress={onDismiss}
      style={styles.dismissButton}>
      <Icon color={COLORS.text.muted} name="close" size={18} />
    </TouchableOpacity>

    <View style={styles.copyRow}>
      <View style={styles.iconWrap}>
        <Icon color={COLORS.brand.primaryStrong} name="location" size={18} />
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.title}>택시가 목적지에 도착했나요?</Text>
        <Text style={styles.description}>
          도착 처리하면 계좌와 1/N 금액을 한 번에 안내하고 정산 현황을 관리할 수 있어요.
        </Text>
      </View>
    </View>

    <View style={styles.actionRow}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={onPressAccountOnly}
        style={[styles.actionButton, styles.accountButton]}>
        <Text style={styles.accountButtonLabel}>계좌정보만 보내기</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={onPressSettlement}
        style={[styles.actionButton, styles.settlementButton]}>
        <Text style={styles.settlementButtonLabel}>도착·정산 시작하기</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  accountButton: {
    backgroundColor: COLORS.background.subtle,
  },
  accountButtonLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  container: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  copyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.xxl,
  },
  copyWrap: {
    flex: 1,
  },
  description: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  dismissButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    width: 28,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  settlementButton: {
    backgroundColor: COLORS.brand.primary,
  },
  settlementButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  title: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
