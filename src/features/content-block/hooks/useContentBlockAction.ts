import React from 'react';
import {Alert} from 'react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {CONTENT_BLOCKS_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useContentBlockRepository} from '@/di';

import type {ContentBlockTarget} from '../model/contentBlock';

interface UseContentBlockActionOptions {
  onBlocked: (target: ContentBlockTarget) => Promise<void> | void;
  scopeId?: string;
}

const getTargetKey = (target: ContentBlockTarget) =>
  `${target.targetType}:${target.targetId}`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim()
    ? error.message
    : '사용자를 차단하지 못했습니다.';

export const useContentBlockAction = ({
  onBlocked,
  scopeId,
}: UseContentBlockActionOptions) => {
  const repository = useContentBlockRepository();
  const interactionSessionRef = React.useRef(0);
  const currentScopeIdRef = React.useRef(scopeId);
  const mountedRef = React.useRef(true);
  const onBlockedRef = React.useRef(onBlocked);
  const pendingTargetsRef = React.useRef(new Map<string, number>());

  currentScopeIdRef.current = scopeId;
  onBlockedRef.current = onBlocked;

  React.useEffect(() => {
    interactionSessionRef.current += 1;
    pendingTargetsRef.current.clear();
  }, [scopeId]);

  React.useEffect(() => {
    mountedRef.current = true;
    const pendingTargets = pendingTargetsRef.current;

    return () => {
      mountedRef.current = false;
      interactionSessionRef.current += 1;
      pendingTargets.clear();
    };
  }, []);

  const isCurrentInteraction = React.useCallback(
    (interactionSession: number, interactionScopeId?: string) =>
      mountedRef.current &&
      interactionSessionRef.current === interactionSession &&
      currentScopeIdRef.current === interactionScopeId,
    [],
  );

  const requestContentBlock = React.useCallback(
    (target: ContentBlockTarget) => {
      const interactionSession = interactionSessionRef.current;
      const interactionScopeId = currentScopeIdRef.current;

      Alert.alert(
        '사용자 차단',
        '이 사용자가 작성한 게시글과 댓글이 더 이상 표시되지 않아요. 상대방에게 별도의 알림은 전송되지 않습니다.',
        [
          {text: '취소', style: 'cancel'},
          {
            onPress: () => {
              if (!isCurrentInteraction(interactionSession, interactionScopeId)) {
                return;
              }

              const targetKey = getTargetKey(target);
              if (pendingTargetsRef.current.has(targetKey)) {
                return;
              }

              pendingTargetsRef.current.set(targetKey, interactionSession);
              repository
                .blockContent(target)
                .then(async () => {
                  invalidateData(CONTENT_BLOCKS_INVALIDATION_KEY);

                  if (
                    !isCurrentInteraction(
                      interactionSession,
                      interactionScopeId,
                    )
                  ) {
                    return;
                  }

                  try {
                    await onBlockedRef.current(target);
                  } catch (refreshError) {
                    if (
                      isCurrentInteraction(
                        interactionSession,
                        interactionScopeId,
                      )
                    ) {
                      Alert.alert(
                        '새로고침 오류',
                        refreshError instanceof Error &&
                          refreshError.message.trim()
                          ? refreshError.message
                          : '차단은 완료됐지만 화면을 새로고침하지 못했습니다.',
                      );
                    }
                  }
                })
                .catch(blockError => {
                  if (
                    isCurrentInteraction(
                      interactionSession,
                      interactionScopeId,
                    )
                  ) {
                    Alert.alert('오류', getErrorMessage(blockError));
                  }
                })
                .finally(() => {
                  if (
                    pendingTargetsRef.current.get(targetKey) ===
                    interactionSession
                  ) {
                    pendingTargetsRef.current.delete(targetKey);
                  }
                });
            },
            style: 'destructive',
            text: '차단',
          },
        ],
      );
    },
    [isCurrentInteraction, repository],
  );

  return {requestContentBlock};
};
