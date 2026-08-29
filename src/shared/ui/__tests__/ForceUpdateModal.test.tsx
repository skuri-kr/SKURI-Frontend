import {render} from '@testing-library/react-native';

import {ForceUpdateModal} from '../ForceUpdateModal';

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View};
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/lib/device/openAppStore', () => ({
  openAppStore: jest.fn(),
}));

describe('ForceUpdateModal', () => {
  it('점검 공지를 다시 불러오는 동안에도 캐시된 본문을 표시한다', () => {
    const screen = render(
      <ForceUpdateModal
        mode="maintenance"
        noticeItems={[{
          body: '점검은 오전 10시에 종료될 예정입니다.',
          id: 'app-notice-1',
          isImportant: true,
          publishedLabel: '방금 전',
          summary: '점검 안내',
          title: '점검 안내',
        }]}
        noticeLoading
        visible
      />,
    );

    expect(screen.getByText('점검은 오전 10시에 종료될 예정입니다.')).toBeTruthy();
  });
});
