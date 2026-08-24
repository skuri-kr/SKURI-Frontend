import {useCallback, useEffect, useState} from 'react';

import { useAuth } from '@/features/auth';

import type { ChatRoom, ChatRoomCategory } from '../model/types';

import { useChatRepository } from './useChatRepository';

export type { ChatRoomCategory } from '../model/types';

interface UseChatRoomsOptions {
  joinedOnly?: boolean;
}

export const useChatRooms = (
  category: ChatRoomCategory,
  {joinedOnly = false}: UseChatRoomsOptions = {},
) => {
  const { user } = useAuth();
  const chatRepository = useChatRepository();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(async () => {
    setReloadToken(currentValue => currentValue + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!user?.uid) {
      setChatRooms([]);
      setLoading(false);
      return;
    }

    const unsubscribe = chatRepository.subscribeToChatRoomsByCategory(
      {
        category,
        joinedOnly,
        userId: user?.uid,
        department: user?.department ?? undefined,
      },
      {
        onData: rooms => {
          setChatRooms(rooms);
          setLoading(false);
        },
        onError: err => {
          console.error('채팅방 목록 구독 실패:', err);
          setError(err);
          setChatRooms([]);
          setLoading(false);
        },
      },
    );

    return () => unsubscribe();
  }, [category, chatRepository, joinedOnly, reloadToken, user?.department, user?.uid]);

  return { chatRooms, loading, error, refresh } as const;
};
