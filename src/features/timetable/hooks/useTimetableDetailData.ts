import React from 'react';
import {Alert, Share} from 'react-native';

import {useTimetableRepository} from '@/di';
import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {CAMPUS_HOME_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {RepositoryError, RepositoryErrorCode} from '@/shared/lib/errors';

import {getPeriodTimeInfo} from '../services/timetableCalendar';
import type {
  TimetableCatalogCourseRecord,
  TimetableCatalogCourseFilters,
  TimetableCourseRecord,
  TimetableCourseFilterOptions,
  TimetableCourseScheduleRecord,
  TimetableManualCourseDraft,
  TimetableSemesterRecord,
} from '../model/timetableDomain';
import {TIMETABLE_COURSE_TONES} from '../model/timetableCourseTones';
import type {
  TimetableAddCourseSheetViewData,
  TimetableCourseDetailViewData,
  TimetableDetailScreenViewData,
  TimetableDetailViewMode,
  TimetableDayColumnViewData,
  TimetablePeriodViewData,
  TimetableTodayRowViewData,
} from '../model/timetableViewData';
import type {
  TimetableCourseToneId,
  TimetableWeekdayId,
} from '../model/timetablePrimitives';
import {
  removeTimetableCourseTone,
  setTimetableCourseTone,
} from '../services/timetableToneStorage';

const PERIOD_NUMBERS = Array.from({length: 15}, (_, index) => index + 1);
const DAY_ORDER: TimetableWeekdayId[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DAY_LABELS: Record<TimetableWeekdayId, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
};
const TIMETABLE_TONE_ORDER = Object.keys(
  TIMETABLE_COURSE_TONES,
) as TimetableCourseToneId[];

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  전공필수: '전필',
  전공선택: '전선',
  교양필수: '교필',
  교양선택: '교선',
};
const CATALOG_COURSE_PAGE_SIZE = 30;
const EMPTY_COURSE_FILTER_OPTIONS: TimetableCourseFilterOptions = {
  categories: [],
  departments: [],
  grades: [],
};
const DEFAULT_CATALOG_FILTERS: TimetableCatalogCourseFilters = {};

const DEFAULT_MANUAL_DRAFT: TimetableManualCourseDraft = {
  credits: 3,
  department: '',
  day: 'mon',
  endPeriod: 3,
  isOnline: false,
  locationLabel: '',
  name: '',
  professor: '',
  startPeriod: 1,
  toneId: 'green',
};

const buildCatalogSearchKey = (
  semesterId: string,
  query: string,
  filters: TimetableCatalogCourseFilters,
) =>
  [
    semesterId,
    query.trim(),
    filters.department ?? '',
    filters.grade?.toString() ?? '',
    filters.category ?? '',
  ].join('::');

const mergeCatalogCourses = (
  currentCourses: TimetableCatalogCourseRecord[],
  nextCourses: TimetableCatalogCourseRecord[],
) => {
  const mergedCourses = new Map<string, TimetableCatalogCourseRecord>();

  for (const course of currentCourses) {
    mergedCourses.set(course.id, course);
  }

  for (const course of nextCourses) {
    mergedCourses.set(course.id, course);
  }

  return Array.from(mergedCourses.values());
};

const createPeriodViewData = (): TimetablePeriodViewData[] =>
  PERIOD_NUMBERS.map(periodNumber => {
    const {startTime, endTime} = getPeriodTimeInfo(periodNumber);

    return {
      id: `period-${periodNumber}`,
      periodLabel: `${periodNumber}교시`,
      periodNumber,
      startTimeLabel: startTime,
      endTimeLabel: endTime,
    };
  });

const PERIOD_VIEW_DATA = createPeriodViewData();

const isScheduleOverlapping = (
  left: TimetableCourseScheduleRecord,
  right: TimetableCourseScheduleRecord,
) =>
  left.day === right.day &&
  left.startPeriod <= right.endPeriod &&
  right.startPeriod <= left.endPeriod;

const findConflictCourseIds = (
  course: Pick<TimetableCourseRecord, 'id' | 'schedules'>,
  currentCourses: TimetableCourseRecord[],
) => {
  if (course.schedules.length === 0) {
    return [];
  }

  return currentCourses
    .filter(existingCourse => existingCourse.id !== course.id)
    .filter(existingCourse =>
      existingCourse.schedules.some(existingSchedule =>
        course.schedules.some(schedule =>
          isScheduleOverlapping(existingSchedule, schedule),
        ),
      ),
    )
    .map(existingCourse => existingCourse.id);
};

const toDayColumns = (): TimetableDayColumnViewData[] =>
  DAY_ORDER.slice(0, 5).map(day => ({
    id: day,
    label: DAY_LABELS[day],
  }));

const formatCourseMetaLabel = (course: TimetableCourseRecord) => {
  if (course.isOnline) {
    return `${course.professor} 교수님`;
  }

  const primarySchedule = course.schedules[0];

  if (!primarySchedule) {
    return `${course.professor} 교수님`;
  }

  const periodLabel =
    primarySchedule.startPeriod === primarySchedule.endPeriod
      ? `${DAY_LABELS[primarySchedule.day]} ${primarySchedule.startPeriod}교시`
      : `${DAY_LABELS[primarySchedule.day]} ${primarySchedule.startPeriod}-${primarySchedule.endPeriod}교시`;

  return `${periodLabel} · ${course.locationLabel ?? '미정'}`;
};

const formatTodayMetaLabel = (course: TimetableCourseRecord) => {
  if (course.isOnline) {
    return `${course.professor} 교수님 · 온라인`;
  }

  return `${course.professor} 교수님 · ${course.locationLabel ?? '미정'}`;
};

