import React from 'react';
import {
  Animated,
  Image,
  type ImageErrorEventData,
  StyleSheet,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {COLORS} from '../tokens';

interface SkeletonImageProps
  extends Omit<ImageProps, 'source' | 'style' | 'onError' | 'onLoadEnd' | 'onLoadStart'> {
  onError?: ImageProps['onError'];
  onLoadEnd?: ImageProps['onLoadEnd'];
  onLoadStart?: ImageProps['onLoadStart'];
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}

const SHIMMER_DURATION_MS = 1100;

const resolveSourceKey = (source: ImageSourcePropType) => {
  if (typeof source === 'number') {
    return `asset-${source}`;
  }

  if (Array.isArray(source)) {
    return source
      .map(item => (item && 'uri' in item ? item.uri ?? '' : ''))
      .join('|');
  }

  if (source && 'uri' in source) {
    return source.uri ?? '';
  }

  return '';
};

export const SkeletonImage = ({
  onError,
  onLoadEnd,
  onLoadStart,
  resizeMode = 'cover',
  source,
  style,
  ...rest
}: SkeletonImageProps) => {
  const sourceKey = React.useMemo(() => resolveSourceKey(source), [source]);
  const shimmerProgress = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [isLoading, setLoading] = React.useState(true);
  const [hasLoadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setLoadError(false);
  }, [sourceKey]);

  React.useEffect(() => {
    if (!isLoading || containerWidth <= 0) {
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
  }, [containerWidth, isLoading, shimmerProgress]);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth > 0) {
      setContainerWidth(nextWidth);
    }
  }, []);

  const handleLoadStart = React.useCallback<NonNullable<ImageProps['onLoadStart']>>(
    () => {
      setLoading(true);
      setLoadError(false);
      onLoadStart?.();
    },
    [onLoadStart],
  );

  const handleLoadEnd = React.useCallback<NonNullable<ImageProps['onLoadEnd']>>(
    () => {
      setLoading(false);
      onLoadEnd?.();
    },
    [onLoadEnd],
  );

  const handleError = React.useCallback(
    (event: NativeSyntheticEvent<ImageErrorEventData>) => {
      setLoadError(true);
      setLoading(false);
      onError?.(event);
    },
    [onError],
  );

  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });
  const showSkeleton = isLoading || hasLoadError;

  return (
    <View onLayout={handleLayout} style={[styles.container, style]}>
      {!hasLoadError ? (
        <Image
          {...rest}
          onError={handleError}
          onLoadEnd={handleLoadEnd}
          onLoadStart={handleLoadStart}
          resizeMode={resizeMode}
          source={source}
          style={styles.image}
        />
      ) : null}

      {showSkeleton ? (
        <View pointerEvents="none" style={styles.placeholder}>
          {isLoading && containerWidth > 0 ? (
            <Animated.View
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.subtle,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.subtle,
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
