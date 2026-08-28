import {
  navigateToBoardDetail,
  navigateToCampusScreen,
  navigateToNoticeDetail,
} from '@/app/navigation/services/appRouteNavigation';

import type {ResolvedAppLinkIntent} from './appLinkIntent';

export const navigateToAppLinkIntent = (intent: ResolvedAppLinkIntent): void => {
  switch (intent.kind) {
    case 'notice':
      navigateToNoticeDetail(intent.noticeId);
      break;
    case 'cafeteria':
      navigateToCampusScreen('CafeteriaDetail');
      break;
    case 'board':
      navigateToBoardDetail(intent.postId);
      break;
  }
};
