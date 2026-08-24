import type {
  ChatAvatarViewData,
  ChatThreadDateDividerViewData,
  ChatThreadHeaderViewData,
  ChatThreadMessageViewData,
  ChatThreadMenuViewData,
  ChatThreadSystemMessageViewData,
} from '@/shared/ui/chat';

import type {TaxiRecruitDraft} from './taxiRecruitData';
import type {AccountMessageDraft, PartyLocation} from './types';

export const TAXI_CHAT_CURRENT_USER_ID = 'current-user';
export const TAXI_CHAT_CURRENT_USER_NAME = '나';

export type TaxiChatPartyStatus = 'open' | 'closed' | 'arrived' | 'ended';
export type TaxiChatActionTrayActionId =
  | 'callTaxi'
  | 'sendAccount'
  | 'close'
  | 'reopen'
  | 'arrive'
  | 'settlementStatus'
  | 'end';

export interface TaxiChatActionTrayActionViewData {
  id: TaxiChatActionTrayActionId;
  label: string;
  tone: 'brand' | 'info' | 'warning' | 'danger' | 'purple';
}

export interface TaxiChatSummaryManagementViewData {
  canCancelParty: boolean;
  canEditParty: boolean;
  canLeave: boolean;
  canManageSettlement: boolean;
  isLeader: boolean;
}

export interface TaxiChatSettlementMemberViewData {
  id: string;
  isCurrentUser: boolean;
  isLeader: boolean;
  label: string;
  photoUrl?: string;
  leftAt?: string;
  leftParty?: boolean;
  settled: boolean;
}

export interface TaxiChatSettlementNoticeViewData {
  accountData?: TaxiChatSourceAccountData;
  accountLabel?: string;
  completedCount: number;
  description: string;
  members: TaxiChatSettlementMemberViewData[];
  perPersonAmount?: number;
  splitMemberCount?: number;
  statusLabel: string;
  summaryLabel: string;
  taxiFare?: number;
  totalCount: number;
}

export interface TaxiChatSummaryViewData {
  currentMemberCount: number;
  departureLabel: string;
  departureLocation: PartyLocation;
  departureTimeISO: string;
  departureTimeLabel: string;
  detail?: string;
  destinationLabel: string;
  destinationLocation: PartyLocation;
  estimatedFareLabel: string;
  management: TaxiChatSummaryManagementViewData;
  memberSummaryLabel: string;
  maxMemberCount: number;
  members: TaxiChatSettlementMemberViewData[];
  partyStatus: TaxiChatPartyStatus;
  settlementNotice?: TaxiChatSettlementNoticeViewData;
  tags: string[];
}

export interface TaxiChatSourceParticipant {
  id: string;
  isLeader: boolean;
  name: string;
  photoUrl?: string;
  settled: boolean;
  settledAt?: string;
}

export interface TaxiChatSourceSettlement {
  accountData?: TaxiChatSourceAccountData;
  members?: TaxiChatSourceSettlementMember[];
  splitMemberCount?: number;
  settlementTargetMemberIds: string[];
  perPersonAmount: number;
  status: 'pending' | 'completed';
  taxiFare?: number;
}

export interface TaxiChatSourceSettlementMember {
  id: string;
  label: string;
  leftAt?: string;
  leftParty?: boolean;
  settled: boolean;
  settledAt?: string;
}

export interface TaxiChatSourceAccountData {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  hideName: boolean;
}

export interface TaxiChatSourceArrivalData {
  accountData?: TaxiChatSourceAccountData;
  members?: TaxiChatSourceSettlementMember[];
  perPersonAmount?: number;
  settlementTargetMemberIds: string[];
  splitMemberCount?: number;
  taxiFare?: number;
}

export interface TaxiChatAccountMessageDraft extends AccountMessageDraft {}

export interface TaxiChatSourceMessageItem {
  accountData?: TaxiChatSourceAccountData;
  arrivalData?: TaxiChatSourceArrivalData;
  avatar?: ChatAvatarViewData;
  createdAt: string;
  deletedAt?: string;
  editedAt?: string;
  id: string;
  imageUrl?: string;
  isDeleted?: boolean;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'system' | 'account' | 'arrived' | 'end';
  updatedAt?: string;
}

export interface TaxiChatSourceData {
  composerPlaceholder: string;
  departureLocation: PartyLocation;
  departureTimeISO: string;
  detail?: string;
  destinationLocation: PartyLocation;
  estimatedFareLabel: string;
  hasOlderMessages: boolean;
  id: string;
  latestAccountData?: TaxiChatSourceAccountData;
  loadingOlderMessages: boolean;
  leaderId: string;
  maxMembers: number;
  memberCount: number;
  messages: TaxiChatSourceMessageItem[];
  notificationEnabled: boolean;
  participants: TaxiChatSourceParticipant[];
  partyStatus: TaxiChatPartyStatus;
  settlement?: TaxiChatSourceSettlement;
  tags: string[];
  title: string;
}

export type TaxiChatDateDividerViewData = ChatThreadDateDividerViewData;
export type TaxiChatTextMessageViewData = ChatThreadMessageViewData;
export type TaxiChatSystemMessageViewData = ChatThreadSystemMessageViewData;

export interface TaxiChatAccountMessageViewData {
  accountData: TaxiChatSourceAccountData;
  avatar?: ChatAvatarViewData;
  createdAt?: string;
  direction: 'incoming' | 'outgoing';
  id: string;
  senderName: string;
  text: string;
  timeLabel: string;
  type: 'account-message';
}

export interface TaxiChatArrivedMessageViewData {
  accountData?: TaxiChatSourceAccountData;
  accountLabel?: string;
  id: string;
  perPersonAmount?: number;
  splitMemberSummaryLabel?: string;
  settlementTargetMemberIds: string[];
  splitMemberCount?: number;
  taxiFare?: number;
  timeLabel: string;
  type: 'arrived-message';
}

export interface TaxiChatEndMessageViewData {
  id: string;
  text: string;
  type: 'end-message';
}

export type TaxiChatThreadItemViewData =
  | TaxiChatDateDividerViewData
  | TaxiChatTextMessageViewData
  | TaxiChatSystemMessageViewData
  | TaxiChatAccountMessageViewData
  | TaxiChatArrivedMessageViewData
  | TaxiChatEndMessageViewData;

export interface TaxiChatViewData {
  actionTrayActions: TaxiChatActionTrayActionViewData[];
  composerPlaceholder: string;
  currentUserId: string;
  header: ChatThreadHeaderViewData;
  items: TaxiChatThreadItemViewData[];
  menu: ChatThreadMenuViewData & {
    canCancelParty: boolean;
    canEditParty: boolean;
    isLeader: boolean;
  };
  roomId: string;
  summary: TaxiChatSummaryViewData;
}

export interface TaxiChatImageUploadInput {
  fileName?: string;
  mimeType?: string;
  uri: string;
}

export interface CreateTaxiChatRoomParams {
  draft: TaxiRecruitDraft;
}

export interface TaxiChatSessionSnapshot {
  currentPartyId: string | null;
}
