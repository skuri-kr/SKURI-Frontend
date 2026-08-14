import React from 'react';
import {
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Keyboard,
  ListRenderItem,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  SelectionDropdown,
  SkeletonBlock,
  ToggleSwitch,
} from '@/shared/design-system/components';
import {COLORS, RADIUS} from '@/shared/design-system/tokens';
import {playHaptic} from '@/shared/lib/haptics';

import {
  TIMETABLE_COURSE_TONES,
  TIMETABLE_TODAY_EMPTY_DOT_COLOR,
} from '../model/timetableCourseTones';
import type {
  TimetableAddCourseSheetViewData,
  TimetableFilterOptionViewData,
  TimetableManualDayOptionViewData,
} from '../model/timetableViewData';
import type {TimetableCourseToneId} from '../model/timetablePrimitives';
import {TimetableBottomSheet} from './TimetableBottomSheet';

interface TimetableAddCourseSheetProps {
  data: TimetableAddCourseSheetViewData;
  onAddCatalogCourse: (courseId: string) => void;
  onClose: () => void;
  onLoadMoreSearchResults: () => void;
  onRetrySearch: () => void;
  onRetryFilterOptions: () => void;
  onSelectCatalogCategory: (category: string) => void;
  onSelectCatalogDepartment: (department: string) => void;
  onSelectCatalogGrade: (grade: string) => void;
  onSelectColor: (colorId: TimetableCourseToneId) => void;
  onSelectCredits: (credits: number) => void;
  onSelectDay: (day: TimetableManualDayOptionViewData['id']) => void;
  onSetManualEndPeriod: (delta: -1 | 1) => void;
  onSetManualField: (
    field: 'department' | 'locationLabel' | 'name' | 'professor',
    value: string,
  ) => void;
  onSetManualOnline: (enabled: boolean) => void;
  onSetManualStartPeriod: (delta: -1 | 1) => void;
  onSubmitManualCourse: () => void;
  onSwitchTab: (tab: 'manual' | 'search') => void;
  onUpdateQuery: (query: string) => void;
  visible: boolean;
}

type TimetableCatalogCourseItem =
  TimetableAddCourseSheetViewData['search']['items'][number];

const CATEGORY_BADGE_TONES: Record<
  string,
  {backgroundColor: string; color: string}
> = {
  전필: {backgroundColor: '#EEF2FF', color: '#4338CA'},
  전선: {backgroundColor: '#ECFDF5', color: '#047857'},
  교필: {backgroundColor: '#FFF7ED', color: '#C2410C'},
  교선: {backgroundColor: '#FDF2F8', color: '#BE185D'},
};

