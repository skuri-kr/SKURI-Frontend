import React from 'react';
import {
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SPACING} from '../tokens';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const MAX_SCALE = 4;
const ZOOM_THRESHOLD = 1.02;

const clampValue = (value: number, min: number, max: number) => {
  'worklet';

  return Math.min(Math.max(value, min), max);
};

const getImageFrame = (
  aspectRatio: number | undefined,
  viewportWidth: number,
  viewportHeight: number,
) => {
  if (!aspectRatio || aspectRatio <= 0) {
    return {
      height: viewportHeight,
      width: viewportWidth,
    };
  }

  let width = viewportWidth;
  let height = width / aspectRatio;

  if (height > viewportHeight) {
    height = viewportHeight;
    width = height * aspectRatio;
  }

  return {height, width};
};

const getTranslationBounds = (
  scale: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  'worklet';

  return {
    x: Math.max(0, (imageWidth * scale - viewportWidth) / 2),
    y: Math.max(0, (imageHeight * scale - viewportHeight) / 2),
  };
};

export interface ImageLightboxItem {
  alt?: string;
  aspectRatio?: number;
  id: string;
  source: ImageSourcePropType;
}

interface ZoomableImageSlideProps {
  image: ImageLightboxItem;
  isActive: boolean;
  onZoomStateChange: (isZoomed: boolean) => void;
  viewportHeight: number;
  viewportWidth: number;
}

const ZoomableImageSlide = ({
  image,
  isActive,
  onZoomStateChange,
  viewportHeight,
  viewportWidth,
}: ZoomableImageSlideProps) => {
  const [isZoomed, setIsZoomed] = React.useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const frame = React.useMemo(
    () => getImageFrame(image.aspectRatio, viewportWidth, viewportHeight),
    [image.aspectRatio, viewportHeight, viewportWidth],
  );

  const syncZoomState = React.useCallback(
    (nextIsZoomed: boolean) => {
      setIsZoomed(previousIsZoomed =>
        previousIsZoomed === nextIsZoomed ? previousIsZoomed : nextIsZoomed,
      );
      onZoomStateChange(nextIsZoomed);
    },
    [onZoomStateChange],
  );

  React.useEffect(() => {
    if (isActive) {
      return;
    }

    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    syncZoomState(false);
  }, [
    isActive,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    syncZoomState,
    translateX,
    translateY,
  ]);

  const pinchGesture = React.useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate(event => {
          const nextScale = clampValue(
            savedScale.value * event.scale,
            1,
            MAX_SCALE,
          );
          const bounds = getTranslationBounds(
            nextScale,
            frame.width,
            frame.height,
            viewportWidth,
            viewportHeight,
          );

          scale.value = nextScale;
          translateX.value = clampValue(
            savedTranslateX.value,
            -bounds.x,
            bounds.x,
          );
          translateY.value = clampValue(
            savedTranslateY.value,
            -bounds.y,
            bounds.y,
          );
        })
        .onEnd(() => {
          if (scale.value <= ZOOM_THRESHOLD) {
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            scale.value = withTiming(1);
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            runOnJS(syncZoomState)(false);
            return;
          }

          const bounds = getTranslationBounds(
            scale.value,
            frame.width,
            frame.height,
            viewportWidth,
            viewportHeight,
          );
          const nextTranslateX = clampValue(
            translateX.value,
            -bounds.x,
            bounds.x,
          );
          const nextTranslateY = clampValue(
            translateY.value,
            -bounds.y,
            bounds.y,
          );

          savedScale.value = scale.value;
          savedTranslateX.value = nextTranslateX;
          savedTranslateY.value = nextTranslateY;
          translateX.value = withTiming(nextTranslateX);
          translateY.value = withTiming(nextTranslateY);
          runOnJS(syncZoomState)(true);
        }),
    [
      frame.height,
      frame.width,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      syncZoomState,
      translateX,
      translateY,
      viewportHeight,
      viewportWidth,
    ],
  );

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onUpdate(event => {
          if (savedScale.value <= 1) {
            return;
          }

          const bounds = getTranslationBounds(
            scale.value,
            frame.width,
            frame.height,
            viewportWidth,
            viewportHeight,
          );

          translateX.value = clampValue(
            savedTranslateX.value + event.translationX,
            -bounds.x,
            bounds.x,
          );
          translateY.value = clampValue(
            savedTranslateY.value + event.translationY,
            -bounds.y,
            bounds.y,
          );
        })
        .onEnd(() => {
          if (scale.value <= ZOOM_THRESHOLD) {
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            scale.value = withTiming(1);
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            runOnJS(syncZoomState)(false);
            return;
          }

          const bounds = getTranslationBounds(
            scale.value,
            frame.width,
            frame.height,
            viewportWidth,
            viewportHeight,
          );
          const nextTranslateX = clampValue(
            translateX.value,
            -bounds.x,
            bounds.x,
          );
          const nextTranslateY = clampValue(
            translateY.value,
            -bounds.y,
            bounds.y,
          );

          savedTranslateX.value = nextTranslateX;
          savedTranslateY.value = nextTranslateY;
          translateX.value = withTiming(nextTranslateX);
          translateY.value = withTiming(nextTranslateY);
          runOnJS(syncZoomState)(true);
        }),
    [
      frame.height,
      frame.width,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      syncZoomState,
      translateX,
      translateY,
      viewportHeight,
      viewportWidth,
    ],
  );

  const gesture = React.useMemo(
    () =>
      isZoomed ? Gesture.Simultaneous(pinchGesture, panGesture) : pinchGesture,
    [isZoomed, panGesture, pinchGesture],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return (
    <View style={[styles.slide, {width: viewportWidth}]}>
      <GestureDetector gesture={gesture}>
        <AnimatedImage
          accessibilityLabel={image.alt}
          resizeMode="contain"
          source={image.source}
          style={[
            styles.viewerImage,
            {
              height: frame.height,
              width: frame.width,
            },
            animatedStyle,
          ]}
        />
      </GestureDetector>
    </View>
  );
};

