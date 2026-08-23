import React from 'react';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_INBOX_COUNTS_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendInvitationRepository} from '@/di';
import {RepositoryError} from '@/shared/lib/errors';

import type {FriendInvitation} from '../model/friend';

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

const isUncertainMutationError = (error: unknown) =>
  error instanceof RepositoryError && error.isRetryable();

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
  const [pendingCount, setPendingCount] = React.useState<number>();
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [mutatingIds, setMutatingIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const mutatingIdsRef = React.useRef(new Set<string>());
  const pendingReconciliationRef = React.useRef(
    new Map<string, FriendInvitation['type']>(),
  );
  const listStateVersionRef = React.useRef(0);
  const reloadVersionRef = React.useRef(0);

  const releaseReconciledMutations = React.useCallback(
    (type: FriendInvitation['type']) => {
      let changed = false;

      pendingReconciliationRef.current.forEach((pendingType, invitationId) => {
        if (pendingType !== type) {
          return;
        }

        pendingReconciliationRef.current.delete(invitationId);
        changed = mutatingIdsRef.current.delete(invitationId) || changed;
      });

      if (changed) {
        setMutatingIds(new Set(mutatingIdsRef.current));
      }
    },
    [],
  );

  const reload = React.useCallback(async () => {
    const requestVersion = reloadVersionRef.current + 1;
    reloadVersionRef.current = requestVersion;
    const listStateVersion = listStateVersionRef.current;
    const isCurrent = () =>
      requestVersion === reloadVersionRef.current &&
      listStateVersion === listStateVersionRef.current;

    setLoading(true);
    setPartyError(undefined);
    setChatError(undefined);
    const [partyResult, chatResult, countsResult] = await Promise.all([
      settle(() => repository.getReceivedPartyInvitations()),
      settle(() => repository.getReceivedChatRoomInvitations()),
      settle(() => repository.getInboxCounts()),
    ]);

    if (partyResult.ok && isCurrent()) {
      setPartyInvitations(partyResult.value);
      releaseReconciledMutations('PARTY');
    } else if (!partyResult.ok && isCurrent()) {
      setPartyError(
        getErrorMessage(
          partyResult.error,
          '택시파티 초대를 불러오지 못했습니다.',
        ),
      );
    }

    if (chatResult.ok && isCurrent()) {
      setChatInvitations(chatResult.value);
      releaseReconciledMutations('CHAT_ROOM');
    } else if (!chatResult.ok && isCurrent()) {
      setChatError(
        getErrorMessage(
          chatResult.error,
          '채팅방 초대를 불러오지 못했습니다.',
        ),
      );
    }

    if (isCurrent()) {
      if (countsResult.ok) {
        setPendingCount(
          countsResult.value.partyInvitationCount +
            countsResult.value.chatRoomInvitationCount,
        );
      } else if (partyResult.ok && chatResult.ok) {
        setPendingCount(
          [...partyResult.value, ...chatResult.value].filter(
            invitation => invitation.status === 'PENDING',
          ).length,
        );
      }
      setHasLoaded(true);
      setLoading(false);
    }
  }, [releaseReconciledMutations, repository]);

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
    (invitation: FriendInvitation) => {
      listStateVersionRef.current += 1;
      reloadVersionRef.current += 1;
      setLoading(false);
      const {id: invitationId, type} = invitation;
      if (type === 'PARTY') {
        setPartyInvitations(current =>
          current.filter(item => item.id !== invitationId),
        );
      } else {
        setChatInvitations(current =>
          current.filter(item => item.id !== invitationId),
        );
      }
      if (invitation.status === 'PENDING') {
        setPendingCount(current =>
          current === undefined ? current : Math.max(0, current - 1),
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

      let keepMutationLocked = false;
      const submitAcceptance = () =>
        invitation.type === 'PARTY'
          ? repository.acceptPartyInvitation(invitation.id)
          : repository.acceptChatRoomInvitation(invitation.id);

      try {
        const mutation = await submitAcceptance();
        removeInvitation(invitation);
        return mutation;
      } catch (error) {
        if (isUncertainMutationError(error)) {
          try {
            const reconciledMutation = await submitAcceptance();
            removeInvitation(invitation);
            return reconciledMutation;
          } catch (reconciliationError) {
            pendingReconciliationRef.current.set(
              invitation.id,
              invitation.type,
            );
            await reload();
            keepMutationLocked = pendingReconciliationRef.current.has(
              invitation.id,
            );
            throw reconciliationError;
          }
        }

        pendingReconciliationRef.current.set(invitation.id, invitation.type);
        await reload();
        keepMutationLocked = pendingReconciliationRef.current.has(
          invitation.id,
        );
        throw error;
      } finally {
        if (!keepMutationLocked) {
          pendingReconciliationRef.current.delete(invitation.id);
          endMutation(invitation.id);
        }
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
        removeInvitation(invitation);
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
        removeInvitation(invitation);
      } finally {
        endMutation(invitation.id);
      }
    }, [beginMutation, endMutation, removeInvitation, repository],
  );

  const invitations = React.useMemo(
    () => sortInvitations([...partyInvitations, ...chatInvitations]),
    [chatInvitations, partyInvitations],
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
