import {ONBOARDING_STEP_VIEW_DATA} from '../onboardingViewData';

describe('ONBOARDING_STEP_VIEW_DATA', () => {
  it('시스템 권한 요청 전 버튼을 모두 중립적인 문구로 표시한다', () => {
    expect(ONBOARDING_STEP_VIEW_DATA.notification.actionLabel).toBe('계속');
    expect(ONBOARDING_STEP_VIEW_DATA.att.actionLabel).toBe('계속');
    expect(ONBOARDING_STEP_VIEW_DATA.location.actionLabel).toBe('계속');
  });

  it('알림 권한 안내 문구를 현재 정책대로 제공한다', () => {
    const notification = ONBOARDING_STEP_VIEW_DATA.notification;

    expect(notification.kicker).toBe('이 앱이 잘 작동하려면...');
    expect(notification.title).toBe('알림 허용이\n필요해요');
    expect(notification.footerLines).toEqual([
      '알림을 허용하고 스쿠리의 모든 기능을 활용해보세요',
      '세부 알림 설정은 앱 내에서 제어할 수 있어요',
    ]);
  });

  it('추적과 위치 권한 안내 문구를 현재 정책대로 제공한다', () => {
    expect(ONBOARDING_STEP_VIEW_DATA.att.title).toBe('앱 추적 권한\n설정이 필요해요');
    expect(ONBOARDING_STEP_VIEW_DATA.att.footerLines).toEqual([
      '허용하지 않아도 앱의 모든 기능을 사용할 수 있어요',
      '설정에서 언제든지 변경할 수 있습니다',
    ]);
    expect(ONBOARDING_STEP_VIEW_DATA.location.title).toBe(
      '택시 동승을 위해\n현재 위치를 확인해요',
    );
    expect(ONBOARDING_STEP_VIEW_DATA.location.footerLines).toEqual([
      '내 위치 정보는 단말기 내에서만 활용되며 서버에 저장되지 않아요',
    ]);
  });

  it('Android에도 표시되는 알림과 위치 안내에는 iOS 문구가 없다', () => {
    const androidVisibleCopy = [
      ONBOARDING_STEP_VIEW_DATA.notification.kicker,
      ONBOARDING_STEP_VIEW_DATA.notification.title,
      ...(ONBOARDING_STEP_VIEW_DATA.notification.footerLines ?? []),
      ONBOARDING_STEP_VIEW_DATA.location.kicker,
      ONBOARDING_STEP_VIEW_DATA.location.title,
      ...(ONBOARDING_STEP_VIEW_DATA.location.footerLines ?? []),
    ].join(' ');

    expect(androidVisibleCopy).not.toContain('iOS');
  });
});
