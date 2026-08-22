import type {
  FriendBlock,
  FriendCode,
  FriendCodePreview,
  FriendInboxCounts,
  FriendMinecraftAccounts,
  FriendPrivacy,
  FriendRequestDirection,
  FriendRequestMutation,
  FriendRequestPage,
  FriendSearchPage,
  FriendSummary,
} from '../../model/friend';

export interface IFriendRepository {
  acceptFriendRequest(requestId: string): Promise<FriendRequestMutation>;
  blockMember(friendPublicId: string): Promise<void>;
  cancelFriendRequest(requestId: string): Promise<void>;
  createFriendRequest(friendPublicId: string): Promise<FriendRequestMutation>;
  declineFriendRequest(requestId: string): Promise<void>;
  getBlocks(): Promise<FriendBlock[]>;
  getFriend(friendPublicId: string): Promise<FriendSummary>;
  getFriendMinecraftAccounts(friendPublicId: string): Promise<FriendMinecraftAccounts>;
  getFriendRequests(params: {
    cursor?: string | null;
    direction: FriendRequestDirection;
    size?: number;
  }): Promise<FriendRequestPage>;
  getFriends(): Promise<FriendSummary[]>;
  getInboxCounts(): Promise<FriendInboxCounts>;
  getMyCode(): Promise<FriendCode>;
  getMyPrivacy(): Promise<FriendPrivacy>;
  previewFriendCode(friendCode: string): Promise<FriendCodePreview>;
  regenerateMyCode(): Promise<FriendCode>;
  removeFriend(friendPublicId: string): Promise<void>;
  searchFriends(params: {
    cursor?: string | null;
    query: string;
    size?: number;
  }): Promise<FriendSearchPage>;
  unblockMember(friendPublicId: string): Promise<void>;
  updateFavorite(friendPublicId: string, favorite: boolean): Promise<void>;
  updateMyPrivacy(nicknameSearchable: boolean): Promise<FriendPrivacy>;
}
