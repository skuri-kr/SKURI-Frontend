import Geolocation from '@react-native-community/geolocation';
import {check, RESULTS} from 'react-native-permissions';

import {
  CURRENT_LOCATION_SNAPSHOT_MAXIMUM_AGE_MS,
  getCurrentLocationSnapshotIfAuthorized,
} from '../currentLocationSnapshot';

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_COARSE_LOCATION: 'android.coarse-location',
      ACCESS_FINE_LOCATION: 'android.fine-location',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.location-when-in-use',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
  },
}));

const mockedCheck = jest.mocked(check);
const mockedGetCurrentPosition = jest.mocked(Geolocation.getCurrentPosition);

describe('getCurrentLocationSnapshotIfAuthorized', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedCheck.mockResolvedValue(RESULTS.GRANTED);
  });

  it('5초 이하 캐시만 허용한 고정밀 위치를 조회한다', async () => {
    mockedGetCurrentPosition.mockImplementation(success => {
      success({
        coords: {
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.3805,
          longitude: 126.9286,
          speed: null,
        },
        timestamp: 1_755_430_400_000,
      });
    });

    await expect(getCurrentLocationSnapshotIfAuthorized()).resolves.toEqual({
      accuracyMeters: 12,
      latitude: 37.3805,
      longitude: 126.9286,
      timestampMs: 1_755_430_400_000,
    });
    expect(CURRENT_LOCATION_SNAPSHOT_MAXIMUM_AGE_MS).toBe(5_000);
    expect(mockedGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
  });
});
