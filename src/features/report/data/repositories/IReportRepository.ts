export type ReportCategory =
  | '스팸'
  | '욕설/혐오'
  | '불법/위험'
  | '음란물'
  | '기타';

export type ReportTargetType =
  | 'POST'
  | 'COMMENT'
  | 'NOTICE_COMMENT'
  | 'APP_NOTICE_COMMENT'
  | 'MEMBER'
  | 'CHAT_MESSAGE'
  | 'CHAT_ROOM'
  | 'TAXI_PARTY';

export type ReportStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'ACTIONED'
  | 'REJECTED';

export interface CreateReportPayload {
  category: ReportCategory;
  reason: string;
  targetId: string;
  targetType: ReportTargetType;
}

export interface ReportReceipt {
  createdAt: string;
  id: string;
  status: ReportStatus;
}

export interface IReportRepository {
  createReport(payload: CreateReportPayload): Promise<ReportReceipt>;
}
