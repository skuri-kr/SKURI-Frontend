import type {CampusStackParamList} from '@/app/navigation/types';
import type {Party} from '@/features/taxi';
import type {TaxiAcceptancePendingSeed} from '@/features/taxi/model/taxiAcceptancePendingViewData';

import {shouldNavigateToAcceptedTaxiChat} from '../selectors/getCurrentTaxiPartyIdFromNavigationState';
import {
  getRootNavigationState,
  runWhenNavigationReady,
  rootNavigationRef,
} from '../navigationRef';

const navigateToTaxiChatRoute = (partyId: string) => {
  rootNavigationRef.navigate('Main', {
    screen: 'TaxiTab',
    params: {
      screen: 'Chat',
      params: {partyId},
    },
  });
};

export const navigateToBoardDetail = (
  postId: string,
  options?: {initialCommentId?: string},
) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'CommunityTab',
      params: {
        screen: 'BoardDetail',
        params: {
          postId,
          ...(options?.initialCommentId
            ? {initialCommentId: options.initialCommentId}
            : {}),
        },
      },
    });
  });

export const navigateToNoticeDetail = (
  noticeId: string,
  options?: {initialCommentId?: string},
) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'NoticeTab',
      params: {
        screen: 'NoticeDetail',
        params: {
          noticeId,
          ...(options?.initialCommentId
            ? {initialCommentId: options.initialCommentId}
            : {}),
        },
      },
    });
  });

export const navigateToAppNoticeDetail = (noticeId: string) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'CampusTab',
      params: {
        screen: 'AppNoticeDetail',
        params: {noticeId},
      },
    });
  });

export const navigateToAcademicCalendarDetail = (scheduleId: string) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'CampusTab',
      params: {
        screen: 'AcademicCalendarDetail',
        params: {scheduleId},
      },
    });
  });

export const navigateToNoticeMain = () =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'NoticeTab',
      params: {
        screen: 'NoticeMain',
      },
    });
  });

export const navigateToCommunityChat = (chatRoomId: string) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'CommunityTab',
      params: {
        screen: 'ChatDetail',
        params: {chatRoomId},
      },
    });
  });

export const navigateToTaxiScreen = () =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'TaxiTab',
      params: {
        screen: 'TaxiMain',
      },
    });
  });

export const navigateToTaxiChat = (partyId: string) =>
  runWhenNavigationReady(() => {
    navigateToTaxiChatRoute(partyId);
  });

export const navigateToAcceptedTaxiChat = (partyId: string) =>
  runWhenNavigationReady(() => {
    if (!shouldNavigateToAcceptedTaxiChat(getRootNavigationState(), partyId)) {
      return;
    }

    navigateToTaxiChatRoute(partyId);
  });

export const navigateToTaxiAcceptancePending = (
  party: Party,
  requestId: string,
) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'TaxiTab',
      params: {
        screen: 'AcceptancePending',
        params: {party, requestId},
      },
    });
  });

export const navigateToTaxiAcceptancePendingBySeed = (
  seed: TaxiAcceptancePendingSeed,
) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'TaxiTab',
      params: {
        screen: 'AcceptancePending',
        params: {seed},
      },
    });
  });

export const navigateToCampusScreen = <
  TScreen extends keyof CampusStackParamList,
>(
  screen: TScreen,
  params?: CampusStackParamList[TScreen],
) =>
  runWhenNavigationReady(() => {
    rootNavigationRef.navigate('Main', {
      screen: 'CampusTab',
      params: (
        params === undefined
          ? {screen}
          : {
              params,
              screen,
            }
      ) as never,
    });
  });
