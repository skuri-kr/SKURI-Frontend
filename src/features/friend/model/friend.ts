export interface FriendSummary {
  department: string | null;
  favorite: boolean;
  id: string;
  minecraftAccountCount?: number;
  nickname: string;
  photoUrl: string | null;
  primaryMinecraftGameName?: string | null;
}

export type FriendMinecraftEdition = 'JAVA' | 'BEDROCK';

export interface FriendMinecraftAccount {
  avatarUuid: string | null;
  edition: FriendMinecraftEdition;
  gameName: string;
}

export interface FriendMinecraftSelfAccount extends FriendMinecraftAccount {
  friendAccounts: FriendMinecraftAccount[];
}

export interface FriendMinecraftAccounts {
  selfAccounts: FriendMinecraftSelfAccount[];
}

export type FriendRelationshipState =
  | 'REQUESTABLE'
  | 'INCOMING_PENDING'
  | 'OUTGOING_PENDING'
  | 'ALREADY_FRIEND';

export interface FriendSearchResult {
  department: string | null;
  id: string;
  nickname: string;
  photoUrl: string | null;
  relationshipState: FriendRelationshipState;
}

export interface FriendRequestItem {
  createdAt: string;
  department: string | null;
  expiresAt: string;
  friend: Omit<FriendSearchResult, 'relationshipState'>;
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
