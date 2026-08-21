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
  const savingPrivacyRef = React.useRef(false);
  const unblockingIdsRef = React.useRef(new Set<string>());
  const privacyLoadVersionRef = React.useRef(0);
  const privacyStateVersionRef = React.useRef(0);
  const blocksLoadVersionRef = React.useRef(0);
  const blocksStateVersionRef = React.useRef(0);

  const loadPrivacy = React.useCallback(async () => {
    const loadVersion = privacyLoadVersionRef.current + 1;
    privacyLoadVersionRef.current = loadVersion;
    const privacyStateVersion = privacyStateVersionRef.current;

    try {
      setLoadingPrivacy(true);
      setPrivacyError(undefined);
      const nextPrivacy = await friendRepository.getMyPrivacy();
      if (
        loadVersion !== privacyLoadVersionRef.current ||
        privacyStateVersion !== privacyStateVersionRef.current
      ) {
        return;
      }
      setPrivacy(nextPrivacy);
    } catch (loadError) {
      if (
        loadVersion !== privacyLoadVersionRef.current ||
        privacyStateVersion !== privacyStateVersionRef.current
      ) {
        return;
      }
      setPrivacyError(getErrorMessage(loadError, '검색 공개 설정을 불러오지 못했습니다.'));
    } finally {
      if (loadVersion === privacyLoadVersionRef.current) {
        setLoadingPrivacy(false);
      }
    }
  }, [friendRepository]);

  const loadBlocks = React.useCallback(async () => {
    const loadVersion = blocksLoadVersionRef.current + 1;
    blocksLoadVersionRef.current = loadVersion;
    const blocksStateVersion = blocksStateVersionRef.current;

    try {
      setLoadingBlocks(true);
      setBlocksError(undefined);
      const nextBlocks = await friendRepository.getBlocks();
      if (
        loadVersion !== blocksLoadVersionRef.current ||
        blocksStateVersion !== blocksStateVersionRef.current
      ) {
        return;
      }
      setBlocks(nextBlocks);
      setHasLoadedBlocks(true);
    } catch (loadError) {
      if (
        loadVersion !== blocksLoadVersionRef.current ||
        blocksStateVersion !== blocksStateVersionRef.current
      ) {
        return;
      }
      setBlocksError(getErrorMessage(loadError, '차단 목록을 불러오지 못했습니다.'));
    } finally {
      if (loadVersion === blocksLoadVersionRef.current) {
        setLoadingBlocks(false);
      }
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
      if (!privacy || savingPrivacyRef.current) {
        return;
      }

      const previousPrivacy = privacy;
      try {
        savingPrivacyRef.current = true;
        setSavingPrivacy(true);
        setPrivacyError(undefined);
        privacyStateVersionRef.current += 1;
        setPrivacy({nicknameSearchable});
        const nextPrivacy = await friendRepository.updateMyPrivacy(nicknameSearchable);
        privacyStateVersionRef.current += 1;
        setPrivacy(nextPrivacy);
      } catch (updateError) {
        privacyStateVersionRef.current += 1;
        setPrivacy(previousPrivacy);
        throw updateError;
      } finally {
        savingPrivacyRef.current = false;
        setSavingPrivacy(false);
      }
    },
    [friendRepository, privacy],
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
        blocksStateVersionRef.current += 1;
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
