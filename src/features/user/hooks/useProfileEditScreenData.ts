import React from 'react';

import {useProfileEditRepository} from '@/di';
import {useAuth} from '@/features/auth';
import type {ProfileEditDraft} from '../model/profileEditSource';
import type {ProfilePhotoUploadInput} from '../model/profileEditSource';
import type {ProfileEditSource} from '../model/profileEditSource';
import type {ProfileEditScreenViewData} from '../model/profileEditViewData';

const toViewData = (source: ProfileEditSource): ProfileEditScreenViewData => ({
  avatarLabel: source.avatarLabel,
  department: source.department,
  departmentOptions: source.departmentOptions,
  displayName: source.displayName,
  gradeLabel: source.gradeLabel,
  photoUrl: source.photoUrl,
  studentId: source.studentId,
});

export const useProfileEditScreenData = () => {
  const {refreshCurrentUser} = useAuth();
  const profileEditRepository = useProfileEditRepository();
  const [data, setData] = React.useState<ProfileEditScreenViewData>();
  const [departmentOptionsError, setDepartmentOptionsError] =
    React.useState<string>();
  const [departmentOptionsLoading, setDepartmentOptionsLoading] =
    React.useState(false);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const departmentOptionsRef = React.useRef<string[]>([]);

  const applySource = React.useCallback((source: ProfileEditSource) => {
    setData(previousData => ({
      ...toViewData(source),
      departmentOptions:
        source.departmentOptions.length > 0
          ? source.departmentOptions
          : previousData?.departmentOptions ?? departmentOptionsRef.current,
    }));
  }, []);

  const reloadDepartmentOptions = React.useCallback(async () => {
    try {
      setDepartmentOptionsLoading(true);
      setDepartmentOptionsError(undefined);

      const departmentOptions = await profileEditRepository.listDepartments();
      departmentOptionsRef.current = departmentOptions;
      setData(previousData =>
        previousData
          ? {
              ...previousData,
              departmentOptions,
            }
          : previousData,
      );
    } catch (caughtError) {
      console.error('Failed to fetch profile department options', caughtError);
      setDepartmentOptionsError('학과 목록을 불러오지 못했습니다.');
    } finally {
      setDepartmentOptionsLoading(false);
    }
  }, [profileEditRepository]);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const source = await profileEditRepository.getProfileEdit();
      applySource(source);
    } catch (caughtError) {
      console.error('Failed to fetch profile edit data', caughtError);
      setError('프로필 수정 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [applySource, profileEditRepository]);

  const saveChanges = React.useCallback(
    async (draft: ProfileEditDraft) => {
      try {
        setSaving(true);

        const trimmedDraft = {
          department: draft.department.trim(),
          displayName: draft.displayName.trim(),
          studentId: draft.studentId.trim(),
        };

        const hasTextChanges =
          !data ||
          data.department !== trimmedDraft.department ||
          data.displayName !== trimmedDraft.displayName ||
          data.studentId !== trimmedDraft.studentId;

        let nextSource: ProfileEditSource | undefined;

        if (hasTextChanges) {
          nextSource = await profileEditRepository.saveProfileEdit(trimmedDraft);
        }

        if (draft.photoChange?.type === 'upload') {
          nextSource = await profileEditRepository.uploadProfilePhoto(
            draft.photoChange.image,
          );
        }

        if (draft.photoChange?.type === 'remove') {
          nextSource = await profileEditRepository.removeProfilePhoto();
        }

        if (nextSource) {
          applySource(nextSource);
          await refreshCurrentUser();
        }
      } finally {
        setSaving(false);
      }
    },
    [applySource, data, profileEditRepository, refreshCurrentUser],
  );

  const uploadPhoto = React.useCallback(
    async (image: ProfilePhotoUploadInput) => {
      try {
        setSaving(true);

        const nextSource = await profileEditRepository.uploadProfilePhoto(image);
        applySource(nextSource);
        await refreshCurrentUser();
      } finally {
        setSaving(false);
      }
    },
    [applySource, profileEditRepository, refreshCurrentUser],
  );

  const removePhoto = React.useCallback(async () => {
    try {
      setSaving(true);

      const nextSource = await profileEditRepository.removeProfilePhoto();
      applySource(nextSource);
      await refreshCurrentUser();
    } finally {
      setSaving(false);
    }
  }, [applySource, profileEditRepository, refreshCurrentUser]);

  React.useEffect(() => {
    reload().catch(() => undefined);
    reloadDepartmentOptions().catch(() => undefined);
  }, [reload, reloadDepartmentOptions]);

  return {
    data,
    departmentOptionsError,
    departmentOptionsLoading,
    error,
    loading,
    removePhoto,
    reload,
    reloadDepartmentOptions,
    saveChanges,
    saving,
    uploadPhoto,
  };
};
