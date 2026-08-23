import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_INBOX_COUNTS_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendInvitationRepository} from '@/di';

import type {FriendInvitation} from '../model/friend';

type InvitationType = FriendInvitation['type'];
type AsyncResult<T> = {error: unknown; ok: false} | {ok: true; value: T};

const settle = <T,>(operation: () => Promise<T>): Promise<AsyncResult<T>> =>
  Promise.resolve()
    .then(operation)
    .then(value => ({ok: true, value} as const))
    .catch(error => ({error, ok: false} as const));

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const sortInvitations = (invitations: FriendInvitation[]) =>
  [...invitations].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
      right.id.localeCompare(left.id),
  );

export const useFriendInvitationsData = () => {
  const repository = useFriendInvitationRepository();
  const [partyInvitations, setPartyInvitations] = React.useState<
    FriendInvitation[]
  >([]);
  const [chatInvitations, setChatInvitations] = React.useState<
    FriendInvitation[]
  >([]);
  const [partyError, setPartyError] = React.useState<string>();
  const [chatError, setChatError] = React.useState<string>();
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [mutatingIds, setMutatingIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const mutatingIdsRef = React.useRef(new Set<string>());

  const reload = React.useCallback(async () => {
    setLoading(true);
    setPartyError(undefined);
    setChatError(undefined);
    const [partyResult, chatResult] = await Promise.all([
      settle(() => repository.getReceivedPartyInvitations()),
      settle(() => repository.getReceivedChatRoomInvitations()),
    ]);

    if (partyResult.ok) {
      setPartyInvitations(partyResult.value);
    } else {
      setPartyError(
        getErrorMessage(
          partyResult.error,
          '택시파티 초대를 불러오지 못했습니다.',
        ),
      );
    }

    if (chatResult.ok) {
      setChatInvitations(chatResult.value);
    } else {
      setChatError(
        getErrorMessage(
          chatResult.error,
          '채팅방 초대를 불러오지 못했습니다.',
        ),
      );
    }

    setHasLoaded(true);
    setLoading(false);
  }, [repository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const beginMutation = React.useCallback((invitationId: string) => {
    if (mutatingIdsRef.current.has(invitationId)) {
      return false;
    }

    mutatingIdsRef.current.add(invitationId);
    setMutatingIds(new Set(mutatingIdsRef.current));
    return true;
  }, []);

  const endMutation = React.useCallback((invitationId: string) => {
    mutatingIdsRef.current.delete(invitationId);
    setMutatingIds(new Set(mutatingIdsRef.current));
  }, []);

  const removeInvitation = React.useCallback(
    (invitationId: string, type: InvitationType) => {
      if (type === 'PARTY') {
        setPartyInvitations(current =>
          current.filter(invitation => invitation.id !== invitationId),
        );
      } else {
        setChatInvitations(current =>
          current.filter(invitation => invitation.id !== invitationId),
        );
      }
      invalidateData(FRIEND_INBOX_COUNTS_INVALIDATION_KEY);
    },
    [],
  );

  const acceptInvitation = React.useCallback(
    async (invitation: FriendInvitation) => {
      if (!beginMutation(invitation.id)) {
        return null;
      }

      try {
        const mutation =
          invitation.type === 'PARTY'
            ? await repository.acceptPartyInvitation(invitation.id)
            : await repository.acceptChatRoomInvitation(invitation.id);
        removeInvitation(invitation.id, invitation.type);
        return mutation;
      } catch (error) {
        reload().catch(() => undefined);
        throw error;
      } finally {
        endMutation(invitation.id);
      }
    }, [beginMutation, endMutation, reload, removeInvitation, repository],
  );

  const declineInvitation = React.useCallback(
    async (invitation: FriendInvitation) => {
      if (!beginMutation(invitation.id)) {
        return;
      }

      try {
        if (invitation.type === 'PARTY') {
          await repository.declinePartyInvitation(invitation.id);
        } else {
          await repository.declineChatRoomInvitation(invitation.id);
        }
        removeInvitation(invitation.id, invitation.type);
      } catch (error) {
        reload().catch(() => undefined);
        throw error;
      } finally {
        endMutation(invitation.id);
      }
    }, [beginMutation, endMutation, reload, removeInvitation, repository],
  );

  const deleteInvitation = React.useCallback(
    async (invitation: FriendInvitation) => {
      if (!beginMutation(invitation.id)) {
        return;
      }

      try {
        if (invitation.type === 'PARTY') {
          await repository.deletePartyInvitation(invitation.id);
        } else {
          await repository.deleteChatRoomInvitation(invitation.id);
        }
        removeInvitation(invitation.id, invitation.type);
      } finally {
        endMutation(invitation.id);
      }
    }, [beginMutation, endMutation, removeInvitation, repository],
  );

  const invitations = React.useMemo(
    () => sortInvitations([...partyInvitations, ...chatInvitations]),
    [chatInvitations, partyInvitations],
  );
  const pendingCount = React.useMemo(
    () => invitations.filter(invitation => invitation.status === 'PENDING').length,
    [invitations],
  );

  return {
    acceptInvitation,
    chatError,
    declineInvitation,
    deleteInvitation,
    hasLoaded,
    invitations,
    loading,
    mutatingIds,
    partyError,
    pendingCount,
    reload,
  };
};
