import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Marker, type EdgePadding, type Region} from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import Animated from 'react-native-reanimated';
import {
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {
  TAXI_HOME_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {useScreenEnterAnimation, useScreenView} from '@/shared/hooks';
import {BOTTOM_TAB_BAR_HEIGHT} from '@/shared/constants/layout';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import {TaxiHomeFilterChips} from '../components/TaxiHomeFilterChips';
import {TaxiHomePartyCard} from '../components/TaxiHomePartyCard';
import {TaxiHomeSearchBar} from '../components/TaxiHomeSearchBar';
import {TaxiHomeSortMenu} from '../components/TaxiHomeSortMenu';
import {useTaxiHomeData} from '../hooks/useTaxiHomeData';
import {useTaxiLocation} from '../hooks/useTaxiLocation';
import {DEPARTURE_LOCATION, DEPARTURE_OPTIONS} from '../model/constants';
import type {TaxiStackParamList} from '../model/navigation';
import type {TaxiHomePartyCardViewData} from '../model/taxiHomeViewData';
import {WINDOW_HEIGHT} from '@/shared/constants/layout';

type TaxiNavigationProp = NavigationProp<TaxiStackParamList>;
type MapCoordinate = {latitude: number; longitude: number};
type DepartureMarker = {
  coordinate: MapCoordinate;
  id: string;
  title: string;
};

const DEFAULT_MAP_REGION: Region = {
  latitude: 37.38965,
  longitude: 126.9325,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};
const MAP_ANIMATION_DURATION = 250;

const DEPARTURE_COORDINATES_BY_LABEL = DEPARTURE_OPTIONS.flatMap(
  (row, rowIndex) =>
    row.map((label, columnIndex) => ({
      coordinate: DEPARTURE_LOCATION[rowIndex][columnIndex],
      label,
    })),
).reduce<Record<string, {latitude: number; longitude: number}>>(
  (accumulator, item) => {
    accumulator[item.label] = item.coordinate;
    return accumulator;
  },
  {},
);

const isValidMapCoordinate = (
  coordinate: MapCoordinate | null | undefined,
): coordinate is MapCoordinate =>
  Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude) &&
      Math.abs(coordinate.latitude) <= 90 &&
      Math.abs(coordinate.longitude) <= 180,
  );

const resolvePartyDepartureCoordinate = (
  party: Pick<TaxiHomePartyCardViewData, 'departureCoordinate' | 'departureLabel'>,
): MapCoordinate | null => {
  if (isValidMapCoordinate(party.departureCoordinate)) {
    return party.departureCoordinate;
  }

  return DEPARTURE_COORDINATES_BY_LABEL[party.departureLabel] ?? null;
};

