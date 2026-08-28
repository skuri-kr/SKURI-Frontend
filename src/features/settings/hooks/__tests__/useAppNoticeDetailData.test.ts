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
    const secondNotice = {...notice, commentCount: 4, id: 'app-notice-2', title: '두 번째 공지'};
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

    expect(result.current.notice?.commentCount).toBe(4);
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
    const secondNotice = {...notice, commentCount: 4, id: 'app-notice-2', title: '두 번째 공지'};
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

    expect(result.current.notice?.commentCount).toBe(4);
    expect(result.current.commentItems[0]?.isDeleted).toBe(false);
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
