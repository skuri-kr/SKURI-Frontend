import {DEPARTMENT_OPTIONS} from '@/shared/constants/departments';

import type {
  ProfileEditDraft,
  ProfileEditSource,
} from '../model/profileEditSource';

let profileEditProfileState: ProfileEditSource = {
  avatarLabel: '김',
  department: '컴퓨터공학과',
  departmentOptions: DEPARTMENT_OPTIONS,
  displayName: '김성결',
  gradeLabel: '3학년',
  photoUrl: null,
  studentId: '20210001',
};

export const getProfileEditMockData = (): ProfileEditSource => ({
  ...profileEditProfileState,
});

export const getCurrentProfileEditMock = (): ProfileEditSource => ({
  ...profileEditProfileState,
});

export const saveProfileEditMockData = (draft: ProfileEditDraft) => {
  const {department, displayName, studentId} = draft;

  profileEditProfileState = {
    ...profileEditProfileState,
    department,
    displayName,
    studentId,
    avatarLabel:
      displayName.trim().slice(0, 1) ||
      profileEditProfileState.avatarLabel,
  };
};
