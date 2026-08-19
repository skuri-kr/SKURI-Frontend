import type {FriendApiClient} from '../../api/friendApiClient';
import {SpringFriendRepository} from '../SpringFriendRepository';

describe('SpringFriendRepository', () => {
  const createApiClient = (): jest.Mocked<FriendApiClient> =>
    ({
      acceptFriendRequest: jest.fn(),
      blockMember: jest.fn(),
      cancelFriendRequest: jest.fn(),
      createFriendRequest: jest.fn(),
      declineFriendRequest: jest.fn(),
      getBlocks: jest.fn(),
      getFriend: jest.fn(),
      getFriendRequests: jest.fn(),
      getFriends: jest.fn(),
      getInboxCounts: jest.fn(),
      getMyCode: jest.fn(),
      getMyPrivacy: jest.fn(),
      previewFriendCode: jest.fn(),
      regenerateMyCode: jest.fn(),
      removeFriend: jest.fn(),
      searchFriends: jest.fn(),
      unblockMember: jest.fn(),
      updateFavorite: jest.fn(),
      updateMyPrivacy: jest.fn(),
    }) as jest.Mocked<FriendApiClient>;

  it('친구 목록을 즐겨찾기 우선, 가나다순으로 정렬한다', async () => {
    const apiClient = createApiClient();
    apiClient.getFriends.mockResolvedValue({
      data: [
        {
          department: null,
          favorite: false,
          friendPublicId: 'friend-3',
          nickname: '하늘',
          photoUrl: null,
        },
        {
          department: '컴퓨터공학과',
          favorite: true,
          friendPublicId: 'friend-1',
          nickname: '다은',
          photoUrl: 'https://example.com/da-eun.jpg',
        },
        {
          department: null,
          favorite: true,
          friendPublicId: 'friend-2',
          nickname: '가람',
          photoUrl: null,
        },
        {
          department: null,
          favorite: true,
          friendPublicId: 'friend-0',
          nickname: '가람',
          photoUrl: null,
        },
      ],
      success: true,
    });

    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.getFriends()).resolves.toEqual([
      {
        department: null,
        favorite: true,
        id: 'friend-0',
        nickname: '가람',
        photoUrl: null,
      },
      {
        department: null,
        favorite: true,
        id: 'friend-2',
        nickname: '가람',
        photoUrl: null,
      },
      {
        department: '컴퓨터공학과',
        favorite: true,
        id: 'friend-1',
        nickname: '다은',
        photoUrl: 'https://example.com/da-eun.jpg',
      },
      {
        department: null,
        favorite: false,
        id: 'friend-3',
        nickname: '하늘',
        photoUrl: null,
      },
    ]);
  });

  it('검색어와 친구 코드를 정리해 API에 전달한다', async () => {
    const apiClient = createApiClient();
    apiClient.searchFriends.mockResolvedValue({
      data: {hasNext: false, items: [], nextCursor: null},
      success: true,
    });
    apiClient.previewFriendCode.mockResolvedValue({
      data: {
        canSendFriendRequest: true,
        department: null,
        friendPublicId: 'friend-1',
        nickname: '스쿠리',
        photoUrl: null,
      },
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await repository.searchFriends({query: '  스쿠리  '});
    await repository.previewFriendCode('  SKR-7K4M-9Q2D  ');

    expect(apiClient.searchFriends).toHaveBeenCalledWith({query: '스쿠리'});
    expect(apiClient.previewFriendCode).toHaveBeenCalledWith({
      friendCode: 'SKR-7K4M-9Q2D',
    });
  });

  it('수락 결과의 PENDING 응답에는 친구 값을 만들지 않는다', async () => {
    const apiClient = createApiClient();
    apiClient.createFriendRequest.mockResolvedValue({
      data: {requestId: 'request-1', status: 'PENDING'},
      success: true,
    });
    const repository = new SpringFriendRepository(apiClient);

    await expect(repository.createFriendRequest('friend-1')).resolves.toEqual({
      friend: null,
      requestId: 'request-1',
      status: 'PENDING',
    });
  });
});
