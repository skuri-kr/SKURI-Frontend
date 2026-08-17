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

import {SpringChatRepository} from '../SpringChatRepository';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('SpringChatRepository realtime reconnect', () => {
  beforeEach(() => {
    mockStompClients.splice(0);
  });

  it('재연결될 때 공개 채팅 메시지와 수정 이벤트를 다시 구독하고 보정을 한 번 알린다', async () => {
    const repository = new SpringChatRepository();
    const onRealtimeReady = jest.fn();
    const subscription = repository.subscribeToNewMessages('room-1', null, {
      onError: jest.fn(),
      onMessageMutation: jest.fn(),
      onNewMessages: jest.fn(),
      onRealtimeReady,
    });
    const client = mockStompClients[0];

    client.connected = true;
    client.onConnect({});
    await subscription.ready;
    await flushMicrotasks();

    expect(onRealtimeReady).toHaveBeenCalledTimes(1);
    expect(
      client.subscribe.mock.calls.filter(([destination]) =>
        destination.startsWith('/topic/chat/room-1'),
      ),
    ).toHaveLength(2);

    client.connected = false;
    client.onDisconnect();
    client.connected = true;
    client.onConnect({});
    await flushMicrotasks();

    expect(onRealtimeReady).toHaveBeenCalledTimes(2);
    expect(
      client.subscribe.mock.calls.filter(([destination]) =>
        destination.startsWith('/topic/chat/room-1'),
      ),
    ).toHaveLength(4);
  });
});
