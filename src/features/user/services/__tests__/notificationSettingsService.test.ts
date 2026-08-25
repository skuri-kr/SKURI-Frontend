import {
  buildToggleAllNotificationsPatch,
  buildToggleNotificationSettingPatch,
  mapMemberNotificationSettingsToScreenSource,
} from '../notificationSettingsService';

describe('notificationSettingsService', () => {
  it('친구·초대 알림 설정을 세부 알림 source로 제공한다', () => {
    const source = mapMemberNotificationSettingsToScreenSource({
      friendAndInvitationNotifications: false,
    });

    expect(source.items).toContainEqual({
      enabled: false,
      key: 'friendAndInvitationNotifications',
    });
  });

  it('전체 알림 토글에 친구·초대 알림을 함께 반영한다', () => {
    expect(buildToggleAllNotificationsPatch(false)).toMatchObject({
      allNotifications: false,
      friendAndInvitationNotifications: false,
    });
  });

  it('친구·초대 알림만 끄면 전체 알림 상태를 최신 세부 설정으로 계산한다', () => {
    expect(
      buildToggleNotificationSettingPatch({
        currentSettings: {
          allNotifications: true,
          friendAndInvitationNotifications: true,
          partyNotifications: false,
          noticeNotifications: false,
          boardLikeNotifications: false,
          commentNotifications: false,
          bookmarkedPostCommentNotifications: false,
          systemNotifications: false,
        },
        enabled: false,
        key: 'friendAndInvitationNotifications',
      }),
    ).toEqual({
      allNotifications: false,
      friendAndInvitationNotifications: false,
    });
  });
});
