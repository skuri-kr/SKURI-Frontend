import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';

import {useNavigation} from '@react-navigation/native';

import {
  invalidateData,
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {useContentBlockSettingsData} from '@/features/content-block';

import {useFriendSettingsData} from '../../hooks/useFriendSettingsData';
import {useTimetableSharingSettingsData} from '../../hooks/useTimetableSharingSettingsData';
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
  SettingsRow: ({
    accessibilityLabel,
    onPress,
    subtitle,
    title,
  }: {
    accessibilityLabel?: string;
    onPress?: () => void;
    subtitle?: string;
    title: string;
  }) => {
    const {createElement} = require('react');
    const {Text, TouchableOpacity, View} = require('react-native');
    const content = createElement(
      View,
      undefined,
      createElement(Text, undefined, title),
      subtitle ? createElement(Text, undefined, subtitle) : null,
    );
    return onPress
      ? createElement(
          TouchableOpacity,
          {accessibilityLabel, onPress},
          content,
        )
      : content;
  },
  SettingsSection: ({children}: {children: React.ReactNode}) => children,
  StackHeader: () => null,
  StateCard: () => null,
}));
jest.mock('@/shared/hooks/useScreenView', () => ({useScreenView: jest.fn()}));
jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
  useRefetchOnFocus: jest.fn(),
}));
jest.mock('@/features/content-block', () => ({
  useContentBlockSettingsData: jest.fn(),
}));
jest.mock('../../components/FriendAvatar', () => ({FriendAvatar: () => null}));
jest.mock('../../hooks/useFriendSettingsData', () => ({
  useFriendSettingsData: jest.fn(),
}));
jest.mock('../../hooks/useTimetableSharingSettingsData', () => ({
  useTimetableSharingSettingsData: jest.fn(),
}));
jest.mock('@/features/timetable/components/TimetableSharingScopeSheet', () => ({
  TimetableSharingScopeSheet: () => null,
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedInvalidateData = jest.mocked(invalidateData);
const mockedUseRefetchOnFocus = jest.mocked(useRefetchOnFocus);
const mockedUseContentBlockSettingsData = jest.mocked(
  useContentBlockSettingsData,
);
const mockedUseFriendSettingsData = jest.mocked(useFriendSettingsData);
const mockedUseTimetableSharingSettingsData = jest.mocked(
  useTimetableSharingSettingsData,
);

const createTimetableSharingSettingsData = () => ({
  friends: [],
  friendsError: undefined,
  getFriendScope: jest.fn(),
  loading: false,
  loadingFriends: false,
  loadingSettings: false,
  reload: jest.fn(),
  saving: false,
  settings: {
    defaultScope: 'PRIVATE' as const,
    overrides: [],
  },
  settingsError: undefined,
  updateDefaultScope: jest.fn(),
  updateFriendScope: jest.fn(),
}) as ReturnType<typeof useTimetableSharingSettingsData>;

describe('FriendSettingsScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseContentBlockSettingsData.mockReturnValue({
      blocks: [],
      error: undefined,
      hasLoaded: true,
      loading: false,
      reload: jest.fn(),
      unblockContent: jest.fn(),
      unblockingIds: new Set(),
    });
    mockedUseTimetableSharingSettingsData.mockReturnValue(
      createTimetableSharingSettingsData(),
    );
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

  it('콘텐츠 차단 관계가 바뀐 뒤 화면에 복귀하면 목록을 다시 불러온다', () => {
    const reloadContentBlocks = jest.fn();
    mockedUseNavigation.mockReturnValue({goBack: jest.fn()} as ReturnType<typeof useNavigation>);
    mockedUseContentBlockSettingsData.mockReturnValue({
      blocks: [],
      error: undefined,
      hasLoaded: true,
      loading: false,
      reload: reloadContentBlocks,
      unblockContent: jest.fn(),
      unblockingIds: new Set(),
    });
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [],
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

    render(<FriendSettingsScreen />);

    expect(mockedUseRefetchOnFocus).toHaveBeenCalledWith({
      invalidationKey: 'content.blocks',
      refetch: reloadContentBlocks,
    });
  });

  it('동일 프로필 친구의 시간표 공개 범위 행에만 식별 코드를 표시한다', () => {
    mockedUseNavigation.mockReturnValue({goBack: jest.fn()} as ReturnType<typeof useNavigation>);
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [],
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
    mockedUseTimetableSharingSettingsData.mockReturnValue({
      ...createTimetableSharingSettingsData(),
      friends: [
        {department: '컴퓨터공학과', favorite: false, id: 'friend-public-abc123', nickname: '가람', photoUrl: null},
        {department: '컴퓨터공학과', favorite: false, id: 'friend-public-def456', nickname: '가람', photoUrl: null},
        {department: '전자공학과', favorite: false, id: 'friend-public-ghi789', nickname: '가람', photoUrl: null},
      ],
    } as ReturnType<typeof useTimetableSharingSettingsData>);

    const view = render(<FriendSettingsScreen />);

    expect(view.getByText(/식별 코드 · ABC123/)).toBeTruthy();
    expect(view.getByText(/식별 코드 · DEF456/)).toBeTruthy();
    expect(view.queryByText(/식별 코드 · GHI789/)).toBeNull();
  });

  it('화면을 떠난 뒤 차단 해제가 실패해도 오류를 표시하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const unblockMember = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [
        {
          blockedAt: '2026-08-18T11:00:00',
          department: null,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
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
      unblockMember,
      unblockingIds: new Set(),
      updateNicknameSearchable: jest.fn(),
    } as ReturnType<typeof useFriendSettingsData>);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text === '차단 해제');
      action?.onPress?.();
    });

    const view = render(<FriendSettingsScreen />);
    fireEvent.press(view.getByText('차단 해제'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(unblockMember).toHaveBeenCalledWith('friend-1');
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('콘텐츠 차단 목록에는 실제 사용자 식별 정보 없이 고정 라벨만 표시한다', () => {
    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
    } as ReturnType<typeof useNavigation>);
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [],
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
    mockedUseContentBlockSettingsData.mockReturnValue({
      blocks: [
        {
          blockedAt: new Date('2026-08-31T00:00:00Z'),
          id: 'opaque-block-id',
          label: '차단한 사용자',
        },
      ],
      error: undefined,
      hasLoaded: true,
      loading: false,
      reload: jest.fn(),
      unblockContent: jest.fn(),
      unblockingIds: new Set(),
    });

    const view = render(<FriendSettingsScreen />);

    expect(view.getByText('콘텐츠 차단')).toBeTruthy();
    expect(view.getByText('차단한 사용자')).toBeTruthy();
    expect(view.queryByText(/opaque-block-id/)).toBeNull();
  });

  it('콘텐츠 차단을 해제하면 저장한 게시글 목록도 무효화한다', async () => {
    const unblockContent = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
    } as ReturnType<typeof useNavigation>);
    mockedUseFriendSettingsData.mockReturnValue({
      blocks: [],
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
    mockedUseContentBlockSettingsData.mockReturnValue({
      blocks: [
        {
          blockedAt: new Date('2026-08-31T00:00:00Z'),
          id: 'opaque-block-id',
          label: '차단한 사용자',
        },
      ],
      error: undefined,
      hasLoaded: true,
      loading: false,
      reload: jest.fn(),
      unblockContent,
      unblockingIds: new Set(),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text === '차단 해제');
      action?.onPress?.();
    });

    const view = render(<FriendSettingsScreen />);
    fireEvent.press(view.getByText('차단 해제'));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(unblockContent).toHaveBeenCalledWith('opaque-block-id');
    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'community.board.list',
      'notice.list',
      'campus.home',
      'profile.boardBookmarks',
    ]);
    alertSpy.mockRestore();
  });
});
