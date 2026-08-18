import {
  friendApiClient,
  type FriendApiClient,
} from '../api/friendApiClient';
import {
  mapFriendBlockDto,
  mapFriendCodeDto,
  mapFriendCodePreviewDto,
  mapFriendInboxCountsDto,
  mapFriendPrivacyDto,
  mapFriendRequestMutationDto,
  mapFriendRequestPageDto,
  mapFriendSearchPageDto,
  mapFriendSummaryDto,
} from '../mappers/friendApiMappers';
import type {
  FriendRequestDirection,
  FriendSummary,
} from '../../model/friend';
import type {IFriendRepository} from './IFriendRepository';

const FRIEND_NAME_COLLATOR = new Intl.Collator('ko');

const sortFriends = (friends: FriendSummary[]) =>
  [...friends].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return FRIEND_NAME_COLLATOR.compare(left.nickname, right.nickname);
  });

export class SpringFriendRepository implements IFriendRepository {
  constructor(private readonly apiClient: FriendApiClient = friendApiClient) {}

  async getFriends() {
    const response = await this.apiClient.getFriends();
    return sortFriends(response.data.map(mapFriendSummaryDto));
  }

  async getFriend(friendPublicId: string) {
    const response = await this.apiClient.getFriend(friendPublicId);
    return mapFriendSummaryDto(response.data);
  }

  async removeFriend(friendPublicId: string) {
    await this.apiClient.removeFriend(friendPublicId);
  }

  async updateFavorite(friendPublicId: string, favorite: boolean) {
    await this.apiClient.updateFavorite(friendPublicId, {favorite});
  }

  async searchFriends(params: {
    cursor?: string | null;
    query: string;
    size?: number;
  }) {
    const response = await this.apiClient.searchFriends({
      ...params,
      query: params.query.trim(),
    });
    return mapFriendSearchPageDto(response.data);
  }

  async getFriendRequests(params: {
    cursor?: string | null;
    direction: FriendRequestDirection;
    size?: number;
  }) {
    const response = await this.apiClient.getFriendRequests(params);
    return mapFriendRequestPageDto(response.data);
  }

  async createFriendRequest(friendPublicId: string) {
    const response = await this.apiClient.createFriendRequest({friendPublicId});
    return mapFriendRequestMutationDto(response.data);
  }

  async acceptFriendRequest(requestId: string) {
    const response = await this.apiClient.acceptFriendRequest(requestId);
    return mapFriendRequestMutationDto(response.data);
  }

  async declineFriendRequest(requestId: string) {
    await this.apiClient.declineFriendRequest(requestId);
  }

  async cancelFriendRequest(requestId: string) {
    await this.apiClient.cancelFriendRequest(requestId);
  }

  async getBlocks() {
    const response = await this.apiClient.getBlocks();
    return response.data.map(mapFriendBlockDto);
  }

  async blockMember(friendPublicId: string) {
    await this.apiClient.blockMember({friendPublicId});
  }

  async unblockMember(friendPublicId: string) {
    await this.apiClient.unblockMember(friendPublicId);
  }

  async getInboxCounts() {
    const response = await this.apiClient.getInboxCounts();
    return mapFriendInboxCountsDto(response.data);
  }

  async getMyCode() {
    const response = await this.apiClient.getMyCode();
    return mapFriendCodeDto(response.data);
  }

  async regenerateMyCode() {
    const response = await this.apiClient.regenerateMyCode();
    return mapFriendCodeDto(response.data);
  }

  async previewFriendCode(friendCode: string) {
    const response = await this.apiClient.previewFriendCode({
      friendCode: friendCode.trim(),
    });
    return mapFriendCodePreviewDto(response.data);
  }

  async getMyPrivacy() {
    const response = await this.apiClient.getMyPrivacy();
    return mapFriendPrivacyDto(response.data);
  }

  async updateMyPrivacy(nicknameSearchable: boolean) {
    const response = await this.apiClient.updateMyPrivacy({nicknameSearchable});
    return mapFriendPrivacyDto(response.data);
  }
}