const CatalogCourseListItem = React.memo(
  ({
    item,
    onAddCatalogCourse,
  }: {
    item: TimetableCatalogCourseItem;
    onAddCatalogCourse: (courseId: string) => void;
  }) => {
    const categoryBadgeTone = item.categoryLabel
      ? CATEGORY_BADGE_TONES[item.categoryLabel] ?? {
          backgroundColor: COLORS.background.subtle,
          color: COLORS.text.secondary,
        }
      : undefined;
    const courseSummaryLabel = [
      item.departmentLabel,
      item.gradeLabel,
      item.scheduleLabel,
    ]
      .filter(Boolean)
      .join(' · ');
    const handlePress = () => {
      playHaptic({type: 'selection', intensity: 0.5});
      onAddCatalogCourse(item.courseId);
    };

    return (
      <View style={styles.catalogCard}>
        <View style={styles.catalogCopy}>
          <View style={styles.catalogTitleRow}>
            <Text numberOfLines={1} style={styles.catalogTitle}>
              {item.title}
            </Text>
            {item.categoryLabel && categoryBadgeTone ? (
              <View
                style={[
                  styles.catalogCategoryBadge,
                  {backgroundColor: categoryBadgeTone.backgroundColor},
                ]}>
                <Text
                  style={[
                    styles.catalogCategoryBadgeLabel,
                    {color: categoryBadgeTone.color},
                  ]}>
                  {item.categoryLabel}
                </Text>
              </View>
            ) : null}
          </View>
          {courseSummaryLabel ? (
            <Text numberOfLines={1} style={styles.catalogSupplementary}>
              {courseSummaryLabel}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={styles.catalogMeta}>
            {item.metaLabel}
          </Text>
          <Text numberOfLines={1} style={styles.catalogCode}>
            {item.codeLabel}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.6}
          disabled={item.alreadyAdded}
          onPress={handlePress}
          style={[
            styles.catalogAction,
            item.alreadyAdded
              ? styles.catalogActionDisabled
              : styles.catalogActionEnabled,
          ]}>
          <Icon
            color={
              item.alreadyAdded ? COLORS.text.muted : COLORS.text.inverse
            }
            name={item.alreadyAdded ? 'checkmark' : 'add'}
            size={18}
          />
        </TouchableOpacity>
      </View>
    );
  },
);

const FilterDropdown = ({
  isOpen,
  onRequestClose,
  onSelect,
  onToggle,
  options,
  placeholder,
  selectedId,
  style,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  onSelect: (id: string) => void;
  onToggle: () => void;
  options: TimetableFilterOptionViewData[];
  placeholder: string;
  selectedId: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const selectedOption = options.find(option => option.id === selectedId);

  return (
    <SelectionDropdown
      isOpen={isOpen}
      onPressSelect={label => {
        const option = options.find(candidate => candidate.label === label);
        if (option) {
          onSelect(option.id);
        }
        onRequestClose();
      }}
      onPressTrigger={onToggle}
      onRequestClose={onRequestClose}
      options={options.map(option => option.label)}
      placeholder={placeholder}
      selectedValue={selectedOption?.label}
      style={style}
    />
  );
};

export const TimetableAddCourseSheet = ({
  data,
  onAddCatalogCourse,
  onClose,
  onLoadMoreSearchResults,
  onRetryFilterOptions,
  onRetrySearch,
  onSelectCatalogCategory,
  onSelectCatalogDepartment,
  onSelectCatalogGrade,
  onSelectColor,
  onSelectCredits,
  onSelectDay,
  onSetManualEndPeriod,
  onSetManualField,
  onSetManualOnline,
  onSetManualStartPeriod,
  onSubmitManualCourse,
  onSwitchTab,
  onUpdateQuery,
  visible,
}: TimetableAddCourseSheetProps) => {
  const [openDropdown, setOpenDropdown] = React.useState<
    'catalogCategory' | 'catalogDepartment' | 'catalogGrade' | 'manualDepartment'
  >();
  const [searchInputValue, setSearchInputValue] = React.useState(
    data.search.query,
  );
  const searchInputRef =
    React.useRef<React.ElementRef<typeof BottomSheetTextInput>>(null);

  React.useEffect(() => {
    if (!visible && searchInputValue !== data.search.query) {
      setSearchInputValue(data.search.query);
      searchInputRef.current?.setNativeProps({
        text: data.search.query,
      });
    }
  }, [data.search.query, searchInputValue, visible]);

  React.useEffect(() => {
    if (!visible) {
      setOpenDropdown(undefined);
    }
  }, [visible]);

  const toggleDropdown = React.useCallback(
    (dropdown: NonNullable<typeof openDropdown>) => {
      Keyboard.dismiss();
      setOpenDropdown(current => (current === dropdown ? undefined : dropdown));
    },
    [],
  );

  React.useEffect(() => {
    if (!visible || data.activeTab !== 'search') {
      return;
    }

    if (searchInputValue === data.search.query) {
      return;
    }

    const timeoutId = setTimeout(() => {
      onUpdateQuery(searchInputValue);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [
    data.activeTab,
    data.search.query,
    onUpdateQuery,
    searchInputValue,
    visible,
  ]);

  const renderCatalogCourseItem = React.useCallback<
    ListRenderItem<TimetableCatalogCourseItem>
  >(
    ({item}) => (
      <CatalogCourseListItem
        item={item}
        onAddCatalogCourse={onAddCatalogCourse}
      />
    ),
    [onAddCatalogCourse],
  );

  const renderSearchEmpty = React.useCallback(
    () => {
      if (data.search.isLoading) {
        return (
          <View style={styles.skeletonList}>
            {Array.from({length: 4}).map((_, index) => (
              <View key={`catalog-skeleton-${index + 1}`} style={styles.catalogCard}>
                <View style={styles.catalogCopy}>
                  <SkeletonBlock style={styles.catalogTitleSkeleton} />
                  <SkeletonBlock style={styles.catalogSupplementarySkeleton} />
                  <SkeletonBlock style={styles.catalogMetaSkeleton} />
                  <SkeletonBlock style={styles.catalogCodeSkeleton} />
                </View>
                <SkeletonBlock style={styles.catalogActionSkeleton} />
              </View>
            ))}
          </View>
        );
      }

      if (data.search.errorLabel) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyLabel}>{data.search.errorLabel}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={onRetrySearch}
              style={styles.retryButton}>
              <Text style={styles.retryButtonLabel}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return data.search.emptyLabel ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyLabel}>{data.search.emptyLabel}</Text>
        </View>
      ) : null;
    },
    [data.search.emptyLabel, data.search.errorLabel, data.search.isLoading, onRetrySearch],
  );

  const renderCatalogCourseSeparator = React.useCallback(
    () => <View style={styles.catalogSeparator} />,
    [],
  );

  const renderSearchFooter = React.useCallback(() => {
    if (data.search.errorLabel && data.search.items.length > 0) {
      return (
        <View style={styles.searchFooter}>
          <Text style={styles.footerErrorLabel}>{data.search.errorLabel}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={onRetrySearch}
            style={styles.footerRetryButton}>
            <Text style={styles.footerRetryButtonLabel}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data.search.isLoadingMore) {
      return <View style={styles.searchFooterSpacer} />;
    }

    return (
      <View style={styles.searchFooter}>
        <ActivityIndicator color={COLORS.brand.primary} size="small" />
      </View>
    );
  }, [data.search.errorLabel, data.search.isLoadingMore, data.search.items.length, onRetrySearch]);

  return (
    <TimetableBottomSheet
      contentMode="scrollable"
      keyboardBehavior="interactive"
      onClose={onClose}
      snapPoints={['95%']}
      visible={visible}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>강의 추가</Text>
        <TouchableOpacity
          accessibilityLabel="닫기"
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={onClose}
          style={styles.closeButton}>
          <Icon color={COLORS.text.secondary} name="close" size={18} />
        </TouchableOpacity>
      </View>

      <SegmentedTabs
        activeTab={data.activeTab}
        onSwitchTab={tab => {
          setOpenDropdown(undefined);
          onSwitchTab(tab);
        }}
      />

      <ColorPicker
        colors={data.colors}
        onSelectColor={onSelectColor}
      />

      {data.activeTab === 'search' ? (
        <View style={styles.searchSection}>
          <View style={styles.searchField}>
            <Icon
              color={COLORS.text.muted}
              name="search-outline"
              size={16}
            />
            <BottomSheetTextInput
              onChangeText={setSearchInputValue}
              placeholder={data.search.placeholder}
              placeholderTextColor={COLORS.text.muted}
              ref={searchInputRef}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterSection}>
            <FilterDropdown
              isOpen={openDropdown === 'catalogDepartment'}
              onRequestClose={() => setOpenDropdown(undefined)}
              onSelect={onSelectCatalogDepartment}
              onToggle={() => toggleDropdown('catalogDepartment')}
              options={data.search.filters.departments}
              placeholder={
                data.search.filters.isLoading ? '필터 불러오는 중...' : '학과 전체'
              }
              selectedId={data.search.filters.selectedDepartmentId}
            />
            <View style={styles.splitFieldRow}>
              <FilterDropdown
                isOpen={openDropdown === 'catalogGrade'}
                onRequestClose={() => setOpenDropdown(undefined)}
                onSelect={onSelectCatalogGrade}
                onToggle={() => toggleDropdown('catalogGrade')}
                options={data.search.filters.grades}
                placeholder="학년 전체"
                selectedId={data.search.filters.selectedGradeId}
                style={styles.splitField}
              />
              <FilterDropdown
                isOpen={openDropdown === 'catalogCategory'}
                onRequestClose={() => setOpenDropdown(undefined)}
                onSelect={onSelectCatalogCategory}
                onToggle={() => toggleDropdown('catalogCategory')}
                options={data.search.filters.categories}
                placeholder="구분 전체"
                selectedId={data.search.filters.selectedCategoryId}
                style={styles.splitField}
              />
            </View>
            {data.search.filters.errorLabel ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={onRetryFilterOptions}>
                <Text style={styles.filterErrorLabel}>
                  {data.search.filters.errorLabel} 다시 시도
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <BottomSheetFlatList
            contentContainerStyle={styles.searchContent}
            data={data.search.items}
            initialNumToRender={12}
            ItemSeparatorComponent={renderCatalogCourseSeparator}
            keyboardShouldPersistTaps="handled"
            keyExtractor={item => item.courseId}
            ListEmptyComponent={renderSearchEmpty}
            ListFooterComponent={renderSearchFooter}
            maxToRenderPerBatch={16}
            onEndReached={onLoadMoreSearchResults}
            onEndReachedThreshold={0.45}
            removeClippedSubviews
            renderItem={renderCatalogCourseItem}
            showsVerticalScrollIndicator={false}
            style={styles.scrollable}
            updateCellsBatchingPeriod={50}
            windowSize={8}
          />
        </View>
      ) : (
        <BottomSheetScrollView
          contentContainerStyle={styles.manualContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollable}>
          <FieldBlock label="강의명 *">
            <BottomSheetTextInput
              onChangeText={value => onSetManualField('name', value)}
              placeholder="강의명을 입력하세요"
              placeholderTextColor={COLORS.text.muted}
              style={styles.textField}
              value={data.manual.nameValue}
            />
          </FieldBlock>

          <View style={styles.splitFieldRow}>
            <FieldBlock label="교수명" style={styles.splitField}>
              <BottomSheetTextInput
                onChangeText={value => onSetManualField('professor', value)}
                placeholder="교수명 입력"
                placeholderTextColor={COLORS.text.muted}
                style={[styles.textField, styles.manualSplitTextField]}
                value={data.manual.professorValue}
              />
            </FieldBlock>

            <FieldBlock label="학과" style={styles.splitField}>
              <FilterDropdown
                isOpen={openDropdown === 'manualDepartment'}
                onRequestClose={() => setOpenDropdown(undefined)}
                onSelect={value => onSetManualField('department', value)}
                onToggle={() => toggleDropdown('manualDepartment')}
                options={data.manual.departmentOptions}
                placeholder="학과 선택"
                selectedId={data.manual.departmentValue}
              />
            </FieldBlock>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>온라인 수업</Text>
            <ToggleSwitch
              accessibilityLabel="온라인 수업"
              onValueChange={onSetManualOnline}
              value={data.manual.isOnline}
            />
          </View>

          {!data.manual.isOnline ? (
            <>
              <FieldBlock label="강의실">
                <BottomSheetTextInput
                  onChangeText={value => onSetManualField('locationLabel', value)}
                  placeholder="예: 공학관 301"
                  placeholderTextColor={COLORS.text.muted}
                  style={styles.textField}
                  value={data.manual.locationValue}
                />
              </FieldBlock>

              <FieldBlock label="학점">
                <View style={styles.inlineRow}>
                  {data.manual.credits.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      activeOpacity={0.88}
                      onPress={() => onSelectCredits(option.id)}
                      style={[
                        styles.creditButton,
                        option.selected ? styles.creditButtonSelected : null,
                      ]}>
                      <Text
                        style={[
                          styles.optionLabel,
                          option.selected ? styles.optionLabelSelected : null,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FieldBlock>

              <FieldBlock label="요일">
                <View style={styles.inlineRow}>
                  {data.manual.dayOptions.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      activeOpacity={0.88}
                      onPress={() => onSelectDay(option.id)}
                      style={[
                        styles.dayButton,
                        option.selected ? styles.dayButtonSelected : null,
                      ]}>
                      <Text
                        style={[
                          styles.optionLabel,
                          option.selected ? styles.optionLabelSelected : null,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FieldBlock>

              <View style={styles.stepperRow}>
                <FieldBlock label="시작 교시" style={styles.stepperField}>
                  <StepperField
                    canDecrease={data.manual.startPeriod.canDecrease}
                    canIncrease={data.manual.startPeriod.canIncrease}
                    onDecrease={() => onSetManualStartPeriod(-1)}
                    onIncrease={() => onSetManualStartPeriod(1)}
                    valueLabel={data.manual.startPeriod.label}
                  />
                </FieldBlock>

                <FieldBlock label="종료 교시" style={styles.stepperField}>
                  <StepperField
                    canDecrease={data.manual.endPeriod.canDecrease}
                    canIncrease={data.manual.endPeriod.canIncrease}
                    onDecrease={() => onSetManualEndPeriod(-1)}
                    onIncrease={() => onSetManualEndPeriod(1)}
                    valueLabel={data.manual.endPeriod.label}
                  />
                </FieldBlock>
              </View>
            </>
          ) : (
            <FieldBlock label="학점">
              <View style={styles.inlineRow}>
                {data.manual.credits.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    accessibilityRole="button"
                    activeOpacity={0.88}
                    onPress={() => onSelectCredits(option.id)}
                    style={[
                      styles.creditButton,
                      option.selected ? styles.creditButtonSelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.optionLabel,
                        option.selected ? styles.optionLabelSelected : null,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FieldBlock>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            disabled={!data.manual.canSubmit}
            onPress={onSubmitManualCourse}
            style={[
              styles.submitButton,
              !data.manual.canSubmit ? styles.submitButtonDisabled : null,
            ]}>
            <Text style={styles.submitLabel}>강의 추가하기</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      )}
    </TimetableBottomSheet>
  );
};

const SegmentedTabs = ({
  activeTab,
  onSwitchTab,
}: {
  activeTab: 'manual' | 'search';
  onSwitchTab: (tab: 'manual' | 'search') => void;
}) => {
  return (
    <View style={styles.segmentedControl}>
      {(
        [
          {id: 'search', label: '강의 검색'},
          {id: 'manual', label: '직접 입력'},
        ] as const
      ).map(item => {
        const selected = activeTab === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={() => onSwitchTab(item.id)}
            style={[
              styles.segmentButton,
              selected ? styles.segmentButtonSelected : null,
            ]}>
            <Text
              style={[
                styles.segmentLabel,
                selected ? styles.segmentLabelSelected : null,
              ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const ColorPicker = ({
  colors,
  onSelectColor,
}: {
  colors: TimetableAddCourseSheetViewData['colors'];
  onSelectColor: (colorId: TimetableCourseToneId) => void;
}) => {
  return (
    <View style={styles.colorSection}>
      <Text style={styles.colorLabel}>강의 색상</Text>
      <View style={styles.colorRow}>
        {colors.map(color => {
          const tone = TIMETABLE_COURSE_TONES[color.id];

          return (
            <TouchableOpacity
              key={color.id}
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={() => onSelectColor(color.id)}
              style={[
                styles.colorButton,
                {backgroundColor: tone.accent},
              ]}>
              {color.selected ? (
                <Icon
                  color={COLORS.text.inverse}
                  name="checkmark"
                  size={15}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const FieldBlock = ({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
}) => {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
};

const StepperField = ({
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  valueLabel,
}: {
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  valueLabel: string;
}) => {
  return (
    <View style={styles.stepperContainer}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        disabled={!canDecrease}
        onPress={onDecrease}
        style={styles.stepperButton}>
        <Icon
          color={canDecrease ? COLORS.text.muted : TIMETABLE_TODAY_EMPTY_DOT_COLOR}
          name="remove"
          size={16}
        />
      </TouchableOpacity>

      <Text style={styles.stepperValue}>{valueLabel}</Text>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        disabled={!canIncrease}
        onPress={onIncrease}
        style={styles.stepperButton}>
        <Icon
          color={canIncrease ? COLORS.text.muted : TIMETABLE_TODAY_EMPTY_DOT_COLOR}
          name="add"
          size={16}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollable: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  segmentedControl: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: COLORS.background.surface,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  segmentLabelSelected: {
    color: COLORS.text.primary,
  },
  colorSection: {
    marginBottom: 12,
  },
  colorLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  searchContent: {
    paddingBottom: 8,
  },
  searchFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    paddingTop: 4,
  },
  footerErrorLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  footerRetryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerRetryButtonLabel: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  searchFooterSpacer: {
    height: 4,
  },
  searchSection: {
    flex: 1,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 42,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: COLORS.text.strong,
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterSection: {
    gap: 8,
    marginBottom: 12,
  },
  filterErrorLabel: {
    color: COLORS.status.danger,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  catalogCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    minHeight: 94,
    padding: 12,
  },
  catalogSeparator: {
    height: 8,
  },
  catalogCopy: {
    flex: 1,
    paddingRight: 12,
  },
  catalogTitle: {
    color: COLORS.text.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  catalogTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  catalogCategoryBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catalogCategoryBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  catalogSupplementary: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  catalogMeta: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  catalogCode: {
    color: '#D1D5DB',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  catalogAction: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  catalogActionEnabled: {
    backgroundColor: COLORS.brand.primary,
  },
  catalogActionDisabled: {
    backgroundColor: COLORS.background.subtle,
  },
  catalogActionSkeleton: {
    borderRadius: RADIUS.pill,
    height: 32,
    width: 32,
  },
  catalogCodeSkeleton: {
    height: 14,
    marginTop: 2,
    width: '34%',
  },
  catalogMetaSkeleton: {
    height: 16,
    marginTop: 2,
    width: '78%',
  },
  catalogSupplementarySkeleton: {
    height: 16,
    marginTop: 3,
    width: '62%',
  },
  catalogTitleSkeleton: {
    height: 20,
    width: '86%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLabel: {
    color: COLORS.text.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonLabel: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  skeletonList: {
    rowGap: 8,
  },
  manualContent: {
    paddingBottom: 8,
    rowGap: 16,
  },
  fieldLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 6,
  },
  textField: {
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.text.strong,
    fontSize: 14,
    height: 46,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  manualSplitTextField: {
    height: 50,
  },
  splitFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitField: {
    flex: 1,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  creditButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  creditButtonSelected: {
    backgroundColor: COLORS.brand.primary,
  },
  dayButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: COLORS.brand.primary,
  },
  optionLabel: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  optionLabelSelected: {
    color: COLORS.text.inverse,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepperField: {
    flex: 1,
  },
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: COLORS.border.default,
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stepperValue: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.lg,
    height: 48,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
