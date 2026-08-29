import React from 'react';
import {Keyboard, ScrollView} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {useAppNoticeDetailData} from '../../hooks/useAppNoticeDetailData';
import {AppNoticeDetailScreen} from '../AppNoticeDetailScreen';

let mockRouteParams = {initialCommentId: 'app-comment-1', noticeId: 'app-notice-1'};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn()}),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View};
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/di', () => ({useReportRepository: () => ({})}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('@/shared/ui/ReportReasonModal', () => {
  const {View} = require('react-native');
  return {
    ReportReasonModal: ({visible}: {visible: boolean}) =>
      visible ? <View testID="app-notice-report-modal" /> : null,
  };
});
jest.mock('../../components/AppNoticeBadge', () => ({AppNoticeBadge: () => null}));
jest.mock('../../components/AppNoticeHeroCarousel', () => ({AppNoticeHeroCarousel: () => null}));
jest.mock('../../hooks/useAppNoticeDetailData', () => ({
  useAppNoticeDetailData: jest.fn(),
}));
jest.mock('@/shared/design-system/components', () => {
  const ReactModule = require('react') as typeof React;
  return {
    ArticleDetailSkeleton: () => null,
    DetailCommentCard: ({
      comment,
      deleteDisabled,
      likeDisabled,
      onPressEdit,
      onPressReport,
      replyDisabled,
    }: {
      comment: {id: string};
      deleteDisabled?: boolean;
      likeDisabled?: boolean;
      onPressEdit?: () => void;
      onPressReport?: () => void;
      replyDisabled?: boolean;
    }) => ReactModule.createElement(require('react-native').TouchableOpacity, {
      accessibilityLabel: [
        deleteDisabled ? '삭제 비활성화' : '삭제 활성화',
        likeDisabled ? '좋아요 비활성화' : '좋아요 활성화',
        onPressEdit ? '수정 활성화' : '수정 비활성화',
        replyDisabled ? '답글 비활성화' : '답글 활성화',
      ].join(', '),
      disabled: !onPressReport,
      onPress: onPressReport,
      testID: `app-notice-comment-card-${comment.id}`,
    }),
    DetailComposer: ReactModule.forwardRef(({
      editable,
      onSend,
    }: {
      editable?: boolean;
      onSend: () => void;
    }, _ref) =>
      ReactModule.createElement(require('react-native').TouchableOpacity, {
        accessibilityLabel: editable === false ? '입력 잠금' : '입력 가능',
        onPress: onSend,
        testID: 'app-notice-comment-submit',
      }),
    ),
    DetailReactionChip: () => null,
    LinkifiedText: () => null,
    StackHeader: () => null,
    StateCard: () => null,
  };
});

const mockedUseAppNoticeDetailData = jest.mocked(useAppNoticeDetailData);

