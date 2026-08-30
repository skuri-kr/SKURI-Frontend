import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';

import {InlineBannerAd} from '../InlineBannerAd';
import {
  MIN_AD_REQUEST_INTERVAL_MS,
  resetAdRequestGateForTests,
} from '../adRequestGate';
import {useAds} from '../AdsProvider';

jest.mock('react-native-google-mobile-ads', () => {
  const ReactModule = require('react');
  const {View} = require('react-native');

  return {
    BannerAd: () =>
      ReactModule.createElement(View, {testID: 'native-banner-ad'}),
    BannerAdSize: {INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER'},
    TestIds: {BANNER: 'test-banner-unit-id'},
  };
});

jest.mock('../AdsProvider', () => ({
  useAds: jest.fn(),
}));

const mockedUseAds = jest.mocked(useAds);

describe('InlineBannerAd', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    resetAdRequestGateForTests();
    mockedUseAds.mockReturnValue({
      activateAds: jest.fn(),
      adsReady: true,
      appActive: true,
      privacyOptionsRequired: false,
      showPrivacyOptions: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('비활성 세그먼트에서 네이티브 배너를 언마운트하고 재요청 간격을 유지한다', () => {
    const screen = render(
      <InlineBannerAd active placement="communityBoardList" />,
    );

    fireEvent(screen.getByLabelText('광고'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    expect(screen.getByTestId('native-banner-ad')).toBeTruthy();

    screen.rerender(
      <InlineBannerAd active={false} placement="communityBoardList" />,
    );
    expect(screen.queryByTestId('native-banner-ad')).toBeNull();

    screen.rerender(<InlineBannerAd active placement="communityBoardList" />);
    expect(screen.queryByTestId('native-banner-ad')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(MIN_AD_REQUEST_INTERVAL_MS);
    });
    expect(screen.getByTestId('native-banner-ad')).toBeTruthy();
  });
});
