import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';
import {getRootNavigationState} from '@/app/navigation/navigationRef';
import {shouldNavigateToAcceptedTaxiChat} from '@/app/navigation/selectors/getCurrentTaxiPartyIdFromNavigationState';

import {
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useScreenEnterAnimation, useScreenView} from '@/shared/hooks';

import {TaxiAcceptancePendingInfoCard} from '../components/TaxiAcceptancePendingInfoCard';
import {TaxiAcceptancePendingStatus} from '../components/TaxiAcceptancePendingStatus';
import {useTaxiAcceptancePendingData} from '../hooks/useTaxiAcceptancePendingData';

import type {TaxiStackParamList} from '../model/navigation';
import { WINDOW_HEIGHT } from '@/shared/constants/layout';

type AcceptancePendingScreenNavigationProp = NativeStackNavigationProp<
  TaxiStackParamList,
  'AcceptancePending'
>;
type AcceptancePendingScreenRouteProp = RouteProp<
  TaxiStackParamList,
  'AcceptancePending'
>;

export const AcceptancePendingScreen = () => {
  useScreenView();

  const navigation = useNavigation<AcceptancePendingScreenNavigationProp>();
  const route = useRoute<AcceptancePendingScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const {cancelRequest, data, error, loading, refetch} =
    useTaxiAcceptancePendingData(route.params ?? {});

  const handleCancelRequest = React.useCallback(async () => {
    if (data && data.requestState !== 'pending') {
      navigation.goBack();
      return;
    }

    try {
      await cancelRequest();
      navigation.goBack();
    } catch (cancelError) {
      console.error('taxi acceptance pending cancel failed', cancelError);
      Alert.alert('오류', '동승 요청 취소에 실패했습니다.');
    }
  }, [cancelRequest, data, navigation]);

  React.useEffect(() => {
    if (!data) {
      return;
    }

    if (data.requestState === 'accepted') {
      if (
        shouldNavigateToAcceptedTaxiChat(
          getRootNavigationState(),
          data.partyId,
        )
      ) {
        navigation.reset({
          index: 1,
          routes: [
            {name: 'TaxiMain'},
            {name: 'Chat', params: {partyId: data.partyId}},
          ],
        });
      }
      return;
    }

    if (data.requestState === 'declined') {
      Alert.alert('동승 요청 거절', '동승 요청이 거절되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }

    if (data.requestState === 'canceled') {
      Alert.alert('동승 요청 취소', '더 이상 대기 중인 동승 요청이 없습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }

    if (data.requestState === 'expired') {
      Alert.alert('동승 요청 종료', '파티 정원이 가득 차 요청이 종료되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [data, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        {loading && !data ? (
          <View style={styles.stateWrap}>
            <StateCard
              description="동승 요청 대기 화면을 준비하고 있습니다."
              icon={<ActivityIndicator color={COLORS.brand.primary} />}
              title="수락 대기 화면 로딩 중"
            />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateWrap}>
            <StateCard
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
              title="대기 정보를 불러오지 못했습니다"
            />
          </View>
        ) : null}

        {!loading && !error && data ? (
          <ScrollView
            contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + SPACING.lg}]}
            showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.mainSection,
                {
                  paddingTop: Math.max(WINDOW_HEIGHT * 0.18, insets.top + SPACING.lg),
                },
              ]}>
              <TaxiAcceptancePendingStatus
                description={data.heroDescription}
                title={data.heroTitle}
              />

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.88}
                onPress={handleCancelRequest}
                style={styles.cancelButton}>
                <Icon
                  color={COLORS.text.strong}
                  name="close-circle-outline"
                  size={18}
                />
                <Text style={styles.cancelButtonLabel}>
                  {data.cancelButtonLabel}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                {
                  paddingBottom: Math.max(insets.bottom, SPACING.lg) + 48,
                },
              ]}>
              <TaxiAcceptancePendingInfoCard
                departureLabel={data.route.departureLabel}
                destinationLabel={data.route.destinationLabel}
                rows={data.rows}
                title={data.cardTitle}
              />
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  content: {
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.gray,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 60,
    justifyContent: 'center',
    ...SHADOWS.card,
    marginVertical: SPACING.xxl,
  },
  cancelButtonLabel: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  cancelHint: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    paddingTop: SPACING.sm,
    textAlign: 'center',
  },
});
