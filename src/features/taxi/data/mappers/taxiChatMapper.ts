import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {COLORS} from '@/shared/design-system/tokens';

import {formatEstimatedTaxiFareLabel} from '../../model/taxiFareEstimator';
import type {PartyDetailResponseDto} from '../dto/taxiHomeDto';
import {mapPartyStatusDto} from './taxiPartyMapper';
import type {
  ChatAccountDataResponseDto,
  ChatArrivalDataResponseDto,
  ChatArrivalSettlementMemberResponseDto,
  ChatMessageResponseDto,
  ChatRoomDetailResponseDto,
} from '../dto/taxiChatDto';
import type {
  TaxiChatSourceAccountData,
  TaxiChatSourceArrivalData,
  TaxiChatSourceParticipant,
  TaxiChatSourceData,
  TaxiChatSourceMessageItem,
  TaxiChatSourceSettlementMember,
} from '../../model/taxiChatViewData';

const formatPartyTitle = (departureLabel: string, destinationLabel: string) =>
  `${departureLabel} → ${destinationLabel} 파티`;

const formatDepartureTimeLabel = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'M월 d일 a hh:mm', {locale: ko});
};

const normalizePartyTags = (tags?: string[] | null) =>
  tags?.map(tag => tag.trim()).filter(Boolean) ?? [];

const mapAccountData = (
  accountData?: ChatAccountDataResponseDto | null,
): TaxiChatSourceAccountData | undefined => {
  if (!accountData) {
    return undefined;
  }

  return {
    accountHolder: accountData.accountHolder,
    accountNumber: accountData.accountNumber,
    bankName: accountData.bankName,
    hideName: Boolean(accountData.hideName),
  };
};

const mapArrivalData = (
  arrivalData?: ChatArrivalDataResponseDto | null,
): TaxiChatSourceArrivalData | undefined => {
  if (!arrivalData) {
    return undefined;
  }

  return {
    accountData: mapAccountData(arrivalData.accountData),
    members: arrivalData.memberSettlements?.map(
      mapArrivalSettlementMemberResponseDto,
    ),
    perPersonAmount: arrivalData.perPersonAmount ?? undefined,
    settlementTargetMemberIds: arrivalData.settlementTargetMemberIds ?? [],
    splitMemberCount: arrivalData.splitMemberCount ?? undefined,
    taxiFare: arrivalData.taxiFare ?? undefined,
  };
};

const mapArrivalSettlementMemberResponseDto = (
  member: ChatArrivalSettlementMemberResponseDto,
): TaxiChatSourceSettlementMember => ({
  id: member.memberId,
  label: member.displayName?.trim() || '동승 멤버',
  leftAt: member.leftAt ?? undefined,
  leftParty: Boolean(member.leftParty),
  settled: member.settled,
  settledAt: member.settledAt ?? undefined,
});

const resolveMessageType = (
  message: ChatMessageResponseDto,
): TaxiChatSourceMessageItem['type'] => {
  switch (message.type) {
    case 'ACCOUNT':
      return 'account';
    case 'ARRIVED':
      return 'arrived';
    case 'END':
      return 'end';
    case 'IMAGE':
      return 'image';
    case 'SYSTEM':
      return 'system';
    case 'TEXT':
    default:
      return 'text';
  }
};

const resolveMessageText = (message: ChatMessageResponseDto) => {
  switch (message.type) {
    case 'IMAGE':
      return message.imageUrl ?? message.text ?? '이미지를 보냈어요.';
    case 'ACCOUNT':
      return (
        message.text ??
        (message.accountData
          ? `${message.accountData.bankName} ${message.accountData.accountNumber}`
          : '계좌 정보를 보냈어요.')
      );
    case 'ARRIVED':
    case 'END':
    case 'TEXT':
    case 'SYSTEM':
    default:
      return message.text ?? '';
  }
};

const resolveParticipantName = (
  party: PartyDetailResponseDto,
  participant: PartyDetailResponseDto['members'][number],
) => {
  const trimmedNickname = participant.nickname?.trim();

  if (trimmedNickname) {
    return trimmedNickname;
  }

  if (participant.isLeader) {
    return party.leaderName?.trim() || '방장';
  }

  return '동승 멤버';
};

const resolveSettlementMemberName = ({
  dtoName,
  fallbackParticipant,
  party,
}: {
  dtoName?: string | null;
  fallbackParticipant?: PartyDetailResponseDto['members'][number];
  party: PartyDetailResponseDto;
}) => {
  const trimmedName = dtoName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (fallbackParticipant) {
    return resolveParticipantName(party, fallbackParticipant);
  }

  return '동승 멤버';
};

