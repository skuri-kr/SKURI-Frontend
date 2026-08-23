import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  ChatRoomInvitationEligibleFriendsResponseDto,
  ChatRoomInvitationMutationResponseDto,
  ChatRoomInvitationReceivedResponseDto,
  CreateFriendInvitationsRequestDto,
  CreateFriendRequestRequestDto,
  CreateMemberBlockRequestDto,
  FriendBlockResponseDto,
  FriendCodePreviewRequestDto,
  FriendCodePreviewResponseDto,
  FriendCodeResponseDto,
  FriendInboxCountsResponseDto,
  FriendMinecraftAccountsResponseDto,
  FriendPrivacyResponseDto,
  FriendRequestMutationResponseDto,
  FriendRequestPageResponseDto,
  FriendSearchPageResponseDto,
  FriendSummaryResponseDto,
  FriendInvitationBatchResponseDto,
  PartyInvitationEligibleFriendsResponseDto,
  PartyInvitationMutationResponseDto,
  PartyInvitationReceivedResponseDto,
  UpdateFriendFavoriteRequestDto,
  UpdateFriendPrivacyRequestDto,
} from '../dto/friendDto';

export type FriendRequestDirectionDto = 'RECEIVED' | 'SENT';

export class FriendApiClient {
  getFriends() {
    return httpClient.get<ApiSuccessResponse<FriendSummaryResponseDto[]>>(
      '/v1/friends',
    );
  }

  getFriend(friendPublicId: string) {
    return httpClient.get<ApiSuccessResponse<FriendSummaryResponseDto>>(
      `/v1/friends/${encodeURIComponent(friendPublicId)}`,
    );
  }

  getFriendMinecraftAccounts(friendPublicId: string) {
    return httpClient.get<ApiSuccessResponse<FriendMinecraftAccountsResponseDto>>(
      `/v1/friends/${encodeURIComponent(friendPublicId)}/minecraft-accounts`,
    );
  }

  removeFriend(friendPublicId: string) {
    return httpClient.delete<void>(
      `/v1/friends/${encodeURIComponent(friendPublicId)}`,
    );
  }

  updateFavorite(
    friendPublicId: string,
    data: UpdateFriendFavoriteRequestDto,
  ) {
    return httpClient.patch<void, UpdateFriendFavoriteRequestDto>(
      `/v1/friends/${encodeURIComponent(friendPublicId)}/favorite`,
      data,
    );
  }

  searchFriends(params: {cursor?: string | null; query: string; size?: number}) {
    return httpClient.get<ApiSuccessResponse<FriendSearchPageResponseDto>>(
      '/v1/friends/search',
      {params},
    );
  }

  getFriendRequests(params: {
    cursor?: string | null;
    direction: FriendRequestDirectionDto;
    size?: number;
  }) {
    return httpClient.get<ApiSuccessResponse<FriendRequestPageResponseDto>>(
      '/v1/friend-requests',
      {params},
    );
  }

  createFriendRequest(data: CreateFriendRequestRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<FriendRequestMutationResponseDto>,
      CreateFriendRequestRequestDto
    >('/v1/friend-requests', data);
  }

  acceptFriendRequest(requestId: string) {
    return httpClient.post<ApiSuccessResponse<FriendRequestMutationResponseDto>>(
      `/v1/friend-requests/${encodeURIComponent(requestId)}/accept`,
    );
  }

  declineFriendRequest(requestId: string) {
    return httpClient.post<void>(
      `/v1/friend-requests/${encodeURIComponent(requestId)}/decline`,
    );
  }

  cancelFriendRequest(requestId: string) {
    return httpClient.delete<void>(
      `/v1/friend-requests/${encodeURIComponent(requestId)}`,
    );
  }

  getBlocks() {
    return httpClient.get<ApiSuccessResponse<FriendBlockResponseDto[]>>(
      '/v1/friends/blocks',
    );
  }

  blockMember(data: CreateMemberBlockRequestDto) {
    return httpClient.post<void, CreateMemberBlockRequestDto>(
      '/v1/friends/blocks',
      data,
    );
  }

  unblockMember(friendPublicId: string) {
    return httpClient.delete<void>(
      `/v1/friends/blocks/${encodeURIComponent(friendPublicId)}`,
    );
  }

