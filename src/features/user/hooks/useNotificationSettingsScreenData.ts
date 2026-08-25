import React from 'react';

import {useNotificationSettingsScreenRepository} from '@/di';
import {COLORS} from '@/shared/design-system/tokens';
import type {
  NotificationSettingKey,
  NotificationSettingsScreenSource,
} from '../model/notificationSettingsSource';
import type {
  NotificationSettingItemViewData,
  NotificationSettingMasterViewData,
  NotificationSettingsScreenViewData,
} from '../model/notificationSettingsViewData';

type NotificationSettingIconKey =
  | 'allNotifications'
  | 'partyNotifications'
  | 'noticeNotifications'
  | 'boardLikeNotifications'
  | 'commentNotifications'
  | 'bookmarkedPostCommentNotifications'
  | 'friendAndInvitationNotifications'
  | 'systemNotifications';

interface NotificationSettingMeta {
  iconKey: NotificationSettingIconKey;
  subtitle: string;
  title: string;
}

const NOTIFICATION_SETTINGS_MASTER_META: NotificationSettingMeta = {
  iconKey: 'allNotifications',
  subtitle: '모든 알림을 한 번에 켜거나 끕니다',
  title: '모든 알림',
};

const NOTIFICATION_SETTINGS_ITEM_META: Record<
  NotificationSettingKey,
  NotificationSettingMeta
> = {
  partyNotifications: {
    iconKey: 'partyNotifications',
    subtitle: '새 파티 생성, 파티 동승 요청, 파티 상태 변경 알림',
    title: '택시파티 알림',
  },
  noticeNotifications: {
    iconKey: 'noticeNotifications',
    subtitle: '학교 공지사항 실시간 알림',
    title: '학교 공지사항 알림',
  },
  boardLikeNotifications: {
    iconKey: 'boardLikeNotifications',
    subtitle: '내 게시물에 좋아요 눌렸을 때 알림',
    title: '게시물 좋아요 알림',
  },
  commentNotifications: {
    iconKey: 'commentNotifications',
    subtitle: '내 게시물이나 내 댓글에 댓글/답글이 달렸을 때 알림',
    title: '댓글/답글 알림',
  },
  bookmarkedPostCommentNotifications: {
    iconKey: 'bookmarkedPostCommentNotifications',
    subtitle: '북마크한 게시물에 새 댓글이 달렸을 때 알림',
    title: '북마크한 게시물의 댓글 알림',
  },
  friendAndInvitationNotifications: {
    iconKey: 'friendAndInvitationNotifications',
    subtitle: '친구 요청·수락·거절과 택시파티·공개방 초대 알림',
    title: '친구·초대 알림',
  },
  systemNotifications: {
    iconKey: 'systemNotifications',
    subtitle: '앱 업데이트, 서비스 점검, 보안 관련 알림',
    title: '시스템 알림',
  },
};

const resolveIcon = (iconKey: NotificationSettingIconKey) => {
  switch (iconKey) {
    case 'allNotifications':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'notifications-outline',
      };
    case 'partyNotifications':
      return {
        iconBackgroundColor: COLORS.accent.orangeSoft,
        iconColor: COLORS.accent.orange,
        iconName: 'car-outline',
      };
    case 'noticeNotifications':
      return {
        iconBackgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
        iconName: 'megaphone-outline',
      };
    case 'boardLikeNotifications':
      return {
        iconBackgroundColor: COLORS.accent.pinkSoft,
        iconColor: COLORS.status.danger,
        iconName: 'heart-outline',
      };
    case 'commentNotifications':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'chatbubble-outline',
      };
    case 'bookmarkedPostCommentNotifications':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'bookmark-outline',
      };
    case 'friendAndInvitationNotifications':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'people-outline',
      };
    case 'systemNotifications':
      return {
        iconBackgroundColor: COLORS.accent.purpleSoft,
        iconColor: COLORS.accent.purple,
        iconName: 'shield-checkmark-outline',
      };
    default:
      return {
        iconBackgroundColor: COLORS.accent.pinkSoft,
        iconColor: COLORS.accent.pink,
        iconName: 'gift-outline',
      };
  }
};

const mapItem = (
  item: NotificationSettingsScreenSource['items'][number],
  disabled: boolean,
): NotificationSettingItemViewData => {
  const meta = NOTIFICATION_SETTINGS_ITEM_META[item.key];
  const icon = resolveIcon(meta.iconKey);

  return {
    disabled,
    ...icon,
    key: item.key,
    subtitle: meta.subtitle,
    title: meta.title,
    value: item.enabled,
  };
};

