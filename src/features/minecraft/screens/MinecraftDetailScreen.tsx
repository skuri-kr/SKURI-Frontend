import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import Animated, {
  interpolate,
  LayoutAnimationConfig,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {navigateToChatRoom} from '@/app/navigation/services/communityNavigation';
import {type CampusStackParamList} from '@/app/navigation/types';
import {
  StateCard,
  ToneBadge,
} from '@/shared/design-system/components';
import {
  COLORS,
  MOTION,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/design-system/tokens';
import {
  enteringTransitions,
  exitingTransitions,
  layoutTransitions,
} from '@/shared/design-system/motion';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {MinecraftServerGuideModal} from '../components/MinecraftServerGuideModal';
import {
  GUIDE_SERVER_ADDRESS_FALLBACK,
  MINECRAFT_CHAT_ROOM_ID,
} from '../constants/minecraftGuide';
import {useMinecraftServerOverview} from '../hooks/useMinecraftServerOverview';
import {useMinecraftWhitelistPlayers} from '../hooks/useMinecraftWhitelistPlayers';
import type {MinecraftWhitelistPlayer} from '../model/types';
import {MinecraftStackHeader} from '../components/MinecraftStackHeader';

const getAvatarUri = (uuid?: string) => {
  const avatarKey =
    uuid && !uuid.startsWith('be:')
      ? uuid
      : '8667ba71b85a4004af54457a9734eed7';

  return `https://minotar.net/avatar/${avatarKey}/48`;
};

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) {
    return '-';
  }

  try {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString(
      'ko-KR',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    )}`;
  } catch {
    return '-';
  }
};

const sortWhitelistPlayers = <T extends MinecraftWhitelistPlayer>(
  players: T[],
) => {
  const parents = players
    .filter(player => !player.whoseFriend)
    .sort((left, right) => left.username.localeCompare(right.username, 'ko'));
  const friends = players
    .filter(player => !!player.whoseFriend)
    .sort((left, right) => {
      const ownerCompare = (left.whoseFriend ?? '').localeCompare(
        right.whoseFriend ?? '',
        'ko',
      );

      if (ownerCompare !== 0) {
        return ownerCompare;
      }

      return left.username.localeCompare(right.username, 'ko');
    });

  return [...parents, ...friends];
};

type WhitelistPlayerGroup<T extends MinecraftWhitelistPlayer> = {
  friends: T[];
  parent: T;
};

const groupWhitelistPlayers = <T extends MinecraftWhitelistPlayer>(
  players: T[],
): WhitelistPlayerGroup<T>[] => {
  const parents = players
    .filter(player => !player.whoseFriend)
    .sort((left, right) => left.username.localeCompare(right.username, 'ko'));
  const friendsByParent = new Map<string, T[]>();

  players
    .filter(player => !!player.whoseFriend)
    .forEach(friend => {
      const parentName = friend.whoseFriend ?? '';
      const friends = friendsByParent.get(parentName) ?? [];

      friends.push(friend);
      friendsByParent.set(parentName, friends);
    });

  return parents.map(parent => ({
    parent,
    friends: (friendsByParent.get(parent.username) ?? []).sort((left, right) =>
      left.username.localeCompare(right.username, 'ko'),
    ),
  }));
};

const MEMBER_LAYOUT_TRANSITION = layoutTransitions.cardExpand();
const MEMBER_ENTERING_TRANSITION = enteringTransitions.fadeInDown();
const MEMBER_EXITING_TRANSITION = exitingTransitions.fadeOutUp();

interface AnimatedChevronProps {
  color: string;
  expanded: boolean;
  size: number;
}

const AnimatedChevron = ({color, expanded, size}: AnimatedChevronProps) => {
  const progress = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: MOTION.duration.fast,
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon color={color} name="chevron-down" size={size} />
    </Animated.View>
  );
};

export const MinecraftDetailScreen = () => {
  useScreenView();

  const navigation =
    useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {error, loading, serverStatus, serverUrl, serverVersion} =
    useMinecraftServerOverview();
  const {
    fetchingUsers,
    loading: loadingPlayers,
    players,
  } = useMinecraftWhitelistPlayers();
  const [isGuideModalVisible, setGuideModalVisible] = React.useState(false);
  const [expandedMemberParentIds, setExpandedMemberParentIds] =
    React.useState<Set<string> | null>(null);

  const memberGroups = React.useMemo(
    () => groupWhitelistPlayers(players),
    [players],
  );
  const expandableMemberParentIds = React.useMemo(
    () =>
      memberGroups
        .filter(group => group.friends.length > 0)
        .map(group => group.parent.id),
    [memberGroups],
  );
  const visibleExpandedMemberParentIds = React.useMemo(
    () => expandedMemberParentIds ?? new Set(expandableMemberParentIds),
    [expandedMemberParentIds, expandableMemberParentIds],
  );
  const areAllMemberGroupsExpanded =
    expandableMemberParentIds.length > 0 &&
    expandableMemberParentIds.every(parentId =>
      visibleExpandedMemberParentIds.has(parentId),
    );

  const onlinePlayers = React.useMemo(
    () => sortWhitelistPlayers(players.filter(player => player.online)),
    [players],
  );
  const isServerOnline = Boolean(serverStatus?.online);
  const hasOverviewData = Boolean(serverStatus || serverUrl || serverVersion);
  const guideServerAddress = serverUrl || GUIDE_SERVER_ADDRESS_FALLBACK;

  const handleCopyServerUrl = React.useCallback(() => {
    if (!serverUrl) {
      Alert.alert('알림', '서버 주소를 아직 불러오지 못했습니다.');
      return;
    }

    Clipboard.setString(serverUrl);
    Alert.alert('복사 완료', '서버 주소를 복사했습니다.');
  }, [serverUrl]);

  const handleOpenGuideModal = React.useCallback(() => {
    setGuideModalVisible(true);
  }, []);

  const handleCloseGuideModal = React.useCallback(() => {
    setGuideModalVisible(false);
  }, []);

  const handlePressGoToAccountRegistration = React.useCallback(() => {
    setGuideModalVisible(false);
    navigation.navigate('MinecraftAccount');
  }, [navigation]);

  const handleToggleAllMemberGroups = React.useCallback(() => {
    setExpandedMemberParentIds(currentExpandedIds => {
      const currentIds =
        currentExpandedIds ?? new Set(expandableMemberParentIds);
      const shouldCollapse =
        expandableMemberParentIds.length > 0 &&
        expandableMemberParentIds.every(parentId => currentIds.has(parentId));

      return shouldCollapse ? new Set() : new Set(expandableMemberParentIds);
    });
  }, [expandableMemberParentIds]);

  const handleToggleMemberGroup = React.useCallback(
    (parentId: string) => {
      setExpandedMemberParentIds(currentExpandedIds => {
        const nextExpandedIds = new Set(
          currentExpandedIds ?? expandableMemberParentIds,
        );

        if (nextExpandedIds.has(parentId)) {
          nextExpandedIds.delete(parentId);
        } else {
          nextExpandedIds.add(parentId);
        }

        return nextExpandedIds;
      });
    },
    [expandableMemberParentIds],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <MinecraftStackHeader
        onPressBack={() => navigation.goBack()}
        title="마인크래프트 서버 정보"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {loading && !hasOverviewData ? (
          <StateCard
            description="서버 상태와 접속 정보를 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="서버 정보를 불러오는 중"
          />
        ) : null}

        {!loading && error && !hasOverviewData ? (
          <StateCard
            description={error}
            icon={
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={28}
              />
            }
            title="서버 정보를 불러오지 못했습니다"
          />
        ) : null}

        {!loading || hasOverviewData ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <View style={styles.titleRow}>
                    <Image
                      source={require('../../../../assets/images/minecraft/grass.png')}
                      style={styles.summaryTitleIcon} />
                    <Text style={styles.summaryTitle}>스쿠리 서버 상태</Text>
                  </View>
                  <Text style={styles.summarySubtitle}>
                    마지막 업데이트 {formatDateTime(serverStatus?.updatedAt)}
                  </Text>
                </View>

                <ToneBadge
                  label={isServerOnline ? '온라인' : '오프라인'}
                  tone={isServerOnline ? 'green' : 'orange'}
                />
              </View>

              <View style={styles.summaryMetrics}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>현재 접속 인원</Text>
                  <Text style={styles.metricValue}>
                    {serverStatus
                      ? `${serverStatus.currentPlayers ?? 0}/${
                          serverStatus.maxPlayers ??
                          serverStatus.currentPlayers ??
                          0
                        }`
                      : '-'}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>서버 버전</Text>
                  <Text style={styles.metricValue}>
                    {serverVersion || '확인 중'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={handleOpenGuideModal}
              style={styles.guideShortcutButton}>
              <View style={styles.guideShortcutLeft}>
                <View style={styles.guideShortcutIconWrap}>
                  <Icon
                    color={COLORS.brand.primaryStrong}
                    name="compass-outline"
                    size={20}
                  />
                </View>
                <View style={styles.guideShortcutTextWrap}>
                  <Text style={styles.guideShortcutTitle}>
                    마인크래프트 스쿠리 서버에 접속하는 법
                  </Text>
                  <Text style={styles.guideShortcutSubtitle}>
                    계정 등록부터 멀티플레이 접속 방법까지 한 번에 확인할 수 있어요.
                  </Text>
                </View>
              </View>
              <Icon
                color={COLORS.text.inverse}
                name="chevron-forward"
                size={18}
              />
            </TouchableOpacity>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleWrap}>
                  <Image
                    source={require('../../../../assets/images/minecraft/creeper.png')}
                    style={styles.cardTitleIcon} />
                  <Text style={styles.cardTitle}>스쿠리 서버 정보</Text>
                </View>
              </View>

              <View style={styles.serverAddressCard}>
                <Text style={styles.serverAddressLabel}>서버 주소</Text>
                <Text style={styles.serverAddressValue}>
                  {serverUrl || '서버 주소를 확인하고 있습니다.'}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.88}
                  disabled={!serverUrl}
                  onPress={handleCopyServerUrl}
                  style={[
                    styles.copyButton,
                    serverUrl ? styles.copyButtonEnabled : undefined,
                  ]}>
                  <Icon
                    color={serverUrl ? COLORS.text.inverse : COLORS.text.muted}
                    name="copy-outline"
                    size={18}
                  />
                  <Text
                    style={[
                      styles.copyButtonText,
                      serverUrl ? styles.copyButtonTextEnabled : undefined,
                    ]}>
                    주소 복사
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBanner}>
                <Icon
                  color={COLORS.accent.blue}
                  name="information-circle-outline"
                  size={16}
                />
                <View style={styles.infoBannerBody}>
                  <Text style={styles.infoBannerText}>
                    JE: 멀티플레이어에서 서버 추가 후 주소를 입력하세요.
                  </Text>
                  <Text style={styles.infoBannerText}>
                    BE: 서버 목록에서 서버 추가 후 주소를 입력하세요.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                onPress={() => {
                  navigateToChatRoom(MINECRAFT_CHAT_ROOM_ID);
                }}
                style={styles.secondaryAction}>
                <View style={styles.secondaryActionLeft}>
                  <Icon
                    color={COLORS.accent.orange}
                    name="chatbubbles-outline"
                    size={20}
                  />
                  <View>
                    <Text style={styles.secondaryActionTitle}>
                      스쿠리 서버 채팅방
                    </Text>
                    <Text style={styles.secondaryActionSubtitle}>
                      스쿠리 앱에서 서버 내로 채팅을 보낼 수 있어요.
                    </Text>
                  </View>
                </View>
                <Icon
                  color={COLORS.text.muted}
                  name="chevron-forward"
                  size={18}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleWrap}>
                  <Icon color={COLORS.brand.primary} name="pulse-outline" size={18} />
                  <Text style={styles.cardTitle}>현재 접속자</Text>
                </View>
                <Text style={styles.headerMeta}>
                  {serverStatus
                    ? `${serverStatus.currentPlayers ?? 0}명 접속 중`
                    : '상태 확인 중'}
                </Text>
              </View>

              {loading && !serverStatus ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={COLORS.brand.primary} />
                  <Text style={styles.centerStateText}>
                    접속자 정보를 불러오고 있습니다.
                  </Text>
                </View>
              ) : onlinePlayers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon color={COLORS.text.muted} name="people-outline" size={28} />
                  <Text style={styles.emptyStateTitle}>
                    현재 접속 중인 플레이어가 없습니다
                  </Text>
                  <Text style={styles.emptyStateDescription}>
                    서버에 접속해서 유일한 생존자가 되어 보세요!
                  </Text>
                </View>
              ) : (
                onlinePlayers.map((player, index) => (
                  <View
                    key={`${player.uuid ?? player.username}-${index}`}
                    style={[
                      styles.playerRow,
                      index < onlinePlayers.length - 1
                        ? styles.playerRowDivider
                        : undefined,
                    ]}>
                    <Image
                      source={{uri: getAvatarUri(player.uuid)}}
                      style={styles.avatar}
                    />

                    <View style={styles.playerBody}>
                      <Text style={styles.playerName}>{player.username}</Text>
                      <Text style={styles.playerMeta}>실시간 서버 접속 중</Text>
                    </View>

                    <ToneBadge label="온라인" tone="green" />
                  </View>
                ))
              )}
            </View>

            <Animated.View
              layout={MEMBER_LAYOUT_TRANSITION}
              style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleWrap}>
                  <Icon color={COLORS.accent.purple} name="people-outline" size={18} />
                  <Text style={styles.cardTitle}>서버 멤버 목록</Text>
                  {!loadingPlayers ? (
                    <ToneBadge
                      badgeStyle={styles.memberCountBadge}
                      label={`총 ${players.length}명`}
                      textStyle={styles.memberCountBadgeText}
                      tone="purple"
                    />
                  ) : null}
                </View>

                <View style={styles.cardHeaderActions}>
                  {fetchingUsers ? (
                    <ActivityIndicator color={COLORS.text.muted} size="small" />
                  ) : null}
                  {expandableMemberParentIds.length > 0 ? (
                    <TouchableOpacity
                      accessibilityLabel={
                        areAllMemberGroupsExpanded
                          ? '서버 멤버 목록 모두 접기'
                          : '서버 멤버 목록 모두 펼치기'
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        expanded: areAllMemberGroupsExpanded,
                      }}
                      activeOpacity={0.8}
                      onPress={handleToggleAllMemberGroups}
                      style={styles.memberHeaderToggleButton}>
                      <Text style={styles.memberHeaderToggleText}>
                        {areAllMemberGroupsExpanded ? '모두 접기' : '모두 펼치기'}
                      </Text>
                      <AnimatedChevron
                        color={COLORS.accent.purple}
                        expanded={areAllMemberGroupsExpanded}
                        size={16}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {loadingPlayers ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={COLORS.accent.purple} />
                  <Text style={styles.centerStateText}>
                    화이트리스트 멤버를 불러오고 있습니다.
                  </Text>
                </View>
              ) : memberGroups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon
                    color={COLORS.text.muted}
                    name="list-circle-outline"
                    size={28}
                  />
                  <Text style={styles.emptyStateTitle}>등록된 멤버가 없습니다</Text>
                  <Text style={styles.emptyStateDescription}>
                    계정 등록 화면에서 대표 계정과 친구 계정을 추가할 수 있습니다.
                  </Text>
                </View>
              ) : (
                <LayoutAnimationConfig skipEntering>
                  {memberGroups.map((group, index) => {
                    const {friends, parent} = group;
                    const hasFriends = friends.length > 0;
                    const isExpanded =
                      visibleExpandedMemberParentIds.has(parent.id);

                    return (
                      <Animated.View
                        key={parent.id}
                        layout={MEMBER_LAYOUT_TRANSITION}
                        style={[
                          index < memberGroups.length - 1
                            ? styles.playerRowDivider
                            : undefined,
                        ]}>
                        <View style={styles.playerRow}>
                          <Image
                            source={{uri: getAvatarUri(parent.uuid)}}
                            style={styles.avatar}
                          />

                          <View style={styles.playerBody}>
                            <View style={styles.memberTitleRow}>
                              <Text style={styles.playerName}>
                                {parent.username}
                              </Text>
                              <ToneBadge
                                label={parent.edition ?? 'JE'}
                                tone={
                                  parent.edition === 'BE' ? 'purple' : 'blue'
                                }
                                badgeStyle={styles.playerBadge}
                                textStyle={styles.playerBadgeText}
                              />
                            </View>

                            <View style={styles.playerMetaRow}>
                              <Text style={styles.playerMeta}>
                                등록자 {parent.addedByDisplayName}
                              </Text>
                              <ToneBadge
                                label="대표 계정"
                                tone="green"
                                badgeStyle={styles.playerBadge}
                                textStyle={styles.playerBadgeText}
                              />
                            </View>
                            <Text style={styles.playerMeta}>
                              최근 접속 {formatDateTime(parent.lastSeenAt)}
                            </Text>
                          </View>

                          {hasFriends ? (
                            <TouchableOpacity
                              accessibilityLabel={`${parent.username} 친구 계정 ${
                                isExpanded ? '접기' : '펼치기'
                              }`}
                              accessibilityRole="button"
                              accessibilityState={{expanded: isExpanded}}
                              activeOpacity={0.75}
                              onPress={() => handleToggleMemberGroup(parent.id)}
                              style={styles.memberArrowButton}>
                              <AnimatedChevron
                                color={COLORS.text.secondary}
                                expanded={isExpanded}
                                size={20}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {isExpanded && hasFriends ? (
                          <Animated.View
                            entering={MEMBER_ENTERING_TRANSITION}
                            exiting={MEMBER_EXITING_TRANSITION}
                            layout={MEMBER_LAYOUT_TRANSITION}
                            style={styles.friendList}>
                            {friends.map((friend, friendIndex) => (
                              <View
                                key={friend.id}
                                style={[
                                  styles.friendRow,
                                  friendIndex < friends.length - 1
                                    ? styles.friendRowDivider
                                    : undefined,
                                ]}>
                                <Image
                                  source={{uri: getAvatarUri(friend.uuid)}}
                                  style={styles.friendAvatar}
                                />

                                <View style={styles.playerBody}>
                                  <View style={styles.memberTitleRow}>
                                    <Text style={styles.playerName}>
                                      {friend.username}
                                    </Text>
                                    <ToneBadge
                                      label={friend.edition ?? 'JE'}
                                      tone={
                                        friend.edition === 'BE'
                                          ? 'purple'
                                          : 'blue'
                                      }
                                      badgeStyle={styles.playerBadge}
                                      textStyle={styles.playerBadgeText}
                                    />
                                  </View>

                                  <View style={styles.playerMetaRow}>
                                    <Text style={styles.playerMeta}>
                                      등록자 {friend.addedByDisplayName}
                                    </Text>
                                    <ToneBadge
                                      label="친구 계정"
                                      tone="orange"
                                      badgeStyle={styles.playerBadge}
                                      textStyle={styles.playerBadgeText}
                                    />
                                  </View>
                                  <Text style={styles.playerMeta}>
                                    최근 접속 {formatDateTime(friend.lastSeenAt)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </Animated.View>
                        ) : null}
                      </Animated.View>
                    );
                  })}
                </LayoutAnimationConfig>
              )}
            </Animated.View>

          </>
        ) : null}
      </ScrollView>

      <MinecraftServerGuideModal
        onClose={handleCloseGuideModal}
        onPressAccountRegistration={handlePressGoToAccountRegistration}
        serverAddress={guideServerAddress}
        visible={isGuideModalVisible}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.lg,
  },
  summaryCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  guideShortcutButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    ...SHADOWS.floating,
  },
  guideShortcutLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: SPACING.md,
  },
  guideShortcutIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background.pageHeader,
    borderRadius: RADIUS.md,
    height: 40,
    justifyContent: 'center',
    marginRight: SPACING.md,
    width: 40,
  },
  guideShortcutTextWrap: {
    flex: 1,
  },
  guideShortcutTitle: {
    color: COLORS.text.inverse,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  guideShortcutSubtitle: {
    color: 'rgba(255, 255, 255, 0.84)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  summaryTitleIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.xs,
  },
  summaryTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  summarySubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  metricCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  metricLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  cardHeaderTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cardHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardTitleIcon: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
  },
  headerMeta: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
  },
  memberHeaderToggleButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.purpleSoft,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: 2,
    minHeight: 30,
    paddingHorizontal: SPACING.sm,
  },
  memberHeaderToggleText: {
    color: COLORS.accent.purple,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  memberCountBadge: {
    minHeight: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  memberCountBadgeText: {
    ...TYPOGRAPHY.caption2,
    fontWeight: '700',
  },
  serverAddressCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  serverAddressLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  serverAddressValue: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 6,
  },
  copyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.page,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    marginTop: SPACING.md,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
  },
  copyButtonEnabled: {
    backgroundColor: COLORS.accent.blue,
  },
  copyButtonText: {
    color: COLORS.text.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginLeft: SPACING.xs,
  },
  copyButtonTextEnabled: {
    color: COLORS.text.inverse,
  },
  infoBanner: {
    backgroundColor: COLORS.accent.blueSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  infoBannerBody: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoBannerText: {
    color: COLORS.accent.blue,
    fontSize: 12,
    lineHeight: 18,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  secondaryActionLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    marginRight: SPACING.md,
  },
  secondaryActionTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  secondaryActionSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  centerStateText: {
    color: COLORS.text.tertiary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    minHeight: 140,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  emptyStateTitle: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateDescription: {
    color: COLORS.text.tertiary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  playerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingVertical: SPACING.sm,
  },
  playerRowDivider: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
  },
  avatar: {
    borderRadius: 12,
    height: 48,
    marginRight: SPACING.md,
    width: 48,
  },
  playerBody: {
    flex: 1,
  },
  memberArrowButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    width: 36,
  },
  playerName: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  playerMeta: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  playerMetaRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  memberTitleRow: {
    alignItems: 'center',
    columnGap: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: SPACING.xs,
  },
  playerBadge: {
    minHeight: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  playerBadgeText: {
    ...TYPOGRAPHY.caption2,
    fontWeight: '600'
  },
  friendList: {
    backgroundColor: COLORS.background.grayLight,
    borderRadius: RADIUS.sm,
  },
  friendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingLeft: 30,
    paddingVertical: SPACING.sm,
  },
  friendRowDivider: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
  },
  friendAvatar: {
    borderRadius: 10,
    height: 40,
    marginRight: SPACING.md,
    width: 40,
  },
});
