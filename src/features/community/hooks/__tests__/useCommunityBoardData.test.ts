import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useBoardRepository} from '@/features/board';

import {loadCommunityBoardPage} from '../../application/communityBoardQuery';
import type {CommunityBoardPageResult} from '../../model/communityHomeData';
import {useCommunityBoardData} from '../useCommunityBoardData';

jest.mock('@/features/board', () => ({
  useBoardRepository: jest.fn(),
}));

jest.mock('../../application/communityBoardQuery', () => ({
  loadCommunityBoardPage: jest.fn(),
}));

const mockedLoadCommunityBoardPage = jest.mocked(loadCommunityBoardPage);
const mockedUseBoardRepository = jest.mocked(useBoardRepository);

const page = (id: string): CommunityBoardPageResult => ({
  items: [
    {
      authorName: '작성자',
      bookmarkCount: 0,
      category: 'general',
      commentCount: 0,
      content: '본문',
      createdAt: '2026-08-30T10:00:00',
      hashtags: [],
      id,
      isAnonymous: false,
      isBookmarked: false,
      isCommentedByMe: false,
      isLiked: false,
      likeCount: 0,
      title: '제목',
      viewCount: 0,
    },
  ],
});

describe('useCommunityBoardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseBoardRepository.mockReturnValue(
      {} as ReturnType<typeof useBoardRepository>,
    );
  });

  it('검색을 해제한 즉시 이전 검색 결과를 비우고 새 목록이 준비될 때까지 광고를 차단한다', async () => {
    let resolveClearedSearch: (value: CommunityBoardPageResult) => void = () =>
      undefined;
    mockedLoadCommunityBoardPage
      .mockResolvedValueOnce(page('default-post'))
      .mockResolvedValueOnce(page('search-post'))
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveClearedSearch = resolve;
        }),
      );

    const {result} = renderHook(() => useCommunityBoardData());

    await waitFor(() => expect(result.current.adsEnabled).toBe(true));

    act(() => {
      result.current.handleApplyRouteSearch('#태그');
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.adsEnabled).toBe(false);
    expect(result.current.items[0]?.id).toBe('search-post');

    act(() => {
      result.current.handleClearSearch();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.adsEnabled).toBe(false);

    await act(async () => {
      resolveClearedSearch(page('restored-post'));
    });

    expect(result.current.adsEnabled).toBe(true);
    expect(result.current.items[0]?.id).toBe('restored-post');
  });

  it('당겨서 새로고침하는 동안 기존 목록의 광고를 차단한다', async () => {
    let resolveRefresh: (value: CommunityBoardPageResult) => void = () =>
      undefined;
    mockedLoadCommunityBoardPage
      .mockResolvedValueOnce(page('initial-post'))
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveRefresh = resolve;
        }),
      );

    const {result} = renderHook(() => useCommunityBoardData());
    await waitFor(() => expect(result.current.adsEnabled).toBe(true));

    let refreshRequest!: ReturnType<typeof result.current.handleRefresh>;
    act(() => {
      refreshRequest = result.current.handleRefresh();
    });

    expect(result.current.refreshing).toBe(true);
    expect(result.current.items[0]?.id).toBe('initial-post');
    expect(result.current.adsEnabled).toBe(false);

    await act(async () => {
      resolveRefresh(page('refreshed-post'));
      await refreshRequest;
    });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.adsEnabled).toBe(true);
    expect(result.current.items[0]?.id).toBe('refreshed-post');
  });
});
