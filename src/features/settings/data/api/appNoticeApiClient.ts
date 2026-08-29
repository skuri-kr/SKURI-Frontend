import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  AppNoticeReadResponseDto,
  AppNoticeResponseDto,
  AppNoticeUnreadCountResponseDto,
} from '../dto/appNoticeDto';
import type {
  CreateNoticeCommentRequestDto,
  NoticeCommentDto,
  NoticeCommentLikeResponseDto,
  NoticeLikeResponseDto,
  UpdateNoticeCommentRequestDto,
} from '@/features/notice/data/dto/noticeDto';

export class AppNoticeApiClient {
  getAppNotice(noticeId: string) {
    return httpClient.get<ApiSuccessResponse<AppNoticeResponseDto>>(
      `/v1/app-notices/${noticeId}`,
      {
        optionalAuth: true,
      },
    );
  }

  getAppNotices() {
    return httpClient.get<ApiSuccessResponse<AppNoticeResponseDto[]>>(
      '/v1/app-notices',
      {
        requiresAuth: false,
      },
    );
  }

  getUnreadCount() {
    return httpClient.get<ApiSuccessResponse<AppNoticeUnreadCountResponseDto>>(
      '/v1/members/me/app-notices/unread-count',
    );
  }

  markAsRead(noticeId: string) {
    return httpClient.post<ApiSuccessResponse<AppNoticeReadResponseDto>>(
      `/v1/members/me/app-notices/${noticeId}/read`,
    );
  }

  getComments(noticeId: string) {
    return httpClient.get<ApiSuccessResponse<NoticeCommentDto[]>>(
      `/v1/app-notices/${noticeId}/comments`,
    );
  }

  createComment(noticeId: string, data: CreateNoticeCommentRequestDto) {
    return httpClient.post<ApiSuccessResponse<NoticeCommentDto>, CreateNoticeCommentRequestDto>(
      `/v1/app-notices/${noticeId}/comments`,
      data,
    );
  }

  updateComment(commentId: string, data: UpdateNoticeCommentRequestDto) {
    return httpClient.patch<ApiSuccessResponse<NoticeCommentDto>, UpdateNoticeCommentRequestDto>(
      `/v1/app-notice-comments/${commentId}`,
      data,
    );
  }

  deleteComment(commentId: string) {
    return httpClient.delete<ApiSuccessResponse<null>>(
      `/v1/app-notice-comments/${commentId}`,
    );
  }

  likeNotice(noticeId: string) {
    return httpClient.post<ApiSuccessResponse<NoticeLikeResponseDto>>(
      `/v1/app-notices/${noticeId}/like`,
    );
  }

  unlikeNotice(noticeId: string) {
    return httpClient.delete<ApiSuccessResponse<NoticeLikeResponseDto>>(
      `/v1/app-notices/${noticeId}/like`,
    );
  }

  likeComment(commentId: string) {
    return httpClient.post<ApiSuccessResponse<NoticeCommentLikeResponseDto>>(
      `/v1/app-notice-comments/${commentId}/like`,
    );
  }

  unlikeComment(commentId: string) {
    return httpClient.delete<ApiSuccessResponse<NoticeCommentLikeResponseDto>>(
      `/v1/app-notice-comments/${commentId}/like`,
    );
  }
}

export const appNoticeApiClient = new AppNoticeApiClient();
