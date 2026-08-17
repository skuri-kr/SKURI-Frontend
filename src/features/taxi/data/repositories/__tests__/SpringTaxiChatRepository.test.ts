import {SpringTaxiChatRepository} from '../SpringTaxiChatRepository';
import {taxiChatApiClient} from '../../api/taxiChatApiClient';
import {taxiHomeApiClient} from '../../api/taxiHomeApiClient';

const createMessage = (id: string, createdAt: string) => ({
  chatRoomId: 'party:party-1',
  createdAt,
  id,
  senderId: 'member-1',
  senderName: '택시 친구',
  text: id,
  type: 'TEXT' as const,
});

const partyResponse = {
  data: {
    departure: {lat: 37.1, lng: 127.1, name: '출발지'},
    departureTime: '2026-08-13T10:00:00',
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

describe('SpringTaxiChatRepository', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('이전 페이지를 앞에 병합하고 이후 최신 스냅샷에도 이미 읽은 이력을 보존한다', async () => {
    jest
      .spyOn(taxiHomeApiClient, 'getParty')
      .mockResolvedValue(partyResponse as never);
    jest
      .spyOn(taxiChatApiClient, 'getChatRoom')
      .mockResolvedValue(roomResponse as never);
    const getMessages = jest
      .spyOn(taxiChatApiClient, 'getMessages')
      .mockResolvedValueOnce({
        data: {
          hasNext: true,
          messages: [
            createMessage('message-4', '2026-08-13T10:04:00'),
            createMessage('message-3', '2026-08-13T10:03:00'),
          ],
          nextCursor: {
            createdAt: '2026-08-13T10:03:00',
            id: 'message-3',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          hasNext: false,
          messages: [
            createMessage('message-2', '2026-08-13T10:02:00'),
            createMessage('message-1', '2026-08-13T10:01:00'),
          ],
          nextCursor: null,
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          hasNext: true,
          messages: [
            createMessage('message-4', '2026-08-13T10:04:00'),
            createMessage('message-3', '2026-08-13T10:03:00'),
          ],
          nextCursor: {
            createdAt: '2026-08-13T10:03:00',
            id: 'message-3',
          },
        },
      } as never);
    const repository = new SpringTaxiChatRepository();

    await repository.getPartyChat('party-1');
    await repository.loadOlderMessages('party-1');
    const refreshedSource = await repository.getPartyChat('party-1');

    expect(getMessages).toHaveBeenNthCalledWith(2, 'party:party-1', {
      cursorCreatedAt: '2026-08-13T10:03:00',
      cursorId: 'message-3',
      size: 100,
    });
    expect(refreshedSource?.messages.map(message => message.id)).toEqual([
      'message-1',
      'message-2',
      'message-3',
      'message-4',
    ]);
    expect(refreshedSource?.hasOlderMessages).toBe(false);

    await repository.loadOlderMessages('party-1');

    expect(getMessages).toHaveBeenCalledTimes(3);
  });

  it('삭제 응답은 기존 위치를 유지한 tombstone으로 교체하고 최신 계좌 정보를 다시 계산한다', async () => {
    jest
      .spyOn(taxiHomeApiClient, 'getParty')
      .mockResolvedValue(partyResponse as never);
    jest
      .spyOn(taxiChatApiClient, 'getChatRoom')
      .mockResolvedValue(roomResponse as never);
    jest.spyOn(taxiChatApiClient, 'getMessages').mockResolvedValue({
      data: {
        hasNext: false,
        messages: [
          {
            accountData: {
              accountHolder: '최근 계좌',
              accountNumber: '2222',
              bankName: '스쿠리은행',
            },
            chatRoomId: 'party:party-1',
            createdAt: '2026-08-13T10:02:00',
            id: 'account-latest',
            isDeleted: false,
            senderId: 'member-1',
            senderName: '택시 친구',
            text: '스쿠리은행 2222',
            type: 'ACCOUNT',
          },
          {
            accountData: {
              accountHolder: '이전 계좌',
              accountNumber: '1111',
              bankName: '스쿠리은행',
            },
            chatRoomId: 'party:party-1',
            createdAt: '2026-08-13T10:01:00',
            id: 'account-previous',
            isDeleted: false,
            senderId: 'member-1',
            senderName: '택시 친구',
            text: '스쿠리은행 1111',
            type: 'ACCOUNT',
          },
        ],
        nextCursor: null,
      },
    } as never);
    jest.spyOn(taxiChatApiClient, 'deleteMessage').mockResolvedValue({
      data: {
        chatRoomId: 'party:party-1',
        createdAt: '2026-08-13T10:02:00',
        deletedAt: '2026-08-13T10:03:00',
        id: 'account-latest',
        isDeleted: true,
        senderId: 'member-1',
        senderName: '택시 친구',
        text: '삭제된 메시지입니다.',
        type: 'TEXT',
      },
    } as never);
    const repository = new SpringTaxiChatRepository();

    await repository.getPartyChat('party-1');
    const mutated = await repository.deleteMessage('party-1', 'account-latest');

    expect(mutated?.messages.map(message => message.id)).toEqual([
      'account-previous',
      'account-latest',
    ]);
    expect(mutated?.messages[1]).toMatchObject({
      isDeleted: true,
      text: '삭제된 메시지입니다.',
      type: 'text',
    });
    expect(mutated?.latestAccountData?.accountNumber).toBe('1111');
  });
});
