import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  type ViewToken,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import type {
  NoticeHomeEmptyStateViewData,
  NoticeHomeNoticeItemViewData,
} from '../model/noticeHomeViewData';
import {NoticeListItem} from './NoticeListItem';
import {BOTTOM_TAB_BAR_HEIGHT} from '@/shared/constants/layout';
import {
  InlineBannerAd,
  interleaveAdGroups,
  type InterleavedAdItem,
} from '@/shared/ads';
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
  adsEnabled: boolean;
  emptyState: NoticeHomeEmptyStateViewData;
  error: string | null;
  hasMore: boolean;
  items: NoticeHomeNoticeItemViewData[];
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPressNotice: (noticeId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const NoticeHomeList = ({
  adsEnabled,
  emptyState,
  error,
  hasMore,
  items,
  loading,
  loadingMore,
  onLoadMore,
  onPressNotice,
  onRefresh,
  refreshing,
}: NoticeHomeListProps) => {
  const showLoadingState = loading && items.length === 0;
  const [visibleAdSlots, setVisibleAdSlots] = React.useState<Set<number>>(
    () => new Set(),
  );
  const listItems = React.useMemo(
    () => interleaveAdGroups(items, {enabled: adsEnabled && !error}),
    [adsEnabled, error, items],
  );
  const handleViewableItemsChanged = React.useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      const nextVisibleAdSlots = new Set(
        viewableItems.flatMap(viewableItem => {
          const item = viewableItem.item as InterleavedAdItem<
            NoticeHomeNoticeItemViewData[]
          >;
          return item.kind === 'ad' ? [item.slotIndex] : [];
        }),
      );

      setVisibleAdSlots(currentSlots =>
        currentSlots.size === nextVisibleAdSlots.size &&
        [...currentSlots].every(slot => nextVisibleAdSlots.has(slot))
          ? currentSlots
          : nextVisibleAdSlots,
      );
    },
  ).current;

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={error ? [] : listItems}
      extraData={visibleAdSlots}
      keyExtractor={(item, index) =>
        item.kind === 'ad' ? item.key : `notice-group-${index}`
      }
      ListEmptyComponent={
        <View style={styles.card}>
          {showLoadingState ? <NoticeListSkeleton /> : null}

          {!showLoadingState && error ? (
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

          {!showLoadingState && !error ? (
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
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={COLORS.brand.primary} size="small" />
          </View>
        ) : items.length > 0 && !hasMore ? (
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>
              모든 공지사항을 확인했습니다
            </Text>
          </View>
        ) : null
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.25}
      onViewableItemsChanged={handleViewableItemsChanged}
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={COLORS.brand.primary}
        />
      }
      removeClippedSubviews={false}
      renderItem={({item}) =>
        item.kind === 'ad' ? (
          <InlineBannerAd
            active={visibleAdSlots.has(item.slotIndex)}
            placement="noticeList"
            slotIndex={item.slotIndex}
          />
        ) : (
          <View style={styles.card}>
            {item.content.map((noticeItem, index) => (
              <NoticeListItem
                key={noticeItem.id}
                isLast={index === item.content.length - 1}
                item={noticeItem}
                onPress={onPressNotice}
              />
            ))}
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      viewabilityConfig={VIEWABILITY_CONFIG}
    />
  );
};

const VIEWABILITY_CONFIG = {itemVisiblePercentThreshold: 20};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    flexGrow: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.xxl,
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
