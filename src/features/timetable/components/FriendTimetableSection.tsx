import React from 'react';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import type {FriendSummary} from '@/features/friend/model/friend';
import {FriendAvatar} from '@/features/friend/components/FriendAvatar';
import {StateCard} from '@/shared/design-system/components';
import {enteringTransitions, exitingTransitions, layoutTransitions} from '@/shared/design-system/motion';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

import {useFriendTimetableData} from '../hooks/useFriendTimetableData';
import type {
  FriendTimetable,
  TimetableCourseRecord,
} from '../model/timetableDomain';
import type {
  TimetableCourseToneId,
  TimetableWeekdayId,
} from '../model/timetablePrimitives';
import type {
  TimetableDayColumnViewData,
  TimetableGridBlockViewData,
  TimetablePeriodViewData,
  TimetableSupplementItemViewData,
} from '../model/timetableViewData';
import {getPeriodTimeInfo} from '../services/timetableCalendar';
import {TimetableAllViewCard} from './TimetableAllViewCard';
import {TimetableBottomSheet} from './TimetableBottomSheet';
import {TimetableSupplementSection} from './TimetableSupplementSection';

const DAY_BY_NUMBER: Record<number, TimetableWeekdayId> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

const DAY_LABEL_BY_NUMBER: Record<number, string> = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
};

const WEEKDAY_COLUMNS: TimetableDayColumnViewData[] = [
  {id: 'mon', label: '월'},
  {id: 'tue', label: '화'},
  {id: 'wed', label: '수'},
  {id: 'thu', label: '목'},
  {id: 'fri', label: '금'},
];

const ALL_PERIODS: TimetablePeriodViewData[] = Array.from(
  {length: 15},
  (_, index) => {
    const periodNumber = index + 1;
    const {endTime, startTime} = getPeriodTimeInfo(periodNumber);

    return {
      endTimeLabel: endTime,
      id: `friend-period-${periodNumber}`,
      periodLabel: `${periodNumber}교시`,
      periodNumber,
      startTimeLabel: startTime,
    };
  },
);

const TONE_IDS: TimetableCourseToneId[] = [
  'green',
  'blue',
  'pink',
  'yellow',
  'purple',
  'teal',
  'orange',
  'red',
];

const getScopeLabel = (scope: FriendSummary['effectiveTimetableScope']) => {
  switch (scope) {
    case 'DETAILS':
      return '상세 공유';
    case 'BUSY_ONLY':
      return '바쁜 시간';
    default:
      return '비공개';
  }
};

const getToneId = (value: string): TimetableCourseToneId => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % TONE_IDS.length;
  }

  return TONE_IDS[hash];
};

const getBusyBlocks = (timetable: FriendTimetable): TimetableGridBlockViewData[] =>
  timetable.slots
    .filter(slot => slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5)
    .map((slot, index) => ({
      courseId: `busy-${index}`,
      endPeriod: slot.endPeriod,
      id: `busy-${slot.dayOfWeek}-${slot.startPeriod}-${index}`,
      startPeriod: slot.startPeriod,
      title: '수업 중',
      toneId: 'blue',
      weekdayId: DAY_BY_NUMBER[slot.dayOfWeek],
    }));

const getDetailBlocks = (timetable: FriendTimetable): TimetableGridBlockViewData[] =>
  timetable.courses.flatMap((course, courseIndex) =>
    course.schedule
      .filter(slot => slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5)
      .map((slot, scheduleIndex) => ({
        courseId: course.courseId ?? `manual-${courseIndex}`,
        endPeriod: slot.endPeriod,
        id: `course-${course.courseId ?? courseIndex}-${scheduleIndex}`,
        roomLabel: course.location ?? undefined,
        startPeriod: slot.startPeriod,
        title: course.name,
        toneId: getToneId(course.courseId ?? `${course.name}-${courseIndex}`),
        weekdayId: DAY_BY_NUMBER[slot.dayOfWeek],
      })),
  );

