import React from 'react';
import {render} from '@testing-library/react-native';

import {FriendRequestCard} from '../FriendRequestCard';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('FriendRequestCard', () => {
  it('요청의 정확한 만료 시각을 표시한다', () => {
    const view = render(
      <FriendRequestCard
        mode="received"
        request={{
          createdAt: '2026-08-18T11:00:00+09:00',
          department: '컴퓨터공학과',
          expiresAt: new Date(new Date().getFullYear(), 8, 17, 11, 30).toISOString(),
          friend: {
            department: '컴퓨터공학과',
            id: 'friend-1',
            nickname: '가람',
            photoUrl: null,
          },
          id: 'request-1',
        }}
      />,
    );

    expect(view.getByText('09.17 11:30까지 응답할 수 있어요.')).toBeTruthy();
  });
});
