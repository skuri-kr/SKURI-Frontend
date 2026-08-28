import type {IReportRepository} from '@/features/report';

import {submitAppNoticeCommentReport} from '../appNoticeReportService';

describe('submitAppNoticeCommentReport', () => {
  it('APP_NOTICE_COMMENT 타입과 정리된 사유를 전송한다', async () => {
    const receipt = {
      createdAt: '2026-08-29T12:00:00',
      id: 'report-1',
      status: 'PENDING' as const,
    };
    const createReport = jest.fn().mockResolvedValue(receipt);
    const repository: IReportRepository = {createReport};

    await expect(
      submitAppNoticeCommentReport(
        repository,
        'app-comment-1',
        '욕설/혐오',
        '  부적절한 앱 공지 댓글입니다.  ',
      ),
    ).resolves.toEqual(receipt);

    expect(createReport).toHaveBeenCalledWith({
      category: '욕설/혐오',
      reason: '부적절한 앱 공지 댓글입니다.',
      targetId: 'app-comment-1',
      targetType: 'APP_NOTICE_COMMENT',
    });
  });
});
