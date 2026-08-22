export interface TimetablePageDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CourseScheduleDto {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
}

export interface CourseSummaryDto {
  id: string;
  semester: string;
  code: string;
  division: string;
  name: string;
  credits: number;
  isOnline: boolean;
  professor?: string | null;
  department: string;
  grade: number;
  category: string;
  location?: string | null;
  note?: string | null;
  schedule: CourseScheduleDto[];
}

export interface CourseFilterOptionsDto {
  departments: string[];
  grades: number[];
  categories: string[];
}

export interface TimetableSemesterOptionDto {
  id: string;
  label: string;
}

export interface TimetableCourseDto {
  id: string;
  code: string;
  division?: string | null;
  name: string;
  professor?: string | null;
  location?: string | null;
  category?: string | null;
  department?: string | null;
  credits: number;
  isOnline: boolean;
  schedule: CourseScheduleDto[];
}

export interface TimetableSlotDto {
  courseId: string;
  courseName: string;
  code: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  professor?: string | null;
  location?: string | null;
}

export interface UserTimetableDto {
  id?: string | null;
  semester: string;
  courseCount: number;
  totalCredits: number;
  courses: TimetableCourseDto[];
  slots: TimetableSlotDto[];
}

export interface AddMyTimetableCourseRequestDto {
  courseId: string;
  semester: string;
}

export interface CreateMyManualTimetableCourseRequestDto {
  semester: string;
  name: string;
  professor: string;
  department?: string | null;
  credits: number;
  isOnline: boolean;
  locationLabel?: string | null;
  dayOfWeek?: number | null;
  startPeriod?: number | null;
  endPeriod?: number | null;
}

export type TimetableShareScopeDto = 'PRIVATE' | 'BUSY_ONLY' | 'DETAILS';

export interface TimetableSharingSettingsDto {
  defaultScope: TimetableShareScopeDto;
  overrides: TimetableShareOverrideDto[];
}

export interface TimetableShareOverrideDto {
  friendPublicId: string;
  scope: TimetableShareScopeDto;
}

export interface UpdateTimetableSharingSettingsRequestDto {
  defaultScope: TimetableShareScopeDto;
}

export interface UpdateTimetableShareOverrideRequestDto {
  scope: TimetableShareScopeDto;
}

export interface FriendTimetableSlotDto {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
}

export interface FriendTimetableCourseDto {
  courseId: string | null;
  code: string;
  name: string;
  professor: string;
  location: string | null;
  credits: number;
  isOnline: boolean;
  schedule: FriendTimetableSlotDto[];
}

export interface FriendTimetableDto {
  semester: string;
  effectiveScope: TimetableShareScopeDto;
  hasTimetable: boolean;
  courses: FriendTimetableCourseDto[];
  slots: FriendTimetableSlotDto[];
}
