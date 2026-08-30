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

export const ADS_RETRY_BASE_DELAY_MS = 5_000;
const ADS_RETRY_MAX_DELAY_MS = 60_000;

interface AdsContextValue {
  activateAds: () => void;
  adsReady: boolean;
  appActive: boolean;
  privacyOptionsRequired: boolean;
  showPrivacyOptions: () => Promise<PrivacyOptionsResult>;
}

const AdsContext = React.createContext<AdsContextValue | null>(null);

export const AdsProvider = ({children}: PropsWithChildren) => {
  const {
    authState,
    guardResult: {route},
  } = useAuthEntryGuard();
  const {checkingVersion, startupModalMode} = useAppBootstrap();
  const [activationRequested, setActivationRequested] = React.useState(false);
  const [canRequestAds, setCanRequestAds] = React.useState(false);
  const [mobileAdsInitialized, setMobileAdsInitialized] = React.useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] =
    React.useState(false);
  const [appState, setAppState] = React.useState<AppStateStatus>(
    AppState.currentState,
  );
  const [retrySequence, setRetrySequence] = React.useState(0);
  const termsEligible = Boolean(authState.user?.termsAccepted);
  const termsEligibleRef = React.useRef(termsEligible);
  termsEligibleRef.current = termsEligible;
  const consentFlowCompletedRef = React.useRef(false);
  const consentFlowInFlightRef = React.useRef(false);
  const consentInfoRef = React.useRef<AdsConsentInfo | null>(null);
  const mobileAdsInitializedRef = React.useRef(false);
  const mobileAdsInitializationRef = React.useRef<Promise<void> | null>(null);
  const retryAttemptRef = React.useRef(0);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const updateConsentState = React.useCallback(
    (consentInfo: AdsConsentInfo) => {
      if (!mountedRef.current || !termsEligibleRef.current) {
        return false;
      }

      consentInfoRef.current = consentInfo;
      setCanRequestAds(consentInfo.canRequestAds);
      setPrivacyOptionsRequired(
        consentInfo.privacyOptionsRequirementStatus ===
          AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      );
      return true;
    },
    [],
  );

  const resetRetry = React.useCallback(() => {
    retryAttemptRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const scheduleRetry = React.useCallback(() => {
    if (!mountedRef.current || retryTimerRef.current) {
      return;
    }

    const delay = Math.min(
      ADS_RETRY_BASE_DELAY_MS * 2 ** retryAttemptRef.current,
      ADS_RETRY_MAX_DELAY_MS,
    );
    retryAttemptRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (mountedRef.current) {
        setRetrySequence(sequence => sequence + 1);
      }
    }, delay);
  }, []);

  const ensureMobileAdsInitialized = React.useCallback(async () => {
    if (mobileAdsInitializedRef.current) {
      return;
    }

    if (mobileAdsInitializationRef.current) {
      return mobileAdsInitializationRef.current;
    }

    const initialization = mobileAds()
      .initialize()
      .then(() => {
        mobileAdsInitializedRef.current = true;
        if (mountedRef.current) {
          setMobileAdsInitialized(true);
        }
      })
      .catch(error => {
        mobileAdsInitializationRef.current = null;
        throw error;
      });

    mobileAdsInitializationRef.current = initialization;
    await initialization;
  }, []);

  React.useEffect(() => {
    if (termsEligible) {
      return;
    }

    consentFlowCompletedRef.current = false;
    consentInfoRef.current = null;
    setCanRequestAds(false);
    setPrivacyOptionsRequired(false);
    resetRetry();
  }, [resetRetry, termsEligible]);

  const canStartConsentFlow =
    activationRequested &&
    appState === 'active' &&
    route === 'main' &&
    termsEligible &&
    !checkingVersion &&
    startupModalMode === 'hidden';

  React.useEffect(() => {
    if (!canStartConsentFlow || consentFlowInFlightRef.current) {
      return;
    }

    consentFlowInFlightRef.current = true;

    const runConsentAndInitialization = async () => {
      try {
        if (!consentFlowCompletedRef.current) {
          let consentInfo: AdsConsentInfo;

          try {
            consentInfo = await AdsConsent.gatherConsent();
          } catch (error) {
            if (mountedRef.current && termsEligibleRef.current) {
              setCanRequestAds(false);
              console.warn('광고 개인정보 동의 수집에 실패했습니다.', error);
              scheduleRetry();
            }
            return;
          }

          if (!updateConsentState(consentInfo)) {
            return;
          }
          consentFlowCompletedRef.current = true;
        }

        if (!consentInfoRef.current?.canRequestAds) {
          resetRetry();
          return;
        }

        try {
          await ensureMobileAdsInitialized();
          resetRetry();
        } catch (error) {
          if (termsEligibleRef.current) {
            console.warn('Google Mobile Ads SDK 초기화에 실패했습니다.', error);
            scheduleRetry();
          }
        }
      } finally {
        consentFlowInFlightRef.current = false;
      }
    };

    runConsentAndInitialization().catch(() => undefined);
  }, [
    canStartConsentFlow,
    ensureMobileAdsInitialized,
    resetRetry,
    retrySequence,
    scheduleRetry,
    updateConsentState,
  ]);

  const showPrivacyOptions = React.useCallback(async () => {
    if (!termsEligible) {
      return 'unavailable' as const;
    }

    let consentInfo: AdsConsentInfo;

    try {
      consentInfo = await AdsConsent.requestInfoUpdate();
      if (!updateConsentState(consentInfo)) {
        return 'unavailable' as const;
      }
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
      if (mountedRef.current) {
        setCanRequestAds(false);
      }
      const updatedConsentInfo = await AdsConsent.showPrivacyOptionsForm();
      if (!updateConsentState(updatedConsentInfo)) {
        return 'unavailable' as const;
      }
      consentFlowCompletedRef.current = true;

      if (updatedConsentInfo.canRequestAds) {
        try {
          await ensureMobileAdsInitialized();
          resetRetry();
        } catch (error) {
          console.warn('Google Mobile Ads SDK 초기화에 실패했습니다.', error);
          scheduleRetry();
        }
      } else {
        resetRetry();
      }
      return 'shown' as const;
    } catch (error) {
      updateConsentState(consentInfo);
      console.warn('광고 개인정보 설정 화면을 열지 못했습니다.', error);
      return 'unavailable' as const;
    }
  }, [
    ensureMobileAdsInitialized,
    resetRetry,
    scheduleRetry,
    termsEligible,
    updateConsentState,
  ]);

  const activateAds = React.useCallback(() => {
    setActivationRequested(true);
  }, []);

  const adsReady = termsEligible && canRequestAds && mobileAdsInitialized;

  const value = React.useMemo<AdsContextValue>(
    () => ({
      activateAds,
      adsReady,
      appActive: appState === 'active',
      privacyOptionsRequired,
      showPrivacyOptions,
    }),
    [activateAds, adsReady, appState, privacyOptionsRequired, showPrivacyOptions],
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
