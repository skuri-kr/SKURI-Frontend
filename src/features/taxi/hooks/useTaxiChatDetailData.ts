import React from 'react';
import {usePartyRepository, useTaxiChatRepository} from '@/di/useRepository';
import {useAuth} from '@/features/auth';

import {
  TAXI_CHAT_CURRENT_USER_ID,
  type TaxiChatAccountMessageDraft,
  type TaxiChatImageUploadInput,
  type TaxiChatSourceData,
  type TaxiChatViewData,
} from '../model/taxiChatViewData';
import {buildTaxiChatViewData} from '../application/taxiChatDetailAssembler';

const wait = (timeoutMs: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, timeoutMs);
  });

const buildSettlementDraft = (
  partyChat: TaxiChatSourceData,
  payload: {
    account: {
      accountHolder: string;
      accountNumber: string;
      bankName: string;
      hideName: boolean;
    };
    settlementTargetMemberIds: string[];
    taxiFare: number;
  },
) => {
  const settlementTargets = partyChat.participants.filter(
    participant =>
      !participant.isLeader &&
      payload.settlementTargetMemberIds.includes(participant.id),
  );

  if (settlementTargets.length === 0) {
    throw new Error('동승 멤버가 있어야 도착 처리할 수 있습니다.');
  }

  const splitMemberCount = settlementTargets.length + 1;

  return {
    account: {
      accountHolder: payload.account.accountHolder,
      accountNumber: payload.account.accountNumber,
      bankName: payload.account.bankName,
      hideName: payload.account.hideName,
    },
    members: settlementTargets.reduce<Record<string, {settled: boolean}>>(
      (accumulator, participant) => {
        accumulator[participant.id] = {
          settled: participant.settled,
        };
        return accumulator;
      },
      {},
    ),
    perPersonAmount: Math.floor(payload.taxiFare / splitMemberCount),
    settlementTargetMemberIds: settlementTargets.map(
      participant => participant.id,
    ),
    splitMemberCount,
    taxiFare: payload.taxiFare,
  };
};

