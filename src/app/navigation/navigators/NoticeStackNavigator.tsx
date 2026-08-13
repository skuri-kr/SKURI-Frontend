import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { type NoticeStackParamList } from '@/app/navigation/types';
import {
  NoticeDetailScreen,
  NoticeSearchScreen,
  NoticeScreen,
} from '@/features/notice';

import { LIGHT_SURFACE_SCREEN_OPTIONS } from '../config/systemBars';

const NoticeStack = createNativeStackNavigator<NoticeStackParamList>();

export const NoticeStackNavigator = () => {
  return (
    <NoticeStack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      <NoticeStack.Screen name="NoticeMain" component={NoticeScreen} />
      <NoticeStack.Screen name="NoticeSearch" component={NoticeSearchScreen} />
      <NoticeStack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
    </NoticeStack.Navigator>
  );
};
