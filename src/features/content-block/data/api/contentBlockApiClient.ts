import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  ContentBlockResponseDto,
  CreateContentBlockRequestDto,
} from '../dto/contentBlockDto';

export class ContentBlockApiClient {
  createContentBlock(data: CreateContentBlockRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<ContentBlockResponseDto>,
      CreateContentBlockRequestDto
    >('/v1/content-blocks', data);
  }

  deleteContentBlock(blockId: string) {
    return httpClient.delete<void>(
      `/v1/content-blocks/${encodeURIComponent(blockId)}`,
    );
  }

  getContentBlocks() {
    return httpClient.get<ApiSuccessResponse<ContentBlockResponseDto[]>>(
      '/v1/content-blocks',
    );
  }
}

export const contentBlockApiClient = new ContentBlockApiClient();
