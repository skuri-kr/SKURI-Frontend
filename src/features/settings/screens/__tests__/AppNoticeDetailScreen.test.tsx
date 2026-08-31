import React from 'react';
import {Alert, Keyboard, ScrollView} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {
  invalidateData,
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {useAppNoticeDetailData} from '../../hooks/useAppNoticeDetailData';
import {submitAppNoticeCommentReport} from '../../services/appNoticeReportService';
import {AppNoticeDetailScreen} from '../AppNoticeDetailScreen';

let mockRouteParams = {initialCommentId: 'app-comment-1', noticeId: 'app-notice-1'};
const mockBlockContent = jest.fn();

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

jest.mock('@/di', () => ({
  useContentBlockRepository: () => ({
    blockContent: mockBlockContent,
  }),
  useReportRepository: () => ({}),
}));
jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
  useRefetchOnFocus: jest.fn(),
}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('@/shared/ui/ReportReasonModal', () => {
  const {TouchableOpacity, View} = require('react-native');
  return {
    ReportReasonModal: ({
      onChangeReason,
      onSelectCategory,
      onSubmit,
      visible,
    }: {
      onChangeReason: (reason: string) => void;
      onSelectCategory: (category: '기타') => void;
      onSubmit: () => void;
      visible: boolean;
    }) =>
      visible ? (
        <View testID="app-notice-report-modal">
          <TouchableOpacity
            onPress={() => {
              onSelectCategory('기타');
              onChangeReason('신고 사유');
            }}
            testID="app-notice-report-form"
          />
          <TouchableOpacity onPress={onSubmit} testID="app-notice-report-submit" />
        </View>
      ) : null,
  };
});
jest.mock('../../components/AppNoticeBadge', () => ({AppNoticeBadge: () => null}));
jest.mock('../../components/AppNoticeHeroCarousel', () => ({AppNoticeHeroCarousel: () => null}));
jest.mock('../../hooks/useAppNoticeDetailData', () => ({
  useAppNoticeDetailData: jest.fn(),
}));
jest.mock('../../services/appNoticeReportService', () => ({
  APP_NOTICE_REPORT_CATEGORIES: ['기타'],
  submitAppNoticeCommentReport: jest.fn(),
}));
jest.mock('@/shared/design-system/components', () => {
  const ReactModule = require('react') as typeof React;
  return {
    ArticleDetailSkeleton: () => null,
    DetailCommentCard: ({
      comment,
      deleteDisabled,
      likeDisabled,
      onPressBlock,
      onPressEdit,
      onPressReport,
      replyDisabled,
    }: {
      comment: {id: string};
      deleteDisabled?: boolean;
      likeDisabled?: boolean;
      onPressEdit?: () => void;
      onPressBlock?: () => void;
      onPressReport?: () => void;
      replyDisabled?: boolean;
    }) => ReactModule.createElement(
      require('react-native').View,
      undefined,
      ReactModule.createElement(require('react-native').TouchableOpacity, {
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
      onPressBlock
        ? ReactModule.createElement(require('react-native').TouchableOpacity, {
            onPress: onPressBlock,
            testID: `app-notice-comment-block-${comment.id}`,
          })
        : null,
    ),
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
    DetailReactionChip: ({onPress}: {onPress: () => void}) => ReactModule.createElement(
      require('react-native').TouchableOpacity,
      {onPress, testID: 'app-notice-like'},
    ),
    LinkifiedText: () => null,
    StackHeader: () => null,
    StateCard: () => null,
  };
});

const mockedUseAppNoticeDetailData = jest.mocked(useAppNoticeDetailData);
const mockedSubmitAppNoticeCommentReport = jest.mocked(submitAppNoticeCommentReport);
const mockedUseRefetchOnFocus = jest.mocked(useRefetchOnFocus);

describe('AppNoticeDetailScreen', () => {
  let scrollToSpy: jest.SpyInstance;
  let mockDetailData: ReturnType<typeof useAppNoticeDetailData>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockBlockContent.mockResolvedValue({
      blockedAt: new Date('2026-08-31T00:00:00Z'),
      id: 'block-1',
      label: '차단한 사용자',
    });
    mockedSubmitAppNoticeCommentReport.mockResolvedValue({
      createdAt: '2026-08-29T00:00:00',
      id: 'report-1',
      status: 'PENDING',
    });
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
      isCommentComposerUnavailable: false,
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
      replyTargetCommentId: null,
      retryComments: jest.fn().mockResolvedValue(undefined),
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

  it('같은 공지의 새 댓글 알림은 댓글 재조회 뒤 대상 댓글로 이동한다', () => {
    const screen = render(<AppNoticeDetailScreen />);
    fireEvent(screen.getByTestId('app-notice-body-card'), 'layout', {
      nativeEvent: {layout: {y: 100}},
    });
    fireEvent(screen.getByTestId('app-notice-comments-list'), 'layout', {
      nativeEvent: {layout: {y: 200}},
    });
    scrollToSpy.mockClear();

    mockRouteParams = {initialCommentId: 'app-comment-3', noticeId: 'app-notice-1'};
    screen.rerender(<AppNoticeDetailScreen />);
    expect(mockDetailData.retryComments).toHaveBeenCalledTimes(1);

    mockDetailData = {
      ...mockDetailData,
      commentItems: [...mockDetailData.commentItems, {
        authorLabel: '작성자',
        body: '알림 댓글',
        dateLabel: '방금 전',
        id: 'app-comment-3',
        isDeleted: false,
        isEditable: false,
        isLiked: false,
        isMine: false,
        isReply: false,
        likeCount: 0,
      }],
    };
    screen.rerender(<AppNoticeDetailScreen />);
    act(() => jest.advanceTimersByTime(160));
    fireEvent(screen.getByTestId('app-notice-comment-app-comment-3'), 'layout', {
      nativeEvent: {layout: {y: 80}},
    });

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

  it('다른 사용자의 앱 공지 댓글 작성자를 차단하고 상세를 다시 불러온다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text === '차단');
      action?.onPress?.();
    });
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(
      screen.getByTestId('app-notice-comment-block-app-comment-1'),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockBlockContent).toHaveBeenCalledWith({
      targetId: 'app-comment-1',
      targetType: 'APP_NOTICE_COMMENT',
    });
    expect(invalidateData).toHaveBeenCalledWith(['community.board.list']);
    expect(mockDetailData.reload).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('app-notice-comment-block-app-comment-2'),
    ).toBeNull();
    alertSpy.mockRestore();
  });

  it('콘텐츠 차단 관계가 바뀐 뒤 화면에 복귀하면 상세를 다시 불러온다', () => {
    render(<AppNoticeDetailScreen />);

    expect(mockedUseRefetchOnFocus).toHaveBeenCalledWith({
      invalidationKey: 'content.blocks',
      refetch: mockDetailData.reload,
    });
  });

  it('화면 이탈 뒤 이전 신고 완료는 알림을 표시하지 않는다', async () => {
    let resolveReport!: () => void;
    mockedSubmitAppNoticeCommentReport.mockReturnValueOnce(new Promise(resolve => {
      resolveReport = () => resolve({
        createdAt: '2026-08-29T00:00:00',
        id: 'report-1',
        status: 'PENDING',
      });
    }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(screen.getByTestId('app-notice-comment-card-app-comment-1'));
    fireEvent.press(screen.getByTestId('app-notice-report-form'));
    fireEvent.press(screen.getByTestId('app-notice-report-submit'));
    expect(mockedSubmitAppNoticeCommentReport).toHaveBeenCalledTimes(1);

    screen.unmount();
    await act(async () => {
      resolveReport();
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('화면 이탈 뒤 이전 좋아요 실패는 오류 알림을 표시하지 않는다', async () => {
    let rejectLike!: (reason?: unknown) => void;
    mockDetailData = {
      ...mockDetailData,
      toggleLike: jest.fn().mockReturnValue(new Promise((_, reject) => {
        rejectLike = reject;
      })),
    };
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(screen.getByTestId('app-notice-like'));
    screen.unmount();
    await act(async () => {
      rejectLike(new Error('좋아요 처리 실패'));
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('신고 제출 중에는 추가 제출 요청을 전송하지 않는다', async () => {
    let resolveReport!: () => void;
    mockedSubmitAppNoticeCommentReport.mockReturnValueOnce(new Promise(resolve => {
      resolveReport = () => resolve({
        createdAt: '2026-08-29T00:00:00',
        id: 'report-1',
        status: 'PENDING',
      });
    }));
    const screen = render(<AppNoticeDetailScreen />);

    fireEvent.press(screen.getByTestId('app-notice-comment-card-app-comment-1'));
    fireEvent.press(screen.getByTestId('app-notice-report-form'));
    fireEvent.press(screen.getByTestId('app-notice-report-submit'));
    fireEvent.press(screen.getByTestId('app-notice-report-submit'));

    expect(mockedSubmitAppNoticeCommentReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReport();
      await Promise.resolve();
    });
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
    expect(
      screen.getByTestId('app-notice-comment-card-app-comment-1').props.accessibilityLabel,
    ).toContain('좋아요 비활성화');
  });

  it('답글 전송 중에는 대상 댓글의 삭제 동작을 비활성화한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: mockDetailData.commentItems.map(comment =>
        comment.id === 'app-comment-1' ? {...comment, isEditable: true} : comment,
      ),
      isReplyingComment: true,
      replyTargetCommentId: 'app-comment-1',
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
      isCommentComposerUnavailable: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comment-submit').props.accessibilityLabel).toBe('입력 잠금');
  });

  it('댓글 목록을 다시 불러와야 하면 입력을 잠근다', () => {
    mockDetailData = {
      ...mockDetailData,
      isCommentComposerUnavailable: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comment-submit').props.accessibilityLabel).toBe('입력 잠금');
  });

  it('댓글을 불러오는 동안 빈 상태 대신 로딩 표시를 노출한다', () => {
    mockDetailData = {
      ...mockDetailData,
      commentItems: [],
      commentsLoading: true,
    };
    const screen = render(<AppNoticeDetailScreen />);

    expect(screen.getByTestId('app-notice-comments-loading')).toBeTruthy();
    expect(screen.queryByText('첫 댓글을 남겨보세요!')).toBeNull();
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
