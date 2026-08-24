import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

import {COLORS} from '@/shared/design-system/tokens';
import type {ChatThreadHeaderViewData} from '@/shared/ui/chat';

import {
  TAXI_CHAT_CURRENT_USER_ID,
  type TaxiChatActionTrayActionViewData,
  type TaxiChatSettlementMemberViewData,
  type TaxiChatSourceData,
  type TaxiChatSummaryManagementViewData,
  type TaxiChatSettlementNoticeViewData,
  type TaxiChatThreadItemViewData,
  type TaxiChatViewData,
} from '../model/taxiChatViewData';
import {formatTaxiChatDepartureTime} from '../data/mappers/taxiChatMapper';

const formatAccountLabel = (
  accountData?: TaxiChatSourceData['latestAccountData'],
) =>
  accountData
    ? `${accountData.bankName} ${accountData.accountNumber}`
    : undefined;

const buildSummaryMembers = (
  partyChat: TaxiChatSourceData,
  currentUserId: string,
): TaxiChatSettlementMemberViewData[] =>
  partyChat.participants.map(participant => ({
    id: participant.id,
    isCurrentUser: participant.id === currentUserId,
    isLeader: participant.isLeader,
    label: participant.name,
    photoUrl: participant.photoUrl,
    settled: participant.isLeader ? true : participant.settled,
  }));

const buildManagement = (
  partyChat: TaxiChatSourceData,
  currentUserId: string,
): TaxiChatSummaryManagementViewData => {
  const isLeader = partyChat.leaderId === currentUserId;
  const canLeave = !isLeader && partyChat.partyStatus !== 'ended';

  return {
    canCancelParty: isLeader,
    canEditParty:
      isLeader &&
      (partyChat.partyStatus === 'open' || partyChat.partyStatus === 'closed'),
    canLeave,
    canManageSettlement: isLeader && partyChat.partyStatus === 'arrived',
    isLeader,
  };
};

const buildHeader = (
  partyChat: TaxiChatSourceData,
): ChatThreadHeaderViewData => ({
  iconBackgroundColor: COLORS.accent.yellowSoft,
  iconColor: COLORS.accent.yellow,
  iconName: 'car-sport-outline',
  subtitle: `${partyChat.memberCount}명`,
  title: partyChat.title,
});

const buildMessageAvatar = ({
  currentUserId,
  partyChat,
  senderId,
}: {
  currentUserId: string;
  partyChat: TaxiChatSourceData;
  senderId: string;
}) => {
  if (senderId === currentUserId) {
    return undefined;
  }

  const participant = partyChat.participants.find(
    member => member.id === senderId,
  );

  if (participant?.photoUrl) {
    return {
      backgroundColor: COLORS.border.default,
      kind: 'image' as const,
      uri: participant.photoUrl,
    };
  }

  return {
    backgroundColor: COLORS.border.default,
    iconColor: COLORS.text.muted,
    iconName: 'person-outline' as const,
    kind: 'icon' as const,
  };
};

const buildActionTrayActions = (
  partyChat: TaxiChatSourceData,
  management: TaxiChatSummaryManagementViewData,
): TaxiChatActionTrayActionViewData[] => {
  if (partyChat.partyStatus === 'ended') {
    return [];
  }

  const actions: TaxiChatActionTrayActionViewData[] = [
    {
      id: 'callTaxi',
      label: '택시 호출',
      tone: 'info',
    },
    {
      id: 'sendAccount',
      label: '계좌 전송',
      tone: 'brand',
    },
  ];

  if (!management.isLeader) {
    return actions;
  }

  const hasSettlementTarget = partyChat.participants.some(
    participant => !participant.isLeader,
  );

  if (
    hasSettlementTarget &&
    (partyChat.partyStatus === 'open' || partyChat.partyStatus === 'closed')
  ) {
    actions.push({
      id: 'pasteAccount',
      label: '계좌 불러오기',
      tone: 'info',
    });
  }

  if (partyChat.partyStatus === 'open') {
    actions.push({
      id: 'close',
      label: '모집 마감',
      tone: 'warning',
    });
    actions.push({
      id: 'arrive',
      label: '택시 도착',
      tone: 'brand',
    });
    return actions;
  }

  if (partyChat.partyStatus === 'closed') {
    if (partyChat.memberCount < partyChat.maxMembers) {
      actions.push({
        id: 'reopen',
        label: '모집 재개',
        tone: 'info',
      });
    }
    actions.push({
      id: 'arrive',
      label: '택시 도착',
      tone: 'brand',
    });
    return actions;
  }

  if (partyChat.partyStatus === 'arrived') {
    actions.push({
      id: 'settlementStatus',
      label: '정산 현황',
      tone: 'purple',
    });
    actions.push({
      id: 'end',
      label: '파티 종료',
      tone: 'danger',
    });
  }

  return actions;
};

