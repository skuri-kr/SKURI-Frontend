import React from 'react';

import {
  invalidateData,
  useInvalidationVersion,
} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendRepository, useTimetableRepository} from '@/di';

import type {FriendSummary} from '@/features/friend/model/friend';

import type {FriendTimetable} from '../model/timetableDomain';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const FRIEND_NAME_COLLATOR = new Intl.Collator('ko');

const sortFriends = (friends: FriendSummary[]) =>
  [...friends].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return (
      FRIEND_NAME_COLLATOR.compare(left.nickname, right.nickname) ||
      left.id.localeCompare(right.id)
    );
  });

const evictFriendTimetableCache = (
  cache: Map<string, FriendTimetable>,
  friendId: string,
) => {
  const cacheKeyPrefix = `${friendId}:`;
  for (const cacheKey of cache.keys()) {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      cache.delete(cacheKey);
    }
  }
};

export const useFriendTimetableData = (semesterId?: string) => {
  const friendRepository = useFriendRepository();
  const timetableRepository = useTimetableRepository();
  const friendHubInvalidationVersion = useInvalidationVersion(
    FRIEND_HUB_INVALIDATION_KEY,
  );
  const [friends, setFriends] = React.useState<FriendSummary[]>([]);
  const [friendsError, setFriendsError] = React.useState<string>();
  const [hasLoadedFriends, setHasLoadedFriends] = React.useState(false);
  const [selectedFriendId, setSelectedFriendId] = React.useState<string>();
  const [selectedTimetable, setSelectedTimetable] =
    React.useState<FriendTimetable>();
  const [selectedTimetableKey, setSelectedTimetableKey] =
    React.useState<string>();
  const [timetableError, setTimetableError] = React.useState<string>();
  const [loadingTimetable, setLoadingTimetable] = React.useState(false);
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const cacheRef = React.useRef(new Map<string, FriendTimetable>());
  const friendScopesRef = React.useRef(
    new Map<string, FriendSummary['effectiveTimetableScope']>(),
  );
  const friendsRequestRef = React.useRef(0);
  const timetableRequestRef = React.useRef(0);
  const selectedFriendIdRef = React.useRef<string | undefined>(undefined);
  const updatingFavoriteIdsRef = React.useRef(new Set<string>());
  const loadFriendTimetableRef = React.useRef<
    (
      friendId: string,
      options?: {force?: boolean},
    ) => Promise<void>
  >(async () => undefined);

  const loadFriends = React.useCallback(async () => {
    const changedScopeFriendIds = new Set<string>();
    const requestId = friendsRequestRef.current + 1;
    friendsRequestRef.current = requestId;
    try {
      setFriendsError(undefined);
      const nextFriends = sortFriends(await friendRepository.getFriends());
      if (requestId !== friendsRequestRef.current) {
        return changedScopeFriendIds;
      }

      const nextFriendIds = new Set(nextFriends.map(friend => friend.id));
      const nextFriendScopes = new Map(
        nextFriends.map(friend => [
          friend.id,
          friend.effectiveTimetableScope,
        ]),
      );
      for (const [friendId, previousScope] of friendScopesRef.current) {
        if (
          !nextFriendScopes.has(friendId) ||
          nextFriendScopes.get(friendId) !== previousScope
        ) {
          changedScopeFriendIds.add(friendId);
          evictFriendTimetableCache(cacheRef.current, friendId);
        }
      }
      friendScopesRef.current = nextFriendScopes;
      setFriends(nextFriends);
      setHasLoadedFriends(true);
      const selectedFriend = selectedFriendIdRef.current;
      if (selectedFriend && !nextFriendIds.has(selectedFriend)) {
        timetableRequestRef.current += 1;
        selectedFriendIdRef.current = undefined;
        setSelectedFriendId(undefined);
        setSelectedTimetable(undefined);
        setSelectedTimetableKey(undefined);
        setTimetableError(undefined);
        setLoadingTimetable(false);
      }
    } catch (error) {
      if (requestId === friendsRequestRef.current) {
        setFriendsError(
          getErrorMessage(error, '친구 목록을 불러오지 못했습니다.'),
        );
      }
    }
    return changedScopeFriendIds;
  }, [friendRepository]);

  const loadFriendTimetable = React.useCallback(
    async (friendId: string, options?: {force?: boolean}) => {
      if (!semesterId) {
        return;
      }

      const requestId = timetableRequestRef.current + 1;
      timetableRequestRef.current = requestId;
      const cacheKey = `${friendId}:${semesterId}`;
      if (options?.force) {
        cacheRef.current.delete(cacheKey);
      }
      const cached = cacheRef.current.get(cacheKey);
      if (cached && !options?.force) {
        setSelectedTimetable(cached);
        setSelectedTimetableKey(cacheKey);
        setTimetableError(undefined);
        setLoadingTimetable(false);
        return;
      }

      setLoadingTimetable(true);
      setTimetableError(undefined);
      setSelectedTimetable(undefined);
      setSelectedTimetableKey(undefined);

      try {
        const timetable = await timetableRepository.getFriendTimetable({
          friendId,
          semesterId,
        });
        if (requestId !== timetableRequestRef.current) {
          return;
        }
        cacheRef.current.set(cacheKey, timetable);
        setSelectedTimetable(timetable);
        setSelectedTimetableKey(cacheKey);
      } catch (error) {
        if (requestId === timetableRequestRef.current) {
          setTimetableError(
            getErrorMessage(error, '친구 시간표를 불러오지 못했습니다.'),
          );
        }
      } finally {
        if (requestId === timetableRequestRef.current) {
          setLoadingTimetable(false);
        }
      }
    },
    [semesterId, timetableRepository],
  );
  loadFriendTimetableRef.current = loadFriendTimetable;

  const reloadFriends = React.useCallback(async () => {
    const changedScopeFriendIds = await loadFriends();
    const selectedFriend = selectedFriendIdRef.current;
    if (selectedFriend && changedScopeFriendIds.has(selectedFriend)) {
      await loadFriendTimetableRef.current?.(selectedFriend, {force: true});
    }
  }, [loadFriends]);

  const selectFriend = React.useCallback(
    (friendId: string) => {
      if (selectedFriendId === friendId) {
        timetableRequestRef.current += 1;
        selectedFriendIdRef.current = undefined;
        setSelectedFriendId(undefined);
        setSelectedTimetable(undefined);
        setSelectedTimetableKey(undefined);
        setTimetableError(undefined);
        setLoadingTimetable(false);
        return;
      }

      timetableRequestRef.current += 1;
      selectedFriendIdRef.current = friendId;
      setSelectedFriendId(friendId);
      setSelectedTimetable(undefined);
      setSelectedTimetableKey(undefined);
      setTimetableError(undefined);
      setLoadingTimetable(Boolean(semesterId));
    },
    [selectedFriendId, semesterId],
  );

  const updateFavorite = React.useCallback(
    async (friend: FriendSummary) => {
      if (updatingFavoriteIdsRef.current.has(friend.id)) {
        return;
      }

      const favorite = !friend.favorite;
      updatingFavoriteIdsRef.current.add(friend.id);
      setUpdatingFavoriteIds(new Set(updatingFavoriteIdsRef.current));
      setFriends(current =>
        sortFriends(
          current.map(item =>
            item.id === friend.id ? {...item, favorite} : item,
          ),
        ),
      );

      try {
        await friendRepository.updateFavorite(friend.id, favorite);
        invalidateData(FRIEND_HUB_INVALIDATION_KEY);
      } catch (error) {
        setFriends(current =>
          sortFriends(
            current.map(item =>
              item.id === friend.id ? {...item, favorite: friend.favorite} : item,
            ),
          ),
        );
        throw error;
      } finally {
        updatingFavoriteIdsRef.current.delete(friend.id);
        setUpdatingFavoriteIds(new Set(updatingFavoriteIdsRef.current));
      }
    },
    [friendRepository],
  );

  const refresh = React.useCallback(async () => {
    cacheRef.current.clear();
    await loadFriends();
    if (selectedFriendIdRef.current) {
      await loadFriendTimetable(selectedFriendIdRef.current, {force: true});
    }
  }, [loadFriendTimetable, loadFriends]);

  React.useEffect(() => {
    reloadFriends().catch(() => undefined);
  }, [friendHubInvalidationVersion, reloadFriends]);

  React.useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId;
    if (!selectedFriendId) {
      return;
    }

    loadFriendTimetable(selectedFriendId).catch(() => undefined);
  }, [loadFriendTimetable, selectedFriendId]);

  const currentTimetableKey =
    selectedFriendId && semesterId
      ? `${selectedFriendId}:${semesterId}`
      : undefined;
  const visibleSelectedTimetable =
    selectedTimetableKey === currentTimetableKey
      ? selectedTimetable
      : undefined;

  return {
    friends,
    friendsError,
    hasLoadedFriends,
    loadingTimetable,
    refresh,
    reloadFriends,
    reloadSelectedTimetable: () =>
      selectedFriendId
        ? loadFriendTimetable(selectedFriendId, {force: true})
        : Promise.resolve(),
    selectedFriendId,
    selectedTimetable: visibleSelectedTimetable,
    selectFriend,
    timetableError,
    updateFavorite,
    updatingFavoriteIds,
  };
};
