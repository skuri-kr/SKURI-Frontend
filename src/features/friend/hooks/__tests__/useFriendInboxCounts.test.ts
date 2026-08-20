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
});
