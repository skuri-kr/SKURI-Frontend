import type {
  ChatRoomInvitationEligibleFriendsResponseDto,
  ChatRoomInvitationMutationResponseDto,
  ChatRoomInvitationReceivedResponseDto,
  FriendBlockResponseDto,
  FriendCodePreviewResponseDto,
  FriendCodeResponseDto,
  FriendInboxCountsResponseDto,
  FriendMinecraftAccountsResponseDto,
  FriendPrivacyResponseDto,
  FriendRequestItemResponseDto,
  FriendRequestMutationResponseDto,
  FriendRequestPageResponseDto,
  FriendSearchPageResponseDto,
  FriendSearchResultResponseDto,
  FriendSummaryResponseDto,
  FriendInvitationSendResultResponseDto,
  PartyInvitationEligibleFriendsResponseDto,
  PartyInvitationMutationResponseDto,
  PartyInvitationReceivedResponseDto,
} from '../dto/friendDto';
import type {
  FriendBlock,
  FriendCode,
  FriendCodePreview,
  FriendInboxCounts,
  FriendMinecraftAccounts,
  FriendPrivacy,
  FriendRequestItem,
  FriendRequestMutation,
  FriendRequestPage,
  FriendSearchPage,
  FriendSearchResult,
  FriendSummary,
  FriendInvitation,
  FriendInvitationCandidate,
  FriendInvitationEligibleFriends,
  FriendInvitationMutation,
  FriendInvitationSendResult,
} from '../../model/friend';

export const mapFriendSummaryDto = (
  dto: FriendSummaryResponseDto,
): FriendSummary => ({
  department: dto.department,
  effectiveTimetableScope: dto.effectiveTimetableScope ?? 'PRIVATE',
  favorite: dto.favorite,
  id: dto.friendPublicId,
  minecraftAccountCount: dto.minecraftAccountCount ?? 0,
  nickname: dto.nickname,
  photoUrl: dto.photoUrl,
  primaryMinecraftGameName: dto.primaryMinecraftGameName ?? null,
});

export const mapFriendMinecraftAccountsDto = (
  dto: FriendMinecraftAccountsResponseDto,
): FriendMinecraftAccounts => dto;

export const mapFriendSearchResultDto = (
  dto: FriendSearchResultResponseDto | FriendCodePreviewResponseDto,
): FriendSearchResult => ({
  department: dto.department,
  id: dto.friendPublicId,
  nickname: dto.nickname,
  photoUrl: dto.photoUrl,
  relationshipState: dto.relationshipState,
});

export const mapFriendRequestItemDto = (
  dto: FriendRequestItemResponseDto,
): FriendRequestItem => ({
  createdAt: dto.createdAt,
  department: dto.department,
  expiresAt: dto.expiresAt,
  friend: {
    department: dto.department,
    id: dto.friendPublicId,
    nickname: dto.nickname,
    photoUrl: dto.photoUrl,
  },
  id: dto.requestId,
});

export const mapFriendRequestPageDto = (
  dto: FriendRequestPageResponseDto,
): FriendRequestPage => ({
  hasNext: dto.hasNext,
  items: dto.items.map(mapFriendRequestItemDto),
  nextCursor: dto.nextCursor,
});

export const mapFriendSearchPageDto = (
  dto: FriendSearchPageResponseDto,
): FriendSearchPage => ({
  hasNext: dto.hasNext,
  items: dto.items.map(mapFriendSearchResultDto),
  nextCursor: dto.nextCursor,
});

export const mapFriendRequestMutationDto = (
  dto: FriendRequestMutationResponseDto,
): FriendRequestMutation => ({
  friend: dto.friend ? mapFriendSummaryDto(dto.friend) : null,
  requestId: dto.requestId,
  status: dto.status,
});

export const mapFriendBlockDto = (dto: FriendBlockResponseDto): FriendBlock => ({
  blockedAt: dto.blockedAt,
  department: dto.department,
  id: dto.friendPublicId,
  nickname: dto.nickname,
  photoUrl: dto.photoUrl,
});

export const mapFriendCodeDto = (dto: FriendCodeResponseDto): FriendCode => ({
  canRegenerate: dto.canRegenerate,
  code: dto.friendCode,
  nextRegenerationAt: dto.nextRegenerationAt,
});

export const mapFriendCodePreviewDto = (
  dto: FriendCodePreviewResponseDto,
): FriendCodePreview => mapFriendSearchResultDto(dto);

export const mapFriendPrivacyDto = (
  dto: FriendPrivacyResponseDto,
): FriendPrivacy => ({nicknameSearchable: dto.nicknameSearchable});

export const mapFriendInboxCountsDto = (
  dto: FriendInboxCountsResponseDto,
): FriendInboxCounts => ({
  chatRoomInvitationCount: dto.chatRoomInvitationCount,
  incomingRequestCount: dto.incomingRequestCount,
  partyInvitationCount: dto.partyInvitationCount,
  totalActionCount: dto.totalActionCount,
});

