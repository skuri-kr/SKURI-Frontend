import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendBlock, FriendPrivacy} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const useFriendSettingsData = () => {
  const friendRepository = useFriendRepository();
  const [privacy, setPrivacy] = React.useState<FriendPrivacy>();
  const [blocks, setBlocks] = React.useState<FriendBlock[]>([]);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [savingPrivacy, setSavingPrivacy] = React.useState(false);
  const [unblockingId, setUnblockingId] = React.useState<string>();

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const [nextPrivacy, nextBlocks] = await Promise.all([
        friendRepository.getMyPrivacy(),
        friendRepository.getBlocks(),
      ]);
      setPrivacy(nextPrivacy);
      setBlocks(nextBlocks);
    } catch (loadError) {
      setError(getErrorMessage(loadError, '친구 설정을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [friendRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const updateNicknameSearchable = React.useCallback(
    async (nicknameSearchable: boolean) => {
      try {
        setSavingPrivacy(true);
        setPrivacy(await friendRepository.updateMyPrivacy(nicknameSearchable));
      } finally {
        setSavingPrivacy(false);
      }
    },
    [friendRepository],
  );

  const unblockMember = React.useCallback(
    async (friendId: string) => {
      try {
        setUnblockingId(friendId);
        await friendRepository.unblockMember(friendId);
        setBlocks(current => current.filter(block => block.id !== friendId));
      } finally {
        setUnblockingId(undefined);
      }
    },
    [friendRepository],
  );

  return {
    blocks,
    error,
    loading,
    privacy,
    reload,
    savingPrivacy,
    unblockMember,
    unblockingId,
    updateNicknameSearchable,
  };
};
