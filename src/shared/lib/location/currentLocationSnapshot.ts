import Geolocation from '@react-native-community/geolocation';
import {Platform} from 'react-native';
import {check, PERMISSIONS, RESULTS} from 'react-native-permissions';

export interface CurrentLocationSnapshot {
  accuracyMeters: number;
  latitude: number;
  longitude: number;
  timestampMs: number;
}

const hasLocationPermissionWithoutRequest = async () => {
  if (Platform.OS === 'ios') {
    const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  }

  if (Platform.OS === 'android') {
    const [fineLocationStatus, coarseLocationStatus] = await Promise.all([
      check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION),
      check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION),
    ]);

    return (
      fineLocationStatus === RESULTS.GRANTED ||
      coarseLocationStatus === RESULTS.GRANTED
    );
  }

  return false;
};

export const getCurrentLocationSnapshotIfAuthorized = async (): Promise<CurrentLocationSnapshot | null> => {
  try {
    if (!(await hasLocationPermissionWithoutRequest())) {
      return null;
    }

    return await new Promise<CurrentLocationSnapshot | null>(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          const accuracyMeters = position.coords.accuracy;

          if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
            resolve(null);
            return;
          }

          resolve({
            accuracyMeters,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestampMs: position.timestamp,
          });
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 15_000,
        },
      );
    });
  } catch {
    return null;
  }
};
