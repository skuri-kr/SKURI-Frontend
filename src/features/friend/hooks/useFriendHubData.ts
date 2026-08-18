import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendRequestItem, FriendSummary} from '../model/friend';

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
  const [loadingMoreDirection, setLoadingMoreDirection] = React.useState<
    'RECEIVED' | 'SENT'
  >();
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutatingRequestId, setMutatingRequestId] = React.useState<string>();
  const [updatingFavoriteId, setUpdatingFavoriteId] = React.useState<string>();
  const stateVersionRef = React.useRef(0);
  const reloadRequestVersionRef = React.useRef(0);
  const loadMoreRequestVersionRef = React.useRef(0);

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
    async (direction: 'RECEIVED' | 'SENT') => {
      const cursor =
        direction === 'RECEIVED' ? receivedNextCursor : sentNextCursor;
      if (!cursor) {
        return;
      }

      const stateVersion = stateVersionRef.current;
      const loadMoreRequestVersion = loadMoreRequestVersionRef.current + 1;
      loadMoreRequestVersionRef.current = loadMoreRequestVersion;

      try {
        setLoadingMoreDirection(direction);
        const page = await friendRepository.getFriendRequests({
          cursor,
          direction,
          size: 20,
        });
        if (
          stateVersion !== stateVersionRef.current ||
          loadMoreRequestVersion !== loadMoreRequestVersionRef.current
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
        if (loadMoreRequestVersion === loadMoreRequestVersionRef.current) {
          setLoadingMoreDirection(undefined);
        }
      }
    },
    [friendRepository, receivedNextCursor, sentNextCursor],
  );

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

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
      try {
        setMutatingRequestId(requestId);
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
        setMutatingRequestId(undefined);
      }
    },
    [friendRepository, reload],
  );

  const declineRequest = React.useCallback(
    async (requestId: string) => {
      try {
        setMutatingRequestId(requestId);
        await friendRepository.declineFriendRequest(requestId);
        stateVersionRef.current += 1;
        setReceivedRequests(current =>
          current.filter(request => request.id !== requestId),
        );
        setIncomingRequestCount(current =>
          current === undefined ? current : Math.max(0, current - 1),
        );
      } finally {
        setMutatingRequestId(undefined);
      }
    },
    [friendRepository],
  );

  const cancelRequest = React.useCallback(
    async (requestId: string) => {
      try {
        setMutatingRequestId(requestId);
        await friendRepository.cancelFriendRequest(requestId);
        stateVersionRef.current += 1;
        setSentRequests(current =>
          current.filter(request => request.id !== requestId),
        );
      } finally {
        setMutatingRequestId(undefined);
      }
    },
    [friendRepository],
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
    loadingMoreDirection,
    loadMoreRequests,
    mutatingRequestId,
    receivedRequests,
    receivedNextCursor,
    reload,
    sentRequests,
    sentNextCursor,
    updateFavorite,
    updatingFavoriteId,
  };
};
