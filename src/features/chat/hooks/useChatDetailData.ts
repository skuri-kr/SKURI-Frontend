import React from 'react';
import {useIsFocused} from '@react-navigation/native';

import {useAuth} from '@/features/auth';

import {buildChatDetailViewData} from '../application/chatDetailAssembler';
import type {ChatImageUploadInput} from '../model/types';

import {useChatActions} from './useChatActions';
import {useChatMessages} from './useChatMessages';
import {useChatRoom, useChatRoomLastRead} from './useChatRoom';

export const useChatDetailData = (chatRoomId: string | undefined) => {
  const {user} = useAuth();
  const isFocused = useIsFocused();
  const {
    chatRoom,
    error: roomError,
    hasJoined,
    joinRoom: joinChatRoom,
    leaveRoom: leaveChatRoom,
    loading: roomLoading,
    refresh: refreshRoom,
  } = useChatRoom(chatRoomId);
  const {
    error: messagesError,
    hasMore: hasOlderMessages,
    loadMore: loadOlderMessages,
    loading: messagesLoading,
    loadingMore: loadingOlderMessages,
    messages,
    refresh: refreshMessages,
  } = useChatMessages(chatRoomId, Boolean(chatRoomId && chatRoom?.isJoined));
  const {
    sendImageMessage: sendChatImageMessage,
    sendMessage: sendChatMessage,
    updateNotificationSetting,
  } = useChatActions();
  const {skipNextCleanupRead, updateLastRead} = useChatRoomLastRead(
    chatRoomId,
    Boolean(isFocused && hasJoined),
    hasJoined,
  );
  const [membershipLoading, setMembershipLoading] = React.useState(false);
  const [notificationTogglePending, setNotificationTogglePending] =
    React.useState(false);
  const [optimisticNotificationEnabled, setOptimisticNotificationEnabled] =
    React.useState<boolean | null>(null);

  React.useEffect(() => {
    setNotificationTogglePending(false);
    setOptimisticNotificationEnabled(null);
  }, [chatRoomId]);

  React.useEffect(() => {
    if (optimisticNotificationEnabled === null || !chatRoom) {
      return;
    }

    const actualNotificationEnabled = chatRoom.isMuted !== true;

    if (actualNotificationEnabled === optimisticNotificationEnabled) {
      setOptimisticNotificationEnabled(null);
    }
  }, [chatRoom, optimisticNotificationEnabled]);

  const effectiveChatRoom = React.useMemo(() => {
    if (!chatRoom || optimisticNotificationEnabled === null) {
      return chatRoom;
    }

    return {
      ...chatRoom,
      isMuted: !optimisticNotificationEnabled,
    };
  }, [chatRoom, optimisticNotificationEnabled]);

  const data = React.useMemo(() => {
    if (!effectiveChatRoom) {
      return null;
    }

    return buildChatDetailViewData({
      currentUserId: user?.uid ?? 'current-user',
      messages,
      room: effectiveChatRoom,
    });
  }, [effectiveChatRoom, messages, user?.uid]);

  const loading = roomLoading || Boolean(chatRoom?.isJoined && messagesLoading);
  const notFound = Boolean(chatRoomId && !loading && !roomError && !chatRoom);
  const error = React.useMemo(() => {
    if (roomError) {
      return roomError;
    }

    if (messagesError) {
      return messagesError.message || '채팅 메시지를 불러오지 못했습니다.';
    }

    return null;
  }, [messagesError, roomError]);

  const reload = React.useCallback(async () => {
    await refreshRoom();

    if (chatRoomId) {
      await refreshMessages();
    }
  }, [chatRoomId, refreshMessages, refreshRoom]);

  const sendMessage = React.useCallback(
    async (messageText: string) => {
      if (!chatRoomId || !chatRoom?.isJoined) {
        throw new Error('참여 중인 채팅방만 메시지를 전송할 수 있습니다.');
      }

      await sendChatMessage(chatRoomId, messageText, chatRoom);
      await updateLastRead();
    },
    [chatRoom, chatRoomId, sendChatMessage, updateLastRead],
  );

  const sendImageMessage = React.useCallback(
    async (image: ChatImageUploadInput) => {
      if (!chatRoomId || !chatRoom?.isJoined) {
        throw new Error('참여 중인 채팅방만 이미지를 전송할 수 있습니다.');
      }

      await sendChatImageMessage(chatRoomId, image, chatRoom);
      await updateLastRead();
    },
    [chatRoom, chatRoomId, sendChatImageMessage, updateLastRead],
  );

  const toggleNotification = React.useCallback(async () => {
    if (!chatRoomId || !chatRoom?.isJoined) {
      throw new Error('참여 중인 채팅방만 알림 설정을 변경할 수 있습니다.');
    }

    if (notificationTogglePending) {
      return;
    }

    const currentNotificationEnabled =
      optimisticNotificationEnabled ?? chatRoom.isMuted !== true;
    const nextNotificationEnabled = !currentNotificationEnabled;

    setNotificationTogglePending(true);
    setOptimisticNotificationEnabled(nextNotificationEnabled);

    try {
      await updateNotificationSetting(chatRoomId, nextNotificationEnabled);
    } catch (toggleError) {
      setOptimisticNotificationEnabled(null);
      throw toggleError;
    } finally {
      setNotificationTogglePending(false);
    }
  }, [
    chatRoom,
    chatRoomId,
    notificationTogglePending,
    optimisticNotificationEnabled,
    updateNotificationSetting,
  ]);

  const joinRoom = React.useCallback(async () => {
    if (!chatRoomId || !chatRoom || chatRoom.isJoined) {
      return;
    }

    try {
      setMembershipLoading(true);
      await joinChatRoom();
    } finally {
      setMembershipLoading(false);
    }
  }, [chatRoom, chatRoomId, joinChatRoom]);

  const leaveRoom = React.useCallback(async () => {
    if (!chatRoomId || !hasJoined) {
      return;
    }

    try {
      setMembershipLoading(true);
      await updateLastRead();
      skipNextCleanupRead();
      await leaveChatRoom();
    } finally {
      setMembershipLoading(false);
    }
  }, [chatRoomId, hasJoined, leaveChatRoom, skipNextCleanupRead, updateLastRead]);

  return {
    data,
    error,
    hasOlderMessages,
    joinRoom,
    leaveRoom,
    loadOlderMessages,
    loading,
    loadingOlderMessages,
    membershipLoading,
    notificationTogglePending,
    notFound,
    reload,
    sendMessage,
    sendImageMessage,
    toggleNotification,
  };
};
