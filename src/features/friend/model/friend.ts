export interface FriendSummary {
  department: string | null;
  favorite: boolean;
  id: string;
  minecraftAccountCount?: number;
  nickname: string;
  photoUrl: string | null;
  primaryMinecraftGameName?: string | null;
  effectiveTimetableScope?: 'PRIVATE' | 'BUSY_ONLY' | 'DETAILS';
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

export interface FriendInvitationCandidate {
  department: string | null;
  favorite: boolean;
  id: string;
  nickname: string;
  photoUrl: string | null;
}

export type FriendInvitationOutcome =
  | 'SENT'
  | 'ALREADY_PENDING'
  | 'ALREADY_MEMBER'
  | 'NOT_ELIGIBLE';

export interface FriendInvitationSendResult {
  friendId: string;
  invitationId: string | null;
  outcome: FriendInvitationOutcome;
}

export interface FriendInvitationEligibleFriends {
  alreadyMemberFriends: FriendInvitationCandidate[];
  alreadyMemberCount: number;
  alreadyPendingFriends: FriendInvitationCandidate[];
  alreadyPendingCount: number;
  canInvite: boolean;
  expiresInDays: number | null;
  friends: FriendInvitationCandidate[];
  notEligibleCount: number;
  remainingCapacity: number | null;
  sameDepartmentOnly: boolean;
  targetId: string;
  targetName: string;
  unavailableReason: 'PARTY_FULL' | null;
}

export type FriendInvitationStatus = 'PENDING' | 'EXPIRED';

export type FriendInvitationExpiryReason =
  | 'INVITATION_TIMEOUT'
  | 'TARGET_UNAVAILABLE'
  | 'CAPACITY_FULL'
  | 'INVITER_LEFT'
  | 'ALREADY_JOINED'
  | 'RELATIONSHIP_UNAVAILABLE'
  | 'ELIGIBILITY_CHANGED'
  | 'MEMBER_WITHDRAWN';

export interface FriendPartyInvitationTarget {
  currentMembers: number;
  departureName: string;
  departureTime: string;
  destinationName: string;
  id: string;
  maxMembers: number;
  status: 'OPEN' | 'CLOSED' | 'ARRIVED' | 'ENDED';
  type: 'PARTY';
}

export interface FriendChatRoomInvitationTarget {
  id: string;
  maxMembers: number | null;
  memberCount: number;
  name: string;
  roomType: 'UNIVERSITY' | 'DEPARTMENT' | 'GAME' | 'CUSTOM' | 'PARTY';
  type: 'CHAT_ROOM';
}

export type FriendInvitationTarget =
  | FriendPartyInvitationTarget
  | FriendChatRoomInvitationTarget;

export interface FriendInvitation {
  createdAt: string;
  expiresAt: string | null;
  expiryReason: FriendInvitationExpiryReason | null;
  id: string;
  inviter: FriendInvitationCandidate | null;
  respondedAt: string | null;
  status: FriendInvitationStatus;
  target: FriendInvitationTarget | null;
  type: 'PARTY' | 'CHAT_ROOM';
}

export interface FriendInvitationMutation {
  acceptResult: 'JOINED' | 'LEADER_APPROVAL_PENDING' | null;
  invitationId: string;
  joinRequestId: string | null;
  status: 'ACCEPTED' | 'DECLINED';
  targetId: string;
  type: 'PARTY' | 'CHAT_ROOM';
}

export type FriendRequestDirection = 'RECEIVED' | 'SENT';
