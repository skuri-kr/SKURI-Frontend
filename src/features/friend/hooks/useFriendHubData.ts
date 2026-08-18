import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendRequestItem, FriendSummary} from '../model/friend';

type FriendRequestDirection = 'RECEIVED' | 'SENT';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const sortFriends = (friends: FriendSummary[]) =>
  [...friends].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }
    return left.nickname.localeCompare(right.nickname, 'ko');
  });

export const useFriendHubData = () => {
  const friendRepository = useFriendRepository();
  const [friends, setFriends] = React.useState<FriendSummary[]>([]);
  const [receivedRequests, setReceivedRequests] = React.useState<
    FriendRequestItem[]
  >([]);
  const [sentRequests, setSentRequests] = React.useState<FriendRequestItem[]>(
    [],
  );
  const [receivedNextCursor, setReceivedNextCursor] = React.useState<string | null>(null);
  const [sentNextCursor, setSentNextCursor] = React.useState<string | null>(null);
  const [incomingRequestCount, setIncomingRequestCount] = React.useState<number>();
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [loadingMoreDirections, setLoadingMoreDirections] = React.useState<
    Set<FriendRequestDirection>
  >(() => new Set());
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutatingRequestIds, setMutatingRequestIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [updatingFavoriteId, setUpdatingFavoriteId] = React.useState<string>();
  const stateVersionRef = React.useRef(0);
  const reloadRequestVersionRef = React.useRef(0);
  const loadMoreRequestVersionRef = React.useRef<Record<FriendRequestDirection, number>>({
    RECEIVED: 0,
    SENT: 0,
  });
  const loadingMoreDirectionsRef = React.useRef(new Set<FriendRequestDirection>());
  const mutatingRequestIdsRef = React.useRef(new Set<string>());

  const reload = React.useCallback(async () => {
    const reloadRequestVersion = reloadRequestVersionRef.current + 1;
    reloadRequestVersionRef.current = reloadRequestVersion;
    const stateVersion = stateVersionRef.current;

    try {
      setLoading(true);
      setError(undefined);
      const [nextFriends, receivedPage, sentPage, inboxCounts] = await Promise.all([
        friendRepository.getFriends(),
        friendRepository.getFriendRequests({direction: 'RECEIVED', size: 20}),
        friendRepository.getFriendRequests({direction: 'SENT', size: 20}),
        Promise.resolve(friendRepository.getInboxCounts()).catch(() => undefined),
      ]);
      if (
        reloadRequestVersion !== reloadRequestVersionRef.current ||
        stateVersion !== stateVersionRef.current
      ) {
        return;
      }

      stateVersionRef.current += 1;
      setFriends(sortFriends(nextFriends));
      setReceivedRequests(receivedPage.items);
      setSentRequests(sentPage.items);
      setReceivedNextCursor(receivedPage.nextCursor);
      setSentNextCursor(sentPage.nextCursor);
      setIncomingRequestCount(
        inboxCounts?.incomingRequestCount ?? receivedPage.items.length,
      );
      setHasLoadedOnce(true);
    } catch (loadError) {
      if (
        reloadRequestVersion !== reloadRequestVersionRef.current ||
        stateVersion !== stateVersionRef.current
      ) {
        return;
      }
      setError(getErrorMessage(loadError, '친구 목록을 불러오지 못했습니다.'));
    } finally {
      if (reloadRequestVersion === reloadRequestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [friendRepository]);

  const loadMoreRequests = React.useCallback(
    async (direction: FriendRequestDirection) => {
      const cursor =
        direction === 'RECEIVED' ? receivedNextCursor : sentNextCursor;
      if (!cursor || loadingMoreDirectionsRef.current.has(direction)) {
        return;
      }

      const stateVersion = stateVersionRef.current;
      const loadMoreRequestVersion = loadMoreRequestVersionRef.current[direction] + 1;
      loadMoreRequestVersionRef.current[direction] = loadMoreRequestVersion;
      loadingMoreDirectionsRef.current.add(direction);
      setLoadingMoreDirections(new Set(loadingMoreDirectionsRef.current));

      try {
        const page = await friendRepository.getFriendRequests({
          cursor,
          direction,
          size: 20,
        });
        if (
          stateVersion !== stateVersionRef.current ||
          loadMoreRequestVersion !== loadMoreRequestVersionRef.current[direction]
        ) {
          return;
        }
        if (direction === 'RECEIVED') {
          setReceivedRequests(current => [...current, ...page.items]);
          setReceivedNextCursor(page.nextCursor);
          return;
        }

        setSentRequests(current => [...current, ...page.items]);
        setSentNextCursor(page.nextCursor);
      } finally {
        if (loadMoreRequestVersion === loadMoreRequestVersionRef.current[direction]) {
          loadingMoreDirectionsRef.current.delete(direction);
          setLoadingMoreDirections(new Set(loadingMoreDirectionsRef.current));
        }
      }
    },
    [friendRepository, receivedNextCursor, sentNextCursor],
  );

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const beginRequestMutation = React.useCallback((requestId: string) => {
    if (mutatingRequestIdsRef.current.has(requestId)) {
      return false;
    }

    mutatingRequestIdsRef.current.add(requestId);
    setMutatingRequestIds(new Set(mutatingRequestIdsRef.current));
    return true;
  }, []);

  const endRequestMutation = React.useCallback((requestId: string) => {
    mutatingRequestIdsRef.current.delete(requestId);
    setMutatingRequestIds(new Set(mutatingRequestIdsRef.current));
  }, []);

  const updateFavorite = React.useCallback(
    async (friend: FriendSummary) => {
      try {
        setUpdatingFavoriteId(friend.id);
        await friendRepository.updateFavorite(friend.id, !friend.favorite);
        stateVersionRef.current += 1;
        setFriends(current =>
          sortFriends(
            current.map(item =>
              item.id === friend.id ? {...item, favorite: !friend.favorite} : item,
            ),
          ),
        );
      } finally {
        setUpdatingFavoriteId(undefined);
      }
    },
    [friendRepository],
  );

  const acceptRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        const mutation = await friendRepository.acceptFriendRequest(requestId);
        stateVersionRef.current += 1;
        setReceivedRequests(current =>
          current.filter(request => request.id !== requestId),
        );
        setIncomingRequestCount(current =>
          current === undefined ? current : Math.max(0, current - 1),
        );
        const acceptedFriend = mutation.friend;
        if (acceptedFriend) {
          setFriends(current =>
            sortFriends([
              ...current.filter(friend => friend.id !== acceptedFriend.id),
              acceptedFriend,
            ]),
          );
        }
        reload().catch(() => undefined);
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, endRequestMutation, friendRepository, reload],
  );

  const declineRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        await friendRepository.declineFriendRequest(requestId);
        stateVersionRef.current += 1;
        setReceivedRequests(current =>
          current.filter(request => request.id !== requestId),
        );
        setIncomingRequestCount(current =>
          current === undefined ? current : Math.max(0, current - 1),
        );
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, endRequestMutation, friendRepository],
  );

  const cancelRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        await friendRepository.cancelFriendRequest(requestId);
        stateVersionRef.current += 1;
        setSentRequests(current =>
          current.filter(request => request.id !== requestId),
        );
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, endRequestMutation, friendRepository],
  );

  return {
    acceptRequest,
    cancelRequest,
    declineRequest,
    error,
    friends,
    hasLoadedOnce,
    incomingRequestCount,
    loading,
    loadingMoreDirections,
    loadMoreRequests,
    mutatingRequestIds,
    receivedRequests,
    receivedNextCursor,
    reload,
    sentRequests,
    sentNextCursor,
    updateFavorite,
    updatingFavoriteId,
  };
};