const TaxiScreenState = ({
  actionLabel,
  description,
  icon,
  onPressAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  icon: React.ReactNode;
  onPressAction?: () => void;
  title: string;
}) => {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={onPressAction}
          style={styles.stateButton}>
          <Text style={styles.stateButtonLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const TaxiScreen = () => {
  useScreenView();

  const navigation = useNavigation<TaxiNavigationProp>();
  const insets = useSafeAreaInsets();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const {location} = useTaxiLocation();
  const {
    activePartyId,
    data,
    error,
    hasActiveParty,
    loading,
    refetch,
    requestJoin,
    selectFilter,
    selectSort,
    setSearchQuery,
  } = useTaxiHomeData();
  const [expandedPartyId, setExpandedPartyId] = React.useState<string | null>(
    null,
  );
  const mapRef = React.useRef<MapView | null>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const contentContainerStyle = React.useMemo(
    () => ({
      paddingBottom:
        BOTTOM_TAB_BAR_HEIGHT +
        insets.bottom +
        SPACING.xxl +
        (hasActiveParty ? 72 : 0),
    }),
    [hasActiveParty, insets.bottom],
  );

  const departureMarkers = React.useMemo(
    (): DepartureMarker[] =>
      (data?.parties ?? [])
        .map(party => ({
          coordinate: resolvePartyDepartureCoordinate(party),
          id: party.id,
          title: party.departureLabel,
        }))
        .filter((marker): marker is DepartureMarker =>
          Boolean(marker.coordinate),
        ),
    [data?.parties],
  );
  const selectedPartyMarkerCoordinate = React.useMemo(() => {
    if (!expandedPartyId) {
      return null;
    }

    const selectedParty = data?.parties.find(party => party.id === expandedPartyId);

    if (!selectedParty) {
      return null;
    }

    return resolvePartyDepartureCoordinate(selectedParty);
  }, [data?.parties, expandedPartyId]);
  const fitToCoordinatesPadding = React.useMemo<EdgePadding>(
    () => ({
      top: insets.top + SPACING.xxl,
      bottom: SPACING.lg * 2,
      left: SPACING.xxl,
      right: SPACING.xxl,
    }),
    [insets.top],
  );

  const moveMapToSingleCoordinate = React.useCallback(
    (coordinate: MapCoordinate) => {
      mapRef.current?.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: DEFAULT_MAP_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_MAP_REGION.longitudeDelta,
        },
        MAP_ANIMATION_DURATION,
      );
    },
    [],
  );

  const handlePressCreateParty = React.useCallback(() => {
    navigation.navigate('Recruit');
  }, [navigation]);

  const handlePressMyPartyChat = React.useCallback(() => {
    if (!activePartyId) {
      return;
    }

    navigation.navigate('Chat', {
      partyId: activePartyId,
    });
  }, [activePartyId, navigation]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useRefetchOnFocus({
    invalidationKey: TAXI_HOME_INVALIDATION_KEY,
    mode: 'always-after-initial-focus',
    refetch,
  });

  React.useEffect(() => {
    if (!expandedPartyId) {
      return;
    }

    if (!data?.parties.some(party => party.id === expandedPartyId)) {
      setExpandedPartyId(null);
    }
  }, [data?.parties, expandedPartyId]);

  React.useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    const visibleMarkerCoordinates = departureMarkers.map(marker => marker.coordinate);

    if (selectedPartyMarkerCoordinate) {
      if (location) {
        mapRef.current.fitToCoordinates(
          [location, selectedPartyMarkerCoordinate],
          {
            animated: true,
            edgePadding: fitToCoordinatesPadding,
          },
        );
        return;
      }

      moveMapToSingleCoordinate(selectedPartyMarkerCoordinate);
      return;
    }

    if (visibleMarkerCoordinates.length === 0) {
      if (location) {
        moveMapToSingleCoordinate(location);
        return;
      }

      mapRef.current.animateToRegion(DEFAULT_MAP_REGION, MAP_ANIMATION_DURATION);
      return;
    }

    if (location) {
      mapRef.current.fitToCoordinates([location, ...visibleMarkerCoordinates], {
        animated: true,
        edgePadding: fitToCoordinatesPadding,
      });
      return;
    }

    if (visibleMarkerCoordinates.length === 1) {
      moveMapToSingleCoordinate(visibleMarkerCoordinates[0]);
      return;
    }

    mapRef.current.fitToCoordinates(visibleMarkerCoordinates, {
      animated: true,
      edgePadding: fitToCoordinatesPadding,
    });
  }, [
    departureMarkers,
    fitToCoordinatesPadding,
    isMapReady,
    location,
    moveMapToSingleCoordinate,
    selectedPartyMarkerCoordinate,
  ]);

  const handlePressPartyCard = React.useCallback(
    (party: TaxiHomePartyCardViewData) => {
      if (party.statusTone !== 'active') {
        return;
      }

      setExpandedPartyId(currentExpandedId =>
        currentExpandedId === party.id ? null : party.id,
      );
    },
    [],
  );

  const handlePressPartyJoinAction = React.useCallback(
    async (party: TaxiHomePartyCardViewData) => {
      if (party.joinAction.state === 'joined') {
        navigation.navigate('Chat', {
          partyId: party.id,
        });
        return;
      }

      if (party.joinAction.state === 'pending') {
        if (party.acceptancePendingSeed) {
          navigation.navigate('AcceptancePending', {
            seed: party.acceptancePendingSeed,
          });
        }
        return;
      }

      if (party.joinAction.state === 'blocked-by-other-party') {
        Alert.alert(
          '이미 다른 파티에 참여중이에요.',
          '기존 파티 탈퇴 후 다시 요청해주세요.',
        );
        return;
      }

      if (party.joinAction.state === 'unavailable') {
        Alert.alert(
          '상태 확인 필요',
          '내 파티 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해주세요.',
        );
        return;
      }

      try {
        const seed = await requestJoin(party);
        navigation.navigate('AcceptancePending', {
          seed,
        });
      } catch (requestError) {
        console.error('동승 요청 생성 실패', requestError);
        Alert.alert(
          '동승 요청 실패',
          requestError instanceof Error && requestError.message
            ? requestError.message
            : '동승 요청에 실패했습니다.',
        );
      }
    },
    [navigation, requestJoin],
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        <LinearGradient
          colors={[COLORS.brand.primarySoft, COLORS.border.accent]}
          end={{x: 1, y: 1}}
          start={{x: 0, y: 0}}
          style={[styles.hero, {height: WINDOW_HEIGHT * 0.35}]}>
          <MapView
            initialRegion={DEFAULT_MAP_REGION}
            onMapReady={() => {
              setIsMapReady(true);
            }}
            pitchEnabled={false}
            ref={mapRef}
            rotateEnabled={false}
            showsCompass={false}
            showsMyLocationButton={false}
            showsUserLocation={Boolean(location)}
            style={styles.heroMap}
            toolbarEnabled={false}>
            {departureMarkers.map(marker => (
              <Marker
                coordinate={marker.coordinate}
                key={marker.id}
                pinColor={COLORS.brand.primaryStrong}
                title={marker.title}
              />
            ))}
          </MapView>
          {Platform.OS === 'android' ? (
            <View
              pointerEvents="none"
              style={[styles.statusBarBackdrop, {height: insets.top}]}
            />
          ) : null}
          <View style={[styles.heroContent, {paddingTop: insets.top}]}>
            <TaxiHomeSearchBar
              onChangeText={setSearchQuery}
              placeholder={data?.searchPlaceholder ?? '출발지 검색'}
              value={data?.searchQuery ?? ''}
            />
          </View>
        </LinearGradient>
        {data?.filterChips.length ? (
          <View style={styles.filterSection}>
            <TaxiHomeFilterChips
              filters={data.filterChips}
              onPressFilter={selectFilter}
            />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={refreshing}
              tintColor={COLORS.brand.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={handlePressCreateParty}
              style={styles.primaryButton}>
              <Icon
                color={COLORS.text.inverse}
                name="add-outline"
                size={20}
              />
              <Text style={styles.primaryButtonLabel}>
                {data?.primaryActionLabel ?? '새 파티 만들기'}
              </Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {data?.sectionTitle ?? '모집 중인 파티'}{' '}
                {data ? `(${data.visiblePartyCount})` : ''}
              </Text>
              <TaxiHomeSortMenu
                onSelect={selectSort}
                options={data?.sortOptions ?? []}
                selectedLabel={data?.selectedSortLabel ?? '최신순'}
              />
            </View>

            {loading && !data ? (
              <TaxiScreenState
                description="택시 홈 화면을 준비하고 있습니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="Taxi 화면 로딩 중"
              />
            ) : null}

            {error && !data ? (
              <TaxiScreenState
                actionLabel="다시 시도"
                description={error}
                icon={
                  <Icon
                    color={COLORS.accent.orange}
                    name="refresh-outline"
                    size={24}
                  />
                }
                onPressAction={() => {
                  refetch().catch(() => undefined);
                }}
                title="Taxi 화면을 불러오지 못했습니다"
              />
            ) : null}

            {data?.emptyState ? (
              <TaxiScreenState
                description={data.emptyState.description}
                icon={
                  <Icon
                    color={COLORS.text.muted}
                    name="car-sport-outline"
                    size={28}
                  />
                }
                title={data.emptyState.title}
              />
            ) : null}

            {data?.parties.map(party => (
              <TaxiHomePartyCard
                expanded={expandedPartyId === party.id}
                key={party.id}
                onPressCard={handlePressPartyCard}
                onPressJoinAction={handlePressPartyJoinAction}
                party={party}
              />
            ))}
          </View>
        </ScrollView>

        {hasActiveParty ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={handlePressMyPartyChat}
            style={[
              styles.liveChatFloatingButton,
              {
                bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + SPACING.lg,
              },
            ]}>
            <Icon
              color={COLORS.text.inverse}
              name="chatbubble-ellipses-outline"
              size={18}
            />
            <Text style={styles.liveChatFloatingButtonLabel}>
              {data?.liveChatActionLabel ?? '파티 채팅 가기'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.page,
  },
  screen: {
    flex: 1,
  },
  statusBarBackdrop: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  hero: {
    height: 288,
  },
  heroMap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroContent: {
    paddingHorizontal: SPACING.lg,
  },
  filterSection: {
    backgroundColor: COLORS.background.surface,
    borderBottomColor: COLORS.border.default,
    borderBottomWidth: 1,
    paddingBottom: SPACING.md + 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  content: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 60,
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  primaryButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 21,
  },
  liveChatFloatingButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryStrong,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    position: 'absolute',
    right: SPACING.lg,
    ...SHADOWS.floating,
  },
  liveChatFloatingButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    ...SHADOWS.card,
  },
  stateIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginBottom: SPACING.md,
    width: 32,
  },
  stateTitle: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  stateDescription: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateButton: {
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  stateButtonLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
