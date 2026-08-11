import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks';

import {useTaxiLocation} from '../hooks/useTaxiLocation';
import type {TaxiStackParamList} from '../model/navigation';
import { StackHeader } from '@/shared/design-system/components/StackHeader';

type TaxiLocationPickerNavigationProp = NativeStackNavigationProp<
  TaxiStackParamList,
  'TaxiLocationPicker'
>;

const DEFAULT_REGION: Region = {
  latitude: 37.38965,
  latitudeDelta: 0.02,
  longitude: 126.9325,
  longitudeDelta: 0.02,
};

const getScreenCopy = (kind: 'departure' | 'destination') => {
  if (kind === 'departure') {
    return {
      accentColor: COLORS.brand.primary,
      accentSoftColor: 'rgba(34,197,94,0.09)',
      confirmLabel: '이 위치를 출발지로 선택',
      emptyTitle: '지도를 탭해 출발지를 선택하세요',
      title: '출발지 위치 선택',
      tooltip: '지도를 탭해서 출발지 위치를 선택하세요',
    };
  }

  return {
    accentColor: '#3B82F6',
    accentSoftColor: 'rgba(59,130,246,0.09)',
    confirmLabel: '이 위치를 도착지로 선택',
    emptyTitle: '지도를 탭해 도착지를 선택하세요',
    title: '도착지 위치 선택',
    tooltip: '지도를 탭해서 도착지 위치를 선택하세요',
  };
};

export const TaxiLocationPickerScreen = () => {
  useScreenView();

  const navigation = useNavigation<TaxiLocationPickerNavigationProp>();
  const route =
    useRoute<
      NativeStackScreenProps<TaxiStackParamList, 'TaxiLocationPicker'>['route']
    >();
  const insets = useSafeAreaInsets();
  const {location} = useTaxiLocation();
  const {initialLocation, initialName, kind} = route.params;
  const [selectedLocation, setSelectedLocation] = React.useState(
    initialLocation ?? null,
  );

  const copy = React.useMemo(() => getScreenCopy(kind), [kind]);
  const hasSelection = Boolean(selectedLocation);

  const initialRegion = React.useMemo<Region>(() => {
    if (selectedLocation) {
      return {
        latitude: selectedLocation.lat,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitude: selectedLocation.lng,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      };
    }

    if (location) {
      return {
        latitude: location.latitude,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitude: location.longitude,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      };
    }

    return DEFAULT_REGION;
  }, [location, selectedLocation]);

  const handlePressMap = React.useCallback(
    (event: MapPressEvent) => {
      setSelectedLocation({
        lat: event.nativeEvent.coordinate.latitude,
        lng: event.nativeEvent.coordinate.longitude,
        name: initialName.trim(),
      });
    },
    [initialName],
  );

  const handleConfirm = React.useCallback(() => {
    const normalizedName = initialName.trim();

    if (!normalizedName) {
      Alert.alert(
        '위치명 입력 필요',
        '이전 화면에서 위치명을 먼저 입력한 뒤 다시 지도에서 선택해주세요.',
      );
      return;
    }

    if (!selectedLocation) {
      return;
    }

    navigation.popTo(
      'Recruit',
      {
        selection: {
          kind,
          location: {
            ...selectedLocation,
            name: normalizedName,
          },
        },
        selectionToken: `${kind}-${Date.now()}`,
      },
      {
        merge: true,
      },
    );
  }, [initialName, kind, navigation, selectedLocation]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StackHeader title={copy.title} onPressBack={navigation.goBack} />

      <View style={[styles.noticeBanner, {backgroundColor: copy.accentColor}]}>
        <Icon color={COLORS.text.inverse} name="location" size={16} />
        <Text style={styles.noticeLabel}>{copy.tooltip}</Text>
      </View>

      <View style={styles.mapSection}>
        <MapView
          initialRegion={initialRegion}
          onPress={handlePressMap}
          style={styles.map}>
          {selectedLocation ? (
            <Marker
              coordinate={{
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
              }}
              pinColor={copy.accentColor}
              title={initialName.trim() || copy.title}
            />
          ) : null}
        </MapView>

        <View pointerEvents="none" style={styles.bottomCardWrap}>
          {hasSelection ? (
            <View style={styles.selectedCard}>
              <View
                style={[
                  styles.selectedCardIconWrap,
                  {backgroundColor: copy.accentSoftColor},
                ]}>
                <Icon color={copy.accentColor} name="location" size={18} />
              </View>

              <View style={styles.selectedCardCopy}>
                <Text style={styles.cardLabel}>선택된 위치</Text>
                <Text style={styles.selectedCardTitle}>지도에서 선택한 위치</Text>
                <Text style={styles.selectedCardDescription}>
                  탭해서 위치를 변경할 수 있어요
                </Text>
              </View>

              <View
                style={[
                  styles.selectedCardCheckWrap,
                  {backgroundColor: copy.accentColor},
                ]}>
                <Icon color={COLORS.text.inverse} name="checkmark" size={14} />
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyCardIconWrap}>
                <Icon color={COLORS.text.muted} name="location-outline" size={18} />
              </View>
              <Text style={styles.emptyCardTitle}>{copy.emptyTitle}</Text>
              <Text style={styles.emptyCardDescription}>
                원하는 위치를 정확하게 탭하면 핀이 꽂혀요
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, SPACING.lg),
          },
        ]}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={hasSelection ? 0.88 : 1}
          disabled={!hasSelection}
          onPress={handleConfirm}
          style={[
            styles.confirmButton,
            hasSelection
              ? [
                  styles.confirmButtonEnabled,
                  {
                    backgroundColor: copy.accentColor,
                    shadowColor: copy.accentColor,
                  },
                ]
              : styles.confirmButtonDisabled,
          ]}>
          <Icon
            color={hasSelection ? COLORS.text.inverse : COLORS.text.muted}
            name="location"
            size={16}
            style={styles.confirmButtonIcon}
          />
          <Text
            style={[
              styles.confirmButtonLabel,
              !hasSelection && styles.confirmButtonLabelDisabled,
            ]}>
            {hasSelection ? copy.confirmLabel : '위치를 선택해 주세요'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomCardWrap: {
    bottom: SPACING.lg,
    left: SPACING.lg,
    position: 'absolute',
    right: SPACING.lg,
  },
  cardLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    height: 60,
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.background.subtle,
    shadowOpacity: 0,
  },
  confirmButtonEnabled: {
    elevation: 8,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  confirmButtonIcon: {
    marginRight: SPACING.sm,
  },
  confirmButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  confirmButtonLabelDisabled: {
    color: COLORS.text.muted,
  },
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 56,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    minHeight: 122,
    paddingHorizontal: 17,
    paddingVertical: 17,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  emptyCardDescription: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  emptyCardIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    width: 40,
  },
  emptyCardTitle: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 17,
  },
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  noticeBanner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  noticeLabel: {
    color: COLORS.text.inverse,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  selectedCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 90,
    padding: 17,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  selectedCardCheckWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  selectedCardCopy: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  selectedCardDescription: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  selectedCardIconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  selectedCardTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