const buildSettlementNotice = (
  partyChat: TaxiChatSourceData,
  currentUserId: string,
): TaxiChatSettlementNoticeViewData | undefined => {
  if (!partyChat.settlement) {
    return undefined;
  }

  const settlementTargetIds =
    partyChat.settlement.settlementTargetMemberIds.length > 0
      ? partyChat.settlement.settlementTargetMemberIds
      : partyChat.participants
          .filter(participant => !participant.isLeader)
          .map(participant => participant.id);
  const members =
    partyChat.settlement.members && partyChat.settlement.members.length > 0
      ? partyChat.settlement.members
          .filter(member => settlementTargetIds.includes(member.id))
          .map(member => ({
            id: member.id,
            isCurrentUser: member.id === currentUserId,
            isLeader: false,
            label: member.label,
            leftAt: member.leftAt,
            leftParty: member.leftParty,
            settled: member.settled,
          }))
      : partyChat.participants
          .filter(participant => settlementTargetIds.includes(participant.id))
          .map(participant => ({
            id: participant.id,
            isCurrentUser: participant.id === currentUserId,
            isLeader: participant.isLeader,
            label: participant.name,
            settled: participant.settled,
          }));
  const completedCount = members.filter(member => member.settled).length;
  const totalCount = members.length;
  const isCompleted =
    partyChat.settlement.status === 'completed' ||
    (totalCount > 0 && completedCount === totalCount);
  const accountData =
    partyChat.settlement.accountData ?? partyChat.latestAccountData;

  return {
    accountData,
    accountLabel: formatAccountLabel(accountData),
    completedCount,
    description: isCompleted
      ? '모든 정산이 완료됐어요!'
      : '계좌로 입금된 멤버를 정산완료 처리하세요',
    members,
    perPersonAmount:
      partyChat.settlement.perPersonAmount > 0
        ? partyChat.settlement.perPersonAmount
        : undefined,
    splitMemberCount: partyChat.settlement.splitMemberCount,
    statusLabel: isCompleted ? '완료' : '진행 중',
    summaryLabel: `${completedCount}/${totalCount}명 완료`,
    taxiFare: partyChat.settlement.taxiFare,
    totalCount,
  };
};

