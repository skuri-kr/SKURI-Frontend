import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {useFriendInvitationRepository} from '@/di';
import {StateCard} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import Button from '@/shared/ui/Button';

import type {
  FriendInvitationCandidate,
  FriendInvitationEligibleFriends,
  FriendInvitationOutcome,
  FriendInvitationSendResult,
} from '../model/friend';
import {FriendAvatar} from './FriendAvatar';

export type FriendInviteContext = {
  targetId: string;
  targetName?: string;
  type: 'PARTY' | 'CHAT_ROOM';
};

interface FriendInviteSheetProps {
  context: FriendInviteContext | null;
  initialFriendPublicId?: string;
  onClose: () => void;
  visible: boolean;
}

const ROW_HEIGHT = 68;
const FOOTER_HEIGHT = 76;
const NAME_COLLATOR = new Intl.Collator('ko');

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const sortCandidates = (candidates: FriendInvitationCandidate[]) =>
  [...candidates].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return (
      NAME_COLLATOR.compare(left.nickname, right.nickname) ||
      left.id.localeCompare(right.id)
    );
  });

const OUTCOME_LABELS: Record<FriendInvitationOutcome, string> = {
  ALREADY_MEMBER: '이미 참여 중',
  ALREADY_PENDING: '이미 초대됨',
  NOT_ELIGIBLE: '초대할 수 없음',
  SENT: '전송 완료',
};

const buildOutcomeMessage = (
  outcomes: FriendInvitationSendResult[],
  candidates: FriendInvitationCandidate[],
) => {
  const namesById = new Map(
    candidates.map(candidate => [candidate.id, candidate.nickname]),
  );
  const namesByOutcome = outcomes.reduce<
    Partial<Record<FriendInvitationOutcome, string[]>>
  >((result, item) => {
    const names = result[item.outcome] ?? [];
    names.push(namesById.get(item.friendId) ?? '선택한 친구');
    result[item.outcome] = names;
    return result;
  }, {});

  return (Object.keys(OUTCOME_LABELS) as FriendInvitationOutcome[])
    .filter(outcome => namesByOutcome[outcome]?.length)
    .map(
      outcome =>
        `${OUTCOME_LABELS[outcome]}: ${namesByOutcome[outcome]?.join(', ')}`,
    )
    .join('\n');
};

