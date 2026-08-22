import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

import {FriendMinecraftAccountTree} from '../FriendMinecraftAccountTree';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
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

describe('FriendMinecraftAccountTree', () => {
  it('SELF 부모와 FRIEND 자식을 구분하고 접을 수 있다', () => {
    const view = render(
      <FriendMinecraftAccountTree
        account={{
          avatarUuid: 'self-avatar',
          edition: 'JAVA',
          friendAccounts: [{
            avatarUuid: 'friend-avatar',
            edition: 'BEDROCK',
            gameName: 'skuriBedrock',
          }],
          gameName: 'skuriJava',
        }}
      />,
    );

    expect(view.getByText('대표 계정')).toBeTruthy();
    expect(view.getByText('친구 계정')).toBeTruthy();
    fireEvent.press(view.getByLabelText('skuriJava 대표 계정 접기'));
    expect(view.queryByText('친구 계정')).toBeNull();
  });
});
