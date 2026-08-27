import type {
  IReportRepository,
  ReportCategory,
} from '@/features/report';

export const NOTICE_REPORT_CATEGORIES: ReportCategory[] = [
  '스팸',
  '욕설/혐오',
  '불법/위험',
  '음란물',
  '기타',
];

export function submitNoticeCommentReport(
  reportRepository: IReportRepository,
  commentId: string,
  category: ReportCategory,
  reason: string,
): Promise<string> {
  return reportRepository
    .createReport({
      category,
      reason: reason.trim(),
      targetId: commentId,
      targetType: 'NOTICE_COMMENT',
    })
    .then(response => response.id);
}
