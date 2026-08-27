jest.mock('@/app/navigation/services/appRouteNavigation', () => ({
  navigateToBoardDetail: jest.fn(),
  navigateToCampusScreen: jest.fn(),
  navigateToNoticeDetail: jest.fn(),
}));

import {
  navigateToBoardDetail,
  navigateToCampusScreen,
  navigateToNoticeDetail,
} from '@/app/navigation/services/appRouteNavigation';

import {navigateToAppLinkIntent} from '../appLinkNavigation';

describe('navigateToAppLinkIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('학교 공지 상세 화면으로 이동한다', () => {
    navigateToAppLinkIntent({kind: 'notice', noticeId: 'notice-1'});
    expect(navigateToNoticeDetail).toHaveBeenCalledWith('notice-1');
  });

  it('이번 주 학식 화면으로 이동한다', () => {
    navigateToAppLinkIntent({kind: 'cafeteria'});
    expect(navigateToCampusScreen).toHaveBeenCalledWith('CafeteriaDetail');
  });

  it('커뮤니티 게시글 상세 화면으로 이동한다', () => {
    navigateToAppLinkIntent({kind: 'board', postId: 'post-1'});
    expect(navigateToBoardDetail).toHaveBeenCalledWith('post-1');
  });
});
