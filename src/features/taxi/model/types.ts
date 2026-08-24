export interface PartyLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface PartySettlementMember {
  displayName?: string;
  leftAt?: unknown;
  leftParty?: boolean;
  settled: boolean;
  settledAt?: unknown;
}

export interface SettlementAccountData {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  hideName: boolean;
}

export interface PartySettlement {
  account?: SettlementAccountData;
  splitMemberCount?: number;
  settlementTargetMemberIds: string[];
  status: 'pending' | 'completed';
  taxiFare?: number;
  perPersonAmount: number;
  members: Record<string, PartySettlementMember>;
}

export interface Party {
  id?: string;
  leaderId: string;
  departure: PartyLocation;
  destination: PartyLocation;
  departureTime: string;
  maxMembers: number;
  members: string[];
  tags?: string[];
  detail?: string;
  status: 'open' | 'closed' | 'arrived' | 'ended';
  endReason?: 'arrived' | 'cancelled' | 'timeout' | 'withdrawed';
  endedAt?: unknown;
  settlement?: PartySettlement;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PartyMember {
  role: 'leader' | 'member';
  joinedAt?: unknown;
}

export interface PendingJoinRequest {
  requestId: string;
  partyId: string;
}

export interface JoinRequest {
  id: string;
  partyId: string;
  requesterId: string;
  requesterName?: string;
  invitationInviterName?: string;
  leaderId: string;
  expiryReason?: 'capacity-full';
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
  createdAt: unknown;
}

export interface JoinRequestStatus {
  expiryReason?: 'capacity-full';
  requestId: string;
  partyId: string;
  status: JoinRequest['status'];
}

export interface SettlementData {
  account: SettlementAccountData;
  splitMemberCount: number;
  settlementTargetMemberIds: string[];
  perPersonAmount: number;
  members: Record<string, PartySettlementMember>;
  taxiFare: number;
}

export interface AccountMessageData extends SettlementAccountData {}

export interface AccountMessageDraft extends SettlementAccountData {
  remember: boolean;
}

export interface ArrivalMessageData {
  taxiFare: number;
  splitMemberCount: number;
  perPersonAmount: number;
  settlementTargetMemberIds: string[];
  accountData: SettlementAccountData;
}

export interface PartyMessage {
  id: string;
  partyId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'user' | 'system' | 'account' | 'arrived' | 'end';
  accountData?: AccountMessageData;
  arrivalData?: ArrivalMessageData;
  createdAt: unknown;
  updatedAt?: unknown;
}
