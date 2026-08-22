import React from 'react';

import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';
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
  const [timetableError, setTimetableError] = React.useState<string>();
  const [loadingTimetable, setLoadingTimetable] = React.useState(false);
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const cacheRef = React.useRef(new Map<string, FriendTimetable>());
  const timetableRequestRef = React.useRef(0);
  const selectedFriendIdRef = React.useRef<string | undefined>(undefined);
  const updatingFavoriteIdsRef = React.useRef(new Set<string>());

  const loadFriends = React.useCallback(async () => {
    try {
      setFriendsError(undefined);
      const nextFriends = sortFriends(await friendRepository.getFriends());
      setFriends(nextFriends);
      setHasLoadedFriends(true);
      setSelectedFriendId(current => {
        if (!current || nextFriends.some(friend => friend.id === current)) {
          return current;
        }

        timetableRequestRef.current += 1;
        selectedFriendIdRef.current = undefined;
        setSelectedTimetable(undefined);
        setTimetableError(undefined);
        setLoadingTimetable(false);
        return undefined;
      });
    } catch (error) {
      setFriendsError(getErrorMessage(error, '친구 목록을 불러오지 못했습니다.'));
    }
  }, [friendRepository]);

  const loadFriendTimetable = React.useCallback(
    async (friendId: string, options?: {force?: boolean}) => {
      if (!semesterId) {
        return;
      }

      const cacheKey = `${friendId}:${semesterId}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached && !options?.force) {
        setSelectedTimetable(cached);
        setTimetableError(undefined);
        return;
      }

      const requestId = timetableRequestRef.current + 1;
      timetableRequestRef.current = requestId;
      setLoadingTimetable(true);
      setTimetableError(undefined);
      setSelectedTimetable(undefined);

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

  const selectFriend = React.useCallback(
    (friendId: string) => {
      if (selectedFriendId === friendId) {
        timetableRequestRef.current += 1;
        selectedFriendIdRef.current = undefined;
        setSelectedFriendId(undefined);
        setSelectedTimetable(undefined);
        setTimetableError(undefined);
        setLoadingTimetable(false);
        return;
      }

      selectedFriendIdRef.current = friendId;
      setSelectedFriendId(friendId);
    },
    [selectedFriendId],
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
    await loadFriends();
    if (selectedFriendIdRef.current) {
      await loadFriendTimetable(selectedFriendIdRef.current, {force: true});
    }
  }, [loadFriendTimetable, loadFriends]);

  React.useEffect(() => {
    refresh().catch(() => undefined);
  }, [friendHubInvalidationVersion, refresh]);

  React.useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId;
    if (!selectedFriendId) {
      return;
    }

    loadFriendTimetable(selectedFriendId).catch(() => undefined);
  }, [loadFriendTimetable, selectedFriendId]);

  return {
    friends,
    friendsError,
    hasLoadedFriends,
    loadingTimetable,
    refresh,
    reloadFriends: loadFriends,
    reloadSelectedTimetable: () =>
      selectedFriendId
        ? loadFriendTimetable(selectedFriendId, {force: true})
        : Promise.resolve(),
    selectedFriendId,
    selectedTimetable,
    selectFriend,
    timetableError,
    updateFavorite,
    updatingFavoriteIds,
  };
};
