import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  InquiryHistoryScreenSkeleton,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {InquiryHistoryListItem} from '../components/InquiryHistoryListItem';
import {useInquiryHistoryData} from '../hooks/useInquiryHistoryData';

export const InquiryHistoryScreen = () => {
  useScreenView();

  const navigation =
    useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {data, error, loading, reload} = useInquiryHistoryData();

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="내 문의 내역" />

      {loading && !data ? <InquiryHistoryScreenSkeleton /> : null}

      {error && !data ? (
        <View style={styles.stateWrap}>
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
              reload().catch(() => undefined);
            }}
            title="문의 내역을 불러오지 못했습니다"
          />
        </View>
      ) : null}

      {data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTitle}>접수한 문의</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countLabel}>{data.countLabel}</Text>
            </View>
          </View>

          {data.items.length > 0 ? (
            <View style={styles.list}>
              {data.items.map(item => (
                <InquiryHistoryListItem key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <StateCard
              description="접수한 문의가 아직 없습니다. 필요한 내용을 문의하기로 남겨주세요."
              icon={
                <Icon
                  color={COLORS.accent.blue}
                  name="chatbox-ellipses-outline"
                  size={28}
                />
              }
              title="문의 내역이 없습니다"
            />
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  stateWrap: {
    padding: SPACING.lg,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: 28,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  countBadge: {
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  list: {
    gap: SPACING.md,
  },
});
