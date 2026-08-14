import {uploadImage} from '@/shared/api/imageUploadClient';
import {getDepartments} from '@/shared/api';
import type {IMemberRepository} from '@/features/member/data/repositories/IMemberRepository';

import {SpringProfileEditRepository} from '../SpringProfileEditRepository';

jest.mock('@/shared/api/imageUploadClient', () => ({
  uploadImage: jest.fn(),
}));

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  getDepartments: jest.fn(),
}));

const mockedUploadImage = jest.mocked(uploadImage);
const mockedGetDepartments = jest.mocked(getDepartments);

describe('SpringProfileEditRepository', () => {
  beforeEach(() => {
    mockedUploadImage.mockReset();
    mockedGetDepartments.mockReset();
    mockedGetDepartments.mockResolvedValue(['컴퓨터공학과', '정보통신공학과']);
  });

  it('프로필 사진 업로드 후 photoUrl을 회원 프로필에 저장한다', async () => {
    const memberRepository = {
      updateMyProfile: jest.fn().mockResolvedValue({
        bankAccount: null,
        department: '컴퓨터공학과',
        email: 'user@skuniv.ac.kr',
        id: 'member-1',
        isAdmin: false,
        joinedAt: '2026-03-28T12:00:00',
        lastLogin: null,
        nickname: '스쿠리',
        notificationSetting: null,
        photoUrl:
          'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
        realname: null,
        studentId: '20210001',
      }),
    } as unknown as IMemberRepository;

    mockedUploadImage.mockResolvedValue({
      height: 512,
      mime: 'image/png',
      size: 120000,
      thumbUrl:
        'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile_thumb.jpg',
      url: 'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
      width: 512,
    });

    const repository = new SpringProfileEditRepository(memberRepository);

    await expect(
      repository.uploadProfilePhoto({
        fileName: 'profile.png',
        mimeType: 'image/png',
        uri: 'file:///profile.png',
      }),
    ).resolves.toMatchObject({
      avatarLabel: '스',
      displayName: '스쿠리',
      photoUrl:
        'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
    });

    expect(mockedUploadImage).toHaveBeenCalledWith({
      context: 'PROFILE_IMAGE',
      fileName: 'profile.png',
      mimeType: 'image/png',
      uri: 'file:///profile.png',
    });
    expect(memberRepository.updateMyProfile).toHaveBeenCalledWith({
      photoUrl:
        'https://cdn.skuri.app/uploads/profiles/member-1/2026/04/06/profile.jpg',
    });
    expect(mockedGetDepartments).toHaveBeenCalledTimes(1);
  });

  it('프로필 사진 삭제 시 전용 삭제 API 호출 후 최신 프로필을 다시 불러온다', async () => {
    const memberRepository = {
      deleteMyProfilePhoto: jest.fn().mockResolvedValue(undefined),
      getMyMemberProfile: jest.fn().mockResolvedValue({
        bankAccount: null,
        department: '컴퓨터공학과',
        email: 'user@skuniv.ac.kr',
        id: 'member-1',
        isAdmin: false,
        joinedAt: '2026-03-28T12:00:00',
        lastLogin: null,
        nickname: '스쿠리',
        notificationSetting: null,
        photoUrl: null,
        realname: null,
        studentId: '20210001',
      }),
    } as unknown as IMemberRepository;

    const repository = new SpringProfileEditRepository(memberRepository);

    await expect(repository.removeProfilePhoto()).resolves.toMatchObject({
      photoUrl: null,
    });

    expect(memberRepository.deleteMyProfilePhoto).toHaveBeenCalledTimes(1);
    expect(memberRepository.getMyMemberProfile).toHaveBeenCalledTimes(1);
    expect(mockedGetDepartments).toHaveBeenCalledTimes(1);
  });
});
