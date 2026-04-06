import React from 'react';
import {StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle} from 'react-native';

import {SPACING} from '../tokens';
import {SkeletonBlock} from './SkeletonBlock';

interface SkeletonTextProps {
  gap?: number;
  lineHeight?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
  widths?: DimensionValue[];
}

const DEFAULT_LAST_LINE_WIDTH = '72%';

export const SkeletonText = ({
  gap = SPACING.sm,
  lineHeight = 14,
  lines = 3,
  style,
  widths,
}: SkeletonTextProps) => {
  return (
    <View style={[styles.container, {gap}, style]}>
      {Array.from({length: lines}).map((_, index) => {
        const width =
          widths?.[index] ??
          (index === lines - 1 ? DEFAULT_LAST_LINE_WIDTH : '100%');

        return (
          <SkeletonBlock
            key={`skeleton-line-${index + 1}`}
            style={{height: lineHeight, width}}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
