import {
  navigateToBoardDetail,
  navigateToCampusScreen,
  navigateToNoticeDetail,
} from '@/app/navigation/services/appRouteNavigation';

import type {AppLinkIntent} from './appLinkIntent';

export const navigateToAppLinkIntent = (intent: AppLinkIntent): void => {
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
