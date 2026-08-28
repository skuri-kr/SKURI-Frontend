import {appNoticeApiClient} from '../../api/appNoticeApiClient';
import {SpringAppNoticeRepository} from '../SpringAppNoticeRepository';

jest.mock('../../api/appNoticeApiClient', () => ({
  appNoticeApiClient: {
    deleteComment: jest.fn(),
    getComments: jest.fn(),
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
});
