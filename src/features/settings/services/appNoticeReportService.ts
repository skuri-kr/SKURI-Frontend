import type {IReportRepository, ReportCategory} from '@/features/report';

export const APP_NOTICE_REPORT_CATEGORIES: ReportCategory[] = [
  '스팸',
  '욕설/혐오',
  '불법/위험',
  '음란물',
  '기타',
];

export const submitAppNoticeCommentReport = (
  repository: IReportRepository,
  commentId: string,
  category: ReportCategory,
  reason: string,
) =>
  repository.createReport({
    category,
    reason: reason.trim(),
    targetId: commentId,
    targetType: 'APP_NOTICE_COMMENT',
  });
