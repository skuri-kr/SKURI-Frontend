import React, {PropsWithChildren} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import {useAppBootstrap} from '@/app/bootstrap/useAppBootstrap';
import {useAuthEntryGuard} from '@/app/guards';

export type PrivacyOptionsResult = 'shown' | 'notRequired' | 'unavailable';

interface AdsContextValue {
  activateAds: () => void;
  adsReady: boolean;
  appActive: boolean;
  showPrivacyOptions: () => Promise<PrivacyOptionsResult>;
}

const AdsContext = React.createContext<AdsContextValue | null>(null);

export const AdsProvider = ({children}: PropsWithChildren) => {
  const {
    guardResult: {route},
  } = useAuthEntryGuard();
  const {checkingVersion, startupModalMode} = useAppBootstrap();
  const [activationRequested, setActivationRequested] = React.useState(false);
  const [adsReady, setAdsReady] = React.useState(false);
  const [appState, setAppState] = React.useState<AppStateStatus>(
    AppState.currentState,
  );
  const consentStartedRef = React.useRef(false);
  const mobileAdsInitializationRef = React.useRef<Promise<void> | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const startMobileAds = React.useCallback(async () => {
    let consentInfo: AdsConsentInfo;

    try {
      consentInfo = await AdsConsent.getConsentInfo();
    } catch (error) {
      console.warn('광고 동의 상태를 확인하지 못했습니다.', error);
      return;
    }

    if (!consentInfo.canRequestAds) {
      return;
    }

    if (mobileAdsInitializationRef.current) {
      return mobileAdsInitializationRef.current;
    }

    const initialization = mobileAds()
      .initialize()
      .then(() => {
        if (mountedRef.current) {
          setAdsReady(true);
        }
      })
      .catch(error => {
        mobileAdsInitializationRef.current = null;
        console.warn('Google Mobile Ads SDK 초기화에 실패했습니다.', error);
      });

    mobileAdsInitializationRef.current = initialization;
    await initialization;
  }, []);

  const canStartConsentFlow =
    activationRequested &&
    appState === 'active' &&
    route === 'main' &&
    !checkingVersion &&
    startupModalMode === 'hidden';

  React.useEffect(() => {
    if (!canStartConsentFlow || consentStartedRef.current) {
      return;
    }

    consentStartedRef.current = true;

    AdsConsent.gatherConsent()
      .then(() => startMobileAds())
      .catch(error => {
        consentStartedRef.current = false;
        console.warn('광고 개인정보 동의 수집에 실패했습니다.', error);
        startMobileAds().catch(() => undefined);
      });

    startMobileAds().catch(() => undefined);
  }, [canStartConsentFlow, startMobileAds]);

  const showPrivacyOptions = React.useCallback(async () => {
    let consentInfo: AdsConsentInfo;

    try {
      consentInfo = await AdsConsent.requestInfoUpdate();
    } catch (error) {
      console.warn('광고 개인정보 설정 상태를 확인하지 못했습니다.', error);
      return 'unavailable' as const;
    }

    if (
      consentInfo.privacyOptionsRequirementStatus !==
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    ) {
      return 'notRequired' as const;
    }

    if (!consentInfo.isConsentFormAvailable) {
      return 'unavailable' as const;
    }

    try {
      await AdsConsent.showPrivacyOptionsForm();
      await startMobileAds();
      return 'shown' as const;
    } catch (error) {
      console.warn('광고 개인정보 설정 화면을 열지 못했습니다.', error);
      return 'unavailable' as const;
    }
  }, [startMobileAds]);

  const activateAds = React.useCallback(() => {
    setActivationRequested(true);
  }, []);

  const value = React.useMemo<AdsContextValue>(
    () => ({
      activateAds,
      adsReady,
      appActive: appState === 'active',
      showPrivacyOptions,
    }),
    [activateAds, adsReady, appState, showPrivacyOptions],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
};

export const useAds = () => {
  const context = React.useContext(AdsContext);

  if (!context) {
    throw new Error('useAds must be used within an AdsProvider.');
  }

  return context;
};
