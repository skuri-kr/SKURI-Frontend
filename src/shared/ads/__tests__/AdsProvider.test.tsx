import React from 'react';
import {act, render} from '@testing-library/react-native';
import {AppState} from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import {useAppBootstrap} from '@/app/bootstrap/useAppBootstrap';
import {useAuthEntryGuard} from '@/app/guards';

import {ADS_RETRY_BASE_DELAY_MS, AdsProvider, useAds} from '../AdsProvider';

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: jest.fn(),
  AdsConsent: {
    gatherConsent: jest.fn(),
    requestInfoUpdate: jest.fn(),
    showPrivacyOptionsForm: jest.fn(),
  },
  AdsConsentPrivacyOptionsRequirementStatus: {
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
  },
}));

jest.mock('@/app/bootstrap/useAppBootstrap', () => ({
  useAppBootstrap: jest.fn(),
}));

jest.mock('@/app/guards', () => ({
  useAuthEntryGuard: jest.fn(),
}));

const mockedGatherConsent = jest.mocked(AdsConsent.gatherConsent);
const mockedMobileAds = jest.mocked(mobileAds);
const mockedRequestInfoUpdate = jest.mocked(AdsConsent.requestInfoUpdate);
const mockedShowPrivacyOptionsForm = jest.mocked(
  AdsConsent.showPrivacyOptionsForm,
);
const mockedUseAppBootstrap = jest.mocked(useAppBootstrap);
const mockedUseAuthEntryGuard = jest.mocked(useAuthEntryGuard);
const mockInitialize = jest.fn();

const consentInfo = (
  canRequestAds: boolean,
  privacyOptionsRequirementStatus = AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
) =>
  ({
    canRequestAds,
    isConsentFormAvailable: true,
    privacyOptionsRequirementStatus,
  } as AdsConsentInfo);

let latestAds: ReturnType<typeof useAds>;

const AdsProbe = () => {
  const ads = useAds();
  const {activateAds} = ads;
  latestAds = ads;

  React.useEffect(() => {
    activateAds();
  }, [activateAds]);

  return null;
};

const renderProvider = () =>
  render(
    <AdsProvider>
      <AdsProbe />
    </AdsProvider>,
  );

const mockTermsEligibility = (termsAccepted: boolean) => {
  mockedUseAuthEntryGuard.mockReturnValue({
    authState: {user: {termsAccepted}},
    guardResult: {route: 'main'},
  } as ReturnType<typeof useAuthEntryGuard>);
};

