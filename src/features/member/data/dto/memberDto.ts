export interface MemberBankAccountDto {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  hideName: boolean;
}

export interface MemberNotificationSettingDto {
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
  noticeNotificationsDetail?: Record<string, boolean>;
}

export interface MemberPublicProfileDto {
  id: string;
  nickname: string | null;
  department: string | null;
  photoUrl: string | null;
}

export interface MemberResponseDto {
  id: string;
  email: string;
  nickname: string;
  studentId: string | null;
  department: string | null;
  realname: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  bankAccount?: MemberBankAccountDto | null;
  notificationSetting?: MemberNotificationSettingDto | null;
  joinedAt: string;
  lastLogin?: string | null;
}

export interface MemberWithdrawResponseDto {
  message: string;
}
