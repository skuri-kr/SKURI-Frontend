import {useCallback, useState} from 'react';

import {useAuth} from '@/features/auth';

import type {ChatImageUploadInput, ChatMessage, ChatRoom} from '../model/types';
import {
  sendChatImageMessage,
  sendChatTextMessage,
} from '../services/chatRoomService';

import {useChatRepository} from './useChatRepository';

export interface UseChatActionsResult {
  sendMessage: (
    chatRoomId: string,
    text: string,
    chatRoom?: ChatRoom | null,
  ) => Promise<void>;
  sendImageMessage: (
    chatRoomId: string,
    image: ChatImageUploadInput,
    chatRoom?: ChatRoom | null,
  ) => Promise<void>;
  updateMessage: (
    chatRoomId: string,
    messageId: string,
    text: string,
  ) => Promise<ChatMessage>;
  deleteMessage: (
    chatRoomId: string,
    messageId: string,
  ) => Promise<ChatMessage>;
  sending: boolean;
  sendError: Error | null;
  joinRoom: (chatRoomId: string) => Promise<void>;
  leaveRoom: (chatRoomId: string) => Promise<void>;
  getNotificationSetting: (chatRoomId: string) => Promise<boolean>;
  updateNotificationSetting: (
    chatRoomId: string,
    enabled: boolean,
  ) => Promise<void>;
}

export const useChatActions = (): UseChatActionsResult => {
  const chatRepository = useChatRepository();
  const {user} = useAuth();

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (chatRoomId: string, text: string, _chatRoom?: ChatRoom | null) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setSending(true);
        setSendError(null);

        await sendChatTextMessage({
          chatRepository,
          chatRoomId,
          text,
        });
      } catch (err) {
        console.error('메시지 전송 실패:', err);
        setSendError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [chatRepository, user?.uid],
  );

  const sendImageMessage = useCallback(
    async (
      chatRoomId: string,
      image: ChatImageUploadInput,
      _chatRoom?: ChatRoom | null,
    ) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      try {
        setSending(true);
        setSendError(null);

        const imageUrl = await chatRepository.uploadImage(image);
        await sendChatImageMessage({
          chatRepository,
          chatRoomId,
          imageUrl,
        });
      } catch (err) {
        console.error('이미지 전송 실패:', err);
        setSendError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [chatRepository, user?.uid],
  );

  const joinRoom = useCallback(
    async (chatRoomId: string) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      await chatRepository.joinChatRoom(chatRoomId, user.uid);
    },
    [chatRepository, user?.uid],
  );

  const leaveRoom = useCallback(
    async (chatRoomId: string) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      await chatRepository.leaveChatRoom(chatRoomId, user.uid);
    },
    [chatRepository, user?.uid],
  );

  const updateMessage = useCallback(
    async (chatRoomId: string, messageId: string, text: string) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      return chatRepository.updateMessage(chatRoomId, messageId, text);
    },
    [chatRepository, user?.uid],
  );

  const deleteMessage = useCallback(
    async (chatRoomId: string, messageId: string) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      return chatRepository.deleteMessage(chatRoomId, messageId);
    },
    [chatRepository, user?.uid],
  );

  const getNotificationSetting = useCallback(
    async (chatRoomId: string) => {
      if (!user?.uid) {
        return true;
      }

      return chatRepository.getNotificationSetting(chatRoomId, user.uid);
    },
    [chatRepository, user?.uid],
  );

  const updateNotificationSetting = useCallback(
    async (chatRoomId: string, enabled: boolean) => {
      if (!user?.uid) {
        throw new Error('로그인이 필요합니다.');
      }

      await chatRepository.updateNotificationSetting(
        chatRoomId,
        user.uid,
        enabled,
      );
    },
    [chatRepository, user?.uid],
  );

  return {
    sendMessage,
    sendImageMessage,
    sending,
    sendError,
    updateMessage,
    deleteMessage,
    joinRoom,
    leaveRoom,
    getNotificationSetting,
    updateNotificationSetting,
  };
};
