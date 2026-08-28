import Clipboard from '@react-native-clipboard/clipboard';

export const buildCafeteriaShareUrl = (): string =>
  'https://link.skuri.kr/cafeteria';

export const SHARE_URL_COPY_MESSAGE = 'URL이 클립보드에 복사되었어요!';

export const copyShareUrlToClipboard = (
  shareUrl: string,
  showToast: (message: string) => void,
): void => {
  const normalizedShareUrl = shareUrl.trim();

  if (!normalizedShareUrl) {
    throw new Error('복사할 공유 URL이 없습니다.');
  }

  Clipboard.setString(normalizedShareUrl);
  showToast(SHARE_URL_COPY_MESSAGE);
};
