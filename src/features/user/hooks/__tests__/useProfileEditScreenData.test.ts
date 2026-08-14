import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useAuth} from '@/features/auth';
import {useProfileEditRepository} from '@/di';

import {useProfileEditScreenData} from '../useProfileEditScreenData';
import type {ProfileEditSource} from '../../model/profileEditSource';

jest.mock('@/di', () => ({
  useProfileEditRepository: jest.fn(),
}));

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

const mockedUseProfileEditRepository = jest.mocked(useProfileEditRepository);
const mockedUseAuth = jest.mocked(useAuth);

const createSource = (overrides: Partial<ProfileEditSource> = {}) => ({
  ...baseSource(),
  ...overrides,
});

const baseSource = () => ({
  avatarLabel: '스',
  department: '컴퓨터공학과',
  departmentOptions: ['컴퓨터공학과', '미디어소프트웨어학과'],
  displayName: '스쿠리',
  gradeLabel: '',
  photoUrl:
    'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
  studentId: '20210001',
});

describe('useProfileEditScreenData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('텍스트 변경과 사진 업로드를 저장 시점에 순서대로 반영한다', async () => {
    const refreshCurrentUser = jest.fn().mockResolvedValue(undefined);
    const repository = {
      getProfileEdit: jest.fn().mockResolvedValue(createSource()),
      removeProfilePhoto: jest.fn(),
      saveProfileEdit: jest.fn().mockResolvedValue(
        createSource({
          department: '소프트웨어학과',
          displayName: '새닉네임',
          studentId: '20220002',
        }),
      ),
      uploadProfilePhoto: jest.fn().mockResolvedValue(
        createSource({
          department: '소프트웨어학과',
          displayName: '새닉네임',
          photoUrl:
            'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/updated.jpg',
          studentId: '20220002',
        }),
      ),
    };

    mockedUseAuth.mockReturnValue({
      refreshCurrentUser,
    } as unknown as ReturnType<typeof useAuth>);
    mockedUseProfileEditRepository.mockReturnValue(
      repository as ReturnType<typeof useProfileEditRepository>,
    );

    const {result} = renderHook(() => useProfileEditScreenData());

    await waitFor(() => {
      expect(result.current.data?.displayName).toBe('스쿠리');
    });

    await act(async () => {
      await result.current.saveChanges({
        department: '소프트웨어학과',
        displayName: ' 새닉네임 ',
        photoChange: {
          image: {
            mimeType: 'image/png',
            uri: 'file:///updated.png',
          },
          type: 'upload',
        },
        studentId: '20220002',
      });
    });

    expect(repository.saveProfileEdit).toHaveBeenCalledWith({
      department: '소프트웨어학과',
      displayName: '새닉네임',
      studentId: '20220002',
    });
    expect(repository.uploadProfilePhoto).toHaveBeenCalledWith({
      mimeType: 'image/png',
      uri: 'file:///updated.png',
    });
    expect(
      repository.saveProfileEdit.mock.invocationCallOrder[0],
    ).toBeLessThan(repository.uploadProfilePhoto.mock.invocationCallOrder[0]);
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.current.data).toMatchObject({
      department: '소프트웨어학과',
      displayName: '새닉네임',
      photoUrl:
        'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/updated.jpg',
      studentId: '20220002',
    });
  });

  it('사진 삭제만 바뀐 경우에는 텍스트 저장 없이 삭제만 수행한다', async () => {
    const refreshCurrentUser = jest.fn().mockResolvedValue(undefined);
    const repository = {
      getProfileEdit: jest.fn().mockResolvedValue(createSource()),
      removeProfilePhoto: jest.fn().mockResolvedValue(
        createSource({
          photoUrl: null,
        }),
      ),
      saveProfileEdit: jest.fn(),
      uploadProfilePhoto: jest.fn(),
    };

    mockedUseAuth.mockReturnValue({
      refreshCurrentUser,
    } as unknown as ReturnType<typeof useAuth>);
    mockedUseProfileEditRepository.mockReturnValue(
      repository as ReturnType<typeof useProfileEditRepository>,
    );

    const {result} = renderHook(() => useProfileEditScreenData());

    await waitFor(() => {
      expect(result.current.data?.photoUrl).toBe(
        'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
      );
    });

    await act(async () => {
      await result.current.saveChanges({
        department: '컴퓨터공학과',
        displayName: '스쿠리',
        photoChange: {
          type: 'remove',
        },
        studentId: '20210001',
      });
    });

    expect(repository.saveProfileEdit).not.toHaveBeenCalled();
    expect(repository.removeProfilePhoto).toHaveBeenCalledTimes(1);
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.current.data?.photoUrl).toBeNull();
  });
});
