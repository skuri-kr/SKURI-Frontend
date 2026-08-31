import {httpClient} from '@/shared/api';

import {ContentBlockApiClient} from '../contentBlockApiClient';

jest.mock('@/shared/api', () => ({
  httpClient: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedDelete = jest.mocked(httpClient.delete);
const mockedGet = jest.mocked(httpClient.get);
const mockedPost = jest.mocked(httpClient.post);

describe('ContentBlockApiClient', () => {
  const apiClient = new ContentBlockApiClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('네 가지 UGC 대상 중 선택한 콘텐츠 식별자로 차단한다', async () => {
    const response = {
      data: {
        blockId: 'opaque-block-1',
        blockedAt: '2026-08-31T12:00:00',
        label: '차단한 사용자',
      },
      success: true,
    };
    mockedPost.mockResolvedValue(response);

    await expect(
      apiClient.createContentBlock({
        targetId: 'notice-comment-1',
        targetType: 'NOTICE_COMMENT',
      }),
    ).resolves.toBe(response);
    expect(mockedPost).toHaveBeenCalledWith('/v1/content-blocks', {
      targetId: 'notice-comment-1',
      targetType: 'NOTICE_COMMENT',
    });
  });

  it('비페이지 콘텐츠 차단 목록을 조회한다', async () => {
    const response = {data: [], success: true};
    mockedGet.mockResolvedValue(response);

    await expect(apiClient.getContentBlocks()).resolves.toBe(response);
    expect(mockedGet).toHaveBeenCalledWith('/v1/content-blocks');
  });

  it('불투명한 차단 ID를 URL 인코딩해 해제한다', async () => {
    mockedDelete.mockResolvedValue(undefined);

    await apiClient.deleteContentBlock('opaque/block id');

    expect(mockedDelete).toHaveBeenCalledWith(
      '/v1/content-blocks/opaque%2Fblock%20id',
    );
  });
});