export const mapFriendInvitationCandidateDto = (
  dto: {
    department: string | null;
    favorite: boolean;
    friendPublicId: string;
    nickname: string;
    photoUrl: string | null;
  },
): FriendInvitationCandidate => ({
  department: dto.department,
  favorite: dto.favorite,
  id: dto.friendPublicId,
  nickname: dto.nickname,
  photoUrl: dto.photoUrl,
});

export const mapPartyInvitationEligibleFriendsDto = (
  dto: PartyInvitationEligibleFriendsResponseDto,
): FriendInvitationEligibleFriends => ({
  alreadyMemberFriends: dto.alreadyMemberFriends.map(
    mapFriendInvitationCandidateDto,
  ),
  alreadyMemberCount: dto.alreadyMemberCount,
  alreadyPendingFriends: dto.alreadyPendingFriends.map(
    mapFriendInvitationCandidateDto,
  ),
  alreadyPendingCount: dto.alreadyPendingCount,
  canInvite: dto.canInvite,
  expiresInDays: null,
  friends: dto.friends.map(mapFriendInvitationCandidateDto),
  notEligibleCount: dto.notEligibleCount,
  remainingCapacity: dto.remainingCapacity,
  sameDepartmentOnly: false,
  targetId: dto.partyId,
  targetName: dto.targetName,
  unavailableReason: dto.unavailableReason,
});

export const mapChatRoomInvitationEligibleFriendsDto = (
  dto: ChatRoomInvitationEligibleFriendsResponseDto,
): FriendInvitationEligibleFriends => ({
  alreadyMemberFriends: dto.alreadyMemberFriends.map(
    mapFriendInvitationCandidateDto,
  ),
  alreadyMemberCount: dto.alreadyMemberCount,
  alreadyPendingFriends: dto.alreadyPendingFriends.map(
    mapFriendInvitationCandidateDto,
  ),
  alreadyPendingCount: dto.alreadyPendingCount,
  canInvite: true,
  expiresInDays: dto.expiresInDays,
  friends: dto.friends.map(mapFriendInvitationCandidateDto),
  notEligibleCount: dto.notEligibleCount,
  remainingCapacity: dto.remainingCapacity,
  sameDepartmentOnly: dto.sameDepartmentOnly,
  targetId: dto.chatRoomId,
  targetName: dto.targetName,
  unavailableReason: null,
});

export const mapFriendInvitationSendResultDto = (
  dto: FriendInvitationSendResultResponseDto,
): FriendInvitationSendResult => ({
  friendId: dto.friendPublicId,
  invitationId: dto.invitationId,
  outcome: dto.outcome,
});

export const mapPartyInvitationDto = (
  dto: PartyInvitationReceivedResponseDto,
): FriendInvitation => ({
  createdAt: dto.createdAt,
  expiresAt: null,
  expiryReason: dto.expiryReason,
  id: dto.invitationId,
  inviter: dto.inviter ? mapFriendInvitationCandidateDto(dto.inviter) : null,
  respondedAt: dto.respondedAt,
  status: dto.status,
  target: dto.target
    ? {
        currentMembers: dto.target.currentMembers,
        departureName: dto.target.departureName,
        departureTime: dto.target.departureTime,
        destinationName: dto.target.destinationName,
        id: dto.target.partyId,
        maxMembers: dto.target.maxMembers,
        status: dto.target.status,
        type: 'PARTY',
      }
    : null,
  type: 'PARTY',
});

export const mapChatRoomInvitationDto = (
  dto: ChatRoomInvitationReceivedResponseDto,
): FriendInvitation => ({
  createdAt: dto.createdAt,
  expiresAt: dto.expiresAt,
  expiryReason: dto.expiryReason,
  id: dto.invitationId,
  inviter: dto.inviter ? mapFriendInvitationCandidateDto(dto.inviter) : null,
  respondedAt: dto.respondedAt,
  status: dto.status,
  target: dto.target
    ? {
        id: dto.target.chatRoomId,
        maxMembers: dto.target.maxMembers,
        memberCount: dto.target.memberCount,
        name: dto.target.name,
        roomType: dto.target.type,
        type: 'CHAT_ROOM',
      }
    : null,
  type: 'CHAT_ROOM',
});

export const mapPartyInvitationMutationDto = (
  dto: PartyInvitationMutationResponseDto,
): FriendInvitationMutation => ({
  acceptResult: dto.result,
  invitationId: dto.invitationId,
  joinRequestId: dto.joinRequestId,
  status: dto.status,
  targetId: dto.partyId,
  type: 'PARTY',
});

export const mapChatRoomInvitationMutationDto = (
  dto: ChatRoomInvitationMutationResponseDto,
): FriendInvitationMutation => ({
  acceptResult: null,
  invitationId: dto.invitationId,
  joinRequestId: null,
  status: dto.status,
  targetId: dto.chatRoomId,
  type: 'CHAT_ROOM',
});
