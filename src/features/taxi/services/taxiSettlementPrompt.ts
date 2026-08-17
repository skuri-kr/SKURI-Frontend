import type {PartyLocation} from '../model/types';
import {resolveTaxiAccountBankName} from '../model/accountBank';

export const ACCOUNT_NUMBER_MIN_LENGTH = 8;
export const ACCOUNT_NUMBER_MAX_LENGTH = 20;
export const SETTLEMENT_PROMPT_DISTANCE_METERS = 300;
export const SETTLEMENT_PROMPT_MAX_LOCATION_ACCURACY_METERS = 100;
export const SETTLEMENT_PROMPT_MAX_LOCATION_AGE_MS = 60_000;
export const SETTLEMENT_PROMPT_LOCATION_EARLY_WINDOW_MS = 10 * 60_000;
export const SETTLEMENT_PROMPT_LOCATION_LATE_WINDOW_MS = 4 * 60 * 60_000;
export const SETTLEMENT_PROMPT_TIME_FALLBACK_DELAY_MS = 20 * 60_000;

const ACCOUNT_NUMBER_PATTERN = /\d(?:[\d\s-]*\d)?/g;
const HANGUL_WORD_PATTERN = /[가-힣]+/g;
const ACCOUNT_LABELS = new Set([
  '계좌',
  '계좌번호',
  '번호',
  '은행',
  '은행명',
  '예금주',
  '입금',
  '정산',
  '송금',
  '이름',
  '택시',
  '휴대폰',
  '전화번호',
]);

export type TaxiSettlementPromptReason =
  | 'account-text'
  | 'clipboard'
  | 'account-message'
  | 'near-destination'
  | 'departure-time';

export interface TaxiAccountCandidate {
  accountHolder?: string;
  accountNumber: string;
  bankName?: string;
}

export interface TaxiSettlementPromptEligibility {
  hasSettlementTarget: boolean;
  isLeader: boolean;
  partyStatus?: 'open' | 'closed' | 'arrived' | 'ended';
}

export interface TaxiSettlementPromptLocation {
  accuracyMeters: number;
  latitude: number;
  longitude: number;
  timestampMs: number;
}

const isAccountLabel = (value: string) =>
  Array.from(ACCOUNT_LABELS).some(label => value.includes(label));

const findAccountHolder = ({
  accountMatchIndex,
  accountMatchLength,
  value,
}: {
  accountMatchIndex: number;
  accountMatchLength: number;
  value: string;
}) => {
  const contextStart = Math.max(0, accountMatchIndex - 28);
  const contextEnd = Math.min(value.length, accountMatchIndex + 52);
  const context = value.slice(contextStart, contextEnd);
  const accountMatchEnd = accountMatchIndex + accountMatchLength;
  const candidates = Array.from(context.matchAll(HANGUL_WORD_PATTERN))
    .map(match => ({
      index: contextStart + (match.index ?? 0),
      value: match[0],
    }))
    .filter(candidate => {
      const {value: candidateValue} = candidate;

      if (candidateValue.length < 2 || candidateValue.length > 4) {
        return false;
      }

      if (isAccountLabel(candidateValue)) {
        return false;
      }

      return !resolveTaxiAccountBankName(candidateValue);
    })
    .sort((left, right) => {
      const getDistance = (candidateIndex: number, candidateLength: number) => {
        const candidateEnd = candidateIndex + candidateLength;

        if (candidateIndex > accountMatchEnd) {
          return candidateIndex - accountMatchEnd;
        }

        return Math.max(0, accountMatchIndex - candidateEnd);
      };

      return (
        getDistance(left.index, left.value.length) -
        getDistance(right.index, right.value.length)
      );
    });

  return candidates[0]?.value;
};

export const findTaxiAccountCandidate = (
  value: string,
): TaxiAccountCandidate | null => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const bankName = resolveTaxiAccountBankName(normalizedValue);
  const accountMatches = normalizedValue.matchAll(ACCOUNT_NUMBER_PATTERN);

  for (const accountMatch of accountMatches) {
    const rawAccountNumber = accountMatch[0];
    const accountNumber = rawAccountNumber.replace(/\D/g, '');

    if (
      accountNumber.length < ACCOUNT_NUMBER_MIN_LENGTH ||
      accountNumber.length > ACCOUNT_NUMBER_MAX_LENGTH
    ) {
      continue;
    }

    const accountHolder = findAccountHolder({
      accountMatchIndex: accountMatch.index ?? 0,
      accountMatchLength: rawAccountNumber.length,
      value: normalizedValue,
    });

    if (!bankName && !accountHolder) {
      continue;
    }

    return {
      accountHolder,
      accountNumber,
      bankName,
    };
  }

  return null;
};

export const canShowTaxiSettlementPrompt = ({
  hasSettlementTarget,
  isLeader,
  partyStatus,
}: TaxiSettlementPromptEligibility) =>
  isLeader &&
  hasSettlementTarget &&
  (partyStatus === 'open' || partyStatus === 'closed');

const toRadians = (value: number) => (value * Math.PI) / 180;

export const calculateTaxiDistanceMeters = (
  from: Pick<TaxiSettlementPromptLocation, 'latitude' | 'longitude'>,
  to: Pick<PartyLocation, 'lat' | 'lng'>,
) => {
  const earthRadiusMeters = 6_371_000;
  const latitudeDifference = toRadians(to.lat - from.latitude);
  const longitudeDifference = toRadians(to.lng - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

export const isWithinTaxiSettlementLocationWindow = ({
  departureTimeISO,
  nowMs,
}: {
  departureTimeISO?: string;
  nowMs: number;
}) => {
  if (!departureTimeISO) {
    return false;
  }

  const departureTimeMs = Date.parse(departureTimeISO);

  if (!Number.isFinite(departureTimeMs)) {
    return false;
  }

  return (
    nowMs >= departureTimeMs - SETTLEMENT_PROMPT_LOCATION_EARLY_WINDOW_MS &&
    nowMs <= departureTimeMs + SETTLEMENT_PROMPT_LOCATION_LATE_WINDOW_MS
  );
};

export const isNearTaxiSettlementDestination = ({
  destination,
  location,
  nowMs,
}: {
  destination?: PartyLocation;
  location?: TaxiSettlementPromptLocation | null;
  nowMs: number;
}) => {
  if (!destination || !location) {
    return false;
  }

  if (
    !Number.isFinite(location.accuracyMeters) ||
    location.accuracyMeters <= 0 ||
    location.accuracyMeters > SETTLEMENT_PROMPT_MAX_LOCATION_ACCURACY_METERS ||
    nowMs - location.timestampMs > SETTLEMENT_PROMPT_MAX_LOCATION_AGE_MS ||
    location.timestampMs > nowMs + SETTLEMENT_PROMPT_MAX_LOCATION_AGE_MS
  ) {
    return false;
  }

  return (
    calculateTaxiDistanceMeters(location, destination) <=
    SETTLEMENT_PROMPT_DISTANCE_METERS
  );
};

export const isTaxiSettlementTimeFallbackDue = ({
  departureTimeISO,
  nowMs,
}: {
  departureTimeISO?: string;
  nowMs: number;
}) => {
  if (!departureTimeISO) {
    return false;
  }

  const departureTimeMs = Date.parse(departureTimeISO);

  return (
    Number.isFinite(departureTimeMs) &&
    nowMs >= departureTimeMs + SETTLEMENT_PROMPT_TIME_FALLBACK_DELAY_MS
  );
};
