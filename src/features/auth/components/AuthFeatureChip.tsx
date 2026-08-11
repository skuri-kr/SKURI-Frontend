import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  COLORS,
  RADIUS,
} from '@/shared/design-system/tokens';

interface AuthFeatureChipProps {
  label: string;
}

export const AuthFeatureChip = ({label}: AuthFeatureChipProps) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  label: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
