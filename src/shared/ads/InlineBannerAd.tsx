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
}

export const InlineBannerAd = ({
  active = true,
  placement,
  slotIndex = 1,
  style,
}: InlineBannerAdProps) => {
  const isFocused = useIsFocused();
  const {activateAds, adsReady, appActive} = useAds();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [hasActivated, setHasActivated] = React.useState(false);
  const [shouldRenderAd, setShouldRenderAd] = React.useState(false);
  const slotKey = `${placement}:${slotIndex}`;
  const canMountBanner = active && isFocused && appActive && adsReady;
  const showAdSlot = shouldRenderAd && canMountBanner;

  React.useEffect(() => {
    if (!active || !isFocused || !appActive) {
      return;
    }

    setHasActivated(true);
    activateAds();
  }, [activateAds, active, appActive, isFocused]);

  React.useEffect(() => {
    if (!canMountBanner) {
      setShouldRenderAd(false);
    }
  }, [canMountBanner]);

  React.useEffect(() => {
    if (
      shouldRenderAd ||
      !hasActivated ||
      !canMountBanner ||
      containerWidth <= 0
    ) {
      return;
    }

    const renderAd = () => {
      recordAdRequest(slotKey);
      setShouldRenderAd(true);
    };
    const delay = getAdRequestDelay(slotKey);

    if (delay === 0) {
      renderAd();
      return;
    }

    const timer = setTimeout(renderAd, delay);
    return () => clearTimeout(timer);
  }, [canMountBanner, containerWidth, hasActivated, shouldRenderAd, slotKey]);

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
      style={showAdSlot ? [styles.container, style] : [style, styles.measurement]}
      testID="inline-banner-ad">
      {showAdSlot ? (
        <>
          <Text style={styles.label}>광고</Text>
          <View style={styles.adSlot}>
            <BannerAd
              maxHeight={100}
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
  measurement: {
    alignSelf: 'stretch',
    height: 1,
    marginBottom: 0,
    marginTop: 0,
    minHeight: 0,
    opacity: 0,
    overflow: 'hidden',
  },
});
