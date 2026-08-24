import {act, renderHook, waitFor} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {useFriendInvitationRepository} from '@/di';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';

import {useFriendInvitationsData} from '../useFriendInvitationsData';

jest.mock('@/di', () => ({
  useFriendInvitationRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

const mockedUseRepository = jest.mocked(useFriendInvitationRepository);
const mockedInvalidateData = jest.mocked(invalidateData);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

const partyInvitation = {
  createdAt: '2026-08-23T12:00:00',
  expiresAt: null,
  expiryReason: null,
  id: 'party-invitation-1',
  inviter: null,
  respondedAt: null,
  status: 'PENDING' as const,
  target: null,
  type: 'PARTY' as const,
};

const chatInvitation = {
  createdAt: '2026-08-23T13:00:00',
  expiresAt: '2026-08-30T13:00:00',
  expiryReason: 'INVITATION_TIMEOUT' as const,
  id: 'chat-invitation-1',
  inviter: null,
  respondedAt: '2026-08-30T13:00:00',
  status: 'EXPIRED' as const,
  target: null,
  type: 'CHAT_ROOM' as const,
};

const secondPartyInvitation = {
  ...partyInvitation,
  createdAt: '2026-08-23T12:30:00',
  id: 'party-invitation-2',
};

const createRepository = () => ({
  acceptChatRoomInvitation: jest.fn(),
  acceptFriendRequest: jest.fn(),
  acceptPartyInvitation: jest.fn().mockResolvedValue({
    invitationId: partyInvitation.id,
    status: 'ACCEPTED',
    targetId: 'party-1',
    type: 'PARTY',
  }),
  blockMember: jest.fn(),
  cancelFriendRequest: jest.fn(),
  createChatRoomInvitations: jest.fn(),
  createFriendRequest: jest.fn(),
  createPartyInvitations: jest.fn(),
  declineChatRoomInvitation: jest.fn(),
  declineFriendRequest: jest.fn(),
  declinePartyInvitation: jest.fn(),
  deleteChatRoomInvitation: jest.fn(),
  deletePartyInvitation: jest.fn(),
  getBlocks: jest.fn(),
  getChatRoomInvitationEligibleFriends: jest.fn(),
  getFriend: jest.fn(),
  getFriendMinecraftAccounts: jest.fn(),
  getFriendRequests: jest.fn(),
  getFriends: jest.fn(),
  getInboxCounts: jest.fn().mockResolvedValue({
    chatRoomInvitationCount: 0,
    incomingRequestCount: 0,
    partyInvitationCount: 1,
    totalActionCount: 1,
  }),
  getMyCode: jest.fn(),
  getMyPrivacy: jest.fn(),
  getPartyInvitationEligibleFriends: jest.fn(),
  getReceivedChatRoomInvitations: jest.fn().mockResolvedValue([chatInvitation]),
  getReceivedPartyInvitations: jest.fn().mockResolvedValue([partyInvitation]),
  previewFriendCode: jest.fn(),
  regenerateMyCode: jest.fn(),
  removeFriend: jest.fn(),
  searchFriends: jest.fn(),
  unblockMember: jest.fn(),
  updateFavorite: jest.fn(),
  updateMyPrivacy: jest.fn(),
});

describe('useFriendInvitationsData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('택시와 공개방 초대를 최신순으로 합치고 PENDING만 badge에 센다', async () => {
    const repository = createRepository();
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );

    const {result} = renderHook(() => useFriendInvitationsData());

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.invitations.map(invitation => invitation.id)).toEqual([
      chatInvitation.id,
      partyInvitation.id,
    ]);
    expect(result.current.pendingCount).toBe(1);
  });

  it('수락 성공 후 목록과 badge를 즉시 갱신하고 이동용 targetId를 반환한다', async () => {
    const repository = createRepository();
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    let mutation;
    await act(async () => {
      mutation = await result.current.acceptInvitation(partyInvitation);
    });

    expect(mutation).toEqual({
      invitationId: partyInvitation.id,
      status: 'ACCEPTED',
      targetId: 'party-1',
      type: 'PARTY',
    });
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.invitations).toEqual([chatInvitation]);
    expect(mockedInvalidateData).toHaveBeenCalled();
  });

  it('수락 응답이 불확실하면 멱등 수락을 한 번 재확인해 이동 정보를 복구한다', async () => {
    const repository = createRepository();
    repository.acceptPartyInvitation
      .mockRejectedValueOnce(
        new RepositoryError(
          RepositoryErrorCode.NETWORK_ERROR,
          'accept response unavailable',
        ),
      )
      .mockResolvedValueOnce({
        invitationId: partyInvitation.id,
        status: 'ACCEPTED',
        targetId: 'party-1',
        type: 'PARTY',
      });
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    let mutation;
    await act(async () => {
      mutation = await result.current.acceptInvitation(partyInvitation);
    });

    expect(repository.acceptPartyInvitation).toHaveBeenCalledTimes(2);
    expect(mutation).toMatchObject({status: 'ACCEPTED', targetId: 'party-1'});
    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
    expect(result.current.invitations).toEqual([chatInvitation]);
  });

  it('수락 재확인과 목록 보정이 모두 실패하면 성공적인 재조회까지 카드를 잠근다', async () => {
    const repository = createRepository();
    const firstError = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'accept response unavailable',
    );
    const secondError = new RepositoryError(
      RepositoryErrorCode.TIMEOUT,
      'accept reconciliation unavailable',
    );
    repository.acceptPartyInvitation
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError);
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    repository.getReceivedPartyInvitations.mockRejectedValueOnce(
      new Error('party reload unavailable'),
    );

    await act(async () => {
      await expect(
        result.current.acceptInvitation(partyInvitation),
      ).rejects.toBe(secondError);
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(true);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
    expect(result.current.invitations).toContainEqual(partyInvitation);
  });

  it('삭제 응답이 불확실하면 목록을 재조회해 서버에서 제거된 카드를 반영한다', async () => {
    const repository = createRepository();
    const responseUnavailable = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'delete response unavailable',
    );
    repository.deletePartyInvitation.mockRejectedValueOnce(responseUnavailable);
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    repository.getReceivedPartyInvitations.mockResolvedValueOnce([]);

    await act(async () => {
      await expect(
        result.current.deleteInvitation(partyInvitation),
      ).rejects.toBe(responseUnavailable);
    });

    expect(result.current.invitations).toEqual([chatInvitation]);
    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
  });

  it('삭제 응답과 목록 보정이 모두 불확실하면 재조회 전까지 카드를 잠근다', async () => {
    const repository = createRepository();
    const responseUnavailable = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'delete response unavailable',
    );
    repository.deletePartyInvitation.mockRejectedValueOnce(responseUnavailable);
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    repository.getReceivedPartyInvitations.mockRejectedValueOnce(
      new Error('party reload unavailable'),
    );

    await act(async () => {
      await expect(
        result.current.deleteInvitation(partyInvitation),
      ).rejects.toBe(responseUnavailable);
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(true);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
  });

  it('거절 응답이 불확실하면 목록을 재조회해 서버에서 제거된 카드를 반영한다', async () => {
    const repository = createRepository();
    const responseUnavailable = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'decline response unavailable',
    );
    repository.declinePartyInvitation.mockRejectedValueOnce(responseUnavailable);
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    repository.getReceivedPartyInvitations.mockResolvedValueOnce([]);

    await act(async () => {
      await expect(
        result.current.declineInvitation(partyInvitation),
      ).rejects.toBe(responseUnavailable);
    });

    expect(result.current.invitations).toEqual([chatInvitation]);
    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
  });

  it('거절 응답과 목록 보정이 모두 불확실하면 재조회 전까지 카드를 잠근다', async () => {
    const repository = createRepository();
    const responseUnavailable = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'decline response unavailable',
    );
    repository.declinePartyInvitation.mockRejectedValueOnce(responseUnavailable);
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    repository.getReceivedPartyInvitations.mockRejectedValueOnce(
      new Error('party reload unavailable'),
    );

    await act(async () => {
      await expect(
        result.current.declineInvitation(partyInvitation),
      ).rejects.toBe(responseUnavailable);
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(true);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
  });

  it('다른 초대 성공이 진행 중인 목록 보정을 무효화하면 새 보정을 시작한다', async () => {
    const repository = createRepository();
    const firstError = new RepositoryError(
      RepositoryErrorCode.NETWORK_ERROR,
      'accept response unavailable',
    );
    const secondError = new RepositoryError(
      RepositoryErrorCode.TIMEOUT,
      'accept reconciliation unavailable',
    );
    repository.getReceivedPartyInvitations.mockResolvedValue([
      secondPartyInvitation,
      partyInvitation,
    ]);
    repository.acceptPartyInvitation
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockResolvedValueOnce({
        invitationId: secondPartyInvitation.id,
        status: 'ACCEPTED',
        targetId: 'party-2',
        type: 'PARTY',
      });
    repository.getInboxCounts.mockResolvedValue({
      chatRoomInvitationCount: 0,
      incomingRequestCount: 0,
      partyInvitationCount: 2,
      totalActionCount: 2,
    });
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    const stalePartyReload = deferred<typeof partyInvitation[]>();
    repository.getReceivedPartyInvitations
      .mockReturnValueOnce(stalePartyReload.promise)
      .mockResolvedValueOnce([]);

    let firstAcceptance!: Promise<unknown>;
    act(() => {
      firstAcceptance = result.current
        .acceptInvitation(partyInvitation)
        .catch(error => error);
    });
    await waitFor(() =>
      expect(repository.getReceivedPartyInvitations).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      await result.current.acceptInvitation(secondPartyInvitation);
    });

    await waitFor(() =>
      expect(repository.getReceivedPartyInvitations).toHaveBeenCalledTimes(3),
    );
    await waitFor(() =>
      expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false),
    );

    await act(async () => {
      stalePartyReload.resolve([partyInvitation]);
      expect(await firstAcceptance).toBe(secondError);
    });
    expect(result.current.mutatingIds.has(partyInvitation.id)).toBe(false);
  });

  it('일부 목록 조회가 실패해도 서버 inbox count를 badge에 사용한다', async () => {
    const repository = createRepository();
    repository.getReceivedPartyInvitations.mockRejectedValue(
      new Error('party unavailable'),
    );
    repository.getInboxCounts.mockResolvedValue({
      chatRoomInvitationCount: 2,
      incomingRequestCount: 0,
      partyInvitationCount: 3,
      totalActionCount: 5,
    });
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );

    const {result} = renderHook(() => useFriendInvitationsData());

    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.partyError).toBe('party unavailable');
    expect(result.current.pendingCount).toBe(5);
  });

  it('처리 성공 전에 시작한 새로고침 응답은 카드를 복원하지 않는다', async () => {
    const repository = createRepository();
    mockedUseRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendInvitationRepository>,
    );
    const {result} = renderHook(() => useFriendInvitationsData());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    const stalePartyResult = deferred<typeof partyInvitation[]>();
    repository.getReceivedPartyInvitations.mockReturnValueOnce(
      stalePartyResult.promise,
    );

    let reloadPromise!: Promise<void>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      await result.current.acceptInvitation(partyInvitation);
    });
    await act(async () => {
      stalePartyResult.resolve([partyInvitation]);
      await reloadPromise;
    });

    expect(result.current.invitations).toEqual([chatInvitation]);
    expect(result.current.pendingCount).toBe(0);
  });
});
