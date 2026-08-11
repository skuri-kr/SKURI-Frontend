export interface StompFrame {
  body: string;
  command: string;
  headers: Record<string, string>;
}

export interface StompSubscription {
  id: string;
  unsubscribe: () => void;
}

type StompSocketBinaryType = 'blob' | 'arraybuffer';

declare const TextDecoder: {
  new (): {
    decode: (input?: ArrayBuffer) => string;
  };
};

declare const TextEncoder: {
  new (): {
    encode: (input?: string) => Uint8Array;
  };
};

export interface StompSocket {
  binaryType?: StompSocketBinaryType;
  readonly readyState: number;
  readonly url: string;
  close: (code?: number, reason?: string) => void;
  onclose: ((event?: any) => void) | null;
  onerror: ((event?: any) => void) | null;
  onmessage: ((event?: {data?: string | ArrayBuffer}) => void) | null;
  onopen: ((event?: any) => void) | null;
  send: (data: string | ArrayBuffer | ArrayBufferView) => void;
}

interface PublishParams {
  body: string;
  destination: string;
}

interface DeactivateParams {
  force?: boolean;
}

const NULL_BYTE = '\0';
const STOMP_NATIVE_PROTOCOL = 'v12.stomp';

const decodeData = (data: string | ArrayBuffer | undefined) => {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }

  return '';
};

const parseFrame = (rawFrame: string): StompFrame | null => {
  const normalizedFrame = rawFrame.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!normalizedFrame.trim()) {
    return null;
  }

  const separatorIndex = normalizedFrame.indexOf('\n\n');
  const headerSection =
    separatorIndex >= 0
      ? normalizedFrame.slice(0, separatorIndex)
      : normalizedFrame;
  const body =
    separatorIndex >= 0 ? normalizedFrame.slice(separatorIndex + 2) : '';
  const headerLines = headerSection.split('\n');
  const command = headerLines.shift()?.trim();

  if (!command) {
    return null;
  }

  const headers: Record<string, string> = {};

  headerLines.forEach(line => {
    const separator = line.indexOf(':');

    if (separator < 0) {
      return;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    headers[key] = value;
  });

  return {
    body,
    command,
    headers,
  };
};

const serializeFrame = ({
  body = '',
  command,
  headers,
}: {
  body?: string;
  command: string;
  headers?: Record<string, string>;
}) => {
  const headerLines = Object.entries(headers ?? {}).map(
    ([key, value]) => `${key}:${value}`,
  );

  return `${command}\n${headerLines.join('\n')}\n\n${body}${NULL_BYTE}`;
};

const encodeFrame = (frame: string) => new TextEncoder().encode(frame);

export class MinimalStompClient {
  public beforeConnect: () => Promise<void> | void = () => undefined;

  public connectHeaders: Record<string, string> = {};

  public debug: (message: string) => void = () => undefined;

  public disconnectHeaders: Record<string, string> = {};

  public heartbeatIncoming = 10000;

  public heartbeatOutgoing = 10000;

  public onConnect: (frame: StompFrame) => void = () => undefined;

  public onDisconnect: (frame?: StompFrame) => void = () => undefined;

  public onStompError: (frame: StompFrame) => void = () => undefined;

  public onWebSocketClose: (event: any) => void = () => undefined;

  public onWebSocketError: (event: any) => void = () => undefined;

  public reconnectDelay = 0;

  public webSocketFactory:
    | (() => StompSocket)
    | undefined;

  private active = false;

  private buffer = '';

  private connectedState = false;

  private socket: StompSocket | null = null;

  private subscriptionSequence = 0;

  private readonly subscriptions = new Map<
    string,
    {
      callback: (frame: StompFrame) => void;
      destination: string;
    }
  >();

  public get connected() {
    return this.connectedState;
  }

  public async deactivate(
    params: DeactivateParams = {},
  ): Promise<void> {
    this.active = false;

    const socket = this.socket;
    this.socket = null;
    this.connectedState = false;
    this.buffer = '';

    if (!socket) {
      return;
    }

    if (!params.force && socket.readyState === WebSocket.OPEN) {
      try {
        this.transmit('DISCONNECT', this.disconnectHeaders, '', socket);
      } catch {
        // Ignore graceful disconnect failures and fall back to close.
      }
    }

    try {
      socket.close();
    } catch {
      // Ignore close failures during cleanup.
    }
  }

  public activate() {
    if (this.active) {
      return;
    }

    this.active = true;
    this.openSocket().catch(() => undefined);
  }

