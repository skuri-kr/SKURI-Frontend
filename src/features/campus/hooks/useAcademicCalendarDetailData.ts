import React from 'react';

import {useAcademicRepository} from '@/di/useRepository';
import {normalizeDate, normalizeDateObject} from '@/shared/lib/date';

import {toAcademicCalendarEventSource} from '../application/academicCalendarEventMapper';
import {
  ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE,
  ACADEMIC_CALENDAR_STATUS_TONES,
} from '../model/academicCalendarEventTones';
import type {AcademicCalendarEventColorTone} from '../model/academicCalendarEventTones';
import type {AcademicCalendarEventSource} from '../model/academicCalendarDetailSource';
import type {
  AcademicCalendarDayCellViewData,
  AcademicCalendarDetailScreenViewData,
  AcademicCalendarDetailViewMode,
  AcademicCalendarEventBarViewData,
  AcademicCalendarListItemViewData,
  AcademicCalendarMonthWeekViewData,
} from '../model/academicCalendarDetailViewData';
import {
  getAcademicEventDurationDays,
  getEventsInRange,
  getMonthWeeks,
  getPositionedEventsForRange,
  getWeekRange,
} from '../services/academicCalendarLayout';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const compareAcademicEventsByDate = (
  left: AcademicCalendarEventSource,
  right: AcademicCalendarEventSource,
) =>
  normalizeDate(left.startDate).getTime() -
    normalizeDate(right.startDate).getTime() ||
  normalizeDate(left.endDate).getTime() -
    normalizeDate(right.endDate).getTime() ||
  left.title.localeCompare(right.title, 'ko-KR');

const getToneByWeekday = (weekday: number) => {
  if (weekday === 0) {
    return 'sunday' as const;
  }

  if (weekday === 6) {
    return 'saturday' as const;
  }

  return 'default' as const;
};

