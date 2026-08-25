import type {NotificationSettingsScreenSource} from '../model/notificationSettingsSource';

export const notificationSettingsMockData: NotificationSettingsScreenSource = {
  allNotifications: true,
  items: [
    {
      enabled: true,
      key: 'partyNotifications',
    },
    {
      enabled: true,
      key: 'noticeNotifications',
    },
    {
      enabled: true,
      key: 'boardLikeNotifications',
    },
    {
      enabled: true,
      key: 'commentNotifications',
    },
    {
      enabled: true,
      key: 'bookmarkedPostCommentNotifications',
    },
    {
      enabled: true,
      key: 'friendAndInvitationNotifications',
    },
    {
      enabled: true,
      key: 'systemNotifications',
    },
  ],
};
