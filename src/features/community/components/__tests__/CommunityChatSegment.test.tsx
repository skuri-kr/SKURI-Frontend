import React from 'react';
import {FlatList} from 'react-native';
import {render} from '@testing-library/react-native';

import {CommunityChatSegment} from '../CommunityChatSegment';
import type {CommunityChatRoomViewData} from '../../model/communityViewData';

jest.mock('@/shared/ads', () => ({
  InlineBannerAd: () => null,
  interleaveAds: jest.requireActual('@/shared/ads/adList').interleaveAds,
}));

jest.mock('../CommunityChatRoomCard', () => ({
  CommunityChatRoomCard: () => null,
}));

const rooms: CommunityChatRoomViewData[] = Array.from(
  {length: 10},
  (_, index) => ({
    description: `설명 ${index}`,
    iconBackgroundColor: '#ffffff',
    iconColor: '#000000',
    iconName: 'chatbubble-outline',
    id: `room-${index}`,
    isJoined: false,
    memberCountLabel: '1명',
    previewLabel: '',
    timeLabel: '',
    title: `채팅방 ${index}`,
    unreadCount: 0,
  }),
);

const renderSegment = (loading: boolean) => (
  <CommunityChatSegment
    active
    loading={loading}
    onPressRoom={jest.fn()}
    onRefresh={jest.fn()}
    refreshing={false}
    rooms={rooms}
  />
);

describe('CommunityChatSegment', () => {
  it('채팅방을 다시 불러오는 동안 기존 목록에 광고를 삽입하지 않는다', () => {
    const screen = render(renderSegment(false));

    expect(
      screen
        .UNSAFE_getByType(FlatList)
        .props.data.filter((item: {kind: string}) => item.kind === 'ad'),
    ).toHaveLength(1);

    screen.rerender(renderSegment(true));

    expect(
      screen
        .UNSAFE_getByType(FlatList)
        .props.data.filter((item: {kind: string}) => item.kind === 'ad'),
    ).toHaveLength(0);
  });
});
