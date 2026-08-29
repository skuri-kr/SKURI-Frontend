import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useAppNoticeRepository} from '@/di/useRepository';

import {useAppNoticeFeedData} from '../useAppNoticeFeedData';

jest.mock('@/di/useRepository', () => ({
  useAppNoticeRepository: jest.fn(),
}));

const mockedUseAppNoticeRepository = jest.mocked(useAppNoticeRepository);

const notice = {
  category: 'service' as const,
  commentCount: 0,
  content: '점검 안내 본문',
  id: 'app-notice-1',
  isLiked: false,
  likeCount: 0,
  priority: 'normal' as const,
  publishedAt: new Date('2026-08-29T00:00:00Z'),
  title: '점검 안내',
  viewCount: 1,
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, reject, resolve};
};

describe('useAppNoticeFeedData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('늦게 끝난 이전 조회 실패가 최신 목록과 오류 상태를 덮어쓰지 않는다', async () => {
    const firstLoad = createDeferred<typeof notice[]>();
    const repository = {
      getAppNotices: jest.fn()
        .mockReturnValueOnce(firstLoad.promise)
        .mockResolvedValueOnce([{...notice, title: '최신 점검 안내'}]),
    };
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeFeedData());
    await waitFor(() => expect(repository.getAppNotices).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.reload();
    });
    await act(async () => {
      firstLoad.reject(new Error('이전 조회 실패'));
      await firstLoad.promise.catch(() => undefined);
    });

    expect(result.current.data?.items[0]?.title).toBe('최신 점검 안내');
    expect(result.current.error).toBeNull();
  });
});
