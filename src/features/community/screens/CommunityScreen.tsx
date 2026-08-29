import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {
  COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {
  PageHeader,
  SegmentedControl,
} from '@/shared/design-system/components';
import type {CommunityStackParamList} from '@/app/navigation/types';
import {useScreenEnterAnimation} from '@/shared/hooks';
import {COLORS, SPACING} from '@/shared/design-system/tokens';

import {CommunityBoardSegment} from '../components/CommunityBoardSegment';
import {useCommunityBoardData} from '../hooks/useCommunityBoardData';
import {CommunityChatSegment} from '../components/CommunityChatSegment';
import {useCommunityChatData} from '../hooks/useCommunityChatData';
import type {CommunitySegmentId} from '../model/communityViewData';

const SEGMENTS = [
  {id: 'board', label: '게시판'},
  {id: 'chat', label: '채팅'},
] as const;

type CommunityNavigationProp = NativeStackNavigationProp<
  CommunityStackParamList,
  'BoardMain'
>;
type CommunityRouteProp = RouteProp<CommunityStackParamList, 'BoardMain'>;

export const CommunityScreen = () => {
  const navigation = useNavigation<CommunityNavigationProp>();
  const route = useRoute<CommunityRouteProp>();
  const {width: windowWidth} = useWindowDimensions();
  const [selectedSegment, setSelectedSegment] =
    React.useState<CommunitySegmentId>(
      route.params?.initialSegment === 'chat' ? 'chat' : 'board',
    );
  const screenAnimatedStyle = useScreenEnterAnimation();
  const pageWidth = Math.max(windowWidth, 1);
  const pagerTranslateX = useSharedValue(0);
  const pagerDragStartX = useSharedValue(0);
  const {
    error: boardError,
    filters: boardFilters,
    handleApplyRouteSearch,
    handleClearSearch,
    handleOpenPost,
    handleOpenWrite,
    handleRefresh: handleBoardRefresh,
    handleSilentRefresh: handleBoardSilentRefresh,
    hasMore,
    items: boardItems,
    loadMore,
    loading: boardLoading,
    loadingMore,
    refreshing: boardRefreshing,
  } = useCommunityBoardData();
  const chat = useCommunityChatData();

  React.useEffect(() => {
    if (!route.params?.searchText || !route.params?.fromHashtag) {
      return;
    }

    setSelectedSegment('board');
    handleApplyRouteSearch(route.params.searchText);
    navigation.setParams({
      fromHashtag: undefined,
      searchText: undefined,
    });
  }, [
    handleApplyRouteSearch,
    navigation,
    route.params?.fromHashtag,
    route.params?.searchText,
  ]);

  React.useEffect(() => {
    if (!route.params?.initialSegment) {
      return;
    }

    setSelectedSegment(route.params.initialSegment);
    navigation.setParams({
      initialSegment: undefined,
    });
  }, [navigation, route.params?.initialSegment]);

  const activeSearchLabel = boardFilters.searchText
    ? boardFilters.searchText.startsWith('#')
      ? `${boardFilters.searchText} 해시태그 검색 결과`
      : `"${boardFilters.searchText}" 검색 결과`
    : boardFilters.category
    ? '카테고리 필터가 적용되었습니다'
    : undefined;

  React.useEffect(() => {
    const nextIndex = selectedSegment === 'board' ? 0 : 1;
    pagerTranslateX.value = withTiming(-nextIndex * pageWidth, {
      duration: 240,
    });
  }, [pageWidth, pagerTranslateX, selectedSegment]);

  useRefetchOnFocus({
    invalidationKey: COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
    refetch: handleBoardSilentRefresh,
  });

  const handleSetSegmentByIndex = React.useCallback((nextIndex: number) => {
    setSelectedSegment(nextIndex === 0 ? 'board' : 'chat');
  }, []);

  const pagerGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          pagerDragStartX.value = pagerTranslateX.value;
        })
        .onUpdate(event => {
          const nextTranslateX = pagerDragStartX.value + event.translationX;
          pagerTranslateX.value = Math.max(
            -pageWidth,
            Math.min(0, nextTranslateX),
          );
        })
        .onEnd(event => {
          const dragDistance = event.translationX;
          const dragVelocity = event.velocityX;
          const currentProgress = Math.abs(pagerTranslateX.value / pageWidth);
          let nextIndex = currentProgress >= 0.5 ? 1 : 0;

          if (Math.abs(dragDistance) > pageWidth * 0.18) {
            nextIndex = dragDistance < 0 ? 1 : 0;
          }

          if (Math.abs(dragVelocity) > 700) {
            nextIndex = dragVelocity < 0 ? 1 : 0;
          }

          pagerTranslateX.value = withTiming(-nextIndex * pageWidth, {
            duration: 220,
          });
          runOnJS(handleSetSegmentByIndex)(nextIndex);
        }),
    [
      handleSetSegmentByIndex,
      pageWidth,
      pagerDragStartX,
      pagerTranslateX,
    ],
  );

  const pagerTrackStyle = useAnimatedStyle(() => ({
    transform: [{translateX: pagerTranslateX.value}],
  }));

  const boardPageStyle = useAnimatedStyle(() => {
    const progress = Math.abs(pagerTranslateX.value / pageWidth);

    return {
      opacity: interpolate(progress, [0, 1], [1, 0.72]),
      transform: [{scale: interpolate(progress, [0, 1], [1, 0.985])}],
    };
  });

  const chatPageStyle = useAnimatedStyle(() => {
    const progress = Math.abs((pagerTranslateX.value + pageWidth) / pageWidth);

    return {
      opacity: interpolate(progress, [0, 1], [1, 0.72]),
      transform: [{scale: interpolate(progress, [0, 1], [1, 0.985])}],
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        <View style={styles.headerSection}>
          <PageHeader
            subtitle="학우들과 소통하고 정보를 나눠요"
            title="커뮤니티"
          />
        </View>

        <View style={styles.segmentSection}>
          <SegmentedControl
            items={SEGMENTS}
            onSelect={setSelectedSegment}
            selectedId={selectedSegment}
          />
        </View>

        <View style={styles.contentSection}>
          <GestureDetector gesture={pagerGesture}>
            <View style={styles.pagerViewport}>
              <Animated.View
                style={[
                  styles.pagerTrack,
                  {width: pageWidth * SEGMENTS.length},
                  pagerTrackStyle,
                ]}>
                <Animated.View
                  style={[styles.page, {width: pageWidth}, boardPageStyle]}>
                  <CommunityBoardSegment
                    active={selectedSegment === 'board'}
                    activeSearchLabel={activeSearchLabel}
                    error={boardError}
                    hasMore={hasMore}
                    items={boardItems}
                    loading={boardLoading}
                    loadingMore={loadingMore}
                    onClearSearch={handleClearSearch}
                    onLoadMore={loadMore}
                    onPressPost={handleOpenPost}
                    onPressWrite={handleOpenWrite}
                    onRefresh={handleBoardRefresh}
                    refreshing={boardRefreshing}
                  />
                </Animated.View>

                <Animated.View
                  style={[styles.page, {width: pageWidth}, chatPageStyle]}>
                  <CommunityChatSegment
                    active={selectedSegment === 'chat'}
                    loading={chat.loading}
                    onPressRoom={chat.handleOpenRoom}
                    onRefresh={chat.handleRefresh}
                    refreshing={chat.refreshing}
                    rooms={chat.rooms}
                  />
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>
        </View>
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
  headerSection: {
    paddingHorizontal: SPACING.lg,
  },
  segmentSection: {
    paddingHorizontal: SPACING.lg,
  },
  contentSection: {
    flex: 1,
    paddingTop: SPACING.xs,
  },
  pagerViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
  },
});
