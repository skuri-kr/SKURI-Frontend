import {render} from '@testing-library/react-native';

import {useAppNoticeFeedData} from '@/features/settings';
import {ForceUpdateModal} from '@/shared/ui/ForceUpdateModal';

import {StartupModalHost} from '../StartupModalHost';
import {useAppBootstrap} from '../useAppBootstrap';

jest.mock('@/features/settings', () => ({
  useAppNoticeFeedData: jest.fn(),
}));

jest.mock('@/shared/ui/ForceUpdateModal', () => ({
  ForceUpdateModal: jest.fn(() => null),
}));

jest.mock('../useAppBootstrap', () => ({
  useAppBootstrap: jest.fn(),
}));

const mockedUseAppNoticeFeedData = jest.mocked(useAppNoticeFeedData);
const mockedForceUpdateModal = jest.mocked(ForceUpdateModal);
const mockedUseAppBootstrap = jest.mocked(useAppBootstrap);

describe('StartupModalHost', () => {
  it('점검 모드에서 공개 앱 공지의 최신 본문 한 건만 전달한다', () => {
    mockedUseAppBootstrap.mockReturnValue({
      checkingVersion: false,
      dismissStartupModal: jest.fn(),
      retryVersionCheck: jest.fn(),
      startupModalMode: 'maintenance',
    });
    mockedUseAppNoticeFeedData.mockReturnValue({
      data: {
        items: [
          {
            badges: [],
            content: '점검 공지 전체 본문',
            id: 'app-notice-1',
            publishedLabel: '방금 전',
            summary: '점검 공지 요약',
            title: '점검 안내',
          },
          {
            badges: [],
            content: '두 번째 공지 본문',
            id: 'app-notice-2',
            publishedLabel: '1일 전',
            summary: '두 번째 공지 요약',
            title: '다른 안내',
          },
        ],
      },
      error: null,
      loading: false,
      reload: jest.fn(),
    });

    render(<StartupModalHost />);

    expect(mockedUseAppNoticeFeedData).toHaveBeenCalledWith({enabled: true});
    expect(mockedForceUpdateModal).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'maintenance',
        noticeItems: [
          expect.objectContaining({
            body: '점검 공지 전체 본문',
            id: 'app-notice-1',
          }),
        ],
      }),
      undefined,
    );
  });
});
