import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendRequestItem, FriendSummary} from '../model/friend';

type FriendRequestDirection = 'RECEIVED' | 'SENT';
type FriendHubReloadScope = Partial<{
  friends: boolean;
  receivedRequests: boolean;
  sentRequests: boolean;
}>;
type AsyncResult<T> = {error: unknown; ok: false} | {ok: true; value: T};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const sortFriends = (friends: FriendSummary[]) =>
  [...friends].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }
    const nicknameComparison = left.nickname.localeCompare(right.nickname, 'ko');
    return nicknameComparison || left.id.localeCompare(right.id);
  });

const settle = <T,>(operation: () => Promise<T>): Promise<AsyncResult<T>> =>
  Promise.resolve()
    .then(operation)
    .then(value => ({ok: true, value} as const))
    .catch(error => ({error, ok: false} as const));

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
  const [hasLoadedFriends, setHasLoadedFriends] = React.useState(false);
  const [hasLoadedReceivedRequests, setHasLoadedReceivedRequests] = React.useState(false);
  const [hasLoadedSentRequests, setHasLoadedSentRequests] = React.useState(false);
  const [loadingMoreDirections, setLoadingMoreDirections] = React.useState<
    Set<FriendRequestDirection>
  >(() => new Set());
  const [friendError, setFriendError] = React.useState<string>();
  const [receivedRequestsError, setReceivedRequestsError] = React.useState<string>();
  const [sentRequestsError, setSentRequestsError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutatingRequestIds, setMutatingRequestIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const stateVersionRef = React.useRef(0);
  const requestListVersionsRef = React.useRef<Record<FriendRequestDirection, number>>({
    RECEIVED: 0,
    SENT: 0,
  });
  const reloadRequestVersionRef = React.useRef(0);
  const loadMoreRequestVersionRef = React.useRef<Record<FriendRequestDirection, number>>({
    RECEIVED: 0,
    SENT: 0,
  });
  const loadingMoreDirectionsRef = React.useRef(new Set<FriendRequestDirection>());
  const mutatingRequestIdsRef = React.useRef(new Set<string>());
  const updatingFavoriteIdsRef = React.useRef(new Set<string>());

  const reload = React.useCallback(async (scope?: FriendHubReloadScope) => {
    const shouldLoadFriends = scope?.friends ?? true;
    const shouldLoadReceivedRequests = scope?.receivedRequests ?? true;
    const shouldLoadSentRequests = scope?.sentRequests ?? true;
    const reloadRequestVersion = reloadRequestVersionRef.current + 1;
    reloadRequestVersionRef.current = reloadRequestVersion;
    const stateVersion = stateVersionRef.current;

    try {
      setLoading(true);
      if (shouldLoadFriends) {
        setFriendError(undefined);
      }
      if (shouldLoadReceivedRequests) {
        setReceivedRequestsError(undefined);
      }
      if (shouldLoadSentRequests) {
        setSentRequestsError(undefined);
      }
      const [friendsResult, receivedRequestsResult, sentRequestsResult, inboxCountsResult] = await Promise.all([
        shouldLoadFriends ? settle(() => friendRepository.getFriends()) : undefined,
        shouldLoadReceivedRequests
          ? settle(() => friendRepository.getFriendRequests({direction: 'RECEIVED', size: 20}))
          : undefined,
        shouldLoadSentRequests
          ? settle(() => friendRepository.getFriendRequests({direction: 'SENT', size: 20}))
          : undefined,
        shouldLoadReceivedRequests ? settle(() => friendRepository.getInboxCounts()) : undefined,
      ]);
      if (
        reloadRequestVersion !== reloadRequestVersionRef.current ||
        stateVersion !== stateVersionRef.current
      ) {
        return;
      }

      let hasUpdatedState = false;
      const updatedRequestDirections = new Set<FriendRequestDirection>();
      if (friendsResult?.ok) {
        setFriends(sortFriends(friendsResult.value));
        setHasLoadedFriends(true);
        hasUpdatedState = true;
      } else if (friendsResult) {
        setFriendError(getErrorMessage(friendsResult.error, '친구 목록을 불러오지 못했습니다.'));
      }

      if (receivedRequestsResult?.ok) {
        setReceivedRequests(receivedRequestsResult.value.items);
        setReceivedNextCursor(receivedRequestsResult.value.nextCursor);
        setHasLoadedReceivedRequests(true);
        hasUpdatedState = true;
        updatedRequestDirections.add('RECEIVED');
      } else if (receivedRequestsResult) {
        setReceivedRequestsError(
          getErrorMessage(receivedRequestsResult.error, '받은 친구 요청을 불러오지 못했습니다.'),
        );
      }

      if (sentRequestsResult?.ok) {
        setSentRequests(sentRequestsResult.value.items);
        setSentNextCursor(sentRequestsResult.value.nextCursor);
        setHasLoadedSentRequests(true);
        hasUpdatedState = true;
        updatedRequestDirections.add('SENT');
      } else if (sentRequestsResult) {
        setSentRequestsError(
          getErrorMessage(sentRequestsResult.error, '보낸 친구 요청을 불러오지 못했습니다.'),
        );
      }

      if (inboxCountsResult?.ok) {
        setIncomingRequestCount(inboxCountsResult.value.incomingRequestCount);
      } else if (receivedRequestsResult?.ok) {
        setIncomingRequestCount(current => current ?? receivedRequestsResult.value.items.length);
      }

      if (hasUpdatedState) {
        stateVersionRef.current += 1;
      }
      updatedRequestDirections.forEach(direction => {
        requestListVersionsRef.current[direction] += 1;
      });
    } finally {
      if (reloadRequestVersion === reloadRequestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [friendRepository]);

  const reloadFriends = React.useCallback(
    () => reload({friends: true, receivedRequests: false, sentRequests: false}),
    [reload],
  );

  const reloadRequestDirection = React.useCallback(
    (direction: FriendRequestDirection) =>
      reload({
        friends: false,
        receivedRequests: direction === 'RECEIVED',
        sentRequests: direction === 'SENT',
      }),
    [reload],
  );

  const loadMoreRequests = React.useCallback(
    async (direction: FriendRequestDirection) => {
      const cursor =
        direction === 'RECEIVED' ? receivedNextCursor : sentNextCursor;
      if (!cursor || loadingMoreDirectionsRef.current.has(direction)) {
        return;
      }

      const requestListVersion = requestListVersionsRef.current[direction];
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
          requestListVersion !== requestListVersionsRef.current[direction] ||
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

  const beginFavoriteUpdate = React.useCallback((friendId: string) => {
    if (updatingFavoriteIdsRef.current.has(friendId)) {
      return false;
    }

    updatingFavoriteIdsRef.current.add(friendId);
    setUpdatingFavoriteIds(new Set(updatingFavoriteIdsRef.current));
    return true;
  }, []);

  const endFavoriteUpdate = React.useCallback((friendId: string) => {
    updatingFavoriteIdsRef.current.delete(friendId);
    setUpdatingFavoriteIds(new Set(updatingFavoriteIdsRef.current));
  }, []);

  const updateFavorite = React.useCallback(
    async (friend: FriendSummary) => {
      if (!beginFavoriteUpdate(friend.id)) {
        return;
      }

      try {
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
        endFavoriteUpdate(friend.id);
      }
    },
    [beginFavoriteUpdate, endFavoriteUpdate, friendRepository],
  );

  const acceptRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        const mutation = await friendRepository.acceptFriendRequest(requestId);
        stateVersionRef.current += 1;
        requestListVersionsRef.current.RECEIVED += 1;
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
        reload({friends: true, receivedRequests: false, sentRequests: false}).catch(() => undefined);
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
        requestListVersionsRef.current.RECEIVED += 1;
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
        requestListVersionsRef.current.SENT += 1;
        setSentRequests(current =>
          current.filter(request => request.id !== requestId),
        );
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, endRequestMutation, friendRepository],
  );

  const hasLoadedOnce = hasLoadedFriends || hasLoadedReceivedRequests || hasLoadedSentRequests;
  const error = friendError ?? receivedRequestsError ?? sentRequestsError;

  return {
    acceptRequest,
    cancelRequest,
    declineRequest,
    error,
    friendError,
    friends,
    hasLoadedFriends,
    hasLoadedOnce,
    hasLoadedReceivedRequests,
    hasLoadedSentRequests,
    incomingRequestCount,
    loading,
    loadingMoreDirections,
    loadMoreRequests,
    mutatingRequestIds,
    receivedRequests,
    receivedNextCursor,
    receivedRequestsError,
    reload,
    reloadFriends,
    reloadRequestDirection,
    sentRequests,
    sentNextCursor,
    sentRequestsError,
    updateFavorite,
    updatingFavoriteIds,
  };
};
