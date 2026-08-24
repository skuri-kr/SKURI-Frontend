import type {FriendApiClient} from '../../api/friendApiClient';
import {SpringFriendRepository} from '../SpringFriendRepository';

describe('SpringFriendRepository', () => {
  const createApiClient = (): jest.Mocked<FriendApiClient> =>
    ({
      acceptChatRoomInvitation: jest.fn(),
      acceptFriendRequest: jest.fn(),
      acceptPartyInvitation: jest.fn(),
      blockMember: jest.fn(),
      cancelFriendRequest: jest.fn(),
      createFriendRequest: jest.fn(),
      createChatRoomInvitations: jest.fn(),
      createPartyInvitations: jest.fn(),
      declineChatRoomInvitation: jest.fn(),
      declineFriendRequest: jest.fn(),
      declinePartyInvitation: jest.fn(),
      deleteChatRoomInvitation: jest.fn(),
      deletePartyInvitation: jest.fn(),
      getBlocks: jest.fn(),
      getFriend: jest.fn(),
      getFriendMinecraftAccounts: jest.fn(),
      getChatRoomInvitationEligibleFriends: jest.fn(),
      getFriendRequests: jest.fn(),
      getFriends: jest.fn(),
      getInboxCounts: jest.fn(),
      getMyCode: jest.fn(),
      getMyPrivacy: jest.fn(),
      getPartyInvitationEligibleFriends: jest.fn(),
      getReceivedChatRoomInvitations: jest.fn(),
      getReceivedPartyInvitations: jest.fn(),
      previewFriendCode: jest.fn(),
      regenerateMyCode: jest.fn(),
      removeFriend: jest.fn(),
      searchFriends: jest.fn(),
      unblockMember: jest.fn(),
      updateFavorite: jest.fn(),
      updateMyPrivacy: jest.fn(),
    }) as jest.Mocked<FriendApiClient>;

  it('친구 목록을 즐겨찾기 우선, 가나다순으로 정렬한다', async () => {
    const apiClient = createApiClient();
    apiClient.getFriends.mockResolvedValue({
      data: [
        {
          department: null,
          favorite: false,
          friendPublicId: 'friend-3',
          nickname: '하늘',
          photoUrl: null,
        },
        {
          department: '컴퓨터공학과',
          favorite: true,
          friendPublicId: 'friend-1',
          nickname: '다은',
          photoUrl: 'https://example.com/da-eun.jpg',
        },
        {
          department: null,
          favorite: true,
          friendPublicId: 'friend-2',
          nickname: '가람',
          photoUrl: null,
        },
        {
          department: null,
          favorite: true,
          friendPublicId: 'friend-0',
          nickname: '가람',
          photoUrl: null,
        },
      ],
      success: true,
    });

    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.getFriends()).resolves.toEqual([
      {
        department: null,
        effectiveTimetableScope: 'PRIVATE',
        favorite: true,
        id: 'friend-0',
        minecraftAccountCount: 0,
        nickname: '가람',
        photoUrl: null,
        primaryMinecraftGameName: null,
      },
      {
        department: null,
        effectiveTimetableScope: 'PRIVATE',
        favorite: true,
        id: 'friend-2',
        minecraftAccountCount: 0,
        nickname: '가람',
        photoUrl: null,
        primaryMinecraftGameName: null,
      },
      {
        department: '컴퓨터공학과',
        effectiveTimetableScope: 'PRIVATE',
        favorite: true,
        id: 'friend-1',
        minecraftAccountCount: 0,
        nickname: '다은',
        photoUrl: 'https://example.com/da-eun.jpg',
        primaryMinecraftGameName: null,
      },
      {
        department: null,
        effectiveTimetableScope: 'PRIVATE',
        favorite: false,
        id: 'friend-3',
        minecraftAccountCount: 0,
        nickname: '하늘',
        photoUrl: null,
        primaryMinecraftGameName: null,
      },
    ]);
  });

  it('검색어와 친구 코드를 정리해 API에 전달한다', async () => {
    const apiClient = createApiClient();
    apiClient.searchFriends.mockResolvedValue({
      data: {hasNext: false, items: [], nextCursor: null},
      success: true,
    });
    apiClient.previewFriendCode.mockResolvedValue({
      data: {
        department: null,
        friendPublicId: 'friend-1',
        nickname: '스쿠리',
        photoUrl: null,
        relationshipState: 'REQUESTABLE',
      },
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await repository.searchFriends({query: '  스쿠리  '});
    await repository.previewFriendCode('  SKR-7K4M-9Q2D  ');

    expect(apiClient.searchFriends).toHaveBeenCalledWith({query: '스쿠리'});
    expect(apiClient.previewFriendCode).toHaveBeenCalledWith({
      friendCode: 'SKR-7K4M-9Q2D',
    });
  });

  it('친구 마인크래프트 계정은 SELF와 FRIEND 계층을 그대로 반환한다', async () => {
    const apiClient = createApiClient();
    apiClient.getFriendMinecraftAccounts.mockResolvedValue({
      data: {
        selfAccounts: [{
          avatarUuid: 'self-avatar',
          edition: 'JAVA',
          friendAccounts: [{
            avatarUuid: 'friend-avatar',
            edition: 'BEDROCK',
            gameName: 'skuriBedrock',
          }],
          gameName: 'skuriJava',
        }],
      },
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.getFriendMinecraftAccounts('friend-1')).resolves.toEqual({
      selfAccounts: [{
        avatarUuid: 'self-avatar',
        edition: 'JAVA',
        friendAccounts: [{
          avatarUuid: 'friend-avatar',
          edition: 'BEDROCK',
          gameName: 'skuriBedrock',
        }],
        gameName: 'skuriJava',
      }],
    });
    expect(apiClient.getFriendMinecraftAccounts).toHaveBeenCalledWith('friend-1');
  });

  it('수락 결과의 PENDING 응답에는 친구 값을 만들지 않는다', async () => {
    const apiClient = createApiClient();
    apiClient.createFriendRequest.mockResolvedValue({
      data: {requestId: 'request-1', status: 'PENDING'},
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.createFriendRequest('friend-1')).resolves.toEqual({
      friend: null,
      requestId: 'request-1',
      status: 'PENDING',
    });
  });

  it('택시파티 초대 후보와 좌석 정보를 앱 모델로 변환한다', async () => {
    const apiClient = createApiClient();
    apiClient.getPartyInvitationEligibleFriends.mockResolvedValue({
      data: {
        alreadyMemberCount: 1,
        alreadyPendingCount: 2,
        friends: [
          {
            department: '컴퓨터공학과',
            favorite: true,
            friendPublicId: 'friend-1',
            nickname: '가람',
            photoUrl: null,
          },
        ],
        notEligibleCount: 3,
        partyId: 'party-1',
        remainingCapacity: 1,
        targetName: '정문 → 서울역 파티',
      },
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(
      repository.getPartyInvitationEligibleFriends('party-1'),
    ).resolves.toEqual({
      alreadyMemberCount: 1,
      alreadyPendingCount: 2,
      expiresInDays: null,
      friends: [
        {
          department: '컴퓨터공학과',
          favorite: true,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
      ],
      notEligibleCount: 3,
      remainingCapacity: 1,
      targetId: 'party-1',
      targetName: '정문 → 서울역 파티',
    });
  });

  it('공개 채팅방 batch 결과의 nullable invitationId를 보존한다', async () => {
    const apiClient = createApiClient();
    apiClient.createChatRoomInvitations.mockResolvedValue({
      data: {
        results: [
          {
            friendPublicId: 'friend-1',
            invitationId: 'invitation-1',
            outcome: 'SENT',
          },
          {
            friendPublicId: 'friend-2',
            invitationId: null,
            outcome: 'NOT_ELIGIBLE',
          },
        ],
      },
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(
      repository.createChatRoomInvitations('room-1', ['friend-1', 'friend-2']),
    ).resolves.toEqual([
      {
        friendId: 'friend-1',
        invitationId: 'invitation-1',
        outcome: 'SENT',
      },
      {
        friendId: 'friend-2',
        invitationId: null,
        outcome: 'NOT_ELIGIBLE',
      },
    ]);
  });

  it('받은 만료 초대의 서버 expiryReason을 재계산하지 않고 보존한다', async () => {
    const apiClient = createApiClient();
    apiClient.getReceivedPartyInvitations.mockResolvedValue({
      data: [
        {
          createdAt: '2026-08-23T12:00:00',
          expiryReason: 'CAPACITY_FULL',
          invitationId: 'invitation-1',
          invitationType: 'PARTY',
          inviter: null,
          respondedAt: '2026-08-23T12:10:00',
          status: 'EXPIRED',
          target: null,
        },
      ],
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.getReceivedPartyInvitations()).resolves.toEqual([
      {
        createdAt: '2026-08-23T12:00:00',
        expiresAt: null,
        expiryReason: 'CAPACITY_FULL',
        id: 'invitation-1',
        inviter: null,
        respondedAt: '2026-08-23T12:10:00',
        status: 'EXPIRED',
        target: null,
        type: 'PARTY',
      },
    ]);
  });
});
