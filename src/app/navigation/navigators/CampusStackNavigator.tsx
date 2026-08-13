import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { type CampusStackParamList } from '@/app/navigation/types';
import {
  AcademicCalendarDetailScreen,
  CafeteriaDetailScreen,
  CampusScreen,
} from '@/features/campus';
import {
  MinecraftAccountScreen,
  MinecraftDetailScreen,
} from '@/features/minecraft';
import { TimetableDetailScreen } from '@/features/timetable';
import {
  AppNoticeDetailScreen,
  InquiryHistoryScreen,
  InquiriesScreen,
  PrivacyPolicyScreen,
  SettingScreen,
  TermsOfUseScreen,
} from '@/features/settings';
import {
  AccountModificationScreen,
  BookmarksScreen,
  MyPostsScreen,
  MyScreen,
  NotificationScreen,
  NotificationSettingsScreen,
  ProfileEditScreen,
  TaxiHistoryScreen,
} from '@/features/user';

import { LIGHT_SURFACE_SCREEN_OPTIONS } from '../config/systemBars';

const CampusStack = createNativeStackNavigator<CampusStackParamList>();

export const CampusStackNavigator = () => {
  return (
    <CampusStack.Navigator screenOptions={LIGHT_SURFACE_SCREEN_OPTIONS}>
      <CampusStack.Screen name="CampusMain" component={CampusScreen} />
      <CampusStack.Screen name="Notification" component={NotificationScreen} />
      <CampusStack.Screen name="Setting" component={SettingScreen} />
      <CampusStack.Screen name="Profile" component={MyScreen} />
      <CampusStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <CampusStack.Screen name="MyPosts" component={MyPostsScreen} />
      <CampusStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <CampusStack.Screen name="TaxiHistory" component={TaxiHistoryScreen} />
      <CampusStack.Screen
        name="AppNoticeDetail"
        component={AppNoticeDetailScreen}
      />
      <CampusStack.Screen
        name="AccountModification"
        component={AccountModificationScreen}
      />
      <CampusStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <CampusStack.Screen name="Inquiries" component={InquiriesScreen} />
      <CampusStack.Screen
        name="InquiryHistory"
        component={InquiryHistoryScreen}
      />
      <CampusStack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <CampusStack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
      />
      <CampusStack.Screen
        name="CafeteriaDetail"
        component={CafeteriaDetailScreen}
      />
      <CampusStack.Screen
        name="AcademicCalendarDetail"
        component={AcademicCalendarDetailScreen}
      />
      <CampusStack.Screen
        name="TimetableDetail"
        component={TimetableDetailScreen}
      />
      <CampusStack.Screen
        name="MinecraftAccount"
        component={MinecraftAccountScreen}
      />
      <CampusStack.Screen
        name="MinecraftDetail"
        component={MinecraftDetailScreen}
      />
    </CampusStack.Navigator>
  );
};
