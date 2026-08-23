import React from 'react';
import {render} from '@testing-library/react-native';

import type {FriendInvitation} from '../../model/friend';
import {FriendInvitationCard} from '../FriendInvitationCard';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => ({
  ToneBadge: () => null,
}));

jest.mock('../FriendAvatar', () => ({FriendAvatar: () => null}));

const handlers = {
  loading: false,
  onAccept: jest.fn(),
  onDecline: jest.fn(),
  onDelete: jest.fn(),
};

describe('FriendInvitationCard', () => {
  it('알 수 없는 만료 사유는 기본 안내로 표시한다', () => {
    const invitation = {
      createdAt: '2026-08-23T13:00:00',
      expiresAt: '2026-08-30T13:00:00',
      expiryReason: 'NEW_REASON',
      id: 'chat-invitation-1',
      inviter: null,
      respondedAt: '2026-08-30T13:00:00',
      status: 'EXPIRED',
      target: null,
      type: 'CHAT_ROOM',
    } as unknown as FriendInvitation;

    const view = render(
      <FriendInvitationCard invitation={invitation} {...handlers} />,
    );

    expect(view.getByText('초대가 만료되었어요.')).toBeTruthy();
  });

  it('대기 중인 파티 초대는 모집 상태와 인원을 표시한다', () => {
    const invitation: FriendInvitation = {
      createdAt: '2026-08-23T13:00:00',
      expiresAt: null,
      expiryReason: null,
      id: 'party-invitation-1',
      inviter: null,
      respondedAt: null,
      status: 'PENDING',
      target: {
        currentMembers: 2,
        departureName: '성결대',
        departureTime: '2026-08-24T18:00:00',
        destinationName: '안양역',
        id: 'party-1',
        maxMembers: 4,
        status: 'OPEN',
        type: 'PARTY',
      },
      type: 'PARTY',
    };

    const view = render(
      <FriendInvitationCard invitation={invitation} {...handlers} />,
    );

    expect(view.getByText('모집 중 · 2/4명')).toBeTruthy();
  });
});
