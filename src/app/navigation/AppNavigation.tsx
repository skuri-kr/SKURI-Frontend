import React, { PropsWithChildren } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import BootSplash from 'react-native-bootsplash';

import {AppLinkRuntime} from '@/app/linking';

import {
  flushPendingNavigationActions,
  rootNavigationRef,
} from './navigationRef';
import { RootNavigator } from './RootNavigator';

export const AppNavigation = ({ children }: PropsWithChildren) => {
  const handleNavigationReady = () => {
    flushPendingNavigationActions();
    BootSplash.hide({fade: true});
  };

  return (
    <NavigationContainer ref={rootNavigationRef} onReady={handleNavigationReady}>
      <RootNavigator />
      <AppLinkRuntime />
      {children}
    </NavigationContainer>
  );
};
