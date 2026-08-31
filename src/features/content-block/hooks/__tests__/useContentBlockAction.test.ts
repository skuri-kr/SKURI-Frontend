import {Alert} from 'react-native';
import {act, renderHook} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {useContentBlockRepository} from '@/di';

import {useContentBlockAction} from '../useContentBlockAction';

jest.mock('@/di', () => ({
  useContentBlockRepository: jest.fn(),
}));
jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

const mockedUseContentBlockRepository = jest.mocked(useContentBlockRepository);
const mockedInvalidateData = jest.mocked(invalidateData);

const createRepository = (blockContent: jest.Mock) => ({
  blockContent,
  getContentBlocks: jest.fn(),
  unblockContent: jest.fn(),
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
};

const confirmLatestAlert = (alertSpy: jest.SpyInstance) => {
  const buttons = alertSpy.mock.calls.at(-1)?.[2];
  const confirmButton = buttons?.find(
    (button: {text?: string}) => button.text === '차단',
  );
  confirmButton?.onPress?.();
};

describe('useContentBlockAction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('확인 후 콘텐츠 차단을 요청하고 현재 화면만 새로고침한다', async () => {
    const repository = createRepository(
      jest.fn().mockResolvedValue({
        blockedAt: new Date('2026-08-31T00:00:00Z'),
        id: 'block-1',
        label: '차단한 사용자',
      }),
    );
    mockedUseContentBlockRepository.mockReturnValue(
      repository as ReturnType<typeof useContentBlockRepository>,
    );
    const onBlocked = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const {result} = renderHook(() =>
      useContentBlockAction({onBlocked, scopeId: 'post-1'}),
    );

    act(() => {
      result.current.requestContentBlock({
        targetId: 'comment-1',
        targetType: 'COMMENT',
      });
      confirmLatestAlert(alertSpy);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(repository.blockContent).toHaveBeenCalledWith({
      targetId: 'comment-1',
      targetType: 'COMMENT',
    });
    expect(onBlocked).toHaveBeenCalledWith({
      targetId: 'comment-1',
      targetType: 'COMMENT',
    });
    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'content.blocks',
      'community.board.list',
      'profile.boardBookmarks',
    ]);
    alertSpy.mockRestore();
  });

  it('차단 성공 후 화면을 떠나도 작성자 목록을 무효화하고 화면 콜백은 건너뛴다', async () => {
    const deferred = createDeferred<{
      blockedAt: Date;
      id: string;
      label: '차단한 사용자';
    }>();
    const repository = createRepository(
      jest.fn().mockReturnValue(deferred.promise),
    );
    mockedUseContentBlockRepository.mockReturnValue(
      repository as ReturnType<typeof useContentBlockRepository>,
    );
    const onBlocked = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const {result, unmount} = renderHook(() =>
      useContentBlockAction({onBlocked, scopeId: 'post-1'}),
    );

    act(() => {
      result.current.requestContentBlock({
        targetId: 'comment-1',
        targetType: 'COMMENT',
      });
      confirmLatestAlert(alertSpy);
    });
    unmount();

    await act(async () => {
      deferred.resolve({
        blockedAt: new Date('2026-08-31T00:00:00Z'),
        id: 'block-1',
        label: '차단한 사용자',
      });
      await deferred.promise;
      await Promise.resolve();
    });

    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'content.blocks',
      'community.board.list',
      'profile.boardBookmarks',
    ]);
    expect(onBlocked).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('요청 중 화면 대상이 바뀌면 완료 콜백과 오류 알림을 적용하지 않는다', async () => {
    const deferred = createDeferred<{
      blockedAt: Date;
      id: string;
      label: '차단한 사용자';
    }>();
    const repository = createRepository(
      jest.fn().mockReturnValue(deferred.promise),
    );
    mockedUseContentBlockRepository.mockReturnValue(
      repository as ReturnType<typeof useContentBlockRepository>,
    );
    const onBlocked = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const {result, rerender} = renderHook(
      ({scopeId}: {scopeId: string}) =>
        useContentBlockAction({onBlocked, scopeId}),
      {initialProps: {scopeId: 'post-1'}},
    );

    act(() => {
      result.current.requestContentBlock({
        targetId: 'comment-1',
        targetType: 'COMMENT',
      });
      confirmLatestAlert(alertSpy);
    });
    rerender({scopeId: 'post-2'});
    await act(async () => {
      deferred.reject(new Error('late failure'));
      await expect(deferred.promise).rejects.toThrow('late failure');
    });

    expect(onBlocked).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('같은 콘텐츠의 중복 차단 요청을 한 번만 전송한다', async () => {
    const deferred = createDeferred<{
      blockedAt: Date;
      id: string;
      label: '차단한 사용자';
    }>();
    const repository = createRepository(
      jest.fn().mockReturnValue(deferred.promise),
    );
    mockedUseContentBlockRepository.mockReturnValue(
      repository as ReturnType<typeof useContentBlockRepository>,
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const {result} = renderHook(() =>
      useContentBlockAction({onBlocked: jest.fn(), scopeId: 'post-1'}),
    );
    const target = {targetId: 'comment-1', targetType: 'COMMENT' as const};

    act(() => {
      result.current.requestContentBlock(target);
      confirmLatestAlert(alertSpy);
      result.current.requestContentBlock(target);
      confirmLatestAlert(alertSpy);
    });

    expect(repository.blockContent).toHaveBeenCalledTimes(1);
    await act(async () => {
      deferred.resolve({
        blockedAt: new Date('2026-08-31T00:00:00Z'),
        id: 'block-1',
        label: '차단한 사용자',
      });
      await deferred.promise;
    });
    alertSpy.mockRestore();
  });
});
