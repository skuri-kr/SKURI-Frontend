import React from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {COLORS, RADIUS} from '../tokens';

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
}

const SHIMMER_DURATION_MS = 1100;

export const SkeletonBlock = ({style}: SkeletonBlockProps) => {
  const shimmerProgress = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    if (containerWidth <= 0) {
      shimmerProgress.stopAnimation();
      return;
    }

    shimmerProgress.setValue(0);

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerProgress, {
        duration: SHIMMER_DURATION_MS,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
      shimmerProgress.stopAnimation();
    };
  }, [containerWidth, shimmerProgress]);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth > 0) {
      setContainerWidth(nextWidth);
    }
  }, []);

  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });

  return (
    <View onLayout={handleLayout} style={[styles.base, style]}>
      {containerWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerTrack,
            {
              transform: [{translateX: shimmerTranslateX}],
              width: Math.max(containerWidth * 0.45, 56),
            },
          ]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.6)',
              'rgba(255,255,255,0)',
            ]}
            end={{x: 1, y: 0.5}}
            start={{x: 0, y: 0.5}}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  shimmerTrack: {
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
});
