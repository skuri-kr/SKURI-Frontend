import type {UserAccountInfo} from '@/shared/types/user';

import type {MemberProfile} from '../../model/types';
import type {
  MemberBankAccountDto,
  MemberNotificationSettingDto,
  MemberPublicProfileDto,
  MemberResponseDto,
} from '../dto/memberDto';

const mapBankAccountDto = (
  bankAccount?: MemberBankAccountDto | null,
): UserAccountInfo | null => {
  if (!bankAccount) {
    return null;
  }

  return {
    bankName: bankAccount.bankName,
    accountNumber: bankAccount.accountNumber,
    accountHolder: bankAccount.accountHolder,
    hideName: Boolean(bankAccount.hideName),
  };
};

const mapNotificationSettingDto = (
  notificationSetting?: MemberNotificationSettingDto | null,
) => {
  if (!notificationSetting) {
    return null;
  }

  return {
    allNotifications: Boolean(notificationSetting.allNotifications),
    partyNotifications: Boolean(notificationSetting.partyNotifications),
    noticeNotifications: Boolean(notificationSetting.noticeNotifications),
    boardLikeNotifications: Boolean(notificationSetting.boardLikeNotifications),
    commentNotifications: Boolean(notificationSetting.commentNotifications),
    bookmarkedPostCommentNotifications: Boolean(
      notificationSetting.bookmarkedPostCommentNotifications,
    ),
    friendAndInvitationNotifications: Boolean(
      notificationSetting.friendAndInvitationNotifications,
    ),
    systemNotifications: Boolean(notificationSetting.systemNotifications),
    academicScheduleNotifications: Boolean(
      notificationSetting.academicScheduleNotifications,
    ),
    academicScheduleDayBeforeEnabled: Boolean(
      notificationSetting.academicScheduleDayBeforeEnabled,
    ),
    academicScheduleAllEventsEnabled: Boolean(
      notificationSetting.academicScheduleAllEventsEnabled,
    ),
    noticeNotificationsDetail: {
      ...(notificationSetting.noticeNotificationsDetail ?? {}),
    },
  };
};

export const mapMemberResponseDto = (
  member: MemberResponseDto,
): MemberProfile => {
  return {
    id: member.id,
    email: member.email,
    nickname: member.nickname,
    studentId: member.studentId,
    department: member.department,
    realname: member.realname,
    photoUrl: member.photoUrl,
    isAdmin: Boolean(member.isAdmin),
    bankAccount: mapBankAccountDto(member.bankAccount),
    notificationSetting: mapNotificationSettingDto(member.notificationSetting),
    termsAccepted: Boolean(member.termsAccepted),
    termsVersion: member.termsVersion ?? null,
    joinedAt: member.joinedAt,
    lastLogin: member.lastLogin ?? null,
  };
};

export const mapMemberPublicProfileDto = (member: MemberPublicProfileDto) => ({
  department: member.department,
  id: member.id,
  nickname: member.nickname,
  photoUrl: member.photoUrl,
});