const formatCatalogCourseMetaLabel = (
  course: TimetableCatalogCourseRecord,
) => {
  return `${course.professor} · ${
    course.isOnline ? '온라인' : course.locationLabel ?? '미정'
  } · ${course.credits}학점`;
};

const formatCompactScheduleLabel = (
  schedule: TimetableCourseScheduleRecord,
) => {
  return `${DAY_LABELS[schedule.day]}${
    schedule.startPeriod === schedule.endPeriod
      ? schedule.startPeriod
      : `${schedule.startPeriod}-${schedule.endPeriod}`
  }`;
};

const formatCatalogCourseScheduleLabel = (
  course: TimetableCatalogCourseRecord,
) => {
  if (course.isOnline) {
    return '온라인';
  }

  if (course.schedules.length === 0) {
    return '시간 미정';
  }

  return course.schedules.map(formatCompactScheduleLabel).join(', ');
};

const formatCatalogCourseCategoryLabel = (
  course: TimetableCatalogCourseRecord,
) => {
  const normalizedCategory = course.category?.trim();

  if (!normalizedCategory) {
    return undefined;
  }

  return CATEGORY_SHORT_LABELS[normalizedCategory] ?? normalizedCategory;
};

const formatCatalogCourseGradeLabel = (
  course: TimetableCatalogCourseRecord,
) => {
  if (typeof course.grade !== 'number') {
    return undefined;
  }

  return `${course.grade}학년`;
};

const toCategoryShortLabel = (category: string) =>
  CATEGORY_SHORT_LABELS[category.trim()] ?? category.trim();

const isAlreadyExistsError = (error: unknown) =>
  error instanceof RepositoryError &&
  error.code === RepositoryErrorCode.ALREADY_EXISTS;

const getLeastUsedToneId = (courses: TimetableCourseRecord[]) => {
  const toneUsage = TIMETABLE_TONE_ORDER.reduce<
    Record<TimetableCourseToneId, number>
  >(
    (counts, toneId) => {
      counts[toneId] = 0;
      return counts;
    },
    {} as Record<TimetableCourseToneId, number>,
  );

  courses.forEach(course => {
    if (course.toneId in toneUsage) {
      toneUsage[course.toneId] += 1;
    }
  });

  return TIMETABLE_TONE_ORDER.reduce((leastUsedToneId, toneId) => {
    return toneUsage[toneId] < toneUsage[leastUsedToneId]
      ? toneId
      : leastUsedToneId;
  }, TIMETABLE_TONE_ORDER[0]);
};

const buildSelectedCourseDetail = (
  course?: TimetableCourseRecord,
): TimetableCourseDetailViewData | undefined => {
  if (!course) {
    return undefined;
  }

  const firstSchedule = course.schedules[0];
  const timeLabel = course.isOnline
    ? '온라인 수업'
    : firstSchedule
      ? firstSchedule.startPeriod === firstSchedule.endPeriod
        ? `${DAY_LABELS[firstSchedule.day]} ${firstSchedule.startPeriod}교시`
        : `${DAY_LABELS[firstSchedule.day]} ${firstSchedule.startPeriod}-${firstSchedule.endPeriod}교시`
      : '시간 미정';

  return {
    codeLabel: course.code,
    courseId: course.id,
    deleteLabel: '강의 삭제',
    rows: [
      {
        iconName: 'person-outline',
        id: 'professor',
        label: '담당 교수',
        value: `${course.professor} 교수님`,
      },
      {
        iconName: 'location-outline',
        id: 'location',
        label: '강의실',
        value: course.isOnline ? '온라인' : course.locationLabel ?? '미정',
      },
      {
        iconName: 'time-outline',
        id: 'time',
        label: '수업 시간',
        value: timeLabel,
      },
      {
        iconName: 'ribbon-outline',
        id: 'credits',
        label: '학점',
        value: `${course.credits}학점`,
      },
    ],
    title: course.name,
    toneId: course.toneId,
  };
};

