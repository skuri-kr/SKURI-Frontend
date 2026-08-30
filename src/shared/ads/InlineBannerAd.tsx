import {useIsFocused} from '@react-navigation/native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

import {getAdRequestDelay, recordAdRequest} from './adRequestGate';
import {getAdUnitId, type AdPlacement} from './adUnits';
import {useAds} from './AdsProvider';

interface InlineBannerAdProps {
  active?: boolean;
  placement: AdPlacement;
  slotIndex?: number;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
}

type BannerLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export const InlineBannerAd = ({
  active = true,
  placement,
  slotIndex = 1,
  style,
  visible = true,
}: InlineBannerAdProps) => {
  const isFocused = useIsFocused();
  const {activateAds, adsReady, appActive} = useAds();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [hasActivated, setHasActivated] = React.useState(false);
  const [loadState, setLoadState] =
    React.useState<BannerLoadState>('idle');
  const slotKey = `${placement}:${slotIndex}`;
  const canPrepareSlot = active && isFocused && appActive && adsReady;
  const canRequestBanner = canPrepareSlot && visible;
  const showAdSlot = canRequestBanner && loadState === 'loaded';
  const shouldMountBanner =
    canRequestBanner && (loadState === 'loading' || loadState === 'loaded');
  const showViewabilityFootprint =
    canPrepareSlot && loadState !== 'failed';

  React.useEffect(() => {
    if (!active || !isFocused || !appActive) {
      return;
    }

    setHasActivated(true);
    activateAds();
  }, [activateAds, active, appActive, isFocused]);

  React.useEffect(() => {
    if (!canPrepareSlot) {
      setLoadState('idle');
      return;
    }

    if (!visible) {
      setLoadState(currentState =>
        currentState === 'failed' ? currentState : 'idle',
      );
    }
  }, [canPrepareSlot, visible]);

  React.useEffect(() => {
    if (
      loadState !== 'idle' ||
      !hasActivated ||
      !canRequestBanner ||
      containerWidth <= 0
    ) {
      return;
    }

    const renderAd = () => {
      recordAdRequest(slotKey);
      setLoadState('loading');
    };
    const delay = getAdRequestDelay(slotKey);

    if (delay === 0) {
      renderAd();
      return;
    }

    const timer = setTimeout(renderAd, delay);
    return () => clearTimeout(timer);
  }, [
    canRequestBanner,
    containerWidth,
    hasActivated,
    loadState,
    slotKey,
  ]);

  const handleAdLoaded = React.useCallback(() => {
    setLoadState(currentState =>
      currentState === 'loading' ? 'loaded' : currentState,
    );
  }, []);

  const handleAdFailedToLoad = React.useCallback(() => {
    setLoadState(currentState =>
      currentState === 'loading' ? 'failed' : currentState,
    );
  }, []);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    setContainerWidth(currentWidth =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  }, []);

  return (
    <View
      accessibilityLabel={showAdSlot ? '광고' : undefined}
      onLayout={handleLayout}
      style={
        showAdSlot
          ? [styles.container, style]
          : showViewabilityFootprint
            ? [styles.viewabilityFootprint, style]
            : [style, styles.collapsed]
      }
      testID="inline-banner-ad">
      {shouldMountBanner ? (
        <>
          {showAdSlot ? <Text style={styles.label}>광고</Text> : null}
          <View
            accessibilityElementsHidden={!showAdSlot}
            importantForAccessibility={
              showAdSlot ? 'auto' : 'no-hide-descendants'
            }
            style={showAdSlot ? styles.adSlot : styles.pendingAdSlot}>
            <BannerAd
              maxHeight={100}
              onAdFailedToLoad={handleAdFailedToLoad}
              onAdLoaded={handleAdLoaded}
              size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
              unitId={getAdUnitId(placement)}
              width={containerWidth}
            />
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  adSlot: {
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  container: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: SPACING.md,
    minHeight: 122,
    overflow: 'hidden',
  },
  label: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  collapsed: {
    alignSelf: 'stretch',
    height: 0,
    marginBottom: 0,
    marginTop: 0,
    minHeight: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  pendingAdSlot: {
    height: 100,
    opacity: 0,
    overflow: 'hidden',
  },
  viewabilityFootprint: {
    alignSelf: 'stretch',
    marginVertical: SPACING.md,
    minHeight: 122,
    opacity: 0,
    overflow: 'hidden',
  },
});
