import {appNoticeApiClient} from '../../api/appNoticeApiClient';
import {SpringAppNoticeRepository} from '../SpringAppNoticeRepository';

jest.mock('../../api/appNoticeApiClient', () => ({
  appNoticeApiClient: {
    deleteComment: jest.fn(),
    getComments: jest.fn(),
    updateComment: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(appNoticeApiClient);

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
});
