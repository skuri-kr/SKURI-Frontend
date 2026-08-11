import { Platform } from 'react-native';

import {
  getCurrentFcmToken,
  subscribeMessagingTokenRefresh,
} from '@/shared/lib/firebase/messaging';
import {getCurrentAppVersion} from '@/features/settings/services/appVersionService';

import type { MemberFcmTokenPlatform } from '../model/types';
import type { IMemberRepository } from '../data/repositories/IMemberRepository';

const TOKEN_LOAD_MAX_TRIES = 3;
const TOKEN_LOAD_DELAY_MS = 800;

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const resolveCurrentPlatform = (): MemberFcmTokenPlatform | null => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return null;
};

const loadCurrentFcmToken = async (
  maxTries = TOKEN_LOAD_MAX_TRIES,
  delayMs = TOKEN_LOAD_DELAY_MS,
): Promise<string | null> => {
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    try {
      const token = await getCurrentFcmToken();
      if (token) {
        return token;
      }
    } catch {
      // 실패 시 재시도
    }

    await delay(delayMs);
  }

  return null;
};

const registerResolvedFcmToken = async ({
  memberRepository,
  token,
}: {
  memberRepository: IMemberRepository;
  token: string;
}) => {
  const platform = resolveCurrentPlatform();
  if (!platform) {
    console.warn('지원하지 않는 플랫폼에서는 FCM 토큰을 등록하지 않습니다.');
    return;
  }

  await memberRepository.registerFcmToken(
    token,
    platform,
    getCurrentAppVersion(),
  );
};

export const saveMemberFcmToken = async ({
  memberRepository,
}: {
  memberRepository: IMemberRepository;
}): Promise<void> => {
  try {
    const token = await loadCurrentFcmToken();
    if (!token) {
      return;
    }

    await registerResolvedFcmToken({
      memberRepository,
      token,
    });
  } catch (error) {
    console.warn('ensureFcmTokenSaved failed:', error);
  }
};

export const subscribeMemberFcmTokenRefresh = ({
  memberRepository,
}: {
  memberRepository: IMemberRepository;
}) =>
  subscribeMessagingTokenRefresh(async token => {
    try {
      await registerResolvedFcmToken({
        memberRepository,
        token,
      });
    } catch (error) {
      console.warn('onTokenRefresh update failed:', error);
    }
  });

export const removeMemberFcmToken = async ({
  memberRepository,
}: {
  memberRepository: IMemberRepository;
}): Promise<void> => {
  try {
    const token = await loadCurrentFcmToken(1, 0);
    if (!token) {
      return;
    }

    await memberRepository.deleteFcmToken(token);
    console.log('✅ FCM 토큰 삭제 완료');
  } catch (error) {
    console.warn('FCM 토큰 삭제 실패:', error);
  }
};
