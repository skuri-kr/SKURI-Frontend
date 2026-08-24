import {buildJoinAction} from '../taxiHomeQuery';
import type {TaxiHomePartyCardViewData} from '../../model/taxiHomeViewData';

const party = {
  currentMemberCount: 4,
  id: 'party-1',
  maxMemberCount: 4,
} as TaxiHomePartyCardViewData;

describe('buildJoinAction', () => {
  it('정원이 가득 찬 다른 파티는 동승 요청을 비활성 상태로 만든다', () => {
    expect(
      buildJoinAction({
        activePartyId: null,
        party,
        pendingJoinRequest: undefined,
        personalStateResolved: true,
      }),
    ).toEqual({
      helperText: '파티 정원이 모두 찼어요',
      label: '파티 정원이 가득 찼습니다',
      state: 'full',
    });
  });

  it('내가 참여 중인 파티가 가득 찼으면 채팅 이동을 우선한다', () => {
    expect(
      buildJoinAction({
        activePartyId: 'party-1',
        party,
        pendingJoinRequest: undefined,
        personalStateResolved: true,
      }).state,
    ).toBe('joined');
  });
});
