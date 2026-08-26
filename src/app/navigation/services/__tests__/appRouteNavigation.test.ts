jest.mock('@/app/navigation/navigationRef', () => ({
  getRootNavigationState: jest.fn(),
  rootNavigationRef: {navigate: jest.fn()},
  runWhenNavigationReady: (action: () => void) => {
    action();
    return true;
  },
}));

import {
  getRootNavigationState,
  rootNavigationRef,
} from '@/app/navigation/navigationRef';
import {navigateToAcceptedTaxiChat} from '../appRouteNavigation';

const mockGetRootNavigationState = jest.mocked(getRootNavigationState);
const mockNavigate = jest.mocked(rootNavigationRef.navigate);

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
  } as never);

describe('navigateToAcceptedTaxiChat', () => {
  beforeEach(() => {
    mockGetRootNavigationState.mockReset();
    mockNavigate.mockReset();
  });

  it('같은 파티 대기 화면에서는 수락 푸시만으로 채팅으로 전환한다', () => {
    let navigationState = createTaxiState('AcceptancePending', {
      seed: {partyId: 'party-1'},
    });
    mockGetRootNavigationState.mockImplementation(() => navigationState);
    mockNavigate.mockImplementation(() => {
      navigationState = createTaxiState('Chat', {partyId: 'party-1'});
    });

    navigateToAcceptedTaxiChat('party-1');
    navigateToAcceptedTaxiChat('party-1');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Main', {
      screen: 'TaxiTab',
      params: {
        screen: 'Chat',
        params: {partyId: 'party-1'},
      },
    });
  });

  it('이미 같은 파티 채팅이면 수락 이벤트를 다시 이동시키지 않는다', () => {
    mockGetRootNavigationState.mockReturnValue(
      createTaxiState('Chat', {partyId: 'party-1'}),
    );

    navigateToAcceptedTaxiChat('party-1');

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