const buildAddCourseSheetViewData = ({
  activeTab,
  catalogCourses,
  catalogFilters,
  courseFilterOptions,
  courses,
  departmentOptionsError,
  departmentOptionsLoading,
  departmentOptions,
  filterOptionsError,
  filterOptionsLoading,
  manualDraft,
  query,
  searchError,
  searchHasNext,
  searchLoading,
  searchLoadingMore,
  searchPending,
  selectedToneId,
}: {
  activeTab: 'manual' | 'search';
  catalogCourses: TimetableCatalogCourseRecord[];
  catalogFilters: TimetableCatalogCourseFilters;
  courseFilterOptions: TimetableCourseFilterOptions;
  courses: TimetableCourseRecord[];
  departmentOptionsError: string | null;
  departmentOptionsLoading: boolean;
  departmentOptions: string[];
  filterOptionsError: string | null;
  filterOptionsLoading: boolean;
  manualDraft: TimetableManualCourseDraft;
  query: string;
  searchError: string | null;
  searchHasNext: boolean;
  searchLoading: boolean;
  searchLoadingMore: boolean;
  searchPending: boolean;
  selectedToneId: TimetableCourseToneId;
}): TimetableAddCourseSheetViewData => {
  const addedCourseIds = new Set(courses.map(course => course.id));
  const isSearchLoading = searchLoading || searchPending;

  return {
    activeTab,
    colors: Object.keys(TIMETABLE_COURSE_TONES).map(colorId => ({
      id: colorId as TimetableCourseToneId,
      selected: colorId === selectedToneId,
    })),
    manual: {
      canSubmit:
        manualDraft.name.trim().length > 0 &&
        (manualDraft.isOnline || manualDraft.locationLabel.trim().length > 0),
      credits: [1, 2, 3].map(credit => ({
        id: credit,
        label: `${credit}학점`,
        selected: credit === manualDraft.credits,
      })),
      departmentErrorLabel: departmentOptionsError ?? undefined,
      departmentOptions: [
        {id: '', label: '선택 안 함'},
        ...departmentOptions.map(department => ({
          id: department,
          label: department,
        })),
      ],
      departmentValue: manualDraft.department,
      dayOptions: DAY_ORDER.map(day => ({
        id: day,
        label: DAY_LABELS[day],
        selected: day === manualDraft.day,
      })),
      endPeriod: {
        canDecrease: manualDraft.endPeriod > manualDraft.startPeriod,
        canIncrease: manualDraft.endPeriod < 15,
        label: `${manualDraft.endPeriod}교시`,
      },
      isDepartmentLoading: departmentOptionsLoading,
      isOnline: manualDraft.isOnline,
      locationValue: manualDraft.locationLabel,
      nameValue: manualDraft.name,
      professorValue: manualDraft.professor,
      selectedColorId: selectedToneId,
      startPeriod: {
        canDecrease: manualDraft.startPeriod > 1,
        canIncrease: manualDraft.startPeriod < manualDraft.endPeriod,
        label: `${manualDraft.startPeriod}교시`,
      },
    },
    search: {
      emptyLabel:
        !isSearchLoading && !searchError && catalogCourses.length === 0
          ? query.trim().length > 0
            ? '검색 결과가 없습니다.'
            : '등록 가능한 강의를 찾지 못했습니다.'
          : undefined,
      errorLabel: searchError ?? undefined,
      hasNext: searchHasNext,
      filters: {
        categories: [
          {id: '', label: '구분 전체'},
          ...courseFilterOptions.categories.map(category => ({
            id: category,
            label: toCategoryShortLabel(category),
          })),
        ],
        departments: [
          {id: '', label: '학과 전체'},
          ...courseFilterOptions.departments.map(department => ({
            id: department,
            label: department,
          })),
        ],
        errorLabel: filterOptionsError ?? undefined,
        grades: [
          {id: '', label: '학년 전체'},
          ...courseFilterOptions.grades.map(grade => ({
            id: grade.toString(),
            label: `${grade}학년`,
          })),
        ],
        isLoading: filterOptionsLoading,
        selectedCategoryId: catalogFilters.category ?? '',
        selectedDepartmentId: catalogFilters.department ?? '',
        selectedGradeId: catalogFilters.grade?.toString() ?? '',
      },
      isLoading: isSearchLoading,
      isLoadingMore: searchLoadingMore,
      items: catalogCourses.map(course => {
        const categoryLabel = formatCatalogCourseCategoryLabel(course);
        const gradeLabel = formatCatalogCourseGradeLabel(course);
        const scheduleLabel = formatCatalogCourseScheduleLabel(course);

        return {
          alreadyAdded: addedCourseIds.has(course.id),
          categoryLabel,
          codeLabel: course.code,
          courseId: course.id,
          departmentLabel: course.department,
          gradeLabel,
          metaLabel: formatCatalogCourseMetaLabel(course),
          scheduleLabel,
          title: course.name,
        };
      }),
      placeholder: '강의명, 교수명, 강의코드 검색',
      query,
    },
  };
};