export const FriendInviteSheet = ({
  context,
  initialFriendPublicId,
  onClose,
  visible,
}: FriendInviteSheetProps) => {
  const repository = useFriendInvitationRepository();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const modalRef = React.useRef<BottomSheetModal>(null);
  const scrollRef = React.useRef<BottomSheetScrollViewMethods>(null);
  const initialSelectionAppliedRef = React.useRef(false);
  const activeContextKeyRef = React.useRef<string | undefined>(undefined);
  const loadVersionRef = React.useRef(0);
  const sheetSessionVersionRef = React.useRef(0);
  const [eligible, setEligible] =
    React.useState<FriendInvitationEligibleFriends | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [requiresEligibilityRefresh, setRequiresEligibilityRefresh] =
    React.useState(false);
  const [error, setError] = React.useState<string>();
  const [initialFriendUnavailable, setInitialFriendUnavailable] =
    React.useState(false);
  const contextTargetId = context?.targetId;
  const contextType = context?.type;
  const contextKey =
    contextTargetId && contextType
      ? `${contextType}:${contextTargetId}`
      : undefined;
  const loadEligible = React.useCallback(
    async ({preserveSelection = false}: {preserveSelection?: boolean} = {}) => {
      if (!contextTargetId || !contextType) {
        return false;
      }

      const requestContextKey = `${contextType}:${contextTargetId}`;
      const requestSessionVersion = sheetSessionVersionRef.current;
      const requestVersion = loadVersionRef.current + 1;
      loadVersionRef.current = requestVersion;
      const isCurrentRequest = () =>
        activeContextKeyRef.current === requestContextKey &&
        sheetSessionVersionRef.current === requestSessionVersion &&
        loadVersionRef.current === requestVersion;

      setLoading(true);
      setError(undefined);
      try {
        const nextEligible =
          contextType === 'PARTY'
            ? await repository.getPartyInvitationEligibleFriends(contextTargetId)
            : await repository.getChatRoomInvitationEligibleFriends(
                contextTargetId,
              );
        if (!isCurrentRequest()) {
          return false;
        }
        const sortedFriends = sortCandidates(nextEligible.friends);
        setEligible({...nextEligible, friends: sortedFriends});
        setRequiresEligibilityRefresh(false);
        const eligibleIds = new Set(sortedFriends.map(friend => friend.id));

        setSelectedIds(current => {
          const preserved = preserveSelection
            ? new Set([...current].filter(friendId => eligibleIds.has(friendId)))
            : new Set<string>();

          if (
            !initialSelectionAppliedRef.current &&
            initialFriendPublicId &&
            eligibleIds.has(initialFriendPublicId)
          ) {
            preserved.add(initialFriendPublicId);
          }

          return preserved;
        });

        if (!initialSelectionAppliedRef.current && initialFriendPublicId) {
          const targetIndex = sortedFriends.findIndex(
            friend => friend.id === initialFriendPublicId,
          );
          setInitialFriendUnavailable(targetIndex < 0);
          initialSelectionAppliedRef.current = true;
          if (targetIndex >= 0) {
            requestAnimationFrame(() => {
              if (isCurrentRequest()) {
                scrollRef.current?.scrollTo({
                  animated: true,
                  y: Math.max(0, targetIndex * ROW_HEIGHT),
                });
              }
            });
          }
        }
        return true;
      } catch (loadError) {
        if (isCurrentRequest()) {
          setError(
            getErrorMessage(loadError, '초대할 친구 목록을 불러오지 못했습니다.'),
          );
        }
        return false;
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    }, [contextTargetId, contextType, initialFriendPublicId, repository]);

  React.useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }

    sheetSessionVersionRef.current += 1;

    if (visible && contextTargetId && contextType) {
      activeContextKeyRef.current = `${contextType}:${contextTargetId}`;
      loadVersionRef.current += 1;
      initialSelectionAppliedRef.current = false;
      setQuery('');
      setInitialFriendUnavailable(false);
      setEligible(null);
      setSelectedIds(new Set());
      setSending(false);
      setRequiresEligibilityRefresh(false);
      modal.present();
      loadEligible().catch(() => undefined);
      return;
    }

    activeContextKeyRef.current = undefined;
    loadVersionRef.current += 1;
    setSending(false);
    modal.dismiss();
  }, [contextKey, contextTargetId, contextType, loadEligible, visible]);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleDismiss = React.useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [onClose, visible]);

  const filteredFriends = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko');
    if (!normalizedQuery) {
      return eligible?.friends ?? [];
    }

    return (eligible?.friends ?? []).filter(friend =>
      friend.nickname.toLocaleLowerCase('ko').includes(normalizedQuery),
    );
  }, [eligible?.friends, query]);

  const toggleFriend = React.useCallback((friendId: string) => {
    if (sending) {
      return;
    }

    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }, [sending]);

  const handleUnavailableCount = React.useCallback(() => {
    if (!eligible) {
      return;
    }

    Alert.alert(
      '초대할 수 없는 친구',
      [
        `이미 참여 중 ${eligible.alreadyMemberCount}명`,
        `이미 초대됨 ${eligible.alreadyPendingCount}명`,
        `현재 초대할 수 없음 ${eligible.notEligibleCount}명`,
      ].join('\n'),
    );
  }, [eligible]);

  const handleSend = React.useCallback(async () => {
    if (
      !contextKey ||
      !contextTargetId ||
      !contextType ||
      selectedIds.size === 0 ||
      sending
    ) {
      return;
    }

    const requestContextKey = contextKey;
    const requestSessionVersion = sheetSessionVersionRef.current;
    const isCurrentContext = () =>
      activeContextKeyRef.current === requestContextKey &&
      sheetSessionVersionRef.current === requestSessionVersion;
    const friendIds = [...selectedIds];
    const candidates = eligible?.friends ?? [];
    setSending(true);
    try {
      const results =
        contextType === 'PARTY'
          ? await repository.createPartyInvitations(contextTargetId, friendIds)
          : await repository.createChatRoomInvitations(contextTargetId, friendIds);
      if (!isCurrentContext()) {
        return;
      }
      setSelectedIds(new Set());
      Alert.alert('친구 초대 결과', buildOutcomeMessage(results, candidates));
      await loadEligible();
    } catch (sendError) {
      if (!isCurrentContext()) {
        return;
      }
      setRequiresEligibilityRefresh(true);
      const refreshed = await loadEligible({preserveSelection: true});
      if (!isCurrentContext()) {
        return;
      }
      Alert.alert(
        '초대 전송 실패',
        refreshed
          ? `${getErrorMessage(sendError, '친구 초대를 전송하지 못했습니다.')}\n\n최신 상태를 다시 확인하고 선택을 유지했습니다.`
          : `${getErrorMessage(sendError, '친구 초대를 전송하지 못했습니다.')}\n\n최신 상태도 확인하지 못했습니다. 목록을 다시 불러온 뒤 재시도해 주세요.`,
      );
    } finally {
      if (isCurrentContext()) {
        setSending(false);
      }
    }
  }, [contextKey, contextTargetId, contextType, eligible?.friends, loadEligible, repository, selectedIds, sending]);

  const unavailableCount = eligible
    ? eligible.alreadyMemberCount +
      eligible.alreadyPendingCount +
      eligible.notEligibleCount
    : 0;
  const targetName = eligible?.targetName ?? context?.targetName ?? '';

  const renderFooter = React.useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={insets.bottom}
        style={styles.footer}>
        <Button
          disabled={
            selectedIds.size === 0 || loading || requiresEligibilityRefresh
          }
          loading={sending}
          onPress={() => {
            handleSend().catch(() => undefined);
          }}
          title={`${selectedIds.size}명 초대하기`}
        />
      </BottomSheetFooter>
    ),
    [handleSend, insets.bottom, loading, requiresEligibilityRefresh, selectedIds.size, sending],
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing
      enableOverDrag={false}
      enablePanDownToClose
      footerComponent={renderFooter}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={Math.max(0, windowHeight - insets.top)}
      onDismiss={handleDismiss}
      ref={modalRef}
      stackBehavior="replace"
      style={styles.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: FOOTER_HEIGHT + insets.bottom + SPACING.xl},
        ]}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>친구 초대</Text>
        <Text style={styles.targetName}>{targetName}</Text>

        {contextType === 'PARTY' && eligible ? (
          <View style={styles.guideCard}>
            <Icon color={COLORS.accent.blue} name="information-circle-outline" size={20} />
            <Text style={styles.guideText}>
              남은 자리 {eligible.remainingCapacity ?? 0}석 · 초대는 좌석을 예약하지 않아요. 먼저 수락한 친구부터 참여해요.
            </Text>
          </View>
        ) : null}
        {contextType === 'CHAT_ROOM' && eligible ? (
          <View style={styles.guideCard}>
            <Icon color={COLORS.accent.blue} name="time-outline" size={20} />
            <Text style={styles.guideText}>
              공개 채팅방 초대는 {eligible.expiresInDays ?? 7}일 후 만료돼요.
            </Text>
          </View>
        ) : null}

        <View style={styles.searchContainer}>
          <Icon color={COLORS.text.muted} name="search-outline" size={19} />
          <BottomSheetTextInput
            accessibilityLabel="초대할 친구 검색"
            onChangeText={setQuery}
            placeholder="친구 이름 검색"
            placeholderTextColor={COLORS.text.muted}
            style={styles.searchInput}
            value={query}
          />
        </View>

        {initialFriendUnavailable ? (
          <Text style={styles.initialFriendNotice}>
            지금은 이 친구를 초대할 수 없어요. 다른 친구는 계속 선택할 수 있어요.
          </Text>
        ) : null}

        {loading && !eligible ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.brand.primary} />
            <Text style={styles.loadingText}>초대할 수 있는 친구를 확인하는 중</Text>
          </View>
        ) : null}
        {error && !eligible ? (
          <StateCard
            actionLabel="다시 시도"
            description={error}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              loadEligible().catch(() => undefined);
            }}
            title="친구 목록을 불러오지 못했습니다"
          />
        ) : null}
        {error && eligible ? (
          <View style={styles.inlineErrorContainer}>
            <Text style={styles.inlineError}>{error}</Text>
            {requiresEligibilityRefresh ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  loadEligible({preserveSelection: true}).catch(() => undefined);
                }}>
                <Text style={styles.inlineRetryText}>목록 다시 불러오기</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {eligible && filteredFriends.length > 0 ? (
          <View style={styles.friendList}>
            {filteredFriends.map(friend => {
              const selected = selectedIds.has(friend.id);
              return (
                <TouchableOpacity
                  accessibilityLabel={`${friend.nickname} ${selected ? '선택 해제' : '선택'}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: selected, disabled: sending}}
                  activeOpacity={0.82}
                  disabled={sending}
                  key={friend.id}
                  onPress={() => toggleFriend(friend.id)}
                  style={[
                    styles.friendRow,
                    selected ? styles.friendRowSelected : undefined,
                  ]}>
                  <Icon
                    color={friend.favorite ? COLORS.accent.yellow : 'transparent'}
                    name="star"
                    size={16}
                  />
                  <FriendAvatar photoUrl={friend.photoUrl} size={42} />
                  <View style={styles.friendText}>
                    <Text style={styles.friendName}>{friend.nickname}</Text>
                    <Text style={styles.friendDepartment}>
                      {friend.department ?? '학과 정보 없음'}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, selected ? styles.checkboxSelected : undefined]}>
                    {selected ? <Icon color={COLORS.text.inverse} name="checkmark" size={17} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {eligible && filteredFriends.length === 0 ? (
          <StateCard
            description={query.trim() ? '검색어와 일치하는 친구가 없어요.' : '현재 초대할 수 있는 친구가 없어요.'}
            icon={<Icon color={COLORS.text.muted} name="people-outline" size={28} />}
            title="초대 가능한 친구가 없어요"
          />
        ) : null}

        {unavailableCount > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={handleUnavailableCount}
            style={styles.unavailableButton}>
            <Text style={styles.unavailableText}>초대할 수 없는 친구 {unavailableCount}명</Text>
            <Icon color={COLORS.text.muted} name="chevron-forward" size={16} />
          </TouchableOpacity>
        ) : null}

      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: COLORS.background.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: COLORS.border.default,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: COLORS.brand.primary,
    borderColor: COLORS.brand.primary,
  },
  content: {paddingHorizontal: SPACING.lg},
  friendDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18},
  friendList: {gap: SPACING.xs},
  friendName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 21},
  friendRow: {
    alignItems: 'center',
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: SPACING.md,
  },
  friendRowSelected: {backgroundColor: COLORS.brand.primaryTint, borderColor: COLORS.brand.primary},
  friendText: {flex: 1},
  footer: {
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  guideCard: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.accent.blueSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  guideText: {color: COLORS.text.secondary, flex: 1, fontSize: 12, lineHeight: 18},
  handleIndicator: {backgroundColor: COLORS.border.default},
  initialFriendNotice: {color: COLORS.accent.orange, fontSize: 12, lineHeight: 18, marginBottom: SPACING.sm},
  inlineError: {color: COLORS.status.danger, flex: 1, fontSize: 12, lineHeight: 18},
  inlineErrorContainer: {alignItems: 'center', flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm},
  inlineRetryText: {color: COLORS.brand.primaryStrong, fontSize: 12, fontWeight: '700'},
  loadingState: {alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xxl},
  loadingText: {color: COLORS.text.secondary, fontSize: 13},
  searchContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {color: COLORS.text.primary, flex: 1, fontSize: 15, height: 46, paddingVertical: 0},
  sheet: {...SHADOWS.raised},
  targetName: {color: COLORS.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 2},
  title: {color: COLORS.text.primary, fontSize: 20, fontWeight: '800', lineHeight: 28},
  unavailableButton: {alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 2, marginTop: SPACING.md, paddingVertical: SPACING.xs},
  unavailableText: {color: COLORS.text.muted, fontSize: 12, textDecorationLine: 'underline'},
});
