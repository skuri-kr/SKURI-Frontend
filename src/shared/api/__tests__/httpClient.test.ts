import axios from 'axios';

import {
  clearAuthTokenResolver,
  registerAuthTokenResolver,
} from '../authTokenProvider';
import {HttpClient} from '../httpClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    isAxiosError: jest.fn(() => false),
    request: jest.fn(),
  },
}));

jest.mock('../apiConfig', () => ({
  buildApiUrl: (path: string) => `https://api.example.com${path}`,
  getApiRuntimeConfig: () => ({
    httpTimeoutMs: 1000,
    restBaseUrl: 'https://api.example.com',
  }),
}));

jest.mock('../apiLogger', () => ({
  createHttpRequestLogContext: () => ({requestId: 'test-request'}),
  logHttpError: jest.fn(),
  logHttpResponse: jest.fn(),
}));

const mockedAxiosRequest = jest.mocked(axios.request);

describe('HttpClient', () => {
  beforeEach(() => {
    clearAuthTokenResolver();
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearAuthTokenResolver();
  });

  it('선택 인증 요청은 토큰 조회에 실패해도 Authorization 없이 전송한다', async () => {
    registerAuthTokenResolver(async () => {
      throw new Error('토큰 조회 실패');
    });
    mockedAxiosRequest.mockResolvedValue({
      data: {success: true},
      status: 200,
    });
    const client = new HttpClient();

    await expect(
      client.get('/v1/app-notices/app-notice-1', {optionalAuth: true}),
    ).resolves.toEqual({success: true});

    expect(mockedAxiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: {Accept: 'application/json'},
      url: '/v1/app-notices/app-notice-1',
    }));
  });

  it('선택 인증 요청은 토큰을 얻으면 Authorization을 전송한다', async () => {
    registerAuthTokenResolver(async () => 'firebase-token');
    mockedAxiosRequest.mockResolvedValue({
      data: {success: true},
      status: 200,
    });
    const client = new HttpClient();

    await client.get('/v1/app-notices/app-notice-1', {optionalAuth: true});

    expect(mockedAxiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer firebase-token',
      },
    }));
  });

  it('기본 인증 요청은 토큰 조회 오류를 그대로 반환한다', async () => {
    registerAuthTokenResolver(async () => {
      throw new Error('토큰 조회 실패');
    });
    const client = new HttpClient();

    await expect(client.get('/v1/members/me')).rejects.toThrow('토큰 조회 실패');
    expect(mockedAxiosRequest).not.toHaveBeenCalled();
  });
});