const buildScreenViewData = ({
  activeMode,
  courses,
  currentDay,
  record,
  selectedCourseId,
  showNightClasses,
}: {
  activeMode: TimetableDetailViewMode;
  courses: TimetableCourseRecord[];
  currentDay: TimetableWeekdayId;
  record: TimetableSemesterRecord;
  selectedCourseId?: string;
  showNightClasses: boolean;
}): Omit<TimetableDetailScreenViewData, 'addCourseSheet' | 'semesterOptions'> => {
  const isSunday = new Date().getDay() === 0;
  const periods = PERIOD_VIEW_DATA;
  const allViewPeriods = periods.filter(period => period.periodNumber <= 9);
  const columns = toDayColumns();
  const selectedCourse = courses.find(course => course.id === selectedCourseId);
  const coursesOnCurrentDay = courses
    .filter(course =>
      course.schedules.some(schedule => schedule.day === currentDay),
    )
    .sort((left, right) => {
      const leftStart = left.schedules[0]?.startPeriod ?? Number.MAX_SAFE_INTEGER;
      const rightStart = right.schedules[0]?.startPeriod ?? Number.MAX_SAFE_INTEGER;
      return leftStart - rightStart;
    });
  const hasCurrentDayNightClasses = coursesOnCurrentDay.some(course =>
    course.schedules.some(schedule => schedule.endPeriod > 9),
  );
  const hasAnyNightClasses = courses.some(course =>
    course.schedules.some(schedule => schedule.endPeriod > 9),
  );
  const showExpandedToday = hasCurrentDayNightClasses ? showNightClasses : false;
  const showExpandedAllView = hasAnyNightClasses ? showNightClasses : false;
  const visibleTodayPeriods = showExpandedToday ? periods : allViewPeriods;
  const visibleAllViewPeriods = showExpandedAllView ? periods : allViewPeriods;
  const maxVisibleTodayPeriodNumber =
    visibleTodayPeriods[visibleTodayPeriods.length - 1]?.periodNumber ?? 9;
  const maxVisibleAllViewPeriodNumber =
    visibleAllViewPeriods[visibleAllViewPeriods.length - 1]?.periodNumber ?? 9;
  const todayRows: TimetableTodayRowViewData[] = [];

  let periodIndex = 0;

  while (periodIndex < visibleTodayPeriods.length) {
    const period = visibleTodayPeriods[periodIndex];
    const session = coursesOnCurrentDay.find(course =>
      course.schedules.some(
        schedule =>
          schedule.day === currentDay &&
          schedule.startPeriod <= period.periodNumber &&
          schedule.endPeriod >= period.periodNumber,
      ),
    );

    if (!session) {
      todayRows.push({
        id: `today-row-${period.periodNumber}`,
        periodLabel: `${period.periodNumber}교시`,
        startTimeLabel: period.startTimeLabel,
        state: 'empty',
        timeSlots: [
          {
            periodLabel: `${period.periodNumber}교시`,
            startTimeLabel: period.startTimeLabel,
          },
        ],
        visiblePeriodSpan: 1,
      });
      periodIndex += 1;
      continue;
    }

    const schedule = session.schedules.find(
      candidate =>
        candidate.day === currentDay &&
        candidate.startPeriod <= period.periodNumber &&
        candidate.endPeriod >= period.periodNumber,
    );

    if (!schedule || schedule.startPeriod !== period.periodNumber) {
      periodIndex += 1;
      continue;
    }

    const visibleEndPeriodNumber = Math.min(
      schedule.endPeriod,
      maxVisibleTodayPeriodNumber,
    );
    const visibleEndPeriod = periods.find(
      candidate => candidate.periodNumber === visibleEndPeriodNumber,
    );
    const visiblePeriodSpan =
      visibleEndPeriodNumber - schedule.startPeriod + 1;
    const visiblePeriodLabel =
      schedule.startPeriod === visibleEndPeriodNumber
        ? `${schedule.startPeriod}교시`
        : `${schedule.startPeriod}-${visibleEndPeriodNumber}교시`;
    const timeSlots = periods
      .filter(
        candidate =>
          candidate.periodNumber >= schedule.startPeriod &&
          candidate.periodNumber <= visibleEndPeriodNumber,
      )
      .map(candidate => ({
        periodLabel: `${candidate.periodNumber}교시`,
        startTimeLabel: candidate.startTimeLabel,
      }));

    todayRows.push({
      course: {
        courseId: session.id,
        endTimeLabel: visibleEndPeriod?.endTimeLabel,
        metaLabel: formatTodayMetaLabel(session),
        title: session.name,
        toneId: session.toneId,
      },
      id: `today-row-${period.periodNumber}`,
      periodLabel: visiblePeriodLabel,
      startTimeLabel: period.startTimeLabel,
      state: 'course',
      timeSlots,
      visiblePeriodSpan,
    });

    periodIndex += visiblePeriodSpan;
  }

  return {
    activeMode,
    allView: {
      blocks: courses
        .flatMap(course =>
          course.schedules
            .filter(
              schedule =>
                schedule.day !== 'sat' &&
                schedule.startPeriod <= maxVisibleAllViewPeriodNumber,
            )
            .map(schedule => ({
              courseId: course.id,
              endPeriod: Math.min(
                schedule.endPeriod,
                maxVisibleAllViewPeriodNumber,
              ),
              id: `${course.id}-${schedule.day}-${schedule.startPeriod}`,
              roomLabel: course.isOnline ? '온라인' : course.locationLabel,
              selected: course.id === selectedCourseId,
              startPeriod: schedule.startPeriod,
              title: course.name,
              toneId: course.toneId,
              weekdayId: schedule.day,
            })),
        )
        .filter(block =>
          columns.some(column => column.id === block.weekdayId),
        ),
      collapsed: !showExpandedAllView,
      columns,
      hasNightClasses: hasAnyNightClasses,
      nightToggleLabel: showExpandedAllView
        ? '야간 수업 접기'
        : '야간 수업 펼치기',
      onlineItems: courses
        .filter(course => course.isOnline)
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
        .map(course => ({
          courseId: course.id,
          id: `online-${course.id}`,
          metaLabel: `${course.professor} 교수님`,
          title: course.name,
          toneId: course.toneId,
        })),
      periods: visibleAllViewPeriods,
      saturdayItems: courses
        .filter(course =>
          course.schedules.some(schedule => schedule.day === 'sat'),
        )
        .sort((left, right) => {
          const leftStart = left.schedules[0]?.startPeriod ?? 0;
          const rightStart = right.schedules[0]?.startPeriod ?? 0;
          return leftStart - rightStart;
        })
        .map(course => ({
          courseId: course.id,
          id: `sat-${course.id}`,
          metaLabel: formatCourseMetaLabel(course),
          title: course.name,
          toneId: course.toneId,
        })),
    },
    courses,
    selectedCourse: buildSelectedCourseDetail(selectedCourse),
    semesterId: record.id,
    semesterLabel: record.label,
    totalCreditsLabel: `총 ${courses.reduce((sum, course) => sum + course.credits, 0)}학점`,
    todayView: {
      collapsed: !showExpandedToday,
      emptyState: isSunday
        ? {
            title: '오늘은 일요일이에요',
            description: '일요일엔 휴식을 취하세요',
          }
        : undefined,
      hasNightClasses: hasCurrentDayNightClasses,
      nightToggleLabel: showExpandedToday
        ? '야간 수업 접기'
        : '야간 수업 펼치기',
      rows: isSunday ? [] : todayRows,
    },
  };
};

