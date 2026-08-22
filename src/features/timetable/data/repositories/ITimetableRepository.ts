import type {
  TimetableCatalogCourseSearchPage,
  TimetableCatalogCourseFilters,
  TimetableCourseFilterOptions,
  TimetableManualCourseDraft,
  TimetableSemesterRecord,
  TimetableShareScope,
  TimetableSharingSettings,
  FriendTimetable,
} from '../../model/timetableDomain';
import type {TimetableCourseToneId} from '../../model/timetablePrimitives';

export interface ITimetableRepository {
  addCatalogCourse(params: {
    courseId: string;
    semesterId: string;
    toneId: TimetableCourseToneId;
  }): Promise<TimetableSemesterRecord | null>;
  addManualCourse(params: {
    draft: TimetableManualCourseDraft;
    semesterId: string;
  }): Promise<TimetableSemesterRecord | null>;
  getSemesterRecord(
    semesterId: string,
    semesterLabel?: string,
  ): Promise<TimetableSemesterRecord | null>;
  listSemesterRecords(): Promise<TimetableSemesterRecord[]>;
  listDepartments(): Promise<string[]>;
  getCourseFilterOptions(semesterId: string): Promise<TimetableCourseFilterOptions>;
  removeCourse(params: {
    courseId: string;
    semesterId: string;
  }): Promise<TimetableSemesterRecord | null>;
  searchCatalogCourses(params: {
    page: number;
    filters: TimetableCatalogCourseFilters;
    query?: string;
    semesterId: string;
    size: number;
  }): Promise<TimetableCatalogCourseSearchPage>;
  deleteShareOverride(friendId: string): Promise<void>;
  getFriendTimetable(params: {
    friendId: string;
    semesterId: string;
  }): Promise<FriendTimetable>;
  getMySharingSettings(): Promise<TimetableSharingSettings>;
  updateMySharingSettings(scope: TimetableShareScope): Promise<TimetableSharingSettings>;
  updateShareOverride(params: {
    friendId: string;
    scope: TimetableShareScope;
  }): Promise<void>;
}
