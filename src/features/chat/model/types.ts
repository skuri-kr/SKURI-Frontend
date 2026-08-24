export type ChatRoomType =
  | 'university'
  | 'department'
  | 'game'
  | 'custom'
  | 'party';

export type ChatMessageType =
  | 'text'
  | 'image'
  | 'system'
  | 'account'
  | 'arrived'
  | 'end';

export interface ChatRoom {
  id?: string;
  name: string;
  type: ChatRoomType;
  department?: string;
  description?: string;
  createdBy?: string;
  memberCount: number;
  members?: string[];
  maxMembers?: number;
  isPublic: boolean;
  isJoined?: boolean;
  isMuted?: boolean;
  createdAt?: unknown;
  lastReadAt?: unknown;
  updatedAt?: unknown;
  lastMessage?: {
    createdAt?: unknown;
    senderName?: string;
    text?: string;
    type?: ChatMessageType;
  };
  unreadCount?: number;
}

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  type?: ChatMessageType;
  createdAt?: unknown;
  deletedAt?: unknown;
  editedAt?: unknown;
  isDeleted?: boolean;
  clientCreatedAt?: unknown;
  imageUrl?: string;
  readBy?: string[];
  direction?: 'mc_to_app' | 'app_to_mc' | 'system';
  source?: 'minecraft' | 'app';
  minecraftUuid?: string | null;
  appUserDisplayName?: string | null;
  updatedAt?: unknown;
}

export interface ChatMessageDraft {
  imageUrl?: string;
  text?: string;
  type: Extract<ChatMessageType, 'text' | 'image'>;
}

export interface ChatImageUploadInput {
  fileName?: string;
  mimeType?: string;
  uri: string;
}

export interface ChatRoomCreateDraft {
  description?: string;
  name: string;
}

export type ChatRoomCategory =
  | 'all'
  | 'university'
  | 'department'
  | 'game'
  | 'custom';

export interface ChatRoomFilter {
  category: ChatRoomCategory;
  joinedOnly?: boolean;
  userId?: string;
  department?: string;
}

export type {PaginatedResult} from '@/shared/types/pagination';

export interface MessageSubscriptionCallbacks {
  onNewMessages: (messages: ChatMessage[]) => void;
  onMessageMutation: (message: ChatMessage) => void;
  onError: (error: Error) => void;
  onRealtimeReady?: () => void;
}

export interface MessageSubscription {
  ready: Promise<void>;
  unsubscribe: () => void;
}

export interface ChatRoomState {
  lastReadAt?: unknown;
}

export type ChatRoomStatesMap = Record<string, ChatRoomState>;

export interface ChatRoomListItem extends ChatRoom {
  displayName?: string;
  notificationEnabled?: boolean;
}

export interface ChatRoomNotificationPayload {
  title: string;
  body: string;
  chatRoomId: string;
}

export interface ChatRoomServerInfo {
  currentPlayers: number | null;
  maxPlayers: number | null;
  online: boolean | null;
  serverUrl: string | null;
  version: string | null;
}
