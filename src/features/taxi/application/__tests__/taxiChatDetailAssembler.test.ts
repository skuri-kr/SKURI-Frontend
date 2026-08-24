import {buildTaxiChatViewData} from '../taxiChatDetailAssembler';
import type {TaxiChatSourceData} from '../../model/taxiChatViewData';

const createPartyChat = (
  overrides: Partial<TaxiChatSourceData> = {},
): TaxiChatSourceData => ({
  composerPlaceholder: '메시지를 입력하세요',
  departureLocation: {lat: 37.38, lng: 126.92, name: '명학역'},
  departureTimeISO: '2026-08-17T12:00:00.000Z',
  destinationLocation: {lat: 37.39, lng: 126.93, name: '성결대학교'},
  estimatedFareLabel: '2,400원',
  hasOlderMessages: false,
  id: 'party-1',
  leaderId: 'leader-1',
  loadingOlderMessages: false,
  maxMembers: 4,
  memberCount: 2,
  messages: [],
  notificationEnabled: true,
  participants: [
    {id: 'leader-1', isLeader: true, name: '리더', settled: true},
    {id: 'member-1', isLeader: false, name: '멤버', settled: false},
  ],
  partyStatus: 'open',
  tags: [],
  title: '성결대학교 가요',
  ...overrides,
});

describe('taxiChatDetailAssembler', () => {
  it('계좌 불러오기 액션을 제공하지 않는다', () => {
    const openLeaderView = buildTaxiChatViewData({
      currentUserId: 'leader-1',
      partyChat: createPartyChat(),
    });
    const closedLeaderView = buildTaxiChatViewData({
      currentUserId: 'leader-1',
      partyChat: createPartyChat({partyStatus: 'closed'}),
    });
    const memberView = buildTaxiChatViewData({
      currentUserId: 'member-1',
      partyChat: createPartyChat(),
    });
    const soloLeaderView = buildTaxiChatViewData({
      currentUserId: 'leader-1',
      partyChat: createPartyChat({
        memberCount: 1,
        participants: [
          {id: 'leader-1', isLeader: true, name: '리더', settled: true},
        ],
      }),
    });

    [openLeaderView, closedLeaderView, memberView, soloLeaderView].forEach(
      view => {
        expect(view.actionTrayActions.map(action => action.id)).not.toContain(
          'pasteAccount',
        );
      },
    );
  });

  it('정원이 가득 찬 마감 파티에서도 모집 재개 액션을 제공한다', () => {
    const view = buildTaxiChatViewData({
      currentUserId: 'leader-1',
      partyChat: createPartyChat({
        maxMembers: 2,
        memberCount: 2,
        partyStatus: 'closed',
      }),
    });

    expect(view.actionTrayActions.map(action => action.id)).toContain(
      'reopen',
    );
  });

  it('파티원 목록에 현재 인원과 프로필 사진 정보를 전달한다', () => {
    const view = buildTaxiChatViewData({
      currentUserId: 'leader-1',
      partyChat: createPartyChat({
        participants: [
          {
            id: 'leader-1',
            isLeader: true,
            name: '리더',
            photoUrl: 'https://example.com/leader.png',
            settled: true,
          },
          {id: 'member-1', isLeader: false, name: '멤버', settled: false},
        ],
      }),
    });

    expect(view.summary.currentMemberCount).toBe(2);
    expect(view.summary.maxMemberCount).toBe(4);
    expect(view.summary.members[0].photoUrl).toBe(
      'https://example.com/leader.png',
    );
  });
});
