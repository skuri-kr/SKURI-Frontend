import {getDepartments} from '@/shared/api';

import {getTimetableCourseToneMap} from '../../../services/timetableToneStorage';
import type {TimetableApiClient} from '../../api/timetableApiClient';
import {SpringTimetableRepository} from '../SpringTimetableRepository';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  getDepartments: jest.fn(),
}));

jest.mock('../../../services/timetableToneStorage', () => ({
  getTimetableCourseToneMap: jest.fn(),
}));

const mockedGetDepartments = jest.mocked(getDepartments);
const mockedGetTimetableCourseToneMap = jest.mocked(getTimetableCourseToneMap);

describe('SpringTimetableRepository', () => {
  beforeEach(() => {
    mockedGetDepartments.mockReset();
    mockedGetTimetableCourseToneMap.mockReset();
    mockedGetTimetableCourseToneMap.mockResolvedValue({});
  });

  it('선택한 강의 필터를 API 파라미터로 전달한다', async () => {
    const apiClient = {
      getCourses: jest.fn().mockResolvedValue({
        data: {
          content: [],
          hasNext: false,
          hasPrevious: false,
          page: 0,
          size: 30,
          totalElements: 0,
          totalPages: 0,
        },
        success: true,
      }),
    } as unknown as TimetableApiClient;
    const repository = new SpringTimetableRepository(apiClient);

    await repository.searchCatalogCourses({
      filters: {
        category: '전공선택',
        department: '컴퓨터공학과',
        grade: 2,
      },
      page: 0,
      query: '자료구조',
      semesterId: '2026-2',
      size: 30,
    });

    expect(apiClient.getCourses).toHaveBeenCalledWith({
      category: '전공선택',
      department: '컴퓨터공학과',
      grade: 2,
      page: 0,
      search: '자료구조',
      semester: '2026-2',
      size: 30,
    });
  });

  it('강의 필터 옵션과 학과 마스터를 각각 조회한다', async () => {
    const apiClient = {
      getCourseFilterOptions: jest.fn().mockResolvedValue({
        data: {
          categories: ['전공선택'],
          departments: ['컴퓨터공학과'],
          grades: [2],
        },
        success: true,
      }),
    } as unknown as TimetableApiClient;
    mockedGetDepartments.mockResolvedValue(['컴퓨터공학과', '정보통신공학과']);
    const repository = new SpringTimetableRepository(apiClient);

    await expect(repository.getCourseFilterOptions('2026-2')).resolves.toEqual({
      categories: ['전공선택'],
      departments: ['컴퓨터공학과'],
      grades: [2],
    });
    await expect(repository.listDepartments()).resolves.toEqual([
      '컴퓨터공학과',
      '정보통신공학과',
    ]);
  });

  it('직접 입력 학과를 nullable 요청값으로 전달한다', async () => {
    const apiClient = {
      addMyManualCourse: jest.fn().mockResolvedValue({
        data: {
          courseCount: 0,
          courses: [],
          id: 'timetable-1',
          semester: '2026-2',
          slots: [],
          totalCredits: 0,
        },
        success: true,
      }),
    } as unknown as TimetableApiClient;
    const repository = new SpringTimetableRepository(apiClient);

    await repository.addManualCourse({
      draft: {
        credits: 3,
        day: 'mon',
        department: '컴퓨터공학과',
        endPeriod: 2,
        isOnline: false,
        locationLabel: '공학관 301',
        name: '직접 강의',
        professor: '정태현',
        startPeriod: 1,
        toneId: 'green',
      },
      semesterId: '2026-2',
    });

    expect(apiClient.addMyManualCourse).toHaveBeenCalledWith(
      expect.objectContaining({department: '컴퓨터공학과'}),
    );
  });
});