  public publish({body, destination}: PublishParams) {
    if (!this.connectedState) {
      throw new TypeError('There is no underlying STOMP connection');
    }

    this.transmit('SEND', {
      'content-type': 'application/json',
      destination,
    }, body);
  }

  public subscribe(
    destination: string,
    callback: (frame: StompFrame) => void,
  ): StompSubscription {
    const id = `sub-${this.subscriptionSequence++}`;

    this.subscriptions.set(id, {
      callback,
      destination,
    });

    if (this.connectedState) {
      this.transmit('SUBSCRIBE', {
        destination,
        id,
      });
    }

    return {
      id,
      unsubscribe: () => {
        const existing = this.subscriptions.get(id);

        if (!existing) {
          return;
        }

        this.subscriptions.delete(id);

        if (this.connectedState) {
          this.transmit('UNSUBSCRIBE', {id});
        }
      },
    };
  }

  private handleFrame(frame: StompFrame) {
    this.debug(`<<< ${frame.command}`);

    switch (frame.command) {
      case 'CONNECTED':
        this.connectedState = true;
        this.subscriptions.forEach((subscription, id) => {
          this.transmit('SUBSCRIBE', {
            destination: subscription.destination,
            id,
          });
        });
        this.onConnect(frame);
        return;
      case 'ERROR':
        this.onStompError(frame);
        return;
      case 'MESSAGE': {
        const subscriptionId = frame.headers.subscription;

        if (!subscriptionId) {
          return;
        }

        this.subscriptions.get(subscriptionId)?.callback(frame);
        return;
      }
      default:
        return;
    }
  }

  private handleIncomingData(data: string | ArrayBuffer | undefined) {
    const decodedData = decodeData(data);

    if (!decodedData) {
      return;
    }

    this.buffer += decodedData;

    let boundaryIndex = this.buffer.indexOf(NULL_BYTE);

    while (boundaryIndex >= 0) {
      const rawFrame = this.buffer.slice(0, boundaryIndex);
      this.buffer = this.buffer.slice(boundaryIndex + 1);
      boundaryIndex = this.buffer.indexOf(NULL_BYTE);

      const frame = parseFrame(rawFrame);

      if (frame) {
        this.handleFrame(frame);
      }
    }
  }

  private async openSocket() {
    try {
      await this.beforeConnect();
    } catch {
      this.active = false;
      return;
    }

    if (!this.active) {
      return;
    }

    const socketFactory = this.webSocketFactory;

    if (!socketFactory) {
      this.onWebSocketError(new Error('웹소켓 팩토리가 설정되지 않았습니다.'));
      this.active = false;
      return;
    }

    this.debug('Opening Web Socket...');

    const socket = socketFactory();
    this.socket = socket;
    this.buffer = '';

    if (socket.binaryType !== undefined) {
      socket.binaryType = 'arraybuffer';
    }

    socket.onerror = event => {
      this.onWebSocketError(event);
    };
    socket.onmessage = event => {
      this.handleIncomingData(event?.data);
    };
    socket.onclose = event => {
      const wasConnected = this.connectedState;

      this.connectedState = false;
      this.active = false;

      if (this.socket === socket) {
        this.socket = null;
      }

      this.debug(`Connection closed to ${socket.url}`);
      this.onWebSocketClose(event);

      if (wasConnected) {
        this.onDisconnect();
      }
    };

    const sendConnectFrame = () => {
      if (this.socket !== socket) {
        return;
      }

      this.debug('Web Socket Opened...');
      this.transmit('CONNECT', {
        ...this.connectHeaders,
        'accept-version': '1.2',
        'heart-beat': '0,0',
      }, '', socket);
    };

    if (socket.readyState === WebSocket.OPEN) {
      sendConnectFrame();
      return;
    }

    socket.onopen = sendConnectFrame;
  }

  private transmit(
    command: string,
    headers: Record<string, string>,
    body = '',
    targetSocket?: StompSocket,
  ) {
    const socket = targetSocket ?? this.socket;

    if (!socket) {
      throw new Error('웹소켓이 초기화되지 않았습니다.');
    }

    this.debug(`>>> ${command}`);
    socket.send(
      encodeFrame(
        serializeFrame({
          body,
          command,
          headers,
        }),
      ),
    );
  }
}

export const createNativeStompSocket = (url: string) =>
  new WebSocket(url, STOMP_NATIVE_PROTOCOL) as unknown as StompSocket;