export const useTimetableDetailData = (
  initialMode: TimetableDetailViewMode = 'all',
) => {
  const timetableRepository = useTimetableRepository();
  const [activeMode, setActiveMode] =
    React.useState<TimetableDetailViewMode>(initialMode);
  const [activeTab, setActiveTab] = React.useState<'manual' | 'search'>('search');
  const [addSheetVisible, setAddSheetVisible] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [manualDraft, setManualDraft] =
    React.useState<TimetableManualCourseDraft>(DEFAULT_MANUAL_DRAFT);
  const [catalogFilters, setCatalogFilters] =
    React.useState<TimetableCatalogCourseFilters>(DEFAULT_CATALOG_FILTERS);
  const [courseFilterOptions, setCourseFilterOptions] =
    React.useState<TimetableCourseFilterOptions>(EMPTY_COURSE_FILTER_OPTIONS);
  const [departmentOptions, setDepartmentOptions] = React.useState<string[]>([]);
  const [departmentOptionsError, setDepartmentOptionsError] =
    React.useState<string | null>(null);
  const [departmentOptionsLoaded, setDepartmentOptionsLoaded] =
    React.useState(false);
  const [departmentOptionsLoading, setDepartmentOptionsLoading] =
    React.useState(false);
  const [filterOptionsError, setFilterOptionsError] = React.useState<string | null>(null);
  const [filterOptionsLoading, setFilterOptionsLoading] = React.useState(false);
  const [filterOptionsSemesterId, setFilterOptionsSemesterId] = React.useState<string>();
  const [query, setQuery] = React.useState('');
  const [record, setRecord] = React.useState<TimetableSemesterRecord | null>(null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>();
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<string>();
  const [selectedToneId, setSelectedToneId] =
    React.useState<TimetableCourseToneId>('green');
  const [semesterOptions, setSemesterOptions] = React.useState<
    {id: string; label: string}[]
  >([]);
  const [searchCatalogCourses, setSearchCatalogCourses] = React.useState<
    TimetableCatalogCourseRecord[]
  >([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchHasNext, setSearchHasNext] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = React.useState(false);
  const [searchPage, setSearchPage] = React.useState(0);
  const [searchResultKey, setSearchResultKey] = React.useState<string>();
  const [showNightClasses, setShowNightClasses] = React.useState(false);
  const searchRequestIdRef = React.useRef(0);
  const selectedSemesterIdRef = React.useRef<string | undefined>(undefined);
  const currentSearchKey = selectedSemesterId
    ? buildCatalogSearchKey(selectedSemesterId, query, catalogFilters)
    : undefined;

  const loadSemester = React.useCallback(async (semesterId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const semesters = await timetableRepository.listSemesterRecords();
      const options = semesters.map(semester => ({
        id: semester.id,
        label: semester.label,
      }));
      const nextSemesterId =
        semesterId ?? selectedSemesterIdRef.current ?? semesters[0]?.id;
      const nextSemesterOption = nextSemesterId
        ? options.find(option => option.id === nextSemesterId)
        : undefined;

      setSemesterOptions(options);

      if (!nextSemesterId) {
        selectedSemesterIdRef.current = undefined;
        setRecord(null);
        setSelectedSemesterId(undefined);
        setShowNightClasses(false);
        return;
      }

      const nextRecord = await timetableRepository.getSemesterRecord(
        nextSemesterId,
        nextSemesterOption?.label ?? `${nextSemesterId}학기`,
      );

      selectedSemesterIdRef.current = nextSemesterId;
      setRecord(nextRecord ?? null);
      setSelectedSemesterId(nextSemesterId);
      setShowNightClasses(
        nextRecord?.courses.some(course =>
          course.schedules.some(schedule => schedule.endPeriod > 9),
        ) ?? false,
      );
    } catch (loadError) {
      console.error(loadError);
      setError('시간표를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [timetableRepository]);

  const loadCatalogCoursesPage = React.useCallback(
    async ({
      page,
      reset,
    }: {
      page: number;
      reset: boolean;
    }) => {
      if (!selectedSemesterId) {
        return;
      }

      const nextQuery = query.trim();
      const nextSearchKey = buildCatalogSearchKey(
        selectedSemesterId,
        nextQuery,
        catalogFilters,
      );
      const requestId = ++searchRequestIdRef.current;

      if (reset) {
        setSearchLoading(true);
        setSearchLoadingMore(false);
        setSearchError(null);
        setSearchCatalogCourses([]);
        setSearchHasNext(false);
        setSearchPage(0);
      } else {
        setSearchLoadingMore(true);
      }

      try {
        const response = await timetableRepository.searchCatalogCourses({
          filters: catalogFilters,
          page,
          query: nextQuery.length > 0 ? nextQuery : undefined,
          semesterId: selectedSemesterId,
          size: CATALOG_COURSE_PAGE_SIZE,
        });

        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        setSearchCatalogCourses(previousCourses =>
          reset
            ? response.items
            : mergeCatalogCourses(previousCourses, response.items),
        );
        setSearchError(null);
        setSearchHasNext(response.hasNext);
        setSearchPage(response.page);
        setSearchResultKey(nextSearchKey);
      } catch (catalogLoadError) {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        console.error(catalogLoadError);
        if (reset) {
          setSearchCatalogCourses([]);
          setSearchHasNext(false);
          setSearchPage(0);
        }
        setSearchError('강의 목록을 불러오지 못했습니다.');
        setSearchResultKey(nextSearchKey);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchLoading(false);
          setSearchLoadingMore(false);
        }
      }
    },
    [catalogFilters, query, selectedSemesterId, timetableRepository],
  );

  const loadCourseFilterOptions = React.useCallback(async () => {
    if (!selectedSemesterId) {
      return;
    }

    setFilterOptionsLoading(true);
    setFilterOptionsError(null);

    try {
      const nextFilterOptions =
        await timetableRepository.getCourseFilterOptions(selectedSemesterId);
      setCourseFilterOptions(nextFilterOptions);
      setFilterOptionsSemesterId(selectedSemesterId);
    } catch (optionsError) {
      console.error(optionsError);
      setCourseFilterOptions(EMPTY_COURSE_FILTER_OPTIONS);
      setFilterOptionsError('필터를 불러오지 못했습니다.');
      setFilterOptionsSemesterId(selectedSemesterId);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, [selectedSemesterId, timetableRepository]);

  const loadDepartmentOptions = React.useCallback(async () => {
    setDepartmentOptionsLoading(true);
    setDepartmentOptionsError(null);

    try {
      const nextDepartmentOptions =
        await timetableRepository.listDepartments();
      setDepartmentOptions(nextDepartmentOptions);
    } catch (optionsError) {
      console.error(optionsError);
      setDepartmentOptions([]);
      setDepartmentOptionsError('학과 목록을 불러오지 못했습니다.');
    } finally {
      setDepartmentOptionsLoaded(true);
      setDepartmentOptionsLoading(false);
    }
  }, [timetableRepository]);

  React.useEffect(() => {
    loadSemester().catch(() => undefined);
  }, [loadSemester]);

  React.useEffect(() => {
    if (
      !addSheetVisible ||
      activeTab !== 'search' ||
      !selectedSemesterId ||
      !currentSearchKey
    ) {
      return;
    }

    if (searchResultKey === currentSearchKey) {
      return;
    }

    loadCatalogCoursesPage({page: 0, reset: true}).catch(() => undefined);
  }, [
    activeTab,
    addSheetVisible,
    currentSearchKey,
    loadCatalogCoursesPage,
    searchResultKey,
    selectedSemesterId,
  ]);

  React.useEffect(() => {
    if (
      !addSheetVisible ||
      !selectedSemesterId ||
      filterOptionsSemesterId === selectedSemesterId
    ) {
      return;
    }

    loadCourseFilterOptions().catch(() => undefined);
  }, [
    addSheetVisible,
    filterOptionsSemesterId,
    loadCourseFilterOptions,
    selectedSemesterId,
  ]);

  React.useEffect(() => {
    if (!addSheetVisible || departmentOptionsLoaded) {
      return;
    }

    loadDepartmentOptions().catch(() => undefined);
  }, [addSheetVisible, departmentOptionsLoaded, loadDepartmentOptions]);

  const resetManualDraft = React.useCallback(() => {
    setManualDraft(previousDraft => ({
      ...DEFAULT_MANUAL_DRAFT,
      toneId: previousDraft.toneId,
    }));
  }, []);

  const closeAddSheet = React.useCallback(() => {
    setAddSheetVisible(false);
    setQuery('');
    setActiveTab('search');
    setCatalogFilters(DEFAULT_CATALOG_FILTERS);
    resetManualDraft();
  }, [resetManualDraft]);

  const openAddSheet = React.useCallback(() => {
    const defaultToneId = getLeastUsedToneId(record?.courses ?? []);

    setSelectedToneId(defaultToneId);
    setManualDraft({
      ...DEFAULT_MANUAL_DRAFT,
      toneId: defaultToneId,
    });
    setSelectedCourseId(undefined);
    setAddSheetVisible(true);
  }, [record]);

  const loadMoreCatalogCourses = React.useCallback(async () => {
    if (
      !addSheetVisible ||
      activeTab !== 'search' ||
      !currentSearchKey ||
      searchLoading ||
      searchLoadingMore ||
      !searchHasNext ||
      searchResultKey !== currentSearchKey
    ) {
      return;
    }

    await loadCatalogCoursesPage({
      page: searchPage + 1,
      reset: false,
    });
  }, [
    activeTab,
    addSheetVisible,
    currentSearchKey,
    loadCatalogCoursesPage,
    searchHasNext,
    searchLoading,
    searchLoadingMore,
    searchPage,
    searchResultKey,
  ]);

  const retryCatalogCourseSearch = React.useCallback(async () => {
    if (!selectedSemesterId) {
      return;
    }

    setSearchResultKey(undefined);
    await loadCatalogCoursesPage({page: 0, reset: true});
  }, [loadCatalogCoursesPage, selectedSemesterId]);

  const closeCourseDetail = React.useCallback(() => {
    setSelectedCourseId(undefined);
  }, []);

  const openCourseDetail = React.useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
  }, []);

  const refreshRecord = React.useCallback((nextRecord: TimetableSemesterRecord | null) => {
    setRecord(nextRecord);
  }, []);

  const visibleCatalogCourses = React.useMemo(() => {
    if (!currentSearchKey || searchResultKey !== currentSearchKey) {
      return [];
    }

    return searchCatalogCourses;
  }, [currentSearchKey, searchCatalogCourses, searchResultKey]);

  const searchPending = React.useMemo(() => {
    if (!currentSearchKey) {
      return false;
    }

    return searchResultKey !== currentSearchKey;
  }, [currentSearchKey, searchResultKey]);

  const addCatalogCourse = React.useCallback(
    async (courseId: string) => {
      if (!record || !selectedSemesterId) {
        return;
      }

      const targetCourse = visibleCatalogCourses.find(course => course.id === courseId);

      if (!targetCourse) {
        return;
      }

      if (record.courses.some(course => course.id === courseId)) {
        Alert.alert('이미 추가된 강의입니다', '현재 시간표에 이미 포함된 강의입니다.');
        return;
      }

      const conflictIds = findConflictCourseIds(targetCourse, record.courses);

      if (conflictIds.length > 0) {
        Alert.alert(
          '시간이 겹치는 강의가 있습니다',
          '기존 강의를 먼저 삭제한 뒤 다시 추가해주세요.',
        );
        return;
      }

      const previousRecord = record;
      const optimisticCourse: TimetableCourseRecord = {
        ...targetCourse,
        toneId: selectedToneId,
      };

      refreshRecord({
        ...previousRecord,
        courses: [...previousRecord.courses, optimisticCourse],
      });
      closeAddSheet();

      setTimetableCourseTone(
        selectedSemesterId,
        courseId,
        selectedToneId,
      ).catch(toneError => {
        console.warn('시간표 색상을 저장하지 못했습니다.', toneError);
      });

      try {
        const nextRecord = await timetableRepository.addCatalogCourse({
          courseId,
          semesterId: selectedSemesterId,
          toneId: selectedToneId,
        });

        if (!nextRecord) {
          await loadSemester(selectedSemesterId);
          invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
          return;
        }

        refreshRecord({
          ...nextRecord,
          label: previousRecord.label,
          courses: nextRecord.courses.map(course =>
            course.id === courseId
              ? {...course, toneId: selectedToneId}
              : course,
          ),
        });
        invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
      } catch (addError) {
        refreshRecord(previousRecord);

        if (isAlreadyExistsError(addError)) {
          Alert.alert(
            '시간이 겹치는 강의가 있습니다',
            '기존 강의를 먼저 삭제한 뒤 다시 추가해주세요.',
          );
          return;
        }

        loadSemester(selectedSemesterId).catch(() => undefined);
        Alert.alert(
          '강의를 추가하지 못했습니다',
          '잠시 후 다시 시도해주세요.',
        );
      }
    },
    [
      closeAddSheet,
      loadSemester,
      record,
      refreshRecord,
      selectedSemesterId,
      selectedToneId,
      timetableRepository,
      visibleCatalogCourses,
    ],
  );

  const addManualCourse = React.useCallback(async () => {
    if (!record || !selectedSemesterId) {
      return;
    }

    if (
      manualDraft.name.trim().length === 0 ||
      (!manualDraft.isOnline && manualDraft.locationLabel.trim().length === 0)
    ) {
      return;
    }

    const nextCourse: TimetableCourseRecord = {
      code: '직접 입력',
      credits: manualDraft.credits,
      id: 'manual-preview',
      isOnline: manualDraft.isOnline,
      locationLabel: manualDraft.locationLabel,
      name: manualDraft.name,
      professor: manualDraft.professor || '직접 입력',
      schedules: manualDraft.isOnline
        ? []
        : [
            {
              day: manualDraft.day,
              endPeriod: manualDraft.endPeriod,
              startPeriod: manualDraft.startPeriod,
            },
          ],
      toneId: manualDraft.toneId,
    };
    const conflictIds = findConflictCourseIds(nextCourse, record.courses);

    if (conflictIds.length > 0) {
      Alert.alert(
        '시간이 겹치는 강의가 있습니다',
        '기존 강의를 먼저 삭제한 뒤 다시 추가해주세요.',
      );
      return;
    }

    const previousCourseIds = new Set(record.courses.map(course => course.id));
    const nextRecord = await timetableRepository.addManualCourse({
      draft: manualDraft,
      semesterId: selectedSemesterId,
    });

    if (!nextRecord) {
      await loadSemester(selectedSemesterId);
      invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
      closeAddSheet();
      return;
    }

    const addedCourse = nextRecord.courses.find(
      course => !previousCourseIds.has(course.id),
    );

    if (nextRecord && addedCourse) {
      try {
        await setTimetableCourseTone(
          selectedSemesterId,
          addedCourse.id,
          manualDraft.toneId,
        );
      } catch (toneError) {
        console.warn('시간표 색상을 저장하지 못했습니다.', toneError);
      }

      const nextCourses = nextRecord.courses.map(course =>
        course.id === addedCourse.id
          ? {...course, toneId: manualDraft.toneId}
          : course,
      );

      refreshRecord({
        ...nextRecord,
        label: record.label,
        courses: nextCourses,
      });
      invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
      closeAddSheet();
      return;
    }

    refreshRecord({
      ...nextRecord,
      label: record.label,
    });
    invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
    closeAddSheet();
  }, [
    closeAddSheet,
    loadSemester,
    manualDraft,
    record,
    refreshRecord,
    selectedSemesterId,
    timetableRepository,
  ]);

  const removeSelectedCourse = React.useCallback(() => {
    if (!selectedCourseId || !selectedSemesterId || !record) {
      return;
    }

    const course = record.courses.find(item => item.id === selectedCourseId);

    if (!course) {
      return;
    }

    const removedCourseId = selectedCourseId;
    setSelectedCourseId(undefined);

    Alert.alert('강의 삭제', `"${course.name}" 강의를 삭제할까요?`, [
      {
        text: '취소',
        style: 'cancel',
        onPress: () => {
          setSelectedCourseId(removedCourseId);
        },
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const previousRecord = record;

          refreshRecord({
            ...previousRecord,
            courses: previousRecord.courses.filter(
              item => item.id !== removedCourseId,
            ),
          });

          try {
            const nextRecord = await timetableRepository.removeCourse({
              courseId: removedCourseId,
              semesterId: selectedSemesterId,
            });

            try {
              await removeTimetableCourseTone(
                selectedSemesterId,
                removedCourseId,
              );
            } catch (toneError) {
              console.warn('시간표 색상을 삭제하지 못했습니다.', toneError);
            }

            if (nextRecord) {
              refreshRecord({
                ...nextRecord,
                label: previousRecord.label,
              });
            } else {
              await loadSemester(selectedSemesterId);
            }

            invalidateData(CAMPUS_HOME_INVALIDATION_KEY);
          } catch (removeError) {
            refreshRecord(previousRecord);
            setSelectedCourseId(removedCourseId);
            Alert.alert(
              '강의를 삭제하지 못했습니다',
              removeError instanceof RepositoryError
                ? removeError.getUserMessage()
                : '잠시 후 다시 시도해주세요.',
            );
          }
        },
      },
    ]);
  }, [
    loadSemester,
    record,
    refreshRecord,
    selectedCourseId,
    selectedSemesterId,
    timetableRepository,
  ]);

  const shareTimetable = React.useCallback(async () => {
    if (!record) {
      return;
    }

    const message = [
      `${record.label} 시간표`,
      ...record.courses.map(course => `- ${course.name} (${course.credits}학점)`),
    ].join('\n');

    await Share.share({message});
  }, [record]);

  const addCourseSheetData = React.useMemo(() => {
    if (!record) {
      return undefined;
    }

    return buildAddCourseSheetViewData({
      activeTab,
      catalogFilters,
      catalogCourses: visibleCatalogCourses,
      courseFilterOptions,
      courses: record.courses,
      departmentOptionsError,
      departmentOptionsLoading,
      departmentOptions,
      filterOptionsError,
      filterOptionsLoading,
      manualDraft,
      query,
      searchError,
      searchHasNext,
      searchLoading,
      searchLoadingMore,
      searchPending,
      selectedToneId,
    });
  }, [
    activeTab,
    catalogFilters,
    courseFilterOptions,
    departmentOptionsError,
    departmentOptionsLoading,
    departmentOptions,
    filterOptionsError,
    filterOptionsLoading,
    manualDraft,
    query,
    record,
    searchError,
    searchHasNext,
    searchLoading,
    searchLoadingMore,
    searchPending,
    selectedToneId,
    visibleCatalogCourses,
  ]);

  const data = React.useMemo(() => {
    if (!record || !addCourseSheetData) {
      return undefined;
    }

    const viewData = buildScreenViewData({
      activeMode,
      courses: record.courses,
      currentDay: record.currentDay,
      record,
      selectedCourseId,
      showNightClasses,
    });

    return {
      addCourseSheet: addCourseSheetData,
      ...viewData,
      semesterOptions,
    };
  }, [
    addCourseSheetData,
    activeMode,
    record,
    selectedCourseId,
    semesterOptions,
    showNightClasses,
  ]);

  return {
    activeMode,
    addCatalogCourse,
    addManualCourse,
    addSheetVisible,
    closeAddSheet,
    closeCourseDetail,
    data,
    error,
    loadMoreCatalogCourses,
    loading,
    openAddSheet,
    openCourseDetail,
    reload: () => loadSemester(selectedSemesterId),
    removeSelectedCourse,
    retryCatalogCourseSearch,
    retryCourseFilterOptions: () => loadCourseFilterOptions(),
    retryDepartmentOptions: () => loadDepartmentOptions(),
    selectColor: (colorId: TimetableCourseToneId) => {
      setSelectedToneId(colorId);
      setManualDraft(previousDraft => ({
        ...previousDraft,
        toneId: colorId,
      }));
    },
    selectMode: (mode: TimetableDetailViewMode) => {
      setActiveMode(mode);
      setSelectedCourseId(undefined);
    },
    selectSemester: async (semesterId: string) => {
      setSelectedCourseId(undefined);
      setCatalogFilters(DEFAULT_CATALOG_FILTERS);
      setCourseFilterOptions(EMPTY_COURSE_FILTER_OPTIONS);
      setFilterOptionsSemesterId(undefined);
      await loadSemester(semesterId);
    },
    setAddSheetTab: (tab: 'manual' | 'search') => setActiveTab(tab),
    setCatalogCategory: (category: string) =>
      setCatalogFilters(previousFilters => ({
        ...previousFilters,
        category: category || undefined,
      })),
    setCatalogDepartment: (department: string) =>
      setCatalogFilters(previousFilters => ({
        ...previousFilters,
        department: department || undefined,
      })),
    setCatalogGrade: (grade: string) =>
      setCatalogFilters(previousFilters => ({
        ...previousFilters,
        grade: grade ? Number(grade) : undefined,
      })),
    setManualCredits: (credits: number) =>
      setManualDraft(previousDraft => ({
        ...previousDraft,
        credits,
      })),
    setManualDay: (day: TimetableWeekdayId) =>
      setManualDraft(previousDraft => ({
        ...previousDraft,
        day,
      })),
    setManualEndPeriod: (delta: -1 | 1) =>
      setManualDraft(previousDraft => {
        const nextEndPeriod = Math.min(
          15,
          Math.max(previousDraft.startPeriod, previousDraft.endPeriod + delta),
        );

        return {
          ...previousDraft,
          endPeriod: nextEndPeriod,
        };
      }),
    setManualField: (
      field: 'department' | 'locationLabel' | 'name' | 'professor',
      value: string,
    ) =>
      setManualDraft(previousDraft => ({
        ...previousDraft,
        [field]: value,
      })),
    setManualOnline: (enabled: boolean) =>
      setManualDraft(previousDraft => ({
        ...previousDraft,
        isOnline: enabled,
        locationLabel: enabled ? '' : previousDraft.locationLabel,
      })),
    setManualStartPeriod: (delta: -1 | 1) =>
      setManualDraft(previousDraft => {
        const nextStartPeriod = Math.max(
          1,
          Math.min(previousDraft.startPeriod + delta, previousDraft.endPeriod),
        );

        return {
          ...previousDraft,
          startPeriod: nextStartPeriod,
        };
      }),
    setQuery,
    shareTimetable,
    toggleNightClasses: () => setShowNightClasses(previousValue => !previousValue),
  };
};
