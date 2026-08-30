import React from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

const MIN_VISIBLE_FRACTION = 0.2;

interface ScrollViewportMetrics {
  adHeight: number;
  adY: number;
  scrollY: number;
  viewportHeight: number;
}

export const isAdVisibleInScrollViewport = ({
  adHeight,
  adY,
  scrollY,
  viewportHeight,
}: ScrollViewportMetrics): boolean => {
  if (adHeight <= 0 || viewportHeight <= 0) {
    return false;
  }

  const viewportBottom = scrollY + viewportHeight;
  const adBottom = adY + adHeight;
  const visibleHeight = Math.max(
    0,
    Math.min(adBottom, viewportBottom) - Math.max(adY, scrollY),
  );

  return visibleHeight >= adHeight * MIN_VISIBLE_FRACTION;
};

export const useScrollViewAdVisibility = () => {
  const viewportHeightRef = React.useRef(0);
  const scrollYRef = React.useRef(0);
  const adLayoutRef = React.useRef({height: 0, y: 0});
  const visibleRef = React.useRef(false);
  const [visible, setVisible] = React.useState(false);

  const updateVisibility = React.useCallback(() => {
    const nextVisible = isAdVisibleInScrollViewport({
      adHeight: adLayoutRef.current.height,
      adY: adLayoutRef.current.y,
      scrollY: scrollYRef.current,
      viewportHeight: viewportHeightRef.current,
    });

    if (visibleRef.current === nextVisible) {
      return;
    }

    visibleRef.current = nextVisible;
    setVisible(nextVisible);
  }, []);

  const handleAdLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const {height, y} = event.nativeEvent.layout;
      adLayoutRef.current = {height, y};
      updateVisibility();
    },
    [updateVisibility],
  );

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, layoutMeasurement} = event.nativeEvent;
      scrollYRef.current = Math.max(0, contentOffset.y);
      if (layoutMeasurement.height > 0) {
        viewportHeightRef.current = layoutMeasurement.height;
      }
      updateVisibility();
    },
    [updateVisibility],
  );

  const handleViewportLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      updateVisibility();
    },
    [updateVisibility],
  );

  return {
    handleAdLayout,
    handleScroll,
    handleViewportLayout,
    visible,
  };
};
