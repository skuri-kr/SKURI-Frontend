import type {NavigationState, PartialState} from '@react-navigation/native';

import {getCurrentLeafRouteFromNavigationState} from './getCurrentLeafRouteFromNavigationState';

type NavigationStateLike = NavigationState | PartialState<NavigationState>;

type NavigationRouteLike = {
  name: string;
  state?: NavigationStateLike;
};

const getCurrentRoute = (state: NavigationStateLike | undefined) => {
  if (!state || state.routes.length === 0) {
    return undefined;
  }

  return state.routes[
    state.index ?? state.routes.length - 1
  ] as NavigationRouteLike | undefined;
};

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

export const getCurrentTaxiStackNavigationState = (
  state: NavigationStateLike | undefined,
) => {
  let currentState = state;

  while (currentState) {
    const currentRoute = getCurrentRoute(currentState);

    if (!currentRoute?.state) {
      return undefined;
    }

    if (currentRoute.name === 'TaxiTab') {
      return currentRoute.state;
    }

    currentState = currentRoute.state;
  }

  return undefined;
};

export const isCurrentTaxiAcceptancePending = (
  state: NavigationStateLike | undefined,
  partyId: string,
) => {
  const route = getCurrentLeafRouteFromNavigationState(state);

  return (
    route?.name === 'AcceptancePending' &&
    getCurrentTaxiPartyIdFromNavigationState(state) === partyId
  );
};

export const shouldNavigateToAcceptedTaxiChat = (
  state: NavigationStateLike | undefined,
  partyId: string,
) => {
  const route = getCurrentLeafRouteFromNavigationState(state);

  return !(
    route?.name === 'Chat' &&
    getCurrentTaxiPartyIdFromNavigationState(state) === partyId
  );
};