export const useTaxiChatDetailData = (partyId: string | undefined) => {
  const partyRepository = usePartyRepository();
  const taxiChatRepository = useTaxiChatRepository();
  const {user} = useAuth();
  const authenticatedUserId = user?.uid;
  const currentUserId = user?.uid ?? TAXI_CHAT_CURRENT_USER_ID;
  const [sourceData, setSourceData] = React.useState<TaxiChatSourceData | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionInFlightId, setActionInFlightId] = React.useState<string | null>(
    null,
  );
  const [notificationTogglePending, setNotificationTogglePending] =
    React.useState(false);
  const [optimisticNotificationEnabled, setOptimisticNotificationEnabled] =
    React.useState<boolean | null>(null);
  const [removedFromParty, setRemovedFromParty] = React.useState(false);
  const hasDataRef = React.useRef(false);
  const isLeavingRef = React.useRef(false);

  React.useEffect(() => {
    isLeavingRef.current = false;
    setNotificationTogglePending(false);
    setOptimisticNotificationEnabled(null);
    setRemovedFromParty(false);
  }, [partyId]);

  React.useEffect(() => {
    if (optimisticNotificationEnabled === null || !sourceData) {
      return;
    }

    if (sourceData.notificationEnabled === optimisticNotificationEnabled) {
      setOptimisticNotificationEnabled(null);
    }
  }, [optimisticNotificationEnabled, sourceData]);

  const effectiveSourceData = React.useMemo(() => {
    if (!sourceData || optimisticNotificationEnabled === null) {
      return sourceData;
    }

    return {
      ...sourceData,
      notificationEnabled: optimisticNotificationEnabled,
    };
  }, [optimisticNotificationEnabled, sourceData]);

  const data = React.useMemo<TaxiChatViewData | null>(() => {
    if (!effectiveSourceData) {
      return null;
    }

    return buildTaxiChatViewData({
      currentUserId,
      partyChat: effectiveSourceData,
    });
  }, [currentUserId, effectiveSourceData]);

  React.useEffect(() => {
    hasDataRef.current = sourceData !== null;
  }, [sourceData]);

  const applyPartyChat = React.useCallback((partyChat: TaxiChatSourceData) => {
    setSourceData(partyChat);
    setError(null);
  }, []);

  const refreshPartySnapshot = React.useCallback(async () => {
    if (isLeavingRef.current) {
      return;
    }

    if (!partyId) {
      setSourceData(null);
      setError('파티 채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    const partyChat = await taxiChatRepository.getPartyChat(partyId);

    if (!partyChat) {
      setSourceData(null);
      setError('파티 채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    applyPartyChat(partyChat);
  }, [applyPartyChat, partyId, taxiChatRepository]);

  const handleRemovedFromParty = React.useCallback(() => {
    if (isLeavingRef.current) {
      return;
    }

    isLeavingRef.current = true;
    setSourceData(null);
    setError(null);
    setLoading(false);
    setRemovedFromParty(true);

    taxiChatRepository.resetSession().catch(resetError => {
      console.warn('강퇴된 파티 채팅 세션을 정리하지 못했습니다.', resetError);
    });
  }, [taxiChatRepository]);

  const reload = React.useCallback(async () => {
    if (isLeavingRef.current) {
      return;
    }

    if (!partyId) {
      setSourceData(null);
      setError('파티 채팅방 정보를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await refreshPartySnapshot();
      await taxiChatRepository.setCurrentParty(partyId);
    } catch (loadError) {
      console.error('파티 채팅 데이터를 불러오지 못했습니다.', loadError);
      setError('파티 채팅 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [partyId, refreshPartySnapshot, taxiChatRepository]);

  const loadOlderMessages = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    await taxiChatRepository.loadOlderMessages(partyId);
  }, [partyId, taxiChatRepository]);

  React.useEffect(() => {
    if (!partyId) {
      setSourceData(null);
      setError('파티 채팅방 정보를 찾을 수 없습니다.');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = taxiChatRepository.subscribeToPartyChat(partyId, {
      onData: partyChat => {
        if (isLeavingRef.current) {
          return;
        }

        if (!partyChat) {
          setSourceData(null);
          setError('파티 채팅방 정보를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        applyPartyChat(partyChat);
        setLoading(false);
      },
      onError: loadError => {
        if (isLeavingRef.current) {
          return;
        }

        console.error('파티 채팅 실시간 연결에 실패했습니다.', loadError);

        if (!hasDataRef.current) {
          setError('파티 채팅 데이터를 불러오지 못했습니다.');
        }

        setLoading(false);
      },
    });

    taxiChatRepository.setCurrentParty(partyId).catch(() => undefined);

    return () => unsubscribe();
  }, [applyPartyChat, partyId, taxiChatRepository]);

  React.useEffect(() => {
    if (!partyId) {
      return undefined;
    }

    return partyRepository.subscribeToParty(partyId, {
      onData: party => {
        if (isLeavingRef.current) {
          return;
        }

        if (
          authenticatedUserId &&
          party &&
          !party.members.includes(authenticatedUserId)
        ) {
          handleRemovedFromParty();
          return;
        }

        refreshPartySnapshot().catch(syncError => {
          console.warn(
            '파티 상태 변경 후 채팅 스냅샷을 갱신하지 못했습니다.',
            syncError,
          );
        });
      },
      onError: syncError => {
        if (isLeavingRef.current) {
          return;
        }

        console.warn('파티 상태 SSE 신호를 처리하지 못했습니다.', syncError);
      },
    });
  }, [
    authenticatedUserId,
    handleRemovedFromParty,
    partyId,
    partyRepository,
    refreshPartySnapshot,
  ]);

  const runPartyAction = React.useCallback(
    async (
      actionId: string,
      action: () => Promise<void>,
      options?: {followUpRefreshDelayMs?: number},
    ) => {
      setActionInFlightId(actionId);

      try {
        await action();
        await refreshPartySnapshot();

        if (options?.followUpRefreshDelayMs && !isLeavingRef.current) {
          await wait(options.followUpRefreshDelayMs);

          if (!isLeavingRef.current) {
            await refreshPartySnapshot();
          }
        }
      } finally {
        setActionInFlightId(null);
      }
    },
    [refreshPartySnapshot],
  );

  const closeParty = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    await runPartyAction('close', () => partyRepository.closeParty(partyId), {
      followUpRefreshDelayMs: 400,
    });
  }, [partyId, partyRepository, runPartyAction]);

  const reopenParty = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    await runPartyAction('reopen', () => partyRepository.reopenParty(partyId), {
      followUpRefreshDelayMs: 400,
    });
  }, [partyId, partyRepository, runPartyAction]);

  const endParty = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    await runPartyAction('end', () => partyRepository.endParty(partyId));
  }, [partyId, partyRepository, runPartyAction]);

  const kickMember = React.useCallback(
    async (memberId: string) => {
      if (!partyId) {
        return;
      }

      await runPartyAction(`kick:${memberId}`, () =>
        partyRepository.removeMember(partyId, memberId),
      );
    },
    [partyId, partyRepository, runPartyAction],
  );

  const confirmSettlement = React.useCallback(
    async (memberId: string) => {
      if (!partyId) {
        return;
      }

      await runPartyAction(`confirmSettlement:${memberId}`, () =>
        partyRepository.markMemberSettled(partyId, memberId),
      );
    },
    [partyId, partyRepository, runPartyAction],
  );

  const startSettlement = React.useCallback(
    async (payload: {
      account: {
        accountHolder: string;
        accountNumber: string;
        bankName: string;
        hideName: boolean;
      };
      settlementTargetMemberIds: string[];
      taxiFare: number;
    }) => {
      if (!partyId || !sourceData) {
        return;
      }

      if (!Number.isFinite(payload.taxiFare) || payload.taxiFare <= 0) {
        throw new Error('택시 총액을 1원 이상 숫자로 입력해주세요.');
      }

      await runPartyAction('arrive', () =>
        partyRepository.startSettlement(
          partyId,
          buildSettlementDraft(sourceData, payload),
        ),
      );
    },
    [partyId, partyRepository, runPartyAction, sourceData],
  );

  const leaveParty = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    isLeavingRef.current = true;
    setActionInFlightId('leave');

    try {
      await partyRepository.leaveParty(partyId);
      await taxiChatRepository.resetSession();
      setSourceData(null);
      setError(null);
      setLoading(false);
    } catch (leaveError) {
      isLeavingRef.current = false;
      throw leaveError;
    } finally {
      setActionInFlightId(null);
    }
  }, [partyId, partyRepository, taxiChatRepository]);

  const sendMessage = React.useCallback(
    async (messageText: string) => {
      if (!partyId) {
        return;
      }

      await taxiChatRepository.sendMessage(partyId, messageText);
    },
    [partyId, taxiChatRepository],
  );

  const sendImageMessage = React.useCallback(
    async (image: TaxiChatImageUploadInput) => {
      if (!partyId) {
        return;
      }

      const imageUrl = await taxiChatRepository.uploadImage(image);
      await taxiChatRepository.sendImageMessage(partyId, imageUrl);
    },
    [partyId, taxiChatRepository],
  );

  const sendAccountMessage = React.useCallback(
    async (payload: TaxiChatAccountMessageDraft) => {
      if (!partyId) {
        return;
      }
      await taxiChatRepository.sendAccountMessage(partyId, payload);
      await refreshPartySnapshot();
    },
    [partyId, refreshPartySnapshot, taxiChatRepository],
  );

  const updateMessage = React.useCallback(
    async (messageId: string, text: string) => {
      if (!partyId) {
        throw new Error('파티 채팅방 정보를 찾을 수 없습니다.');
      }

      const partyChat = await taxiChatRepository.updateMessage(
        partyId,
        messageId,
        text,
      );

      if (partyChat) {
        applyPartyChat(partyChat);
      }
    },
    [applyPartyChat, partyId, taxiChatRepository],
  );

  const deleteMessage = React.useCallback(
    async (messageId: string) => {
      if (!partyId) {
        throw new Error('파티 채팅방 정보를 찾을 수 없습니다.');
      }

      const partyChat = await taxiChatRepository.deleteMessage(
        partyId,
        messageId,
      );

      if (partyChat) {
        applyPartyChat(partyChat);
      }
    },
    [applyPartyChat, partyId, taxiChatRepository],
  );

  const updateParty = React.useCallback(
    async ({
      departureTime,
      detail,
    }: {
      departureTime: string;
      detail?: string;
    }) => {
      if (!partyId) {
        return;
      }

      await runPartyAction('edit', () =>
        partyRepository.updateParty(partyId, {
          departureTime,
          detail,
        }),
      );
    },
    [partyId, partyRepository, runPartyAction],
  );

  const cancelParty = React.useCallback(async () => {
    if (!partyId) {
      return;
    }

    await runPartyAction('cancel', () =>
      partyRepository.deleteParty(partyId, 'cancelled'),
    );
  }, [partyId, partyRepository, runPartyAction]);

  const toggleNotification = React.useCallback(async () => {
    if (!partyId || !sourceData) {
      return;
    }

    if (notificationTogglePending) {
      return;
    }

    const currentNotificationEnabled =
      optimisticNotificationEnabled ?? sourceData.notificationEnabled;
    const nextNotificationEnabled = !currentNotificationEnabled;

    setNotificationTogglePending(true);
    setOptimisticNotificationEnabled(nextNotificationEnabled);

    try {
      const nextPartyChat = await taxiChatRepository.updateNotificationSetting(
        partyId,
        nextNotificationEnabled,
      );

      if (nextPartyChat) {
        applyPartyChat(nextPartyChat);
      } else {
        await refreshPartySnapshot();
      }
    } catch (toggleError) {
      setOptimisticNotificationEnabled(null);
      throw toggleError;
    } finally {
      setNotificationTogglePending(false);
    }
  }, [
    applyPartyChat,
    notificationTogglePending,
    optimisticNotificationEnabled,
    partyId,
    refreshPartySnapshot,
    sourceData,
    taxiChatRepository,
  ]);

  return {
    actionInFlightId,
    cancelParty,
    closeParty,
    confirmSettlement,
    data,
    deleteMessage,
    endParty,
    error,
    hasOlderMessages: sourceData?.hasOlderMessages ?? false,
    kickMember,
    leaveParty,
    loadOlderMessages,
    loading,
    loadingOlderMessages: sourceData?.loadingOlderMessages ?? false,
    notificationTogglePending,
    reload,
    removedFromParty,
    reopenParty,
    sendAccountMessage,
    sendImageMessage,
    sendMessage,
    startSettlement,
    toggleNotification,
    updateMessage,
    updateParty,
  };
};
