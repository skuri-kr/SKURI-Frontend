import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendMinecraftAccounts, FriendSummary} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const useFriendDetailData = (friendId: string) => {
  const friendRepository = useFriendRepository();
  const [friend, setFriend] = React.useState<FriendSummary>();
  const [minecraftAccounts, setMinecraftAccounts] = React.useState<FriendMinecraftAccounts>();
  const [minecraftAccountsError, setMinecraftAccountsError] = React.useState<string>();
  const [minecraftAccountsLoading, setMinecraftAccountsLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutating, setMutating] = React.useState(false);
  const mutationInFlightRef = React.useRef(false);
  const minecraftAccountsLoadVersionRef = React.useRef(0);

  const loadMinecraftAccounts = React.useCallback(async () => {
    const requestVersion = minecraftAccountsLoadVersionRef.current + 1;
    minecraftAccountsLoadVersionRef.current = requestVersion;
    try {
      setMinecraftAccountsLoading(true);
      setMinecraftAccountsError(undefined);
      const accounts = await friendRepository.getFriendMinecraftAccounts(friendId);
      if (requestVersion !== minecraftAccountsLoadVersionRef.current) {
        return;
      }
      setMinecraftAccounts(accounts);
    } catch (loadError) {
      if (requestVersion !== minecraftAccountsLoadVersionRef.current) {
        return;
      }
      setMinecraftAccounts(undefined);
      setMinecraftAccountsError(getErrorMessage(loadError, '마인크래프트 계정을 불러오지 못했습니다.'));
    } finally {
      if (requestVersion === minecraftAccountsLoadVersionRef.current) {
        setMinecraftAccountsLoading(false);
      }
    }
  }, [friendId, friendRepository]);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      loadMinecraftAccounts().catch(() => undefined);
      setFriend(await friendRepository.getFriend(friendId));
    } catch (loadError) {
      setError(getErrorMessage(loadError, '친구 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [friendId, friendRepository, loadMinecraftAccounts]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const updateFavorite = React.useCallback(async () => {
    if (!friend || mutationInFlightRef.current) {
      return false;
    }

    const previousFriend = friend;
    try {
      mutationInFlightRef.current = true;
      setMutating(true);
      setFriend({...previousFriend, favorite: !previousFriend.favorite});
      await friendRepository.updateFavorite(previousFriend.id, !previousFriend.favorite);
      return true;
    } catch (favoriteError) {
      setFriend(current =>
        current?.id === previousFriend.id
          ? {...current, favorite: previousFriend.favorite}
          : current,
      );
      throw favoriteError;
    } finally {
      mutationInFlightRef.current = false;
      setMutating(false);
    }
  }, [friend, friendRepository]);

  const removeFriend = React.useCallback(async () => {
    if (mutationInFlightRef.current) {
      return false;
    }

    try {
      mutationInFlightRef.current = true;
      setMutating(true);
      await friendRepository.removeFriend(friendId);
      return true;
    } finally {
      mutationInFlightRef.current = false;
      setMutating(false);
    }
  }, [friendId, friendRepository]);

  const blockFriend = React.useCallback(async () => {
    if (mutationInFlightRef.current) {
      return false;
    }

    try {
      mutationInFlightRef.current = true;
      setMutating(true);
      await friendRepository.blockMember(friendId);
      return true;
    } finally {
      mutationInFlightRef.current = false;
      setMutating(false);
    }
  }, [friendId, friendRepository]);

  return {
    blockFriend,
    error,
    friend,
    loading,
    minecraftAccounts,
    minecraftAccountsError,
    minecraftAccountsLoading,
    mutating,
    reload,
    reloadMinecraftAccounts: loadMinecraftAccounts,
    removeFriend,
    updateFavorite,
  };
};
