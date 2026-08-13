import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthEntryGuard } from '@/app/guards';
import {
  CompleteProfileScreen,
  PermissionOnboardingScreen,
  TermsOfUseForAuthScreen,
} from '@/features/auth';

import { LIGHT_SURFACE_SCREEN_OPTIONS } from './config/systemBars';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';
import { AuthNavigator } from './AuthNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const {
    authState: { loading },
    guardResult: { route },
  } = useAuthEntryGuard();

  if (loading || route === 'loading') {
    return null; // TODO: 로딩 화면 추가
  }

  return (
    <Stack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      {route === 'auth' ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : route === 'completeProfile' ? (
        <>
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
          />
          <Stack.Screen
            name="TermsOfUseForAuth"
            component={TermsOfUseForAuthScreen}
          />
        </>
      ) : route === 'permissionOnboarding' ? (
        <Stack.Screen
          name="PermissionOnboarding"
          component={PermissionOnboardingScreen}
        />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};
