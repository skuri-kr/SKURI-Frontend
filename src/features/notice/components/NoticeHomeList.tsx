import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type {
  NoticeHomeEmptyStateViewData,
  NoticeHomeNoticeItemViewData,
} from '../model/noticeHomeViewData';
import {NoticeListItem} from './NoticeListItem';
import {
  NoticeListSkeleton,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

interface NoticeHomeListProps {
  emptyState: NoticeHomeEmptyStateViewData;
  error: string | null;
  hasMore: boolean;
  items: NoticeHomeNoticeItemViewData[];
  loading: boolean;
  loadingMore: boolean;
  onPressNotice: (noticeId: string) => void;
  onRefresh: () => void;
}

export const NoticeHomeList = ({
  emptyState,
  error,
  hasMore,
  items,
  loading,
  loadingMore,
  onPressNotice,
  onRefresh,
}: NoticeHomeListProps) => {
  const showLoadingState = loading && items.length === 0;
  const hasFooter = loadingMore || !hasMore;

  return (
    <View style={styles.card}>
      {showLoadingState ? (
        <NoticeListSkeleton />
      ) : null}

      {!showLoadingState && error && items.length === 0 ? (
        <View style={styles.stateContainer}>
          <StateCard
            actionLabel="새로고침"
            description={error}
            icon={
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={28}
              />
            }
            onPressAction={onRefresh}
            style={styles.embeddedStateCard}
            title="공지사항을 불러오지 못했습니다"
          />
        </View>
      ) : null}

      {!showLoadingState && !error && items.length === 0 ? (
        <View style={styles.stateContainer}>
          <StateCard
            description={emptyState.description}
            icon={
              <Icon
                color={COLORS.text.muted}
                name="mail-open-outline"
                size={28}
              />
            }
            style={styles.embeddedStateCard}
            title={emptyState.title}
          />
        </View>
      ) : null}

      {!showLoadingState && !error && items.length > 0 ? (
        <>
          {items.map((item, index) => (
            <NoticeListItem
              key={item.id}
              isLast={index === items.length - 1 && !hasFooter}
              item={item}
              onPress={onPressNotice}
            />
          ))}
          {loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={COLORS.brand.primary} size="small" />
            </View>
          ) : !hasMore ? (
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>
                모든 공지사항을 확인했습니다
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    flexGrow: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  stateContainer: {
    minHeight: 260,
    padding: SPACING.lg,
  },
  embeddedStateCard: {
    minHeight: '100%',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  footerLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
