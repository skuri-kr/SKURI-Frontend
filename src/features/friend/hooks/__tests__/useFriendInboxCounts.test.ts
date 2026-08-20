import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import {useFriendInboxCounts} from '../useFriendInboxCounts';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

const createRepository = () => ({
  getInboxCounts: jest.fn(),
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

describe('useFriendInboxCounts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('새로고침이 실패해도 마지막으로 성공한 받은 요청 수를 유지한다', async () => {
    const repository = createRepository();
    repository.getInboxCounts
      .mockResolvedValueOnce({
        chatRoomInvitationCount: 0,
        incomingRequestCount: 3,
        partyInvitationCount: 0,
        totalActionCount: 3,
      })
      .mockRejectedValueOnce(new Error('network unavailable'));
    mockedUseFriendRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendInboxCounts());

    await waitFor(() => {
      expect(result.current.counts?.incomingRequestCount).toBe(3);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.counts?.incomingRequestCount).toBe(3);
  });

  it('늦게 도착한 이전 조회 결과로 최신 요청 수를 덮어쓰지 않는다', async () => {
    const repository = createRepository();
    const initialLoad = createDeferred<{
      chatRoomInvitationCount: number;
      incomingRequestCount: number;
      partyInvitationCount: number;
      totalActionCount: number;
    }>();
    const refreshLoad = createDeferred<{
      chatRoomInvitationCount: number;
      incomingRequestCount: number;
      partyInvitationCount: number;
      totalActionCount: number;
    }>();
    repository.getInboxCounts
      .mockReturnValueOnce(initialLoad.promise)
      .mockReturnValueOnce(refreshLoad.promise);
    mockedUseFriendRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendInboxCounts());

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = result.current.reload();
    });

    await act(async () => {
      refreshLoad.resolve({
        chatRoomInvitationCount: 0,
        incomingRequestCount: 5,
        partyInvitationCount: 0,
        totalActionCount: 5,
      });
      await refreshPromise;
    });

    await act(async () => {
      initialLoad.resolve({
        chatRoomInvitationCount: 0,
        incomingRequestCount: 2,
        partyInvitationCount: 0,
        totalActionCount: 2,
      });
      await Promise.resolve();
    });

    expect(result.current.counts?.incomingRequestCount).toBe(5);
  });
});
