jest.mock('@/shared/realtime', () => {
  const connect = jest.fn(
    async (
      request: {path: string; query?: Record<string, string>},
      factory: {
        connect: (options: {
          headers: Record<string, string>;
          reconnectDelayMs: number;
          url: string;
        }) => unknown;
      },
    ) =>
      factory.connect({
        headers: {},
        reconnectDelayMs: 3000,
        url: `https://example.com${request.path}`,
      }),
  );

  const createXhrSseStream = jest.fn(() => ({
    close: jest.fn(),
  }));

  return {
    createXhrSseStream,
    sseClient: {
      connect,
    },
  };
});

jest.mock('@/features/taxi/data/api/taxiHomeApiClient', () => ({
  taxiHomeApiClient: {
    getMyParties: jest.fn(),
    getMyJoinRequests: jest.fn(),
    getParty: jest.fn(),
    getPartyJoinRequests: jest.fn(),
  },
}));

import {createXhrSseStream, sseClient} from '@/shared/realtime';
import {taxiHomeApiClient} from '@/features/taxi/data/api/taxiHomeApiClient';

import {SpringPartyRepository} from '../SpringPartyRepository';

const flushPromises = () =>
  new Promise<void>(resolve => {
    setImmediate(resolve);
  });

const createPartyDetailResponse = (partyId: string) => ({
  createdAt: '2026-03-25T20:00:00',
  departure: {
    lat: 37.38,
    lng: 126.93,
    name: '성결대',
  },
  departureTime: '2026-03-25T20:30:00',
  destination: {
    lat: 37.39,
    lng: 126.94,
    name: '안양역',
  },
  detail: null,
  id: partyId,
  leaderId: 'leader-1',
  maxMembers: 4,
  members: [
    {
      id: 'leader-1',
      isLeader: true,
    },
  ],
  status: 'OPEN',
  tags: [],
});

describe('SpringPartyRepository shared SSE transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('같은 /v1/sse/parties endpoint는 여러 구독자가 공유한다', async () => {
    (taxiHomeApiClient.getMyParties as jest.Mock).mockResolvedValue({
      data: [
        {
          departure: {lat: 37.38, lng: 126.93, name: '성결대'},
          destination: {lat: 37.39, lng: 126.94, name: '안양역'},
          id: 'party-1',
          isLeader: true,
          status: 'OPEN',
        },
      ],
    });
    (taxiHomeApiClient.getParty as jest.Mock).mockResolvedValue({
      data: createPartyDetailResponse('party-1'),
    });

    const repository = new SpringPartyRepository();
    const callbacks = {
      onData: jest.fn(),
      onError: jest.fn(),
    };

    const unsubscribeFirst = repository.subscribeToMyParty('leader-1', callbacks);
    const unsubscribeSecond = repository.subscribeToMyParty('leader-1', callbacks);

    await flushPromises();

    expect(sseClient.connect).toHaveBeenCalledTimes(1);
    expect(sseClient.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/v1/sse/parties',
      }),
      expect.any(Object),
    );

    const firstConnection = (createXhrSseStream as jest.Mock).mock.results[0]
      .value;

    unsubscribeFirst();
    expect(firstConnection.close).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(firstConnection.close).toHaveBeenCalledTimes(1);
  });

  it('같은 파티 join-request SSE endpoint도 하나의 transport를 재사용한다', async () => {
    (taxiHomeApiClient.getParty as jest.Mock).mockResolvedValue({
      data: createPartyDetailResponse('party-1'),
    });
    (taxiHomeApiClient.getPartyJoinRequests as jest.Mock).mockResolvedValue({
      data: [],
    });

    const repository = new SpringPartyRepository();
    const callbacks = {
      onData: jest.fn(),
      onError: jest.fn(),
    };

    const unsubscribeFirst = repository.subscribeToJoinRequests(
      'party-1',
      callbacks,
    );
    const unsubscribeSecond = repository.subscribeToJoinRequests(
      'party-1',
      callbacks,
    );

    await flushPromises();

    expect(sseClient.connect).toHaveBeenCalledTimes(1);
    expect(sseClient.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/v1/sse/parties/party-1/join-requests',
      }),
      expect.any(Object),
    );

    const firstConnection = (createXhrSseStream as jest.Mock).mock.results[0]
      .value;

    unsubscribeFirst();
    expect(firstConnection.close).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(firstConnection.close).toHaveBeenCalledTimes(1);
  });
});
