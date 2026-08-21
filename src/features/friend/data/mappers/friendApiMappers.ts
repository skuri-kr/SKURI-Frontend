import type {
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
} from '../../model/friend';

export const mapFriendSummaryDto = (
  dto: FriendSummaryResponseDto,
): FriendSummary => ({
  department: dto.department,
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
