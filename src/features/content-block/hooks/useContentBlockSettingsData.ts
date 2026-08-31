import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {CONTENT_BLOCKS_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useContentBlockRepository} from '@/di';

import type {ContentBlock} from '../model/contentBlock';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim()
    ? error.message
    : '콘텐츠 차단 목록을 불러오지 못했습니다.';

export const useContentBlockSettingsData = () => {
  const repository = useContentBlockRepository();
  const [blocks, setBlocks] = React.useState<ContentBlock[]>([]);
  const [error, setError] = React.useState<string>();
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [unblockingIds, setUnblockingIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const mountedRef = React.useRef(true);
  const loadVersionRef = React.useRef(0);
  const stateVersionRef = React.useRef(0);
  const unblockingIdsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    mountedRef.current = true;
    const unblockingIdsSet = unblockingIdsRef.current;

    return () => {
      mountedRef.current = false;
      loadVersionRef.current += 1;
      unblockingIdsSet.clear();
    };
  }, []);

  const load = React.useCallback(async () => {
    const loadVersion = loadVersionRef.current + 1;
    loadVersionRef.current = loadVersion;
    const stateVersion = stateVersionRef.current;

    if (mountedRef.current) {
      setLoading(true);
      setError(undefined);
    }

    try {
      const nextBlocks = await repository.getContentBlocks();
      if (
        !mountedRef.current ||
        loadVersionRef.current !== loadVersion ||
        stateVersionRef.current !== stateVersion
      ) {
        return;
      }

      setBlocks(nextBlocks);
      setHasLoaded(true);
    } catch (loadError) {
      if (
        !mountedRef.current ||
        loadVersionRef.current !== loadVersion ||
        stateVersionRef.current !== stateVersion
      ) {
        return;
      }

      setError(getErrorMessage(loadError));
    } finally {
      if (mountedRef.current && loadVersionRef.current === loadVersion) {
        setLoading(false);
      }
    }
  }, [repository]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const unblockContent = React.useCallback(
    async (blockId: string) => {
      if (unblockingIdsRef.current.has(blockId)) {
        return;
      }

      unblockingIdsRef.current.add(blockId);
      if (mountedRef.current) {
        setUnblockingIds(new Set(unblockingIdsRef.current));
      }

      try {
        await repository.unblockContent(blockId);
        invalidateData(CONTENT_BLOCKS_INVALIDATION_KEY);
        if (!mountedRef.current) {
          return;
        }

        stateVersionRef.current += 1;
        setBlocks(current => current.filter(block => block.id !== blockId));
      } finally {
        unblockingIdsRef.current.delete(blockId);
        if (mountedRef.current) {
          setUnblockingIds(new Set(unblockingIdsRef.current));
        }
      }
    },
    [repository],
  );

  return {
    blocks,
    error,
    hasLoaded,
    loading,
    reload: load,
    unblockContent,
    unblockingIds,
  };
};
