import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  ImageLightboxModal,
  SkeletonImage,
  type ImageLightboxItem,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

type AppNoticeHeroCarouselProps = {
  images: ImageSourcePropType[];
};

const HERO_HEIGHT = 208;

export const AppNoticeHeroCarousel = ({images}: AppNoticeHeroCarouselProps) => {
  const {width} = useWindowDimensions();
  const listRef = React.useRef<FlatList<ImageSourcePropType>>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [viewerVisible, setViewerVisible] = React.useState(false);

  const viewerImages = React.useMemo<ImageLightboxItem[]>(
    () =>
      images.map((source, index) => ({
        id: `app-notice-image-${index + 1}`,
        source,
      })),
    [images],
  );

  const handleMomentumScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setCurrentIndex(nextIndex);
    },
    [width],
  );

  const scrollToIndex = React.useCallback((nextIndex: number) => {
    listRef.current?.scrollToIndex({animated: true, index: nextIndex});
    setCurrentIndex(nextIndex);
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        keyExtractor={(_, index) => `hero-${index}`}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        pagingEnabled
        renderItem={({item, index}) => (
          <TouchableOpacity
            accessibilityLabel="앱 공지 이미지 크게 보기"
            accessibilityRole="button"
            activeOpacity={0.95}
            onPress={() => {
              setViewerIndex(index);
              setViewerVisible(true);
            }}>
            <SkeletonImage source={item} style={[styles.image, {width}]} />
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {images.length > 1 ? (
        <>
          <TouchableOpacity
            accessibilityLabel="이전 이미지"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={currentIndex === 0}
            onPress={() => scrollToIndex(currentIndex - 1)}
            style={[
              styles.arrowButton,
              styles.leftArrow,
              currentIndex === 0 ? styles.arrowDisabled : null,
            ]}>
            <Icon color={COLORS.text.primary} name="chevron-back" size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="다음 이미지"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={currentIndex === images.length - 1}
            onPress={() => scrollToIndex(currentIndex + 1)}
            style={[
              styles.arrowButton,
              styles.rightArrow,
              currentIndex === images.length - 1 ? styles.arrowDisabled : null,
            ]}>
            <Icon
              color={COLORS.text.primary}
              name="chevron-forward"
              size={18}
            />
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorLabel}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        </>
      ) : null}

      <ImageLightboxModal
        images={viewerImages}
        initialIndex={viewerIndex}
        onRequestClose={() => {
          setViewerVisible(false);
        }}
        visible={viewerVisible}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.subtle,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  image: {
    height: HERO_HEIGHT,
    resizeMode: 'cover',
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    top: HERO_HEIGHT / 2 - 18,
    width: 36,
    ...SHADOWS.card,
  },
  leftArrow: {
    left: SPACING.lg,
  },
  rightArrow: {
    right: SPACING.lg,
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  pageIndicator: {
    backgroundColor: 'rgba(17,24,39,0.72)',
    borderRadius: RADIUS.pill,
    bottom: SPACING.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: SPACING.lg,
  },
  pageIndicatorLabel: {
    color: COLORS.text.inverse,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
});
