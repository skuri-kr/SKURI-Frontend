import React from 'react';
import {ScrollView} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {useAppNoticeDetailData} from '../../hooks/useAppNoticeDetailData';
import {AppNoticeDetailScreen} from '../AppNoticeDetailScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn()}),
  useRoute: () => ({
    params: {initialCommentId: 'app-comment-1', noticeId: 'app-notice-1'},
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View};
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/di', () => ({useReportRepository: () => ({})}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('@/shared/ui/ReportReasonModal', () => ({ReportReasonModal: () => null}));
jest.mock('../../components/AppNoticeBadge', () => ({AppNoticeBadge: () => null}));
jest.mock('../../components/AppNoticeHeroCarousel', () => ({AppNoticeHeroCarousel: () => null}));
jest.mock('../../hooks/useAppNoticeDetailData', () => ({
  useAppNoticeDetailData: jest.fn(),
}));
jest.mock('@/shared/design-system/components', () => {
  const ReactModule = require('react') as typeof React;
  return {
    ArticleDetailSkeleton: () => null,
    DetailCommentCard: () => null,
    DetailComposer: ReactModule.forwardRef(() => null),
    DetailReactionChip: () => null,
    LinkifiedText: () => null,
    StackHeader: () => null,
    StateCard: () => null,
  };
});

const mockedUseAppNoticeDetailData = jest.mocked(useAppNoticeDetailData);

describe('AppNoticeDetailScreen', () => {
  let scrollToSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn());
    mockedUseAppNoticeDetailData.mockReturnValue({
      cancelCommentEdit: jest.fn(),
      cancelCommentReply: jest.fn(),
      commentAnonymousDisabled: false,
      commentAnonymousValue: false,
      commentDraft: '',
      commentError: null,
      commentItems: [{
        authorLabel: '작성자',
        body: '댓글',
        dateLabel: '방금 전',
        id: 'app-comment-1',
        isDeleted: false,
        isEditable: false,
        isLiked: false,
        isMine: false,
        isReply: false,
        likeCount: 0,
      }],
      commentLikePendingIds: [],
      data: {
        actionLabel: undefined,
        actionUrl: undefined,
        authorLabel: 'SKURI 운영팀',
        badges: [],
        bodyParagraphs: ['본문'],
        categoryLabel: '점검',
        commentCount: 1,
        galleryImages: [],
        id: 'app-notice-1',
        isLiked: false,
        likeCount: 0,
        publishedLabel: '방금 전',
        title: '앱 공지',
        viewCountLabel: '1',
      },
      deleteComment: jest.fn(),
      editingCommentId: null,
      error: null,
      isEditingComment: false,
      isReplyingComment: false,
      loading: false,
      notice: {
        category: 'service',
        commentCount: 1,
        content: '본문',
        id: 'app-notice-1',
        isLiked: false,
        likeCount: 0,
        priority: 'normal',
        publishedAt: new Date(),
        title: '앱 공지',
        viewCount: 1,
      },
      reload: jest.fn(),
      replyTargetLabel: null,
      retryComments: jest.fn(),
      setCommentDraft: jest.fn(),
      startEditingComment: jest.fn(),
      startReplyingComment: jest.fn(),
      submitComment: jest.fn(),
      submittingComment: false,
      toggleCommentAnonymousPreference: jest.fn(),
      toggleCommentLike: jest.fn(),
      toggleLike: jest.fn(),
      togglingLike: false,
    } as ReturnType<typeof useAppNoticeDetailData>);
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    jest.useRealTimers();
  });

  it('초기 타이머보다 댓글 레이아웃이 늦어도 대상 댓글로 다시 스크롤한다', () => {
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent(screen.getByTestId('app-notice-body-card'), 'layout', {
      nativeEvent: {layout: {y: 100}},
    });
    fireEvent(screen.getByTestId('app-notice-comments-list'), 'layout', {
      nativeEvent: {layout: {y: 200}},
    });
    act(() => jest.advanceTimersByTime(160));
    expect(scrollToSpy).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('app-notice-comment-app-comment-1'), 'layout', {
      nativeEvent: {layout: {y: 50}},
    });

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({animated: true}));
  });
});
