import {act, renderHook, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';

import {useTimetableRepository} from '@/di';

import {useTimetableDetailData} from '../useTimetableDetailData';
import type {TimetableSemesterRecord} from '../../model/timetableDomain';
import {
  removeTimetableCourseTone,
  setTimetableCourseTone,
} from '../../services/timetableToneStorage';

jest.mock('@/di', () => ({
  useTimetableRepository: jest.fn(),
}));

jest.mock('../../services/timetableToneStorage', () => ({
  removeTimetableCourseTone: jest.fn().mockResolvedValue(undefined),
  setTimetableCourseTone: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseTimetableRepository = jest.mocked(useTimetableRepository);
const mockedRemoveTimetableCourseTone = jest.mocked(removeTimetableCourseTone);
const mockedSetTimetableCourseTone = jest.mocked(setTimetableCourseTone);

const semesterRecord: TimetableSemesterRecord = {
  catalogCourses: [],
  courses: [],
  currentDay: 'mon',
  id: '2026-2',
  label: '2026-2학기',
};

const semesterRecordWithManualCourse: TimetableSemesterRecord = {
  ...semesterRecord,
  courses: [
    {
      code: '직접 입력',
      credits: 3,
      id: 'manual-1',
      isOnline: true,
      name: '프로젝트 세미나',
      professor: '직접 입력',
      schedules: [],
      toneId: 'green',
    },
  ],
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

const createRepository = () => ({
  addCatalogCourse: jest.fn(),
  addManualCourse: jest.fn(),
  deleteShareOverride: jest.fn(),
  getCourseFilterOptions: jest.fn().mockResolvedValue({
    categories: ['전공선택'],
    departments: ['컴퓨터공학과'],
    grades: [2],
  }),
  getSemesterRecord: jest.fn().mockResolvedValue(semesterRecord),
  getFriendTimetable: jest.fn(),
  getMySharingSettings: jest.fn(),
  listDepartments: jest.fn().mockResolvedValue(['정보통신공학과']),
  listSemesterRecords: jest.fn().mockResolvedValue([semesterRecord]),
  removeCourse: jest.fn(),
  searchCatalogCourses: jest.fn().mockResolvedValue({
    hasNext: false,
    items: [],
    page: 0,
  }),
  updateMySharingSettings: jest.fn(),
  updateShareOverride: jest.fn(),
});

describe('useTimetableDetailData add course options', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedRemoveTimetableCourseTone.mockResolvedValue(undefined);
    mockedSetTimetableCourseTone.mockResolvedValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('강의 필터 조회가 실패해도 직접 입력 학과 목록을 유지한다', async () => {
    const repository = createRepository();
    repository.getCourseFilterOptions.mockRejectedValue(
      new Error('filter unavailable'),
    );
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());

    await waitFor(() => {
      expect(result.current.data?.semesterLabel).toBe('2026-2학기');
    });
    act(() => {
      result.current.openAddSheet();
    });

    await waitFor(() => {
      expect(
        result.current.data?.addCourseSheet.search.filters.errorLabel,
      ).toBe('필터를 불러오지 못했습니다.');
      expect(
        result.current.data?.addCourseSheet.manual.departmentOptions,
      ).toEqual([
        {id: '', label: '선택 안 함'},
        {id: '정보통신공학과', label: '정보통신공학과'},
      ]);
      expect(
        result.current.data?.addCourseSheet.manual.departmentErrorLabel,
      ).toBeUndefined();
    });
  });

  it('학과 목록 조회가 실패해도 강의 필터를 유지하고 별도로 재시도한다', async () => {
    const repository = createRepository();
    repository.listDepartments
      .mockRejectedValueOnce(new Error('department unavailable'))
      .mockResolvedValueOnce(['정보통신공학과']);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());

    await waitFor(() => {
      expect(result.current.data?.semesterLabel).toBe('2026-2학기');
    });
    act(() => {
      result.current.openAddSheet();
    });

    await waitFor(() => {
      expect(
        result.current.data?.addCourseSheet.search.filters.departments,
      ).toEqual([
        {id: '', label: '학과 전체'},
        {id: '컴퓨터공학과', label: '컴퓨터공학과'},
      ]);
      expect(
        result.current.data?.addCourseSheet.search.filters.grades,
      ).toEqual([
        {id: '', label: '학년 전체'},
        {id: '2', label: '2학년'},
      ]);
      expect(
        result.current.data?.addCourseSheet.search.filters.categories,
      ).toEqual([
        {id: '', label: '구분 전체'},
        {id: '전공선택', label: '전선'},
      ]);
      expect(
        result.current.data?.addCourseSheet.manual.departmentErrorLabel,
      ).toBe('학과 목록을 불러오지 못했습니다.');
      expect(
        result.current.data?.addCourseSheet.search.filters.errorLabel,
      ).toBeUndefined();
    });

    await act(async () => {
      await result.current.retryDepartmentOptions();
    });

    expect(
      result.current.data?.addCourseSheet.manual.departmentOptions,
    ).toEqual([
      {id: '', label: '선택 안 함'},
      {id: '정보통신공학과', label: '정보통신공학과'},
    ]);
    expect(
      result.current.data?.addCourseSheet.manual.departmentErrorLabel,
    ).toBeUndefined();
    expect(repository.listDepartments).toHaveBeenCalledTimes(2);
  });

  it('학기 변경과 겹친 이전 새로고침 응답을 무시한다', async () => {
    const previousSemesterRecord: TimetableSemesterRecord = {
      ...semesterRecord,
      id: '2026-1',
      label: '2026-1학기',
    };
    const staleReload = createDeferred<TimetableSemesterRecord | null>();
    const latestSelection = createDeferred<TimetableSemesterRecord | null>();
    const repository = createRepository();
    repository.listSemesterRecords.mockResolvedValue([
      semesterRecord,
      previousSemesterRecord,
    ]);
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockReturnValueOnce(staleReload.promise)
      .mockReturnValueOnce(latestSelection.promise);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });

    let reloadPromise!: Promise<void>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(2);
    });

    let selectPromise!: Promise<void>;
    act(() => {
      selectPromise = result.current.selectSemester('2026-1');
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      latestSelection.resolve(previousSemesterRecord);
      await selectPromise;
    });
    expect(result.current.data?.semesterId).toBe('2026-1');

    await act(async () => {
      staleReload.resolve(semesterRecord);
      await reloadPromise;
    });
    expect(result.current.data?.semesterId).toBe('2026-1');
  });

  it('강의 추가 응답이 진행 중인 다른 학기 전환을 취소하지 않는다', async () => {
    const previousSemesterRecord: TimetableSemesterRecord = {
      ...semesterRecord,
      id: '2026-1',
      label: '2026-1학기',
    };
    const catalogCourse = {
      code: 'CS101',
      credits: 3,
      department: '컴퓨터공학과',
      id: 'course-1',
      isOnline: false,
      locationLabel: '성결관 101호',
      name: '자료구조',
      professor: '김교수',
      schedules: [{day: 'mon' as const, endPeriod: 2, startPeriod: 1}],
      toneId: 'green' as const,
    };
    const recordAfterAdd: TimetableSemesterRecord = {
      ...semesterRecord,
      courses: [catalogCourse],
    };
    const pendingAdd = createDeferred<TimetableSemesterRecord | null>();
    const pendingSelection = createDeferred<TimetableSemesterRecord | null>();
    const repository = createRepository();
    repository.listSemesterRecords.mockResolvedValue([
      semesterRecord,
      previousSemesterRecord,
    ]);
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockReturnValueOnce(pendingSelection.promise);
    repository.searchCatalogCourses.mockResolvedValue({
      hasNext: false,
      items: [catalogCourse],
      page: 0,
    });
    repository.addCatalogCourse.mockReturnValue(pendingAdd.promise);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });
    act(() => {
      result.current.openAddSheet();
    });
    await waitFor(() => {
      expect(
        result.current.data?.addCourseSheet.search.items.some(
          course => course.courseId === 'course-1',
        ),
      ).toBe(true);
    });

    let addPromise!: Promise<void>;
    act(() => {
      addPromise = result.current.addCatalogCourse('course-1');
    });
    await waitFor(() => {
      expect(repository.addCatalogCourse).toHaveBeenCalledTimes(1);
    });

    let selectPromise!: Promise<void>;
    act(() => {
      selectPromise = result.current.selectSemester('2026-1');
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      pendingAdd.resolve(recordAfterAdd);
      await addPromise;
    });
    await act(async () => {
      pendingSelection.resolve(previousSemesterRecord);
      await selectPromise;
    });

    expect(result.current.data?.semesterId).toBe('2026-1');
  });

  it('다른 학기 전환 후 시작한 강의 추가가 전환 요청을 취소하지 않는다', async () => {
    const previousSemesterRecord: TimetableSemesterRecord = {
      ...semesterRecord,
      id: '2026-1',
      label: '2026-1학기',
    };
    const catalogCourse = {
      code: 'CS101',
      credits: 3,
      department: '컴퓨터공학과',
      id: 'course-1',
      isOnline: false,
      locationLabel: '성결관 101호',
      name: '자료구조',
      professor: '김교수',
      schedules: [{day: 'mon' as const, endPeriod: 2, startPeriod: 1}],
      toneId: 'green' as const,
    };
    const pendingSelection = createDeferred<TimetableSemesterRecord | null>();
    const repository = createRepository();
    repository.listSemesterRecords.mockResolvedValue([
      semesterRecord,
      previousSemesterRecord,
    ]);
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockReturnValueOnce(pendingSelection.promise);
    repository.searchCatalogCourses.mockResolvedValue({
      hasNext: false,
      items: [catalogCourse],
      page: 0,
    });
    repository.addCatalogCourse.mockResolvedValue({
      ...semesterRecord,
      courses: [catalogCourse],
    });
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });
    act(() => {
      result.current.openAddSheet();
    });
    await waitFor(() => {
      expect(
        result.current.data?.addCourseSheet.search.items.some(
          course => course.courseId === 'course-1',
        ),
      ).toBe(true);
    });

    let selectPromise!: Promise<void>;
    act(() => {
      selectPromise = result.current.selectSemester('2026-1');
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await result.current.addCatalogCourse('course-1');
    });
    await act(async () => {
      pendingSelection.resolve(previousSemesterRecord);
      await selectPromise;
    });

    expect(repository.addCatalogCourse).toHaveBeenCalledWith(
      expect.objectContaining({semesterId: '2026-2'}),
    );
    expect(result.current.data?.semesterId).toBe('2026-1');
  });

  it('강의 삭제 응답이 진행 중인 다른 학기 전환을 취소하지 않는다', async () => {
    const previousSemesterRecord: TimetableSemesterRecord = {
      ...semesterRecord,
      id: '2026-1',
      label: '2026-1학기',
    };
    const pendingRemove = createDeferred<TimetableSemesterRecord | null>();
    const pendingSelection = createDeferred<TimetableSemesterRecord | null>();
    const repository = createRepository();
    repository.listSemesterRecords.mockResolvedValue([
      semesterRecordWithManualCourse,
      previousSemesterRecord,
    ]);
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecordWithManualCourse)
      .mockReturnValueOnce(pendingSelection.promise);
    repository.removeCourse.mockReturnValue(pendingRemove.promise);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const destructiveAction = buttons?.find(button => button.style === 'destructive');
      destructiveAction?.onPress?.();
    });

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });
    act(() => {
      result.current.openCourseDetail('manual-1');
    });
    act(() => {
      result.current.removeSelectedCourse();
    });
    await waitFor(() => {
      expect(repository.removeCourse).toHaveBeenCalledTimes(1);
    });

    let selectPromise!: Promise<void>;
    act(() => {
      selectPromise = result.current.selectSemester('2026-1');
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      pendingRemove.resolve(semesterRecord);
      await Promise.resolve();
    });
    await act(async () => {
      pendingSelection.resolve(previousSemesterRecord);
      await selectPromise;
    });

    expect(result.current.data?.semesterId).toBe('2026-1');
  });

  it('시간표 편집보다 늦게 끝난 이전 새로고침 응답을 무시한다', async () => {
    const staleReload = createDeferred<TimetableSemesterRecord | null>();
    const repository = createRepository();
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockReturnValueOnce(staleReload.promise);
    repository.addManualCourse.mockResolvedValue(semesterRecordWithManualCourse);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });

    let reloadPromise!: Promise<void>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => {
      expect(repository.getSemesterRecord).toHaveBeenCalledTimes(2);
    });

    act(() => {
      result.current.setManualField('name', '프로젝트 세미나');
      result.current.setManualOnline(true);
    });
    await act(async () => {
      await result.current.addManualCourse();
    });
    expect(result.current.data?.courses.map(course => course.id)).toEqual([
      'manual-1',
    ]);

    await act(async () => {
      staleReload.resolve(semesterRecord);
      await reloadPromise;
    });
    expect(result.current.data?.courses.map(course => course.id)).toEqual([
      'manual-1',
    ]);
  });

  it('새로고침 오류를 기존 시간표와 유지하고 성공한 편집 후 제거한다', async () => {
    const repository = createRepository();
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockRejectedValueOnce(new Error('network unavailable'));
    repository.addManualCourse.mockResolvedValue(semesterRecordWithManualCourse);
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.data?.semesterId).toBe('2026-2');
    expect(result.current.error).toBe('시간표를 불러오지 못했습니다.');

    act(() => {
      result.current.setManualField('name', '프로젝트 세미나');
      result.current.setManualOnline(true);
    });
    await act(async () => {
      await result.current.addManualCourse();
    });

    expect(result.current.data?.courses.map(course => course.id)).toEqual([
      'manual-1',
    ]);
    expect(result.current.error).toBeNull();
  });

  it('학기 전환 실패 후 기존 학기의 편집 응답을 계속 반영한다', async () => {
    const failedSemesterRecord: TimetableSemesterRecord = {
      ...semesterRecord,
      id: '2026-1',
      label: '2026-1학기',
    };
    const repository = createRepository();
    repository.listSemesterRecords.mockResolvedValue([
      semesterRecord,
      failedSemesterRecord,
    ]);
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockRejectedValueOnce(new Error('network unavailable'));
    repository.addManualCourse.mockResolvedValue(
      semesterRecordWithManualCourse,
    );
    mockedUseTimetableRepository.mockReturnValue(
      repository as ReturnType<typeof useTimetableRepository>,
    );

    const {result} = renderHook(() => useTimetableDetailData());
    await waitFor(() => {
      expect(result.current.data?.semesterId).toBe('2026-2');
    });

    await act(async () => {
      await result.current.selectSemester('2026-1');
    });

    expect(result.current.data?.semesterId).toBe('2026-2');
    expect(result.current.error).toBe('시간표를 불러오지 못했습니다.');

    act(() => {
      result.current.setManualField('name', '프로젝트 세미나');
      result.current.setManualOnline(true);
    });
    await act(async () => {
      await result.current.addManualCourse();
    });

    expect(repository.addManualCourse).toHaveBeenCalledWith(
      expect.objectContaining({semesterId: '2026-2'}),
    );
    expect(result.current.data?.courses.map(course => course.id)).toEqual([
      'manual-1',
    ]);
    expect(result.current.error).toBeNull();
  });
});
