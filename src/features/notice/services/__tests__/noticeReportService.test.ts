import type {IReportRepository} from '@/features/report';

import {submitNoticeCommentReport} from '../noticeReportService';

describe('submitNoticeCommentReport', () => {
  it('NOTICE_COMMENT 타입으로 정리된 신고 사유를 전송한다', async () => {
    const createReport = jest.fn().mockResolvedValue({
      createdAt: '2026-08-27T12:00:00',
      id: 'report-1',
      status: 'PENDING',
    });
    const reportRepository: IReportRepository = {createReport};

    await expect(
      submitNoticeCommentReport(
        reportRepository,
        'notice-comment-1',
        '욕설/혐오',
        '  부적절한 공지 댓글입니다.  ',
      ),
    ).resolves.toBe('report-1');

    expect(createReport).toHaveBeenCalledWith({
      category: '욕설/혐오',
      reason: '부적절한 공지 댓글입니다.',
      targetId: 'notice-comment-1',
      targetType: 'NOTICE_COMMENT',
    });
  });
});
