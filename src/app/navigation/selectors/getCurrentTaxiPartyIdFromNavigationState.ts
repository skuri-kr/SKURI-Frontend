import type {NavigationState, PartialState} from '@react-navigation/native';

import {getCurrentLeafRouteFromNavigationState} from './getCurrentLeafRouteFromNavigationState';

type NavigationStateLike = NavigationState | PartialState<NavigationState>;

const getStringParam = (
  params: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = params?.[key];

  return typeof value === 'string' ? value : undefined;
};

export const getCurrentTaxiPartyIdFromNavigationState = (
  state: NavigationStateLike | undefined,
) => {
  const route = getCurrentLeafRouteFromNavigationState(state);

  if (!route) {
    return undefined;
  }

  if (route.name === 'Chat') {
    return getStringParam(route.params, 'partyId');
  }

  if (route.name !== 'AcceptancePending') {
    return undefined;
  }

  const seed = route.params?.seed;

  if (seed && typeof seed === 'object') {
    const partyId = getStringParam(seed as Record<string, unknown>, 'partyId');

    if (partyId) {
      return partyId;
    }
  }

  const party = route.params?.party;

  return party && typeof party === 'object'
    ? getStringParam(party as Record<string, unknown>, 'id')
    : undefined;
};

export const shouldNavigateToAcceptedTaxiChat = (
  state: NavigationStateLike | undefined,
  partyId: string,
) => {
  const route = getCurrentLeafRouteFromNavigationState(state);

  if (route?.name !== 'AcceptancePending' && route?.name !== 'Chat') {
    return true;
  }

  return getCurrentTaxiPartyIdFromNavigationState(state) !== partyId;
};
