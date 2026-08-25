import {getNotificationNavigationIntent} from '@/app/notifications/services/notificationRouter';
import type {NotificationPayload} from '@/app/notifications/model/notificationPayload';
import type {NotificationNavigationIntent} from '@/app/notifications/model/notificationNavigationIntent';
import {parsePushNotificationPayload} from '@/app/notifications/services/notificationPayloadParser';
import {handlePushNotificationNavigation} from '@/app/navigation/services/notificationNavigation';
import type {FirebaseMessagingTypes} from '@/shared/lib/firebase/messaging';
import {
  getInitialNotificationMessage,
  registerBackgroundMessageHandler,
  subscribeForegroundMessages,
  subscribeNotificationOpenedApp,
} from '@/shared/lib/firebase/messaging';

type PartyJoinRequestPayload = Extract<
  NotificationPayload,
  {type: 'PARTY_JOIN_REQUEST'}
>;

export interface ForegroundNotificationDescriptor {
  body: string;
  intent?: NotificationNavigationIntent | null;
  title: string;
}

export interface ForegroundMessageCallbacks {
  getCurrentChatRoomId?: () => string | undefined;
  getCurrentScreen?: () => string | undefined;
  onCommunityChatForegroundNotification?: (data: {
    chatRoomId: string;
    intent?: NotificationNavigationIntent | null;
    messageText: string;
    senderName: string;
  }) => Promise<void>;
  onForegroundNotification?: (
    notification: ForegroundNotificationDescriptor,
  ) => void;
  onJoinRequestAccepted?: (partyId: string) => void;
  onJoinRequestReceived?: (payload: PartyJoinRequestPayload) => void;
}

const getPartyIdFromChatRoomId = (chatRoomId: string) => {
  if (!chatRoomId.startsWith('party:')) {
    return null;
  }

  const partyId = chatRoomId.slice('party:'.length);
  return partyId.length > 0 ? partyId : null;
};

const getNotificationText = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  fallbackTitle: string,
  fallbackBody: string,
) => ({
  body:
    typeof remoteMessage.notification?.body === 'string'
      ? remoteMessage.notification.body
      : fallbackBody,
  title:
    typeof remoteMessage.notification?.title === 'string'
      ? remoteMessage.notification.title
      : fallbackTitle,
});

const buildForegroundDescriptor = (
  payload: Exclude<
    NotificationPayload,
    {type: 'CHAT_MESSAGE' | 'PARTY_JOIN_ACCEPTED'}
  >,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): ForegroundNotificationDescriptor => {
  const intent = getNotificationNavigationIntent(payload);

  switch (payload.type) {
    case 'PARTY_CREATED':
      return {
        ...getNotificationText(
          remoteMessage,
          '새 택시 파티',
          '새 택시 파티가 생성되었어요.',
        ),
        intent,
      };
    case 'PARTY_JOIN_DECLINED':
      return {
        ...getNotificationText(
          remoteMessage,
          '동승 요청이 거절되었어요',
          '다른 택시 파티를 찾아보세요.',
        ),
        intent,
      };
    case 'PARTY_JOIN_REQUEST':
      return {
        ...getNotificationText(
          remoteMessage,
          '새 동승 요청이 도착했어요',
          '채팅방에서 동승 요청을 확인해보세요.',
        ),
        intent,
      };
    case 'PARTY_CLOSED':
    case 'PARTY_REOPENED':
    case 'PARTY_ARRIVED':
    case 'PARTY_ENDED':
    case 'MEMBER_KICKED':
    case 'SETTLEMENT_COMPLETED':
      return {
        ...getNotificationText(
          remoteMessage,
          '택시 파티 알림',
          '파티 상태가 변경되었어요.',
        ),
        intent,
      };
    case 'FRIEND_REQUEST':
      return {
        ...getNotificationText(
          remoteMessage,
          '친구 요청이 도착했어요',
          '친구 요청을 확인해보세요.',
        ),
        intent,
      };
    case 'FRIEND_ACCEPTED':
      return {
        ...getNotificationText(
          remoteMessage,
          '친구가 되었어요',
          '새 친구의 프로필을 확인해보세요.',
        ),
        intent,
      };
    case 'FRIEND_DECLINED':
      return {
        ...getNotificationText(
          remoteMessage,
          '친구 요청이 거절되었어요',
          '친구 요청 상태를 확인해보세요.',
        ),
        intent,
      };
    case 'PARTY_INVITATION':
    case 'CHAT_ROOM_INVITATION':
      return {
        ...getNotificationText(
          remoteMessage,
          '친구 초대가 도착했어요',
          '친구 허브의 초대 탭에서 확인해보세요.',
        ),
        intent,
      };
    case 'POST_LIKED':
    case 'COMMENT_CREATED':
      return {
        ...getNotificationText(
          remoteMessage,
          '커뮤니티 알림',
          '새 알림이 도착했어요.',
        ),
        intent,
      };
    case 'NOTICE':
      return {
        ...getNotificationText(
          remoteMessage,
          '새 공지사항',
          '공지사항을 확인해보세요.',
        ),
        intent,
      };
    case 'APP_NOTICE':
      return {
        ...getNotificationText(
          remoteMessage,
          '새 앱 공지',
          '앱 공지사항이 도착했어요.',
        ),
        intent,
      };
    case 'ACADEMIC_SCHEDULE':
      return {
        ...getNotificationText(
          remoteMessage,
          '학사 일정 알림',
          '새 학사 일정을 확인해보세요.',
        ),
        intent,
      };
    default:
      return {
        ...getNotificationText(remoteMessage, '알림', '새 알림이 도착했어요.'),
        intent,
      };
  }
};

