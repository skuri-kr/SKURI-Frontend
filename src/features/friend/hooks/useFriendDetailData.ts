import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendSummary} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const useFriendDetailData = (friendId: string) => {
  const friendRepository = useFriendRepository();
  const [friend, setFriend] = React.useState<FriendSummary>();
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutating, setMutating] = React.useState(false);
  const favoriteMutationInFlightRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      setFriend(await friendRepository.getFriend(friendId));
    } catch (loadError) {
      setError(getErrorMessage(loadError, '친구 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [friendId, friendRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const updateFavorite = React.useCallback(async () => {
    if (!friend || favoriteMutationInFlightRef.current) {
      return;
    }

    try {
      favoriteMutationInFlightRef.current = true;
      setMutating(true);
      await friendRepository.updateFavorite(friend.id, !friend.favorite);
      setFriend(current =>
        current ? {...current, favorite: !current.favorite} : current,
      );
    } finally {
      favoriteMutationInFlightRef.current = false;
      setMutating(false);
    }
  }, [friend, friendRepository]);

  const removeFriend = React.useCallback(async () => {
    await friendRepository.removeFriend(friendId);
  }, [friendId, friendRepository]);

  const blockFriend = React.useCallback(async () => {
    await friendRepository.blockMember(friendId);
  }, [friendId, friendRepository]);

  return {
    blockFriend,
    error,
    friend,
    loading,
    mutating,
    reload,
    removeFriend,
    updateFavorite,
  };
};
