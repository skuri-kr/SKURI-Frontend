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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('점검 복구 후 업데이트 모드로 전환되면 앱 공지를 다시 불러온다', () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    let bootstrapState: ReturnType<typeof useAppBootstrap> = {
      checkingVersion: false,
      dismissStartupModal: jest.fn(),
      retryVersionCheck: jest.fn(),
      startupModalMode: 'maintenance',
    };
    mockedUseAppBootstrap.mockImplementation(() => bootstrapState);
    mockedUseAppNoticeFeedData.mockReturnValue({
      data: null,
      error: '앱 공지사항을 불러오지 못했습니다.',
      loading: false,
      reload,
    });

    const screen = render(<StartupModalHost />);
    expect(reload).not.toHaveBeenCalled();

    bootstrapState = {...bootstrapState, startupModalMode: 'soft-update'};
    screen.rerender(<StartupModalHost />);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('점검 재시도 시 버전 검사와 앱 공지 피드를 함께 다시 불러온다', () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    const retryVersionCheck = jest.fn();
    mockedUseAppBootstrap.mockReturnValue({
      checkingVersion: false,
      dismissStartupModal: jest.fn(),
      retryVersionCheck,
      startupModalMode: 'maintenance',
    });
    mockedUseAppNoticeFeedData.mockReturnValue({
      data: null,
      error: '앱 공지사항을 불러오지 못했습니다.',
      loading: false,
      reload,
    });

    render(<StartupModalHost />);
    const modalProps = mockedForceUpdateModal.mock.calls[0]?.[0];
    modalProps?.onPressRetry?.();

    expect(retryVersionCheck).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
