import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useAppNoticeRepository} from '@/di/useRepository';
import {useAuth} from '@/features/auth';
import type {NoticeComment, NoticeCommentTreeNode} from '@/features/notice/model/types';
import {useCommentAnonymousPreference} from '@/shared/hooks';

import {useAppNoticeDetailData} from '../useAppNoticeDetailData';

jest.mock('@/di/useRepository', () => ({
  useAppNoticeRepository: jest.fn(),
}));

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/shared/hooks', () => ({
  useCommentAnonymousPreference: jest.fn(),
}));

const mockedUseAppNoticeRepository = jest.mocked(useAppNoticeRepository);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseCommentAnonymousPreference = jest.mocked(
  useCommentAnonymousPreference,
);

const notice = {
  category: 'service' as const,
  commentCount: 0,
  content: '점검 안내 본문',
  id: 'app-notice-1',
  isLiked: false,
  likeCount: 0,
  priority: 'normal' as const,
  publishedAt: new Date('2026-08-29T00:00:00Z'),
  title: '점검 안내',
  viewCount: 1,
};

const comment: NoticeComment = {
  content: '등록된 댓글',
  createdAt: new Date('2026-08-29T00:00:00Z'),
  id: 'app-comment-1',
  isAnonymous: false,
  isAuthor: true,
  isDeleted: false,
  isLiked: false,
  likeCount: 0,
  noticeId: 'app-notice-1',
  parentId: null,
  userDisplayName: '사용자',
  userId: 'member-1',
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, reject, resolve};
};

const createRepository = () => ({
  createComment: jest.fn().mockResolvedValue(comment),
  deleteComment: jest.fn().mockResolvedValue(undefined),
  getAppNotice: jest.fn().mockResolvedValue(notice),
  getComments: jest.fn().mockResolvedValue([]),
  markAsRead: jest.fn().mockResolvedValue({
    appNoticeId: 'app-notice-1',
    isRead: true,
    readAt: new Date(),
  }),
  toggleCommentLike: jest.fn(),
  toggleLike: jest.fn(),
  updateComment: jest.fn().mockResolvedValue({
    ...comment,
    content: '수정된 댓글',
  }),
});

