export type { IChatRepository } from './data/repositories/IChatRepository';

export { useChatActions } from './hooks/useChatActions';
export type { UseChatActionsResult } from './hooks/useChatActions';
export { useChatMessages } from './hooks/useChatMessages';
export type { UseChatMessagesResult } from './hooks/useChatMessages';
export { useChatRepository } from './hooks/useChatRepository';
export { useChatRoom, useChatRoomLastRead } from './hooks/useChatRoom';
export type {
  UseChatRoomLastReadResult,
  UseChatRoomResult,
} from './hooks/useChatRoom';
export { useChatRoomNotifications } from './hooks/useChatRoomNotifications';
export type {
  UseChatRoomNotificationsResult,
} from './hooks/useChatRoomNotifications';
export { useChatRoomStates } from './hooks/useChatRoomStates';
export type { UseChatRoomStatesResult } from './hooks/useChatRoomStates';
export { useChatRooms } from './hooks/useChatRooms';
export { useCommunityTabUnreadIndicator } from './hooks/useCommunityTabUnreadIndicator';

export type {
  ChatMessage,
  ChatMessageDraft,
  ChatRoomCreateDraft,
  ChatRoom,
  ChatRoomCategory,
  ChatRoomFilter,
  ChatRoomListItem,
  ChatRoomNotificationPayload,
  ChatRoomServerInfo,
  ChatRoomState,
  ChatRoomStatesMap,
  MessageSubscription,
  MessageSubscriptionCallbacks,
  PaginatedResult,
} from './model/types';
export type { ChatStackParamList } from './model/navigation';

export { ChatDetailScreen } from './screens/ChatDetailScreen';

export {
  buildChatRoomForegroundNotification,
  formatTimeAgo,
  getChatRoomDisplayName,
  getChatRoomIcon,
  resolveChatRoomForegroundNotification,
  sendChatTextMessage,
} from './services/chatRoomService';
export {
  getParticipatingChatRooms,
  hasUnreadChatRoom,
  hasUnreadChatRooms,
  safeToMillis,
} from './services/unreadStateService';
