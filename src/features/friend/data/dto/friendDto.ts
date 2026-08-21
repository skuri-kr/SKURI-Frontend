export interface FriendSummaryResponseDto {
  department: string | null;
  favorite: boolean;
  friendPublicId: string;
  nickname: string;
  photoUrl: string | null;
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
