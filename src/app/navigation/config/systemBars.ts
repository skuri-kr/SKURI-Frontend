import {Platform} from 'react-native';
import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

export const LIGHT_SURFACE_SCREEN_OPTIONS = {
  headerShown: false,
  ...(Platform.OS === 'android' ? {statusBarStyle: 'dark' as const} : {}),
} satisfies NativeStackNavigationOptions;
