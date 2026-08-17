export type ChatRoomTypeDto =
  | 'UNIVERSITY'
  | 'DEPARTMENT'
  | 'GAME'
  | 'CUSTOM'
  | 'PARTY';

export type ChatMessageTypeDto =
  | 'TEXT'
  | 'IMAGE'
  | 'SYSTEM'
  | 'ACCOUNT'
  | 'ARRIVED'
  | 'END';

export interface ChatRoomLastMessageResponseDto {
  createdAt?: string | null;
  senderName?: string | null;
  text?: string | null;
  type?: ChatMessageTypeDto | null;
}

export interface ChatRoomSummaryResponseDto {
  description?: string | null;
  id: string;
  isMuted: boolean;
  isPublic: boolean;
  lastMessage?: ChatRoomLastMessageResponseDto | null;
  lastMessageAt?: string | null;
  joined: boolean;
  memberCount: number;
  name: string;
  type: ChatRoomTypeDto;
  unreadCount: number;
}

export interface ChatRoomDetailResponseDto {
  description?: string | null;
  id: string;
  isMuted: boolean;
  isPublic: boolean;
  lastMessage?: ChatRoomLastMessageResponseDto | null;
  lastMessageAt?: string | null;
  joined: boolean;
  lastReadAt?: string | null;
  memberCount: number;
  name: string;
  type: ChatRoomTypeDto;
  unreadCount: number;
}

export interface CreateChatRoomRequestDto {
  description?: string | null;
  name: string;
}

export interface ChatMessageResponseDto {
  accountData?: {
    accountHolder: string;
    accountNumber: string;
    bankName: string;
    hideName?: boolean | null;
  } | null;
  arrivalData?: {
    accountData?: {
      accountHolder: string;
      accountNumber: string;
      bankName: string;
      hideName?: boolean | null;
    } | null;
    perPersonAmount?: number | null;
    settlementTargetMemberIds?: string[] | null;
    splitMemberCount?: number | null;
    taxiFare?: number | null;
  } | null;
  chatRoomId: string;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  id: string;
  imageUrl?: string | null;
  isDeleted: boolean;
  senderId?: string | null;
  senderName?: string | null;
  senderPhotoUrl?: string | null;
  text?: string | null;
  type: ChatMessageTypeDto;
  updatedAt?: string | null;
}

export interface UpdateChatMessageRequestDto {
  text: string;
}

export interface ChatMessageMutationEventResponseDto {
  eventType: 'MESSAGE_UPDATED' | 'MESSAGE_DELETED';
  message: ChatMessageResponseDto;
}

export interface ChatMessageCursorResponseDto {
  createdAt: string;
  id: string;
}

export interface ChatMessagePageResponseDto {
  hasNext: boolean;
  messages: ChatMessageResponseDto[];
  nextCursor?: ChatMessageCursorResponseDto | null;
}

export interface ChatReadUpdateRequestDto {
  lastReadAt: string;
}

export interface ChatReadUpdateResponseDto {
  chatRoomId: string;
  lastReadAt: string;
  updated: boolean;
}

export interface ChatRoomSettingsRequestDto {
  muted: boolean;
}

export interface ChatRoomSettingsResponseDto {
  chatRoomId: string;
  muted: boolean;
}

export interface SendChatMessageRequestDto {
  imageUrl?: string | null;
  text?: string | null;
  type: Extract<ChatMessageTypeDto, 'TEXT' | 'IMAGE'>;
}

export interface ChatRoomSummaryEventResponseDto {
  chatRoomId: string;
  eventType: 'CHAT_ROOM_SNAPSHOT' | 'CHAT_ROOM_UPSERT' | 'CHAT_ROOM_REMOVED';
  lastMessage?: ChatRoomLastMessageResponseDto | null;
  memberCount: number;
  name: string;
  unreadCount: number;
  updatedAt?: string | null;
}

export interface StompApiErrorDto {
  errorCode?: string;
  message?: string;
  success?: boolean;
}
