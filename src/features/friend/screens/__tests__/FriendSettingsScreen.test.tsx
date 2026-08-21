import React from 'react';
import {render} from '@testing-library/react-native';

import {useNavigation} from '@react-navigation/native';

import {useFriendSettingsData} from '../../hooks/useFriendSettingsData';
import {FriendSettingsScreen} from '../FriendSettingsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const {createElement} = require('react');
    const {View} = require('react-native');
    return createElement(View, undefined, children);
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@/shared/design-system/components', () => ({
  SettingsRow: () => null,
  SettingsSection: ({children}: {children: React.ReactNode}) => children,
  StackHeader: () => null,
  StateCard: () => null,
}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('../../components/FriendAvatar', () => ({FriendAvatar: () => null}));
jest.mock('../../hooks/useFriendSettingsData', () => ({
  useFriendSettingsData: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseFriendSettingsData = jest.mocked(useFriendSettingsData);

describe('FriendSettingsScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('동일 프로필 차단 대상에만 공개 식별 코드 일부를 표시한다', () => {
    mockedUseNavigation.mockReturnValue({goBack: jest.fn()} as ReturnType<typeof useNavigation>);
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [
        {blockedAt: '2026-08-18T11:00:00', department: '컴퓨터공학과', id: 'friend-public-abc123', nickname: '가람', photoUrl: null},
        {blockedAt: '2026-08-18T11:00:00', department: '컴퓨터공학과', id: 'friend-public-def456', nickname: '가람', photoUrl: null},
        {blockedAt: '2026-08-18T11:00:00', department: '전자공학과', id: 'friend-public-ghi789', nickname: '가람', photoUrl: null},
      ],
      blocksError: undefined,
      hasLoadedBlocks: true,
      loadingBlocks: false,
      loadingPrivacy: false,
      privacy: undefined,
      privacyError: undefined,
      reload: jest.fn(),
      reloadBlocks: jest.fn(),
      reloadPrivacy: jest.fn(),
      savingPrivacy: false,
      unblockMember: jest.fn(),
      unblockingIds: new Set(),
      updateNicknameSearchable: jest.fn(),
    } as ReturnType<typeof useFriendSettingsData>);

    const view = render(<FriendSettingsScreen />);

    expect(view.getByText('식별 코드 · ABC123')).toBeTruthy();
    expect(view.getByText('식별 코드 · DEF456')).toBeTruthy();
    expect(view.queryByText('식별 코드 · GHI789')).toBeNull();
  });
});
