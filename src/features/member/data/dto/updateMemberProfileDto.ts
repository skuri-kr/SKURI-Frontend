export interface UpdateMemberProfileRequestDto {
  nickname?: string;
  studentId?: string | null;
  department?: string | null;
  photoUrl?: string | null;
}