const getSaturdayItems = (timetable: FriendTimetable) => {
  if (timetable.effectiveScope === 'DETAILS') {
    return timetable.courses.flatMap((course, courseIndex) =>
      course.schedule
        .filter(slot => slot.dayOfWeek === 6)
        .map((slot, scheduleIndex) => ({
          id: `saturday-${course.courseId ?? courseIndex}-${scheduleIndex}`,
          label: `${course.name} · ${slot.startPeriod === slot.endPeriod ? `${slot.startPeriod}교시` : `${slot.startPeriod}-${slot.endPeriod}교시`}`,
        })),
    );
  }

  return timetable.slots
    .filter(slot => slot.dayOfWeek === 6)
    .map((slot, index) => ({
      id: `saturday-busy-${index}`,
      label:
        slot.startPeriod === slot.endPeriod
          ? `수업 중 · ${slot.startPeriod}교시`
          : `수업 중 · ${slot.startPeriod}-${slot.endPeriod}교시`,
    }));
};

const getOnlineItems = (
  timetable: FriendTimetable,
): TimetableSupplementItemViewData[] =>
  timetable.courses
    .filter(course => course.isOnline && course.schedule.length === 0)
    .map((course, index) => ({
      courseId: course.courseId ?? `friend-online-${index}`,
      id: `friend-online-${course.courseId ?? index}`,
      metaLabel: [
        course.professor ? `${course.professor} 교수님` : undefined,
        `${course.credits}학점`,
      ]
        .filter(Boolean)
        .join(' · '),
      title: course.name,
      toneId: getToneId(course.courseId ?? `${course.name}-${index}`),
    }));

const getCommonFreePeriods = (
  ownCourses: TimetableCourseRecord[],
  friendTimetable: FriendTimetable,
) => {
  const busy = new Set<string>();
  ownCourses.forEach(course => {
    if (course.isOnline) {
      return;
    }
    course.schedules.forEach(schedule => {
      const dayOfWeek = {
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      }[schedule.day];
      if (dayOfWeek > 5) {
        return;
      }
      for (let period = schedule.startPeriod; period <= schedule.endPeriod; period += 1) {
        busy.add(`own-${dayOfWeek}-${period}`);
      }
    });
  });
  friendTimetable.slots.forEach(slot => {
    if (slot.dayOfWeek > 5) {
      return;
    }
    for (let period = slot.startPeriod; period <= slot.endPeriod; period += 1) {
      busy.add(`friend-${slot.dayOfWeek}-${period}`);
    }
  });

  const groups: string[] = [];
  for (let day = 1; day <= 5; day += 1) {
    let start: number | undefined;
    for (let period = 1; period <= 16; period += 1) {
      const isFree =
        period <= 15 &&
        !busy.has(`own-${day}-${period}`) &&
        !busy.has(`friend-${day}-${period}`);
      if (isFree && start === undefined) {
        start = period;
      }
      if (!isFree && start !== undefined) {
        groups.push(
          `${DAY_LABEL_BY_NUMBER[day]} ${start === period - 1 ? `${start}교시` : `${start}-${period - 1}교시`}`,
        );
        start = undefined;
      }
    }
  }

  return groups;
};

interface FriendTimetableSectionProps {
  onInitialFriendHandled?: () => void;
  initialFriendId?: string;
  onInitialFriendUnavailable?: () => void;
  onPressSettings: () => void;
  ownCourses: TimetableCourseRecord[];
  semesterId?: string;
}

export interface FriendTimetableSectionHandle {
  refresh: () => Promise<void>;
}

export const FriendTimetableSection = React.forwardRef<
  FriendTimetableSectionHandle,
  FriendTimetableSectionProps
