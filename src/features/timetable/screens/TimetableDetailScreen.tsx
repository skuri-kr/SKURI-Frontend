import React from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';

import type {CampusStackParamList} from '@/app/navigation/types';
import {
  SegmentedControl,
  StateCard,
  TimetableDetailSkeleton,
  type SegmentedControlItem,
} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {TimetableAddCourseSheet} from '../components/TimetableAddCourseSheet';
import {TimetableAllViewCard} from '../components/TimetableAllViewCard';
import {TimetableCourseDetailSheet} from '../components/TimetableCourseDetailSheet';
import {TimetableDetailHeader} from '../components/TimetableDetailHeader';
import {FriendTimetableSection} from '../components/FriendTimetableSection';
import {TimetableSemesterSheet} from '../components/TimetableSemesterSheet';
import {TimetableSupplementSection} from '../components/TimetableSupplementSection';
import {TimetableTodayViewCard} from '../components/TimetableTodayViewCard';
import {useTimetableDetailData} from '../hooks/useTimetableDetailData';
import type {TimetableDetailViewMode} from '../model/timetableViewData';

const MODE_ITEMS: SegmentedControlItem<TimetableDetailViewMode>[] = [
  {id: 'today', label: '오늘 시간표'},
  {id: 'all', label: '전체 시간표'},
];

type TimetableDetailRouteProp = RouteProp<CampusStackParamList, 'TimetableDetail'>;
type TimetableDetailNavigationProp = NativeStackNavigationProp<
  CampusStackParamList,
  'TimetableDetail'
>;

