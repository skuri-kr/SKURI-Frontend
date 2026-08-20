import React from 'react';
import {render} from '@testing-library/react-native';

import {FriendRow} from '../FriendRow';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../FriendAvatar', () => ({FriendAvatar: () => null}));

describe('FriendRow', () => {
  const friend = {
    department: '컴퓨터공학과',
    favorite: false,
    id: 'friend-public-abc123',
    nickname: '가람',
    photoUrl: null,
  };

  it('동일 프로필 친구를 구분해야 할 때만 공개 식별 코드 일부를 표시한다', () => {
    const identifiedView = render(
      <FriendRow
        friend={friend}
        onPress={jest.fn()}
        onPressFavorite={jest.fn()}
        showIdentifier
      />,
    );
    const ordinaryView = render(
      <FriendRow
        friend={friend}
        onPress={jest.fn()}
        onPressFavorite={jest.fn()}
      />,
    );

    expect(identifiedView.getByText('식별 코드 · ABC123')).toBeTruthy();
    expect(ordinaryView.queryByText('식별 코드 · ABC123')).toBeNull();
  });
});
