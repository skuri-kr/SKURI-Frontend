import React from 'react';
import {Alert, Linking} from 'react-native';

import {useAuthEntryGuard} from '@/app/guards';

import {createAppLinkCoordinator} from './appLinkCoordinator';
import {navigateToAppLinkIntent} from './appLinkNavigation';
import {resolveAppLinkIntent} from './shareLinkClient';

export const AppLinkRuntime = () => {
  const {
    guardResult: {route},
  } = useAuthEntryGuard();
  const coordinatorRef = React.useRef(createAppLinkCoordinator());
  const routeRef = React.useRef(route);
  const resolutionRevisionRef = React.useRef(0);
  const [pendingRevision, setPendingRevision] = React.useState(0);

  React.useEffect(() => {
    routeRef.current = route;
  }, [route]);

  React.useEffect(() => {
    let active = true;

    const receiveUrl = (url: string) => {
      if (coordinatorRef.current.receiveUrl(url)) {
        resolutionRevisionRef.current += 1;
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
    let active = true;

    coordinatorRef.current.flushIfReady(
      route === 'main',
      intent => {
        const resolutionRevision = ++resolutionRevisionRef.current;
        resolveAppLinkIntent(intent)
          .then(resolvedIntent => {
            if (
              active &&
              routeRef.current === 'main' &&
              resolutionRevision === resolutionRevisionRef.current
            ) {
              navigateToAppLinkIntent(resolvedIntent);
            }
          })
          .catch(() => {
            if (
              active &&
              routeRef.current === 'main' &&
              resolutionRevision === resolutionRevisionRef.current
            ) {
              Alert.alert(
                '공유 링크를 열 수 없어요',
                '링크가 올바른지 확인하거나 잠시 후 다시 시도해 주세요.',
              );
            }
          });
      },
    );

    return () => {
      active = false;
    };
  }, [pendingRevision, route]);

  return null;
};
