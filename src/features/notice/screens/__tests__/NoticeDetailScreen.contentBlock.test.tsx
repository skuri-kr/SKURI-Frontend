import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {
  invalidateData,
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';

import {useNoticeDetailData} from '../../hooks/useNoticeDetailData';
import {NoticeDetailScreen} from '../NoticeDetailScreen';

let mockRouteParams = {noticeId: 'notice-1'};
const mockNavigation = {
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  navigate: jest.fn(),
};
const mockBlockContent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({params: mockRouteParams}),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
  useRefetchOnFocus: jest.fn(),
}));

jest.mock('@/app/linking', () => ({
  copyShareUrlToClipboard: jest.fn(),
  createContentShareUrl: jest.fn(),
}));

jest.mock('@/di', () => ({
  useContentBlockRepository: () => ({blockContent: mockBlockContent}),
  useReportRepository: () => ({}),
}));

jest.mock('@/shared/ads', () => ({
  InlineBannerAd: () => null,
  isDetailAdEligible: () => false,
  useScrollViewAdVisibility: () => ({
    handleAdLayout: jest.fn(),
    handleScroll: jest.fn(),
    handleViewportLayout: jest.fn(),
    visible: false,
  }),
}));

jest.mock('@/shared/hooks', () => ({
  useKeyboardInset: () => ({height: 0, isVisible: false}),
  useScreenEnterAnimation: () => ({}),
  useScreenView: jest.fn(),
}));

jest.mock('@/shared/ui/ReportReasonModal', () => ({
  ReportReasonModal: () => null,
}));

jest.mock('@/shared/ui/ToastProvider', () => ({
  useToast: () => ({showToast: jest.fn()}),
}));

jest.mock('@/shared/design-system/components', () => {
  const ReactModule = require('react') as typeof React;
  const {TouchableOpacity, View} = require('react-native');

  return {
    ArticleDetailSkeleton: () => null,
    DetailBackHeader: ({rightAccessory}: {rightAccessory?: React.ReactNode}) =>
      ReactModule.createElement(View, undefined, rightAccessory),
    DetailBodyBlocks: () => null,
    DetailCommentCard: ({
      comment,
      onPressBlock,
    }: {
      comment: {id: string};
      onPressBlock?: () => void;
    }) =>
      onPressBlock
        ? ReactModule.createElement(TouchableOpacity, {
            onPress: onPressBlock,
            testID: `notice-comment-block-${comment.id}`,
          })
        : null,
    DetailComposer: ReactModule.forwardRef(() => null),
    DetailNotFoundState: () => null,
    DetailReactionChip: () => null,
    DetailTitleHeader: () => null,
    StateCard: () => null,
  };
});

jest.mock('../../components/NoticeDetailAttachments', () => ({
  NoticeDetailAttachments: () => null,
}));

jest.mock('../../hooks/useNoticeDetailData', () => ({
  useNoticeDetailData: jest.fn(),
}));

jest.mock('../../services/noticeReportService', () => ({
  NOTICE_REPORT_CATEGORIES: [],
  submitNoticeCommentReport: jest.fn(),
}));

const mockedInvalidateData = jest.mocked(invalidateData);
const mockedUseRefetchOnFocus = jest.mocked(useRefetchOnFocus);
const mockedUseNoticeDetailData = jest.mocked(useNoticeDetailData);

const createComment = (
  id: string,
  overrides: Partial<{
    isDeleted: boolean;
    isMine: boolean;
  }> = {},
) => ({
  authorLabel: '작성자',
  body: '댓글',
  dateLabel: '방금 전',
  id,
  isDeleted: false,
  isEditable: false,
  isLiked: false,
  isMine: false,
  isReply: false,
  likeCount: 0,
  ...overrides,
});

const createDetailData = () => ({
  cancelCommentEdit: jest.fn(),
  cancelCommentReply: jest.fn(),
  commentAnonymousDisabled: false,
  commentAnonymousValue: false,
  commentDraft: '',
  commentItems: [createComment('notice-comment-1')],
  commentLikePendingIds: [],
  data: {
    authorLabel: '성결대학교',
    bodyBlocks: [],
    commentInputPlaceholder: '댓글을 입력하세요',
    dateLabel: '방금 전',
    emptyCommentsLabel: '댓글이 없어요',
    metaBadges: [],
    title: '학교 공지',
    viewCountLabel: '1',
  },
  deleteComment: jest.fn(),
  editingCommentId: null,
  error: null,
  isEditingComment: false,
  isReplyingComment: false,
  loading: false,
  notice: {
    bookmarkCount: 0,
    contentAttachments: [],
    id: 'notice-1',
    isBookmarked: false,
    isLiked: false,
    likeCount: 0,
    link: null,
  },
  notFound: false,
  reload: jest.fn().mockResolvedValue(undefined),
  replyTargetLabel: null,
  setCommentDraft: jest.fn(),
  startEditingComment: jest.fn(),
  startReplyingComment: jest.fn(),
  submitComment: jest.fn(),
  submittingComment: false,
  toggleBookmark: jest.fn(),
  toggleCommentAnonymousPreference: jest.fn(),
  toggleCommentLike: jest.fn(),
  toggleLike: jest.fn(),
  togglingBookmark: false,
  togglingLike: false,
}) as unknown as ReturnType<typeof useNoticeDetailData>;

const confirmBlockAlerts = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
    args[2]?.find(button => button.text === '차단')?.onPress?.();
  });

describe('NoticeDetailScreen 콘텐츠 차단 wiring', () => {
  let detailData: ReturnType<typeof useNoticeDetailData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {noticeId: 'notice-1'};
    mockBlockContent.mockResolvedValue({
      blockedAt: new Date('2026-08-31T00:00:00Z'),
      id: 'block-1',
      label: '차단한 사용자',
    });
    detailData = createDetailData();
    mockedUseNoticeDetailData.mockImplementation(() => detailData);
  });

  it('타인 학교 공지 댓글에서 NOTICE_COMMENT를 차단하고 목록 무효화 후 상세를 새로고침한다', async () => {
    const alertSpy = confirmBlockAlerts();
    const screen = render(<NoticeDetailScreen />);

    fireEvent.press(
      screen.getByTestId('notice-comment-block-notice-comment-1'),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockBlockContent).toHaveBeenCalledWith({
      targetId: 'notice-comment-1',
      targetType: 'NOTICE_COMMENT',
    });
    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'notice.list',
      'campus.home',
      'community.board.list',
    ]);
    expect(detailData.reload).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('콘텐츠 차단 관계가 바뀐 뒤 화면에 복귀하면 상세를 다시 불러온다', () => {
    render(<NoticeDetailScreen />);

    expect(mockedUseRefetchOnFocus).toHaveBeenCalledWith({
      invalidationKey: 'content.blocks',
      refetch: detailData.reload,
    });
  });

  it('본인과 삭제된 학교 공지 댓글에는 차단 액션을 노출하지 않는다', () => {
    detailData = {
      ...detailData,
      commentItems: [
        createComment('mine', {isMine: true}),
        createComment('deleted', {isDeleted: true}),
      ],
    };
    const screen = render(<NoticeDetailScreen />);

    expect(screen.queryByTestId('notice-comment-block-mine')).toBeNull();
    expect(screen.queryByTestId('notice-comment-block-deleted')).toBeNull();
  });
});
