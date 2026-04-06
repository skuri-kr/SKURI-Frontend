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

export interface TimetableCatalogCourseSearchPage {
  hasNext: boolean;
  items: TimetableCatalogCourseRecord[];
  page: number;
}

export interface TimetableManualCourseDraft {
  credits: number;
  day: TimetableWeekdayId;
  endPeriod: number;
  isOnline: boolean;
  locationLabel: string;
  name: string;
  professor: string;
  startPeriod: number;
  toneId: TimetableCourseToneId;
}
