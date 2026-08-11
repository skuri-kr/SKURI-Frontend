import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import type {ContentDetailBadgeTone} from '@/shared/types/contentDetailViewData';

import {COLORS, RADIUS, SPACING} from '../tokens';

interface ToneBadgeProps {
  label: string;
  badgeStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  tone: ContentDetailBadgeTone;
}

const getToneStyle = (tone: ContentDetailBadgeTone) => {
  switch (tone) {
    case 'blue':
      return {
        backgroundColor: COLORS.accent.blueSoft,
        textColor: COLORS.accent.blue,
      };
    case 'green':
      return {
        backgroundColor: COLORS.brand.primaryTint,
        textColor: COLORS.brand.primaryStrong,
      };
    case 'orange':
      return {
        backgroundColor: COLORS.accent.orangeSoft,
        textColor: COLORS.accent.orange,
      };
    case 'pink':
      return {
        backgroundColor: COLORS.accent.pinkSoft,
        textColor: COLORS.accent.pink,
      };
    case 'purple':
      return {
        backgroundColor: COLORS.accent.purpleSoft,
        textColor: COLORS.accent.purple,
      };
    case 'gray':
    default:
      return {
        backgroundColor: COLORS.background.subtle,
        textColor: COLORS.text.tertiary,
      };
  }
};

export const ToneBadge = ({label, badgeStyle, textStyle, tone}: ToneBadgeProps) => {
  const toneStyle = getToneStyle(tone);

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: toneStyle.backgroundColor},
        badgeStyle,
      ]}>
      <Text style={[styles.label, {color: toneStyle.textColor}, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: 10,
    paddingVertical: SPACING.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
