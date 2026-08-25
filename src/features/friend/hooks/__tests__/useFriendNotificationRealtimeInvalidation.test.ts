import {act, renderHook} from '@testing-library/react-native';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {useNotificationRepository} from '@/di';
import {useAuth} from '@/features/auth';

import {useFriendNotificationRealtimeInvalidation} from '../useFriendNotificationRealtimeInvalidation';

jest.mock('@/app/data-freshness/dataInvalidation', () => ({
  invalidateData: jest.fn(),
}));

jest.mock('@/di', () => ({
  useNotificationRepository: jest.fn(),
}));

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

const mockedInvalidateData = jest.mocked(invalidateData);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseNotificationRepository = jest.mocked(useNotificationRepository);

describe('useFriendNotificationRealtimeInvalidation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseAuth.mockReturnValue({
      user: {uid: 'member-1'},
    } as ReturnType<typeof useAuth>);
  });

  it('새 친구·초대 알림이 SSE로 도착하면 친구 화면과 badge를 갱신한다', () => {
    let onData:
      | ((notifications: Array<{id: string; type: string}>) => void)
      | undefined;
    const unsubscribe = jest.fn();
    const notificationRepository = {
      subscribeToNotifications: jest.fn(
        (
          _userId: string,
          _limit: number,
          callbacks: {
            onData: (notifications: Array<{id: string; type: string}>) => void;
          },
        ) => {
          onData = callbacks.onData;
          return unsubscribe;
        },
      ),
    };
    mockedUseNotificationRepository.mockReturnValue(
      notificationRepository as unknown as ReturnType<
        typeof useNotificationRepository
      >,
    );

    const {unmount} = renderHook(() =>
      useFriendNotificationRealtimeInvalidation({enabled: true}),
    );

    act(() => {
      onData?.([{id: 'notification-existing', type: 'POST_LIKED'}]);
    });
    expect(mockedInvalidateData).not.toHaveBeenCalled();

    act(() => {
      onData?.([
        {id: 'notification-friend-request', type: 'FRIEND_REQUEST'},
        {id: 'notification-existing', type: 'POST_LIKED'},
      ]);
    });

    expect(mockedInvalidateData).toHaveBeenCalledWith([
      'friend.hub',
      'friend.inboxCounts',
    ]);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
