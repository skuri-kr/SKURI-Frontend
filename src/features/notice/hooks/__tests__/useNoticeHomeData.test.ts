import {act, renderHook} from '@testing-library/react-native';

import {useNoticeHomeData} from '../useNoticeHomeData';
import {useNotices} from '../useNotices';
import {useNoticeSettings} from '../useNoticeSettings';

jest.mock('../useNotices', () => ({
  useNotices: jest.fn(),
}));

jest.mock('../useNoticeSettings', () => ({
  useNoticeSettings: jest.fn(),
}));

const mockedUseNotices = jest.mocked(useNotices);
const mockedUseNoticeSettings = jest.mocked(useNoticeSettings);

describe('useNoticeHomeData', () => {
  let noticesState: ReturnType<typeof useNotices>;

  beforeEach(() => {
    noticesState = {
      activeCategoryKey: '전체',
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      loading: false,
      loadingMore: false,
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
      notices: [],
      readStatus: {},
      readStatusLoading: false,
      refresh: jest.fn(),
      refreshReadStatus: jest.fn(),
      refreshSilently: jest.fn(),
      unreadCount: 0,
      userJoinedAt: null,
      userJoinedAtLoaded: true,
    };
    mockedUseNotices.mockImplementation(() => noticesState);
    mockedUseNoticeSettings.mockReturnValue({
      error: null,
      loading: false,
      saving: false,
      settings: {
        noticeNotifications: true,
        noticeNotificationsDetail: {},
      },
      updateDetail: jest.fn(),
      updateMaster: jest.fn(),
    });
  });

  it('선택 카테고리와 현재 목록의 카테고리가 일치할 때만 광고를 허용한다', () => {
    const {result, rerender} = renderHook(() => useNoticeHomeData());
    expect(result.current.adsEnabled).toBe(true);

    act(() => {
      result.current.selectCategory('학사');
    });
    expect(result.current.adsEnabled).toBe(false);

    noticesState = {...noticesState, activeCategoryKey: '학사'};
    rerender({});
    expect(result.current.adsEnabled).toBe(true);
  });

  it('카테고리 목록을 불러오는 동안 광고를 허용하지 않는다', () => {
    noticesState = {...noticesState, loading: true};

    const {result} = renderHook(() => useNoticeHomeData());

    expect(result.current.adsEnabled).toBe(false);
  });
});
