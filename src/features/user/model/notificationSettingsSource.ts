export type NotificationSettingKey =
  | 'partyNotifications'
  | 'noticeNotifications'
  | 'boardLikeNotifications'
  | 'commentNotifications'
  | 'bookmarkedPostCommentNotifications'
  | 'friendAndInvitationNotifications'
  | 'systemNotifications';

export interface NotificationSettingItemSource {
  enabled: boolean;
  key: NotificationSettingKey;
}

export interface NotificationSettingsScreenSource {
  allNotifications: boolean;
  items: NotificationSettingItemSource[];
}
