import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {BOTTOM_TAB_BAR_HEIGHT} from '@/shared/constants/layout';
import {StateCard} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import {CommunityBoardPostCard} from './CommunityBoardPostCard';
import type {CommunityBoardPostViewData} from '../model/communityViewData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CommunityBoardSegmentProps {
  activeSearchLabel?: string;
  error: string | null;
  hasMore: boolean;
  items: CommunityBoardPostViewData[];
  loading: boolean;
  loadingMore: boolean;
  onClearSearch: () => void;
  onLoadMore: () => Promise<void>;
  onPressPost: (postId: string) => void;
  onPressWrite: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const CommunityBoardSegment = ({
  activeSearchLabel,
  error,
  hasMore,
  items,
  loading,
  loadingMore,
  onClearSearch,
  onLoadMore,
  onPressPost,
  onPressWrite,
  onRefresh,
  refreshing,
}: CommunityBoardSegmentProps) => {
  const showInitialLoading = loading && items.length === 0;
  const insets = useSafeAreaInsets();

  const handleEndReached = React.useCallback(() => {
    if (loadingMore || !hasMore) {
      return;
    }

    onLoadMore().catch(() => undefined);
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          showInitialLoading ? (
            <View style={styles.stateWrap}>
              <StateCard
                description="게시글을 불러오는 중입니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="게시판 준비 중"
              />
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
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
                title="게시글을 불러오지 못했습니다"
              />
            </View>
          ) : (
            <View style={styles.stateWrap}>
              <StateCard
                description="첫 번째 게시글을 작성해보세요."
                icon={
                  <Icon
                    color={COLORS.text.muted}
                    name="document-text-outline"
                    size={28}
                  />
                }
                title="게시글이 없습니다"
              />
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={COLORS.brand.primary} size="small" />
            </View>
          ) : items.length > 0 && !hasMore ? (
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>모든 게시글을 확인했어요</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {activeSearchLabel ? (
              <View style={styles.searchSummaryCard}>
                <Text style={styles.searchSummaryLabel}>
                  {activeSearchLabel}
                </Text>
                <TouchableOpacity activeOpacity={0.8} onPress={onClearSearch}>
                  <Icon
                    color={COLORS.text.secondary}
                    name="close-outline"
                    size={18}
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={COLORS.brand.primary}
          />
        }
        renderItem={({item}) => (
          <CommunityBoardPostCard item={item} onPress={onPressPost} />
        )}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        accessibilityLabel="게시글 작성"
        accessibilityRole="button"
        activeOpacity={0.9}
        onPress={onPressWrite}
        style={[styles.writeButton, {bottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + SPACING.sm}]}>
        <Icon color={COLORS.text.inverse} name="create-outline" size={24} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT + 88,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  headerContent: {
  },
  searchSummaryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.card,
  },
  searchSummaryLabel: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  stateWrap: {
    minHeight: 320,
    paddingTop: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  footerLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  writeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.pill,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: SPACING.lg,
    width: 56,
    ...SHADOWS.floating,
  },
});
