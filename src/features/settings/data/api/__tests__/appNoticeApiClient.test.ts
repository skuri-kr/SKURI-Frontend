import {httpClient} from '@/shared/api';

import {appNoticeApiClient} from '../appNoticeApiClient';

jest.mock('@/shared/api', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

const mockedHttpClient = jest.mocked(httpClient);

describe('AppNoticeApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('앱 공지 상세 조회에는 선택 인증을 사용한다', () => {
    appNoticeApiClient.getAppNotice('app-notice-1');

    expect(mockedHttpClient.get).toHaveBeenCalledWith(
      '/v1/app-notices/app-notice-1',
      {optionalAuth: true},
    );
  });
});