const flushAsyncWork = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('AdsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockTermsEligibility(true);
    mockedUseAppBootstrap.mockReturnValue({
      checkingVersion: false,
      dismissStartupModal: jest.fn(),
      retryVersionCheck: jest.fn(),
      startupModalMode: 'hidden',
    });
    mockedMobileAds.mockReturnValue({
      initialize: mockInitialize,
    } as unknown as ReturnType<typeof mobileAds>);
    mockInitialize.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('현재 동의 수집이 완료되기 전에는 SDK를 초기화하지 않는다', async () => {
    let resolveConsent: (value: AdsConsentInfo) => void = () => undefined;
    mockedGatherConsent.mockReturnValue(
      new Promise(resolve => {
        resolveConsent = resolve;
      }),
    );

    renderProvider();
    await flushAsyncWork();

    expect(mockedGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockInitialize).not.toHaveBeenCalled();

    resolveConsent(consentInfo(true));
    await flushAsyncWork();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(latestAds.adsReady).toBe(true);
  });

  it('개인정보 설정 변경 후 광고 요청이 금지되면 준비 상태를 해제한다', async () => {
    mockedGatherConsent.mockResolvedValue(consentInfo(true));
    mockedRequestInfoUpdate.mockResolvedValue(
      consentInfo(true, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );
    mockedShowPrivacyOptionsForm.mockResolvedValue(
      consentInfo(false, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );

    renderProvider();
    await flushAsyncWork();
    expect(latestAds.adsReady).toBe(true);

    let result: Awaited<ReturnType<typeof latestAds.showPrivacyOptions>>;
    await act(async () => {
      result = await latestAds.showPrivacyOptions();
    });

    expect(result!).toBe('shown');
    expect(latestAds.adsReady).toBe(false);
  });

  it('개인정보 설정 화면을 열지 못하면 직전에 확인한 광고 자격을 복원한다', async () => {
    mockedGatherConsent.mockResolvedValue(consentInfo(true));
    mockedRequestInfoUpdate.mockResolvedValue(
      consentInfo(true, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );
    mockedShowPrivacyOptionsForm.mockRejectedValue(new Error('native form'));

    renderProvider();
    await flushAsyncWork();
    expect(latestAds.adsReady).toBe(true);

    let result: Awaited<ReturnType<typeof latestAds.showPrivacyOptions>>;
    await act(async () => {
      result = await latestAds.showPrivacyOptions();
    });

    expect(result!).toBe('unavailable');
    expect(latestAds.adsReady).toBe(true);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('개인정보 설정을 연속 요청해도 진행 중인 네이티브 화면을 공유한다', async () => {
    let resolvePrivacyOptions: (value: AdsConsentInfo) => void = () =>
      undefined;
    mockedGatherConsent.mockResolvedValue(consentInfo(true));
    mockedRequestInfoUpdate.mockResolvedValue(
      consentInfo(true, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );
    mockedShowPrivacyOptionsForm.mockReturnValue(
      new Promise(resolve => {
        resolvePrivacyOptions = resolve;
      }),
    );

    renderProvider();
    await flushAsyncWork();
    expect(latestAds.adsReady).toBe(true);

    let firstRequest!: ReturnType<typeof latestAds.showPrivacyOptions>;
    let secondRequest!: ReturnType<typeof latestAds.showPrivacyOptions>;
    await act(async () => {
      firstRequest = latestAds.showPrivacyOptions();
      secondRequest = latestAds.showPrivacyOptions();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstRequest).toBe(secondRequest);
    expect(mockedRequestInfoUpdate).toHaveBeenCalledTimes(1);
    expect(mockedShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(latestAds.adsReady).toBe(false);

    await act(async () => {
      resolvePrivacyOptions(
        consentInfo(
          false,
          AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        ),
      );
      await Promise.all([firstRequest, secondRequest]);
    });

    expect(latestAds.adsReady).toBe(false);
  });

  it('현재 사용자의 약관 동의가 사라지면 광고를 차단하고 재동의 후 UMP를 다시 확인한다', async () => {
    mockedGatherConsent.mockResolvedValue(consentInfo(true));

    const screen = renderProvider();
    await flushAsyncWork();
    expect(latestAds.adsReady).toBe(true);

    mockTermsEligibility(false);
    screen.rerender(
      <AdsProvider>
        <AdsProbe />
      </AdsProvider>,
    );
    await flushAsyncWork();

    expect(latestAds.adsReady).toBe(false);
    expect(mockedGatherConsent).toHaveBeenCalledTimes(1);

    mockTermsEligibility(true);
    screen.rerender(
      <AdsProvider>
        <AdsProbe />
      </AdsProvider>,
    );
    await flushAsyncWork();

    expect(mockedGatherConsent).toHaveBeenCalledTimes(2);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(latestAds.adsReady).toBe(true);
  });

  it('동의 수집이 일시적으로 실패하면 지연 후 재시도한다', async () => {
    jest.useFakeTimers();
    mockedGatherConsent
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(consentInfo(true));

    renderProvider();
    await flushAsyncWork();
    expect(mockedGatherConsent).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(ADS_RETRY_BASE_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedGatherConsent).toHaveBeenCalledTimes(2);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(latestAds.adsReady).toBe(true);
  });

  it('SDK 초기화가 일시적으로 실패하면 동의를 다시 받지 않고 초기화만 재시도한다', async () => {
    jest.useFakeTimers();
    mockedGatherConsent.mockResolvedValue(consentInfo(true));
    mockInitialize
      .mockRejectedValueOnce(new Error('native init'))
      .mockResolvedValueOnce(undefined);

    renderProvider();
    await flushAsyncWork();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(latestAds.adsReady).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(ADS_RETRY_BASE_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(2);
    expect(latestAds.adsReady).toBe(true);
  });
});
