export type PartyStatusDto = 'OPEN' | 'CLOSED' | 'ARRIVED' | 'ENDED';

export type JoinRequestStatusDto =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELED'
  | 'EXPIRED';

export type JoinRequestExpiryReasonDto = 'CAPACITY_FULL';

export type TaxiHistoryRoleDto = 'LEADER' | 'MEMBER';

export type TaxiHistoryStatusDto = 'COMPLETED' | 'CANCELLED';

export interface PartyLocationDto {
  lat: number;
  lng: number;
  name: string;
}

export interface PartySummaryResponseDto {
  createdAt: string;
  currentMembers: number;
  departure: PartyLocationDto;
  departureTime: string;
  destination: PartyLocationDto;
  detail?: string | null;
  id: string;
  leaderId: string;
  leaderName?: string | null;
  leaderPhotoUrl?: string | null;
  maxMembers: number;
  participantSummaries?: PartyParticipantSummaryResponseDto[] | null;
  status: PartyStatusDto;
  tags?: string[] | null;
}

export interface PartyParticipantSummaryResponseDto {
  id: string;
  isLeader: boolean;
  nickname?: string | null;
  photoUrl?: string | null;
}

export interface PartyPageResponseDto {
  content: PartySummaryResponseDto[];
  hasNext: boolean;
  hasPrevious: boolean;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PartySettlementMemberResponseDto {
  displayName?: string | null;
  leftAt?: string | null;
  leftParty?: boolean | null;
  memberId: string;
  settled: boolean;
  settledAt?: string | null;
}

export interface SettlementAccountResponseDto {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  hideName?: boolean | null;
}

export interface SettlementSummaryResponseDto {
  account?: SettlementAccountResponseDto | null;
  memberSettlements?: PartySettlementMemberResponseDto[] | null;
  perPersonAmount?: number | null;
  settlementTargetMemberIds?: string[] | null;
  splitMemberCount?: number | null;
  status: string;
  taxiFare?: number | null;
}

export interface MyPartyResponseDto {
  departure: PartyLocationDto;
  destination: PartyLocationDto;
  id: string;
  isLeader: boolean;
  settlement?: SettlementSummaryResponseDto | null;
  status: PartyStatusDto;
}

export interface PartyMemberResponseDto {
  id: string;
  isLeader: boolean;
  joinedAt?: string | null;
  nickname?: string | null;
  photoUrl?: string | null;
}

export interface PartyDetailResponseDto {
  createdAt: string;
  departure: PartyLocationDto;
  departureTime: string;
  destination: PartyLocationDto;
  detail?: string | null;
  id: string;
  leaderId: string;
  leaderName?: string | null;
  leaderPhotoUrl?: string | null;
  maxMembers: number;
  members: PartyMemberResponseDto[];
  settlement?: SettlementSummaryResponseDto | null;
  status: PartyStatusDto;
  tags?: string[] | null;
}

export interface CreatePartyRequestDto {
  departure: PartyLocationDto;
  departureTime: string;
  destination: PartyLocationDto;
  detail?: string | null;
  maxMembers: number;
  tags?: string[] | null;
}

export interface UpdatePartyRequestDto {
  departureTime?: string | null;
  detail?: string | null;
}

export interface ArrivePartyRequestDto {
  account: SettlementAccountResponseDto;
  settlementTargetMemberIds: string[];
  taxiFare: number;
}

export interface PartyCreateResponseDto {
  chatRoomId: string;
  id: string;
}

export interface PartyStatusResponseDto {
  endReason?: string | null;
  id: string;
  status: PartyStatusDto;
}

export interface JoinRequestResponseDto {
  expiryReason: JoinRequestExpiryReasonDto | null;
  id: string;
  status: JoinRequestStatusDto;
}

export interface JoinRequestAcceptResponseDto {
  id: string;
  partyId: string;
  status: JoinRequestStatusDto;
}

export interface SettlementConfirmResponseDto {
  allSettled: boolean;
  memberId: string;
  settled: boolean;
  settledAt?: string | null;
}

export interface JoinRequestListItemResponseDto {
  createdAt: string;
  id: string;
  expiryReason: JoinRequestExpiryReasonDto | null;
  partyId: string;
  requesterId: string;
  requesterName?: string | null;
  requesterPhotoUrl?: string | null;
  status: JoinRequestStatusDto;
}

export interface TaxiHistoryItemResponseDto {
  arrivalLabel: string;
  dateTime: string;
  departureLabel: string;
  id: string;
  passengerCount: number;
  paymentAmount?: number | null;
  role: TaxiHistoryRoleDto;
  status: TaxiHistoryStatusDto;
}

export interface TaxiHistorySummaryResponseDto {
  completedRideCount: number;
  savedFareAmount: number;
  totalRideCount: number;
}
