import {Linking} from 'react-native';

import {normalizeExternalWebUrl} from '@/shared/lib/url/contentLinks';

export const openExternalWebUrl = async (rawUrl: string): Promise<void> => {
  const targetUrl = normalizeExternalWebUrl(rawUrl);

  if (!targetUrl) {
    throw new Error('지원하지 않는 URL입니다.');
  }

  await Linking.openURL(targetUrl);
};
