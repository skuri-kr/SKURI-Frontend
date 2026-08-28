jest.mock('@/shared/api', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import {httpClient} from '@/shared/api';

import {
  createContentShareUrl,
  resolveAppLinkIntent,
} from '../shareLinkClient';

const mockGet = httpClient.get as jest.Mock;
const mockPost = httpClient.post as jest.Mock;

describe('createContentShareUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('공지 원본 ID로 짧은 공유 링크를 발급한다', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        resourceType: 'NOTICE',
        code: '7Kp3mQxA',
        url: 'https://link.skuri.kr/notice/7Kp3mQxA',
      },
    });

    await expect(
      createContentShareUrl('NOTICE', 'aHR0cHM6Ly93d3cuc3VuZ2t5dWw'),
    ).resolves.toBe('https://link.skuri.kr/notice/7Kp3mQxA');
    expect(mockPost).toHaveBeenCalledWith('/v1/share-links', {
      resourceType: 'NOTICE',
      resourceId: 'aHR0cHM6Ly93d3cuc3VuZ2t5dWw',
    });
  });

  it('요청과 다른 URL을 반환하면 공유하지 않는다', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        resourceType: 'NOTICE',
        code: '7Kp3mQxA',
        url: 'https://evil.example/notice/7Kp3mQxA',
      },
    });

    await expect(createContentShareUrl('NOTICE', 'notice-1')).rejects.toThrow(
      '공유 링크 응답이 요청과 일치하지 않습니다.',
    );
  });
});

describe('resolveAppLinkIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('공지 코드를 원래 내부 ID로 해석한다', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        resourceType: 'NOTICE',
        code: '7Kp3mQxA',
        resourceId: 'aHR0cHM6Ly93d3cuc3VuZ2t5dWw',
      },
    });

    await expect(
      resolveAppLinkIntent({kind: 'notice', code: '7Kp3mQxA'}),
    ).resolves.toEqual({
      kind: 'notice',
      noticeId: 'aHR0cHM6Ly93d3cuc3VuZ2t5dWw',
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/share-links/notice/7Kp3mQxA/resolve',
    );
  });

  it('학식은 서버 해석 없이 이번 주 화면으로 전달한다', async () => {
    await expect(resolveAppLinkIntent({kind: 'cafeteria'})).resolves.toEqual({
      kind: 'cafeteria',
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('기존 긴 코드와 형식이 다른 코드는 API 호출 전에 거부한다', async () => {
    await expect(
      resolveAppLinkIntent({
        kind: 'notice',
        code: 'aHR0cHM6Ly93d3cuc3VuZ2t5dWw',
      }),
    ).rejects.toThrow('공유 링크 코드 형식이 올바르지 않습니다.');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
