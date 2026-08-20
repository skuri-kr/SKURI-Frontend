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

import {type CampusStackParamList} from '@/app/navigation/types';
import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {SegmentedControl, StackHeader, StateCard} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendRequestCard} from '../components/FriendRequestCard';
import {FriendRow} from '../components/FriendRow';
import {useFriendHubData} from '../hooks/useFriendHubData';

type FriendHubTab = 'friends' | 'requests';

const getDuplicateRequestFriendIds = (
  requests: ReadonlyArray<{
    friend: {department: string | null; id: string; nickname: string};
  }>,
) => {
  const counts = new Map<string, number>();
  requests.forEach(request => {
    const key = JSON.stringify([
      request.friend.nickname,
      request.friend.department,
    ]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return new Set(
    requests
      .filter(request => {
        const key = JSON.stringify([
          request.friend.nickname,
          request.friend.department,
        ]);
        return counts.get(key)! > 1;
      })
      .map(request => request.friend.id),
  );
};

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
  const {
    acceptRequest,
    cancelRequest,
    declineRequest,
    friendError,
    friends,
    hasLoadedFriends,
    hasLoadedOnce,
    hasLoadedReceivedRequests,
    hasLoadedSentRequests,
    incomingRequestCount,
    loading,
    loadingMoreDirections,
    loadMoreRequests,
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
      reload().catch(() => undefined);
    }
  }, [friendHubInvalidationVersion, isFocused, reload]);

  const duplicateRequestFriendIds = React.useMemo(
    () => getDuplicateRequestFriendIds([...receivedRequests, ...sentRequests]),
    [receivedRequests, sentRequests],
  );

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

      reload().catch(() => undefined);
    }, [reload]),
  );

  const handleFavorite = React.useCallback(
    async (friend: (typeof friends)[number]) => {
      try {
        await updateFavorite(friend);
      } catch (updateError) {
        Alert.alert('오류', getErrorMessage(updateError, '즐겨찾기를 변경하지 못했습니다.'));
      }
    },
    [updateFavorite],
  );

  const handleAccept = React.useCallback(
    async (requestId: string) => {
      try {
        await acceptRequest(requestId);
      } catch (acceptError) {
        Alert.alert('오류', getErrorMessage(acceptError, '친구 요청을 수락하지 못했습니다.'));
      }
    },
    [acceptRequest],
  );

  const handleDecline = React.useCallback((requestId: string) => {
    declineRequest(requestId).catch(declineError => {
      Alert.alert('오류', getErrorMessage(declineError, '친구 요청을 거절하지 못했습니다.'));
    });
  }, [declineRequest]);

  const handleCancel = React.useCallback(
    (requestId: string) => {
      Alert.alert('친구 요청 취소', '보낸 친구 요청을 취소할까요?', [
        {text: '닫기', style: 'cancel'},
        {
          text: '요청 취소',
          style: 'destructive',
          onPress: () => {
            cancelRequest(requestId).catch(cancelError => {
              Alert.alert('오류', getErrorMessage(cancelError, '친구 요청을 취소하지 못했습니다.'));
            });
          },
        },
      ]);
    },
    [cancelRequest],
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
              reload().catch(() => undefined);
            }}
            refreshing={loading && hasLoadedOnce}
            tintColor={COLORS.brand.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <SegmentedControl<FriendHubTab>
          items={[
            {id: 'friends', label: `친구 ${friends.length}`},
            {
              id: 'requests',
              label: `요청 ${incomingRequestCount ?? receivedRequests.length}`,
            },
          ]}
          onSelect={setSelectedTab}
          selectedId={selectedTab}
          style={styles.tabControl}
          variant="surface"
        />

        {loading && !hasLoadedOnce ? (
          <StateCard
            description="친구 정보를 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="친구를 불러오는 중"
          />
        ) : null}

        {selectedTab === 'friends' && (!loading || hasLoadedOnce) ? (
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
              {friendError ? <ErrorBanner error={friendError} onRetry={reloadFriends} /> : null}
              {friends.length > 0 ? (
                <View style={styles.listCard}>
                  {friends.map((friend, index) => (
                    <View key={friend.id} style={index < friends.length - 1 ? styles.rowDivider : undefined}>
                      <FriendRow
                        disabled={updatingFavoriteIds.has(friend.id)}
                        friend={friend}
                        onPress={() => navigation.navigate('FriendDetail', {friendId: friend.id})}
                        onPressFavorite={() => { handleFavorite(friend).catch(() => undefined); }}
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

        {selectedTab === 'requests' && (!loading || hasLoadedOnce) ? (
          <View style={styles.requestContent}>
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
                {receivedRequestsError ? <ErrorBanner error={receivedRequestsError} onRetry={() => reloadRequestDirection('RECEIVED')} /> : null}
                <Text style={styles.sectionTitle}>받은 요청</Text>
                {receivedRequests.length > 0 ? receivedRequests.map(request => (
                  <FriendRequestCard
                    key={request.id}
                    loading={mutatingRequestIds.has(request.id)}
                    mode="received"
                    onAccept={() => { handleAccept(request.id).catch(() => undefined); }}
                    onDecline={() => handleDecline(request.id)}
                    request={request}
                    showIdentifier={duplicateRequestFriendIds.has(request.friend.id)}
                  />
                )) : sentRequests.length > 0 || !hasLoadedSentRequests || sentRequestsError ? <Text style={styles.emptySectionText}>받은 요청이 없어요.</Text> : null}
                {receivedNextCursor ? (
                  <LoadMoreButton
                    loading={loadingMoreDirections.has('RECEIVED')}
                    onPress={() => {
                      loadMoreRequests('RECEIVED').catch(loadError => {
                        Alert.alert('오류', getErrorMessage(loadError, '친구 요청을 더 불러오지 못했습니다.'));
                      });
                    }}
                  />
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
                {sentRequestsError ? <ErrorBanner error={sentRequestsError} onRetry={() => reloadRequestDirection('SENT')} /> : null}
                <Text style={styles.sectionTitle}>보낸 요청</Text>
                {sentRequests.length > 0 ? sentRequests.map(request => (
                  <FriendRequestCard
                    key={request.id}
                    loading={mutatingRequestIds.has(request.id)}
                    mode="sent"
                    onCancel={() => handleCancel(request.id)}
                    request={request}
                    showIdentifier={duplicateRequestFriendIds.has(request.friend.id)}
                  />
                )) : receivedRequests.length > 0 || !hasLoadedReceivedRequests || receivedRequestsError ? <Text style={styles.emptySectionText}>보낸 요청이 없어요.</Text> : null}
                {sentNextCursor ? (
                  <LoadMoreButton
                    loading={loadingMoreDirections.has('SENT')}
                    onPress={() => {
                      loadMoreRequests('SENT').catch(loadError => {
                        Alert.alert('오류', getErrorMessage(loadError, '친구 요청을 더 불러오지 못했습니다.'));
                      });
                    }}
                  />
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
          </View>
        ) : null}
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

const ErrorBanner = ({error, onRetry}: {error: string; onRetry: () => Promise<void>}) => (
  <View style={styles.errorBanner}>
    <Icon color={COLORS.accent.orange} name="alert-circle-outline" size={18} />
    <Text numberOfLines={2} style={styles.errorBannerText}>{error}</Text>
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => { onRetry().catch(() => undefined); }} style={styles.errorRetryButton}>
      <Text style={styles.errorRetryText}>재시도</Text>
    </TouchableOpacity>
  </View>
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
  errorBanner: {alignItems: 'center', backgroundColor: COLORS.accent.orangeSoft, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg, minHeight: 44, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm},
  errorBannerText: {color: COLORS.text.secondary, flex: 1, fontSize: 12, lineHeight: 18},
  errorRetryButton: {paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs},
  errorRetryText: {color: COLORS.accent.orange, fontSize: 12, fontWeight: '700'},
  sectionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: SPACING.sm, paddingHorizontal: 4},
  emptySectionText: {color: COLORS.text.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: SPACING.md},
  loadMoreButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 40, justifyContent: 'center', marginTop: SPACING.sm},
  loadMoreText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
});
