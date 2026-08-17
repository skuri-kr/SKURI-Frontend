import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  ChatMessagePageResponseDto,
  ChatMessageResponseDto,
  ChatReadUpdateRequestDto,
  ChatReadUpdateResponseDto,
  ChatRoomDetailResponseDto,
  ChatRoomSettingsRequestDto,
  ChatRoomSettingsResponseDto,
  ChatRoomSummaryResponseDto,
  CreateChatRoomRequestDto,
  UpdateChatMessageRequestDto,
} from '../dto/chatDto';

export class ChatApiClient {
  getChatRooms(params?: {joined?: boolean; type?: string}) {
    return httpClient.get<ApiSuccessResponse<ChatRoomSummaryResponseDto[]>>(
      '/v1/chat-rooms',
      {
        params,
      },
    );
  }

  getChatRoom(chatRoomId: string) {
    return httpClient.get<ApiSuccessResponse<ChatRoomDetailResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}`,
    );
  }

  createChatRoom(request: CreateChatRoomRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<ChatRoomDetailResponseDto>,
      CreateChatRoomRequestDto
    >('/v1/chat-rooms', request);
  }

  joinChatRoom(chatRoomId: string) {
    return httpClient.post<ApiSuccessResponse<ChatRoomDetailResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/join`,
    );
  }

  leaveChatRoom(chatRoomId: string) {
    return httpClient.delete<ApiSuccessResponse<ChatRoomDetailResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/members/me`,
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

  markAsRead(chatRoomId: string, request: ChatReadUpdateRequestDto) {
    return httpClient.patch<ApiSuccessResponse<ChatReadUpdateResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/read`,
      request,
    );
  }

  updateSettings(chatRoomId: string, request: ChatRoomSettingsRequestDto) {
    return httpClient.patch<ApiSuccessResponse<ChatRoomSettingsResponseDto>>(
      `/v1/chat-rooms/${chatRoomId}/settings`,
      request,
    );
  }
}

export const chatApiClient = new ChatApiClient();
