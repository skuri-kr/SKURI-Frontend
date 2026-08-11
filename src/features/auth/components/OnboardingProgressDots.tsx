import React from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {COLORS} from '@/shared/design-system/tokens';

interface OnboardingProgressDotsProps {
  activeColor: string;
  activeIndex: number;
  total: number;
}

const FUTURE_COLOR = COLORS.border.default;
const PAST_COLOR = '#D1D5DB';

const ProgressDot = ({
  activeColor,
  index,
  progress,
}: {
  activeColor: string;
  index: number;
  progress: SharedValue<number>;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    const width = interpolate(distance, [0, 1], [24, 8], 'clamp');
    const backgroundColor =
      progress.value >= index
        ? interpolateColor(
            progress.value,
            [index, index + 1],
            [activeColor, PAST_COLOR],
          )
        : interpolateColor(
            progress.value,
            [index - 1, index],
            [FUTURE_COLOR, activeColor],
          );

    return {
      backgroundColor,
      width,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const OnboardingProgressDots = ({
  activeColor,
  activeIndex,
  total,
}: OnboardingProgressDotsProps) => {
  const progress = useSharedValue(activeIndex);

  React.useEffect(() => {
    progress.value = withTiming(activeIndex, {
      duration: 280,
    });
  }, [activeIndex, progress]);

  return (
    <View style={styles.row}>
      {Array.from({length: total}, (_, index) => (
        <ProgressDot
          activeColor={activeColor}
          index={index}
          key={index}
          progress={progress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 9999,
    height: 8,
  },
});