describe('AppNoticeDetailScreen', () => {
  let scrollToSpy: jest.SpyInstance;
  let mockDetailData: ReturnType<typeof useAppNoticeDetailData>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRouteParams = {initialCommentId: 'app-comment-1', noticeId: 'app-notice-1'};
    scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn());
    mockDetailData = {
      cancelCommentEdit: jest.fn(),
      cancelCommentReply: jest.fn(),
      commentAnonymousDisabled: false,
      commentAnonymousValue: false,
      commentDraft: '',
      commentError: null,
      commentDeletePendingIds: [],
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
      }, {
        authorLabel: '작성자',
        body: '새 댓글',
        dateLabel: '방금 전',
        id: 'app-comment-2',
        isDeleted: false,
        isEditable: false,
        isLiked: false,
        isMine: true,
        isReply: false,
        likeCount: 0,
      }],
      commentLikePendingIds: [],
      commentsLoading: false,
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
      isCommentComposerLocked: false,
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
      submitComment: jest.fn().mockResolvedValue({commentId: 'app-comment-2'}),
      submittingComment: false,
      toggleCommentAnonymousPreference: jest.fn(),
      toggleCommentLike: jest.fn(),
      toggleLike: jest.fn(),
      togglingLike: false,
    } as ReturnType<typeof useAppNoticeDetailData>;
    mockedUseAppNoticeDetailData.mockImplementation(() => mockDetailData);
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

  it('댓글 등록 후 대상 댓글 레이아웃이 늦어도 다시 스크롤한다', async () => {
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent(screen.getByTestId('app-notice-body-card'), 'layout', {
      nativeEvent: {layout: {y: 100}},
    });
    fireEvent(screen.getByTestId('app-notice-comments-list'), 'layout', {
      nativeEvent: {layout: {y: 200}},
    });
    act(() => jest.advanceTimersByTime(160));
    fireEvent(screen.getByTestId('app-notice-comment-app-comment-1'), 'layout', {
      nativeEvent: {layout: {y: 50}},
    });
    scrollToSpy.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('app-notice-comment-submit'));
      await Promise.resolve();
    });
    act(() => jest.advanceTimersByTime(120));

    expect(scrollToSpy).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('app-notice-comment-app-comment-2'), 'layout', {
      nativeEvent: {layout: {y: 80}},
    });

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({animated: true}));
  });

  it('공지 전환 시 이전 공지의 댓글 신고 창을 닫는다', () => {
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(screen.getByTestId('app-notice-comment-card-app-comment-1'));
    expect(screen.getByTestId('app-notice-report-modal')).toBeTruthy();

    mockRouteParams = {initialCommentId: 'app-comment-2', noticeId: 'app-notice-2'};
    screen.rerender(<AppNoticeDetailScreen />);

    expect(screen.queryByTestId('app-notice-report-modal')).toBeNull();
  });

  it('삭제 중인 댓글의 삭제 동작을 비활성화한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: mockDetailData.commentItems.map(comment =>
        ({...comment, isEditable: true}),
      ),
      commentDeletePendingIds: ['app-comment-1'],
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('삭제 비활성화');
    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('좋아요 비활성화');
    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('답글 비활성화');
    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('수정 비활성화');
    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-2').props.accessibilityLabel,
    ).toContain('수정 활성화');
  });

  it('좋아요 중인 댓글의 삭제 동작을 비활성화한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: mockDetailData.commentItems.map(comment =>
        ({...comment, isEditable: true}),
      ),
      commentLikePendingIds: ['app-comment-1'],
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('삭제 비활성화');
  });

  it('댓글 전송 중에는 입력과 댓글 모드 전환을 비활성화한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: mockDetailData.commentItems.map(comment =>
        comment.id === 'app-comment-2' ? {...comment, isEditable: true} : comment,
      ),
      submittingComment: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comment-submit').props.accessibilityLabel).toBe('입력 잠금');
    expect(screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel).toContain('답글 비활성화');
    expect(screen.getByTestId('app-notice-comment-card-app-comment-2').props.accessibilityLabel).toContain('수정 비활성화');
  });

  it('댓글 수정 전송 중에는 같은 댓글의 삭제 동작을 비활성화한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: mockDetailData.commentItems.map(comment =>
        comment.id === 'app-comment-1' ? {...comment, isEditable: true} : comment,
      ),
      editingCommentId: 'app-comment-1',
      isEditingComment: true,
      submittingComment: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('삭제 비활성화');
  });

  it('삭제 중인 수정 또는 답글 작성창의 입력을 잠근다', () => {
    mockDetailData = {
      ...mockDetailData,
      isCommentComposerLocked: true,
      isEditingComment: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comment-submit').props.accessibilityLabel).toBe('입력 잠금');
  });

  it('초기 댓글을 불러오는 동안 입력을 잠근다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentsLoading: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comment-submit').props.accessibilityLabel).toBe('입력 잠금');
  });

  it('공지 전환 뒤 이전 댓글 전송 완료는 키보드를 닫지 않는다', async () => {
    let resolveSubmission!: (value: {commentId?: string}) => void;
    const submission = new Promise<{commentId?: string}>(resolve => {
      resolveSubmission = resolve;
    });
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    mockDetailData = {
      ...mockDetailData,
      submitComment: jest.fn().mockReturnValue(submission),
    };
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(screen.getByTestId('app-notice-comment-submit'));
    mockRouteParams = {initialCommentId: 'app-comment-2', noticeId: 'app-notice-2'};
    screen.rerender(<AppNoticeDetailScreen />);
    await act(async () => {
      resolveSubmission({commentId: 'app-comment-2'});
      await Promise.resolve();
    });

    expect(dismissSpy).not.toHaveBeenCalled();
    dismissSpy.mockRestore();
  });
});