const handleCommunityChatMessage = async (
  payload: Extract<NotificationPayload, {type: 'CHAT_MESSAGE'}>,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  callbacks: ForegroundMessageCallbacks,
) => {
  if (!callbacks.onCommunityChatForegroundNotification) {
    return;
  }

  const currentScreen = callbacks.getCurrentScreen?.();
  if (currentScreen === 'ChatDetail') {
    const currentChatRoomId = callbacks.getCurrentChatRoomId?.();
    if (currentChatRoomId === payload.chatRoomId) {
      return;
    }
  }

  const rawBody =
    typeof remoteMessage.notification?.body === 'string'
      ? remoteMessage.notification.body
      : '';
  const parts = rawBody.split(': ');
  const senderName = parts.length > 1 ? parts[0] : '익명';
  const messageText = parts.length > 1 ? parts.slice(1).join(': ') : rawBody;

  await callbacks.onCommunityChatForegroundNotification({
    chatRoomId: payload.chatRoomId,
    intent: getNotificationNavigationIntent(payload),
    messageText,
    senderName,
  });
};

const handleChatMessage = async (
  payload: Extract<NotificationPayload, {type: 'CHAT_MESSAGE'}>,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  callbacks: ForegroundMessageCallbacks,
) => {
  const taxiPartyId = getPartyIdFromChatRoomId(payload.chatRoomId);

  if (taxiPartyId) {
    if (callbacks.getCurrentScreen?.() === 'Chat') {
      return;
    }

    callbacks.onForegroundNotification?.({
      ...getNotificationText(
        remoteMessage,
        '택시 채팅',
        '새 채팅 메시지가 도착했습니다.',
      ),
      intent: getNotificationNavigationIntent(payload),
    });
    return;
  }

  await handleCommunityChatMessage(payload, remoteMessage, callbacks);
};

export function initForegroundMessageHandler(
  callbacks: ForegroundMessageCallbacks,
) {
  return subscribeForegroundMessages(async remoteMessage => {
    const payload = parsePushNotificationPayload(remoteMessage.data || {});

    if (!payload) {
      return;
    }

    switch (payload.type) {
      case 'PARTY_JOIN_REQUEST':
        callbacks.onJoinRequestReceived?.(payload);
        callbacks.onForegroundNotification?.(
          buildForegroundDescriptor(payload, remoteMessage),
        );
        break;
      case 'PARTY_JOIN_ACCEPTED':
        callbacks.onJoinRequestAccepted?.(payload.partyId);
        break;
      case 'CHAT_MESSAGE':
        await handleChatMessage(payload, remoteMessage, callbacks);
        break;
      default:
        callbacks.onForegroundNotification?.(
          buildForegroundDescriptor(payload, remoteMessage),
        );
        break;
    }
  });
}

export function initBackgroundMessageHandler({
  onJoinRequestReceived,
}: {
  onJoinRequestReceived?: (payload: PartyJoinRequestPayload) => void;
} = {}) {
  registerBackgroundMessageHandler(async remoteMessage => {
    const payload = parsePushNotificationPayload(remoteMessage.data || {});

    if (payload?.type === 'PARTY_JOIN_REQUEST') {
      onJoinRequestReceived?.(payload);
    }
  });
}

export function initNotificationOpenedAppHandler({
  onJoinRequestReceived,
}: {
  onJoinRequestReceived?: (payload: PartyJoinRequestPayload) => void;
} = {}) {
  return subscribeNotificationOpenedApp(remoteMessage => {
    handlePushNotificationNavigation({
      data: remoteMessage.data || {},
      onJoinRequestReceived,
    });
  });
}

export async function checkInitialNotification({
  onJoinRequestReceived,
}: {
  onJoinRequestReceived?: (payload: PartyJoinRequestPayload) => void;
} = {}) {
  const remoteMessage = await getInitialNotificationMessage();

  if (!remoteMessage) {
    return;
  }

  handlePushNotificationNavigation({
    data: remoteMessage.data || {},
    onJoinRequestReceived,
  });
}
