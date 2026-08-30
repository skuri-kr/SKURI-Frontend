import {act, renderHook} from '@testing-library/react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import {
  isAdVisibleInScrollViewport,
  useScrollViewAdVisibility,
} from '../useScrollViewAdVisibility';

const layoutEvent = (height: number, y = 0) =>
  ({nativeEvent: {layout: {height, width: 320, x: 0, y}}}) as LayoutChangeEvent;

const scrollEvent = (scrollY: number, viewportHeight = 600) =>
  ({
    nativeEvent: {
      contentOffset: {x: 0, y: scrollY},
      layoutMeasurement: {height: viewportHeight, width: 320},
    },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

describe('useScrollViewAdVisibility', () => {
  it('광고 높이의 20% 이상이 viewport에 들어올 때만 노출로 판정한다', () => {
    expect(
      isAdVisibleInScrollViewport({
        adHeight: 122,
        adY: 700,
        scrollY: 0,
        viewportHeight: 600,
      }),
    ).toBe(false);
    expect(
      isAdVisibleInScrollViewport({
        adHeight: 122,
        adY: 700,
        scrollY: 125,
        viewportHeight: 600,
      }),
    ).toBe(true);
    expect(
      isAdVisibleInScrollViewport({
        adHeight: 122,
        adY: 700,
        scrollY: 111,
        viewportHeight: 600,
      }),
    ).toBe(false);
  });

  it('스크롤 위치가 광고 경계를 통과할 때만 visible 상태를 전환한다', () => {
    const {result} = renderHook(() => useScrollViewAdVisibility());

    act(() => {
      result.current.handleViewportLayout(layoutEvent(600));
      result.current.handleAdLayout(layoutEvent(122, 700));
    });
    expect(result.current.visible).toBe(false);

    act(() => {
      result.current.handleScroll(scrollEvent(125));
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.handleScroll(scrollEvent(850));
    });
    expect(result.current.visible).toBe(false);
  });
});
