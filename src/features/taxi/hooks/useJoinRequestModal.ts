import React from 'react';
import {navigateToAcceptedTaxiChat} from '@/app/navigation/services/appRouteNavigation';

import {useUserDisplayNames} from '@/features/user';

import type {JoinRequest} from '../model/types';
import {
  acceptJoinRequest,
  declineJoinRequest,
} from '../services/joinRequestService';
import {useNotificationActionRepository} from './useNotificationActionRepository';
import {usePartyRepository} from './usePartyRepository';

export interface JoinRequestData {
  invitationInviterName?: string;
  partyId: string;
  requestId: string;
  requesterId?: string;
  requesterName?: string;
}

export interface UseJoinRequestModalResult {
  handleAccept: () => Promise<void>;
  handleDecline: () => Promise<void>;
  handleJoinRequestAccepted: (partyId: string) => void;
  handleRequestClose: () => void;
  joinData: JoinRequestData | null;
  requesterName: string;
  setJoinData: React.Dispatch<React.SetStateAction<JoinRequestData | null>>;
}

interface UseJoinRequestModalOptions {
  activeLeaderPartyId?: string | null;
  enabled?: boolean;
  userId: string | undefined;
}

const isPendingJoinRequest = (request: JoinRequest) => request.status === 'pending';

const getJoinRequestCreatedAtMs = (createdAt: JoinRequest['createdAt']) => {
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  if (typeof createdAt === 'string') {
    const parsedDate = new Date(createdAt);
    return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
  }

  return 0;
};

const compareJoinRequestsByCreatedAt = (left: JoinRequest, right: JoinRequest) => {
  const createdAtDiff =
    getJoinRequestCreatedAtMs(left.createdAt) -
    getJoinRequestCreatedAtMs(right.createdAt);

  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return left.id.localeCompare(right.id);
};

export function useJoinRequestModal({
  activeLeaderPartyId,
  enabled = true,
  userId,
}: UseJoinRequestModalOptions): UseJoinRequestModalResult {
  const notificationActionRepository = useNotificationActionRepository();
  const partyRepository = usePartyRepository();
  const [pendingRequests, setPendingRequests] = React.useState<JoinRequest[]>([]);
  const [suppressedRequestIds, setSuppressedRequestIds] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (!enabled || !activeLeaderPartyId) {
      setPendingRequests([]);
      setSuppressedRequestIds([]);
      return;
    }

    const unsubscribe = partyRepository.subscribeToJoinRequests(
      activeLeaderPartyId,
      {
        onData: requests => {
          const nextPendingRequests = [...requests]
            .filter(isPendingJoinRequest)
            .sort(compareJoinRequestsByCreatedAt);

          setPendingRequests(nextPendingRequests);
          setSuppressedRequestIds(currentIds =>
            currentIds.filter(requestId =>
              nextPendingRequests.some(request => request.id === requestId),
            ),
          );
        },
        onError: error => {
          console.error('동승 요청 목록 구독 실패:', error);
        },
      },
    );

    return unsubscribe;
  }, [activeLeaderPartyId, enabled, partyRepository]);

  const suppressJoinRequest = React.useCallback((requestId: string) => {
    setSuppressedRequestIds(currentIds => {
      if (currentIds.includes(requestId)) {
        return currentIds;
      }

      return [...currentIds, requestId];
    });
  }, []);

  const restoreJoinRequest = React.useCallback((requestId: string) => {
    setSuppressedRequestIds(currentIds =>
      currentIds.filter(currentId => currentId !== requestId),
    );
  }, []);

  const currentJoinRequest = React.useMemo(
    () =>
      pendingRequests.find(
        request => !suppressedRequestIds.includes(request.id),
      ) ?? null,
    [pendingRequests, suppressedRequestIds],
  );

  const joinData = React.useMemo<JoinRequestData | null>(() => {
    if (!currentJoinRequest) {
      return null;
    }

    return {
      invitationInviterName: currentJoinRequest.invitationInviterName,
      partyId: currentJoinRequest.partyId,
      requestId: currentJoinRequest.id,
      requesterId: currentJoinRequest.requesterId,
      requesterName: currentJoinRequest.requesterName,
    };
  }, [currentJoinRequest]);

  const setJoinData = React.useCallback<
    React.Dispatch<React.SetStateAction<JoinRequestData | null>>
  >(_nextState => {
    // 앱이 살아 있는 동안에는 push payload 대신 SSE snapshot을 source of truth로 사용한다.
  }, []);

  const {displayNameMap} = useUserDisplayNames(
    currentJoinRequest?.requesterId && !currentJoinRequest.requesterName
      ? [currentJoinRequest.requesterId]
      : [],
  );

  const requesterName = currentJoinRequest?.requesterName
    ? currentJoinRequest.requesterName
    : currentJoinRequest?.requesterId
    ? displayNameMap[currentJoinRequest.requesterId] || '익명'
    : '새 요청';

  const handleAccept = React.useCallback(async () => {
    if (!currentJoinRequest || !userId) {
      return;
    }

    suppressJoinRequest(currentJoinRequest.id);

    try {
      await acceptJoinRequest({
        leaderId: userId,
        notificationActionRepository,
        partyId: currentJoinRequest.partyId,
        partyRepository,
        requestId: currentJoinRequest.id,
      });
    } catch (error) {
      restoreJoinRequest(currentJoinRequest.id);
      throw error;
    }
  }, [
    currentJoinRequest,
    notificationActionRepository,
    partyRepository,
    restoreJoinRequest,
    suppressJoinRequest,
    userId,
  ]);

  const handleDecline = React.useCallback(async () => {
    if (!currentJoinRequest || !userId) {
      return;
    }

    suppressJoinRequest(currentJoinRequest.id);

    try {
      await declineJoinRequest({
        leaderId: userId,
        notificationActionRepository,
        partyId: currentJoinRequest.partyId,
        partyRepository,
        requestId: currentJoinRequest.id,
      });
    } catch (error) {
      restoreJoinRequest(currentJoinRequest.id);
      throw error;
    }
  }, [
    currentJoinRequest,
    notificationActionRepository,
    partyRepository,
    restoreJoinRequest,
    suppressJoinRequest,
    userId,
  ]);

  const handleRequestClose = React.useCallback(() => {
    if (!currentJoinRequest) {
      return;
    }

    suppressJoinRequest(currentJoinRequest.id);
  }, [currentJoinRequest, suppressJoinRequest]);

  const handleJoinRequestAccepted = React.useCallback((partyId: string) => {
    navigateToAcceptedTaxiChat(partyId);
  }, []);

  return {
    handleAccept,
    handleDecline,
    handleJoinRequestAccepted,
    handleRequestClose,
    joinData,
    requesterName,
    setJoinData,
  };
}
