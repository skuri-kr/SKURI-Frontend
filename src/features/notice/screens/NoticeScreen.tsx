import React from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {
  NOTICE_LIST_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {PageHeader} from '@/shared/design-system/components';
import {useScreenEnterAnimation, useScreenView} from '@/shared/hooks';
import {BOTTOM_TAB_BAR_HEIGHT} from '@/shared/constants/layout';
import {COLORS, SPACING} from '@/shared/design-system/tokens';

import {NoticeSettingsPanel} from '../components/NoticeSettingsPanel';
import {NoticeCategoryBar} from '../components/NoticeCategoryBar';
import {NoticeHomeList} from '../components/NoticeHomeList';
import {NoticeUnreadBanner} from '../components/NoticeUnreadBanner';
import {useNoticeHomeData} from '../hooks/useNoticeHomeData';
import type {NoticeStackParamList} from '../model/navigation';

export const NoticeScreen = () => {
  useScreenView();

  const navigation =
    useNavigation<NativeStackNavigationProp<NoticeStackParamList>>();
  const [panelVisible, setPanelVisible] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const loadMoreRequestedRef = React.useRef(false);
  const screenAnimatedStyle = useScreenEnterAnimation();

  const {
    banner,
    bannerFirstUnreadNoticeId,
    data,
    error,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    markAsRead,
    noticeSettings,
    noticeSettingsSaving,
    refresh,
    refreshSilently,
    selectCategory,
    updateDetail,
    updateMaster,
    userJoinedAtLoaded,
  } = useNoticeHomeData();

  React.useEffect(() => {
    if (!loadingMore) {
      loadMoreRequestedRef.current = false;
    }
  }, [loadingMore, data.items.length]);

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh().finally(() => {
      setRefreshing(false);
    });
  }, [refresh]);

  const handleOpenNotice = React.useCallback(
    (noticeId: string) => {
      markAsRead(noticeId).catch(() => undefined);
      navigation.navigate('NoticeDetail', {noticeId});
    },
    [markAsRead, navigation],
  );

  const handleOpenSearch = React.useCallback(() => {
    navigation.navigate('NoticeSearch');
  }, [navigation]);

  const handleOpenSettings = React.useCallback(() => {
    setPanelVisible(true);
  }, []);

  const handlePressUnreadBanner = React.useCallback(() => {
    if (!bannerFirstUnreadNoticeId) {
      return;
    }

    handleOpenNotice(bannerFirstUnreadNoticeId);
  }, [bannerFirstUnreadNoticeId, handleOpenNotice]);

  const handleListSectionScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (
        loading ||
        loadingMore ||
        !hasMore ||
        error ||
        loadMoreRequestedRef.current
      ) {
        return;
      }

      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (distanceFromBottom > 120) {
        return;
      }

      loadMoreRequestedRef.current = true;
      loadMore().catch(() => {
        loadMoreRequestedRef.current = false;
      });
    },
    [error, hasMore, loadMore, loading, loadingMore],
  );

  useRefetchOnFocus({
    invalidationKey: NOTICE_LIST_INVALIDATION_KEY,
    refetch: refreshSilently,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.content, screenAnimatedStyle]}>
        <View style={styles.headerSection}>
          <PageHeader
            actions={[
              {
                accessibilityLabel: '공지 검색 열기',
                onPress: handleOpenSearch,
              },
              {
                accessibilityLabel: '공지 알림 설정 열기',
                iconName: 'notifications-outline',
                onPress: handleOpenSettings,
              },
            ]}
            subtitle={data.subtitle}
            title={data.title}
          />
          {banner?.hasUnread ? (
            <NoticeUnreadBanner
              banner={banner}
              onPressAction={
                banner.actionLabel ? handlePressUnreadBanner : undefined
              }
            />
          ) : null}
        </View>

        <View style={styles.categorySection}>
          <NoticeCategoryBar
            categories={data.categoryChips}
            onSelectCategory={selectCategory}
          />
        </View>

        <View style={styles.listSection}>
          <ScrollView
            contentContainerStyle={styles.listScrollContent}
            onScroll={handleListSectionScroll}
            refreshControl={
              <RefreshControl
                onRefresh={handleRefresh}
                refreshing={refreshing}
                tintColor={COLORS.brand.primary}
              />
            }
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}>
            <NoticeHomeList
              emptyState={data.emptyState}
              error={error}
              hasMore={hasMore}
              items={data.items}
              loading={loading}
              loadingMore={loadingMore}
              onPressNotice={handleOpenNotice}
              onRefresh={handleRefresh}
              userJoinedAtLoaded={userJoinedAtLoaded}
            />
          </ScrollView>
        </View>
      </Animated.View>

      <NoticeSettingsPanel
        noticeSettings={noticeSettings}
        onClose={() => setPanelVisible(false)}
        onUpdateDetail={updateDetail}
        onUpdateMaster={updateMaster}
        saving={noticeSettingsSaving}
        visible={panelVisible}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.page,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  categorySection: {
    paddingHorizontal: SPACING.lg,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  listScrollContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.xxl,
  },
});
