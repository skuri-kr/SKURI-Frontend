import React from 'react';
import {AppState, type AppStateStatus} from 'react-native';

import {getCurrentLocationSnapshotIfAuthorized} from '@/shared/lib/location/currentLocationSnapshot';

import type {PartyLocation} from '../model/types';
import {
  canShowTaxiSettlementPrompt,
  findTaxiAccountCandidate,
  isNearTaxiSettlementDestination,
  isTaxiSettlementTimeFallbackDue,
  isWithinTaxiSettlementLocationWindow,
  SETTLEMENT_PROMPT_LOCATION_EARLY_WINDOW_MS,
  SETTLEMENT_PROMPT_LOCATION_LATE_WINDOW_MS,
  SETTLEMENT_PROMPT_TIME_FALLBACK_DELAY_MS,
  type TaxiAccountCandidate,
  type TaxiSettlementPromptReason,
} from '../services/taxiSettlementPrompt';
import {
  getTaxiSettlementPromptStorageState,
  updateTaxiSettlementPromptStorageState,
  type TaxiSettlementPromptStorageState,
} from '../services/taxiSettlementPromptStorage';

const SETTLEMENT_PROMPT_DISMISS_DURATION_MS = 30 * 60_000;
const LOCATION_REFRESH_INTERVAL_MS = 5_000;

export interface TaxiSettlementPromptViewData {
  accountCandidate?: TaxiAccountCandidate;
  reason: TaxiSettlementPromptReason;
}

interface UseTaxiSettlementPromptParams {
  actionInFlight: boolean;
  composerValue: string;
  departureTimeISO?: string;
  destinationLocation?: PartyLocation;
  hasSettlementTarget: boolean;
  isLeader: boolean;
  isScreenFocused: boolean;
  partyId?: string;
  partyStatus?: 'open' | 'closed' | 'arrived' | 'ended';
}

const getNextTriggerTime = ({
  departureTimeISO,
  dismissedUntilMs,
}: {
  departureTimeISO?: string;
  dismissedUntilMs?: number;
}) => {
  const nowMs = Date.now();
  const triggerTimes = dismissedUntilMs ? [dismissedUntilMs] : [];

  if (departureTimeISO) {
    const departureTimeMs = Date.parse(departureTimeISO);

    if (Number.isFinite(departureTimeMs)) {
      triggerTimes.push(
        departureTimeMs - SETTLEMENT_PROMPT_LOCATION_EARLY_WINDOW_MS,
        departureTimeMs + SETTLEMENT_PROMPT_TIME_FALLBACK_DELAY_MS,
        departureTimeMs + SETTLEMENT_PROMPT_LOCATION_LATE_WINDOW_MS,
      );
    }
  }

  return triggerTimes
    .filter(triggerTime => triggerTime > nowMs)
    .sort((left, right) => left - right)[0];
};

