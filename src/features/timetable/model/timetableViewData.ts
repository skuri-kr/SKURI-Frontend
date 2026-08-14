import type {
  TimetableCourseToneId,
  TimetableWeekdayId,
} from './timetablePrimitives';

export type TimetableDetailViewMode = 'today' | 'all';

export interface TimetableSemesterOptionViewData {
  id: string;
  label: string;
}

export interface TimetablePeriodViewData {
  id: string;
  periodNumber: number;
  periodLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
}

export interface TimetableDayColumnViewData {
  id: TimetableWeekdayId;
  label: string;
}

export interface TimetableGridBlockViewData {
  courseId: string;
  id: string;
  title: string;
  toneId: TimetableCourseToneId;
  roomLabel?: string;
  selected?: boolean;
  startPeriod: number;
  endPeriod: number;
  weekdayId: TimetableWeekdayId;
}

export interface TimetableSupplementItemViewData {
  courseId: string;
  id: string;
  metaLabel: string;
  title: string;
  toneId: TimetableCourseToneId;
}

export interface TimetableTodayRowViewData {
  course?: {
    courseId: string;
    endTimeLabel?: string;
    metaLabel: string;
    title: string;
    toneId: TimetableCourseToneId;
  };
  id: string;
  periodLabel: string;
  startTimeLabel: string;
  state: 'course' | 'empty';
  timeSlots: Array<{
    periodLabel: string;
    startTimeLabel: string;
  }>;
  visiblePeriodSpan: number;
}

export interface TimetableTodayEmptyStateViewData {
  description: string;
  title: string;
}

export interface TimetableCourseDetailRowViewData {
  iconName: string;
  id: string;
  label: string;
  value: string;
}

export interface TimetableCourseDetailViewData {
  codeLabel: string;
  courseId: string;
  deleteLabel: string;
  rows: TimetableCourseDetailRowViewData[];
  title: string;
  toneId: TimetableCourseToneId;
}

export interface TimetableCatalogCourseViewData {
  alreadyAdded?: boolean;
  categoryLabel?: string;
  courseId: string;
  codeLabel: string;
  departmentLabel?: string;
  gradeLabel?: string;
  metaLabel: string;
  scheduleLabel?: string;
  title: string;
}

export interface TimetableFilterOptionViewData {
  id: string;
  label: string;
}

export interface TimetableColorOptionViewData {
  id: TimetableCourseToneId;
  selected: boolean;
}

export interface TimetableManualCreditOptionViewData {
  id: number;
  label: string;
  selected: boolean;
}

export interface TimetableManualDayOptionViewData {
  id: TimetableWeekdayId;
  label: string;
  selected: boolean;
}

export interface TimetableManualStepperViewData {
  canDecrease: boolean;
  canIncrease: boolean;
  label: string;
}

export interface TimetableSearchTabViewData {
  emptyLabel?: string;
  errorLabel?: string;
  hasNext: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  items: TimetableCatalogCourseViewData[];
  filters: {
    categories: TimetableFilterOptionViewData[];
    departments: TimetableFilterOptionViewData[];
    errorLabel?: string;
    grades: TimetableFilterOptionViewData[];
    isLoading: boolean;
    selectedCategoryId: string;
    selectedDepartmentId: string;
    selectedGradeId: string;
  };
  placeholder: string;
  query: string;
}

export interface TimetableManualFormViewData {
  canSubmit: boolean;
  credits: TimetableManualCreditOptionViewData[];
  departmentErrorLabel?: string;
  departmentOptions: TimetableFilterOptionViewData[];
  departmentValue: string;
  dayOptions: TimetableManualDayOptionViewData[];
  isDepartmentLoading: boolean;
  isOnline: boolean;
  locationValue: string;
  nameValue: string;
  professorValue: string;
  selectedColorId: TimetableCourseToneId;
  startPeriod: TimetableManualStepperViewData;
  endPeriod: TimetableManualStepperViewData;
}

export interface TimetableAddCourseSheetViewData {
  activeTab: 'manual' | 'search';
  colors: TimetableColorOptionViewData[];
  manual: TimetableManualFormViewData;
  search: TimetableSearchTabViewData;
}

export interface TimetableAllViewData {
  blocks: TimetableGridBlockViewData[];
  collapsed: boolean;
  columns: TimetableDayColumnViewData[];
  hasNightClasses: boolean;
  nightToggleLabel: string;
  onlineItems: TimetableSupplementItemViewData[];
  periods: TimetablePeriodViewData[];
  saturdayItems: TimetableSupplementItemViewData[];
}

export interface TimetableTodayViewData {
  collapsed: boolean;
  emptyState?: TimetableTodayEmptyStateViewData;
  hasNightClasses: boolean;
  nightToggleLabel: string;
  rows: TimetableTodayRowViewData[];
}

export interface TimetableDetailScreenViewData {
  activeMode: TimetableDetailViewMode;
  addCourseSheet: TimetableAddCourseSheetViewData;
  allView: TimetableAllViewData;
  selectedCourse?: TimetableCourseDetailViewData;
  semesterLabel: string;
  semesterOptions: TimetableSemesterOptionViewData[];
  totalCreditsLabel: string;
  todayView: TimetableTodayViewData;
}
