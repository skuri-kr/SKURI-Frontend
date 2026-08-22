import type {
  TimetableCourseToneId,
  TimetableWeekdayId,
} from './timetablePrimitives';

export interface TimetableCourseScheduleRecord {
  day: TimetableWeekdayId;
  endPeriod: number;
  startPeriod: number;
}

export interface TimetableCourseRecord {
  code: string;
  credits: number;
  department?: string;
  id: string;
  isOnline?: boolean;
  locationLabel?: string;
  name: string;
  professor: string;
  schedules: TimetableCourseScheduleRecord[];
  toneId: TimetableCourseToneId;
}

export interface TimetableCatalogCourseRecord extends TimetableCourseRecord {
  category?: string;
  grade?: number;
}

export interface TimetableSemesterRecord {
  catalogCourses: TimetableCatalogCourseRecord[];
  currentDay: TimetableWeekdayId;
  id: string;
  label: string;
  courses: TimetableCourseRecord[];
}

export type TimetableShareScope = 'PRIVATE' | 'BUSY_ONLY' | 'DETAILS';

export interface TimetableShareOverride {
  friendId: string;
  scope: TimetableShareScope;
}

export interface TimetableSharingSettings {
  defaultScope: TimetableShareScope;
  overrides: TimetableShareOverride[];
}

export interface FriendTimetableSlot {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
}

export interface FriendTimetableCourse {
  code: string;
  courseId: string | null;
  credits: number;
  isOnline: boolean;
  location: string | null;
  name: string;
  professor: string;
  schedule: FriendTimetableSlot[];
}

export interface FriendTimetable {
  courses: FriendTimetableCourse[];
  effectiveScope: TimetableShareScope;
  hasTimetable: boolean;
  semester: string;
  slots: FriendTimetableSlot[];
}

export interface TimetableCatalogCourseSearchPage {
  hasNext: boolean;
  items: TimetableCatalogCourseRecord[];
  page: number;
}

export interface TimetableCatalogCourseFilters {
  category?: string;
  department?: string;
  grade?: number;
}

export interface TimetableCourseFilterOptions {
  categories: string[];
  departments: string[];
  grades: number[];
}

export interface TimetableManualCourseDraft {
  credits: number;
  department: string;
  day: TimetableWeekdayId;
  endPeriod: number;
  isOnline: boolean;
  locationLabel: string;
  name: string;
  professor: string;
  startPeriod: number;
  toneId: TimetableCourseToneId;
}
