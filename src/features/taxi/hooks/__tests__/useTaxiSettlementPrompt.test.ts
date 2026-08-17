import {act, renderHook, waitFor} from '@testing-library/react-native';
import {AppState, type AppStateStatus} from 'react-native';

import {getCurrentLocationSnapshotIfAuthorized} from '@/shared/lib/location/currentLocationSnapshot';

import {useTaxiSettlementPrompt} from '../useTaxiSettlementPrompt';
import {
  getTaxiSettlementPromptStorageState,
  updateTaxiSettlementPromptStorageState,
} from '../../services/taxiSettlementPromptStorage';

jest.mock('@/shared/lib/location/currentLocationSnapshot', () => ({
  getCurrentLocationSnapshotIfAuthorized: jest.fn(),
}));

jest.mock('../../services/taxiSettlementPromptStorage', () => ({
  getTaxiSettlementPromptStorageState: jest.fn(),
  updateTaxiSettlementPromptStorageState: jest.fn(),
}));

const mockedGetCurrentLocationSnapshotIfAuthorized = jest.mocked(
  getCurrentLocationSnapshotIfAuthorized,
);
const mockedGetTaxiSettlementPromptStorageState = jest.mocked(
  getTaxiSettlementPromptStorageState,
);
const mockedUpdateTaxiSettlementPromptStorageState = jest.mocked(
  updateTaxiSettlementPromptStorageState,
);

const destinationLocation = {
  lat: 37.3805,
  lng: 126.9286,
  name: '성결대학교',
};

const createParams = (overrides = {}) => ({
  actionInFlight: false,
  composerValue: '',
  departureTimeISO: new Date(Date.now()).toISOString(),
  destinationLocation,
  hasSettlementTarget: true,
  isLeader: true,
  isScreenFocused: true,
  partyId: 'party-1',
  partyStatus: 'open' as const,
  ...overrides,
});

describe('useTaxiSettlementPrompt location refresh', () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  let removeAppStateListener: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-17T12:00:00.000Z'));
    jest.resetAllMocks();

    removeAppStateListener = jest.fn();
    appStateListener = undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: AppStateStatus) => void;
        return {remove: removeAppStateListener};
      });
    mockedGetTaxiSettlementPromptStorageState.mockResolvedValue({});
    mockedUpdateTaxiSettlementPromptStorageState.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('5초 뒤 새 위치를 조회해 목적지 도착 안내를 표시한다', async () => {
    mockedGetCurrentLocationSnapshotIfAuthorized
      .mockResolvedValueOnce({
        accuracyMeters: 20,
        latitude: 37.39,
        longitude: 126.9286,
        timestampMs: Date.now(),
      })
      .mockResolvedValueOnce({
        accuracyMeters: 20,
        latitude: 37.3805,
        longitude: 126.9286,
        timestampMs: Date.now() + 5_000,
      });

    const {result} = renderHook(() => useTaxiSettlementPrompt(createParams()));

    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);
    });
    expect(result.current.prompt).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(2);
      expect(result.current.prompt?.reason).toBe('near-destination');
    });
  });

  it('위치 조회가 끝날 때까지 다음 5초 조회를 예약하지 않는다', async () => {
    let resolveFirstLocation: ((value: null) => void) | undefined;
    const firstLocation = new Promise<null>(resolve => {
      resolveFirstLocation = resolve;
    });
    mockedGetCurrentLocationSnapshotIfAuthorized.mockReturnValue(firstLocation);

    renderHook(() => useTaxiSettlementPrompt(createParams()));

    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstLocation?.(null);
    });
    await act(async () => {
      jest.advanceTimersByTime(4_999);
    });
    expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(2);
    });
  });

  it('화면 이탈과 앱 백그라운드에서 위치 갱신을 중단하고 복귀하면 즉시 재개한다', async () => {
    mockedGetCurrentLocationSnapshotIfAuthorized.mockResolvedValue(null);
    const {rerender} = renderHook(
      params => useTaxiSettlementPrompt(params),
      {initialProps: createParams()},
    );

    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);
    });

    rerender(createParams({isScreenFocused: false}));
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(1);

    rerender(createParams());
    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      appStateListener?.('background');
    });
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(2);

    await act(async () => {
      appStateListener?.('active');
    });
    await waitFor(() => {
      expect(mockedGetCurrentLocationSnapshotIfAuthorized).toHaveBeenCalledTimes(3);
    });
  });
});
