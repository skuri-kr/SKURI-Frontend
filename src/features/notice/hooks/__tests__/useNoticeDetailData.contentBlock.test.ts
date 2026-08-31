import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useAuth} from '@/features/auth';
import type {NoticeCommentTreeNode} from '@/features/notice/model/types';
import {useCommentAnonymousPreference} from '@/shared/hooks';

import {useNoticeDetailData} from '../useNoticeDetailData';
import {useNoticeRepository} from '../useNoticeRepository';

jest.mock('@/features/auth', () => ({useAuth: jest.fn()}));
jest.mock('@/shared/hooks', () => ({useCommentAnonymousPreference: jest.fn()}));
jest.mock('../useNoticeRepository', () => ({useNoticeRepository: jest.fn()}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseCommentAnonymousPreference = jest.mocked(
  useCommentAnonymousPreference,
);
const mockedUseNoticeRepository = jest.mocked(useNoticeRepository);

const notice = {
  author: '성결대학교',
  category: '일반',
  commentCount: 1,
  content: '본문',
  contentAttachments: [],
  contentDetail: '본문',
  createdAt: '2026-08-31T00:00:00Z',
  department: '학생지원',
  id: 'notice-1',
  link: '',
  postedAt: '2026-08-31T00:00:00Z',
  source: '성결대학교',
  title: '학교 공지',
};

const comment = (isDeleted: boolean): NoticeCommentTreeNode => ({
  content: isDeleted ? '차단한 사용자의 댓글입니다.' : '답글 대상',
  createdAt: new Date('2026-08-31T00:00:00Z'),
  id: 'comment-1',
  isDeleted,
  likeCount: 0,
  noticeId: 'notice-1',
  parentId: null,
  replies: [],
  userDisplayName: '대상',
  userId: 'target-1',
});

describe('useNoticeDetailData 콘텐츠 차단', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseAuth.mockReturnValue({
      user: {displayName: '차단자', uid: 'member-1'},
    } as ReturnType<typeof useAuth>);
    mockedUseCommentAnonymousPreference.mockReturnValue({
      isAnonymous: false,
      setAnonymousPreference: jest.fn(),
      toggleAnonymousPreference: jest.fn(),
    });
  });

  it('재조회 후 차단 placeholder가 된 답글 대상은 작성 상태를 해제한다', async () => {
    const repository = {
      getComments: jest
        .fn()
        .mockResolvedValueOnce([comment(false)])
        .mockResolvedValueOnce([comment(true)]),
      getNotice: jest.fn().mockResolvedValue(notice),
      markAsRead: jest.fn().mockResolvedValue(undefined),
    };
    mockedUseNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useNoticeRepository>,
    );

    const {result} = renderHook(() => useNoticeDetailData('notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startReplyingComment('comment-1');
      result.current.setCommentDraft('답글 초안');
    });
    expect(result.current.isReplyingComment).toBe(true);

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.isReplyingComment).toBe(false));
    expect(result.current.commentDraft).toBe('');
  });

  it('재조회 실패를 오류 상태에 반영하고 호출자에게 전파한다', async () => {
    const reloadError = new Error('network unavailable');
    const repository = {
      getComments: jest.fn().mockResolvedValue([comment(false)]),
      getNotice: jest
        .fn()
        .mockResolvedValueOnce(notice)
        .mockRejectedValueOnce(reloadError),
      markAsRead: jest.fn().mockResolvedValue(undefined),
    };
    mockedUseNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useNoticeRepository>,
    );

    const {result} = renderHook(() => useNoticeDetailData('notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.reload()).rejects.toBe(reloadError);
    });

    await waitFor(() =>
      expect(result.current.error).toBe('network unavailable'),
    );
  });
});
