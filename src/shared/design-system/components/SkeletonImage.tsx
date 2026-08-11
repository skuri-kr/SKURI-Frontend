import React from 'react';
import {
  Animated,
  Image,
  type ImageLoadEventData,
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
  extends Omit<
    ImageProps,
    'source' | 'style' | 'onError' | 'onLoad' | 'onLoadEnd' | 'onLoadStart'
  > {
  disableSkeleton?: boolean;
  onError?: ImageProps['onError'];
  onLoad?: ImageProps['onLoad'];
  onLoadEnd?: ImageProps['onLoadEnd'];
  onLoadStart?: ImageProps['onLoadStart'];
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}

const SHIMMER_DURATION_MS = 1100;
const MAX_AUTO_RETRY_COUNT = 1;

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

const resolveSourceUri = (source: ImageSourcePropType) => {
  if (Array.isArray(source)) {
    for (const item of source) {
      if (item && 'uri' in item && item.uri) {
        return item.uri;
      }
    }

    return null;
  }

  if (source && typeof source !== 'number' && 'uri' in source) {
    return source.uri ?? null;
  }

  return null;
};

export const SkeletonImage = ({
  disableSkeleton = false,
  onError,
  onLoad,
  onLoadEnd,
  onLoadStart,
  resizeMode = 'cover',
  source,
  style,
  ...rest
}: SkeletonImageProps) => {
  const sourceKey = React.useMemo(() => resolveSourceKey(source), [source]);
  const sourceUri = React.useMemo(() => resolveSourceUri(source), [source]);
  const shimmerProgress = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [isLoading, setLoading] = React.useState(true);
  const [hasLoadError, setLoadError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [retryNonce, setRetryNonce] = React.useState(0);

  React.useEffect(() => {
    setLoading(true);
    setLoadError(false);
    setRetryCount(0);
    setRetryNonce(0);
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

  const handleLoad = React.useCallback<NonNullable<ImageProps['onLoad']>>(
    (event: NativeSyntheticEvent<ImageLoadEventData>) => {
      setLoadError(false);
      setLoading(false);
      onLoad?.(event);
    },
    [onLoad],
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
      if (sourceUri && retryCount < MAX_AUTO_RETRY_COUNT) {
        setRetryCount(currentCount => currentCount + 1);
        setLoadError(false);
        setLoading(true);
        setRetryNonce(currentNonce => currentNonce + 1);
        return;
      }

      setLoadError(true);
      setLoading(false);
      onError?.(event);
    },
    [onError, retryCount, sourceUri],
  );

  const shimmerTranslateX = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });
  const showSkeleton = !disableSkeleton && isLoading;
  const showFallback = !disableSkeleton && hasLoadError;

  return (
    <View onLayout={handleLayout} style={[styles.container, style]}>
      <Image
        {...rest}
        key={`${sourceKey}:${retryNonce}`}
        onError={handleError}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
        onLoadStart={handleLoadStart}
        resizeMode={resizeMode}
        source={source}
        style={styles.image}
      />

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

      {showFallback ? <View pointerEvents="none" style={styles.placeholder} /> : null}
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
    backgroundColor: COLORS.background.subtle,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
