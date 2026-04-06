import React from 'react';

import {formatKoreanRelativeTime} from '@/shared/lib/date';

import {NOTICE_CATEGORIES} from '../model/constants';
import type {Notice, ReadStatusMap} from '../model/types';
import {countUnreadNotices, isNoticeRead} from '../model/selectors';
import type {
  NoticeHomeCategoryId,
  NoticeHomeNoticeItemViewData,
  NoticeHomeViewData,
} from '../model/noticeHomeViewData';
import {buildNoticeReadStatus} from '../services/noticeReadStateService';
import {useNotices} from './useNotices';
import {useNoticeSettings} from './useNoticeSettings';
import {
  getNoticeCategoryDisplayLabel,
  getNoticeCategoryTone,
} from '../utils/noticePresentation';

const mapNoticeToViewData = (
  notice: Notice,
  isUnread: boolean,
): NoticeHomeNoticeItemViewData => {
  const categoryLabel = getNoticeCategoryDisplayLabel(notice.category);

  return {
    authorLabel: notice.author || notice.department || '성결대학교',
    bookmarkCount: notice.bookmarkCount ?? 0,
    categoryLabel,
    categoryTone: getNoticeCategoryTone(categoryLabel),
    commentCount: notice.commentCount ?? 0,
    id: notice.id,
    isBookmarked: Boolean(notice.isBookmarked),
    isCommentedByMe: Boolean(notice.isCommentedByMe),
    isLiked: Boolean(notice.isLiked),
    isUnread,
    likeCount: notice.likeCount ?? 0,
    thumbnailUrl: notice.thumbnailUrl,
    timeLabel: formatKoreanRelativeTime(notice.postedAt),
    title: notice.title,
    viewCount: notice.viewCount ?? 0,
  };
};

const buildNoticeHomeViewData = ({
  firstUnreadNoticeId,
  items,
  readStatus,
  selectedCategoryId,
  unreadCount,
  userJoinedAt,
}: {
  firstUnreadNoticeId?: string;
  items: Notice[];
  readStatus: ReadStatusMap;
  selectedCategoryId: NoticeHomeCategoryId;
  unreadCount: number;
  userJoinedAt: unknown;
}): NoticeHomeViewData => {
  return {
    banner: {
      actionLabel: unreadCount > 0 ? '보기' : undefined,
      description:
        unreadCount > 0
          ? `${unreadCount}개의 새로운 공지가 있어요`
          : '새로운 공지를 모두 확인했어요',
      hasUnread: unreadCount > 0,
      title: '읽지 않은 공지',
    },
    categoryChips: NOTICE_CATEGORIES.map(category => ({
      id: category,
      label: category,
      selected: category === selectedCategoryId,
    })),
    emptyState: {
      description: `${selectedCategoryId} 카테고리의 공지가 아직 없습니다.`,
      title: '공지사항이 없습니다',
    },
    firstUnreadNoticeId,
    items: items.map(notice =>
      mapNoticeToViewData(
        notice,
        !isNoticeRead(notice, readStatus, userJoinedAt),
      ),
    ),
    subtitle: '성결대학교 최신 공지를 확인하세요',
    title: '공지사항',
  };
};

export const useNoticeHomeData = () => {
  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<NoticeHomeCategoryId>('전체');

  const {
    activeCategoryKey,
    error,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    markAsRead,
    notices,
    readStatus,
    refresh,
    refreshSilently,
    userJoinedAt,
    userJoinedAtLoaded,
  } = useNotices(selectedCategoryId);
  const {
    error: noticeSettingsError,
    loading: noticeSettingsLoading,
    saving: noticeSettingsSaving,
    settings: noticeSettings,
    updateDetail,
    updateMaster,
  } = useNoticeSettings();

  const resolvedReadStatus = React.useMemo(
    () =>
      buildNoticeReadStatus({
        notices,
        previousReadStatus: readStatus,
        userJoinedAt,
      }),
    [notices, readStatus, userJoinedAt],
  );

  const resolvedUnreadCount = React.useMemo(
    () => countUnreadNotices(notices, resolvedReadStatus, userJoinedAt),
    [notices, resolvedReadStatus, userJoinedAt],
  );

  const firstUnreadNoticeId = React.useMemo(
    () =>
      notices.find(
        notice => !isNoticeRead(notice, resolvedReadStatus, userJoinedAt),
      )?.id,
    [notices, resolvedReadStatus, userJoinedAt],
  );

  const isBannerReady =
    userJoinedAtLoaded && !loading && activeCategoryKey === selectedCategoryId;

  const banner = React.useMemo(
    () =>
      isBannerReady && resolvedUnreadCount > 0
        ? {
            actionLabel: '보기',
            description: `${resolvedUnreadCount}개의 새로운 공지가 있어요`,
            hasUnread: true,
            title: '읽지 않은 공지',
          }
        : null,
    [isBannerReady, resolvedUnreadCount],
  );

  const data = React.useMemo(
    () =>
      buildNoticeHomeViewData({
        firstUnreadNoticeId,
        items: notices,
        readStatus: resolvedReadStatus,
        selectedCategoryId,
        unreadCount: resolvedUnreadCount,
        userJoinedAt,
      }),
    [
      firstUnreadNoticeId,
      notices,
      resolvedReadStatus,
      selectedCategoryId,
      resolvedUnreadCount,
      userJoinedAt,
    ],
  );

  return {
    banner,
    bannerFirstUnreadNoticeId: banner ? firstUnreadNoticeId : undefined,
    data,
    error,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    markAsRead,
    noticeSettings,
    noticeSettingsError,
    noticeSettingsLoading,
    noticeSettingsSaving,
    refresh,
    refreshSilently,
    selectCategory: setSelectedCategoryId,
    updateDetail,
    updateMaster,
    userJoinedAtLoaded,
  };
};
