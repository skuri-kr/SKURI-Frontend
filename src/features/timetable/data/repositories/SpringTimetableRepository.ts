import type {TimetableCourseToneId} from '../../model/timetablePrimitives';
import type {
  TimetableCatalogCourseSearchPage,
  TimetableManualCourseDraft,
  TimetableSemesterRecord,
} from '../../model/timetableDomain';
import {getCurrentSemester} from '../../services/timetableCalendar';
import {getTimetableCourseToneMap} from '../../services/timetableToneStorage';
import {
  buildTimetableSemesterRecord,
  mapCourseSummaryDtoToCatalogCourseRecord,
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
    query,
    semesterId,
    size,
  }: {
    page: number;
    query?: string;
    semesterId: string;
    size: number;
  }): Promise<TimetableCatalogCourseSearchPage> {
    const [response, toneMap] = await Promise.all([
      this.apiClient.getCourses({
        page,
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
}
