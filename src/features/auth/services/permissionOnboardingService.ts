import {saveMemberFcmToken, type IMemberRepository} from '@/features/member';
import {saveAuthLocalAdjunct} from './authLocalAdjunctService';

const COMPLETION_DELAY_MS = 1000;

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

export const completePermissionOnboarding = async ({
  completeOnboarding,
  markPermissionOnboardingComplete,
  refreshCurrentUser,
  userId,
  memberRepository,
}: {
  completeOnboarding: () => void;
  markPermissionOnboardingComplete: () => void;
  refreshCurrentUser: () => Promise<void>;
  userId?: string;
  memberRepository: IMemberRepository;
}) => {
  try {
    if (userId) {
      try {
        await saveMemberFcmToken({
          memberRepository,
        });
      } catch (error) {
        console.warn('권한 온보딩 중 FCM 토큰 저장 실패:', error);
      }

      await saveAuthLocalAdjunct(userId, {
        permissionsComplete: true,
      });
      await refreshCurrentUser();
    }

    await delay(COMPLETION_DELAY_MS);
  } catch (error) {
    console.warn('권한 온보딩 완료 처리 실패:', error);
    await delay(COMPLETION_DELAY_MS);
  } finally {
    markPermissionOnboardingComplete();
    completeOnboarding();
  }
};
