import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  navigateToCommunityChat,
  navigateToTaxiChat,
} from '@/app/navigation/services/appRouteNavigation';
import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {SegmentedControl, StackHeader, StateCard} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {
  enteringTransitions,
  exitingTransitions,
  layoutTransitions,
} from '@/shared/design-system/motion';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendRequestCard} from '../components/FriendRequestCard';
import {FriendInvitationCard} from '../components/FriendInvitationCard';
import {FriendRow} from '../components/FriendRow';
import {FriendDataErrorBanner} from '../components/FriendDataErrorBanner';
import {useFriendHubData} from '../hooks/useFriendHubData';
import {useFriendInvitationsData} from '../hooks/useFriendInvitationsData';
import {getDuplicateFriendProfileIds} from '../model/friendDisambiguation';

type FriendHubTab = 'friends' | 'requests' | 'invitations';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const FriendHubScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const route = useRoute<RouteProp<CampusStackParamList, 'FriendHub'>>();
  const isFocused = useIsFocused();
  const hasReceivedInitialFocus = React.useRef(false);
  const lastInvalidationVersionRef = React.useRef<number | undefined>(undefined);
  const friendHubInvalidationVersion = useInvalidationVersion(
    FRIEND_HUB_INVALIDATION_KEY,
  );
  const [selectedTab, setSelectedTab] = React.useState<FriendHubTab>(
    route.params?.initialTab ?? 'friends',
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const {
    acceptRequest,
    cancelRequest,
    completedRequestActions,
    declineRequest,
    friendError,
    friends,
    hasLoadedFriends,
    hasLoadedReceivedRequests,
    hasLoadedSentRequests,
    incomingRequestCount,
    loadingMoreDirections,
    loadMoreRequests,
    mutatingRequestActions,
    mutatingRequestIds,
    receivedRequests,
    receivedNextCursor,
    receivedRequestsError,
    reload,
    reloadFriends,
    reloadRequestDirection,
    sentRequests,
    sentNextCursor,
    sentRequestsError,
    updateFavorite,
    updatingFavoriteIds,
  } = useFriendHubData();
  const {
    acceptInvitation,
    chatError: chatInvitationError,
    declineInvitation,
    deleteInvitation,
    hasLoaded: hasLoadedInvitations,
    invitations,
    loading: invitationsLoading,
    mutatingIds: mutatingInvitationIds,
    partyError: partyInvitationError,
    pendingCount: pendingInvitationCount,
    reload: reloadInvitations,
  } = useFriendInvitationsData();

  React.useEffect(() => {
    if (lastInvalidationVersionRef.current === undefined) {
      lastInvalidationVersionRef.current = friendHubInvalidationVersion;
      return;
    }
    if (lastInvalidationVersionRef.current === friendHubInvalidationVersion) {
      return;
    }

    lastInvalidationVersionRef.current = friendHubInvalidationVersion;
    if (isFocused) {
      Promise.all([reload(), reloadInvitations()]).catch(() => undefined);
    }
  }, [friendHubInvalidationVersion, isFocused, reload, reloadInvitations]);

  const duplicateRequestFriendIds = React.useMemo(
    () => getDuplicateFriendProfileIds(
      [...receivedRequests, ...sentRequests].map(request => request.friend),
    ),
    [receivedRequests, sentRequests],
  );
  const duplicateFriendIds = React.useMemo(
    () => getDuplicateFriendProfileIds(friends),
    [friends],
  );
  const requestTabLabel =
    incomingRequestCount !== undefined
      ? `요청 ${incomingRequestCount}`
      : hasLoadedReceivedRequests
        ? `요청 ${receivedRequests.length}${receivedNextCursor ? '+' : ''}`
        : '요청';
  const hasAnyPendingRequests =
    receivedRequests.length > 0 || sentRequests.length > 0;
  const hasInitialRequestLoadPending =
    (!hasLoadedReceivedRequests && !receivedRequestsError) ||
    (!hasLoadedSentRequests && !sentRequestsError);
  const invitationTabLabel = hasLoadedInvitations && pendingInvitationCount !== undefined
    ? `초대 ${pendingInvitationCount}`
    : '초대';

  React.useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (!initialTab) {
      return;
    }

    setSelectedTab(initialTab);
    navigation.setParams({initialTab: undefined});
  }, [navigation, route.params?.initialTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasReceivedInitialFocus.current) {
        hasReceivedInitialFocus.current = true;
        return;
      }

      Promise.all([reload(), reloadInvitations()]).catch(() => undefined);
    }, [reload, reloadInvitations]),
  );

  const showErrorAlert = React.useCallback(
    (error: unknown, fallback: string) => {
      if (navigation.isFocused()) {
        Alert.alert('오류', getErrorMessage(error, fallback));
      }
    },
    [navigation],
  );

  const handleFavorite = React.useCallback(
    async (friend: (typeof friends)[number]) => {
      try {
        await updateFavorite(friend);
      } catch (updateError) {
        showErrorAlert(updateError, '즐겨찾기를 변경하지 못했습니다.');
      }
    },
    [showErrorAlert, updateFavorite],
  );

  const handleAccept = React.useCallback(
    async (requestId: string) => {
      try {
        await acceptRequest(requestId);
      } catch (acceptError) {
        showErrorAlert(acceptError, '친구 요청을 수락하지 못했습니다.');
      }
    },
    [acceptRequest, showErrorAlert],
  );

  const handleDecline = React.useCallback((requestId: string) => {
    declineRequest(requestId).catch(declineError => {
      showErrorAlert(declineError, '친구 요청을 거절하지 못했습니다.');
    });
  }, [declineRequest, showErrorAlert]);

  const handleCancel = React.useCallback(
    (requestId: string) => {
      Alert.alert('친구 요청 취소', '보낸 친구 요청을 취소할까요?', [
        {text: '닫기', style: 'cancel'},
        {
          text: '요청 취소',
          style: 'destructive',
          onPress: () => {
            cancelRequest(requestId).catch(cancelError => {
              showErrorAlert(cancelError, '친구 요청을 취소하지 못했습니다.');
            });
          },
        },
      ]);
    },
    [cancelRequest, showErrorAlert],
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(), reloadInvitations()]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadInvitations]);

  const handleAcceptInvitation = React.useCallback(
    async (invitation: (typeof invitations)[number]) => {
      try {
        const mutation = await acceptInvitation(invitation);
        if (!mutation) {
          return;
        }
        if (!navigation.isFocused()) {
          return;
        }
        if (mutation.type === 'PARTY') {
          navigateToTaxiChat(mutation.targetId);
        } else {
          navigateToCommunityChat(mutation.targetId);
        }
      } catch (acceptError) {
        showErrorAlert(acceptError, '초대를 수락하지 못했습니다. 최신 상태를 확인해 주세요.');
      }
    },
    [acceptInvitation, navigation, showErrorAlert],
  );

  const handleDeclineInvitation = React.useCallback(
    (invitation: (typeof invitations)[number]) => {
      declineInvitation(invitation).catch(declineError => {
        showErrorAlert(declineError, '초대를 거절하지 못했습니다.');
      });
    },
    [declineInvitation, showErrorAlert],
  );

  const handleDeleteInvitation = React.useCallback(
    (invitation: (typeof invitations)[number]) => {
      deleteInvitation(invitation).catch(deleteError => {
        showErrorAlert(deleteError, '초대 기록을 지우지 못했습니다.');
      });
    },
    [deleteInvitation, showErrorAlert],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        rightAccessory={
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityLabel="친구 추가"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => navigation.navigate('FriendAdd')}
              style={styles.headerButton}>
              <Icon color={COLORS.text.primary} name="person-add-outline" size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="친구 설정"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => navigation.navigate('FriendSettings')}
              style={styles.headerButton}>
              <Icon color={COLORS.text.primary} name="settings-outline" size={21} />
            </TouchableOpacity>
          </View>
        }
        title="친구"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[COLORS.brand.primary]}
            onRefresh={() => {
              handleRefresh().catch(() => undefined);
            }}
            refreshing={refreshing}
            tintColor={COLORS.brand.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <SegmentedControl<FriendHubTab>
          items={[
            {id: 'friends', label: `친구 ${friends.length}`},
            {
              id: 'requests',
              label: requestTabLabel,
            },
            {id: 'invitations', label: invitationTabLabel},
          ]}
          onSelect={setSelectedTab}
          selectedId={selectedTab}
          style={styles.tabControl}
          variant="surface"
        />

        <Animated.View
          entering={enteringTransitions.fadeInDown()}
          exiting={exitingTransitions.fadeOutUp()}
          key={selectedTab}
          layout={layoutTransitions.gentleExpand()}>
        {selectedTab === 'friends' ? (
          !hasLoadedFriends ? (
            friendError ? (
              <StateCard
                actionLabel="다시 시도"
                description={friendError}
                icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
                onPressAction={() => { reloadFriends().catch(() => undefined); }}
                title="친구 목록을 불러오지 못했습니다"
              />
            ) : (
              <StateCard
                description="친구 목록을 준비하고 있습니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="친구를 불러오는 중"
              />
            )
          ) : (
            <>
              {friendError ? <FriendDataErrorBanner error={friendError} onRetry={reloadFriends} /> : null}
              {friends.length > 0 ? (
                <View style={styles.listCard}>
                  {friends.map((friend, index) => (
                    <View key={friend.id} style={index < friends.length - 1 ? styles.rowDivider : undefined}>
                      <FriendRow
                        disabled={updatingFavoriteIds.has(friend.id)}
                        friend={friend}
                        onPress={() => navigation.navigate('FriendDetail', {friendId: friend.id})}
                        onPressFavorite={() => { handleFavorite(friend).catch(() => undefined); }}
                        showIdentifier={duplicateFriendIds.has(friend.id)}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <StateCard
                  actionLabel="친구 추가"
                  description="친구 코드를 입력하거나 닉네임으로 찾아보세요."
                  icon={<Icon color={COLORS.brand.primary} name="people-outline" size={28} />}
                  onPressAction={() => navigation.navigate('FriendAdd')}
                  title="아직 친구가 없어요"
                />
              )}
            </>
          )
        ) : null}

        {selectedTab === 'requests' ? (
          <View style={styles.requestContent}>
            {hasInitialRequestLoadPending && !hasAnyPendingRequests ? (
              <StateCard
                description="친구 요청을 준비하고 있습니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="친구 요청을 불러오는 중"
              />
            ) : null}
            {!hasLoadedReceivedRequests && receivedRequestsError ? (
              <StateCard
                actionLabel="다시 시도"
                description={receivedRequestsError}
                icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
                onPressAction={() => { reloadRequestDirection('RECEIVED').catch(() => undefined); }}
                title="받은 친구 요청을 불러오지 못했습니다"
              />
            ) : null}
            {hasLoadedReceivedRequests ? (
              <>
                {receivedRequestsError ? <FriendDataErrorBanner error={receivedRequestsError} onRetry={() => reloadRequestDirection('RECEIVED')} /> : null}
                {hasAnyPendingRequests ? (
                  <>
                    <Text style={styles.sectionTitle}>받은 요청</Text>
                    {receivedRequests.length > 0 ? receivedRequests.map(request => (
                      <FriendRequestCard
                        key={request.id}
                        completedAction={completedRequestActions.get(request.id)}
                        loading={mutatingRequestIds.has(request.id)}
                        mode="received"
                        pendingAction={mutatingRequestActions.get(request.id)}
                        onAccept={() => { handleAccept(request.id).catch(() => undefined); }}
                        onDecline={() => handleDecline(request.id)}
                        request={request}
                        showIdentifier={duplicateRequestFriendIds.has(request.friend.id)}
                      />
                    )) : <Text style={styles.emptySectionText}>받은 요청이 없어요.</Text>}
                    {receivedNextCursor ? (
                      <LoadMoreButton
                        loading={loadingMoreDirections.has('RECEIVED')}
                        onPress={() => {
                          loadMoreRequests('RECEIVED').catch(loadError => {
                            showErrorAlert(loadError, '친구 요청을 더 불러오지 못했습니다.');
                          });
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {!hasLoadedSentRequests && sentRequestsError ? (
              <StateCard
                actionLabel="다시 시도"
                description={sentRequestsError}
                icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
                onPressAction={() => { reloadRequestDirection('SENT').catch(() => undefined); }}
                title="보낸 친구 요청을 불러오지 못했습니다"
              />
            ) : null}
            {hasLoadedSentRequests ? (
              <>
                {sentRequestsError ? <FriendDataErrorBanner error={sentRequestsError} onRetry={() => reloadRequestDirection('SENT')} /> : null}
                {hasAnyPendingRequests ? (
                  <>
                    <Text style={styles.sectionTitle}>보낸 요청</Text>
                    {sentRequests.length > 0 ? sentRequests.map(request => (
                      <FriendRequestCard
                        key={request.id}
                        completedAction={completedRequestActions.get(request.id)}
                        loading={mutatingRequestIds.has(request.id)}
                        mode="sent"
                        pendingAction={mutatingRequestActions.get(request.id)}
                        onCancel={() => handleCancel(request.id)}
                        request={request}
                        showIdentifier={duplicateRequestFriendIds.has(request.friend.id)}
                      />
                    )) : <Text style={styles.emptySectionText}>보낸 요청이 없어요.</Text>}
                    {sentNextCursor ? (
                      <LoadMoreButton
                        loading={loadingMoreDirections.has('SENT')}
                        onPress={() => {
                          loadMoreRequests('SENT').catch(loadError => {
                            showErrorAlert(loadError, '친구 요청을 더 불러오지 못했습니다.');
                          });
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {hasLoadedReceivedRequests && hasLoadedSentRequests && receivedRequests.length === 0 && sentRequests.length === 0 ? (
              <StateCard
                description="새로운 친구 요청이 오면 이곳에서 확인할 수 있어요."
                icon={<Icon color={COLORS.accent.blue} name="mail-outline" size={28} />}
                title="대기 중인 요청이 없어요"
              />
            ) : null}
            {hasInitialRequestLoadPending && hasAnyPendingRequests ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={COLORS.brand.primary} size="small" />
                <Text style={styles.inlineLoadingText}>나머지 친구 요청을 불러오는 중</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {selectedTab === 'invitations' ? (
          <View style={styles.invitationContent}>
            {!hasLoadedInvitations && invitationsLoading ? (
              <StateCard
                description="받은 친구 초대를 준비하고 있습니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="친구 초대를 불러오는 중"
              />
            ) : null}
            {partyInvitationError ? (
              <FriendDataErrorBanner
                error={partyInvitationError}
                onRetry={reloadInvitations}
              />
            ) : null}
            {chatInvitationError ? (
              <FriendDataErrorBanner
                error={chatInvitationError}
                onRetry={reloadInvitations}
              />
            ) : null}
            {hasLoadedInvitations && invitations.length > 0
              ? invitations.map(invitation => (
                  <FriendInvitationCard
                    invitation={invitation}
                    key={`${invitation.type}-${invitation.id}`}
                    loading={mutatingInvitationIds.has(invitation.id)}
                    onAccept={() => {
                      handleAcceptInvitation(invitation).catch(() => undefined);
                    }}
                    onDecline={() => handleDeclineInvitation(invitation)}
                    onDelete={() => handleDeleteInvitation(invitation)}
                  />
                ))
              : null}
            {hasLoadedInvitations && invitations.length === 0 && !partyInvitationError && !chatInvitationError ? (
              <StateCard
                description="택시파티나 공개 채팅방 초대가 오면 이곳에서 확인할 수 있어요."
                icon={<Icon color={COLORS.accent.blue} name="ticket-outline" size={28} />}
                title="받은 초대가 없어요"
              />
            ) : null}
          </View>
        ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const LoadMoreButton = ({loading, onPress}: {loading: boolean; onPress: () => void}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.82}
    disabled={loading}
    onPress={onPress}
    style={styles.loadMoreButton}>
    {loading ? <ActivityIndicator color={COLORS.brand.primary} size="small" /> : <Text style={styles.loadMoreText}>더 보기</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  headerActions: {flexDirection: 'row', gap: 2},
  headerButton: {alignItems: 'center', height: 36, justifyContent: 'center', width: 36},
  tabControl: {marginBottom: SPACING.lg},
  listCard: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card},
  rowDivider: {borderBottomColor: COLORS.border.subtle, borderBottomWidth: 1},
  requestContent: {gap: SPACING.sm},
  invitationContent: {gap: SPACING.sm},
  inlineLoading: {alignItems: 'center', flexDirection: 'row', gap: SPACING.xs, justifyContent: 'center', paddingVertical: SPACING.sm},
  inlineLoadingText: {color: COLORS.text.secondary, fontSize: 12},
  sectionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: SPACING.sm, paddingHorizontal: 4},
  emptySectionText: {color: COLORS.text.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: SPACING.md},
  loadMoreButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 40, justifyContent: 'center', marginTop: SPACING.sm},
  loadMoreText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
});
