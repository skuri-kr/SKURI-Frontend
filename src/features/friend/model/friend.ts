export interface FriendSummary {
  department: string | null;
  favorite: boolean;
  id: string;
  nickname: string;
  photoUrl: string | null;
}

export interface FriendSearchResult {
  canSendFriendRequest: boolean;
  department: string | null;
  id: string;
  nickname: string;
  photoUrl: string | null;
}

export interface FriendRequestItem {
  createdAt: string;
  department: string | null;
  expiresAt: string;
  friend: Omit<FriendSearchResult, 'canSendFriendRequest'>;
  id: string;
}

export interface FriendRequestPage {
  hasNext: boolean;
  items: FriendRequestItem[];
  nextCursor: string | null;
}

export interface FriendSearchPage {
  hasNext: boolean;
  items: FriendSearchResult[];
  nextCursor: string | null;
}

export interface FriendRequestMutation {
  friend: FriendSummary | null;
  requestId: string;
  status: 'ACCEPTED' | 'PENDING';
}

export interface FriendBlock {
  blockedAt: string;
  department: string | null;
  id: string;
  nickname: string;
  photoUrl: string | null;
}

export interface FriendCode {
  canRegenerate: boolean;
  code: string;
  nextRegenerationAt: string | null;
}

export interface FriendCodePreview extends FriendSearchResult {}

export interface FriendPrivacy {
  nicknameSearchable: boolean;
}

export interface FriendInboxCounts {
  chatRoomInvitationCount: number;
  incomingRequestCount: number;
  partyInvitationCount: number;
  totalActionCount: number;
}

export type FriendRequestDirection = 'RECEIVED' | 'SENT';
