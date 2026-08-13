import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {type CommunityStackParamList} from '@/app/navigation/types';
import {
  BoardDetailScreen,
  BoardEditScreen,
  BoardWriteScreen,
} from '@/features/board';
import {CommunityScreen} from '@/features/community';
import {ChatDetailScreen} from '@/features/chat';

import {LIGHT_SURFACE_SCREEN_OPTIONS} from '../config/systemBars';

const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();

export const CommunityStackNavigator = () => {
  return (
    <CommunityStack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      <CommunityStack.Screen name="BoardMain" component={CommunityScreen} />
      <CommunityStack.Screen name="BoardDetail" component={BoardDetailScreen} />
      <CommunityStack.Screen name="BoardWrite" component={BoardWriteScreen} />
      <CommunityStack.Screen name="BoardEdit" component={BoardEditScreen} />
      <CommunityStack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </CommunityStack.Navigator>
  );
};
