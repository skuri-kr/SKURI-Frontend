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
  it('정산 대상이 있는 리더의 모집 중/마감 파티에만 계좌 불러오기 액션을 추가한다', () => {
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

    expect(openLeaderView.actionTrayActions.map(action => action.id)).toContain(
      'pasteAccount',
    );
    expect(closedLeaderView.actionTrayActions.map(action => action.id)).toContain(
      'pasteAccount',
    );
    expect(memberView.actionTrayActions.map(action => action.id)).not.toContain(
      'pasteAccount',
    );
    expect(soloLeaderView.actionTrayActions.map(action => action.id)).not.toContain(
      'pasteAccount',
    );
  });
});
