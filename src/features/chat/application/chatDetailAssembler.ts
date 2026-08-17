import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

import {COLORS} from '@/shared/design-system/tokens';
import type {
  ChatThreadHeaderViewData,
  ChatThreadItemViewData,
} from '@/shared/ui/chat';

import type {ChatDetailViewData} from '../model/chatDetailViewData';
import type {ChatMessage, ChatRoom} from '../model/types';

const buildHeader = (room: ChatRoom): ChatThreadHeaderViewData => {
  if (room.type === 'university') {
    return {
      iconBackgroundColor: COLORS.brand.primarySoft,
      iconColor: COLORS.brand.primary,
      iconName: 'business-outline',
      subtitle: `${room.memberCount.toLocaleString('ko-KR')}명`,
      title: room.name,
    };
  }

  if (room.type === 'department') {
    return {
      iconBackgroundColor: COLORS.accent.blueSoft,
      iconColor: COLORS.accent.blue,
      iconName: 'people-outline',
      subtitle: `${room.memberCount.toLocaleString('ko-KR')}명`,
      title: room.name,
    };
  }

  if (room.type === 'game') {
    return {
      iconBackgroundColor: COLORS.accent.orangeSoft,
      iconColor: COLORS.accent.orange,
      iconName: 'game-controller-outline',
      subtitle: `${room.memberCount.toLocaleString('ko-KR')}명`,
      title: room.name,
    };
  }

  return {
    iconBackgroundColor: COLORS.accent.purpleSoft,
    iconColor: COLORS.accent.purple,
    iconName: 'chatbubble-outline',
    subtitle: `${room.memberCount.toLocaleString('ko-KR')}명`,
    title: room.name,
  };
};

const buildItems = (
  messages: ChatMessage[],
  currentUserId: string,
  roomId: string,
): ChatThreadItemViewData[] => {
  const items: ChatThreadItemViewData[] = [];
  let previousDateKey: string | null = null;

  messages.forEach(message => {
    const createdDate = new Date(String(message.createdAt));
    const createdAtMillis = createdDate.getTime();

    if (Number.isNaN(createdAtMillis)) {
      return;
    }

    const dateKey = format(createdDate, 'yyyy-MM-dd');

    if (dateKey !== previousDateKey) {
      items.push({
        id: `${roomId}-${dateKey}`,
        label: format(createdDate, 'yyyy년 M월 d일 EEEE', {locale: ko}),
        type: 'date-divider',
      });
      previousDateKey = dateKey;
    }

    const avatar =
      message.senderId === currentUserId
        ? undefined
        : message.senderPhotoUrl
        ? {
            backgroundColor: COLORS.border.default,
            kind: 'image' as const,
            uri: message.senderPhotoUrl,
          }
        : {
            backgroundColor: COLORS.border.default,
            iconColor: COLORS.text.muted,
            iconName: 'person-outline' as const,
            kind: 'icon' as const,
          };

    items.push({
      ...(message.type === 'system'
        ? {
            id: message.id ?? `${roomId}-${createdDate.toISOString()}`,
            text: message.text,
            type: 'system-message' as const,
          }
        : {
            avatar,
            createdAt: message.createdAt,
            direction:
              message.senderId === currentUserId ? 'outgoing' : 'incoming',
            editedAt: message.editedAt,
            id: message.id ?? `${roomId}-${createdDate.toISOString()}`,
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
            type: 'text-message' as const,
          }),
    });
  });

  return items;
};

const formatRoomActivityLabel = (timestamp: unknown) => {
  const millis = new Date(String(timestamp)).getTime();

  if (!millis) {
    return '최근 메시지 없음';
  }

  return format(new Date(millis), 'M월 d일 a h:mm', {locale: ko});
};

const formatPreviewLastMessageText = (room: ChatRoom) => {
  if (room.lastMessage?.type === 'image') {
    return '사진을 보냈어요.';
  }

  return room.lastMessage?.text?.trim() || '아직 메시지가 없어요.';
};

export const buildChatDetailViewData = ({
  currentUserId,
  messages,
  room,
}: {
  currentUserId: string;
  messages: ChatMessage[];
  room: ChatRoom;
}): ChatDetailViewData => {
  if (room.isJoined !== true) {
    return {
      composerPlaceholder: '참여 후 메시지를 보낼 수 있어요',
      currentUserId,
      header: buildHeader(room),
      items: [],
      menu: {
        canReport: true,
        canToggleNotification: false,
        leaveLabel: '채팅방 나가기',
        notificationEnabled: false,
      },
      mode: 'preview',
      preview: {
        description: room.description?.trim() || '채팅방 소개가 아직 없어요.',
        helperText:
          '참여하기를 누르면 지난 메시지 이력과 실시간 요약을 바로 받을 수 있어요.',
        joinLabel: '참여하기',
        lastMessageText: formatPreviewLastMessageText(room),
        memberCountLabel: `${room.memberCount.toLocaleString(
          'ko-KR',
        )}명 참여 중`,
        statusLabel: '미참여 공개 채팅방',
        timeLabel: formatRoomActivityLabel(
          room.lastMessage?.createdAt ?? room.updatedAt,
        ),
      },
      roomId: room.id ?? room.name,
    };
  }

  return {
    composerPlaceholder: '메시지를 입력하세요',
    currentUserId,
    header: buildHeader(room),
    items: buildItems(messages, currentUserId, room.id ?? room.name),
    menu: {
      canLeave: true,
      canReport: true,
      canToggleNotification: true,
      leaveLabel: '채팅방 나가기',
      notificationEnabled: room.isMuted !== true,
    },
    mode: 'joined',
    roomId: room.id ?? room.name,
  };
};
