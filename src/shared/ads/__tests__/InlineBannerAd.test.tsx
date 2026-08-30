import React from 'react';
import {useIsFocused} from '@react-navigation/native';
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

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

const mockedUseAds = jest.mocked(useAds);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const hiddenElementsIncluded = {includeHiddenElements: true};

describe('InlineBannerAd', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    resetAdRequestGateForTests();
    mockedUseIsFocused.mockReturnValue(true);
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

  it('비활성 세그먼트에서도 로드된 배너를 보존하고 복귀 즉시 재사용한다', () => {
    const screen = render(
      <InlineBannerAd active placement="communityBoardList" />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    const nativeBanner = screen.getByTestId(
      'native-banner-ad',
      hiddenElementsIncluded,
    );
    fireEvent(nativeBanner, 'adLoaded');
    expect(screen.getByLabelText('광고')).toBeTruthy();

    screen.rerender(
      <InlineBannerAd active={false} placement="communityBoardList" />,
    );
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBe(nativeBanner);
    expect(screen.queryByLabelText('광고')).toBeNull();

    screen.rerender(<InlineBannerAd active placement="communityBoardList" />);
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBe(nativeBanner);
    expect(screen.getByLabelText('광고')).toBeTruthy();
  });

  it('다른 하단 탭으로 이동해도 로드된 배너를 보존한다', () => {
    const screen = render(
      <InlineBannerAd active placement="noticeList" />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    const nativeBanner = screen.getByTestId(
      'native-banner-ad',
      hiddenElementsIncluded,
    );
    fireEvent(nativeBanner, 'adLoaded');

    mockedUseIsFocused.mockReturnValue(false);
    screen.rerender(<InlineBannerAd active placement="noticeList" />);
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBe(nativeBanner);
    expect(screen.queryByLabelText('광고')).toBeNull();

    mockedUseIsFocused.mockReturnValue(true);
    screen.rerender(<InlineBannerAd active placement="noticeList" />);
    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBe(nativeBanner);
    expect(screen.getByLabelText('광고')).toBeTruthy();
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

  it('한 번 로드된 배너는 viewport 경계에서 숨기지 않고 스크롤에 맡긴다', () => {
    const screen = render(
      <InlineBannerAd active placement="noticeList" visible />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    const nativeBanner = screen.getByTestId(
      'native-banner-ad',
      hiddenElementsIncluded,
    );
    fireEvent(nativeBanner, 'adLoaded');

    screen.rerender(
      <InlineBannerAd active placement="noticeList" visible={false} />,
    );

    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBe(nativeBanner);
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

  it('ScrollView 슬롯이 실패로 접혀도 요청 간격 후 측정 영역을 복원한다', () => {
    const screen = render(
      <InlineBannerAd active placement="campusHome" visible />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    fireEvent(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
      'adFailedToLoad',
    );
    screen.rerender(
      <InlineBannerAd active placement="campusHome" visible={false} />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({height: 0, opacity: 0});

    act(() => {
      jest.advanceTimersByTime(MIN_AD_REQUEST_INTERVAL_MS);
    });

    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({minHeight: 122, opacity: 0});
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();

    screen.rerender(<InlineBannerAd active placement="campusHome" visible />);

    expect(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeTruthy();
  });

  it('비활성 화면에서는 실패한 배너의 측정 영역을 복원하지 않는다', () => {
    const screen = render(
      <InlineBannerAd active placement="noticeDetail" visible />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    fireEvent(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
      'adFailedToLoad',
    );
    screen.rerender(
      <InlineBannerAd active={false} placement="noticeDetail" visible={false} />,
    );

    act(() => {
      jest.advanceTimersByTime(MIN_AD_REQUEST_INTERVAL_MS);
    });

    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({height: 0, opacity: 0});
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
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

  it('광고 개인정보 처리 가능 상태가 사라지면 로드된 배너를 제거한다', () => {
    const activateAds = jest.fn();
    const showPrivacyOptions = jest.fn();
    mockedUseAds.mockReturnValue({
      activateAds,
      adsReady: true,
      appActive: true,
      privacyOptionsRequired: false,
      showPrivacyOptions,
    });
    const screen = render(
      <InlineBannerAd active placement="noticeList" />,
    );

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', {
      nativeEvent: {layout: {width: 320}},
    });
    fireEvent(
      screen.getByTestId('native-banner-ad', hiddenElementsIncluded),
      'adLoaded',
    );
    expect(screen.getByLabelText('광고')).toBeTruthy();

    mockedUseAds.mockReturnValue({
      activateAds,
      adsReady: false,
      appActive: true,
      privacyOptionsRequired: false,
      showPrivacyOptions,
    });
    screen.rerender(<InlineBannerAd active placement="noticeList" />);

    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
    expect(screen.queryByLabelText('광고')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('inline-banner-ad').props.style))
      .toMatchObject({height: 0, opacity: 0});
  });

  it('외부 viewport 가시성 계산에 내부 레이아웃을 전달한다', () => {
    const onLayout = jest.fn();
    const screen = render(
      <InlineBannerAd
        onLayout={onLayout}
        placement="communityBoardDetail"
        visible={false}
      />,
    );
    const event = {
      nativeEvent: {layout: {height: 122, width: 320, x: 0, y: 700}},
    };

    fireEvent(screen.getByTestId('inline-banner-ad'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
    expect(
      screen.queryByTestId('native-banner-ad', hiddenElementsIncluded),
    ).toBeNull();
  });
});
