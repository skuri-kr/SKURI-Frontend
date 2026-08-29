import {Platform} from 'react-native';
import {TestIds} from 'react-native-google-mobile-ads';

export type AdPlacement =
  | 'campusHome'
  | 'noticeList'
  | 'noticeDetail'
  | 'communityBoardList'
  | 'communityBoardDetail'
  | 'communityChatList';

const ANDROID_AD_UNITS: Record<AdPlacement, string> = {
  campusHome: 'ca-app-pub-3334683616454635/2411234394',
  noticeList: 'ca-app-pub-3334683616454635/2215793277',
  noticeDetail: 'ca-app-pub-3334683616454635/3501332081',
  communityBoardList: 'ca-app-pub-3334683616454635/5580323212',
  communityBoardDetail: 'ca-app-pub-3334683616454635/9875168746',
  communityChatList: 'ca-app-pub-3334683616454635/5089745923',
};

const IOS_AD_UNITS: Record<AdPlacement, string> = {
  campusHome: 'ca-app-pub-3334683616454635/9715009344',
  noticeList: 'ca-app-pub-3334683616454635/8645470258',
  noticeDetail: 'ca-app-pub-3334683616454635/9175953291',
  communityBoardList: 'ca-app-pub-3334683616454635/3235512273',
  communityBoardDetail: 'ca-app-pub-3334683616454635/7332388582',
  communityChatList: 'ca-app-pub-3334683616454635/4271110970',
};

export const getAdUnitId = (placement: AdPlacement) => {
  if (__DEV__) {
    return TestIds.BANNER;
  }

  return Platform.select({
    android: ANDROID_AD_UNITS[placement],
    ios: IOS_AD_UNITS[placement],
    default: TestIds.BANNER,
  });
};
