import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useTimetableRepository} from '@/di';

import {useTimetableDetailData} from '../useTimetableDetailData';
import type {TimetableSemesterRecord} from '../../model/timetableDomain';

jest.mock('@/di', () => ({
  useTimetableRepository: jest.fn(),
}));

jest.mock('../../services/timetableToneStorage', () => ({
  removeTimetableCourseTone: jest.fn(),
  setTimetableCourseTone: jest.fn(),
}));

const mockedUseTimetableRepository = jest.mocked(useTimetableRepository);

const semesterRecord: TimetableSemesterRecord = {
  catalogCourses: [],
  courses: [],
  currentDay: 'mon',
  id: '2026-2',
  label: '2026-2학기',
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

  it('새로고침이 실패해도 기존 시간표와 오류를 함께 유지한다', async () => {
    const repository = createRepository();
    repository.getSemesterRecord
      .mockResolvedValueOnce(semesterRecord)
      .mockRejectedValueOnce(new Error('network unavailable'));
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
  });
});