export const useTaxiSettlementPrompt = ({
  actionInFlight,
  composerValue,
  departureTimeISO,
  destinationLocation,
  hasSettlementTarget,
  isLeader,
  isScreenFocused,
  partyId,
  partyStatus,
}: UseTaxiSettlementPromptParams) => {
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [isAppActive, setIsAppActive] = React.useState(
    () =>
      AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const [location, setLocation] = React.useState<Awaited<
    ReturnType<typeof getCurrentLocationSnapshotIfAuthorized>
  >>(null);
  const [clipboardCandidate, setClipboardCandidate] =
    React.useState<TaxiAccountCandidate | null>(null);
  const [sentAccountCandidate, setSentAccountCandidate] =
    React.useState<TaxiAccountCandidate | null>(null);
  const [accountMessageSent, setAccountMessageSent] = React.useState(false);
  const [storageState, setStorageState] = React.useState<
    TaxiSettlementPromptStorageState | null | undefined
  >(undefined);
  const [timeFallbackLatched, setTimeFallbackLatched] =
    React.useState(false);

  const isEligible =
    !actionInFlight &&
    canShowTaxiSettlementPrompt({
      hasSettlementTarget,
      isLeader,
      partyStatus,
    });
  const composerCandidate = React.useMemo(
    () => findTaxiAccountCandidate(composerValue),
    [composerValue],
  );
  const locationWindowOpen = isWithinTaxiSettlementLocationWindow({
    departureTimeISO,
    nowMs,
  });
  const isDismissed = (storageState?.dismissedUntilMs ?? 0) > nowMs;
  const nearDestination = isNearTaxiSettlementDestination({
    destination: destinationLocation,
    location,
    nowMs,
  });
  const timeFallbackDue = isTaxiSettlementTimeFallbackDue({
    departureTimeISO,
    nowMs,
  });
  const hasSeenTimeFallback = Boolean(storageState?.timeFallbackShown);
  const timeFallbackAvailable =
    timeFallbackDue && (!hasSeenTimeFallback || timeFallbackLatched);
  const hasNonLocationPrompt = Boolean(
    composerCandidate ||
      clipboardCandidate ||
      sentAccountCandidate ||
      accountMessageSent ||
      timeFallbackAvailable,
  );
  const canObserveLocation =
    isEligible &&
    isScreenFocused &&
    isAppActive &&
    Boolean(destinationLocation) &&
    locationWindowOpen &&
    storageState !== undefined;
  const shouldRefreshLocation =
    canObserveLocation &&
    !isDismissed &&
    !hasNonLocationPrompt &&
    !nearDestination;

  React.useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        setIsAppActive(nextAppState === 'active');

        if (nextAppState === 'active') {
          setNowMs(Date.now());
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (isScreenFocused) {
      setNowMs(Date.now());
    }
  }, [isScreenFocused]);

  React.useEffect(() => {
    let mounted = true;

    setStorageState(undefined);
    setClipboardCandidate(null);
    setSentAccountCandidate(null);
    setAccountMessageSent(false);
    setTimeFallbackLatched(false);

    if (!partyId) {
      setStorageState(null);
      return () => {
        mounted = false;
      };
    }

    getTaxiSettlementPromptStorageState(partyId).then(nextState => {
      if (mounted) {
        setStorageState(nextState);
      }
    });

    return () => {
      mounted = false;
    };
  }, [partyId]);

  React.useEffect(() => {
    const nextTriggerTime = getNextTriggerTime({
      departureTimeISO,
      dismissedUntilMs: storageState?.dismissedUntilMs,
    });

    if (!nextTriggerTime) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setNowMs(Date.now());
    }, Math.max(0, nextTriggerTime - Date.now()));

    return () => {
      clearTimeout(timeoutId);
    };
  }, [departureTimeISO, nowMs, storageState?.dismissedUntilMs]);

  React.useEffect(() => {
    if (!canObserveLocation) {
      setLocation(null);
      return;
    }

    if (!shouldRefreshLocation) {
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const refreshLocation = () => {
      getCurrentLocationSnapshotIfAuthorized()
        .then(nextLocation => {
          if (!active) {
            return;
          }

          setLocation(nextLocation);
          setNowMs(Date.now());
        })
        .catch(() => {
          if (active) {
            setLocation(null);
            setNowMs(Date.now());
          }
        })
        .finally(() => {
          if (active) {
            timeoutId = setTimeout(
              refreshLocation,
              LOCATION_REFRESH_INTERVAL_MS,
            );
          }
        });
    };

    refreshLocation();

    return () => {
      active = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    canObserveLocation,
    destinationLocation?.lat,
    destinationLocation?.lng,
    shouldRefreshLocation,
  ]);

  const prompt = React.useMemo<TaxiSettlementPromptViewData | null>(() => {
    if (!isEligible || storageState === undefined) {
      return null;
    }

    if (composerCandidate) {
      return {
        accountCandidate: composerCandidate,
        reason: 'account-text',
      };
    }

    if (clipboardCandidate) {
      return {
        accountCandidate: clipboardCandidate,
        reason: 'clipboard',
      };
    }

    if (sentAccountCandidate) {
      return {
        accountCandidate: sentAccountCandidate,
        reason: 'account-message',
      };
    }

    if (accountMessageSent) {
      return {reason: 'account-message'};
    }

    if (nearDestination) {
      return {reason: 'near-destination'};
    }

    if (timeFallbackAvailable) {
      return {reason: 'departure-time'};
    }

    return null;
  }, [
    accountMessageSent,
    clipboardCandidate,
    composerCandidate,
    isEligible,
    nearDestination,
    sentAccountCandidate,
    storageState,
    timeFallbackAvailable,
  ]);

  const visiblePrompt = isDismissed ? null : prompt;

  React.useEffect(() => {
    if (
      !partyId ||
      visiblePrompt?.reason !== 'departure-time' ||
      timeFallbackLatched ||
      storageState?.timeFallbackShown
    ) {
      return;
    }

    setTimeFallbackLatched(true);
    setStorageState(currentState => ({
      ...currentState,
      timeFallbackShown: true,
    }));
    updateTaxiSettlementPromptStorageState(partyId, {
      timeFallbackShown: true,
    }).catch(() => undefined);
  }, [
    partyId,
    storageState?.timeFallbackShown,
    timeFallbackLatched,
    visiblePrompt?.reason,
  ]);

  const dismissPrompt = React.useCallback(() => {
    if (!partyId) {
      return;
    }

    const dismissedUntilMs = Date.now() + SETTLEMENT_PROMPT_DISMISS_DURATION_MS;

    setClipboardCandidate(null);
    setSentAccountCandidate(null);
    setAccountMessageSent(false);
    setTimeFallbackLatched(false);
    setStorageState(currentState => ({
      ...currentState,
      dismissedUntilMs,
    }));
    updateTaxiSettlementPromptStorageState(partyId, {
      dismissedUntilMs,
    }).catch(() => undefined);
  }, [partyId]);

  const presentClipboardCandidate = React.useCallback(
    (value: string) => {
      const candidate = findTaxiAccountCandidate(value);

      if (!candidate) {
        return null;
      }

      setClipboardCandidate(candidate);
      setSentAccountCandidate(null);
      setAccountMessageSent(false);
      setStorageState(currentState => ({
        ...currentState,
        dismissedUntilMs: undefined,
      }));
      setNowMs(Date.now());

      if (partyId) {
        updateTaxiSettlementPromptStorageState(partyId, {
          dismissedUntilMs: undefined,
        }).catch(() => undefined);
      }

      return candidate;
    },
    [partyId],
  );

  const noteOutgoingText = React.useCallback((value: string) => {
    const candidate = findTaxiAccountCandidate(value);

    if (candidate) {
      setSentAccountCandidate(candidate);
    }
  }, []);

  const noteAccountMessageSent = React.useCallback(() => {
    setAccountMessageSent(true);
  }, []);

  return {
    dismissPrompt,
    noteAccountMessageSent,
    noteOutgoingText,
    presentClipboardCandidate,
    prompt: visiblePrompt,
  } as const;
};
