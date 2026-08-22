import type {TimetableCourseToneId} from '../../model/timetablePrimitives';
import type {
  TimetableCatalogCourseSearchPage,
  TimetableCatalogCourseFilters,
  TimetableCourseFilterOptions,
  TimetableManualCourseDraft,
  TimetableSemesterRecord,
  TimetableShareScope,
} from '../../model/timetableDomain';
import {getDepartments} from '@/shared/api';
import {getCurrentSemester} from '../../services/timetableCalendar';
import {getTimetableCourseToneMap} from '../../services/timetableToneStorage';
import {
  buildTimetableSemesterRecord,
  mapCourseSummaryDtoToCatalogCourseRecord,
  mapFriendTimetableDto,
  mapTimetableSharingSettingsDto,
} from '../mappers/timetableApiMapper';
import {timetableApiClient, TimetableApiClient} from '../api/timetableApiClient';
import type {UserTimetableDto} from '../dto/timetableDto';
import type {ITimetableRepository} from './ITimetableRepository';

export class SpringTimetableRepository implements ITimetableRepository {
  constructor(private readonly apiClient: TimetableApiClient = timetableApiClient) {}

  private buildSemesterRecordFromTimetable({
    semesterId,
    semesterLabel,
    timetable,
    toneMap,
  }: {
    semesterId: string;
    semesterLabel?: string;
    timetable: UserTimetableDto;
    toneMap: Record<string, TimetableCourseToneId>;
  }): TimetableSemesterRecord {
    return buildTimetableSemesterRecord({
      semesterId,
      semesterLabel,
      timetable,
      toneMap,
    });
  }

  async listSemesterRecords(): Promise<TimetableSemesterRecord[]> {
    const response = await this.apiClient.getMySemesters();
    const options =
      response.data.length > 0
        ? response.data
        : [
            {
              id: getCurrentSemester(),
              label: `${getCurrentSemester()}학기`,
            },
          ];

    return options.map(option => ({
      catalogCourses: [],
      courses: [],
      currentDay: 'mon',
      id: option.id,
      label: option.label,
    }));
  }

  listDepartments(): Promise<string[]> {
    return getDepartments();
  }

  async getCourseFilterOptions(
    semesterId: string,
  ): Promise<TimetableCourseFilterOptions> {
    const response = await this.apiClient.getCourseFilterOptions(semesterId);
    return response.data;
  }

  async getSemesterRecord(
    semesterId: string,
    semesterLabel?: string,
  ): Promise<TimetableSemesterRecord | null> {
    const [timetableResponse, toneMap] = await Promise.all([
      this.apiClient.getMyTimetable(semesterId),
      getTimetableCourseToneMap(semesterId),
    ]);

    return this.buildSemesterRecordFromTimetable({
      semesterId,
      semesterLabel: semesterLabel ?? `${semesterId}학기`,
      timetable: timetableResponse.data,
      toneMap,
    });
  }

  async addCatalogCourse({
    courseId,
    semesterId,
  }: {
    courseId: string;
    semesterId: string;
    toneId: TimetableCourseToneId;
  }): Promise<TimetableSemesterRecord | null> {
    const [response, toneMap] = await Promise.all([
      this.apiClient.addMyCourse({
        courseId,
        semester: semesterId,
      }),
      getTimetableCourseToneMap(semesterId),
    ]);

    return this.buildSemesterRecordFromTimetable({
      semesterId,
      semesterLabel: `${semesterId}학기`,
      timetable: response.data,
      toneMap,
    });
  }

  async addManualCourse({
    draft,
    semesterId,
  }: {
    draft: TimetableManualCourseDraft;
    semesterId: string;
  }): Promise<TimetableSemesterRecord | null> {
    const [response, toneMap] = await Promise.all([
      this.apiClient.addMyManualCourse({
        semester: semesterId,
        name: draft.name.trim(),
        professor: draft.professor.trim(),
        department: draft.department.trim() || null,
        credits: draft.credits,
        isOnline: draft.isOnline,
        locationLabel: draft.isOnline ? null : draft.locationLabel.trim(),
        dayOfWeek: draft.isOnline
          ? null
          : {
              mon: 1,
              tue: 2,
              wed: 3,
              thu: 4,
              fri: 5,
              sat: 6,
            }[draft.day],
        startPeriod: draft.isOnline ? null : draft.startPeriod,
        endPeriod: draft.isOnline ? null : draft.endPeriod,
      }),
      getTimetableCourseToneMap(semesterId),
    ]);

    return this.buildSemesterRecordFromTimetable({
      semesterId,
      semesterLabel: `${semesterId}학기`,
      timetable: response.data,
      toneMap,
    });
  }

  async removeCourse({
    courseId,
    semesterId,
  }: {
    courseId: string;
    semesterId: string;
  }): Promise<TimetableSemesterRecord | null> {
    const [response, toneMap] = await Promise.all([
      this.apiClient.removeMyCourse(courseId, semesterId),
      getTimetableCourseToneMap(semesterId),
    ]);

    return this.buildSemesterRecordFromTimetable({
      semesterId,
      semesterLabel: `${semesterId}학기`,
      timetable: response.data,
      toneMap,
    });
  }

  async searchCatalogCourses({
    page,
    filters,
    query,
    semesterId,
    size,
  }: {
    page: number;
    filters: TimetableCatalogCourseFilters;
    query?: string;
    semesterId: string;
    size: number;
  }): Promise<TimetableCatalogCourseSearchPage> {
    const [response, toneMap] = await Promise.all([
      this.apiClient.getCourses({
        page,
        category: filters.category,
        department: filters.department,
        grade: filters.grade,
        search: query,
        semester: semesterId,
        size,
      }),
      getTimetableCourseToneMap(semesterId),
    ]);

    return {
      hasNext: response.data.hasNext,
      items: response.data.content.map(course =>
        mapCourseSummaryDtoToCatalogCourseRecord({
          course,
          toneMap,
        }),
      ),
      page: response.data.page,
    };
  }

  async getMySharingSettings() {
    const response = await this.apiClient.getMySharingSettings();
    return mapTimetableSharingSettingsDto(response.data);
  }

  async updateMySharingSettings(scope: TimetableShareScope) {
    const response = await this.apiClient.updateMySharingSettings({
      defaultScope: scope,
    });
    return mapTimetableSharingSettingsDto(response.data);
  }

  async updateShareOverride({
    friendId,
    scope,
  }: {
    friendId: string;
    scope: TimetableShareScope;
  }) {
    await this.apiClient.updateShareOverride(friendId, {scope});
  }

  async deleteShareOverride(friendId: string) {
    await this.apiClient.deleteShareOverride(friendId);
  }

  async getFriendTimetable({
    friendId,
    semesterId,
  }: {
    friendId: string;
    semesterId: string;
  }) {
    const response = await this.apiClient.getFriendTimetable(friendId, semesterId);
    return mapFriendTimetableDto(response.data);
  }
}
