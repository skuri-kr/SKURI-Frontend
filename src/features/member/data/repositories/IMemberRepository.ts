import type {
  MemberFcmTokenPlatform,
  MemberProfile,
  UpdateMemberBankAccountInput,
  UpdateMemberNotificationSettingsInput,
  UpdateMemberProfileInput,
} from '../../model/types';

export interface IMemberRepository {
  ensureMember(): Promise<MemberProfile>;

  getMyMemberProfile(): Promise<MemberProfile>;

  updateMyProfile(profile: UpdateMemberProfileInput): Promise<MemberProfile>;

  deleteMyProfilePhoto(): Promise<void>;

  updateMyBankAccount(
    account: UpdateMemberBankAccountInput,
  ): Promise<MemberProfile>;

  updateMyNotificationSettings(
    settings: UpdateMemberNotificationSettingsInput,
  ): Promise<MemberProfile>;

  registerFcmToken(
    token: string,
    platform: MemberFcmTokenPlatform,
    appVersion?: string,
  ): Promise<void>;

  deleteFcmToken(token: string): Promise<void>;
}
