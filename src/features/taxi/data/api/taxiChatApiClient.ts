import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  ChatMessagePageResponseDto,
  ChatMessageResponseDto,
  ChatReadUpdateResponseDto,
  ChatRoomDetailResponseDto,
  ChatRoomSettingsResponseDto,
  UpdateChatMessageRequestDto,
} from '../dto/taxiChatDto';

export class TaxiChatApiClient {
  getChatRoom(chatRoomId: string) {
    return httpClient.get<ApiSuccessResponse<ChatRoomDetailResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}`,
    );
  }

  getMessages(
    chatRoomId: string,
    params?: {
      cursorCreatedAt?: string;
      cursorId?: string;
      size?: number;
    },
  ) {
    return httpClient.get<ApiSuccessResponse<ChatMessagePageResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/messages`,
      {
        params,
      },
    );
  }

  updateMessage(
    chatRoomId: string,
    messageId: string,
    request: UpdateChatMessageRequestDto,
  ) {
    return httpClient.patch<
      ApiSuccessResponse<ChatMessageResponseDto>,
      UpdateChatMessageRequestDto
    >(`/v1/chat-rooms/${chatRoomId}/messages/${messageId}`, request);
  }

  deleteMessage(chatRoomId: string, messageId: string) {
    return httpClient.delete<ApiSuccessResponse<ChatMessageResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/messages/${messageId}`,
    );
  }

  markAsRead(chatRoomId: string, lastReadAt: string) {
    return httpClient.patch<ApiSuccessResponse<ChatReadUpdateResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/read`,
      {
        lastReadAt,
      },
    );
  }

  updateSettings(chatRoomId: string, muted: boolean) {
    return httpClient.patch<ApiSuccessResponse<ChatRoomSettingsResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/settings`,
      {
        muted,
      },
    );
  }
}

export const taxiChatApiClient = new TaxiChatApiClient();
