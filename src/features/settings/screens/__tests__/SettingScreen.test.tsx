import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

import {useAds} from '@/shared/ads';
import {useAppSettingData} from '../../hooks/useAppSettingData';
import {SettingScreen} from '../SettingScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn()}),
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View};
});

jest.mock('@/shared/ads', () => ({useAds: jest.fn()}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('../../hooks/useAppSettingData', () => ({
  useAppSettingData: jest.fn(),
}));
jest.mock('@/shared/design-system/components', () => {
  const {View} = require('react-native');
  return {
    SettingsRow: View,
    SettingsSection: View,
    StackHeader: View,
  };
});

const mockedUseAds = jest.mocked(useAds);
const mockedUseAppSettingData = jest.mocked(useAppSettingData);

describe('SettingScreen', () => {
  const activateAds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAds.mockReturnValue({
      activateAds,
      adsReady: false,
      appActive: true,
      privacyOptionsRequired: false,
      showPrivacyOptions: jest.fn(),
    });
    mockedUseAppSettingData.mockReturnValue({
      data: {sections: []},
    });
  });

  it('화면 진입 시 광고 개인정보 상태 확인을 시작한다', async () => {
    render(<SettingScreen />);

    await waitFor(() => expect(activateAds).toHaveBeenCalledTimes(1));
  });
});
