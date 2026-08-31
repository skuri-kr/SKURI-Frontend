import {render} from '@testing-library/react-native';

import {PermissionBubble} from '../PermissionBubble';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('PermissionBubble', () => {
  it('알림 권한을 유도하지 않고 iOS 설정 흐름을 안내한다', () => {
    const screen = render(
      <PermissionBubble
        visible
        onAllowNotification={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('알림 설정 안내')).toBeTruthy();
    expect(
      screen.getByText(
        '공지와 동승 관련 알림은 iOS 알림 설정에서 선택할 수 있어요.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('설정 확인')).toBeTruthy();
    expect(screen.queryByText('알림 허용하기')).toBeNull();
    expect(screen.queryByText(/허용해 주세요/)).toBeNull();
    expect(screen.queryByText(/허용이 꺼져/)).toBeNull();
  });
});
