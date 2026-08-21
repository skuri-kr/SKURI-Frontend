import React from 'react';
import {Alert, Keyboard} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {useNavigation} from '@react-navigation/native';
import {DataScanner} from 'react-native-data-scanner';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  FRIEND_HUB_INVALIDATION_KEY,
  FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';

import {useFriendAddData} from '../../hooks/useFriendAddData';
import {FriendAddScreen} from '../FriendAddScreen';

jest.mock('@react-native-clipboard/clipboard', () => ({setString: jest.fn()}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const {createElement} = require('react');
    const {View: NativeView} = require('react-native');
    return createElement(NativeView, undefined, children);
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('react-native-data-scanner', () => ({
  DataScanner: {scanBarcode: jest.fn()},
}));

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const transition = {
    damping: () => transition,
    duration: () => transition,
    mass: () => transition,
    springify: () => transition,
    stiffness: () => transition,
  };
  return {
    __esModule: true,
    default: {View},
    FadeInDown: transition,
    FadeOutUp: transition,
    LinearTransition: transition,
  };
});

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
const mockedInvalidateData = jest.mocked(invalidateData);
const mockedDataScanner = jest.mocked(DataScanner);

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
          department: null,
          id: 'friend-1',
          nickname: '가람',
          photoUrl: null,
          relationshipState: 'REQUESTABLE',
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
    expect(mockedInvalidateData).toHaveBeenCalledWith(FRIEND_HUB_INVALIDATION_KEY);
    expect(mockedInvalidateData).toHaveBeenCalledWith(
      FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
    );
  });

  it('화면을 떠난 뒤 친구 코드 재발급 성공 알림을 표시하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const regenerateMyCode = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      myCode: {
        canRegenerate: true,
        code: 'SKR-7K4M-9Q2D',
        nextRegenerationAt: null,
      },
      regenerateMyCode,
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text === '재발급');
      action?.onPress?.();
    });

    const view = render(<FriendAddScreen />);
    fireEvent.press(view.getByText('친구 코드 재발급'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(regenerateMyCode).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('화면을 떠난 뒤 친구 코드 재발급 실패 알림을 표시하지 않는다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(false)};
    const regenerateMyCode = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      myCode: {
        canRegenerate: true,
        code: 'SKR-7K4M-9Q2D',
        nextRegenerationAt: null,
      },
      regenerateMyCode,
    }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      const action = args[2]?.find(button => button.text === '재발급');
      action?.onPress?.();
    });

    const view = render(<FriendAddScreen />);
    fireEvent.press(view.getByText('친구 코드 재발급'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(regenerateMyCode).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('닉네임 입력만으로 검색하지 않고 검색 버튼을 눌렀을 때 한 글자도 검색한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const searchFriends = jest.fn().mockResolvedValue(undefined);
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({searchFriends}));

    const view = render(<FriendAddScreen />);

    fireEvent.changeText(view.getByLabelText('친구 닉네임 검색'), '김');
    expect(searchFriends).not.toHaveBeenCalled();

    fireEvent.press(view.getByRole('button', {name: '검색'}));

    expect(searchFriends).toHaveBeenCalledWith('김');
  });

  it('검색 버튼으로 실행한 닉네임 검색이 실패하면 오류를 안내한다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const searchFriends = jest.fn().mockRejectedValue(new Error('network unavailable'));
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({searchFriends}));
    const alertSpy = jest.spyOn(Alert, 'alert');

    const view = render(<FriendAddScreen />);
    fireEvent.changeText(view.getByLabelText('친구 닉네임 검색'), '가람');
    fireEvent.press(view.getByRole('button', {name: '검색'}));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('친구 검색', 'network unavailable');
    });
  });

  it('유효한 친구 QR을 스캔하면 요청 생성 없이 친구 코드 preview를 보여준다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const previewFriendCode = jest.fn().mockResolvedValue({
      department: '컴퓨터공학과',
      id: 'friend-1',
      nickname: '가람',
      photoUrl: null,
      relationshipState: 'REQUESTABLE',
    });
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({previewFriendCode}));
    mockedDataScanner.scanBarcode.mockResolvedValue({
      format: 'qr',
      value: 'skuri-friend:v1:SKR-7K4M-9Q2D',
    });

    const view = render(<FriendAddScreen />);
    fireEvent.press(view.getByLabelText('친구 QR 코드 스캔'));

    await waitFor(() => {
      expect(previewFriendCode).toHaveBeenCalledWith('SKR-7K4M-9Q2D');
    });
    expect(mockedDataScanner.scanBarcode).toHaveBeenCalledWith({
      enableAutoZoom: true,
      targetFormats: ['qr'],
    });
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
        department: null,
        id: 'friend-1',
        nickname: '가람',
        photoUrl: null,
        relationshipState: 'REQUESTABLE',
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
    expect(mockedInvalidateData).toHaveBeenCalledWith(FRIEND_HUB_INVALIDATION_KEY);
    expect(mockedInvalidateData).not.toHaveBeenCalledWith(
      FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
    );
  });

  it('하이픈 없는 친구 코드를 정규화하고 구분이 필요한 동명이인에 식별 코드를 표시한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      searchResults: [
        {
          department: '컴퓨터공학과',
          id: 'friend-public-abc123',
          nickname: '가람',
          photoUrl: null,
          relationshipState: 'REQUESTABLE',
        },
        {
          department: '컴퓨터공학과',
          id: 'friend-public-def456',
          nickname: '가람',
          photoUrl: null,
          relationshipState: 'REQUESTABLE',
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

  it('친구 관계 상태에 맞는 행동 문구를 표시한다', () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({
      searchResults: [
        {department: null, id: 'friend-incoming', nickname: '가람', photoUrl: null, relationshipState: 'INCOMING_PENDING'},
        {department: null, id: 'friend-outgoing', nickname: '나래', photoUrl: null, relationshipState: 'OUTGOING_PENDING'},
        {department: null, id: 'friend-existing', nickname: '다은', photoUrl: null, relationshipState: 'ALREADY_FRIEND'},
      ],
    }));

    const view = render(<FriendAddScreen />);

    expect(view.getByText('수락')).toBeTruthy();
    expect(view.getByText('요청 보냄')).toBeTruthy();
    expect(view.getByText('이미 친구')).toBeTruthy();
  });

  it('유효한 친구 코드 미리보기가 열리면 키보드를 내린다', async () => {
    const navigation = {goBack: jest.fn(), isFocused: jest.fn().mockReturnValue(true)};
    const previewFriendCode = jest.fn().mockResolvedValue({
      department: null,
      id: 'friend-1',
      nickname: '가람',
      photoUrl: null,
      relationshipState: 'REQUESTABLE',
    });
    mockedUseNavigation.mockReturnValue(navigation as ReturnType<typeof useNavigation>);
    mockedUseFriendAddData.mockReturnValue(createFriendAddData({previewFriendCode}));
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');

    const view = render(<FriendAddScreen />);
    fireEvent.changeText(view.getByLabelText('친구 코드'), 'SKR7K4M9Q2D');
    fireEvent.press(view.getByText('확인'));

    await waitFor(() => {
      expect(previewFriendCode).toHaveBeenCalledWith('SKR-7K4M-9Q2D');
      expect(dismissSpy).toHaveBeenCalled();
    });
  });
});
