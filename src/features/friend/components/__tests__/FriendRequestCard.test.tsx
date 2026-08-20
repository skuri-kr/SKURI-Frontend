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

  it('동일 프로필 요청을 구분해야 할 때만 공개 식별 코드 일부를 표시한다', () => {
    const request = {
      createdAt: '2026-08-18T11:00:00+09:00',
      department: '컴퓨터공학과',
      expiresAt: '2026-09-17T11:30:00+09:00',
      friend: {
        department: '컴퓨터공학과',
        id: 'friend-public-abc123',
        nickname: '가람',
        photoUrl: null,
      },
      id: 'request-1',
    };
    const identifiedView = render(
      <FriendRequestCard mode="received" request={request} showIdentifier />,
    );
    const ordinaryView = render(
      <FriendRequestCard mode="received" request={request} />,
    );

    expect(identifiedView.getByText('식별 코드 · ABC123')).toBeTruthy();
    expect(ordinaryView.queryByText('식별 코드 · ABC123')).toBeNull();
  });

  it('처리된 요청의 결과를 액션 대신 표시한다', () => {
    const view = render(
      <FriendRequestCard
        completedAction="DECLINED"
        mode="received"
        request={{
          createdAt: '2026-08-18T11:00:00+09:00',
          department: null,
          expiresAt: '2026-09-17T11:30:00+09:00',
          friend: {
            department: null,
            id: 'friend-1',
            nickname: '가람',
            photoUrl: null,
          },
          id: 'request-1',
        }}
      />,
    );

    expect(view.getByText('거절했어요')).toBeTruthy();
    expect(view.queryByText('수락')).toBeNull();
    expect(view.queryByText('거절')).toBeNull();
  });
});