interface ImageLightboxModalProps {
  images: ImageLightboxItem[];
  initialIndex: number;
  onRequestClose: () => void;
  visible: boolean;
}

export const ImageLightboxModal = ({
  images,
  initialIndex,
  onRequestClose,
  visible,
}: ImageLightboxModalProps) => {
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
  const listRef = React.useRef<FlatList<ImageLightboxItem>>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [pagingEnabled, setPagingEnabled] = React.useState(true);
  const dismissTranslateY = useSharedValue(0);

  React.useEffect(() => {
    if (!visible) {
      setPagingEnabled(true);
      dismissTranslateY.value = 0;
      return;
    }

    const nextIndex = clampValue(
      initialIndex,
      0,
      Math.max(images.length - 1, 0),
    );

    setCurrentIndex(nextIndex);
    setPagingEnabled(true);
    dismissTranslateY.value = 0;

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        animated: false,
        index: nextIndex,
      });
    });
  }, [dismissTranslateY, images.length, initialIndex, visible]);

  const handleMomentumScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setCurrentIndex(clampValue(nextIndex, 0, Math.max(images.length - 1, 0)));
      setPagingEnabled(true);
    },
    [images.length, width],
  );

  const viewportHeight = Math.max(
    height - insets.top - insets.bottom - 104,
    180,
  );

  const dismissContainerStyle = useAnimatedStyle(() => ({
    transform: [{translateY: dismissTranslateY.value}],
  }));

  const dismissGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(pagingEnabled)
        .failOffsetX([-24, 24])
        .activeOffsetY([-18, 18])
        .onUpdate(event => {
          dismissTranslateY.value = event.translationY;
        })
        .onEnd(event => {
          const shouldClose =
            Math.abs(event.translationY) > 120 ||
            Math.abs(event.velocityY) > 1100;

          if (shouldClose) {
            const targetOffset = event.translationY >= 0 ? height : -height;

            dismissTranslateY.value = withTiming(targetOffset, {}, finished => {
              if (finished) {
                dismissTranslateY.value = 0;
                runOnJS(onRequestClose)();
              }
            });
            return;
          }

          dismissTranslateY.value = withTiming(0);
        }),
    [dismissTranslateY, height, onRequestClose, pagingEnabled],
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      {visible ? <StatusBar barStyle="light-content" /> : null}
      <View style={styles.backdrop}>
        <GestureDetector gesture={dismissGesture}>
          <Animated.View
            style={[styles.dismissContainer, dismissContainerStyle]}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
              <View
                style={[
                  styles.header,
                  {
                    paddingTop: insets.top + SPACING.sm,
                  },
                ]}>
                <View style={styles.counterChip}>
                  <Text style={styles.counterLabel}>
                    {images.length > 0 ? currentIndex + 1 : 0} / {images.length}
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityLabel="이미지 뷰어 닫기"
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={onRequestClose}
                  style={styles.closeButton}>
                  <Icon color={COLORS.text.inverse} name="close" size={22} />
                </TouchableOpacity>
              </View>

              <FlatList
                ref={listRef}
                data={images}
                extraData={`${currentIndex}-${pagingEnabled}`}
                getItemLayout={(_data, index) => ({
                  index,
                  length: width,
                  offset: width * index,
                })}
                horizontal
                keyExtractor={item => item.id}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                pagingEnabled={pagingEnabled}
                renderItem={({item, index}) => (
                  <ZoomableImageSlide
                    image={item}
                    isActive={index === currentIndex}
                    onZoomStateChange={isZoomed => {
                      if (index === currentIndex) {
                        setPagingEnabled(!isZoomed);
                      }
                    }}
                    viewportHeight={viewportHeight}
                    viewportWidth={width}
                  />
                )}
                onScrollToIndexFailed={({index}) => {
                  listRef.current?.scrollToOffset({
                    animated: false,
                    offset: width * index,
                  });
                }}
                scrollEnabled={pagingEnabled}
                showsHorizontalScrollIndicator={false}
              />
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flex: 1,
  },
  dismissContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  counterChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterLabel: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  slide: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  viewerImage: {
    borderRadius: RADIUS.lg,
    maxHeight: '100%',
    maxWidth: '100%',
  },
});
