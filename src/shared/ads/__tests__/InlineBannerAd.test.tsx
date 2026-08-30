import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';

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
    BannerAd: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, {
        ...props,
        testID: 'native-banner-ad',
      }),
    BannerAdSize: {INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER'},
    TestIds: {BANNER: 'test-banner-unit-id'},
  };
});

jest.mock('../AdsProvider', () => ({
  useAds: jest.fn(),
}));

const mockedUseAds = jest.mocked(useAds);
const hiddenElementsIncluded = {includeHiddenElements: true};

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

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeTruthy();

    screen.rerender(
      <InlineBannerAd active={false} placement="communityBoardList" />,
    );
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();

    screen.rerender(<InlineBannerAd active placement="communityBoardList" />);
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();

    act(() => {
      jest.advanceTimersByTime(MIN_AD_REQUEST_INTERVAL_MS);
    });
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeTruthy();
  });

  it('실제 배너 높이의 노출 영역이 보일 때만 요청하고 로드 후 카드를 표시한다', () => {
    const screen = render(
      <InlineBannerAd
        active
        placement="communityBoardList"
        visible={false}
      />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });

    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({minHeight: 122, opacity: 0});

    screen.rerender(
      <InlineBannerAd active placement="communityBoardList" visible />,
    );

    const nativeBanner = screen.getByTestId(
      'native-banner-ad',
      hiddenElementsIncluded,
    );
    expect(screen.queryByLabelText('광고')).toBeNull();

    fireEvent(nativeBanner, 'adLoaded');

    expect(screen.getByLabelText('광고')).toBeTruthy();
  });

  it('로드 실패 시 광고 슬롯을 접고 화면 재진입 때 요청 간격 후 다시 시도한다', () => {
    const screen = render(
      <InlineBannerAd active placement="communityBoardList" visible />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    fireEvent(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
      'adFailedToLoad',
    );

    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
    expect(screen.queryByLabelText('광고')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({height: 0, opacity: 0});

    screen.rerender(
      <InlineBannerAd active={false} placement="communityBoardList" visible />,
    );
    screen.rerender(
      <InlineBannerAd active placement="communityBoardList" visible />,
    );

    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
    act(() => {
      jest.advanceTimersByTime(MIN_AD_REQUEST_INTERVAL_MS);
    });
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeTruthy();
  });

  it('광고 요청 준비 전에는 시각적 슬롯을 접어둔다', () => {
    mockedUseAds.mockReturnValue({
      activateAds: jest.fn(),
      adsReady: false,
      appActive: true,
      privacyOptionsRequired: false,
      showPrivacyOptions: jest.fn(),
    });

    const screen = render(
      <InlineBannerAd active placement="communityBoardList" />,
    );
    const measurement = screen.getByTestId('inline-banner-ad');

    expect(screen.queryByLabelText('광고')).toBeNull();
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
    expect(StyleSheet.flatten(measurement.props.style)).toMatchObject({
      height: 0,
      opacity: 0,
    });
  });
});
