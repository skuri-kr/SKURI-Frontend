export interface ProfileEditSource {
  avatarLabel: string;
  department: string;
  departmentOptions: string[];
  displayName: string;
  gradeLabel: string;
  photoUrl: string | null;
  studentId: string;
}

export type ProfilePhotoChange =
  | {
      type: 'remove';
    }
  | {
      image: ProfilePhotoUploadInput;
      type: 'upload';
    };

export interface ProfileEditDraft {
  department: string;
  displayName: string;
  photoChange?: ProfilePhotoChange;
  studentId: string;
}

export interface ProfilePhotoUploadInput {
  fileName?: string;
  mimeType?: string;
  uri: string;
}
