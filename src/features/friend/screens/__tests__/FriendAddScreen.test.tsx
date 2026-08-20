import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {useNavigation} from '@react-navigation/native';

import {useFriendAddData} from '../../hooks/useFriendAddData';
import {FriendAddScreen} from '../FriendAddScreen';

jest.mock('@react-native-clipboard/clipboard', () => ({setString: jest.fn()}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const {createElement} = require('react');
    const {View: NativeView} = require('react-native');
    return createElement(NativeView, undefined, children);
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => ({
  StackHeader: () => null,
  StateCard: ({title}: {title: string}) => {
    const {createElement} = require('react');
    const {Text: NativeText} = require('react-native');
    return createElement(NativeText, undefined, title);
  },
}));

jest.mock('@/shared/hooks/useScreenView', () => ({
  useScreenView: jest.fn(),
}));

jest.mock('../../components/FriendAvatar', () => ({
  FriendAvatar: () => null,
}));

jest.mock('../../hooks/useFriendAddData', () => ({
  useFriendAddData: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseFriendAddData = jest.mocked(useFriendAddData);

const createFriendAddData = (overrides: Partial<ReturnType<typeof useFriendAddData>> = {}) => ({
  completedSearchQuery: undefined,
  invalidateFriendCodePreview: jest.fn(),
  loadingMyCode: false,
  loadMoreSearchResults: jest.fn().mockResolvedValue(undefined),
  myCode: undefined,
  myCodeError: undefined,
  preview: undefined,
  previewFriendCode: jest.fn().mockResolvedValue(undefined),
  previewing: false,
  regenerating: false,
  regenerateMyCode: jest.fn().mockResolvedValue(undefined),
  reloadMyCode: jest.fn().mockResolvedValue(undefined),
  resetSearch: jest.fn(),
  searchFriends: jest.fn().mockResolvedValue(undefined),
  searchNextCursor: null,
  searchResults: [],
  searching: false,
  sendFriendRequest: jest.fn().mockResolvedValue(undefined),
  sendingFriendIds: new Set<string>(),
  ...overrides,
}) as ReturnType<typeof useFriendAddData>;

describe('FriendAddScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('화면을 떠난 뒤 완료된 친구 요청의 성공 알림과 뒤로가기를 실행하지 않는다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(false),
    };
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue({
      completedSearchQuery: '가람',
      invalidateFriendCodePreview: jest.fn(),
      loadingMyCode: false,
      loadMoreSearchResults: jest.fn(),
      myCode: undefined,
      myCodeError: undefined,
      preview: undefined,
      previewFriendCode: jest.fn(),
      previewing: false,
      regenerating: false,
      regenerateMyCode: jest.fn(),
      reloadMyCode: jest.fn(),
      resetSearch: jest.fn(),
      searchFriends: jest.fn(),
      searchNextCursor: null,
      searchResults: [
        {
          canSendFriendRequest: true,
          department: null,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
      ],
      searching: false,
      sendFriendRequest: jest.fn().mockResolvedValue({
        friend: {
          department: null,
          favorite: false,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
        },
        requestId: 'request-1',
        status: 'ACCEPTED',
      }),
      sendingFriendIds: new Set(),
    } as ReturnType<typeof useFriendAddData>);
    const alertSpy = jest.spyOn(Alert, 'alert');

    const view = render(<FriendAddScreen />);

    fireEvent.press(view.getByText('요청'));

    await waitFor(() => {
      expect(navigation.isFocused).toHaveBeenCalled();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('두 글자 이상 닉네임을 입력하면 300ms 뒤 자동으로 검색한다', () => {
    jest.useFakeTimers();
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const searchFriends = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({searchFriends}));

    const view = render(<FriendAddScreen />);

    fireEvent.changeText(view.getByLabelText('친구 닉네임 검색'), '가람');

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(searchFriends).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(searchFriends).toHaveBeenCalledWith('가람');
  });

  it('자동 닉네임 검색이 실패하면 오류를 안내한다', async () => {
    jest.useFakeTimers();
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const searchFriends = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({searchFriends}));
    const alertSpy = jest.spyOn(Alert, 'alert');

    const view = render(<FriendAddScreen />);
    fireEvent.changeText(view.getByLabelText('친구 닉네임 검색'), '가람');

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith('친구 검색', 'network unavailable');
  });

  it('대기 중인 친구 요청을 보낸 뒤 요청 목록으로 이동할 수 있다', async () => {
    const navigation = {
      goBack: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      popTo: jest.fn(),
    };
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      searchResults: [{
        canSendFriendRequest: true,
        department: null,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
      }],
      sendFriendRequest: jest.fn().mockResolvedValue({
        friend: null,
        requestId: 'request-1',
        status: 'PENDING',
      }),
    }));
    const alertSpy = jest.spyOn(Alert, 'alert');

    const view = render(<FriendAddScreen />);
    fireEvent.press(view.getByText('요청'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '친구 요청을 보냈어요',
        '가람님의 수락을 기다려주세요.',
        expect.any(Array),
      );
    });
    const actions = alertSpy.mock.calls.find(([title]) => title === '친구 요청을 보냈어요')?.[2];
    actions?.find(action => action.text === '요청 목록 보기')?.onPress?.();

    expect(navigation.popTo).toHaveBeenCalledWith('FriendHub', {initialTab: 'requests'});
  });

  it('하이픈 없는 친구 코드를 정규화하고 구분이 필요한 동명이인에 식별 코드를 표시한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      searchResults: [
        {
          canSendFriendRequest: true,
          department: '컴퓨터공학과',
          id: 'friend-public-abc123',
          nickname: '가람',
          photoUrl: null,
        },
        {
          canSendFriendRequest: true,
          department: '컴퓨터공학과',
          id: 'friend-public-def456',
          nickname: '가람',
          photoUrl: null,
        },
      ],
    }));

    const view = render(<FriendAddScreen />);
    fireEvent.changeText(view.getByLabelText('친구 코드'), 'skr7k4m9q2d');

    expect(view.getByLabelText('친구 코드').props.value).toBe('SKR-7K4M-9Q2D');
    expect(view.getByText('동일한 닉네임의 사용자가 있을 수 있어요. 학과와 식별 코드를 확인해주세요.')).toBeTruthy();
    expect(view.getByText('식별 코드 · ABC123')).toBeTruthy();
    expect(view.getByText('식별 코드 · DEF456')).toBeTruthy();
  });
});
