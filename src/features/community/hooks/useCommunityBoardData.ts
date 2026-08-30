import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {
  CommunityBoardFeaturedViewData,
  CommunityBoardPostViewData,
} from '../model/communityViewData';
import type {
  CommunityBoardSearchFilters,
  CommunityBoardSourceItem,
} from '../model/communityHomeData';
import type {CommunityStackParamList} from '@/app/navigation/types';
import {useBoardRepository} from '@/features/board';
import {formatKoreanRelativeTime} from '@/shared/lib/date';

import {loadCommunityBoardPage} from '../application/communityBoardQuery';

const PAGE_SIZE = 5;

const BOARD_CATEGORY_LABEL_MAP: Record<
  CommunityBoardSourceItem['category'],
  string
> = {
  announcement: '정보게시판',
  general: '자유게시판',
  question: '질문게시판',
  review: '후기게시판',
};

const DEFAULT_FILTERS: CommunityBoardSearchFilters = {
  sortBy: 'latest',
};

const toFeaturedViewData = (
  post: CommunityBoardSourceItem,
): CommunityBoardFeaturedViewData => ({
  categoryLabel: BOARD_CATEGORY_LABEL_MAP[post.category],
  commentCount: post.commentCount,
  id: post.id,
  likeCount: post.likeCount,
  timeLabel: formatKoreanRelativeTime(post.createdAt),
  title: post.title,
});

const toBoardPostViewData = (
  post: CommunityBoardSourceItem,
): CommunityBoardPostViewData => ({
  authorLabel: post.isAnonymous ? '익명' : post.authorName,
  authorProfileImage: post.isAnonymous ? null : post.authorProfileImage,
  isAuthorAdmin: !post.isAnonymous && Boolean(post.isAuthorAdmin),
  bookmarkCount: post.bookmarkCount,
  categoryLabel: BOARD_CATEGORY_LABEL_MAP[post.category],
  commentCount: post.commentCount,
  excerpt: post.content,
  id: post.id,
  isBookmarked: post.isBookmarked,
  isCommentedByMe: post.isCommentedByMe,
  isLiked: post.isLiked,
  likeCount: post.likeCount,
  thumbnailUrl: post.thumbnailUrl,
  timeLabel: formatKoreanRelativeTime(post.createdAt),
  title: post.title,
  viewCount: post.viewCount,
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '게시글을 다시 불러와주세요.';
};

export const useCommunityBoardData = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();
  const boardRepository = useBoardRepository();
  const [searchFilters, setSearchFilters] =
    React.useState<CommunityBoardSearchFilters>(DEFAULT_FILTERS);
  const [items, setItems] = React.useState<CommunityBoardPostViewData[]>([]);
  const [featuredPost, setFeaturedPost] = React.useState<
    CommunityBoardFeaturedViewData | undefined
  >(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<unknown>(undefined);
  const [refreshing, setRefreshing] = React.useState(false);
  const requestIdRef = React.useRef(0);
  const hasActiveSearch =
    Boolean(searchFilters.searchText) || Boolean(searchFilters.category);
  const adsEnabled = !hasActiveSearch && !loading && !refreshing;

  const fetchBoardPage = React.useCallback(
    async (
      mode: 'initial' | 'refresh' | 'silent' | 'loadMore',
      cursor?: unknown,
    ) => {
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (mode === 'initial') {
        setLoading(true);
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      }

      if (mode === 'loadMore') {
        setLoadingMore(true);
      }

      try {
        const result = await loadCommunityBoardPage({
          boardRepository,
          cursor,
          filters: searchFilters,
          limit: PAGE_SIZE,
        });

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setError(null);
        setNextCursor(result.nextCursor);
        setFeaturedPost(
          hasActiveSearch || !result.featuredPost
            ? undefined
            : toFeaturedViewData(result.featuredPost),
        );
        setItems(previousItems =>
          mode === 'loadMore'
            ? [...previousItems, ...result.items.map(toBoardPostViewData)]
            : result.items.map(toBoardPostViewData),
        );
      } catch (fetchError) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setError(getErrorMessage(fetchError));

        if (mode === 'initial' || mode === 'refresh') {
          setItems([]);
          setFeaturedPost(undefined);
          setNextCursor(undefined);
        }
      } finally {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [boardRepository, hasActiveSearch, searchFilters],
  );

  React.useEffect(() => {
    fetchBoardPage('initial').catch(() => undefined);
  }, [fetchBoardPage]);

  const handleRefresh = React.useCallback(() => {
    return fetchBoardPage('refresh');
  }, [fetchBoardPage]);

  const handleSilentRefresh = React.useCallback(() => {
    return fetchBoardPage('silent');
  }, [fetchBoardPage]);

  const handleOpenPost = React.useCallback(
    (postId: string) => {
      navigation.navigate('BoardDetail', {postId});
    },
    [navigation],
  );

  const handleOpenWrite = React.useCallback(() => {
    navigation.navigate('BoardWrite');
  }, [navigation]);

  const resetForFilterTransition = React.useCallback(() => {
    requestIdRef.current += 1;
    setItems([]);
    setFeaturedPost(undefined);
    setError(null);
    setLoading(true);
    setLoadingMore(false);
    setNextCursor(undefined);
    setRefreshing(false);
  }, []);

  const handleClearSearch = React.useCallback(() => {
    resetForFilterTransition();
    setSearchFilters(DEFAULT_FILTERS);
  }, [resetForFilterTransition]);

  const handleApplyRouteSearch = React.useCallback(
    (searchText: string) => {
      resetForFilterTransition();
      setSearchFilters({
        searchText,
        sortBy: 'latest',
      });
    },
    [resetForFilterTransition],
  );

  const loadMore = React.useCallback(async () => {
    if (loading || loadingMore || !nextCursor) {
      return;
    }

    await fetchBoardPage('loadMore', nextCursor);
  }, [fetchBoardPage, loading, loadingMore, nextCursor]);

  return {
    adsEnabled,
    error,
    featuredPost,
    filters: searchFilters,
    handleApplyRouteSearch,
    handleClearSearch,
    handleOpenPost,
    handleOpenWrite,
    handleRefresh,
    handleSilentRefresh,
    hasMore: Boolean(nextCursor),
    items,
    loadMore,
    loading,
    loadingMore,
    refreshing,
  };
};
