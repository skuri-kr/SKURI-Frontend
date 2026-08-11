import {Platform} from 'react-native';
import {
  check,
  PERMISSIONS,
  request,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';

type TrackingStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'not-determined'
  | 'unavailable';

const ATT_PERMISSION = PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY;

const mapPermissionStatus = (
  status: PermissionStatus,
  requested: boolean,
): TrackingStatus => {
  switch (status) {
    case RESULTS.GRANTED:
      return 'authorized';
    case RESULTS.DENIED:
      return requested ? 'denied' : 'not-determined';
    case RESULTS.BLOCKED:
      return 'denied';
    case RESULTS.UNAVAILABLE:
    case RESULTS.LIMITED:
    default:
      return 'unavailable';
  }
};

/**
 * ATT(App Tracking Transparency) 권한 요청
 * @returns 'authorized' | 'denied' | 'restricted' | 'not-determined' | 'unavailable'
 */
export async function requestATTPermission(): Promise<TrackingStatus> {
  if (Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    const currentStatus = await check(ATT_PERMISSION);

    if (currentStatus !== RESULTS.DENIED) {
      return mapPermissionStatus(currentStatus, false);
    }

    const requestedStatus = await request(ATT_PERMISSION);
    return mapPermissionStatus(requestedStatus, true);
  } catch (error) {
    console.warn('ATT 권한 요청 실패:', error);
    return 'unavailable';
  }
}

/**
 * 현재 ATT 권한 상태 확인
 */
export async function getATTPermissionStatus(): Promise<TrackingStatus> {
  if (Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    const status = await check(ATT_PERMISSION);
    return mapPermissionStatus(status, false);
  } catch (error) {
    console.warn('ATT 권한 상태 확인 실패:', error);
    return 'unavailable';
  }
}
