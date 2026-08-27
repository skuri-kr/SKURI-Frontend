import React from 'react';
import {Linking} from 'react-native';

import {useAuthEntryGuard} from '@/app/guards';

import {createAppLinkCoordinator} from './appLinkCoordinator';
import {navigateToAppLinkIntent} from './appLinkNavigation';

export const AppLinkRuntime = () => {
  const {
    guardResult: {route},
  } = useAuthEntryGuard();
  const coordinatorRef = React.useRef(createAppLinkCoordinator());
  const [pendingRevision, setPendingRevision] = React.useState(0);

  React.useEffect(() => {
    let active = true;

    const receiveUrl = (url: string) => {
      if (coordinatorRef.current.receiveUrl(url)) {
        setPendingRevision(previous => previous + 1);
      }
    };

    Linking.getInitialURL()
      .then(url => {
        if (active && url) {
          receiveUrl(url);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      receiveUrl(event.url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    coordinatorRef.current.flushIfReady(
      route === 'main',
      navigateToAppLinkIntent,
    );
  }, [pendingRevision, route]);

  return null;
};
