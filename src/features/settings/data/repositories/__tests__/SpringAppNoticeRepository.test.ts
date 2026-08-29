import {appNoticeApiClient} from '../../api/appNoticeApiClient';
import {SpringAppNoticeRepository} from '../SpringAppNoticeRepository';

jest.mock('../../api/appNoticeApiClient', () => ({
  appNoticeApiClient: {
    deleteComment: jest.fn(),
    getAppNotice: jest.fn(),
    getComments: jest.fn(),
    likeComment: jest.fn(),
    likeNotice: jest.fn(),
    unlikeComment: jest.fn(),
    unlikeNotice: jest.fn(),
    updateComment: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(appNoticeApiClient);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(currentResolve => {
    resolve = currentResolve;
  });
  return {promise, resolve};
};

const appNoticeResponse = (isLiked: boolean, likeCount: number) => ({
  data: {
    category: 'GENERAL' as const,
    commentCount: 0,
    content: '앱 공지 내용',
    createdAt: '2026-08-29T00:00:00',
    id: 'app-notice-1',
    isLiked,
    likeCount,
    priority: 'NORMAL' as const,
    publishedAt: '2026-08-29T00:00:00',
    title: '앱 공지',
    updatedAt: '2026-08-29T00:00:00',
    viewCount: 0,
  },
  success: true,
});

const commentResponse = (isLiked: boolean, likeCount: number) => ({
  data: [
    {
      anonymousOrder: null,
      authorId: 'member-1',
      authorName: '사용자',
      authorProfileImage: null,
      content: '댓글',
      createdAt: '2026-08-29T00:00:00',
      depth: 0,
      id: 'app-comment-1',
      isAnonymous: false,
      isAuthor: true,
      isAuthorAdmin: false,
      isDeleted: false,
      isLiked,
      likeCount,
      parentId: null,
      updatedAt: '2026-08-29T00:00:00',
    },
  ],
  success: true,
});

describe('SpringAppNoticeRepository', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('댓글 DELETE 성공을 후속 댓글 조회 실패와 결합하지 않는다', async () => {
    mockedApiClient.deleteComment.mockResolvedValue({
      data: null,
      success: true,
    });
    const repository = new SpringAppNoticeRepository();

    await expect(
      repository.deleteComment('app-notice-1', 'app-comment-1'),
    ).resolves.toBeUndefined();

    expect(mockedApiClient.deleteComment).toHaveBeenCalledWith('app-comment-1');
    expect(mockedApiClient.getComments).not.toHaveBeenCalled();
  });

  it('댓글 PATCH 응답을 반환하고 후속 댓글 조회를 호출하지 않는다', async () => {
    mockedApiClient.updateComment.mockResolvedValue({
      data: {
        anonymousOrder: null,
        authorId: 'member-1',
        authorName: '사용자',
        authorProfileImage: null,
        content: '수정된 댓글',
        createdAt: '2026-08-29T00:00:00',
        depth: 0,
        id: 'app-comment-1',
        isAnonymous: false,
        isAuthor: true,
        isAuthorAdmin: false,
        isDeleted: false,
        isLiked: false,
        likeCount: 0,
        parentId: null,
        updatedAt: '2026-08-29T01:00:00',
      },
      success: true,
    });
    const repository = new SpringAppNoticeRepository();

    await expect(
      repository.updateComment(
        'app-notice-1',
        'app-comment-1',
        ' 수정된 댓글 ',
        false,
      ),
    ).resolves.toMatchObject({
      content: '수정된 댓글',
      id: 'app-comment-1',
      noticeId: 'app-notice-1',
    });

    expect(mockedApiClient.updateComment).toHaveBeenCalledWith(
      'app-comment-1',
      {content: '수정된 댓글', isAnonymous: false},
    );
    expect(mockedApiClient.getComments).not.toHaveBeenCalled();
  });

  it('지연된 공지 상세 조회가 좋아요 캐시를 되돌리지 않는다', async () => {
    mockedApiClient.getAppNotice.mockResolvedValueOnce(appNoticeResponse(false, 0));
    mockedApiClient.likeNotice.mockResolvedValue({
      data: {isLiked: true, likeCount: 1},
      success: true,
    });
    mockedApiClient.unlikeNotice.mockResolvedValue({
      data: {isLiked: false, likeCount: 0},
      success: true,
    });
    const repository = new SpringAppNoticeRepository();

    await repository.getAppNotice('app-notice-1');
    const delayedRead = deferred<ReturnType<typeof appNoticeResponse>>();
    mockedApiClient.getAppNotice.mockReturnValueOnce(delayedRead.promise);
    const pendingRead = repository.getAppNotice('app-notice-1');

    await repository.toggleLike('app-notice-1');
    delayedRead.resolve(appNoticeResponse(false, 0));
    await pendingRead;
    await repository.toggleLike('app-notice-1');

    expect(mockedApiClient.likeNotice).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.unlikeNotice).toHaveBeenCalledWith('app-notice-1');
  });

  it('겹친 공지 상세 조회 중 최신 요청만 좋아요 캐시를 갱신한다', async () => {
    mockedApiClient.getAppNotice.mockResolvedValueOnce(appNoticeResponse(false, 0));
    mockedApiClient.unlikeNotice.mockResolvedValue({
      data: {isLiked: false, likeCount: 0},
      success: true,
    });
    const repository = new SpringAppNoticeRepository();

    await repository.getAppNotice('app-notice-1');
    const firstRead = deferred<ReturnType<typeof appNoticeResponse>>();
    const secondRead = deferred<ReturnType<typeof appNoticeResponse>>();
    mockedApiClient.getAppNotice
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise);

    const firstPendingRead = repository.getAppNotice('app-notice-1');
    const secondPendingRead = repository.getAppNotice('app-notice-1');
    secondRead.resolve(appNoticeResponse(true, 1));
    await secondPendingRead;
    firstRead.resolve(appNoticeResponse(false, 0));
    await firstPendingRead;

    await repository.toggleLike('app-notice-1');

    expect(mockedApiClient.unlikeNotice).toHaveBeenCalledWith('app-notice-1');
  });

  it('겹친 댓글 조회 중 최신 요청만 댓글 좋아요 캐시를 갱신한다', async () => {
    mockedApiClient.likeComment.mockResolvedValue({
      data: {commentId: 'app-comment-1', isLiked: true, likeCount: 1},
      success: true,
    });
    mockedApiClient.unlikeComment.mockResolvedValue({
      data: {commentId: 'app-comment-1', isLiked: false, likeCount: 0},
      success: true,
    });
    const repository = new SpringAppNoticeRepository();
    const firstRead = deferred<ReturnType<typeof commentResponse>>();
    const secondRead = deferred<ReturnType<typeof commentResponse>>();
    mockedApiClient.getComments
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise);

    const firstPendingRead = repository.getComments('app-notice-1');
    const secondPendingRead = repository.getComments('app-notice-1');
    secondRead.resolve(commentResponse(true, 1));
    await secondPendingRead;
    firstRead.resolve(commentResponse(false, 0));
    await firstPendingRead;

    await repository.toggleCommentLike('app-notice-1', 'app-comment-1');

    expect(mockedApiClient.likeComment).not.toHaveBeenCalled();
    expect(mockedApiClient.unlikeComment).toHaveBeenCalledWith('app-comment-1');
  });

  it('지연된 댓글 조회가 댓글 좋아요 캐시를 되돌리지 않는다', async () => {
    mockedApiClient.getComments.mockResolvedValueOnce(commentResponse(false, 0));
    mockedApiClient.likeComment.mockResolvedValue({
      data: {commentId: 'app-comment-1', isLiked: true, likeCount: 1},
      success: true,
    });
    mockedApiClient.unlikeComment.mockResolvedValue({
      data: {commentId: 'app-comment-1', isLiked: false, likeCount: 0},
      success: true,
    });
    const repository = new SpringAppNoticeRepository();

    await repository.getComments('app-notice-1');
    const delayedRead = deferred<ReturnType<typeof commentResponse>>();
    mockedApiClient.getComments.mockReturnValueOnce(delayedRead.promise);
    const pendingRead = repository.getComments('app-notice-1');

    await repository.toggleCommentLike('app-notice-1', 'app-comment-1');
    delayedRead.resolve(commentResponse(false, 0));
    await pendingRead;
    await repository.toggleCommentLike('app-notice-1', 'app-comment-1');

    expect(mockedApiClient.likeComment).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.unlikeComment).toHaveBeenCalledWith('app-comment-1');
  });

  it('계정 전환 뒤 이전 계정의 좋아요 완료를 캐시에 반영하지 않는다', async () => {
    let currentUserId: string | null = 'member-a';
    const deferredLike = deferred<{data: {isLiked: boolean; likeCount: number}; success: true}>();
    mockedApiClient.getAppNotice
      .mockResolvedValueOnce(appNoticeResponse(false, 0))
      .mockResolvedValueOnce(appNoticeResponse(false, 0));
    mockedApiClient.likeNotice
      .mockReturnValueOnce(deferredLike.promise)
      .mockResolvedValueOnce({
        data: {isLiked: true, likeCount: 1},
        success: true,
      });
    const repository = new SpringAppNoticeRepository(() => currentUserId);

    await repository.getAppNotice('app-notice-1');
    const firstLike = repository.toggleLike('app-notice-1');
    currentUserId = 'member-b';
    deferredLike.resolve({
      data: {isLiked: true, likeCount: 1},
      success: true,
    });
    await firstLike;

    await repository.getAppNotice('app-notice-1');
    await repository.toggleLike('app-notice-1');

    expect(mockedApiClient.likeNotice).toHaveBeenCalledTimes(2);
    expect(mockedApiClient.unlikeNotice).not.toHaveBeenCalled();
  });
});