const buildItems = (
  partyChat: TaxiChatSourceData,
  currentUserId: string,
): TaxiChatThreadItemViewData[] => {
  const items: TaxiChatThreadItemViewData[] = [];
  let previousDateKey: string | null = null;

  partyChat.messages.forEach(message => {
    const createdDate = new Date(message.createdAt);
    const dateKey = format(createdDate, 'yyyy-MM-dd');

    if (dateKey !== previousDateKey) {
      items.push({
        id: `${partyChat.id}-${dateKey}`,
        label: format(createdDate, 'yyyy년 M월 d일 EEEE', {locale: ko}),
        type: 'date-divider',
      });
      previousDateKey = dateKey;
    }

    if (message.type === 'system') {
      items.push({
        id: message.id,
        text: message.text,
        type: 'system-message',
      });
      return;
    }

    if (message.type === 'account' && message.accountData) {
      items.push({
        accountData: message.accountData,
        avatar:
          message.avatar ??
          buildMessageAvatar({
            currentUserId,
            partyChat,
            senderId: message.senderId,
          }),
        direction: message.senderId === currentUserId ? 'outgoing' : 'incoming',
        createdAt: message.createdAt,
        id: message.id,
        senderName: message.senderName,
        text: message.text,
        timeLabel: format(createdDate, 'a hh:mm', {locale: ko}),
        type: 'account-message',
      });
      return;
    }

    if (message.type === 'arrived') {
      const accountData =
        message.arrivalData?.accountData ?? partyChat.settlement?.accountData;
      const splitMemberIds =
        message.arrivalData?.settlementTargetMemberIds ?? [];
      const splitMembers = partyChat.participants.filter(participant =>
        splitMemberIds.includes(participant.id),
      );
      const splitMemberCount =
        message.arrivalData?.splitMemberCount ??
        (splitMembers.length > 0 ? splitMembers.length : undefined);
      const splitMemberSummaryLabel =
        splitMembers.length > 0
          ? `${splitMembers
              .map(participant =>
                participant.id === currentUserId ? '나' : participant.name,
              )
              .join(', ')} (${splitMemberCount ?? splitMembers.length}명)`
          : undefined;

      items.push({
        accountData,
        accountLabel: formatAccountLabel(accountData),
        id: message.id,
        perPersonAmount: message.arrivalData?.perPersonAmount,
        splitMemberSummaryLabel,
        settlementTargetMemberIds: splitMemberIds,
        splitMemberCount,
        taxiFare: message.arrivalData?.taxiFare,
        timeLabel: format(createdDate, 'a hh:mm', {locale: ko}),
        type: 'arrived-message',
      });
      return;
    }

    if (message.type === 'end') {
      items.push({
        id: message.id,
        text: message.text,
        type: 'end-message',
      });
      return;
    }

    items.push({
      avatar:
        message.avatar ??
        buildMessageAvatar({
          currentUserId,
          partyChat,
          senderId: message.senderId,
        }),
      direction: message.senderId === currentUserId ? 'outgoing' : 'incoming',
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      id: message.id,
      imageUrl:
        !message.isDeleted && message.type === 'image'
          ? message.imageUrl
          : undefined,
      isDeleted: message.isDeleted,
      messageKind:
        !message.isDeleted && message.type === 'image' ? 'image' : 'text',
      minuteKey: format(createdDate, 'yyyy-MM-dd HH:mm'),
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text,
      timeLabel: format(createdDate, 'a hh:mm', {locale: ko}),
      type: 'text-message',
    });
  });

  return items;
};

export const buildTaxiChatViewData = ({
  currentUserId = TAXI_CHAT_CURRENT_USER_ID,
  partyChat,
}: {
  currentUserId?: string;
  partyChat: TaxiChatSourceData;
}): TaxiChatViewData => {
  const management = buildManagement(partyChat, currentUserId);
  const settlementNotice = buildSettlementNotice(partyChat, currentUserId);
  const members = buildSummaryMembers(partyChat, currentUserId);

  return {
    actionTrayActions: buildActionTrayActions(partyChat, management),
    composerPlaceholder: partyChat.composerPlaceholder,
    currentUserId,
    header: buildHeader(partyChat),
    items: buildItems(partyChat, currentUserId),
    menu: {
      canCancelParty: management.canCancelParty,
      canEditParty: management.canEditParty,
      canLeave: management.canLeave,
      isLeader: management.isLeader,
      leaveLabel: '파티 나가기',
      notificationEnabled: partyChat.notificationEnabled,
    },
    roomId: partyChat.id,
    summary: {
      currentMemberCount: partyChat.memberCount,
      departureLabel: partyChat.departureLocation.name,
      departureLocation: partyChat.departureLocation,
      departureTimeISO: partyChat.departureTimeISO,
      departureTimeLabel: formatTaxiChatDepartureTime(
        partyChat.departureTimeISO,
      ),
      detail: partyChat.detail,
      destinationLabel: partyChat.destinationLocation.name,
      destinationLocation: partyChat.destinationLocation,
      estimatedFareLabel: partyChat.estimatedFareLabel,
      management,
      memberSummaryLabel: `${partyChat.memberCount}/${partyChat.maxMembers}명`,
      maxMemberCount: partyChat.maxMembers,
      members,
      partyStatus: partyChat.partyStatus,
      settlementNotice,
      tags: partyChat.tags,
    },
  };
};
