import {waitFor} from '@testing-library/react-native';

const mockStompClients: Array<{
  activate: jest.Mock;
  connected: boolean;
  deactivate: jest.Mock;
  onConnect: (frame: unknown) => void;
  onDisconnect: () => void;
  onStompError: (frame: unknown) => void;
  onWebSocketClose: (event: unknown) => void;
  onWebSocketError: (event: unknown) => void;
  subscribe: jest.Mock;
}> = [];

jest.mock('@/shared/realtime', () => {
  class MockMinimalStompClient {
    public activate = jest.fn();

    public connected = false;

    public deactivate = jest.fn().mockResolvedValue(undefined);

    public onConnect = () => undefined;

    public onDisconnect = () => undefined;

    public onStompError = () => undefined;

    public onWebSocketClose = () => undefined;

    public onWebSocketError = () => undefined;

    public subscribe = jest.fn(() => ({
      id: 'subscription',
      unsubscribe: jest.fn(),
    }));

    constructor() {
      mockStompClients.push(this);
    }
  }

  return {
    MinimalStompClient: MockMinimalStompClient,
    chatSocketClient: {
      buildConnectionOptions: jest.fn(),
    },
    createNativeStompSocket: jest.fn(),
  };
});

import {taxiChatApiClient} from '../../api/taxiChatApiClient';
import {taxiHomeApiClient} from '../../api/taxiHomeApiClient';
import {SpringTaxiChatRepository} from '../SpringTaxiChatRepository';

const partyResponse = {
  data: {
    departure: {lat: 37.1, lng: 127.1, name: '출발지'},
    departureTime: '2026-08-17T10:00:00',
    destination: {lat: 37.2, lng: 127.2, name: '도착지'},
    id: 'party-1',
    leaderId: 'member-1',
    maxMembers: 4,
    members: [],
    status: 'OPEN',
    tags: [],
  },
};

const roomResponse = {
  data: {
    id: 'party:party-1',
    isMuted: false,
    name: '택시 파티',
  },
};

const messagePageResponse = {
  data: {
    hasNext: false,
    messages: [
      {
        chatRoomId: 'party:party-1',
        createdAt: '2026-08-17T10:01:00',
        id: 'message-1',
        senderId: 'member-1',
        senderName: '택시 친구',
        text: '안녕하세요',
        type: 'TEXT',
      },
    ],
    nextCursor: null,
  },
};

describe('SpringTaxiChatRepository realtime reconnect', () => {
  beforeEach(() => {
    mockStompClients.splice(0);
    jest.restoreAllMocks();
  });

  it('재연결될 때 택시 채팅 이벤트를 다시 구독하고 최신 보정을 한 번만 실행한다', async () => {
    jest
      .spyOn(taxiHomeApiClient, 'getParty')
      .mockResolvedValue(partyResponse as never);
    jest
      .spyOn(taxiChatApiClient, 'getChatRoom')
      .mockResolvedValue(roomResponse as never);
    const getMessages = jest
      .spyOn(taxiChatApiClient, 'getMessages')
      .mockResolvedValue(messagePageResponse as never);
    jest.spyOn(taxiChatApiClient, 'markAsRead').mockResolvedValue({} as never);
    const repository = new SpringTaxiChatRepository();

    await repository.getPartyChat('party-1');
    repository.subscribeToPartyChat('party-1', {
      onData: jest.fn(),
      onError: jest.fn(),
    });
    const client = mockStompClients[0];

    client.connected = true;
    client.onConnect({});

    await waitFor(() => {
      expect(getMessages).toHaveBeenCalledTimes(3);
    });

    expect(
      client.subscribe.mock.calls.filter(([destination]) =>
        destination.startsWith('/topic/chat/party:party-1'),
      ),
    ).toHaveLength(2);

    client.connected = false;
    client.onDisconnect();
    client.connected = true;
    client.onConnect({});

    await waitFor(() => {
      expect(getMessages).toHaveBeenCalledTimes(4);
    });

    expect(
      client.subscribe.mock.calls.filter(([destination]) =>
        destination.startsWith('/topic/chat/party:party-1'),
      ),
    ).toHaveLength(4);
  });

  it('이전 구독의 연결 타임아웃이 새 STOMP 연결을 종료하거나 오류를 알리지 않는다', async () => {
    jest.useFakeTimers();

    try {
      jest
        .spyOn(taxiHomeApiClient, 'getParty')
        .mockResolvedValue(partyResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'getChatRoom')
        .mockResolvedValue(roomResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'getMessages')
        .mockResolvedValue(messagePageResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'markAsRead')
        .mockResolvedValue({} as never);
      const repository = new SpringTaxiChatRepository();
      const firstOnError = jest.fn();

      const unsubscribeFirst = repository.subscribeToPartyChat('party-1', {
        onData: jest.fn(),
        onError: firstOnError,
      });
      const firstClient = mockStompClients[0];

      unsubscribeFirst();

      const unsubscribeSecond = repository.subscribeToPartyChat('party-1', {
        onData: jest.fn(),
        onError: jest.fn(),
      });
      const secondClient = mockStompClients[1];

      secondClient.connected = true;
      secondClient.onConnect({});

      await jest.advanceTimersByTimeAsync(10000);

      expect(firstClient.deactivate).toHaveBeenCalledTimes(1);
      expect(secondClient.deactivate).not.toHaveBeenCalled();
      expect(firstOnError).not.toHaveBeenCalled();

      unsubscribeSecond();
    } finally {
      jest.useRealTimers();
    }
  });

  it('활성 연결이 시간 초과되면 현재 구독에 오류를 알린다', async () => {
    jest.useFakeTimers();

    try {
      jest
        .spyOn(taxiHomeApiClient, 'getParty')
        .mockResolvedValue(partyResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'getChatRoom')
        .mockResolvedValue(roomResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'getMessages')
        .mockResolvedValue(messagePageResponse as never);
      jest
        .spyOn(taxiChatApiClient, 'markAsRead')
        .mockResolvedValue({} as never);
      const repository = new SpringTaxiChatRepository();
      const onError = jest.fn();

      repository.subscribeToPartyChat('party-1', {
        onData: jest.fn(),
        onError,
      });
      const client = mockStompClients[0];

      await jest.advanceTimersByTimeAsync(10000);

      expect(client.deactivate).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('연결 중 구독을 해제하면 대기 중인 메시지 전송을 취소 오류로 종료한다', async () => {
    jest
      .spyOn(taxiHomeApiClient, 'getParty')
      .mockResolvedValue(partyResponse as never);
    jest
      .spyOn(taxiChatApiClient, 'getChatRoom')
      .mockResolvedValue(roomResponse as never);
    jest
      .spyOn(taxiChatApiClient, 'getMessages')
      .mockResolvedValue(messagePageResponse as never);
    jest.spyOn(taxiChatApiClient, 'markAsRead').mockResolvedValue({} as never);
    const repository = new SpringTaxiChatRepository();
    const onError = jest.fn();
    const unsubscribe = repository.subscribeToPartyChat('party-1', {
      onData: jest.fn(),
      onError,
    });
    const client = mockStompClients[0];
    const pendingSend = repository.sendMessage('party-1', '안녕하세요');

    unsubscribe();

    await expect(pendingSend).rejects.toThrow('채팅 실시간 연결이 취소되었습니다.');
    expect(client.deactivate).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
