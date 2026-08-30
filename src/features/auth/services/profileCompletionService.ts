import {type IMemberRepository} from '@/features/member';
import {
  containsReservedNicknameKeyword,
  RESERVED_NICKNAME_MESSAGE,
} from '@/features/member/services/memberNicknamePolicy';
import {CURRENT_TERMS_VERSION} from '@/features/settings/constants/legalDocumentVersions';
import {setUserProperties} from '@/shared/lib/analytics';
import type {User} from '@/shared/types/user';

import {CompleteProfileFormValues} from '../model/types';

export const validateCompleteProfileForm = (
  values: CompleteProfileFormValues,
) => {
  if (!values.ageConfirmed || !values.termsAccepted) {
    return '계정 사용 전에 19세 이상 확인과 이용약관(EULA 포함) 동의가 필요합니다.';
  }

  if (
    !values.displayName.trim() ||
    !values.studentId.trim() ||
    !values.department.trim()
  ) {
    return '닉네임과 학번, 학과를 모두 입력해주세요.';
  }

  if (values.displayName.trim().length > 7) {
    return '닉네임은 7자 이하로 입력해주세요.';
  }

  if (containsReservedNicknameKeyword(values.displayName)) {
    return RESERVED_NICKNAME_MESSAGE;
  }

  return null;
};

export const saveCompleteProfile = async ({
  user,
  memberRepository,
  values,
}: {
  user: User | null;
  memberRepository: IMemberRepository;
  values: CompleteProfileFormValues;
}) => {
  if (!user?.uid) {
    throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
  }

  const displayName = values.displayName.trim();
  const studentId = values.studentId.trim();
  const department = values.department.trim();

  const memberProfile = await memberRepository.updateMyProfile({
    nickname: displayName,
    studentId,
    department,
    termsAccepted: true,
    termsVersion: CURRENT_TERMS_VERSION,
  });

  await setUserProperties({
    display_name: displayName,
    department,
  });

  return memberProfile;
};
