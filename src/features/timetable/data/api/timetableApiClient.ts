import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {
  AddMyTimetableCourseRequestDto,
  CourseSummaryDto,
  CourseFilterOptionsDto,
  CreateMyManualTimetableCourseRequestDto,
  TimetablePageDto,
  TimetableSemesterOptionDto,
  UserTimetableDto,
} from '../dto/timetableDto';

interface GetCoursesParams {
  semester?: string;
  department?: string;
  category?: string;
  professor?: string;
  search?: string;
  dayOfWeek?: number;
  grade?: number;
  page?: number;
  size?: number;
}

export class TimetableApiClient {
  getCourses(params: GetCoursesParams = {}) {
    return httpClient.get<
      ApiSuccessResponse<TimetablePageDto<CourseSummaryDto>>
    >('/v1/courses', {
      params,
    });
  }

  getCourseFilterOptions(semester: string) {
    return httpClient.get<ApiSuccessResponse<CourseFilterOptionsDto>>(
      '/v1/courses/filter-options',
      {params: {semester}},
    );
  }

  getMySemesters() {
    return httpClient.get<ApiSuccessResponse<TimetableSemesterOptionDto[]>>(
      '/v1/timetables/my/semesters',
    );
  }

  getMyTimetable(semester?: string) {
    return httpClient.get<ApiSuccessResponse<UserTimetableDto>>(
      '/v1/timetables/my',
      {
        params: semester ? {semester} : undefined,
      },
    );
  }

  addMyCourse(data: AddMyTimetableCourseRequestDto) {
    return httpClient.post<ApiSuccessResponse<UserTimetableDto>, AddMyTimetableCourseRequestDto>(
      '/v1/timetables/my/courses',
      data,
    );
  }

  addMyManualCourse(data: CreateMyManualTimetableCourseRequestDto) {
    return httpClient.post<
      ApiSuccessResponse<UserTimetableDto>,
      CreateMyManualTimetableCourseRequestDto
    >('/v1/timetables/my/manual-courses', data);
  }

  removeMyCourse(courseId: string, semester: string) {
    return httpClient.delete<ApiSuccessResponse<UserTimetableDto>>(
      `/v1/timetables/my/courses/${courseId}`,
      {
        params: {semester},
      },
    );
  }
}

export const timetableApiClient = new TimetableApiClient();
