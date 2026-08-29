import React from 'react';

import {useAppNoticeFeedData} from '@/features/settings';
import {ForceUpdateModal} from '@/shared/ui/ForceUpdateModal';
import type {StartupNoticeItem} from '@/shared/types/version';

import {useAppBootstrap} from './useAppBootstrap';

const MAX_NOTICE_COUNT = 3;

type NoticeFeedReloadAttempt = {
  promise: Promise<void>;
  status: 'failed' | 'pending' | 'succeeded';
};

export const StartupModalHost = () => {
  const {
    checkingVersion,
    dismissStartupModal,
    modalConfig,
    retryVersionCheck,
    startupModalMode,
  } = useAppBootstrap();
  const shouldLoadAppNotices =
    startupModalMode === 'force-update' ||
    startupModalMode === 'soft-update' ||
    startupModalMode === 'maintenance';
  const appNoticeFeed = useAppNoticeFeedData({enabled: shouldLoadAppNotices});
  const reloadAppNoticeFeed = appNoticeFeed.reload;
  const previousStartupModalModeRef = React.useRef(startupModalMode);
  const maintenanceRetryNoticeFeedRef =
    React.useRef<NoticeFeedReloadAttempt | null>(null);

  React.useEffect(() => {
    const recoveringFromMaintenance =
      previousStartupModalModeRef.current === 'maintenance' &&
      (startupModalMode === 'force-update' || startupModalMode === 'soft-update');
    previousStartupModalModeRef.current = startupModalMode;

    if (startupModalMode === 'hidden') {
      maintenanceRetryNoticeFeedRef.current = null;
    }

    if (!recoveringFromMaintenance) return;

    const retryAttempt = maintenanceRetryNoticeFeedRef.current;
    if (retryAttempt?.status === 'succeeded') {
      maintenanceRetryNoticeFeedRef.current = null;
      return;
    }

    if (retryAttempt?.status === 'pending') {
      retryAttempt.promise.catch(() => {
        if (maintenanceRetryNoticeFeedRef.current !== retryAttempt) return;
        maintenanceRetryNoticeFeedRef.current = null;
        reloadAppNoticeFeed().catch(() => undefined);
      });
      return;
    }

    maintenanceRetryNoticeFeedRef.current = null;
    reloadAppNoticeFeed().catch(() => undefined);
  }, [reloadAppNoticeFeed, startupModalMode]);

  const handleMaintenanceRetry = React.useCallback(() => {
    const attempt: NoticeFeedReloadAttempt = {
      promise: reloadAppNoticeFeed(),
      status: 'pending',
    };
    maintenanceRetryNoticeFeedRef.current = attempt;
    attempt.promise.then(
      () => {
        attempt.status = 'succeeded';
      },
      () => {
        attempt.status = 'failed';
      },
    );
    retryVersionCheck();
  }, [reloadAppNoticeFeed, retryVersionCheck]);

  const noticeItems = React.useMemo<StartupNoticeItem[]>(() => {
    if (
      startupModalMode === 'hidden' || !appNoticeFeed.data
    ) {
      return [];
    }

    const limit = startupModalMode === 'maintenance' ? 1 : MAX_NOTICE_COUNT;
    return appNoticeFeed.data.items.slice(0, limit).map(item => ({
      body: item.content,
      id: item.id,
      isImportant: item.badges.some(badge => badge.tone === 'danger'),
      publishedLabel: item.publishedLabel,
      summary: item.summary,
      title: item.title,
    }));
  }, [appNoticeFeed.data, startupModalMode]);

  if (startupModalMode === 'hidden') {
    return null;
  }

  return (
    <ForceUpdateModal
      config={modalConfig}
      mode={startupModalMode}
      noticeItems={noticeItems}
      noticeLoading={shouldLoadAppNotices && appNoticeFeed.loading}
      onPressClose={dismissStartupModal}
      onPressRetry={handleMaintenanceRetry}
      retrying={checkingVersion}
      visible
    />
  );
};
