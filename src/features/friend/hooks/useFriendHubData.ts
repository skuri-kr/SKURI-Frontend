import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendRequestItem, FriendSummary} from '../model/friend';

type FriendRequestDirection = 'RECEIVED' | 'SENT';
type FriendHubReloadTarget = 'friends' | FriendRequestDirection;
type FriendRequestCompletion = 'ACCEPTED' | 'CANCELED' | 'DECLINED';
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

const REQUEST_COMPLETION_DURATION_MS = 1200;

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
  const [completedRequestActions, setCompletedRequestActions] = React.useState<
    Map<string, FriendRequestCompletion>
  >(() => new Map());
  const sectionStateVersionsRef = React.useRef<
    Record<FriendHubReloadTarget, number>
  >({
    RECEIVED: 0,
    SENT: 0,
    friends: 0,
  });
  const requestListVersionsRef = React.useRef<
    Record<FriendRequestDirection, number>
  >({
    RECEIVED: 0,
    SENT: 0,
  });
  const reloadVersionsRef = React.useRef<Record<FriendHubReloadTarget, number>>(
    {
      RECEIVED: 0,
      SENT: 0,
      friends: 0,
    },
  );
  const loadMoreRequestVersionRef = React.useRef<
    Record<FriendRequestDirection, number>
  >({
    RECEIVED: 0,
    SENT: 0,
  });
  const loadingReloadTargetsRef = React.useRef(
    new Set<FriendHubReloadTarget>(),
  );
  const loadingMoreDirectionsRef = React.useRef(
    new Set<FriendRequestDirection>(),
  );
  const mutatingRequestIdsRef = React.useRef(new Set<string>());
  const updatingFavoriteIdsRef = React.useRef(new Set<string>());
  const requestCompletionTimersRef = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  const reload = React.useCallback(
    async (scope?: FriendHubReloadScope) => {
      const shouldLoadFriends = scope?.friends ?? true;
      const shouldLoadReceivedRequests = scope?.receivedRequests ?? true;
      const shouldLoadSentRequests = scope?.sentRequests ?? true;
      const targets = [
        ...(shouldLoadFriends ? ['friends'] : []),
        ...(shouldLoadReceivedRequests ? ['RECEIVED'] : []),
        ...(shouldLoadSentRequests ? ['SENT'] : []),
      ] as FriendHubReloadTarget[];
      const reloadVersions = targets.reduce<
        Partial<Record<FriendHubReloadTarget, number>>
      >((versions, target) => {
        const nextVersion = reloadVersionsRef.current[target] + 1;
        reloadVersionsRef.current[target] = nextVersion;
        versions[target] = nextVersion;
        return versions;
      }, {});
      const sectionStateVersions = targets.reduce<
        Partial<Record<FriendHubReloadTarget, number>>
      >((versions, target) => {
        versions[target] = sectionStateVersionsRef.current[target];
        return versions;
      }, {});
      const isCurrent = (target: FriendHubReloadTarget) =>
        reloadVersions[target] === reloadVersionsRef.current[target] &&
        sectionStateVersions[target] ===
          sectionStateVersionsRef.current[target] &&
        (target !== 'friends' || updatingFavoriteIdsRef.current.size === 0);

      targets.forEach(target => loadingReloadTargetsRef.current.add(target));

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
        const [
          friendsResult,
          receivedRequestsResult,
          sentRequestsResult,
          inboxCountsResult,
        ] = await Promise.all([
          shouldLoadFriends
            ? settle(() => friendRepository.getFriends())
            : undefined,
          shouldLoadReceivedRequests
            ? settle(() =>
                friendRepository.getFriendRequests({
                  direction: 'RECEIVED',
                  size: 20,
                }),
              )
            : undefined,
          shouldLoadSentRequests
            ? settle(() =>
                friendRepository.getFriendRequests({
                  direction: 'SENT',
                  size: 20,
                }),
              )
            : undefined,
          shouldLoadReceivedRequests
            ? settle(() => friendRepository.getInboxCounts())
            : undefined,
        ]);
        if (friendsResult?.ok && isCurrent('friends')) {
          setFriends(sortFriends(friendsResult.value));
          setHasLoadedFriends(true);
        } else if (friendsResult && !friendsResult.ok && isCurrent('friends')) {
          setFriendError(
            getErrorMessage(
              friendsResult.error,
              '친구 목록을 불러오지 못했습니다.',
            ),
          );
        }

        if (receivedRequestsResult?.ok && isCurrent('RECEIVED')) {
          setReceivedRequests(receivedRequestsResult.value.items);
          setReceivedNextCursor(receivedRequestsResult.value.nextCursor);
          setHasLoadedReceivedRequests(true);
          requestListVersionsRef.current.RECEIVED += 1;
        } else if (
          receivedRequestsResult &&
          !receivedRequestsResult.ok &&
          isCurrent('RECEIVED')
        ) {
          setReceivedRequestsError(
            getErrorMessage(
              receivedRequestsResult.error,
              '받은 친구 요청을 불러오지 못했습니다.',
            ),
          );
        }

        if (sentRequestsResult?.ok && isCurrent('SENT')) {
          setSentRequests(sentRequestsResult.value.items);
          setSentNextCursor(sentRequestsResult.value.nextCursor);
          setHasLoadedSentRequests(true);
          requestListVersionsRef.current.SENT += 1;
        } else if (
          sentRequestsResult &&
          !sentRequestsResult.ok &&
          isCurrent('SENT')
        ) {
          setSentRequestsError(
            getErrorMessage(
              sentRequestsResult.error,
              '보낸 친구 요청을 불러오지 못했습니다.',
            ),
          );
        }

        if (inboxCountsResult?.ok && isCurrent('RECEIVED')) {
          setIncomingRequestCount(inboxCountsResult.value.incomingRequestCount);
        } else if (receivedRequestsResult?.ok && isCurrent('RECEIVED')) {
          setIncomingRequestCount(
            current => current ?? receivedRequestsResult.value.items.length,
          );
        }
      } finally {
        targets.forEach(target => {
          if (reloadVersions[target] === reloadVersionsRef.current[target]) {
            loadingReloadTargetsRef.current.delete(target);
          }
        });
        setLoading(loadingReloadTargetsRef.current.size > 0);
      }
    },
    [friendRepository],
  );

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

  React.useEffect(
    () => () => {
      requestCompletionTimersRef.current.forEach(timer => clearTimeout(timer));
      requestCompletionTimersRef.current.clear();
    },
    [],
  );

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

  const completeRequest = React.useCallback(
    (requestId: string, completion: FriendRequestCompletion) => {
      setCompletedRequestActions(current => {
        const next = new Map(current);
        next.set(requestId, completion);
        return next;
      });

      const existingTimer = requestCompletionTimersRef.current.get(requestId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      requestCompletionTimersRef.current.set(
        requestId,
        setTimeout(() => {
          requestCompletionTimersRef.current.delete(requestId);
          setCompletedRequestActions(current => {
            const next = new Map(current);
            next.delete(requestId);
            return next;
          });
          setReceivedRequests(current =>
            current.filter(request => request.id !== requestId),
          );
          setSentRequests(current =>
            current.filter(request => request.id !== requestId),
          );
        }, REQUEST_COMPLETION_DURATION_MS),
      );
    },
    [],
  );

  const updateFavorite = React.useCallback(
    async (friend: FriendSummary) => {
      if (!beginFavoriteUpdate(friend.id)) {
        return;
      }

      try {
        sectionStateVersionsRef.current.friends += 1;
        setFriends(current =>
          sortFriends(
            current.map(item =>
              item.id === friend.id
                ? {...item, favorite: !friend.favorite}
                : item,
            ),
          ),
        );
        await friendRepository.updateFavorite(friend.id, !friend.favorite);
        sectionStateVersionsRef.current.friends += 1;
      } catch (favoriteError) {
        sectionStateVersionsRef.current.friends += 1;
        setFriends(current =>
          sortFriends(
            current.map(item =>
              item.id === friend.id
                ? {...item, favorite: friend.favorite}
                : item,
            ),
          ),
        );
        throw favoriteError;
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
        sectionStateVersionsRef.current.friends += 1;
        sectionStateVersionsRef.current.RECEIVED += 1;
        requestListVersionsRef.current.RECEIVED += 1;
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
        reload({
          friends: true,
          receivedRequests: false,
          sentRequests: false,
        }).catch(() => undefined);
        completeRequest(requestId, 'ACCEPTED');
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, completeRequest, endRequestMutation, friendRepository, reload],
  );

  const declineRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        await friendRepository.declineFriendRequest(requestId);
        sectionStateVersionsRef.current.RECEIVED += 1;
        requestListVersionsRef.current.RECEIVED += 1;
        setIncomingRequestCount(current =>
          current === undefined ? current : Math.max(0, current - 1),
        );
        completeRequest(requestId, 'DECLINED');
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, completeRequest, endRequestMutation, friendRepository],
  );

  const cancelRequest = React.useCallback(
    async (requestId: string) => {
      if (!beginRequestMutation(requestId)) {
        return;
      }

      try {
        await friendRepository.cancelFriendRequest(requestId);
        sectionStateVersionsRef.current.SENT += 1;
        requestListVersionsRef.current.SENT += 1;
        completeRequest(requestId, 'CANCELED');
      } finally {
        endRequestMutation(requestId);
      }
    },
    [beginRequestMutation, completeRequest, endRequestMutation, friendRepository],
  );

  const hasLoadedOnce = hasLoadedFriends || hasLoadedReceivedRequests || hasLoadedSentRequests;
  const error = friendError ?? receivedRequestsError ?? sentRequestsError;

  return {
    acceptRequest,
    cancelRequest,
    completedRequestActions,
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
