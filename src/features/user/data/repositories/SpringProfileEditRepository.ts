import {uploadImage} from '@/shared/api/imageUploadClient';
import {getDepartments} from '@/shared/api';
import type {MemberProfile} from '@/features/member/model/types';
import {SpringMemberRepository} from '@/features/member/data/repositories/SpringMemberRepository';
import type {IMemberRepository} from '@/features/member/data/repositories/IMemberRepository';

import type {
  ProfileEditDraft,
  ProfilePhotoUploadInput,
  ProfileEditSource,
} from '../../model/profileEditSource';
import type {IProfileEditRepository} from './IProfileEditRepository';

const DEFAULT_AVATAR_LABEL = '?';

const toProfileEditSource = (
  memberProfile: MemberProfile,
): ProfileEditSource => ({
  avatarLabel:
    memberProfile.nickname.trim().slice(0, 1) || DEFAULT_AVATAR_LABEL,
  department: memberProfile.department ?? '',
  departmentOptions: [],
  displayName: memberProfile.nickname,
  gradeLabel: '',
  photoUrl: memberProfile.photoUrl ?? null,
  studentId: memberProfile.studentId ?? '',
});

export class SpringProfileEditRepository implements IProfileEditRepository {
  constructor(
    private readonly memberRepository: IMemberRepository = new SpringMemberRepository(),
  ) {}

  async getProfileEdit(): Promise<ProfileEditSource> {
    const memberProfile = await this.memberRepository.getMyMemberProfile();
    return toProfileEditSource(memberProfile);
  }

  listDepartments(): Promise<string[]> {
    return getDepartments();
  }

  async saveProfileEdit(draft: ProfileEditDraft): Promise<ProfileEditSource> {
    const memberProfile = await this.memberRepository.updateMyProfile({
      department: draft.department.trim(),
      nickname: draft.displayName.trim(),
      studentId: draft.studentId.trim(),
    });

    return toProfileEditSource(memberProfile);
  }

  async uploadProfilePhoto(
    image: ProfilePhotoUploadInput,
  ): Promise<ProfileEditSource> {
    const uploadedImage = await uploadImage({
      context: 'PROFILE_IMAGE',
      fileName: image.fileName,
      mimeType: image.mimeType,
      uri: image.uri,
    });

    if (!uploadedImage.url.trim()) {
      throw new Error('프로필 사진 업로드에 실패했습니다.');
    }

    const memberProfile = await this.memberRepository.updateMyProfile({
      photoUrl: uploadedImage.url,
    });

    return toProfileEditSource(memberProfile);
  }

  async removeProfilePhoto(): Promise<ProfileEditSource> {
    await this.memberRepository.deleteMyProfilePhoto();
    const memberProfile = await this.memberRepository.getMyMemberProfile();

    return toProfileEditSource(memberProfile);
  }
}
