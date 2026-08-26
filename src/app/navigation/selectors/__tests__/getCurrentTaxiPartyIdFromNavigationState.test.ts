import {
  getCurrentTaxiPartyIdFromNavigationState,
  shouldNavigateToAcceptedTaxiChat,
} from '../getCurrentTaxiPartyIdFromNavigationState';
import type {NavigationState} from '@react-navigation/native';

const createTaxiState = (
  screen: 'AcceptancePending' | 'Chat',
  params: Record<string, unknown>,
) =>
  ({
    index: 0,
    key: 'root',
    routeNames: ['Main'],
    routes: [
      {
        key: 'main',
        name: 'Main',
        state: {
          index: 0,
          key: 'tabs',
          routeNames: ['TaxiTab'],
          routes: [
            {
              key: 'taxi',
              name: 'TaxiTab',
              state: {
                index: 0,
                key: 'taxi-stack',
                routeNames: ['TaxiMain', 'AcceptancePending', 'Chat'],
                routes: [{key: screen, name: screen, params}],
                stale: false,
                type: 'stack',
              },
            },
          ],
          stale: false,
          type: 'tab',
        },
      },
    ],
    stale: false,
    type: 'stack',
  } as NavigationState);

describe('getCurrentTaxiPartyIdFromNavigationState', () => {
  it('대기 화면의 seed에서 현재 파티를 찾고 같은 파티 수락 이동을 허용한다', () => {
    const state = createTaxiState('AcceptancePending', {
      seed: {partyId: 'party-1'},
    });

    expect(getCurrentTaxiPartyIdFromNavigationState(state)).toBe('party-1');
    expect(shouldNavigateToAcceptedTaxiChat(state, 'party-1')).toBe(true);
  });

  it('이미 열린 같은 파티 채팅으로는 다시 이동하지 않는다', () => {
    const state = createTaxiState('Chat', {partyId: 'party-1'});

    expect(shouldNavigateToAcceptedTaxiChat(state, 'party-1')).toBe(false);
  });

  it('다른 파티 또는 택시 화면 밖에서는 수락된 파티 채팅으로 이동한다', () => {
    const otherPartyState = createTaxiState('Chat', {partyId: 'party-2'});
    const homeState = {
      index: 0,
      key: 'root',
      routeNames: ['Main'],
      routes: [{key: 'main', name: 'Main'}],
      stale: false,
      type: 'stack',
    } as NavigationState;

    expect(shouldNavigateToAcceptedTaxiChat(otherPartyState, 'party-1')).toBe(
      true,
    );
    expect(shouldNavigateToAcceptedTaxiChat(homeState, 'party-1')).toBe(true);
  });
});