const formatCurrentLabel = (date: Date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const formatWeekOfMonthLabel = (date: Date) => {
  const {start} = getWeekRange(date);
  const weekIndex = Math.floor((start.getDate() - 1) / 7) + 1;
  return `${date.getMonth() + 1}월 ${weekIndex}주차`;
};

const formatEventDateLabel = (event: AcademicCalendarEventSource) => {
  const startDate = normalizeDate(event.startDate);
  const endDate = normalizeDate(event.endDate);
  const startLabel = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 (${WEEKDAY_LABELS[startDate.getDay()]})`;

  if (startDate.getTime() === endDate.getTime()) {
    return startLabel;
  }

  return `${startLabel} ~ ${endDate.getMonth() + 1}월 ${endDate.getDate()}일 (${WEEKDAY_LABELS[endDate.getDay()]})`;
};

const buildStatusMeta = (
  event: AcademicCalendarEventSource,
  today: Date,
) => {
  const startDate = normalizeDate(event.startDate);
  const endDate = normalizeDate(event.endDate);

  if (endDate < today) {
    return {
      label: '종료',
      ...ACADEMIC_CALENDAR_STATUS_TONES.ended,
    };
  }

  if (startDate <= today && today <= endDate) {
    return {
      label: '진행중',
      ...ACADEMIC_CALENDAR_STATUS_TONES.active,
    };
  }

  const daysUntilStart =
    Math.round((startDate.getTime() - today.getTime()) / DAY_IN_MS);

  return {
    label: `D-${daysUntilStart}`,
    ...ACADEMIC_CALENDAR_STATUS_TONES.countdown,
  };
};

const sortAcademicEventsByVisibleOrder = (
  events: AcademicCalendarEventSource[],
) =>
  [...events].sort(compareAcademicEventsByDate);

const sortAcademicEventsForList = (
  events: AcademicCalendarEventSource[],
  today: Date,
) =>
  [...events].sort(
    (left, right) =>
      Number(normalizeDate(left.endDate) < today) -
        Number(normalizeDate(right.endDate) < today) ||
      compareAcademicEventsByDate(left, right),
  );

const buildEventColorMap = (events: AcademicCalendarEventSource[]) =>
  new Map(
    sortAcademicEventsByVisibleOrder(events).map((event, index) => [
      event.id,
      ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE[
        index % ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE.length
      ],
    ]),
  );

const toListItems = (
  events: AcademicCalendarEventSource[],
  eventColorMap: Map<string, AcademicCalendarEventColorTone>,
  today: Date,
): AcademicCalendarListItemViewData[] =>
  sortAcademicEventsForList(events, today)
    .map(event => {
      const status = buildStatusMeta(event, today);
      const eventTone =
        eventColorMap.get(event.id) ?? ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE[0];
      const isEnded = normalizeDate(event.endDate) < today;

      return {
        accentColor: eventTone.accentColor,
        dateLabel: formatEventDateLabel(event),
        description: event.description,
        eventId: event.id,
        isEnded,
        importantLabel: event.isImportant ? '중요' : undefined,
        statusBackgroundColor: status.backgroundColor,
        statusLabel: status.label,
        statusTextColor: status.textColor,
        title: event.title,
      };
    });

const toMonthWeeks = (
  currentDate: Date,
  events: AcademicCalendarEventSource[],
  eventColorMap: Map<string, AcademicCalendarEventColorTone>,
  today: Date,
): AcademicCalendarMonthWeekViewData[] =>
  getMonthWeeks(currentDate).map((week, weekIndex) => {
    const visibleDates = week.filter((date): date is Date => date !== null);
    const firstVisibleIndex = week.findIndex(date => date !== null);
    const rangeStart = new Date(
      visibleDates[0] ?? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    );
    rangeStart.setDate(rangeStart.getDate() - Math.max(0, firstVisibleIndex));
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 6);
    const positionedEvents = getPositionedEventsForRange({
      endDate: rangeEnd,
      events: getEventsInRange(events, rangeStart, rangeEnd),
      startDate: rangeStart,
    });
    const bars: AcademicCalendarEventBarViewData[] = positionedEvents.map(
      positioned => {
        const eventTone =
          eventColorMap.get(positioned.event.id) ??
          ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE[0];

        return {
          barColor: eventTone.barColor,
          barTextColor: eventTone.barTextColor,
          eventId: positioned.event.id,
          id: `${positioned.event.id}-${weekIndex}`,
          leftColumn: positioned.leftColumn,
          opacity: 1,
          roundedEnd: positioned.roundedEnd,
          roundedStart: positioned.roundedStart,
          rowIndex: positioned.rowIndex,
          span: positioned.span,
          title: positioned.event.title,
        };
      },
    );

    return {
      bars,
      days: week.map((date, dayIndex) => ({
        dayNumberLabel: date ? `${date.getDate()}` : undefined,
        id: date
          ? `month-day-${date.toISOString()}`
          : `month-blank-${weekIndex}-${dayIndex}`,
        isCurrentMonth: date
          ? date.getMonth() === currentDate.getMonth() &&
            date.getFullYear() === currentDate.getFullYear()
          : false,
        isToday: date
          ? normalizeDateObject(date).getTime() === today.getTime()
          : false,
        isoDate: date ? date.toISOString() : undefined,
        tone: getToneByWeekday(dayIndex),
      })),
      id: `month-week-${weekIndex}`,
      laneCount:
        bars.reduce((maxCount, bar) => Math.max(maxCount, bar.rowIndex + 1), 0) ||
        0,
    };
  });

const toWeekDays = (
  currentDate: Date,
  today: Date,
): AcademicCalendarDayCellViewData[] => {
  const {start} = getWeekRange(currentDate);

  return Array.from({length: 7}, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      dayNumberLabel: `${date.getDate()}`,
      id: `week-day-${date.toISOString()}`,
      isCurrentMonth: true,
      isToday: normalizeDateObject(date).getTime() === today.getTime(),
      isoDate: date.toISOString(),
      tone: getToneByWeekday(index),
      weekdayLabel: WEEKDAY_LABELS[index],
    };
  });
};

const toWeekBars = (
  currentDate: Date,
  events: AcademicCalendarEventSource[],
  eventColorMap: Map<string, AcademicCalendarEventColorTone>,
): AcademicCalendarEventBarViewData[] => {
  const {start, end} = getWeekRange(currentDate);

  return getPositionedEventsForRange({
    endDate: end,
    events: getEventsInRange(events, start, end),
    startDate: start,
  }).map(positioned => {
    const eventTone =
      eventColorMap.get(positioned.event.id) ??
      ACADEMIC_CALENDAR_EVENT_COLOR_CYCLE[0];

    return {
      barColor: eventTone.barColor,
      barTextColor: eventTone.barTextColor,
      eventId: positioned.event.id,
      id: `${positioned.event.id}-week`,
      leftColumn: positioned.leftColumn,
      opacity: 1,
      roundedEnd: positioned.roundedEnd,
      roundedStart: positioned.roundedStart,
      rowIndex: positioned.rowIndex,
      span: positioned.span,
      title: positioned.event.title,
    };
  });
};

const pickScrollTargetEventId = (
  events: AcademicCalendarEventSource[],
  date: Date,
) =>
  [...events]
    .filter(event => {
      const normalizedDate = normalizeDateObject(date);
      return (
        normalizeDate(event.startDate) <= normalizedDate &&
        normalizedDate <= normalizeDate(event.endDate)
      );
    })
    .sort((left, right) => {
      const leftIsSingle = left.startDate === left.endDate;
      const rightIsSingle = right.startDate === right.endDate;

      if (leftIsSingle !== rightIsSingle) {
        return leftIsSingle ? -1 : 1;
      }

      if (left.isImportant !== right.isImportant) {
        return left.isImportant ? -1 : 1;
      }

      return getAcademicEventDurationDays(right) - getAcademicEventDurationDays(left);
    })[0]?.id;

export const useAcademicCalendarDetailData = (
  initialDate?: string,
  initialScheduleId?: string,
) => {
  const academicRepository = useAcademicRepository();
  const [activeMode, setActiveMode] =
    React.useState<AcademicCalendarDetailViewMode>('month');
  const [currentDate, setCurrentDate] = React.useState(() =>
    initialDate ? normalizeDate(initialDate) : normalizeDateObject(new Date()),
  );
  const [events, setEvents] = React.useState<AcademicCalendarEventSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSchedules = await academicRepository.getSchedules();
      setEvents(loadedSchedules.map(toAcademicCalendarEventSource));
    } catch {
      setError('학사일정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [academicRepository]);

  React.useEffect(() => {
    loadEvents().catch(() => undefined);
  }, [loadEvents]);

  React.useEffect(() => {
    if (initialDate) {
      setCurrentDate(normalizeDate(initialDate));
    }
  }, [initialDate]);

  React.useEffect(() => {
    if (initialDate || !initialScheduleId || events.length === 0) {
      return;
    }

    const matchedEvent = events.find(event => event.id === initialScheduleId);

    if (!matchedEvent) {
      return;
    }

    setCurrentDate(normalizeDate(matchedEvent.startDate));
  }, [events, initialDate, initialScheduleId]);

  const today = React.useMemo(() => normalizeDateObject(new Date()), []);

  const data = React.useMemo<AcademicCalendarDetailScreenViewData | undefined>(() => {
    if (!events.length && (loading || error)) {
      return undefined;
    }

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const weekRange = getWeekRange(currentDate);
    const monthEvents = getEventsInRange(events, monthStart, monthEnd);
    const weekEvents = getEventsInRange(events, weekRange.start, weekRange.end);
    const visibleEvents = activeMode === 'month' ? monthEvents : weekEvents;
    const monthEventColorMap = buildEventColorMap(monthEvents);
    const weekEventColorMap = buildEventColorMap(weekEvents);
    const visibleEventColorMap =
      activeMode === 'month' ? monthEventColorMap : weekEventColorMap;
    const weekBars = toWeekBars(currentDate, weekEvents, weekEventColorMap);

    return {
      activeMode,
      countLabel: `${visibleEvents.length}`,
      currentLabel: formatCurrentLabel(currentDate),
      currentSubLabel:
        activeMode === 'week' ? formatWeekOfMonthLabel(currentDate) : undefined,
      listItems: toListItems(visibleEvents, visibleEventColorMap, today),
      listTitle:
        activeMode === 'month'
          ? `${currentDate.getMonth() + 1}월 일정`
          : '이번 주 일정',
      monthView: {
        weeks: toMonthWeeks(currentDate, monthEvents, monthEventColorMap, today),
      },
      weekView: {
        bars: weekBars,
        days: toWeekDays(currentDate, today),
        laneCount:
          weekBars.reduce(
            (maxCount, bar) => Math.max(maxCount, bar.rowIndex + 1),
            0,
          ) || 0,
        weekLabel: formatWeekOfMonthLabel(currentDate),
      },
    };
  }, [activeMode, currentDate, error, events, loading, today]);

  const movePrev = React.useCallback(() => {
    setCurrentDate(previousDate => {
      const nextDate = new Date(previousDate);

      if (activeMode === 'month') {
        nextDate.setMonth(previousDate.getMonth() - 1);
      } else {
        nextDate.setDate(previousDate.getDate() - 7);
      }

      return nextDate;
    });
  }, [activeMode]);

  const moveNext = React.useCallback(() => {
    setCurrentDate(previousDate => {
      const nextDate = new Date(previousDate);

      if (activeMode === 'month') {
        nextDate.setMonth(previousDate.getMonth() + 1);
      } else {
        nextDate.setDate(previousDate.getDate() + 7);
      }

      return nextDate;
    });
  }, [activeMode]);

  const findScrollTargetEventId = React.useCallback(
    (date: Date) => {
      const visibleEvents =
        activeMode === 'month'
          ? getEventsInRange(
              events,
              new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
            )
          : getEventsInRange(
              events,
              getWeekRange(currentDate).start,
              getWeekRange(currentDate).end,
            );

      return pickScrollTargetEventId(visibleEvents, date);
    },
    [activeMode, currentDate, events],
  );

  const findInitialScrollTargetEventId = React.useCallback(
    (scheduleId?: string) => {
      if (!data) {
        return undefined;
      }

      if (scheduleId && data.listItems.some(item => item.eventId === scheduleId)) {
        return scheduleId;
      }

      return undefined;
    },
    [data],
  );

  return {
    currentDate,
    data,
    error,
    findInitialScrollTargetEventId,
    findScrollTargetEventId,
    loading,
    moveNext,
    movePrev,
    reload: loadEvents,
    selectMode: setActiveMode,
    setCurrentDate,
  };
};
