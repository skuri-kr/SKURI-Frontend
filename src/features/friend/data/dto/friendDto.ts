export interface FriendSummaryResponseDto {
  department: string | null;
  favorite: boolean;
  friendPublicId: string;
  minecraftAccountCount?: number | null;
  nickname: string;
  photoUrl: string | null;
  primaryMinecraftGameName?: string | null;
  effectiveTimetableScope?: 'PRIVATE' | 'BUSY_ONLY' | 'DETAILS';
}

export type FriendMinecraftEditionDto = 'JAVA' | 'BEDROCK';

export interface FriendMinecraftAccountResponseDto {
  avatarUuid: string | null;
  edition: FriendMinecraftEditionDto;
  gameName: string;
}

export interface FriendMinecraftSelfAccountResponseDto
  extends FriendMinecraftAccountResponseDto {
  friendAccounts: FriendMinecraftAccountResponseDto[];
}

export interface FriendMinecraftAccountsResponseDto {
  selfAccounts: FriendMinecraftSelfAccountResponseDto[];
}

export interface FriendSearchResultResponseDto {
  department: string | null;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
  relationshipState:
    | 'REQUESTABLE'
    | 'INCOMING_PENDING'
    | 'OUTGOING_PENDING'
    | 'ALREADY_FRIEND';
}

export interface FriendSearchPageResponseDto {
  hasNext: boolean;
  items: FriendSearchResultResponseDto[];
  nextCursor: string | null;
}

export interface FriendRequestItemResponseDto {
  createdAt: string;
  department: string | null;
  expiresAt: string;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
  requestId: string;
}

export interface FriendRequestPageResponseDto {
  hasNext: boolean;
  items: FriendRequestItemResponseDto[];
  nextCursor: string | null;
}

export interface FriendRequestMutationResponseDto {
  friend?: FriendSummaryResponseDto;
  requestId: string;
  status: 'ACCEPTED' | 'PENDING';
}

export interface FriendBlockResponseDto {
  blockedAt: string;
  department: string | null;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
}

export interface FriendCodeResponseDto {
  canRegenerate: boolean;
  friendCode: string;
  nextRegenerationAt: string | null;
}

export interface FriendCodePreviewResponseDto {
  department: string | null;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
  relationshipState:
    | 'REQUESTABLE'
    | 'INCOMING_PENDING'
    | 'OUTGOING_PENDING'
    | 'ALREADY_FRIEND';
}

export interface FriendPrivacyResponseDto {
  nicknameSearchable: boolean;
}

export interface FriendInboxCountsResponseDto {
  chatRoomInvitationCount: number;
  incomingRequestCount: number;
  partyInvitationCount: number;
  totalActionCount: number;
}

export interface FriendInvitationCandidateResponseDto {
  department: string | null;
  favorite: boolean;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
}

export type FriendInvitationOutcomeDto =
  | 'SENT'
  | 'ALREADY_PENDING'
  | 'ALREADY_MEMBER'
  | 'NOT_ELIGIBLE';

export interface FriendInvitationSendResultResponseDto {
  friendPublicId: string;
  invitationId: string | null;
  outcome: FriendInvitationOutcomeDto;
}

export interface FriendInvitationBatchResponseDto {
  results: FriendInvitationSendResultResponseDto[];
}

export interface PartyInvitationEligibleFriendsResponseDto {
  alreadyMemberCount: number;
  alreadyPendingCount: number;
  friends: FriendInvitationCandidateResponseDto[];
  notEligibleCount: number;
  partyId: string;
  remainingCapacity: number;
  targetName: string;
}

export interface ChatRoomInvitationEligibleFriendsResponseDto {
  alreadyMemberCount: number;
  alreadyPendingCount: number;
  chatRoomId: string;
  expiresInDays: number;
  friends: FriendInvitationCandidateResponseDto[];
  notEligibleCount: number;
  remainingCapacity: number | null;
  targetName: string;
}

export type FriendInvitationExpiryReasonDto =
  | 'INVITATION_TIMEOUT'
  | 'TARGET_UNAVAILABLE'
  | 'CAPACITY_FULL'
  | 'INVITER_LEFT'
  | 'ALREADY_JOINED'
  | 'RELATIONSHIP_UNAVAILABLE'
  | 'ELIGIBILITY_CHANGED'
  | 'MEMBER_WITHDRAWN';

export interface PartyInvitationTargetResponseDto {
  currentMembers: number;
  departureName: string;
  departureTime: string;
  destinationName: string;
  maxMembers: number;
  partyId: string;
  status: 'OPEN' | 'CLOSED' | 'ARRIVED' | 'ENDED';
}

export interface ChatRoomInvitationTargetResponseDto {
  chatRoomId: string;
  maxMembers: number | null;
  memberCount: number;
  name: string;
  type: 'UNIVERSITY' | 'DEPARTMENT' | 'GAME' | 'CUSTOM' | 'PARTY';
}

export interface PartyInvitationReceivedResponseDto {
  createdAt: string;
  expiryReason: FriendInvitationExpiryReasonDto | null;
  invitationId: string;
  invitationType: 'PARTY';
  inviter: FriendInvitationCandidateResponseDto | null;
  respondedAt: string | null;
  status: 'PENDING' | 'EXPIRED';
  target: PartyInvitationTargetResponseDto | null;
}

export interface ChatRoomInvitationReceivedResponseDto {
  createdAt: string;
  expiresAt: string;
  expiryReason: FriendInvitationExpiryReasonDto | null;
  invitationId: string;
  invitationType: 'CHAT_ROOM';
  inviter: FriendInvitationCandidateResponseDto | null;
  respondedAt: string | null;
  status: 'PENDING' | 'EXPIRED';
  target: ChatRoomInvitationTargetResponseDto | null;
}

export interface PartyInvitationMutationResponseDto {
  invitationId: string;
  partyId: string;
  status: 'ACCEPTED' | 'DECLINED';
}

export interface ChatRoomInvitationMutationResponseDto {
  chatRoomId: string;
  invitationId: string;
  status: 'ACCEPTED' | 'DECLINED';
}

export interface FriendCodePreviewRequestDto {
  friendCode: string;
}

export interface CreateFriendRequestRequestDto {
  friendPublicId: string;
}

export interface UpdateFriendFavoriteRequestDto {
  favorite: boolean;
}

export interface CreateMemberBlockRequestDto {
  friendPublicId: string;
}

export interface UpdateFriendPrivacyRequestDto {
  nicknameSearchable: boolean;
}

export interface CreateFriendInvitationsRequestDto {
  friendPublicIds: string[];
}
