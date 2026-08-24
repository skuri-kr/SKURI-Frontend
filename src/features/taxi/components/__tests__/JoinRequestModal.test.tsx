import React from 'react';
import {render} from '@testing-library/react-native';

import {JoinRequestModal} from '../JoinRequestModal';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('JoinRequestModal', () => {
  it('친구 초대로 생성된 요청은 초대자와 초대받은 사람을 구분해 안내한다', () => {
    const view = render(
      <JoinRequestModal
        invitationInviterName="김길동"
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRequestClose={jest.fn()}
        requesterName="홍길동"
        visible
      />,
    );

    expect(
      view.getByText('김길동님이 홍길동님을 파티에 초대했어요.'),
    ).toBeTruthy();
  });

  it('일반 동승 요청은 기존 안내 문구를 유지한다', () => {
    const view = render(
      <JoinRequestModal
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRequestClose={jest.fn()}
        requesterName="홍길동"
        visible
      />,
    );

    expect(
      view.getByText('홍길동님이 현재 파티에 참여하고 싶어 해요.'),
    ).toBeTruthy();
  });
});
