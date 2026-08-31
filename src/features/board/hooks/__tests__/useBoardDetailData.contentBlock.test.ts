import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useAuth} from '@/features/auth';
import type {BoardCommentTreeNode} from '@/features/board/data/repositories/IBoardRepository';
import type {BoardPost} from '@/features/board/model/types';
import {useCommentAnonymousPreference} from '@/shared/hooks';

import {useBoardDetailData} from '../useBoardDetailData';
import {useBoardRepository} from '../useBoardRepository';

jest.mock('@/features/auth', () => ({useAuth: jest.fn()}));
jest.mock('@/shared/hooks', () => ({useCommentAnonymousPreference: jest.fn()}));
jest.mock('../useBoardRepository', () => ({useBoardRepository: jest.fn()}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseCommentAnonymousPreference = jest.mocked(
  useCommentAnonymousPreference,
);
const mockedUseBoardRepository = jest.mocked(useBoardRepository);

const post: BoardPost = {
  authorId: 'author-1',
  authorName: '작성자',
  bookmarkCount: 0,
  category: 'general',
  commentCount: 1,
  content: '본문',
  createdAt: new Date('2026-08-31T00:00:00Z'),
  id: 'post-1',
  isDeleted: false,
  isPinned: false,
  likeCount: 0,
  title: '게시글',
  updatedAt: new Date('2026-08-31T00:00:00Z'),
  viewCount: 1,
};

const comment = (isDeleted: boolean): BoardCommentTreeNode => ({
  anonId: null,
  authorId: 'target-1',
  authorName: '대상',
  authorProfileImage: null,
  content: isDeleted ? '차단한 사용자의 댓글입니다.' : '답글 대상',
  createdAt: new Date('2026-08-31T00:00:00Z'),
  id: 'comment-1',
  isDeleted,
  likeCount: 0,
  parentId: null,
  postId: 'post-1',
  replies: [],
  updatedAt: new Date('2026-08-31T00:00:00Z'),
});

describe('useBoardDetailData 콘텐츠 차단', () => {
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
      getPost: jest.fn().mockResolvedValue(post),
    };
    mockedUseBoardRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useBoardRepository>,
    );

    const {result} = renderHook(() => useBoardDetailData('post-1'));
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
      getPost: jest
        .fn()
        .mockResolvedValueOnce(post)
        .mockRejectedValueOnce(reloadError),
    };
    mockedUseBoardRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useBoardRepository>,
    );

    const {result} = renderHook(() => useBoardDetailData('post-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.reload()).rejects.toBe(reloadError);
    });

    await waitFor(() =>
      expect(result.current.error).toBe('network unavailable'),
    );
  });
});
