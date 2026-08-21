import {HIDDEN_BOTTOM_TAB_SCREENS} from '../mainTabs';

describe('HIDDEN_BOTTOM_TAB_SCREENS', () => {
  it('캠퍼스 탭의 친구 하위 화면에서는 하단 탭 바를 숨긴다', () => {
    expect(HIDDEN_BOTTOM_TAB_SCREENS.CampusTab).toEqual(
      expect.arrayContaining([
        'FriendHub',
        'FriendAdd',
        'FriendDetail',
        'FriendSettings',
      ]),
    );
  });
});
