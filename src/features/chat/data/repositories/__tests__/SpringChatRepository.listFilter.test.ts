import type {ChatRoomFilter} from '../../../model/types';
import {chatApiClient} from '../../api/chatApiClient';
import {SpringChatRepository} from '../SpringChatRepository';

jest.mock('../../api/chatApiClient', () => ({
  chatApiClient: {
    getChatRooms: jest.fn(),
  },
}));

type ListFilterBuilder = {
  buildListFilter: (filter: ChatRoomFilter) => {
    joined?: boolean;
    type?: string;
  };
};

type ListSubscriptionRepository = {
  fetchAndPublishListSubscription: (subscriptionId: number) => Promise<void>;
  listSubscriptions: Map<
    number,
    {
      callbacks: {onData: jest.Mock; onError: jest.Mock};
      filter: ChatRoomFilter;
      id: number;
    }
  >;
};

const mockedChatApiClient = jest.mocked(chatApiClient);

describe('SpringChatRepository list filter', () => {
  it('참여 중인 방 구독은 joined=true 요청으로 변환한다', () => {
    const repository =
      new SpringChatRepository() as unknown as ListFilterBuilder;

    expect(
      repository.buildListFilter({
        category: 'all',
        joinedOnly: true,
        userId: 'member-1',
      }),
    ).toEqual({joined: true});
  });

  it('참여 방 보정으로 바뀐 membership을 모든 목록 구독자에게 다시 발행한다', async () => {
    const repository =
      new SpringChatRepository() as unknown as ListSubscriptionRepository;
    const allOnData = jest.fn();
    const joinedOnData = jest.fn();
    repository.listSubscriptions.set(1, {
      callbacks: {onData: allOnData, onError: jest.fn()},
      filter: {category: 'all', userId: 'member-1'},
      id: 1,
    });
    repository.listSubscriptions.set(2, {
      callbacks: {onData: joinedOnData, onError: jest.fn()},
      filter: {category: 'all', joinedOnly: true, userId: 'member-1'},
      id: 2,
    });
    mockedChatApiClient.getChatRooms
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'room-1',
            isMuted: false,
            isPublic: true,
            joined: true,
            memberCount: 3,
            name: '전체 채팅방',
            type: 'UNIVERSITY',
            unreadCount: 2,
          },
        ],
      })
      .mockResolvedValueOnce({success: true, data: []});

    await repository.fetchAndPublishListSubscription(1);
    allOnData.mockClear();
    joinedOnData.mockClear();

    await repository.fetchAndPublishListSubscription(2);

    expect(allOnData).toHaveBeenLastCalledWith([
      expect.objectContaining({id: 'room-1', isJoined: false, unreadCount: 0}),
    ]);
    expect(joinedOnData).toHaveBeenLastCalledWith([]);
  });
});
