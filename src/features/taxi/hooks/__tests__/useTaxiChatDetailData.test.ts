import {act, renderHook, waitFor} from '@testing-library/react-native';

import {usePartyRepository, useTaxiChatRepository} from '@/di/useRepository';
import {useAuth} from '@/features/auth';

import {useTaxiChatDetailData} from '../useTaxiChatDetailData';
import type {Party} from '../../model/types';
import type {SubscriptionCallbacks} from '@/shared/types/subscription';

jest.mock('@/di/useRepository', () => ({
  usePartyRepository: jest.fn(),
  useTaxiChatRepository: jest.fn(),
}));

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

const mockedUsePartyRepository = jest.mocked(usePartyRepository);
const mockedUseTaxiChatRepository = jest.mocked(useTaxiChatRepository);
const mockedUseAuth = jest.mocked(useAuth);

const party: Party = {
  departure: {lat: 37.38, lng: 126.93, name: '성결대학교'},
  departureTime: '2026-08-24T20:00:00.000Z',
  destination: {lat: 37.39, lng: 126.94, name: '안양역'},
  id: 'party-1',
  leaderId: 'leader-1',
  maxMembers: 4,
  members: ['leader-1', 'member-1'],
  status: 'open',
};

describe('useTaxiChatDetailData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('파티 상태 갱신에서 강퇴된 회원을 확인하면 채팅 세션을 정리한다', async () => {
    let partyCallbacks: SubscriptionCallbacks<Party | null> | undefined;
    const partyRepository = {
      subscribeToParty: jest.fn((_partyId, callbacks) => {
        partyCallbacks = callbacks;
        return jest.fn();
      }),
    };
    const taxiChatRepository = {
      getPartyChat: jest.fn().mockResolvedValue(null),
      resetSession: jest.fn().mockResolvedValue(undefined),
      setCurrentParty: jest.fn().mockResolvedValue(undefined),
      subscribeToPartyChat: jest.fn(() => jest.fn()),
    };

    mockedUsePartyRepository.mockReturnValue(
      partyRepository as unknown as ReturnType<typeof usePartyRepository>,
    );
    mockedUseTaxiChatRepository.mockReturnValue(
      taxiChatRepository as unknown as ReturnType<typeof useTaxiChatRepository>,
    );
    mockedUseAuth.mockReturnValue({
      user: {uid: 'member-1'},
    } as ReturnType<typeof useAuth>);

    const {result} = renderHook(() => useTaxiChatDetailData('party-1'));

    await waitFor(() => {
      expect(partyCallbacks).toBeDefined();
    });

    act(() => {
      partyCallbacks?.onData({...party, members: ['leader-1']});
    });

    await waitFor(() => {
      expect(result.current.removedFromParty).toBe(true);
    });
    expect(taxiChatRepository.resetSession).toHaveBeenCalledTimes(1);
  });
});
