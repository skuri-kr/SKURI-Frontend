import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';

import {useBoardDetailData} from '../../hooks/useBoardDetailData';
import {BoardDetailScreen} from '../BoardDetailScreen';

let mockRouteParams = {postId: 'post-1'};
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
            testID: `board-comment-block-${comment.id}`,
          })
        : null,
    DetailComposer: ReactModule.forwardRef(() => null),
    DetailNotFoundState: () => null,
    DetailReactionChip: () => null,
    DetailTitleHeader: () => null,
    StateCard: () => null,
  };
});

jest.mock('../../components/BoardDetailPopupMenu', () => {
  const ReactModule = require('react') as typeof React;
  const {TouchableOpacity} = require('react-native');

  return {
    BoardDetailPopupMenu: ({
      onPressBlock,
      showBlockAction,
      visible,
    }: {
      onPressBlock: () => void;
      showBlockAction?: boolean;
      visible: boolean;
    }) =>
      visible && showBlockAction
        ? ReactModule.createElement(TouchableOpacity, {
            onPress: onPressBlock,
            testID: 'board-post-block',
          })
        : null,
  };
});

jest.mock('../../components/BoardReportModal', () => ({
  BoardReportModal: () => null,
}));

jest.mock('../../hooks/useBoardDetailData', () => ({
  useBoardDetailData: jest.fn(),
}));

jest.mock('../../services/boardReportService', () => ({
  BOARD_REPORT_CATEGORIES: [],
  submitBoardCommentReport: jest.fn(),
  submitBoardPostReport: jest.fn(),
}));

const mockedInvalidateData = jest.mocked(invalidateData);
const mockedUseBoardDetailData = jest.mocked(useBoardDetailData);

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
  canManageActions: false,
  commentAnonymousDisabled: false,
  commentAnonymousValue: false,
  commentDraft: '',
  commentItems: [] as ReturnType<typeof createComment>[],
  commentLikePendingIds: [],
  data: {
    authorLabel: '작성자',
    bodyBlocks: [],
    commentInputPlaceholder: '댓글을 입력하세요',
    dateLabel: '방금 전',
    emptyCommentsLabel: '댓글이 없어요',
    isAuthorAdmin: false,
    metaBadges: [],
    title: '게시글',
    viewCountLabel: '1',
  },
  deleteComment: jest.fn(),
  deletePost: jest.fn(),
  deletingPost: false,
  editingCommentId: null,
  error: null,
  isEditingComment: false,
  isReplyingComment: false,
  loading: false,
  notFound: false,
  post: {
    bookmarkCount: 0,
    id: 'post-1',
    isBookmarked: false,
    isDeleted: false,
    isLiked: false,
    likeCount: 0,
  },
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
}) as unknown as ReturnType<typeof useBoardDetailData>;

const confirmBlockAlerts = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
    args[2]?.find(button => button.text === '차단')?.onPress?.();
  });

describe('BoardDetailScreen 콘텐츠 차단 wiring', () => {
  let detailData: ReturnType<typeof useBoardDetailData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {postId: 'post-1'};
    mockBlockContent.mockResolvedValue({
      blockedAt: new Date('2026-08-31T00:00:00Z'),
      id: 'block-1',
      label: '차단한 사용자',
    });
    detailData = createDetailData();
    mockedUseBoardDetailData.mockImplementation(() => detailData);
  });

  it('타인 게시글 메뉴에서 POST를 차단하고 목록 무효화 후 뒤로 간다', async () => {
    const alertSpy = confirmBlockAlerts();
    const screen = render(<BoardDetailScreen />);

    fireEvent.press(screen.getByLabelText('게시물 메뉴'));
    fireEvent.press(screen.getByTestId('board-post-block'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockBlockContent).toHaveBeenCalledWith({
      targetId: 'post-1',
      targetType: 'POST',
    });
    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'community.board.list',
    ]);
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(detailData.reload).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('타인 게시판 댓글에서 COMMENT를 차단하고 목록 무효화 후 상세를 새로고침한다', async () => {
    detailData = {
      ...detailData,
      commentItems: [createComment('comment-1')],
    };
    const alertSpy = confirmBlockAlerts();
    const screen = render(<BoardDetailScreen />);

    fireEvent.press(screen.getByTestId('board-comment-block-comment-1'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockBlockContent).toHaveBeenCalledWith({
      targetId: 'comment-1',
      targetType: 'COMMENT',
    });
    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'community.board.list',
    ]);
    expect(detailData.reload).toHaveBeenCalledTimes(1);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('본인과 삭제된 게시글·댓글에는 차단 액션을 노출하지 않는다', () => {
    detailData = {
      ...detailData,
      canManageActions: true,
      commentItems: [
        createComment('mine', {isMine: true}),
        createComment('deleted', {isDeleted: true}),
      ],
    };
    const screen = render(<BoardDetailScreen />);

    fireEvent.press(screen.getByLabelText('게시물 메뉴'));
    expect(screen.queryByTestId('board-post-block')).toBeNull();
    expect(screen.queryByTestId('board-comment-block-mine')).toBeNull();
    expect(screen.queryByTestId('board-comment-block-deleted')).toBeNull();

    detailData = {
      ...detailData,
      canManageActions: false,
      post: {...detailData.post!, isDeleted: true},
    };
    screen.rerender(<BoardDetailScreen />);
    expect(screen.queryByTestId('board-post-block')).toBeNull();
  });
});
