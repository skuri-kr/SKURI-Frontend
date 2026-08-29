import type {ApiSuccessResponse} from './apiResponse';
import {httpClient} from './httpClient';

export type ReportTargetTypeDto =
  | 'CHAT_MESSAGE'
  | 'CHAT_ROOM'
  | 'COMMENT'
  | 'NOTICE_COMMENT'
  | 'APP_NOTICE_COMMENT'
  | 'MEMBER'
  | 'POST'
  | 'TAXI_PARTY';

export interface CreateReportRequestDto {
  category: string;
  reason: string;
  targetId: string;
  targetType: ReportTargetTypeDto;
}

export interface CreateReportResponseDto {
  createdAt: string;
  id: string;
  status: 'PENDING' | 'REVIEWING' | 'ACTIONED' | 'REJECTED';
}

export class ReportApiClient {
  createReport(data: CreateReportRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<CreateReportResponseDto>,
      CreateReportRequestDto
    >('/v1/reports', data);
  }
}

export const reportApiClient = new ReportApiClient();
