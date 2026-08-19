import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendBlock, FriendPrivacy} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const useFriendSettingsData = () => {
  const friendRepository = useFriendRepository();
  const [privacy, setPrivacy] = React.useState<FriendPrivacy>();
  const [blocks, setBlocks] = React.useState<FriendBlock[]>([]);
  const [privacyError, setPrivacyError] = React.useState<string>();
  const [blocksError, setBlocksError] = React.useState<string>();
  const [loadingPrivacy, setLoadingPrivacy] = React.useState(true);
  const [loadingBlocks, setLoadingBlocks] = React.useState(true);
  const [hasLoadedBlocks, setHasLoadedBlocks] = React.useState(false);
  const [savingPrivacy, setSavingPrivacy] = React.useState(false);
  const [unblockingIds, setUnblockingIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const unblockingIdsRef = React.useRef(new Set<string>());

  const loadPrivacy = React.useCallback(async () => {
    try {
      setLoadingPrivacy(true);
      setPrivacyError(undefined);
      setPrivacy(await friendRepository.getMyPrivacy());
    } catch (loadError) {
      setPrivacyError(getErrorMessage(loadError, '검색 공개 설정을 불러오지 못했습니다.'));
    } finally {
      setLoadingPrivacy(false);
    }
  }, [friendRepository]);

  const loadBlocks = React.useCallback(async () => {
    try {
      setLoadingBlocks(true);
      setBlocksError(undefined);
      setBlocks(await friendRepository.getBlocks());
      setHasLoadedBlocks(true);
    } catch (loadError) {
      setBlocksError(getErrorMessage(loadError, '차단 목록을 불러오지 못했습니다.'));
    } finally {
      setLoadingBlocks(false);
    }
  }, [friendRepository]);

  const reload = React.useCallback(async () => {
    await Promise.all([loadPrivacy(), loadBlocks()]);
  }, [loadBlocks, loadPrivacy]);

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
      if (unblockingIdsRef.current.has(friendId)) {
        return;
      }

      unblockingIdsRef.current.add(friendId);
      setUnblockingIds(new Set(unblockingIdsRef.current));
      try {
        await friendRepository.unblockMember(friendId);
        setBlocks(current => current.filter(block => block.id !== friendId));
      } finally {
        unblockingIdsRef.current.delete(friendId);
        setUnblockingIds(new Set(unblockingIdsRef.current));
      }
    },
    [friendRepository],
  );

  return {
    blocks,
    blocksError,
    hasLoadedBlocks,
    loadingBlocks,
    loadingPrivacy,
    privacy,
    privacyError,
    reload,
    reloadBlocks: loadBlocks,
    reloadPrivacy: loadPrivacy,
    savingPrivacy,
    unblockMember,
    unblockingIds,
    updateNicknameSearchable,
  };
};
