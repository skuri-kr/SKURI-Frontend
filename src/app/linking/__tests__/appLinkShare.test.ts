import Clipboard from '@react-native-clipboard/clipboard';

import {
  buildCafeteriaShareUrl,
  copyShareUrlToClipboard,
  SHARE_URL_COPY_MESSAGE,
} from '../appLinkShare';

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
  },
}));

const mockSetString = jest.mocked(Clipboard.setString);

describe('앱 링크 URL 복사', () => {
  beforeEach(() => {
    mockSetString.mockReset();
  });

  it('학식 URL에는 날짜를 넣지 않는다', () => {
    expect(buildCafeteriaShareUrl()).toBe('https://link.skuri.kr/cafeteria');
  });

  it('URL만 클립보드에 저장하고 성공 토스트를 요청한다', () => {
    const showToast = jest.fn();

    copyShareUrlToClipboard(
      '  https://link.skuri.kr/notice/7Kp3mQxA  ',
      showToast,
    );

    expect(mockSetString).toHaveBeenCalledWith(
      'https://link.skuri.kr/notice/7Kp3mQxA',
    );
    expect(showToast).toHaveBeenCalledWith(SHARE_URL_COPY_MESSAGE);
  });

  it('빈 URL은 복사하거나 성공 안내하지 않는다', () => {
    const showToast = jest.fn();

    expect(() => copyShareUrlToClipboard('  ', showToast)).toThrow(
      '복사할 공유 URL이 없습니다.',
    );
    expect(mockSetString).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });
});
