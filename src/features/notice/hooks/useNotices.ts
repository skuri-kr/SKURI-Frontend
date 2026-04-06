import {useState, useEffect, useCallback, useRef} from 'react';

import type {Notice, ReadStatusMap} from '../model/types';
import type {NoticeListPage} from '../data/repositories/INoticeRepository';
import {useNoticeReadState} from './useNoticeReadState';
import {useNoticeRepository} from './useNoticeRepository';

const NOTICES_PER_PAGE = 20;

export interface UseNoticesResult {
  activeCategoryKey: string;
  notices: Notice[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  unreadCount: number;
  readStatus: ReadStatusMap;
  readStatusLoading: boolean;
  markAsRead: (noticeId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshSilently: () => Promise<void>;
  refreshReadStatus: () => Promise<void>;
  userJoinedAt: unknown;
  userJoinedAtLoaded: boolean;
}

/**
 * 공지사항 훅 - Repository 패턴 사용
 *
 * @param selectedCategory - 선택된 카테고리 ('전체' 또는 특정 카테고리)
 * @returns 공지 목록 및 읽음 상태
 */
export function useNotices(
  selectedCategory: string = '전체',
): UseNoticesResult {
  const noticeRepository = useNoticeRepository();

  const [activeCategoryKey, setActiveCategoryKey] = useState(
    selectedCategory || '전체',
  );
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [categoryCache, setCategoryCache] = useState<
    Record<
      string,
      {
        items: Notice[];
        cursor: unknown;
        hasMore: boolean;
        initialized: boolean;
      }
    >
  >({});

  const cursorRef = useRef<unknown>(null);
  const isMountedRef = useRef<boolean>(true);
  const firstPageRequestIdRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const categoryCacheRef = useRef(categoryCache);

  useEffect(() => {
    categoryCacheRef.current = categoryCache;
  }, [categoryCache]);

  const applyFirstPage = useCallback((catKey: string, page: NoticeListPage) => {
    setCategoryCache(prev => ({
      ...prev,
      [catKey]: {
        items: page.data,
        cursor: page.cursor,
        hasMore: page.hasMore,
        initialized: true,
      },
    }));

    setActiveCategoryKey(catKey);
    setNotices(page.data);
    cursorRef.current = page.cursor;
    setHasMore(page.hasMore);
    setLoading(false);
    setError(null);
  }, []);

  const loadFirstPage = useCallback(
    async (
      catKey: string,
      options?: {silent?: boolean; useCache?: boolean},
    ) => {
      const silent = options?.silent ?? false;
      const useCache = options?.useCache ?? true;
      const cached = categoryCacheRef.current[catKey];

      if (useCache && cached?.initialized) {
        setActiveCategoryKey(catKey);
        setNotices(cached.items);
        cursorRef.current = cached.cursor;
        setHasMore(cached.hasMore);
        setLoading(false);
        setError(null);
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const requestId = firstPageRequestIdRef.current + 1;
      firstPageRequestIdRef.current = requestId;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      try {
        const page = await new Promise<NoticeListPage>((resolve, reject) => {
          unsubscribeRef.current = noticeRepository.subscribeToNotices(
            catKey,
            NOTICES_PER_PAGE,
            {
              onData: resolve,
              onError: reject,
            },
          );
        });

        if (
          !isMountedRef.current ||
          firstPageRequestIdRef.current !== requestId
        ) {
          return;
        }

        applyFirstPage(catKey, page);
      } catch (err) {
        if (
          !isMountedRef.current ||
          firstPageRequestIdRef.current !== requestId
        ) {
          return;
        }

        console.error('공지사항 로드 실패:', err);
        setError(
          err instanceof Error
            ? err.message
            : '공지사항을 불러오지 못했습니다.',
        );
        setLoading(false);
      }
    },
    [applyFirstPage, noticeRepository],
  );

  useEffect(() => {
    isMountedRef.current = true;
    const catKey = selectedCategory || '전체';
    loadFirstPage(catKey, {useCache: true}).catch(() => undefined);

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [loadFirstPage, selectedCategory]);

  const {
    markAllAsRead,
    markAsRead,
    readStatus,
    readStatusLoading,
    refreshReadStatus,
    unreadCount,
    userJoinedAt,
    userJoinedAtLoaded,
  } = useNoticeReadState({notices});

  const refresh = useCallback(async () => {
    const catKey = selectedCategory || '전체';
    await loadFirstPage(catKey, {useCache: false});
  }, [loadFirstPage, selectedCategory]);

  const refreshSilently = useCallback(async () => {
    const catKey = selectedCategory || '전체';
    await loadFirstPage(catKey, {silent: true, useCache: false});
  }, [loadFirstPage, selectedCategory]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) {
      return;
    }

    setLoadingMore(true);

    try {
      const catKey = selectedCategory || '전체';
      const result = await noticeRepository.getMoreNotices(
        catKey,
        cursorRef.current,
        NOTICES_PER_PAGE,
      );

      if (!isMountedRef.current) {
        return;
      }

      if (result.data.length === 0) {
        setHasMore(false);
        setCategoryCache(prev => ({
          ...prev,
          [catKey]: {...prev[catKey], hasMore: false},
        }));
        return;
      }

      setNotices(prev => {
        const merged = [...prev, ...result.data];
        setCategoryCache(prevCache => ({
          ...prevCache,
          [catKey]: {
            items: merged,
            cursor: result.cursor,
            hasMore: result.hasMore,
            initialized: true,
          },
        }));
        return merged;
      });

      cursorRef.current = result.cursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('더 많은 공지사항 로드 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, noticeRepository, selectedCategory]);

  return {
    activeCategoryKey,
    notices,
    loading,
    loadingMore,
    error,
    hasMore,
    unreadCount,
    readStatus,
    readStatusLoading,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
    refreshSilently,
    refreshReadStatus,
    userJoinedAt,
    userJoinedAtLoaded,
  };
}
