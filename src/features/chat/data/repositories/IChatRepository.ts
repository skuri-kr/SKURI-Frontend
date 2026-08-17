import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';

import type {
  ChatImageUploadInput,
  ChatMessage,
  ChatMessageDraft,
  ChatRoomCreateDraft,
  ChatRoom,
  ChatRoomFilter,
  ChatRoomStatesMap,
  MessageSubscriptionCallbacks,
  PaginatedResult,
} from '../../model/types';

export interface IChatRepository {
  subscribeToChatRooms(
    userId: string,
    callbacks: SubscriptionCallbacks<ChatRoom[]>,
  ): Unsubscribe;

  subscribeToChatRoomsByCategory(
    filter: ChatRoomFilter,
    callbacks: SubscriptionCallbacks<ChatRoom[]>,
  ): Unsubscribe;

  subscribeToChatRoom(
    chatRoomId: string,
    callbacks: SubscriptionCallbacks<ChatRoom | null>,
  ): Unsubscribe;

  getChatRoom(chatRoomId: string): Promise<ChatRoom | null>;

  createChatRoom(chatRoom: ChatRoomCreateDraft): Promise<ChatRoom>;

  joinChatRoom(chatRoomId: string, userId: string): Promise<ChatRoom | null>;

  leaveChatRoom(chatRoomId: string, userId: string): Promise<ChatRoom | null>;

  getInitialMessages(
    chatRoomId: string,
    limit: number,
  ): Promise<PaginatedResult<ChatMessage>>;

  getOlderMessages(
    chatRoomId: string,
    cursor: unknown,
    limit: number,
  ): Promise<PaginatedResult<ChatMessage>>;

  subscribeToNewMessages(
    chatRoomId: string,
    afterTimestamp: unknown,
    callbacks: MessageSubscriptionCallbacks,
  ): Unsubscribe;

  sendMessage(chatRoomId: string, message: ChatMessageDraft): Promise<void>;

  updateMessage(
    chatRoomId: string,
    messageId: string,
    text: string,
  ): Promise<ChatMessage>;

  deleteMessage(chatRoomId: string, messageId: string): Promise<ChatMessage>;

  uploadImage(image: ChatImageUploadInput): Promise<string>;

  getNotificationSetting(chatRoomId: string, userId: string): Promise<boolean>;

  updateNotificationSetting(
    chatRoomId: string,
    userId: string,
    enabled: boolean,
  ): Promise<void>;

  subscribeToChatRoomStates(
    userId: string,
    callbacks: SubscriptionCallbacks<ChatRoomStatesMap>,
  ): Unsubscribe;

  subscribeToChatRoomNotifications(
    userId: string,
    callbacks: SubscriptionCallbacks<Record<string, boolean>>,
  ): Unsubscribe;

  updateLastReadAt(userId: string, chatRoomId: string): Promise<void>;
}
