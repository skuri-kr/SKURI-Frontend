import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  AcceptancePendingScreen,
  ChatScreen,
  RecruitScreen,
  TaxiLocationPickerScreen,
  TaxiScreen,
  type TaxiStackParamList,
} from '@/features/taxi';

import { LIGHT_SURFACE_SCREEN_OPTIONS } from '../config/systemBars';

const TaxiStack = createNativeStackNavigator<TaxiStackParamList>();

export const TaxiStackNavigator = () => {
  return (
    <TaxiStack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      <TaxiStack.Screen name="TaxiMain" component={TaxiScreen} />
      <TaxiStack.Screen
        name="AcceptancePending"
        component={AcceptancePendingScreen}
      />
      <TaxiStack.Screen name="Chat" component={ChatScreen} />
      <TaxiStack.Screen name="Recruit" component={RecruitScreen} />
      <TaxiStack.Screen
        name="TaxiLocationPicker"
        component={TaxiLocationPickerScreen}
      />
    </TaxiStack.Navigator>
  );
};
