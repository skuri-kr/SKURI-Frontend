import type {ChatRoom, ChatRoomFilter} from '../../../model/types';
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
  messageRealtimeStates: Map<
    string,
    {
      mutationSubscription: {unsubscribe: jest.Mock} | null;
      subscription: {unsubscribe: jest.Mock} | null;
    }
  >;
  roomCache: Map<string, ChatRoom>;
  setCachedRoom: (chatRoomId: string, room: ChatRoom) => void;
};

const mockedChatApiClient = jest.mocked(chatApiClient);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

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

  it('참여 방 보정으로 이탈하면 메시지와 mutation 실시간 구독을 해제한다', async () => {
    const repository =
      new SpringChatRepository() as unknown as ListSubscriptionRepository;
    const messageSubscription = {unsubscribe: jest.fn()};
    const mutationSubscription = {unsubscribe: jest.fn()};
    repository.listSubscriptions.set(1, {
      callbacks: {onData: jest.fn(), onError: jest.fn()},
      filter: {category: 'all', joinedOnly: true, userId: 'member-1'},
      id: 1,
    });
    repository.roomCache.set('room-1', {
      id: 'room-1',
      isJoined: true,
      isPublic: true,
      memberCount: 3,
      name: '전체 채팅방',
      type: 'university',
    });
    repository.messageRealtimeStates.set('room-1', {
      mutationSubscription,
      subscription: messageSubscription,
    });
    mockedChatApiClient.getChatRooms.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await repository.fetchAndPublishListSubscription(1);

    expect(messageSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mutationSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(repository.roomCache.get('room-1')).toMatchObject({isJoined: false});
  });

  it('구독 해제 뒤 도착한 참여 방 목록 응답은 새 가입 상태를 덮어쓰지 않는다', async () => {
    const repository =
      new SpringChatRepository() as unknown as ListSubscriptionRepository;
    const pendingResponse = deferred<{success: true; data: []}>();
    repository.listSubscriptions.set(1, {
      callbacks: {onData: jest.fn(), onError: jest.fn()},
      filter: {category: 'all', joinedOnly: true, userId: 'member-1'},
      id: 1,
    });
    repository.roomCache.set('room-1', {
      id: 'room-1',
      isJoined: true,
      isPublic: true,
      memberCount: 3,
      name: '전체 채팅방',
      type: 'university',
    });
    mockedChatApiClient.getChatRooms.mockReturnValueOnce(pendingResponse.promise);

    const fetch = repository.fetchAndPublishListSubscription(1);
    repository.listSubscriptions.delete(1);
    pendingResponse.resolve({success: true, data: []});
    await fetch;

    expect(repository.roomCache.get('room-1')).toMatchObject({isJoined: true});
  });

  it('참여 상태가 바뀐 뒤 도착한 참여 방 목록 응답은 최신 목록으로 다시 조회한다', async () => {
    mockedChatApiClient.getChatRooms.mockReset();
    const repository =
      new SpringChatRepository() as unknown as ListSubscriptionRepository;
    const pendingResponse = deferred<{
      success: true;
      data: Array<{
        id: string;
        isMuted: boolean;
        isPublic: boolean;
        joined: boolean;
        memberCount: number;
        name: string;
        type: 'UNIVERSITY';
        unreadCount: number;
      }>;
    }>();
    const onData = jest.fn();
    repository.listSubscriptions.set(1, {
      callbacks: {onData, onError: jest.fn()},
      filter: {category: 'all', joinedOnly: true, userId: 'member-1'},
      id: 1,
    });
    repository.roomCache.set('room-c', {
      id: 'room-c',
      isJoined: false,
      isPublic: true,
      memberCount: 3,
      name: '채팅방 C',
      type: 'university',
    });
    mockedChatApiClient.getChatRooms
      .mockReturnValueOnce(pendingResponse.promise)
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'room-a',
            isMuted: false,
            isPublic: true,
            joined: true,
            memberCount: 3,
            name: '채팅방 A',
            type: 'UNIVERSITY',
            unreadCount: 0,
          },
          {
            id: 'room-b',
            isMuted: false,
            isPublic: true,
            joined: true,
            memberCount: 3,
            name: '채팅방 B',
            type: 'UNIVERSITY',
            unreadCount: 0,
          },
          {
            id: 'room-c',
            isMuted: false,
            isPublic: true,
            joined: true,
            memberCount: 3,
            name: '채팅방 C',
            type: 'UNIVERSITY',
            unreadCount: 0,
          },
        ],
      });

    const fetch = repository.fetchAndPublishListSubscription(1);
    repository.setCachedRoom('room-c', {
      ...repository.roomCache.get('room-c')!,
      isJoined: true,
    });
    pendingResponse.resolve({
      success: true,
      data: [
        {
          id: 'room-a',
          isMuted: false,
          isPublic: true,
          joined: true,
          memberCount: 3,
          name: '채팅방 A',
          type: 'UNIVERSITY',
          unreadCount: 0,
        },
        {
          id: 'room-b',
          isMuted: false,
          isPublic: true,
          joined: true,
          memberCount: 3,
          name: '채팅방 B',
          type: 'UNIVERSITY',
          unreadCount: 0,
        },
      ],
    });
    await fetch;

    expect(mockedChatApiClient.getChatRooms).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({id: 'room-a', isJoined: true}),
        expect.objectContaining({id: 'room-b', isJoined: true}),
        expect.objectContaining({id: 'room-c', isJoined: true}),
      ]),
    );
  });
});
