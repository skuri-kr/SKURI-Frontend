import {getCurrentAppVersion} from '@/features/settings';
import {
  removeMemberFcmToken,
  type MemberProfile,
  type IMemberRepository,
} from '@/features/member';
import {DEFAULT_USER_DISPLAY_NAME} from '@/features/user/services/userProfileService';
import {setUserId} from '@/shared/lib/analytics';
import type {User} from '@/shared/types/user';

import {
  AuthUser,
  GoogleSignInResult,
  IAuthRepository,
} from '../data/repositories/IAuthRepository';
import type {AuthLocalAdjunct} from './authLocalAdjunctService';

const DEFAULT_AUTH_LOCAL_ADJUNCT: AuthLocalAdjunct = {
  permissionsComplete: false,
};

export const setAnalyticsAuthUser = async (authUser: AuthUser | null) => {
  await setUserId(authUser?.uid ?? null);
};

export const buildFallbackUser = (
  authUser: AuthUser,
  localAdjunct: AuthLocalAdjunct = DEFAULT_AUTH_LOCAL_ADJUNCT,
): User => ({
  uid: authUser.uid,
  email: authUser.email,
  displayName: DEFAULT_USER_DISPLAY_NAME,
  studentId: null,
  department: null,
  photoURL: null,
  linkedAccounts: [],
  onboarding: {
    permissionsComplete: localAdjunct.permissionsComplete,
  },
  realname: null,
});

export const buildAuthenticatedUser = ({
  authUser,
  localAdjunct,
  memberProfile,
}: {
  authUser: AuthUser;
  localAdjunct: AuthLocalAdjunct;
  memberProfile: MemberProfile;
}): User => ({
  uid: authUser.uid,
  email: authUser.email ?? memberProfile.email,
  displayName: memberProfile.nickname || DEFAULT_USER_DISPLAY_NAME,
  studentId: memberProfile.studentId ?? null,
  department: memberProfile.department ?? null,
  photoURL: memberProfile.photoUrl ?? null,
  linkedAccounts: [],
  account: memberProfile.bankAccount,
  accountInfo: memberProfile.bankAccount,
  realname: memberProfile.realname,
  onboarding: {
    permissionsComplete: localAdjunct.permissionsComplete,
  },
  joinedAt: memberProfile.joinedAt,
  currentVersion: getCurrentAppVersion(),
  lastLogin: memberProfile.lastLogin,
  isAdmin: memberProfile.isAdmin,
  termsAccepted: memberProfile.termsAccepted,
  termsVersion: memberProfile.termsVersion,
});

export const bootstrapAuthenticatedMember = async ({
  authRepository,
  memberRepository,
}: {
  authRepository: IAuthRepository;
  memberRepository: IMemberRepository;
}) => {
  await authRepository.refreshToken();
  await memberRepository.ensureMember();
  return memberRepository.getMyMemberProfile();
};

const assertAllowedDomain = async (
  authRepository: IAuthRepository,
  authUser: AuthUser,
) => {
  if (authUser.email && !authUser.email.endsWith('@sungkyul.ac.kr')) {
    await authRepository.signOut();
    throw {
      code: 'auth/domain-restricted',
      message: '성결대학교 이메일(@sungkyul.ac.kr)만 사용 가능합니다.',
    };
  }
};

export const finalizeGoogleSignIn = async ({
  authRepository,
  result,
}: {
  authRepository: IAuthRepository;
  result: GoogleSignInResult;
}) => {
  await assertAllowedDomain(authRepository, result.user);

  return result.isNewUser;
};

export const removeAuthSessionFcmToken = async (
  authRepository: IAuthRepository,
  memberRepository: IMemberRepository,
) => {
  const currentUser = authRepository.getCurrentUser();
  if (!currentUser) {
    return;
  }

  await removeMemberFcmToken({
    memberRepository,
  });
};

export const mapAuthActionError = (error: any) => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/cancelled' || message.includes('취소')) {
    return {
      code: 'auth/cancelled',
      message: '로그인을 취소했어요.',
    };
  }

  if (message.includes('@sungkyul.ac.kr')) {
    return error;
  }

  if (code.includes('network')) {
    return {
      code: 'auth/network',
      message: '네트워크 연결을 확인한 후 다시 시도해주세요.',
    };
  }

  return {
    code: code || 'auth/unknown',
    message: message || '잠시 후 다시 시도해주세요.',
  };
};

export const mapEmailPasswordSignInError = (error: any) => {
  const firebaseCode = error?.context?.firebaseCode || error?.code;
  const fallbackMessage =
    typeof error?.message === 'string' && error.message.trim()
      ? error.message
      : '로그인에 실패했습니다.';

  const errorMap: Record<string, string> = {
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
    'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  };

  return new Error(errorMap[firebaseCode] || fallbackMessage);
};
