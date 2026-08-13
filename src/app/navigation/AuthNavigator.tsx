import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AccountGuideScreen, LoginScreen } from '@/features/auth';

import { LIGHT_SURFACE_SCREEN_OPTIONS } from './config/systemBars';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AccountGuide" component={AccountGuideScreen} />
    </Stack.Navigator>
  );
};
