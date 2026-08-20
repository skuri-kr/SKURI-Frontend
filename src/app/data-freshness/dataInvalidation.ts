import {useFocusEffect} from '@react-navigation/native';
import React from 'react';

export type DataInvalidationKey =
  | 'campus.home'
  | 'taxi.home'
  | 'community.board.list'
  | 'notice.list'
  | 'profile.boardBookmarks'
  | 'profile.noticeBookmarks'
  | 'profile.myPosts'
  | 'friend.hub';

type Listener = () => void;

const invalidationVersions = new Map<DataInvalidationKey, number>();
const invalidationListeners = new Map<DataInvalidationKey, Set<Listener>>();

const getInvalidationVersion = (key: DataInvalidationKey) =>
  invalidationVersions.get(key) ?? 0;

const emitInvalidation = (key: DataInvalidationKey) => {
  invalidationListeners.get(key)?.forEach(listener => {
    listener();
  });
};

const subscribeInvalidation = (
  key: DataInvalidationKey,
  listener: Listener,
) => {
  const listeners = invalidationListeners.get(key) ?? new Set<Listener>();
  listeners.add(listener);
  invalidationListeners.set(key, listeners);

  return () => {
    const currentListeners = invalidationListeners.get(key);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);

    if (currentListeners.size === 0) {
      invalidationListeners.delete(key);
    }
  };
};

const normalizeInvalidationKeys = (
  keys: DataInvalidationKey | readonly DataInvalidationKey[],
): readonly DataInvalidationKey[] =>
  Array.from(new Set(Array.isArray(keys) ? keys : [keys]));

const subscribeInvalidations = (
  keys: readonly DataInvalidationKey[],
  listener: Listener,
) => {
  const unsubscribes = keys.map(key => subscribeInvalidation(key, listener));

  return () => {
    unsubscribes.forEach(unsubscribe => {
      unsubscribe();
    });
  };
};

const buildVersionSignal = (keys: readonly DataInvalidationKey[]) =>
  keys.map(key => `${key}:${getInvalidationVersion(key)}`).join('|');

const buildVersionSnapshot = (keys: readonly DataInvalidationKey[]) =>
  keys.reduce<Partial<Record<DataInvalidationKey, number>>>((snapshot, key) => {
    snapshot[key] = getInvalidationVersion(key);
    return snapshot;
  }, {});

export const invalidateData = (
  keys: DataInvalidationKey | readonly DataInvalidationKey[],
) => {
  const nextKeys = Array.isArray(keys) ? keys : [keys];

  nextKeys.forEach(key => {
    invalidationVersions.set(key, getInvalidationVersion(key) + 1);
    emitInvalidation(key);
  });
};

export const useInvalidationVersion = (key: DataInvalidationKey) =>
  React.useSyncExternalStore(
    listener => subscribeInvalidation(key, listener),
    () => getInvalidationVersion(key),
    () => getInvalidationVersion(key),
  );

const useInvalidationSignal = (keys: readonly DataInvalidationKey[]) =>
  React.useSyncExternalStore(
    listener => subscribeInvalidations(keys, listener),
    () => buildVersionSignal(keys),
    () => buildVersionSignal(keys),
  );

export interface RefetchOnFocusOptions {
  enabled?: boolean;
  invalidationKey: DataInvalidationKey | readonly DataInvalidationKey[];
  mode?: 'always-after-initial-focus' | 'only-when-invalidated';
  refetch: () => Promise<unknown>;
}

export const useRefetchOnFocus = ({
  enabled = true,
  invalidationKey,
  mode = 'only-when-invalidated',
  refetch,
}: RefetchOnFocusOptions) => {
  const invalidationKeys = React.useMemo(
    () => normalizeInvalidationKeys(invalidationKey),
    [invalidationKey],
  );
  const invalidationKeySignature = React.useMemo(
    () => invalidationKeys.join('|'),
    [invalidationKeys],
  );
  useInvalidationSignal(invalidationKeys);
  const hasFocusedRef = React.useRef(false);
  const inFlightRef = React.useRef<Promise<unknown> | null>(null);
  const lastHandledVersionsRef = React.useRef<
    Partial<Record<DataInvalidationKey, number>>
  >(buildVersionSnapshot(invalidationKeys));

  React.useEffect(() => {
    const currentVersions = buildVersionSnapshot(invalidationKeys);
    const nextHandledVersions = buildVersionSnapshot(invalidationKeys);

    invalidationKeys.forEach(key => {
      nextHandledVersions[key] =
        lastHandledVersionsRef.current[key] ?? currentVersions[key];
    });

    lastHandledVersionsRef.current = nextHandledVersions;
  }, [invalidationKeySignature, invalidationKeys]);

  useFocusEffect(
    React.useCallback(() => {
      if (!enabled) {
        return () => {};
      }

      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        lastHandledVersionsRef.current = buildVersionSnapshot(invalidationKeys);
        return () => {};
      }

      const targetVersions = buildVersionSnapshot(invalidationKeys);
      const hasPendingInvalidation = invalidationKeys.some(
        key =>
          (targetVersions[key] ?? 0) >
          (lastHandledVersionsRef.current[key] ?? 0),
      );

      if (
        (hasPendingInvalidation || mode === 'always-after-initial-focus') &&
        !inFlightRef.current
      ) {
        const refetchTask = Promise.resolve(refetch())
          .then(() => {
            lastHandledVersionsRef.current = {
              ...lastHandledVersionsRef.current,
              ...targetVersions,
            };
          })
          .catch(error => {
            console.warn(
              'Focus refetch failed for invalidation keys:',
              invalidationKeys,
              error,
            );
          })
          .finally(() => {
            inFlightRef.current = null;
          });

        inFlightRef.current = refetchTask;
      }

      return () => {};
    }, [enabled, invalidationKeys, mode, refetch]),
  );
};
