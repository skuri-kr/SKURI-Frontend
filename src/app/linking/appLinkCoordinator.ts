import {parseAppLinkUrl, type AppLinkIntent} from './appLinkIntent';

const DUPLICATE_WINDOW_MS = 1500;

export interface AppLinkCoordinator {
  flushIfReady: (
    ready: boolean,
    navigate: (intent: AppLinkIntent) => void,
  ) => boolean;
  receiveUrl: (url: string, receivedAt?: number) => boolean;
}

export const createAppLinkCoordinator = (): AppLinkCoordinator => {
  let lastReceived: {url: string; receivedAt: number} | null = null;
  let pendingIntent: AppLinkIntent | null = null;

  return {
    receiveUrl(url, receivedAt = Date.now()) {
      if (
        lastReceived?.url === url &&
        receivedAt - lastReceived.receivedAt >= 0 &&
        receivedAt - lastReceived.receivedAt <= DUPLICATE_WINDOW_MS
      ) {
        return false;
      }

      const intent = parseAppLinkUrl(url);
      if (!intent) {
        return false;
      }

      lastReceived = {receivedAt, url};
      pendingIntent = intent;
      return true;
    },

    flushIfReady(ready, navigate) {
      if (!ready || !pendingIntent) {
        return false;
      }

      const intent = pendingIntent;
      pendingIntent = null;
      navigate(intent);
      return true;
    },
  };
};
