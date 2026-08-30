import type {UserAccountInfo} from '@/shared/types/user';

export type MemberFcmTokenPlatform = 'ios' | 'android';

export interface UpdateMemberProfileInput {
  nickname?: string;
  studentId?: string | null;
  department?: string | null;
  photoUrl?: string | null;
  termsAccepted?: boolean;
  termsVersion?: string;
}

export interface UpdateMemberBankAccountInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  hideName: boolean;
}

export interface UpdateMemberNotificationSettingsInput {
  allNotifications?: boolean;
  partyNotifications?: boolean;
  noticeNotifications?: boolean;
  boardLikeNotifications?: boolean;
  commentNotifications?: boolean;
  bookmarkedPostCommentNotifications?: boolean;
  friendAndInvitationNotifications?: boolean;
  systemNotifications?: boolean;
  academicScheduleNotifications?: boolean;
  academicScheduleDayBeforeEnabled?: boolean;
  academicScheduleAllEventsEnabled?: boolean;
  noticeNotificationsDetail?: Record<string, boolean>;
}

export interface MemberNotificationSetting {
  allNotifications: boolean;
  partyNotifications: boolean;
  noticeNotifications: boolean;
  boardLikeNotifications: boolean;
  commentNotifications: boolean;
  bookmarkedPostCommentNotifications: boolean;
  friendAndInvitationNotifications: boolean;
  systemNotifications: boolean;
  academicScheduleNotifications: boolean;
  academicScheduleDayBeforeEnabled: boolean;
  academicScheduleAllEventsEnabled: boolean;
  noticeNotificationsDetail: Record<string, boolean>;
}

export interface MemberPublicProfile {
  id: string;
  nickname: string | null;
  department: string | null;
  photoUrl: string | null;
}

export interface MemberProfile {
  id: string;
  email: string;
  nickname: string;
  studentId: string | null;
  department: string | null;
  realname: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  bankAccount: UserAccountInfo | null;
  notificationSetting: MemberNotificationSetting | null;
  termsAccepted: boolean;
  termsVersion: string | null;
  joinedAt: string;
  lastLogin: string | null;
}
