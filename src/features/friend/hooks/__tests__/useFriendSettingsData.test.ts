import {renderHook, waitFor} from '@testing-library/react-native';

import {useFriendRepository} from '@/di';

import {useFriendSettingsData} from '../useFriendSettingsData';

jest.mock('@/di', () => ({
  useFriendRepository: jest.fn(),
}));

const mockedUseFriendRepository = jest.mocked(useFriendRepository);

const createRepository = () => ({
  acceptFriendRequest: jest.fn(),
  blockMember: jest.fn(),
  cancelFriendRequest: jest.fn(),
  createFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  getBlocks: jest.fn(),
  getFriend: jest.fn(),
  getFriendRequests: jest.fn(),
  getFriends: jest.fn(),
  getInboxCounts: jest.fn(),
  getMyCode: jest.fn(),
  getMyPrivacy: jest.fn(),
  previewFriendCode: jest.fn(),
  regenerateMyCode: jest.fn(),
  removeFriend: jest.fn(),
  searchFriends: jest.fn(),
  unblockMember: jest.fn(),
  updateFavorite: jest.fn(),
  updateMyPrivacy: jest.fn(),
});

describe('useFriendSettingsData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('검색 공개 설정 조회가 실패해도 차단 목록을 표시한다', async () => {
    const repository = createRepository();
    repository.getMyPrivacy.mockRejectedValue(new Error('privacy unavailable'));
    repository.getBlocks.mockResolvedValue([
      {
        blockedAt: '2026-08-18T10:00:00',
        department: '컴퓨터공학과',
        id: 'blocked-1',
        nickname: '가람',
        photoUrl: null,
      },
    ]);
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.loadingPrivacy).toBe(false);
      expect(result.current.hasLoadedBlocks).toBe(true);
    });

    expect(result.current.privacyError).toBe('privacy unavailable');
    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocksError).toBeUndefined();
  });

  it('차단 목록 조회가 실패해도 검색 공개 설정을 표시한다', async () => {
    const repository = createRepository();
    repository.getMyPrivacy.mockResolvedValue({nicknameSearchable: true});
    repository.getBlocks.mockRejectedValue(new Error('blocks unavailable'));
    mockedUseFriendRepository.mockReturnValue(
      repository as ReturnType<typeof useFriendRepository>,
    );

    const {result} = renderHook(() => useFriendSettingsData());

    await waitFor(() => {
      expect(result.current.loadingBlocks).toBe(false);
      expect(result.current.privacy).toEqual({nicknameSearchable: true});
    });

    expect(result.current.blocksError).toBe('blocks unavailable');
    expect(result.current.hasLoadedBlocks).toBe(false);
  });
});
