import React from 'react';

import {useAppNoticeRepository} from '@/di/useRepository';

import {assembleAppNoticeFeedViewData} from '../application/appNoticeViewAssembler';
import type {
  AppNoticeBadgeViewData,
  AppNoticeFeedViewData,
} from '../model/appNoticeViewData';

interface UseAppNoticeFeedDataResult {
  data: AppNoticeFeedViewData | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

interface UseAppNoticeFeedDataOptions {
  enabled?: boolean;
}

const buildBadges = (important: boolean): AppNoticeBadgeViewData[] => {
  if (!important) {
    return [];
  }

  return [
    {
      id: 'important',
      label: '중요',
      tone: 'danger',
    },
  ];
};

export const useAppNoticeFeedData = (
  options: UseAppNoticeFeedDataOptions = {},
): UseAppNoticeFeedDataResult => {
  const appNoticeRepository = useAppNoticeRepository();
  const [data, setData] = React.useState<AppNoticeFeedViewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const enabled = options.enabled ?? true;

  const load = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const notices = await appNoticeRepository.getAppNotices();
      const nextData = assembleAppNoticeFeedViewData(notices);

      if (requestId !== requestIdRef.current) return;
      setData({
        items: nextData.items.map(item => ({
          ...item,
          badges: buildBadges(notices.find(notice => notice.id === item.id)?.priority === 'urgent'),
        })),
      });
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      console.error('앱 공지사항 목록을 불러오지 못했습니다.', loadError);
      setError('앱 공지사항을 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [appNoticeRepository, enabled]);

  React.useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    load();
  }, [enabled, load]);

  return {
    data,
    error,
    loading,
    reload: load,
  };
};
