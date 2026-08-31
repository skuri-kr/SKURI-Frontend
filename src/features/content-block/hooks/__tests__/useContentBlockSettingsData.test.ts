import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useContentBlockRepository} from '@/di';

import {useContentBlockSettingsData} from '../useContentBlockSettingsData';

jest.mock('@/di', () => ({
  useContentBlockRepository: jest.fn(),
}));

const mockedUseContentBlockRepository = jest.mocked(useContentBlockRepository);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return {promise, resolve};
};

describe('useContentBlockSettingsData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('콘텐츠 차단 목록을 별도로 조회한다', async () => {
    const blocks = [
      {
        blockedAt: new Date('2026-08-31T00:00:00Z'),
        id: 'opaque-block-1',
        label: '차단한 사용자' as const,
      },
    ];
    mockedUseContentBlockRepository.mockReturnValue({
      blockContent: jest.fn(),
      getContentBlocks: jest.fn().mockResolvedValue(blocks),
      unblockContent: jest.fn(),
    } as ReturnType<typeof useContentBlockRepository>);

    const {result} = renderHook(() => useContentBlockSettingsData());

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.blocks).toEqual(blocks);
  });

  it('해제보다 먼저 시작한 목록 재조회가 해제된 항목을 되돌리지 않는다', async () => {
    const block = {
      blockedAt: new Date('2026-08-31T00:00:00Z'),
      id: 'opaque-block-1',
      label: '차단한 사용자' as const,
    };
    const staleBlocks = createDeferred<typeof block[]>();
    const repository = {
      blockContent: jest.fn(),
      getContentBlocks: jest
        .fn()
        .mockResolvedValueOnce([block])
        .mockReturnValueOnce(staleBlocks.promise),
      unblockContent: jest.fn().mockResolvedValue(undefined),
    };
    mockedUseContentBlockRepository.mockReturnValue(
      repository as ReturnType<typeof useContentBlockRepository>,
    );
    const {result} = renderHook(() => useContentBlockSettingsData());
    await waitFor(() => expect(result.current.blocks).toEqual([block]));

    let reloadPromise!: Promise<void>;
    await act(async () => {
      reloadPromise = result.current.reload();
      await result.current.unblockContent(block.id);
      staleBlocks.resolve([block]);
      await reloadPromise;
    });

    expect(result.current.blocks).toEqual([]);
  });
});