  getInboxCounts() {
    return httpClient.get<ApiSuccessResponse<FriendInboxCountsResponseDto>>(
      '/v1/friends/inbox-counts',
    );
  }

  getMyCode() {
    return httpClient.get<ApiSuccessResponse<FriendCodeResponseDto>>(
      '/v1/friends/me/code',
    );
  }

  regenerateMyCode() {
    return httpClient.post<ApiSuccessResponse<FriendCodeResponseDto>>(
      '/v1/friends/me/code/regenerate',
    );
  }

  previewFriendCode(data: FriendCodePreviewRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<FriendCodePreviewResponseDto>,
      FriendCodePreviewRequestDto
    >('/v1/friend-codes/preview', data);
  }

  getMyPrivacy() {
    return httpClient.get<ApiSuccessResponse<FriendPrivacyResponseDto>>(
      '/v1/friends/me/privacy',
    );
  }

  updateMyPrivacy(data: UpdateFriendPrivacyRequestDto) {
    return httpClient.patch<
      ApiSuccessResponse<FriendPrivacyResponseDto>,
      UpdateFriendPrivacyRequestDto
    >('/v1/friends/me/privacy', data);
  }

  getPartyInvitationEligibleFriends(partyId: string) {
    return httpClient.get<
      ApiSuccessResponse<PartyInvitationEligibleFriendsResponseDto>
    >(`/v1/parties/${encodeURIComponent(partyId)}/invitations/eligible-friends`);
  }

  createPartyInvitations(
    partyId: string,
    data: CreateFriendInvitationsRequestDto,
  ) {
    return httpClient.post<
      ApiSuccessResponse<FriendInvitationBatchResponseDto>,
      CreateFriendInvitationsRequestDto
    >(`/v1/parties/${encodeURIComponent(partyId)}/invitations`, data);
  }

  getReceivedPartyInvitations() {
    return httpClient.get<
      ApiSuccessResponse<PartyInvitationReceivedResponseDto[]>
    >('/v1/party-invitations/received');
  }

  acceptPartyInvitation(invitationId: string) {
    return httpClient.post<
      ApiSuccessResponse<PartyInvitationMutationResponseDto>
    >(`/v1/party-invitations/${encodeURIComponent(invitationId)}/accept`);
  }

  declinePartyInvitation(invitationId: string) {
    return httpClient.post<
      ApiSuccessResponse<PartyInvitationMutationResponseDto>
    >(`/v1/party-invitations/${encodeURIComponent(invitationId)}/decline`);
  }

  deletePartyInvitation(invitationId: string) {
    return httpClient.delete<void>(
      `/v1/party-invitations/${encodeURIComponent(invitationId)}`,
    );
  }

  getChatRoomInvitationEligibleFriends(chatRoomId: string) {
    return httpClient.get<
      ApiSuccessResponse<ChatRoomInvitationEligibleFriendsResponseDto>
    >(
      `/v1/chat-rooms/${encodeURIComponent(chatRoomId)}/invitations/eligible-friends`,
    );
  }

  createChatRoomInvitations(
    chatRoomId: string,
    data: CreateFriendInvitationsRequestDto,
  ) {
    return httpClient.post<
      ApiSuccessResponse<FriendInvitationBatchResponseDto>,
      CreateFriendInvitationsRequestDto
    >(`/v1/chat-rooms/${encodeURIComponent(chatRoomId)}/invitations`, data);
  }

  getReceivedChatRoomInvitations() {
    return httpClient.get<
      ApiSuccessResponse<ChatRoomInvitationReceivedResponseDto[]>
    >('/v1/chat-room-invitations/received');
  }

  acceptChatRoomInvitation(invitationId: string) {
    return httpClient.post<
      ApiSuccessResponse<ChatRoomInvitationMutationResponseDto>
    >(`/v1/chat-room-invitations/${encodeURIComponent(invitationId)}/accept`);
  }

  declineChatRoomInvitation(invitationId: string) {
    return httpClient.post<
      ApiSuccessResponse<ChatRoomInvitationMutationResponseDto>
    >(`/v1/chat-room-invitations/${encodeURIComponent(invitationId)}/decline`);
  }

  deleteChatRoomInvitation(invitationId: string) {
    return httpClient.delete<void>(
      `/v1/chat-room-invitations/${encodeURIComponent(invitationId)}`,
    );
  }
}

export const friendApiClient = new FriendApiClient();
