import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendRequestItem, FriendSummary} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

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
  const [loadingMoreDirection, setLoadingMoreDirection] = React.useState<
    'RECEIVED' | 'SENT'
  >();
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [mutatingRequestId, setMutatingRequestId] = React.useState<string>();
  const [updatingFavoriteId, setUpdatingFavoriteId] = React.useState<string>();

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const [nextFriends, receivedPage, sentPage] = await Promise.all([
        friendRepository.getFriends(),
        friendRepository.getFriendRequests({direction: 'RECEIVED', size: 20}),
        friendRepository.getFriendRequests({direction: 'SENT', size: 20}),
      ]);
      setFriends(nextFriends);
      setReceivedRequests(receivedPage.items);
      setSentRequests(sentPage.items);
      setReceivedNextCursor(receivedPage.nextCursor);
      setSentNextCursor(sentPage.nextCursor);
    } catch (loadError) {
      setError(getErrorMessage(loadError, '친구 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [friendRepository]);

  const loadMoreRequests = React.useCallback(
    async (direction: 'RECEIVED' | 'SENT') => {
      const cursor =
        direction === 'RECEIVED' ? receivedNextCursor : sentNextCursor;
      if (!cursor) {
        return;
      }

      try {
        setLoadingMoreDirection(direction);
        const page = await friendRepository.getFriendRequests({
          cursor,
          direction,
          size: 20,
        });
        if (direction === 'RECEIVED') {
          setReceivedRequests(current => [...current, ...page.items]);
          setReceivedNextCursor(page.nextCursor);
          return;
        }

        setSentRequests(current => [...current, ...page.items]);
        setSentNextCursor(page.nextCursor);
      } finally {
        setLoadingMoreDirection(undefined);
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
        setFriends(current =>
          current
            .map(item =>
              item.id === friend.id ? {...item, favorite: !friend.favorite} : item,
            )
            .sort((left, right) => {
              if (left.favorite !== right.favorite) {
                return left.favorite ? -1 : 1;
              }
              return left.nickname.localeCompare(right.nickname, 'ko');
            }),
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
        await friendRepository.acceptFriendRequest(requestId);
        await reload();
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
        setReceivedRequests(current =>
          current.filter(request => request.id !== requestId),
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
