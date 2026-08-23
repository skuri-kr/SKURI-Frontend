import {act, renderHook, waitFor} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {useFriendInvitationRepository} from '@/di';

import {useFriendInvitationsData} from '../useFriendInvitationsData';

jest.mock('@/di', () => ({
  useFriendInvitationRepository: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

const mockedUseRepository = jest.mocked(useFriendInvitationRepository);
const mockedInvalidateData = jest.mocked(invalidateData);

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
  getInboxCounts: jest.fn(),
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
});