describe('useAppNoticeDetailData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseAuth.mockReturnValue({
      user: {displayName: '사용자', uid: 'member-1'},
    } as ReturnType<typeof useAuth>);
    mockedUseCommentAnonymousPreference.mockReturnValue({
      isAnonymous: false,
      setAnonymousPreference: jest.fn(),
      toggleAnonymousPreference: jest.fn(),
    });
  });

  it('댓글 POST 성공 후 추가 조회 없이 응답 댓글을 즉시 반영한다', async () => {
    const repository = createRepository();
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCommentDraft('등록된 댓글'));
    await act(async () => {
      await expect(result.current.submitComment()).resolves.toEqual({
        commentId: 'app-comment-1',
      });
    });

    expect(repository.getComments).toHaveBeenCalledTimes(1);
    expect(result.current.commentItems).toHaveLength(1);
    expect(result.current.commentDraft).toBe('');
  });

  it('댓글 PATCH 성공 후 추가 조회 없이 응답 댓글을 즉시 반영한다', async () => {
    const repository = createRepository();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정된 댓글');
    });
    await act(async () => {
      await expect(result.current.submitComment()).resolves.toEqual({
        commentId: 'app-comment-1',
      });
    });

    expect(repository.updateComment).toHaveBeenCalledWith(
      'app-notice-1',
      'app-comment-1',
      '수정된 댓글',
      false,
    );
    expect(repository.getComments).toHaveBeenCalledTimes(1);
    expect(result.current.commentItems[0]?.body).toBe('수정된 댓글');
    expect(result.current.commentDraft).toBe('');
  });

  it('댓글 전송 중에는 다른 댓글의 수정이나 답글 모드로 전환하지 않는다', async () => {
    const repository = createRepository();
    const deferredComment = createDeferred<NoticeComment>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.createComment.mockReturnValueOnce(deferredComment.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCommentDraft('새 댓글'));
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.startReplyingComment('app-comment-1');
    });

    expect(result.current.commentDraft).toBe('새 댓글');
    expect(result.current.isEditingComment).toBe(false);
    expect(result.current.isReplyingComment).toBe(false);

    await act(async () => {
      deferredComment.resolve(comment);
      await submitPromise;
    });
  });

  it('댓글 전송 요청은 진행 중 한 번만 전송한다', async () => {
    const repository = createRepository();
    const deferredComment = createDeferred<NoticeComment>();
    repository.createComment.mockReturnValueOnce(deferredComment.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCommentDraft('등록된 댓글'));
    let firstSubmitPromise!: ReturnType<typeof result.current.submitComment>;
    let secondSubmitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      firstSubmitPromise = result.current.submitComment();
      secondSubmitPromise = result.current.submitComment();
    });

    expect(repository.createComment).toHaveBeenCalledTimes(1);
    await expect(secondSubmitPromise).resolves.toEqual({commentId: undefined});

    await act(async () => {
      deferredComment.resolve(comment);
      await firstSubmitPromise;
    });
  });

  it('댓글 수정 전송 중에는 같은 댓글의 삭제 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredEdit = createDeferred<NoticeComment>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.updateComment.mockReturnValueOnce(deferredEdit.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정 중인 댓글');
    });
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    await act(async () => {
      await result.current.deleteComment('app-comment-1');
    });

    expect(repository.deleteComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredEdit.resolve({...comment, content: '수정 중인 댓글'});
      await submitPromise;
    });
  });

  it('댓글 수정 전송 중에는 같은 댓글의 좋아요 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredEdit = createDeferred<NoticeComment>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.updateComment.mockReturnValueOnce(deferredEdit.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정 중인 댓글');
    });
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    await act(async () => {
      await result.current.toggleCommentLike('app-comment-1');
    });

    expect(repository.toggleCommentLike).not.toHaveBeenCalled();

    await act(async () => {
      deferredEdit.resolve({...comment, content: '수정 중인 댓글'});
      await submitPromise;
    });
  });

  it('댓글 좋아요 중에는 같은 댓글을 수정 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.toggleCommentLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let likePromise!: ReturnType<typeof result.current.toggleCommentLike>;
    act(() => {
      likePromise = result.current.toggleCommentLike('app-comment-1');
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정 중인 댓글');
    });
    await expect(result.current.submitComment()).rejects.toThrow(
      '좋아요 처리 중인 댓글은 수정할 수 없습니다.',
    );
    expect(repository.updateComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await likePromise;
    });
  });

  it('답글 전송 중에는 대상 댓글의 삭제 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredReply = createDeferred<NoticeComment>();
    const reply: NoticeComment = {
      ...comment,
      id: 'app-comment-2',
      isAuthor: false,
      parentId: 'app-comment-1',
    };
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.createComment.mockReturnValueOnce(deferredReply.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startReplyingComment('app-comment-1');
      result.current.setCommentDraft('답글');
    });
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    await act(async () => {
      await result.current.deleteComment('app-comment-1');
    });

    expect(repository.deleteComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredReply.resolve(reply);
      await submitPromise;
    });
  });

  it('다른 댓글을 삭제해도 현재 작성 중인 초안을 보존한다', async () => {
    const repository = createRepository();
    const commentTree: NoticeCommentTreeNode = {...comment, replies: []};
    repository.getComments.mockResolvedValueOnce([commentTree]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCommentDraft('작성 중인 새 댓글'));
    await act(async () => {
      await result.current.deleteComment('app-comment-1');
    });

    expect(result.current.commentDraft).toBe('작성 중인 새 댓글');
    expect(result.current.commentItems).toHaveLength(0);
    expect(repository.getComments).toHaveBeenCalledTimes(1);
  });

  it('댓글 삭제 중에는 같은 댓글의 수정이나 답글 모드로 전환하지 않는다', async () => {
    const repository = createRepository();
    const deferredDelete = createDeferred<void>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.deleteComment.mockReturnValueOnce(deferredDelete.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let deletePromise!: ReturnType<typeof result.current.deleteComment>;
    act(() => {
      deletePromise = result.current.deleteComment('app-comment-1');
      result.current.startEditingComment('app-comment-1');
      result.current.startReplyingComment('app-comment-1');
    });

    expect(result.current.isEditingComment).toBe(false);
    expect(result.current.isReplyingComment).toBe(false);

    await act(async () => {
      deferredDelete.resolve();
      await deletePromise;
    });
  });

  it('댓글 조회만 실패하면 공지 본문은 표시하고 댓글 오류를 분리한다', async () => {
    const repository = createRepository();
    repository.getComments.mockRejectedValueOnce(new Error('댓글 네트워크 오류'));
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.title).toBe('점검 안내');
    expect(result.current.error).toBeNull();
    expect(result.current.commentError).toBe('댓글 네트워크 오류');
  });

  it('초기 댓글 조회 실패 뒤에는 재조회 전 새 댓글을 작성하지 않는다', async () => {
    const repository = createRepository();
    repository.getComments.mockRejectedValueOnce(new Error('댓글 네트워크 오류'));
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.commentError).toBe('댓글 네트워크 오류'));

    expect(result.current.isCommentComposerUnavailable).toBe(true);
    act(() => result.current.setCommentDraft('새 댓글'));
    await expect(result.current.submitComment()).rejects.toThrow(
      '댓글을 다시 불러온 뒤 작성할 수 있습니다.',
    );
    expect(repository.createComment).not.toHaveBeenCalled();
  });

  it('댓글 조회 실패 뒤 재로드 중에는 새 댓글 전송을 잠근다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    repository.getComments
      .mockRejectedValueOnce(new Error('댓글 네트워크 오류'))
      .mockReturnValueOnce(deferredComments.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.commentError).toBe('댓글 네트워크 오류'));

    let reloadPromise!: ReturnType<typeof result.current.reload>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await act(async () => {
      await reloadPromise;
    });
    await waitFor(() => expect(result.current.commentsLoading).toBe(true));

    act(() => result.current.setCommentDraft('새 댓글'));
    await expect(result.current.submitComment()).rejects.toThrow(
      '댓글 목록을 불러오는 중입니다.',
    );
    expect(repository.createComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.commentsLoading).toBe(false));
    expect(result.current.commentItems).toHaveLength(1);
  });

  it('댓글 재조회 결과로 댓글 수를 함께 갱신한다', async () => {
    const repository = createRepository();
    const secondComment: NoticeCommentTreeNode = {
      ...comment,
      id: 'app-comment-2',
      replies: [],
    };
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockResolvedValueOnce([{...comment, replies: []}, secondComment]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.notice?.commentCount).toBe(1));

    await act(async () => {
      await result.current.retryComments();
    });

    expect(result.current.notice?.commentCount).toBe(2);
  });

  it('댓글 재로드 중 공지 좋아요를 눌러도 댓글 재시도를 완료한다', async () => {
    const repository = createRepository();
    const deferredNotice = createDeferred<typeof notice>();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    repository.getComments
      .mockRejectedValueOnce(new Error('댓글 네트워크 오류'))
      .mockReturnValueOnce(deferredComments.promise);
    repository.toggleLike.mockResolvedValueOnce({isLiked: true, likeCount: 1});
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.commentError).toBe('댓글 네트워크 오류'));

    repository.getAppNotice.mockReturnValueOnce(deferredNotice.promise);
    let reloadPromise!: ReturnType<typeof result.current.reload>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => expect(repository.getComments).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.toggleLike();
    });
    await act(async () => {
      deferredNotice.resolve(notice);
      await reloadPromise;
    });
    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.commentsLoading).toBe(false));
    expect(result.current.commentError).toBeNull();
    expect(result.current.commentItems).toHaveLength(1);
  });

  it('댓글 조회가 지연돼도 공지 본문을 먼저 표시한다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    repository.getComments.mockReturnValueOnce(deferredComments.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));

    await waitFor(() => expect(result.current.data?.title).toBe('점검 안내'));
    expect(result.current.loading).toBe(false);
    expect(result.current.commentItems).toHaveLength(0);

    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.commentItems).toHaveLength(1));
  });

  it('초기 댓글 조회 중에는 작성하지 않고 조회된 댓글을 보존한다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    const createdComment: NoticeComment = {...comment, id: 'app-comment-2'};
    repository.getComments.mockReturnValueOnce(deferredComments.promise);
    repository.createComment.mockResolvedValueOnce(createdComment);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));

    await waitFor(() => expect(result.current.data?.title).toBe('점검 안내'));
    await waitFor(() => expect(result.current.commentsLoading).toBe(true));
    act(() => result.current.setCommentDraft('새 댓글'));
    await expect(result.current.submitComment()).rejects.toThrow(
      '댓글 목록을 불러오는 중입니다.',
    );
    expect(repository.createComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.commentsLoading).toBe(false));

    await act(async () => {
      await expect(result.current.submitComment()).resolves.toEqual({
        commentId: 'app-comment-2',
      });
    });

    expect(result.current.commentItems.map(item => item.id)).toEqual([
      'app-comment-1',
      'app-comment-2',
    ]);
  });

  it('공지 좋아요 중에도 진행 중인 초기 댓글 조회 결과를 반영한다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    repository.getComments.mockReturnValueOnce(deferredComments.promise);
    repository.toggleLike.mockResolvedValueOnce({isLiked: true, likeCount: 1});
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));

    await waitFor(() => expect(result.current.data?.title).toBe('점검 안내'));
    await waitFor(() => expect(repository.getComments).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.toggleLike();
    });
    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.commentItems).toHaveLength(1));
  });

  it('같은 공지로 재진입한 뒤에는 이전 좋아요 요청의 실패 결과를 반영하지 않는다', async () => {
    const repository = createRepository();
    const firstLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.getAppNotice.mockImplementation(async (noticeId: string) => ({
      ...notice,
      id: noticeId,
    }));
    repository.toggleLike
      .mockReturnValueOnce(firstLike.promise)
      .mockResolvedValueOnce({isLiked: true, likeCount: 1});
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result, rerender} = renderHook(
      ({currentNoticeId}: {currentNoticeId: string}) =>
        useAppNoticeDetailData(currentNoticeId),
      {initialProps: {currentNoticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.data?.id).toBe('app-notice-1'));

    let firstLikePromise!: ReturnType<typeof result.current.toggleLike>;
    act(() => {
      firstLikePromise = result.current.toggleLike();
    });
    rerender({currentNoticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.id).toBe('app-notice-2'));
    rerender({currentNoticeId: 'app-notice-1'});
    await waitFor(() => expect(result.current.data?.id).toBe('app-notice-1'));

    await act(async () => {
      await result.current.toggleLike();
    });
    expect(result.current.notice).toMatchObject({isLiked: true, likeCount: 1});

    await act(async () => {
      firstLike.reject(new Error('이전 좋아요 요청 실패'));
      await firstLikePromise;
    });

    expect(result.current.notice).toMatchObject({isLiked: true, likeCount: 1});
  });

  it('삭제 중인 댓글의 좋아요 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredDelete = createDeferred<void>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.deleteComment.mockReturnValueOnce(deferredDelete.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let deletePromise!: ReturnType<typeof result.current.deleteComment>;
    act(() => {
      deletePromise = result.current.deleteComment('app-comment-1');
    });
    await act(async () => {
      await result.current.toggleCommentLike('app-comment-1');
    });

    expect(repository.toggleCommentLike).not.toHaveBeenCalled();

    await act(async () => {
      deferredDelete.resolve();
      await deletePromise;
    });
  });

  it('댓글 좋아요 중에는 같은 댓글의 삭제 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.toggleCommentLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let likePromise!: ReturnType<typeof result.current.toggleCommentLike>;
    act(() => {
      likePromise = result.current.toggleCommentLike('app-comment-1');
    });
    await act(async () => {
      await result.current.deleteComment('app-comment-1');
    });
    expect(repository.deleteComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await likePromise;
    });

    expect(result.current.commentItems.find(item => item.id === 'app-comment-1')).toMatchObject({
      id: 'app-comment-1',
      isDeleted: false,
      isLiked: true,
    });
  });

  it('댓글 좋아요 요청 중에는 추가 요청을 처리 중 메시지로 차단한다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.toggleCommentLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let firstLikePromise!: ReturnType<typeof result.current.toggleCommentLike>;
    let secondLikePromise!: ReturnType<typeof result.current.toggleCommentLike>;
    act(() => {
      firstLikePromise = result.current.toggleCommentLike('app-comment-1');
      secondLikePromise = result.current.toggleCommentLike('app-comment-1');
    });

    await expect(secondLikePromise).rejects.toThrow('좋아요 처리 중입니다.');
    expect(repository.toggleCommentLike).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await firstLikePromise;
    });
  });

  it('수정 중인 댓글이 삭제되면 전송을 잠근다', async () => {
    const repository = createRepository();
    const deferredDelete = createDeferred<void>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.deleteComment.mockReturnValueOnce(deferredDelete.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정 중인 댓글');
    });
    let deletePromise!: ReturnType<typeof result.current.deleteComment>;
    act(() => {
      deletePromise = result.current.deleteComment('app-comment-1');
    });

    expect(result.current.isCommentComposerLocked).toBe(true);
    await expect(result.current.submitComment()).rejects.toThrow(
      '삭제 중인 댓글은 수정하거나 답글을 작성할 수 없습니다.',
    );
    expect(repository.updateComment).not.toHaveBeenCalled();

    await act(async () => {
      deferredDelete.resolve();
      await deletePromise;
    });

    await waitFor(() => expect(result.current.isEditingComment).toBe(false));
    expect(result.current.commentDraft).toBe('');
  });

  it('재조회에서 사라진 수정 대상 댓글의 작성 모드를 취소한다', async () => {
    const repository = createRepository();
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockResolvedValueOnce([]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('수정 중인 댓글');
    });
    await act(async () => {
      await result.current.retryComments();
    });

    await waitFor(() => expect(result.current.isEditingComment).toBe(false));
    expect(result.current.commentDraft).toBe('');
  });

  it('재조회에서 삭제된 답글 대상은 작성 모드를 취소한다', async () => {
    const repository = createRepository();
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockResolvedValueOnce([{
        ...comment,
        content: '삭제된 댓글입니다',
        isDeleted: true,
        replies: [],
      }]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startReplyingComment('app-comment-1');
      result.current.setCommentDraft('답글 초안');
    });
    await act(async () => {
      await result.current.retryComments();
    });

    await waitFor(() => expect(result.current.isReplyingComment).toBe(false));
    expect(result.current.commentDraft).toBe('');
  });

  it('같은 공지의 이전 재조회 응답이 새 댓글 상태를 덮어쓰지 않는다', async () => {
    const repository = createRepository();
    const deferredNotice = createDeferred<typeof notice>();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    repository.getAppNotice.mockReturnValueOnce(deferredNotice.promise);
    repository.getComments.mockReturnValueOnce(deferredComments.promise);
    let reloadPromise!: ReturnType<typeof result.current.reload>;
    act(() => {
      reloadPromise = result.current.reload();
    });

    act(() => result.current.setCommentDraft('새 댓글'));
    await act(async () => {
      await result.current.submitComment();
    });

    await act(async () => {
      deferredNotice.resolve(notice);
      deferredComments.resolve([]);
      await reloadPromise;
    });

    expect(result.current.notice?.commentCount).toBe(1);
    expect(result.current.commentItems).toHaveLength(1);
    expect(result.current.commentItems[0]?.body).toBe('등록된 댓글');
  });

  it('좋아요 요청 중 시작된 재조회가 완료된 좋아요 상태를 되돌리지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    const deferredNotice = createDeferred<typeof notice>();
    repository.toggleLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let togglePromise!: ReturnType<typeof result.current.toggleLike>;
    let reloadPromise!: ReturnType<typeof result.current.reload>;
    act(() => {
      togglePromise = result.current.toggleLike();
    });
    repository.getAppNotice.mockReturnValueOnce(deferredNotice.promise);
    act(() => {
      reloadPromise = result.current.reload();
    });

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await togglePromise;
    });
    await act(async () => {
      deferredNotice.resolve(notice);
      await reloadPromise;
    });

    expect(result.current.notice?.isLiked).toBe(true);
    expect(result.current.notice?.likeCount).toBe(1);
  });

  it('공지 좋아요 요청 중에는 추가 요청을 전송하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.toggleLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let firstTogglePromise!: ReturnType<typeof result.current.toggleLike>;
    let secondTogglePromise!: ReturnType<typeof result.current.toggleLike>;
    act(() => {
      firstTogglePromise = result.current.toggleLike();
      secondTogglePromise = result.current.toggleLike();
    });

    await expect(secondTogglePromise).rejects.toThrow('좋아요 처리 중입니다.');
    expect(repository.toggleLike).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await firstTogglePromise;
    });

    expect(result.current.notice?.isLiked).toBe(true);
    expect(result.current.notice?.likeCount).toBe(1);
  });

  it('계정 전환 뒤 이전 사용자의 좋아요 완료를 현재 공지에 반영하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    repository.toggleLike.mockReturnValueOnce(deferredLike.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({version: _version}: {version: number}) => useAppNoticeDetailData('app-notice-1'),
      {initialProps: {version: 0}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let firstLikePromise!: ReturnType<typeof result.current.toggleLike>;
    act(() => {
      firstLikePromise = result.current.toggleLike();
    });
    mockedUseAuth.mockReturnValue({
      user: {displayName: '다른 사용자', uid: 'member-2'},
    } as ReturnType<typeof useAuth>);
    rerender({version: 1});
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await firstLikePromise;
    });

    expect(result.current.notice?.isLiked).toBe(false);
    expect(result.current.notice?.likeCount).toBe(0);
  });

  it('같은 공지의 이전 댓글 재조회 응답이 삭제 상태를 되돌리지 않는다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockReturnValueOnce(deferredComments.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let retryPromise!: ReturnType<typeof result.current.retryComments>;
    act(() => {
      retryPromise = result.current.retryComments();
    });
    await act(async () => {
      await result.current.deleteComment('app-comment-1');
    });

    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await retryPromise;
    });

    expect(result.current.notice?.commentCount).toBe(0);
    expect(result.current.commentItems).toHaveLength(0);
    expect(result.current.commentsLoading).toBe(false);
  });

  it('동시에 실행된 댓글 재시도 중 마지막 요청의 결과만 반영한다', async () => {
    const repository = createRepository();
    const firstRetry = createDeferred<NoticeCommentTreeNode[]>();
    const secondRetry = createDeferred<NoticeCommentTreeNode[]>();
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.getComments
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise);

    let firstRetryPromise!: ReturnType<typeof result.current.retryComments>;
    let secondRetryPromise!: ReturnType<typeof result.current.retryComments>;
    act(() => {
      firstRetryPromise = result.current.retryComments();
      secondRetryPromise = result.current.retryComments();
    });

    await act(async () => {
      secondRetry.resolve([{...comment, content: '최신 댓글', replies: []}]);
      await secondRetryPromise;
    });
    await act(async () => {
      firstRetry.reject(new Error('이전 댓글 조회 실패'));
      await firstRetryPromise;
    });

    expect(result.current.commentItems[0]?.body).toBe('최신 댓글');
    expect(result.current.commentError).toBeNull();
  });

  it('같은 댓글의 삭제 요청은 진행 중 한 번만 전송한다', async () => {
    const repository = createRepository();
    const deferredDelete = createDeferred<void>();
    repository.getComments.mockResolvedValueOnce([{...comment, replies: []}]);
    repository.deleteComment.mockReturnValueOnce(deferredDelete.promise);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let firstDeletePromise!: ReturnType<typeof result.current.deleteComment>;
    let secondDeletePromise!: ReturnType<typeof result.current.deleteComment>;
    act(() => {
      firstDeletePromise = result.current.deleteComment('app-comment-1');
      secondDeletePromise = result.current.deleteComment('app-comment-1');
    });

    expect(repository.deleteComment).toHaveBeenCalledTimes(1);
    expect(result.current.commentDeletePendingIds).toEqual(['app-comment-1']);

    await act(async () => {
      deferredDelete.resolve();
      await Promise.all([firstDeletePromise, secondDeletePromise]);
    });

    expect(result.current.commentDeletePendingIds).toEqual([]);
    expect(result.current.commentItems).toHaveLength(0);
  });

  it('라우트 공지 ID가 바뀌면 이전 공지와 댓글을 즉시 조작할 수 없게 한다', async () => {
    const repository = createRepository();
    const commentTree: NoticeCommentTreeNode = {...comment, replies: []};
    let resolveSecondNotice: ((value: typeof notice) => void) | undefined;
    const secondNotice = {...notice, id: 'app-notice-2', title: '두 번째 공지'};
    repository.getComments.mockResolvedValue([commentTree]);
    repository.getAppNotice
      .mockResolvedValueOnce(notice)
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveSecondNotice = resolve;
      }));
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({noticeId: 'app-notice-2'});

    expect(result.current.data).toBeNull();
    await expect(result.current.deleteComment('app-comment-1')).rejects.toThrow(
      '앱 공지사항을 다시 불러와주세요.',
    );

    await act(async () => {
      resolveSecondNotice?.(secondNotice);
    });
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));
  });

  it('이전 공지의 댓글 작성 완료가 새 공지 상태를 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredCreate = createDeferred<NoticeComment>();
    const secondNotice = {...notice, commentCount: 0, id: 'app-notice-2', title: '두 번째 공지'};
    repository.createComment.mockReturnValueOnce(deferredCreate.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments.mockResolvedValue([]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCommentDraft('등록된 댓글'));
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredCreate.resolve(comment);
      await submitPromise;
    });

    expect(result.current.notice?.commentCount).toBe(0);
    expect(result.current.commentItems).toHaveLength(0);
  });

  it('이전 공지의 댓글 수정 완료가 새 공지 댓글을 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredUpdate = createDeferred<NoticeComment>();
    const secondNotice = {...notice, id: 'app-notice-2', title: '두 번째 공지'};
    const secondComment = {
      ...comment,
      content: '두 번째 공지 댓글',
      noticeId: 'app-notice-2',
      replies: [],
    };
    repository.updateComment.mockReturnValueOnce(deferredUpdate.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments.mockImplementation(async noticeId => [
      noticeId === 'app-notice-1'
        ? {...comment, replies: []}
        : secondComment,
    ]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.startEditingComment('app-comment-1');
      result.current.setCommentDraft('첫 번째 공지 수정 댓글');
    });
    let submitPromise!: ReturnType<typeof result.current.submitComment>;
    act(() => {
      submitPromise = result.current.submitComment();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredUpdate.resolve({...comment, content: '첫 번째 공지 수정 댓글'});
      await submitPromise;
    });

    expect(result.current.commentItems[0]?.body).toBe('두 번째 공지 댓글');
  });

  it('이전 공지의 좋아요 완료가 새 공지 상태를 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    const secondNotice = {
      ...notice,
      id: 'app-notice-2',
      isLiked: false,
      likeCount: 9,
      title: '두 번째 공지',
    };
    repository.toggleLike.mockReturnValueOnce(deferredLike.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let togglePromise!: ReturnType<typeof result.current.toggleLike>;
    act(() => {
      togglePromise = result.current.toggleLike();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredLike.resolve({isLiked: true, likeCount: 1});
      await togglePromise;
    });

    expect(result.current.notice?.isLiked).toBe(false);
    expect(result.current.notice?.likeCount).toBe(9);
  });

  it('이전 공지의 좋아요 실패가 새 공지 상태와 오류 흐름을 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{isLiked: boolean; likeCount: number}>();
    const secondNotice = {
      ...notice,
      id: 'app-notice-2',
      isLiked: false,
      likeCount: 9,
      title: '두 번째 공지',
    };
    repository.toggleLike.mockReturnValueOnce(deferredLike.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let togglePromise!: ReturnType<typeof result.current.toggleLike>;
    act(() => {
      togglePromise = result.current.toggleLike();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredLike.reject(new Error('첫 번째 공지 좋아요 실패'));
      await expect(togglePromise).resolves.toBeUndefined();
    });

    expect(result.current.notice?.isLiked).toBe(false);
    expect(result.current.notice?.likeCount).toBe(9);
  });

  it('이전 공지의 댓글 좋아요 완료가 새 공지 댓글을 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredLike = createDeferred<{
      commentId: string;
      isLiked: boolean;
      likeCount: number;
    }>();
    const secondNotice = {...notice, id: 'app-notice-2', title: '두 번째 공지'};
    const secondComment = {
      ...comment,
      isLiked: false,
      likeCount: 9,
      noticeId: 'app-notice-2',
      replies: [],
    };
    repository.toggleCommentLike.mockReturnValueOnce(deferredLike.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments.mockImplementation(async noticeId => [
      noticeId === 'app-notice-1'
        ? {...comment, replies: []}
        : secondComment,
    ]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let togglePromise!: ReturnType<typeof result.current.toggleCommentLike>;
    act(() => {
      togglePromise = result.current.toggleCommentLike('app-comment-1');
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredLike.resolve({
        commentId: 'app-comment-1',
        isLiked: true,
        likeCount: 1,
      });
      await togglePromise;
    });

    expect(result.current.commentItems[0]?.isLiked).toBe(false);
    expect(result.current.commentItems[0]?.likeCount).toBe(9);
  });

  it('이전 공지의 댓글 삭제 완료가 새 공지 상태를 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredDelete = createDeferred<void>();
    const secondNotice = {...notice, commentCount: 1, id: 'app-notice-2', title: '두 번째 공지'};
    const secondComment = {...comment, noticeId: 'app-notice-2', replies: []};
    repository.deleteComment.mockReturnValueOnce(deferredDelete.promise);
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments.mockImplementation(async noticeId => [
      noticeId === 'app-notice-1'
        ? {...comment, replies: []}
        : secondComment,
    ]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let deletePromise!: ReturnType<typeof result.current.deleteComment>;
    act(() => {
      deletePromise = result.current.deleteComment('app-comment-1');
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredDelete.resolve();
      await deletePromise;
    });

    expect(result.current.notice?.commentCount).toBe(1);
    expect(result.current.commentItems[0]?.isDeleted).toBe(false);
  });

  it('이전 공지의 댓글 재조회 성공 결과가 새 공지 댓글을 덮어쓰지 않는다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    const secondNotice = {...notice, id: 'app-notice-2', title: '두 번째 공지'};
    const secondComment: NoticeCommentTreeNode = {
      ...comment,
      content: '두 번째 공지 댓글',
      id: 'app-comment-2',
      noticeId: 'app-notice-2',
      replies: [],
    };
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockReturnValueOnce(deferredComments.promise)
      .mockResolvedValueOnce([secondComment]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let retryPromise!: ReturnType<typeof result.current.retryComments>;
    act(() => {
      retryPromise = result.current.retryComments();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredComments.resolve([{...comment, replies: []}]);
      await retryPromise;
    });

    expect(result.current.commentItems[0]?.body).toBe('두 번째 공지 댓글');
    expect(result.current.commentError).toBeNull();
  });

  it('이전 공지의 댓글 재조회 실패가 새 공지 오류 상태를 변경하지 않는다', async () => {
    const repository = createRepository();
    const deferredComments = createDeferred<NoticeCommentTreeNode[]>();
    const secondNotice = {...notice, id: 'app-notice-2', title: '두 번째 공지'};
    const secondComment: NoticeCommentTreeNode = {
      ...comment,
      content: '두 번째 공지 댓글',
      id: 'app-comment-2',
      noticeId: 'app-notice-2',
      replies: [],
    };
    repository.getAppNotice.mockImplementation(async noticeId =>
      noticeId === 'app-notice-1' ? notice : secondNotice,
    );
    repository.getComments
      .mockResolvedValueOnce([{...comment, replies: []}])
      .mockReturnValueOnce(deferredComments.promise)
      .mockResolvedValueOnce([secondComment]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );
    const {result, rerender} = renderHook(
      ({noticeId}: {noticeId: string}) => useAppNoticeDetailData(noticeId),
      {initialProps: {noticeId: 'app-notice-1'}},
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let retryPromise!: ReturnType<typeof result.current.retryComments>;
    act(() => {
      retryPromise = result.current.retryComments();
    });
    rerender({noticeId: 'app-notice-2'});
    await waitFor(() => expect(result.current.data?.title).toBe('두 번째 공지'));

    await act(async () => {
      deferredComments.reject(new Error('첫 번째 공지 댓글 조회 실패'));
      await expect(retryPromise).resolves.toBeUndefined();
    });

    expect(result.current.commentItems[0]?.body).toBe('두 번째 공지 댓글');
    expect(result.current.commentError).toBeNull();
  });

  it('삭제된 부모 댓글을 답글 대상으로 표시할 때 공통 대체 문구를 사용한다', async () => {
    const repository = createRepository();
    const reply = {
      ...comment,
      id: 'app-comment-2',
      isAuthor: false,
      parentId: 'app-comment-1',
      replies: [],
    };
    const deletedParent: NoticeCommentTreeNode = {
      ...comment,
      content: '삭제된 댓글입니다',
      isAuthor: false,
      isDeleted: true,
      replies: [reply],
      userDisplayName: '',
      userId: '',
    };
    repository.getComments.mockResolvedValueOnce([deletedParent]);
    mockedUseAppNoticeRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useAppNoticeRepository>,
    );

    const {result} = renderHook(() => useAppNoticeDetailData('app-notice-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(
      result.current.commentItems.find(item => item.id === 'app-comment-2')
        ?.replyTargetLabel,
    ).toBe('삭제된 댓글/답글에 답글');
  });
});
