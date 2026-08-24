import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
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
} from '../model/friend';
import {FriendAvatar} from './FriendAvatar';

export type FriendInviteContext = {
  targetId: string;
  targetName?: string;
  type: 'PARTY' | 'CHAT_ROOM';
};

interface FriendInviteSheetProps {
  context: FriendInviteContext | null;
  onClose: () => void;
  visible: boolean;
}

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

const CandidateIdentity = ({
  candidate,
}: {
  candidate: FriendInvitationCandidate;
}) => (
  <>
    <Icon
      color={candidate.favorite ? COLORS.accent.yellow : 'transparent'}
      name="star"
      size={16}
    />
    <FriendAvatar photoUrl={candidate.photoUrl} size={42} />
    <View style={styles.friendText}>
      <Text style={styles.friendName}>{candidate.nickname}</Text>
      <Text style={styles.friendDepartment}>
        {candidate.department ?? '학과 정보 없음'}
      </Text>
    </View>
  </>
);

const StatusSection = ({
  candidates,
  label,
}: {
  candidates: FriendInvitationCandidate[];
  label: '초대 중' | '참여 중';
}) => {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <View style={styles.statusSection}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.friendList}>
        {candidates.map(candidate => (
          <View key={candidate.id} style={[styles.friendRow, styles.statusRow]}>
            <CandidateIdentity candidate={candidate} />
            <View
              style={[
                styles.statusBadge,
                label === '참여 중'
                  ? styles.memberBadge
                  : styles.pendingBadge,
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  label === '참여 중'
                    ? styles.memberBadgeText
                    : styles.pendingBadgeText,
                ]}>
                {label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const FriendInviteSheet = ({
  context,
  onClose,
  visible,
}: FriendInviteSheetProps) => {
  const repository = useFriendInvitationRepository();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const modalRef = React.useRef<BottomSheetModal>(null);
  const activeContextKeyRef = React.useRef<string | undefined>(undefined);
  const loadVersionRef = React.useRef(0);
  const sheetSessionVersionRef = React.useRef(0);
  const [eligible, setEligible] =
    React.useState<FriendInvitationEligibleFriends | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [requiresEligibilityRefresh, setRequiresEligibilityRefresh] =
    React.useState(false);
  const [error, setError] = React.useState<string>();
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
        const response =
          contextType === 'PARTY'
            ? await repository.getPartyInvitationEligibleFriends(
                contextTargetId,
              )
            : await repository.getChatRoomInvitationEligibleFriends(
                contextTargetId,
              );
        if (!isCurrentRequest()) {
          return false;
        }

        const nextEligible = {
          ...response,
          alreadyMemberFriends: sortCandidates(
            response.alreadyMemberFriends,
          ),
          alreadyPendingFriends: sortCandidates(
            response.alreadyPendingFriends,
          ),
          friends: sortCandidates(response.friends),
        };
        const eligibleIds = new Set(
          nextEligible.friends.map(friend => friend.id),
        );
        setEligible(nextEligible);
        setSelectedIds(current =>
          preserveSelection
            ? new Set([...current].filter(friendId => eligibleIds.has(friendId)))
            : new Set(),
        );
        setRequiresEligibilityRefresh(false);
        return true;
      } catch (loadError) {
        if (isCurrentRequest()) {
          setError(
            getErrorMessage(
              loadError,
              '초대할 친구 목록을 불러오지 못했습니다.',
            ),
          );
        }
        return false;
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    }, [contextTargetId, contextType, repository],
  );

  React.useEffect(() => {
    sheetSessionVersionRef.current += 1;

    if (visible && contextTargetId && contextType) {
      activeContextKeyRef.current = `${contextType}:${contextTargetId}`;
      loadVersionRef.current += 1;
      setEligible(null);
      setSelectedIds(new Set());
      setSending(false);
      setRequiresEligibilityRefresh(false);
      modalRef.current?.present();
      loadEligible().catch(() => undefined);
      return;
    }

    activeContextKeyRef.current = undefined;
    loadVersionRef.current += 1;
    setSending(false);
    modalRef.current?.dismiss();
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

  const toggleFriend = React.useCallback(
    (friendId: string) => {
      if (
        sending ||
        requiresEligibilityRefresh ||
        eligible?.canInvite === false
      ) {
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
    }, [eligible?.canInvite, requiresEligibilityRefresh, sending],
  );

  const handleSend = React.useCallback(async () => {
    if (
      !contextKey ||
      !contextTargetId ||
      !contextType ||
      !eligible?.canInvite ||
      selectedIds.size === 0 ||
      sending ||
      requiresEligibilityRefresh
    ) {
      return;
    }

    const requestContextKey = contextKey;
    const requestSessionVersion = sheetSessionVersionRef.current;
    const isCurrentContext = () =>
      activeContextKeyRef.current === requestContextKey &&
      sheetSessionVersionRef.current === requestSessionVersion;
    const friendIds = [...selectedIds];
    setSending(true);
    try {
      if (contextType === 'PARTY') {
        await repository.createPartyInvitations(contextTargetId, friendIds);
      } else {
        await repository.createChatRoomInvitations(contextTargetId, friendIds);
      }
      if (!isCurrentContext()) {
        return;
      }

      setSelectedIds(new Set());
      const refreshed = await loadEligible();
      if (isCurrentContext() && !refreshed) {
        setRequiresEligibilityRefresh(true);
      }
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
          ? getErrorMessage(sendError, '친구 초대를 전송하지 못했습니다.')
          : `${getErrorMessage(
              sendError,
              '친구 초대를 전송하지 못했습니다.',
            )}\n\n최신 목록도 확인하지 못했습니다. 목록을 다시 불러온 뒤 재시도해 주세요.`,
      );
    } finally {
      if (isCurrentContext()) {
        setSending(false);
      }
    }
  }, [
    contextKey,
    contextTargetId,
    contextType,
    eligible?.canInvite,
    loadEligible,
    repository,
    requiresEligibilityRefresh,
    selectedIds,
    sending,
  ]);

  const targetName = eligible?.targetName ?? context?.targetName ?? '';
  const inviteDisabled =
    selectedIds.size === 0 ||
    loading ||
    requiresEligibilityRefresh ||
    eligible?.canInvite === false;
  const inviteButtonTitle =
    contextType === 'PARTY' && eligible?.unavailableReason === 'PARTY_FULL'
      ? '파티 정원이 가득 찼습니다'
      : `${selectedIds.size}명 초대하기`;

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      maxDynamicContentSize={Math.max(0, windowHeight - insets.top)}
      onDismiss={() => {
        if (visible) {
          onClose();
        }
      }}
      ref={modalRef}
      stackBehavior="replace"
      style={styles.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + SPACING.lg},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title}>친구 초대</Text>
            <Text style={styles.targetName}>{targetName}</Text>
          </View>
          {contextType === 'PARTY' && eligible ? (
            <View style={styles.capacityGroup}>
              <Text style={styles.capacityLabel}>남은 자리</Text>
              <View style={styles.capacityBadge}>
                <Text style={styles.capacityBadgeText}>
                  {eligible.remainingCapacity ?? 0}석
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {contextType === 'CHAT_ROOM' && eligible?.sameDepartmentOnly ? (
          <View style={styles.guideCard}>
            <Icon
              color={COLORS.accent.blue}
              name="information-circle-outline"
              size={20}
            />
            <Text style={styles.guideText}>
              같은 학과 친구만 초대할 수 있어요.
            </Text>
          </View>
        ) : null}

        {loading && !eligible ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.brand.primary} />
            <Text style={styles.loadingText}>
              초대할 수 있는 친구를 확인하는 중
            </Text>
          </View>
        ) : null}
        {error && !eligible ? (
          <StateCard
            actionLabel="다시 시도"
            description={error}
            icon={
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={28}
              />
            }
            onPressAction={() => {
              loadEligible().catch(() => undefined);
            }}
            title="친구 목록을 불러오지 못했습니다"
          />
        ) : null}
        {error && eligible ? (
          <View style={styles.inlineErrorContainer}>
            <Text style={styles.inlineError}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                loadEligible({preserveSelection: true}).catch(() => undefined);
              }}>
              <Text style={styles.inlineRetryText}>목록 다시 불러오기</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {eligible?.friends.length ? (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>초대 가능</Text>
            <View style={styles.friendList}>
              {eligible.friends.map(friend => {
                const selected = selectedIds.has(friend.id);
                const disabled =
                  sending ||
                  requiresEligibilityRefresh ||
                  !eligible.canInvite;
                return (
                  <TouchableOpacity
                    accessibilityLabel={`${friend.nickname} ${
                      selected ? '선택 해제' : '선택'
                    }`}
                    accessibilityRole="checkbox"
                    accessibilityState={{checked: selected, disabled}}
                    activeOpacity={0.82}
                    disabled={disabled}
                    key={friend.id}
                    onPress={() => toggleFriend(friend.id)}
                    style={[
                      styles.friendRow,
                      selected ? styles.friendRowSelected : undefined,
                      disabled ? styles.disabledRow : undefined,
                    ]}>
                    <CandidateIdentity candidate={friend} />
                    <View
                      style={[
                        styles.checkbox,
                        selected ? styles.checkboxSelected : undefined,
                      ]}>
                      {selected ? (
                        <Icon
                          color={COLORS.text.inverse}
                          name="checkmark"
                          size={17}
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {eligible && eligible.friends.length === 0 ? (
          <StateCard
            description="현재 새로 초대할 수 있는 친구가 없어요."
            icon={
              <Icon color={COLORS.text.muted} name="people-outline" size={28} />
            }
            title="초대 가능한 친구가 없어요"
          />
        ) : null}

        {eligible ? (
          <>
            <StatusSection
              candidates={eligible.alreadyPendingFriends}
              label="초대 중"
            />
            <StatusSection
              candidates={eligible.alreadyMemberFriends}
              label="참여 중"
            />
          </>
        ) : null}

        {eligible ? (
          <View style={styles.buttonWrap}>
            <Button
              disabled={inviteDisabled}
              loading={sending}
              onPress={() => {
                handleSend().catch(() => undefined);
              }}
              title={inviteButtonTitle}
            />
          </View>
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
  buttonWrap: {marginTop: SPACING.xl},
  capacityBadge: {
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  capacityBadgeText: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  capacityGroup: {alignItems: 'center', flexDirection: 'row', gap: 6},
  capacityLabel: {color: COLORS.text.secondary, fontSize: 12},
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
  disabledRow: {opacity: 0.62},
  friendDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18},
  friendList: {gap: SPACING.xs},
  friendName: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  friendRow: {
    alignItems: 'center',
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 68,
    paddingHorizontal: SPACING.md,
  },
  friendRowSelected: {
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.brand.primary,
  },
  friendText: {flex: 1},
  guideCard: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.blueSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  guideText: {color: COLORS.text.secondary, flex: 1, fontSize: 12},
  handleIndicator: {backgroundColor: COLORS.border.default},
  inlineError: {
    color: COLORS.status.danger,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineErrorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  inlineRetryText: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
  },
  loadingText: {color: COLORS.text.secondary, fontSize: 13},
  memberBadge: {backgroundColor: COLORS.brand.primaryTint},
  memberBadgeText: {color: COLORS.brand.primaryStrong},
  pendingBadge: {backgroundColor: COLORS.accent.blueSoft},
  pendingBadgeText: {color: COLORS.accent.blue},
  sectionTitle: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  sheet: {...SHADOWS.raised},
  statusBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusBadgeText: {fontSize: 11, fontWeight: '800'},
  statusRow: {backgroundColor: COLORS.background.subtle},
  statusSection: {marginTop: SPACING.lg},
  targetName: {color: COLORS.text.secondary, fontSize: 13, marginTop: 2},
  title: {
    color: COLORS.text.primary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  titleText: {flex: 1},
});