export const TimetableDetailScreen = () => {
  useScreenView();

  const navigation = useNavigation<TimetableDetailNavigationProp>();
  const route = useRoute<TimetableDetailRouteProp>();
  const initialView = route.params?.initialView ?? 'all';
  const [semesterSheetVisible, setSemesterSheetVisible] = React.useState(false);
  const [friendSectionTop, setFriendSectionTop] = React.useState<number>();
  const autoOpenedEditRef = React.useRef(false);
  const autoOpenedFriendRef = React.useRef<string | undefined>(undefined);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const {
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
    reload,
    removeSelectedCourse,
    retryCatalogCourseSearch,
    retryCourseFilterOptions,
    retryDepartmentOptions,
    selectColor,
    selectMode,
    selectSemester,
    setAddSheetTab,
    setCatalogCategory,
    setCatalogDepartment,
    setCatalogGrade,
    setManualCredits,
    setManualDay,
    setManualEndPeriod,
    setManualField,
    setManualOnline,
    setManualStartPeriod,
    setQuery,
    shareTimetable,
    toggleNightClasses,
  } = useTimetableDetailData(initialView);

  React.useEffect(() => {
    if (route.params?.mode === 'edit' && !autoOpenedEditRef.current) {
      autoOpenedEditRef.current = true;
      openAddSheet();
    }
  }, [openAddSheet, route.params?.mode]);

  const scrollToFriendTimetable = React.useCallback(() => {
    if (friendSectionTop === undefined) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, friendSectionTop - 12),
    });
    AccessibilityInfo.announceForAccessibility('친구 시간표로 이동했습니다.');
  }, [friendSectionTop]);

  React.useEffect(() => {
    const targetFriendPublicId = route.params?.targetFriendPublicId;
    if (
      !targetFriendPublicId ||
      friendSectionTop === undefined ||
      autoOpenedFriendRef.current === targetFriendPublicId
    ) {
      return;
    }

    autoOpenedFriendRef.current = targetFriendPublicId;
    const frame = requestAnimationFrame(scrollToFriendTimetable);
    return () => cancelAnimationFrame(frame);
  }, [friendSectionTop, route.params?.targetFriendPublicId, scrollToFriendTimetable]);

  const selectedCourseId = data?.selectedCourse?.courseId;
  const hasAnyCourse =
    Boolean(data?.allView.blocks.length) ||
    Boolean(data?.allView.onlineItems.length) ||
    Boolean(data?.allView.saturdayItems.length);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerSurface}>
          <TimetableDetailHeader
            onPressAdd={openAddSheet}
            onPressBack={() => navigation.goBack()}
            onPressSemester={() => setSemesterSheetVisible(true)}
            onPressShare={() => {
              shareTimetable().catch(() => undefined);
            }}
            semesterLabel={data?.semesterLabel ?? '시간표'}
          />

          <View style={styles.toolbar}>
            <View style={styles.modeGroup}>
              <SegmentedControl
                items={MODE_ITEMS}
                onSelect={selectMode}
                selectedId={activeMode}
                style={styles.modeControl}
                isFullWidth={false}
                isRounded={true}
                height={36}
                variant="surface"
              />
              <TouchableOpacity
                accessibilityLabel="친구 시간표로 이동"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={scrollToFriendTimetable}
                style={styles.friendTimetableAnchor}>
                <Text style={styles.friendTimetableAnchorLabel}>친구 시간표</Text>
              </TouchableOpacity>
            </View>

            {data ? (
              <View style={styles.creditContainer}>
                <Text style={styles.creditMuted}>총 </Text>
                <Text style={styles.creditStrong}>
                  {data.totalCreditsLabel.replace(/^총\s*/, '').replace('학점', '')}
                </Text>
                <Text style={styles.creditMuted}>학점</Text>
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}>
          {loading && !data ? (
            <TimetableDetailSkeleton />
          ) : null}

          {error && !data ? (
            <StateCard
              actionLabel="다시 시도"
              description={error}
              icon={
                <Icon
                  color={COLORS.accent.orange}
                  name="alert-circle-outline"
                  size={28}
                />
              }
              onPressAction={() => {
                reload().catch(() => undefined);
              }}
              style={styles.stateCard}
              title="시간표를 불러오지 못했습니다"
            />
          ) : null}

          {data && !hasAnyCourse ? (
            <StateCard
              actionLabel="수업 추가"
              description="우측 상단 추가 버튼이나 직접 입력으로 새 수업을 넣어보세요."
              icon={
                <Icon
                  color={COLORS.brand.primaryStrong}
                  name="calendar-outline"
                  size={28}
                />
              }
              onPressAction={openAddSheet}
              style={styles.stateCard}
              title="등록된 수업이 없습니다"
            />
          ) : null}

          {data && hasAnyCourse ? (
            <>
              {activeMode === 'all' ? (
                <>
                  <TimetableAllViewCard
                    blocks={data.allView.blocks}
                    collapsed={data.allView.collapsed}
                    columns={data.allView.columns}
                    hasNightClasses={data.allView.hasNightClasses}
                    onPressBlock={openCourseDetail}
                    onToggleNightClasses={toggleNightClasses}
                    periods={data.allView.periods}
                    toggleLabel={data.allView.nightToggleLabel}
                  />

                <TimetableSupplementSection
                  items={data.allView.onlineItems}
                  kind="online"
                  onPressItem={openCourseDetail}
                  selectedCourseId={selectedCourseId}
                  title="온라인 수업"
                />

                <TimetableSupplementSection
                  items={data.allView.saturdayItems}
                  kind="saturday"
                  onPressItem={openCourseDetail}
                  selectedCourseId={selectedCourseId}
                  title="토요일 수업"
                  />
                </>
              ) : (
                <TimetableTodayViewCard
                  collapsed={data.todayView.collapsed}
                  emptyState={data.todayView.emptyState}
                  onPressCourse={openCourseDetail}
                  onToggleNightClasses={toggleNightClasses}
                  rows={data.todayView.rows}
                  selectedCourseId={selectedCourseId}
                  showNightToggle={data.todayView.hasNightClasses}
                  toggleLabel={data.todayView.nightToggleLabel}
                />
              )}
            </>
          ) : null}

          {data ? (
            <View
              onLayout={event => setFriendSectionTop(event.nativeEvent.layout.y)}
              style={styles.friendTimetableContainer}>
              <View style={styles.friendTimetableDivider} />
              <FriendTimetableSection
                initialFriendId={route.params?.targetFriendPublicId}
                onPressSettings={() => navigation.navigate('FriendSettings')}
                ownCourses={data.courses}
                semesterId={data.semesterId}
              />
            </View>
          ) : null}
        </ScrollView>

        {data ? (
          <TimetableSemesterSheet
            onClose={() => setSemesterSheetVisible(false)}
            onSelectSemester={semesterId => {
              selectSemester(semesterId).catch(() => undefined);
            }}
            options={data.semesterOptions}
            selectedLabel={data.semesterLabel}
            visible={semesterSheetVisible}
          />
        ) : null}

        {data ? (
          <TimetableAddCourseSheet
            data={data.addCourseSheet}
            onAddCatalogCourse={courseId => {
              addCatalogCourse(courseId).catch(() => undefined);
            }}
            onClose={closeAddSheet}
            onLoadMoreSearchResults={() => {
              loadMoreCatalogCourses().catch(() => undefined);
            }}
            onRetryDepartmentOptions={() => {
              retryDepartmentOptions().catch(() => undefined);
            }}
            onRetrySearch={() => {
              retryCatalogCourseSearch().catch(() => undefined);
            }}
            onRetryFilterOptions={() => {
              retryCourseFilterOptions().catch(() => undefined);
            }}
            onSelectCatalogCategory={setCatalogCategory}
            onSelectCatalogDepartment={setCatalogDepartment}
            onSelectCatalogGrade={setCatalogGrade}
            onSelectColor={selectColor}
            onSelectCredits={setManualCredits}
            onSelectDay={setManualDay}
            onSetManualEndPeriod={setManualEndPeriod}
            onSetManualField={setManualField}
            onSetManualOnline={setManualOnline}
            onSetManualStartPeriod={setManualStartPeriod}
            onSubmitManualCourse={() => {
              addManualCourse().catch(() => undefined);
            }}
            onSwitchTab={setAddSheetTab}
            onUpdateQuery={setQuery}
            visible={addSheetVisible}
          />
        ) : null}

        <TimetableCourseDetailSheet
          course={data?.selectedCourse}
          onClose={closeCourseDetail}
          onDelete={removeSelectedCourse}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.surface,
    flex: 1,
  },
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.xxl,
    paddingTop: 16,
  },
  headerSurface: {
    backgroundColor: COLORS.background.surface,
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  modeGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  modeControl: {
  },
  friendTimetableAnchor: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  friendTimetableAnchorLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  creditContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  creditMuted: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  creditStrong: {
    color: COLORS.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  stateCard: {
    marginHorizontal: 16,
  },
  friendTimetableContainer: {
    marginTop: SPACING.xl,
  },
  friendTimetableDivider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginHorizontal: SPACING.lg,
  },
});