const mapScreen = (
  source: NotificationSettingsScreenSource,
): NotificationSettingsScreenViewData => {
  const master: NotificationSettingMasterViewData = {
    disabled: false,
    ...resolveIcon(NOTIFICATION_SETTINGS_MASTER_META.iconKey),
    key: 'allNotifications',
    subtitle: NOTIFICATION_SETTINGS_MASTER_META.subtitle,
    title: NOTIFICATION_SETTINGS_MASTER_META.title,
    value: source.allNotifications,
  };

  return {
    items: source.items.map(item => mapItem(item, !source.allNotifications)),
    master,
  };
};

const applyToggleAllOptimistically = (
  previous: NotificationSettingsScreenViewData,
  enabled: boolean,
): NotificationSettingsScreenViewData => ({
  items: previous.items.map(item => ({
    ...item,
    disabled: !enabled,
    value: enabled,
  })),
  master: {
    ...previous.master,
    value: enabled,
  },
});

const applyToggleItemOptimistically = (
  previous: NotificationSettingsScreenViewData,
  key: NotificationSettingKey,
  enabled: boolean,
): NotificationSettingsScreenViewData => {
  const nextItems = previous.items.map(item =>
    item.key === key
      ? {
          ...item,
          value: enabled,
        }
      : item,
  );
  const nextMasterValue = nextItems.some(item => item.value);

  return {
    items: nextItems.map(item => ({
      ...item,
      disabled: !nextMasterValue,
    })),
    master: {
      ...previous.master,
      value: nextMasterValue,
    },
  };
};

export const useNotificationSettingsScreenData = () => {
  const notificationSettingsScreenRepository =
    useNotificationSettingsScreenRepository();
  const [data, setData] =
    React.useState<NotificationSettingsScreenViewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const dataRef = React.useRef<NotificationSettingsScreenViewData | null>(null);
  const stableDataRef =
    React.useRef<NotificationSettingsScreenViewData | null>(null);
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const source =
        await notificationSettingsScreenRepository.getNotificationSettings();
      const nextData = mapScreen(source);
      stableDataRef.current = nextData;
      setData(nextData);
    } catch (caughtError) {
      console.error('알림 설정 데이터를 불러오지 못했습니다.', caughtError);
      setError('알림 설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [notificationSettingsScreenRepository]);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const toggleAll = React.useCallback(async (enabled: boolean) => {
    if (savingRef.current || !dataRef.current) {
      return;
    }

    const previousData = stableDataRef.current ?? dataRef.current;
    const optimisticData = applyToggleAllOptimistically(previousData, enabled);

    savingRef.current = true;
    setSaving(true);
    setError(null);
    setData(optimisticData);

    try {
      const source =
        await notificationSettingsScreenRepository.updateAllNotifications(
          enabled,
        );
      const nextData = mapScreen(source);
      stableDataRef.current = nextData;
      setData(nextData);
    } catch (caughtError) {
      console.error('전체 알림 설정을 변경하지 못했습니다.', caughtError);
      setError('전체 알림 설정 변경에 실패했습니다.');
      setData(previousData);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [notificationSettingsScreenRepository]);

  const toggleItem = React.useCallback(
    async (key: NotificationSettingKey, enabled: boolean) => {
      if (savingRef.current || !dataRef.current) {
        return;
      }

      const previousData = stableDataRef.current ?? dataRef.current;
      const optimisticData = applyToggleItemOptimistically(
        previousData,
        key,
        enabled,
      );

      savingRef.current = true;
      setSaving(true);
      setError(null);
      setData(optimisticData);

      try {
        const source =
          await notificationSettingsScreenRepository.updateNotificationSetting(
            key,
            enabled,
          );
        const nextData = mapScreen(source);
        stableDataRef.current = nextData;
        setData(nextData);
      } catch (caughtError) {
        console.error('개별 알림 설정을 변경하지 못했습니다.', caughtError);
        setError('개별 알림 설정 변경에 실패했습니다.');
        setData(previousData);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [notificationSettingsScreenRepository],
  );

  return {
    data,
    error,
    loading,
    reload: load,
    saving,
    toggleAll,
    toggleItem,
  };
};