export const resolveTaxiChatRoomId = (partyId: string) => `party:${partyId}`;

export const mapTaxiChatMessageDto = (
  message: ChatMessageResponseDto,
): TaxiChatSourceMessageItem => ({
  accountData: mapAccountData(message.accountData),
  arrivalData: mapArrivalData(message.arrivalData),
  avatar: message.senderPhotoUrl
    ? {
        backgroundColor: COLORS.border.default,
        kind: 'image',
        uri: message.senderPhotoUrl,
      }
    : undefined,
  createdAt: message.createdAt,
  id: message.id,
  imageUrl: message.imageUrl ?? undefined,
  senderId: message.senderId ?? 'system',
  senderName: message.senderName ?? '안내',
  text: resolveMessageText(message),
  type: resolveMessageType(message),
});

export const buildTaxiChatSourceData = ({
  messages,
  party,
  room,
}: {
  messages: ChatMessageResponseDto[];
  party: PartyDetailResponseDto;
  room: ChatRoomDetailResponseDto;
}): TaxiChatSourceData => {
  const settlementByMemberId = new Map(
    (party.settlement?.memberSettlements ?? []).map(memberSettlement => [
      memberSettlement.memberId,
      memberSettlement,
    ]),
  );
  const participantById = new Map(
    party.members.map(member => [member.id, member] as const),
  );
  const participants: TaxiChatSourceParticipant[] = party.members.map(member => {
    const settlement = settlementByMemberId.get(member.id);

    return {
      id: member.id,
      isLeader: member.isLeader,
      name: resolveParticipantName(party, member),
      photoUrl: member.photoUrl ?? undefined,
      settled: settlement?.settled ?? false,
      settledAt: settlement?.settledAt ?? undefined,
    };
  });
  const settlementMembers: TaxiChatSourceSettlementMember[] =
    (party.settlement?.memberSettlements ?? []).map(memberSettlement => ({
      id: memberSettlement.memberId,
      label: resolveSettlementMemberName({
        dtoName: memberSettlement.displayName,
        fallbackParticipant: participantById.get(memberSettlement.memberId),
        party,
      }),
      leftAt: memberSettlement.leftAt ?? undefined,
      leftParty: Boolean(memberSettlement.leftParty),
      settled: memberSettlement.settled,
      settledAt: memberSettlement.settledAt ?? undefined,
    }));
  const memberCount = participants.length;
  const tags = normalizePartyTags(party.tags);
  const mappedMessages = [...messages].reverse().map(mapTaxiChatMessageDto);
  const latestAccountData =
    [...mappedMessages]
      .reverse()
      .find(message => message.type === 'account' && message.accountData)
      ?.accountData ?? undefined;

  return {
    composerPlaceholder: '메시지를 입력하세요',
    departureLocation: {
      lat: party.departure.lat,
      lng: party.departure.lng,
      name: party.departure.name,
    },
    departureTimeISO: party.departureTime,
    detail: party.detail ?? undefined,
    destinationLocation: {
      lat: party.destination.lat,
      lng: party.destination.lng,
      name: party.destination.name,
    },
    estimatedFareLabel: formatEstimatedTaxiFareLabel({
      currentMemberCount: memberCount,
      departureLabel: party.departure.name,
      destinationLabel: party.destination.name,
      maxMemberCount: party.maxMembers,
      splitStrategy: 'current-members-only',
    }),
    id: party.id,
    latestAccountData,
    leaderId: party.leaderId,
    maxMembers: party.maxMembers,
    memberCount,
    notificationEnabled: !room.isMuted,
    participants,
    partyStatus: mapPartyStatusDto(party.status),
    settlement: party.settlement
        ? {
          accountData: mapAccountData(party.settlement.account),
          members: settlementMembers,
          perPersonAmount: party.settlement.perPersonAmount ?? 0,
          settlementTargetMemberIds:
            party.settlement.settlementTargetMemberIds ?? [],
          splitMemberCount: party.settlement.splitMemberCount ?? undefined,
          status:
            party.settlement.status === 'COMPLETED' ? 'completed' : 'pending',
          taxiFare: party.settlement.taxiFare ?? undefined,
        }
      : undefined,
    tags,
    title:
      room.name ||
      formatPartyTitle(party.departure.name, party.destination.name),
    messages: mappedMessages,
  };
};

export const formatTaxiChatDepartureTime = (value: string) =>
  formatDepartureTimeLabel(value);
