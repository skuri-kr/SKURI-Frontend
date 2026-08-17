import type {
  ChatMessage,
  ChatMessageDraft,
  ChatRoomCreateDraft,
  ChatRoom,
} from '../../model/types';
import type {
  ChatMessageResponseDto,
  ChatRoomDetailResponseDto,
  ChatRoomLastMessageResponseDto,
  ChatRoomSummaryEventResponseDto,
  ChatRoomSummaryResponseDto,
  ChatRoomTypeDto,
  CreateChatRoomRequestDto,
  SendChatMessageRequestDto,
} from '../dto/chatDto';

const CHAT_ROOM_TYPE_MAP: Record<ChatRoomTypeDto, ChatRoom['type']> = {
  CUSTOM: 'custom',
  DEPARTMENT: 'department',
  GAME: 'game',
  PARTY: 'party',
  UNIVERSITY: 'university',
};

const CHAT_MESSAGE_TYPE_MAP = {
  ACCOUNT: 'account',
  ARRIVED: 'arrived',
  END: 'end',
  IMAGE: 'image',
  SYSTEM: 'system',
  TEXT: 'text',
} as const;

const resolveRoomType = (type: ChatRoomTypeDto): ChatRoom['type'] =>
  CHAT_ROOM_TYPE_MAP[type] ?? 'custom';

const resolveMessageType = (
  type?: keyof typeof CHAT_MESSAGE_TYPE_MAP | null,
): ChatMessage['type'] => {
  if (!type) {
    return 'text';
  }

  return CHAT_MESSAGE_TYPE_MAP[type] ?? 'text';
};

const resolveMessageText = (
  message: Pick<ChatMessageResponseDto, 'imageUrl' | 'text' | 'type'>,
) => {
  if (message.type === 'IMAGE') {
    return message.text ?? message.imageUrl ?? '이미지를 보냈어요.';
  }

  return message.text ?? '';
};

export const mapChatRoomLastMessageDto = (
  lastMessage?: ChatRoomLastMessageResponseDto | null,
): ChatRoom['lastMessage'] | undefined => {
  if (!lastMessage) {
    return undefined;
  }

  return {
    createdAt: lastMessage.createdAt ?? undefined,
    senderName: lastMessage.senderName ?? undefined,
    text: lastMessage.text ?? undefined,
    type: resolveMessageType(lastMessage.type),
  };
};

export const mapChatRoomSummaryDto = (
  room: ChatRoomSummaryResponseDto,
): ChatRoom => ({
  description: room.description ?? undefined,
  id: room.id,
  isJoined: room.joined,
  isMuted: room.isMuted,
  isPublic: room.isPublic,
  lastMessage: mapChatRoomLastMessageDto(room.lastMessage),
  memberCount: room.memberCount,
  name: room.name,
  type: resolveRoomType(room.type),
  unreadCount: room.unreadCount,
  updatedAt: room.lastMessageAt ?? room.lastMessage?.createdAt ?? undefined,
});

export const mapChatRoomDetailDto = (
  room: ChatRoomDetailResponseDto,
  existing?: ChatRoom | null,
): ChatRoom => ({
  ...existing,
  description: room.description ?? undefined,
  id: room.id,
  isJoined: room.joined,
  isMuted: room.isMuted,
  isPublic: room.isPublic,
  lastMessage:
    mapChatRoomLastMessageDto(room.lastMessage) ?? existing?.lastMessage,
  lastReadAt: room.lastReadAt ?? undefined,
  memberCount: room.memberCount,
  name: room.name,
  type: resolveRoomType(room.type),
  unreadCount: room.unreadCount,
  updatedAt:
    room.lastMessageAt ?? room.lastMessage?.createdAt ?? existing?.updatedAt,
});

export const mergeChatRoomSummaryEvent = (
  room: ChatRoom,
  event: ChatRoomSummaryEventResponseDto,
): ChatRoom => ({
  ...room,
  id: event.chatRoomId,
  isJoined: true,
  lastMessage: mapChatRoomLastMessageDto(event.lastMessage),
  memberCount: event.memberCount,
  name: event.name,
  unreadCount: event.unreadCount,
  updatedAt: event.updatedAt ?? event.lastMessage?.createdAt ?? room.updatedAt,
});

export const mapChatRoomCreateDraftToDto = (
  chatRoom: ChatRoomCreateDraft,
): CreateChatRoomRequestDto => ({
  description: chatRoom.description?.trim() || null,
  name: chatRoom.name.trim(),
});

export const mapChatMessageDto = (
  message: ChatMessageResponseDto,
): ChatMessage => ({
  createdAt: message.createdAt,
  deletedAt: message.deletedAt ?? undefined,
  editedAt: message.editedAt ?? undefined,
  id: message.id,
  imageUrl: message.imageUrl ?? undefined,
  isDeleted: message.isDeleted,
  senderId: message.senderId ?? 'system',
  senderName: message.senderName ?? '안내',
  senderPhotoUrl: message.senderPhotoUrl ?? undefined,
  text: resolveMessageText(message),
  type: resolveMessageType(message.type),
  updatedAt: message.updatedAt ?? undefined,
});

export const mapChatMessageDraftToDto = (
  message: ChatMessageDraft,
): SendChatMessageRequestDto => {
  switch (message.type) {
    case 'image':
      return {
        imageUrl: message.imageUrl ?? null,
        text: message.text ?? null,
        type: 'IMAGE',
      };
    case 'text':
    default:
      return {
        text: message.text ?? null,
        type: 'TEXT',
      };
  }
};