>(({
  initialFriendId,
  onInitialFriendHandled,
  onInitialFriendUnavailable,
  onPressSettings,
  ownCourses,
  semesterId,
}, ref) => {
  const {
    friends,
    friendsError,
    hasLoadedFriends,
    loadingTimetable,
    refresh,
    reloadFriends,
    reloadSelectedTimetable,
    selectedFriendId,
    selectedTimetable,
    selectFriend,
    timetableError,
    updateFavorite,
    updatingFavoriteIds,
  } = useFriendTimetableData(semesterId);
  const handledInitialFriendRef = React.useRef<string | undefined>(undefined);
  const [commonFreeSheetVisible, setCommonFreeSheetVisible] =
    React.useState(false);
  const selectedFriend = friends.find(friend => friend.id === selectedFriendId);
  const commonFreePeriods = React.useMemo(
    () =>
      selectedTimetable && selectedTimetable.effectiveScope !== 'PRIVATE'
        ? getCommonFreePeriods(ownCourses, selectedTimetable)
        : [],
    [ownCourses, selectedTimetable],
  );
  const sharedCourseNames = React.useMemo(() => {
    if (!selectedTimetable || selectedTimetable.effectiveScope !== 'DETAILS') {
      return [];
    }
    const ownCourseIds = new Set(ownCourses.map(course => course.id));
    return Array.from(
      new Set(
        selectedTimetable.courses
          .filter(course => course.courseId && ownCourseIds.has(course.courseId))
          .map(course => course.name),
      ),
    );
  }, [ownCourses, selectedTimetable]);

  React.useImperativeHandle(ref, () => ({refresh}), [refresh]);

  React.useEffect(() => {
    if (
      !initialFriendId ||
      !hasLoadedFriends ||
      friendsError ||
      handledInitialFriendRef.current === initialFriendId
    ) {
      return;
    }

    handledInitialFriendRef.current = initialFriendId;
    if (!friends.some(friend => friend.id === initialFriendId)) {
      onInitialFriendUnavailable?.();
      return;
    }

    selectFriend(initialFriendId);
    onInitialFriendHandled?.();
  }, [
    friends,
    friendsError,
    hasLoadedFriends,
    initialFriendId,
    onInitialFriendHandled,
    onInitialFriendUnavailable,
    selectFriend,
  ]);

  return (
    <View accessibilityLabel="친구 시간표" style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>친구 시간표</Text>
          {hasLoadedFriends ? (
            <Text style={styles.countLabel}>{friends.length}명</Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityLabel="시간표 공유 설정"
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onPressSettings}
          style={styles.settingsButton}>
          <Icon color={COLORS.brand.primaryStrong} name="settings-outline" size={16} />
          <Text style={styles.settingsButtonLabel}>공유 설정</Text>
        </TouchableOpacity>
      </View>

      {!hasLoadedFriends && !friendsError ? (
        <StateCard
          description="친구 목록을 준비하고 있습니다."
          icon={<ActivityIndicator color={COLORS.brand.primary} />}
          title="친구 시간표를 불러오는 중"
        />
      ) : null}

      {friendsError && friends.length === 0 ? (
        <StateCard
          actionLabel="다시 시도"
          description={friendsError}
          icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
          onPressAction={() => {
            reloadFriends().catch(() => undefined);
          }}
          title="친구 목록을 불러오지 못했습니다"
        />
      ) : null}

      {friendsError && friends.length > 0 ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.refreshErrorBanner}>
          <Icon
            color={COLORS.accent.orange}
            name="alert-circle-outline"
            size={18}
          />
          <Text numberOfLines={2} style={styles.refreshErrorLabel}>
            {friendsError}
          </Text>
          <TouchableOpacity
            accessibilityLabel="친구 목록 다시 불러오기"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              reloadFriends().catch(() => undefined);
            }}
            style={styles.refreshRetryButton}>
            <Text style={styles.refreshRetryLabel}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {hasLoadedFriends && friends.length === 0 ? (
        <StateCard
          description="친구를 추가하면 같은 학기의 시간표를 여기서 확인할 수 있어요."
          icon={<Icon color={COLORS.brand.primary} name="people-outline" size={28} />}
          title="아직 친구가 없어요"
        />
      ) : null}

      {friends.length > 0 ? (
        <View style={styles.listCard}>
          {friends.map((friend, index) => {
            const expanded = friend.id === selectedFriendId;
            const isUpdatingFavorite = updatingFavoriteIds.has(friend.id);
            return (
              <Animated.View
                key={friend.id}
                layout={layoutTransitions.gentleExpand()}
                style={index < friends.length - 1 ? styles.rowDivider : undefined}>
                <View style={styles.friendRow}>
                  <TouchableOpacity
                    accessibilityLabel={`${friend.nickname} 시간표 ${expanded ? '접기' : '보기'}`}
                    accessibilityRole="button"
                    accessibilityState={{expanded}}
                    activeOpacity={0.82}
                    onPress={() => {
                      selectFriend(friend.id);
                    }}
                    style={styles.friendMain}>
                    <FriendAvatar photoUrl={friend.photoUrl} size={42} />
                    <View style={styles.friendText}>
                      <Text numberOfLines={1} style={styles.friendName}>{friend.nickname}</Text>
                      <Text numberOfLines={1} style={styles.friendDepartment}>
                        {friend.department || '학과 정보 없음'}
                      </Text>
                    </View>
                    <View style={styles.scopeBadge}>
                      <Text style={styles.scopeBadgeLabel}>
                        {getScopeLabel(friend.effectiveTimetableScope)}
                      </Text>
                    </View>
                    <Icon
                      color={COLORS.text.muted}
                      name={expanded ? 'chevron-up' : 'chevron-forward'}
                      size={18}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel={`${friend.nickname} 즐겨찾기 ${friend.favorite ? '해제' : '추가'}`}
                    accessibilityRole="button"
                    accessibilityState={{disabled: isUpdatingFavorite}}
                    activeOpacity={0.82}
                    disabled={isUpdatingFavorite}
                    onPress={() => {
                      updateFavorite(friend).catch(error => {
                        Alert.alert(
                          '오류',
                          error instanceof Error && error.message.trim()
                            ? error.message
                            : '즐겨찾기를 변경하지 못했습니다.',
                        );
                      });
                    }}
                    style={styles.favoriteButton}>
                    {isUpdatingFavorite ? (
                      <ActivityIndicator color={COLORS.brand.primary} size="small" />
                    ) : (
                      <Icon
                        color={friend.favorite ? COLORS.accent.yellow : COLORS.text.muted}
                        name={friend.favorite ? 'star' : 'star-outline'}
                        size={21}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {expanded ? (
                  <Animated.View
                    entering={enteringTransitions.fadeInDown()}
                    exiting={exitingTransitions.fadeOutUp()}
                    style={styles.accordionBody}>
                    {loadingTimetable ? (
                      <View style={styles.inlineLoading}>
                        <ActivityIndicator color={COLORS.brand.primary} size="small" />
                        <Text style={styles.inlineLoadingLabel}>시간표를 불러오는 중</Text>
                      </View>
                    ) : null}
                    {timetableError ? (
                      <StateCard
                        actionLabel="다시 시도"
                        description={timetableError}
                        icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={24} />}
                        onPressAction={() => {
                          reloadSelectedTimetable().catch(() => undefined);
                        }}
                        title="시간표를 불러오지 못했습니다"
                      />
                    ) : null}
                    {!loadingTimetable && !timetableError && selectedTimetable ? (
                      <FriendTimetableContent
                        commonFreePeriods={commonFreePeriods}
                        onPressCommonFree={() => setCommonFreeSheetVisible(true)}
                        sharedCourseNames={sharedCourseNames}
                        timetable={selectedTimetable}
                      />
                    ) : null}
                  </Animated.View>
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      <TimetableBottomSheet
        contentMode="scrollable"
        onClose={() => setCommonFreeSheetVisible(false)}
        snapPoints={['45%']}
        visible={commonFreeSheetVisible}>
        <BottomSheetScrollView
          contentContainerStyle={styles.commonFreeScrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.commonFreeScroll}>
          <Text style={styles.sheetTitle}>
            {selectedFriend ? `${selectedFriend.nickname}님과의 공통 공강` : '공통 공강'}
          </Text>
          <Text style={styles.sheetDescription}>월~금 1~15교시 기준으로 계산했어요.</Text>
          {commonFreePeriods.length > 0 ? (
            <View style={styles.freePeriodList}>
              {commonFreePeriods.map(period => (
                <Text key={period} style={styles.freePeriodItem}>{period}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyFreePeriodLabel}>공통으로 비는 시간이 없어요.</Text>
          )}
        </BottomSheetScrollView>
      </TimetableBottomSheet>
    </View>
  );
});

FriendTimetableSection.displayName = 'FriendTimetableSection';

const FriendTimetableContent = ({
  commonFreePeriods,
  onPressCommonFree,
  sharedCourseNames,
  timetable,
}: {
  commonFreePeriods: string[];
  onPressCommonFree: () => void;
  sharedCourseNames: string[];
  timetable: FriendTimetable;
}) => {
  const [containerWidth, setContainerWidth] = React.useState<number>();
  if (timetable.effectiveScope === 'PRIVATE') {
    return (
      <View style={styles.privateState}>
        <Icon color={COLORS.text.muted} name="lock-closed-outline" size={22} />
        <Text style={styles.privateStateTitle}>시간표를 공유하지 않았어요</Text>
        <Text style={styles.privateStateDescription}>
          이 친구가 공개 범위를 변경하면 같은 학기 시간표를 확인할 수 있어요.
        </Text>
      </View>
    );
  }

  if (!timetable.hasTimetable) {
    return (
      <View style={styles.privateState}>
        <Icon color={COLORS.text.muted} name="calendar-outline" size={22} />
        <Text style={styles.privateStateTitle}>이 학기에 등록된 시간표가 없어요</Text>
      </View>
    );
  }

  const blocks =
    timetable.effectiveScope === 'DETAILS'
      ? getDetailBlocks(timetable)
      : getBusyBlocks(timetable);
  const saturdayItems = getSaturdayItems(timetable);
  const onlineItems =
    timetable.effectiveScope === 'DETAILS' ? getOnlineItems(timetable) : [];

  return (
    <View
      onLayout={event => {
        const nextWidth = event.nativeEvent.layout.width;
        setContainerWidth(current => current === nextWidth ? current : nextWidth);
      }}
      style={styles.timetableContent}>
      <Text style={styles.scopeDescription}>
        {timetable.effectiveScope === 'DETAILS'
          ? '상세 시간표를 공유 중이에요.'
          : '과목 정보 없이 바쁜 시간만 공유 중이에요.'}
      </Text>
      <TimetableAllViewCard
        blocks={blocks}
        collapsed={false}
        columns={WEEKDAY_COLUMNS}
        containerWidth={containerWidth}
        hasNightClasses={false}
        onToggleNightClasses={() => undefined}
        periods={ALL_PERIODS}
        toggleLabel=""
      />
      <TouchableOpacity
        accessibilityLabel="공통 공강 목록 보기"
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPressCommonFree}
        style={styles.commonFreeChip}>
        <Icon color={COLORS.brand.primaryStrong} name="time-outline" size={16} />
        <Text style={styles.commonFreeChipLabel}>공통 공강 {commonFreePeriods.length}개</Text>
      </TouchableOpacity>
      {sharedCourseNames.length > 0 ? (
        <Text style={styles.sharedCourseLabel}>
          같이 듣는 수업 · {sharedCourseNames.join(', ')}
        </Text>
      ) : null}
      <TimetableSupplementSection
        items={onlineItems}
        kind="online"
        readOnly
        title="온라인 수업"
      />
      {saturdayItems.length > 0 ? (
        <View style={styles.saturdaySection}>
          <Text style={styles.saturdayTitle}>토요일 수업</Text>
          {saturdayItems.map(item => (
            <Text key={item.id} style={styles.saturdayItem}>{item.label}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {marginTop: SPACING.xl, paddingHorizontal: SPACING.lg},
  sectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm},
  sectionTitle: {color: COLORS.text.primary, fontSize: 17, fontWeight: '800', lineHeight: 24},
  countLabel: {color: COLORS.text.muted, fontSize: 12, lineHeight: 16, marginTop: 1},
  settingsButton: {alignItems: 'center', backgroundColor: COLORS.brand.primaryTint, borderRadius: RADIUS.pill, flexDirection: 'row', gap: 4, minHeight: 32, paddingHorizontal: SPACING.sm},
  settingsButtonLabel: {color: COLORS.brand.primaryStrong, fontSize: 12, fontWeight: '700'},
  refreshErrorBanner: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderColor: COLORS.accent.orange, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm},
  refreshErrorLabel: {color: COLORS.text.secondary, flex: 1, fontSize: 12, lineHeight: 17},
  refreshRetryButton: {alignItems: 'center', minHeight: 32, justifyContent: 'center', paddingHorizontal: SPACING.sm},
  refreshRetryLabel: {color: COLORS.brand.primaryStrong, fontSize: 12, fontWeight: '700'},
  listCard: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card},
  rowDivider: {borderBottomColor: COLORS.border.subtle, borderBottomWidth: 1},
  friendRow: {alignItems: 'center', flexDirection: 'row', minHeight: 72, paddingLeft: SPACING.lg, paddingRight: SPACING.xs},
  friendMain: {alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 72},
  friendText: {flex: 1, marginLeft: SPACING.md, marginRight: SPACING.xs},
  friendName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 21},
  friendDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 17, marginTop: 1},
  scopeBadge: {backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.pill, marginRight: SPACING.xs, paddingHorizontal: SPACING.sm, paddingVertical: 4},
  scopeBadgeLabel: {color: COLORS.text.secondary, fontSize: 10, fontWeight: '700', lineHeight: 14},
  favoriteButton: {alignItems: 'center', height: 44, justifyContent: 'center', width: 40},
  accordionBody: {backgroundColor: COLORS.background.page, borderTopColor: COLORS.border.subtle, borderTopWidth: 1, padding: SPACING.md},
  inlineLoading: {alignItems: 'center', flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', minHeight: 64},
  inlineLoadingLabel: {color: COLORS.text.secondary, fontSize: 12},
  privateState: {alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl},
  privateStateTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: SPACING.sm, textAlign: 'center'},
  privateStateDescription: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.xs, textAlign: 'center'},
  timetableContent: {alignItems: 'center'},
  scopeDescription: {alignSelf: 'stretch', color: COLORS.text.secondary, fontSize: 12, lineHeight: 18, marginBottom: SPACING.sm},
  commonFreeChip: {alignItems: 'center', backgroundColor: COLORS.brand.primaryTint, borderRadius: RADIUS.pill, flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm},
  commonFreeChipLabel: {color: COLORS.brand.primaryStrong, fontSize: 12, fontWeight: '700'},
  sharedCourseLabel: {alignSelf: 'stretch', color: COLORS.text.secondary, fontSize: 12, lineHeight: 18, marginTop: SPACING.md},
  saturdaySection: {alignSelf: 'stretch', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, marginTop: SPACING.md, padding: SPACING.md},
  saturdayTitle: {color: COLORS.text.secondary, fontSize: 12, fontWeight: '700', lineHeight: 18, marginBottom: 4},
  saturdayItem: {color: COLORS.text.secondary, fontSize: 12, lineHeight: 18},
  commonFreeScroll: {flex: 1},
  commonFreeScrollContent: {paddingBottom: SPACING.xl},
  sheetTitle: {color: COLORS.text.primary, fontSize: 18, fontWeight: '800', lineHeight: 26, marginTop: SPACING.sm},
  sheetDescription: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.xs},
  freePeriodList: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.lg},
  freePeriodItem: {backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.pill, color: COLORS.text.secondary, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm},
  emptyFreePeriodLabel: {color: COLORS.text.muted, fontSize: 13, lineHeight: 20, marginTop: SPACING.xl},
});
