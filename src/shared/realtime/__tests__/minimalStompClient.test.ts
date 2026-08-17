import {MinimalStompClient, type StompSocket} from '../minimalStompClient';

class FakeStompSocket implements StompSocket {
  public binaryType: 'blob' | 'arraybuffer' | undefined;

  public readyState = 1;

  public readonly sentFrames: Array<string | ArrayBuffer | ArrayBufferView> =
    [];

  public onclose: ((event?: any) => void) | null = null;

  public onerror: ((event?: any) => void) | null = null;

  public onmessage: ((event?: {data?: string | ArrayBuffer}) => void) | null =
    null;

  public onopen: ((event?: any) => void) | null = null;

  constructor(public readonly url: string) {}

  close = () => {
    this.readyState = 3;
    this.onclose?.({code: 1006, reason: 'network lost', wasClean: false});
  };

  send = (data: string | ArrayBuffer | ArrayBufferView) => {
    this.sentFrames.push(data);
  };

  emitConnected() {
    this.onmessage?.({data: 'CONNECTED\n\n\0'});
  }
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('MinimalStompClient', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: {OPEN: 1},
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: originalWebSocket,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('예기치 않은 연결 종료 뒤 재연결하고 기존 구독을 다시 등록한다', async () => {
    const sockets: FakeStompSocket[] = [];
    const client = new MinimalStompClient();
    const beforeConnect = jest.fn();

    client.beforeConnect = beforeConnect;
    client.reconnectDelay = 5000;
    client.webSocketFactory = () => {
      const socket = new FakeStompSocket(
        `wss://example.test/${sockets.length}`,
      );
      sockets.push(socket);
      return socket;
    };
    client.subscribe('/topic/chat/room-1', jest.fn());

    client.activate();
    await flushMicrotasks();
    sockets[0].emitConnected();

    expect(sockets[0].sentFrames).toHaveLength(2);
    expect(client.connected).toBe(true);

    sockets[0].close();
    jest.advanceTimersByTime(4999);

    expect(sockets).toHaveLength(1);

    jest.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(beforeConnect).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(2);

    sockets[1].emitConnected();

    expect(sockets[1].sentFrames).toHaveLength(2);
    expect(client.connected).toBe(true);
  });

  it('명시적으로 종료하면 예약된 재연결을 취소한다', async () => {
    const sockets: FakeStompSocket[] = [];
    const client = new MinimalStompClient();

    client.reconnectDelay = 5000;
    client.webSocketFactory = () => {
      const socket = new FakeStompSocket(
        `wss://example.test/${sockets.length}`,
      );
      sockets.push(socket);
      return socket;
    };

    client.activate();
    await flushMicrotasks();
    sockets[0].emitConnected();
    sockets[0].close();

    await client.deactivate({force: true});
    jest.advanceTimersByTime(5000);
    await flushMicrotasks();

    expect(sockets).toHaveLength(1);
  });

  it('재접속 전 인증 준비가 일시적으로 실패해도 다시 준비를 시도한다', async () => {
    const sockets: FakeStompSocket[] = [];
    const client = new MinimalStompClient();

    client.beforeConnect = jest
      .fn()
      .mockRejectedValueOnce(new Error('token refresh failed'))
      .mockResolvedValue(undefined);
    client.reconnectDelay = 5000;
    client.webSocketFactory = () => {
      const socket = new FakeStompSocket(
        `wss://example.test/${sockets.length}`,
      );
      sockets.push(socket);
      return socket;
    };

    client.activate();
    await flushMicrotasks();

    expect(sockets).toHaveLength(0);

    jest.advanceTimersByTime(5000);
    await flushMicrotasks();

    expect(client.beforeConnect).toHaveBeenCalledTimes(2);
    expect(sockets).toHaveLength(1);
  });
});
