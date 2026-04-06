import {MemberApiClient, memberApiClient} from '../api/memberApiClient';
import {mapMemberResponseDto} from '../mappers/memberMapper';
import type {
  UpdateMemberBankAccountInput,
  UpdateMemberNotificationSettingsInput,
  UpdateMemberProfileInput,
} from '../../model/types';
import {IMemberRepository} from './IMemberRepository';

export class SpringMemberRepository implements IMemberRepository {
  constructor(private readonly apiClient: MemberApiClient = memberApiClient) {}

  async ensureMember() {
    const response = await this.apiClient.createMember();
    return mapMemberResponseDto(response.data);
  }

  async getMyMemberProfile() {
    const response = await this.apiClient.getMyMemberProfile();
    return mapMemberResponseDto(response.data);
  }

  async updateMyProfile(profile: UpdateMemberProfileInput) {
    const response = await this.apiClient.updateMyProfile(profile);
    return mapMemberResponseDto(response.data);
  }

  async deleteMyProfilePhoto() {
    await this.apiClient.deleteMyProfilePhoto();
  }

  async updateMyBankAccount(account: UpdateMemberBankAccountInput) {
    const response = await this.apiClient.updateMyBankAccount(account);
    return mapMemberResponseDto(response.data);
  }

  async updateMyNotificationSettings(
    settings: UpdateMemberNotificationSettingsInput,
  ) {
    const response = await this.apiClient.updateMyNotificationSettings(
      settings,
    );
    return mapMemberResponseDto(response.data);
  }

  async registerFcmToken(
    token: string,
    platform: 'ios' | 'android',
    appVersion?: string,
  ) {
    await this.apiClient.registerFcmToken({
      appVersion,
      token,
      platform,
    });
  }

  async deleteFcmToken(token: string) {
    await this.apiClient.deleteFcmToken({
      token,
    });
  }
}
