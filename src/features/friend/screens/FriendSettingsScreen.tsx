import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  BOARD_DETAIL_READ_INVALIDATION_KEYS,
  NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS,
} from '@/app/data-freshness/invalidationKeys';
import {useContentBlockSettingsData} from '@/features/content-block';
import {
  SettingsRow,
  SettingsSection,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';
import {formatKoreanAbsoluteDate} from '@/shared/lib/date';

import {FriendAvatar} from '../components/FriendAvatar';
import {FriendDataErrorBanner} from '../components/FriendDataErrorBanner';
import {useFriendSettingsData} from '../hooks/useFriendSettingsData';
import {useTimetableSharingSettingsData} from '../hooks/useTimetableSharingSettingsData';
import {getDuplicateFriendProfileIds} from '../model/friendDisambiguation';
import {TimetableSharingScopeSheet} from '@/features/timetable/components/TimetableSharingScopeSheet';
import type {TimetableShareScope} from '@/features/timetable/model/timetableDomain';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const getTimetableScopeLabel = (scope?: TimetableShareScope) => {
  switch (scope) {
    case 'DETAILS':
      return '상세 시간표';
    case 'BUSY_ONLY':
      return '바쁜 시간만';
    case 'PRIVATE':
      return '비공개';
    default:
      return '기본값 사용';
  }
};

export const FriendSettingsScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const [scopeTarget, setScopeTarget] = React.useState<
    {friendId: string} | {type: 'default'}
  >();
  const {
    blocks,
    blocksError,
    hasLoadedBlocks,
    loadingBlocks,
    loadingPrivacy,
    privacy,
    privacyError,
    reloadBlocks,
    reloadPrivacy,
    savingPrivacy,
    unblockMember,
    unblockingIds,
    updateNicknameSearchable,
  } = useFriendSettingsData();
  const {
    blocks: contentBlocks,
    error: contentBlocksError,
    hasLoaded: hasLoadedContentBlocks,
    loading: loadingContentBlocks,
    reload: reloadContentBlocks,
    unblockContent,
    unblockingIds: unblockingContentIds,
  } = useContentBlockSettingsData();
  const {
    friends: sharingFriends,
    friendsError: sharingFriendsError,
    getFriendScope,
    loadingFriends: loadingSharingFriends,
    loadingSettings: loadingSharingSettings,
    reload: reloadSharing,
    saving: savingSharing,
    settings: sharingSettings,
    settingsError: sharingSettingsError,
    updateDefaultScope,
    updateFriendScope,
  } = useTimetableSharingSettingsData();
  const duplicateBlockIds = React.useMemo(
    () => getDuplicateFriendProfileIds(blocks),
    [blocks],
  );
  const duplicateSharingFriendIds = React.useMemo(
    () => getDuplicateFriendProfileIds(sharingFriends),
    [sharingFriends],
  );

  const handleUnblock = React.useCallback(
    (friendId: string, nickname: string) => {
      Alert.alert('차단 해제', `${nickname}님의 차단을 해제할까요? 차단을 해제해도 이전 친구 관계는 복원되지 않습니다.`, [
        {text: '취소', style: 'cancel'},
        {
          text: '차단 해제',
          onPress: () => {
            unblockMember(friendId).catch(actionError => {
              if (navigation.isFocused()) {
                Alert.alert('오류', getErrorMessage(actionError, '차단을 해제하지 못했습니다.'));
              }
            });
          },
        },
      ]);
    },
    [navigation, unblockMember],
  );

  const handleUnblockContent = React.useCallback(
    (blockId: string) => {
      Alert.alert(
        '콘텐츠 차단 해제',
        '차단을 해제하면 이 사용자의 게시글과 댓글이 다시 표시될 수 있어요.',
        [
          {text: '취소', style: 'cancel'},
          {
            onPress: () => {
              unblockContent(blockId)
                .then(() => {
                  invalidateData([
                    ...BOARD_DETAIL_READ_INVALIDATION_KEYS,
                    ...NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS,
                  ]);
                })
                .catch(actionError => {
                  if (navigation.isFocused()) {
                    Alert.alert(
                      '오류',
                      getErrorMessage(
                        actionError,
                        '콘텐츠 차단을 해제하지 못했습니다.',
                      ),
                    );
                  }
                });
            },
            text: '차단 해제',
          },
        ],
      );
    },
    [navigation, unblockContent],
  );

  const handleSelectTimetableScope = React.useCallback(
    (scope?: TimetableShareScope) => {
      const target = scopeTarget;
      if (!target) {
        return;
      }

      setScopeTarget(undefined);
      const save = 'type' in target
        ? scope
          ? updateDefaultScope(scope)
          : Promise.resolve()
        : updateFriendScope(target.friendId, scope);
      save.catch(actionError => {
        if (navigation.isFocused()) {
          Alert.alert(
            '오류',
            getErrorMessage(actionError, '시간표 공유 설정을 저장하지 못했습니다.'),
          );
        }
      });
    },
    [navigation, scopeTarget, updateDefaultScope, updateFriendScope],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="친구 설정" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadingPrivacy && !privacy ? (
          <StateCard
            description="검색 공개 설정을 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="검색 공개 설정을 불러오는 중"
          />
        ) : null}
        {privacyError && !privacy ? (
          <StateCard
            actionLabel="다시 시도"
            description={privacyError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadPrivacy().catch(() => undefined);
            }}
            title="검색 공개 설정을 불러오지 못했습니다"
          />
        ) : null}
        {privacy ? (
          <>
            {privacyError ? (
              <FriendDataErrorBanner
                error={privacyError}
                onRetry={() => {
                  reloadPrivacy().catch(() => undefined);
                }}
              />
            ) : null}
            <SettingsSection title="검색 공개 설정">
              <SettingsRow
                accessoryType="toggle"
                iconBackgroundColor={COLORS.brand.primaryTint}
                iconColor={COLORS.brand.primaryStrong}
                iconName="search-outline"
                onToggle={nextValue => {
                  updateNicknameSearchable(nextValue).catch(actionError =>
                    Alert.alert(
                      '오류',
                      getErrorMessage(actionError, '검색 공개 설정을 저장하지 못했습니다.'),
                    ),
                  );
                }}
                subtitle="다른 사용자가 닉네임으로 나를 찾을 수 있어요."
                subtitleNumberOfLines={2}
                title="닉네임 검색 허용"
                titleWeight="700"
                toggleDisabled={savingPrivacy}
                toggleValue={privacy.nicknameSearchable}
              />
            </SettingsSection>
          </>
        ) : null}

        {loadingSharingSettings && !sharingSettings ? (
          <StateCard
            description="친구에게 보이는 시간표 범위를 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            style={styles.sharingStateCard}
            title="시간표 공유 설정을 불러오는 중"
          />
        ) : null}
        {sharingSettingsError && !sharingSettings ? (
          <StateCard
            actionLabel="다시 시도"
            description={sharingSettingsError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadSharing().catch(() => undefined);
            }}
            style={styles.sharingStateCard}
            title="시간표 공유 설정을 불러오지 못했습니다"
          />
        ) : null}
        {sharingSettings ? (
          <>
            {sharingSettingsError ? (
              <FriendDataErrorBanner
                error={sharingSettingsError}
                onRetry={() => {
                  reloadSharing().catch(() => undefined);
                }}
              />
            ) : null}
            <SettingsSection style={styles.sharingSection} title="시간표 공유 설정">
              <SettingsRow
                accessoryType="chevron"
                disabled={savingSharing}
                iconBackgroundColor={COLORS.brand.primaryTint}
                iconColor={COLORS.brand.primaryStrong}
                iconName="calendar-outline"
                onPress={() => setScopeTarget({type: 'default'})}
                subtitle={`${getTimetableScopeLabel(sharingSettings.defaultScope)} · 친구별 예외가 없을 때 적용돼요.`}
                title="기본 공개 범위"
                titleWeight="700"
              />
            </SettingsSection>
            <SettingsSection style={styles.sharingSection} title="친구별 공개 범위">
              {loadingSharingFriends && sharingFriends.length === 0 ? (
                <StateCard
                  description="친구별 공개 범위를 준비하고 있습니다."
                  icon={<ActivityIndicator color={COLORS.brand.primary} />}
                  title="친구 목록을 불러오는 중"
                />
              ) : null}
              {sharingFriendsError && sharingFriends.length === 0 ? (
                <StateCard
                  actionLabel="다시 시도"
                  description={sharingFriendsError}
                  icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
                  onPressAction={() => {
                    reloadSharing().catch(() => undefined);
                  }}
                  title="친구 목록을 불러오지 못했습니다"
                />
              ) : null}
              {sharingFriendsError && sharingFriends.length > 0 ? (
                <FriendDataErrorBanner
                  error={sharingFriendsError}
                  onRetry={() => {
                    reloadSharing().catch(() => undefined);
                  }}
                />
              ) : null}
              {sharingFriends.length > 0 ? (
                sharingFriends.map((friend, index) => {
                  const overrideScope = getFriendScope(friend.id);
                  const effectiveScope =
                    overrideScope ?? sharingSettings.defaultScope;
                  const showIdentifier = duplicateSharingFriendIds.has(friend.id);
                  const identifier = friend.id.slice(-6).toUpperCase();
                  return (
                    <SettingsRow
                      accessibilityLabel={`${friend.nickname} 시간표 공개 범위 변경${showIdentifier ? `, 식별 코드 ${identifier}` : ''}`}
                      accessoryType="chevron"
                      disabled={savingSharing}
                      iconBackgroundColor={COLORS.background.subtle}
                      iconColor={COLORS.text.secondary}
                      iconName="person-outline"
                      key={friend.id}
                      onPress={() => setScopeTarget({friendId: friend.id})}
                      showDivider={index < sharingFriends.length - 1}
                      subtitle={`${getTimetableScopeLabel(effectiveScope)} · ${overrideScope ? '개별 설정' : '기본값 적용'} · ${friend.department || '학과 정보 없음'}${showIdentifier ? ` · 식별 코드 · ${identifier}` : ''}`}
                      subtitleNumberOfLines={showIdentifier ? 2 : 1}
                      title={friend.nickname}
                      titleWeight="700"
                    />
                  );
                })
              ) : null}
              {!loadingSharingFriends &&
              !sharingFriendsError &&
              sharingFriends.length === 0 ? (
                <StateCard
                  description="친구를 추가하면 사람별로 다른 범위를 정할 수 있어요."
                  icon={<Icon color={COLORS.text.muted} name="people-outline" size={28} />}
                  title="친구별 예외가 없어요"
                />
              ) : null}
            </SettingsSection>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>친구 차단</Text>
        {loadingBlocks && !hasLoadedBlocks ? (
          <StateCard
            description="차단 목록을 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="차단 목록을 불러오는 중"
          />
        ) : null}
        {blocksError && !hasLoadedBlocks ? (
          <StateCard
            actionLabel="다시 시도"
            description={blocksError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadBlocks().catch(() => undefined);
            }}
            title="차단 목록을 불러오지 못했습니다"
          />
        ) : null}
        {hasLoadedBlocks ? (
          <>
            {blocksError ? (
              <FriendDataErrorBanner
                error={blocksError}
                onRetry={() => {
                  reloadBlocks().catch(() => undefined);
                }}
              />
            ) : null}
            {blocks.length > 0 ? (
              <View style={styles.blockCard}>
                {blocks.map((block, index) => (
                  <View
                    key={block.id}
                    style={[
                      styles.blockRow,
                      index < blocks.length - 1 ? styles.rowDivider : null,
                    ]}>
                    <FriendAvatar photoUrl={block.photoUrl} />
                    <View style={styles.blockContent}>
                      <Text style={styles.blockName}>{block.nickname}</Text>
                      <Text style={styles.blockDepartment}>
                        {block.department || '학과 정보 없음'}
                      </Text>
                      {duplicateBlockIds.has(block.id) ? (
                        <Text style={styles.blockIdentifier}>
                          식별 코드 · {block.id.slice(-6).toUpperCase()}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={unblockingIds.has(block.id)}
                      onPress={() => handleUnblock(block.id, block.nickname)}
                      style={styles.unblockButton}>
                      {unblockingIds.has(block.id) ? (
                        <ActivityIndicator color={COLORS.text.secondary} size="small" />
                      ) : (
                        <Text style={styles.unblockText}>차단 해제</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <StateCard
                description="친구 기능에서 차단한 사용자가 없어요."
                icon={<Icon color={COLORS.text.muted} name="shield-checkmark-outline" size={28} />}
                title="친구 차단 목록이 비어 있어요"
              />
            )}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>콘텐츠 차단</Text>
        {loadingContentBlocks && !hasLoadedContentBlocks ? (
          <StateCard
            description="게시글과 댓글에서 차단한 사용자를 확인하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="콘텐츠 차단 목록을 불러오는 중"
          />
        ) : null}
        {contentBlocksError && !hasLoadedContentBlocks ? (
          <StateCard
            actionLabel="다시 시도"
            description={contentBlocksError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadContentBlocks().catch(() => undefined);
            }}
            title="콘텐츠 차단 목록을 불러오지 못했습니다"
          />
        ) : null}
        {hasLoadedContentBlocks ? (
          <>
            {contentBlocksError ? (
              <FriendDataErrorBanner
                error={contentBlocksError}
                onRetry={() => {
                  reloadContentBlocks().catch(() => undefined);
                }}
              />
            ) : null}
            {contentBlocks.length > 0 ? (
              <View style={styles.blockCard}>
                {contentBlocks.map((block, index) => (
                  <View
                    key={block.id}
                    style={[
                      styles.blockRow,
                      index < contentBlocks.length - 1
                        ? styles.rowDivider
                        : null,
                    ]}>
                    <View style={styles.contentBlockIcon}>
                      <Icon
                        color={COLORS.text.secondary}
                        name="person-outline"
                        size={20}
                      />
                    </View>
                    <View style={styles.blockContent}>
                      <Text style={styles.blockName}>{block.label}</Text>
                      <Text style={styles.blockDepartment}>
                        게시글·댓글 작성자 ·{' '}
                        {formatKoreanAbsoluteDate(block.blockedAt)} 차단
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityLabel="콘텐츠 차단 해제"
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={unblockingContentIds.has(block.id)}
                      onPress={() => handleUnblockContent(block.id)}
                      style={styles.unblockButton}>
                      {unblockingContentIds.has(block.id) ? (
                        <ActivityIndicator
                          color={COLORS.text.secondary}
                          size="small"
                        />
                      ) : (
                        <Text style={styles.unblockText}>차단 해제</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <StateCard
                description="게시글이나 댓글에서 차단한 사용자가 없어요."
                icon={<Icon color={COLORS.text.muted} name="shield-checkmark-outline" size={28} />}
                title="콘텐츠 차단 목록이 비어 있어요"
              />
            )}
          </>
        ) : null}
      </ScrollView>
      <TimetableSharingScopeSheet
        allowDefault={Boolean(scopeTarget && !('type' in scopeTarget))}
        currentScope={
          scopeTarget && 'type' in scopeTarget
            ? sharingSettings?.defaultScope
            : scopeTarget
              ? getFriendScope(scopeTarget.friendId)
              : undefined
        }
        onClose={() => setScopeTarget(undefined)}
        onSelect={handleSelectTimetableScope}
        visible={Boolean(scopeTarget)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  sharingStateCard: {marginTop: SPACING.xl},
  sharingSection: {marginTop: SPACING.xl},
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: 4,
  },
  blockCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  blockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
  },
  rowDivider: {borderBottomColor: COLORS.border.subtle, borderBottomWidth: 1},
  blockContent: {flex: 1, marginLeft: SPACING.md},
  blockName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  blockDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  blockIdentifier: {color: COLORS.text.tertiary, fontSize: 11, lineHeight: 16, marginTop: 2},
  contentBlockIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  unblockButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    height: 34,
    justifyContent: 'center',
    minWidth: 66,
    paddingHorizontal: SPACING.sm,
  },
  unblockText: {color: COLORS.text.secondary, fontSize: 12, fontWeight: '700'},
});
