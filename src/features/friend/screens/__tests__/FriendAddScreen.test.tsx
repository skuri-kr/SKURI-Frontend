import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

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

describe('FriendAddScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
});
