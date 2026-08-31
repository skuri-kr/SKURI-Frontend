import {render} from '@testing-library/react-native';

import {PermissionBubble} from '../PermissionBubble';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('PermissionBubble', () => {
  it('알림 권한 안내 문구를 표시한다', () => {
    const screen = render(
      <PermissionBubble
        visible
        onAllowNotification={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('알림')).toBeTruthy();
    expect(
      screen.getByText(
        '원활한 택시 동승/공지 알림을 위해 알림을 허용해 주세요!',
      ),
    ).toBeTruthy();
    expect(screen.getByText('설정 확인')).toBeTruthy();
    expect(screen.queryByText('알림 허용하기')).toBeNull();
    expect(screen.queryByText(/허용이 꺼져/)).toBeNull();
  });
});
