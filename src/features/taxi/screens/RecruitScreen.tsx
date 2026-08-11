import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {TAXI_HOME_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {layoutTransitions} from '@/shared/design-system/motion';
import {useScreenEnterAnimation, useScreenView} from '@/shared/hooks';

import {TaxiCreateLocationSection} from '../components/TaxiCreateLocationSection';
import {TaxiCreateTagSection} from '../components/TaxiCreateTagSection';
import {TaxiCreateTimePicker} from '../components/TaxiCreateTimePicker';
import {useTaxiRecruitForm} from '../hooks/useTaxiRecruitForm';
import type {TaxiStackParamList} from '../model/navigation';
import type {TaxiRecruitLocationKind} from '../model/taxiRecruitData';

type RecruitScreenNavigationProp = NativeStackNavigationProp<
  TaxiStackParamList,
  'Recruit'
>;

const DETAIL_MAX_LENGTH = 300;
const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const createSectionLayoutTransition = layoutTransitions.cardExpand;

const RecruitMemberChip = ({
  selected,
  value,
  onPress,
}: {
  selected: boolean;
  value: number;
  onPress: () => void;
}) => {
  const progress = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {duration: 180});
  }, [progress, selected]);

  const animatedChipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.background.surface, COLORS.brand.primary],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.border.default, COLORS.brand.primary],
    ),
    transform: [{scale: interpolate(progress.value, [0, 1], [1, 1.02])}],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.text.secondary, COLORS.text.inverse],
    ),
  }));

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.memberButton, animatedChipStyle]}>
      <Animated.Text style={[styles.memberButtonLabel, animatedLabelStyle]}>
        {value}
      </Animated.Text>
    </AnimatedTouchableOpacity>
  );
};

export const RecruitScreen = () => {
  useScreenView();

  const navigation = useNavigation<RecruitScreenNavigationProp>();
  const route =
    useRoute<NativeStackScreenProps<TaxiStackParamList, 'Recruit'>['route']>();
  const insets = useSafeAreaInsets();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const handledSelectionTokenRef = React.useRef<string | null>(null);
  const {
    addCustomTag,
    applyLocationSelection,
    canSubmit,
    customTagInput,
    departure,
    departureTime,
    detail,
    destination,
    isSubmitting,
    maxMemberOptions,
    maxMembers,
    removeTag,
    selectDepartureCustom,
    selectDeparturePreset,
    selectDestinationCustom,
    selectDestinationPreset,
    selectHour,
    selectMaxMembers,
    selectMinute,
    selectedTags,
    setCustomDepartureValue,
    setCustomDestinationValue,
    setCustomTagInput,
    setDetail,
    submitForm,
    tagOptions,
    togglePresetTag,
  } = useTaxiRecruitForm();

  React.useEffect(() => {
    const selectionToken = route.params?.selectionToken;
    const selection = route.params?.selection;

    if (
      !selectionToken ||
      !selection ||
      handledSelectionTokenRef.current === selectionToken
    ) {
      return;
    }

    handledSelectionTokenRef.current = selectionToken;
    applyLocationSelection(selection);
    navigation.setParams({
      selection: undefined,
      selectionToken: undefined,
    });
  }, [
    applyLocationSelection,
    navigation,
    route.params?.selection,
    route.params?.selectionToken,
  ]);

  const handleSubmit = React.useCallback(async () => {
    const result = await submitForm();

    if (result.partyId) {
      invalidateData(TAXI_HOME_INVALIDATION_KEY);
      navigation.replace('Chat', {partyId: result.partyId});
      return;
    }

    Alert.alert('파티 만들기', result.message);
  }, [navigation, submitForm]);

  const handleFocusDetailInput = React.useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({animated: true});
    }, 120);
  }, []);

  const handlePressMapAction = React.useCallback(
    (kind: TaxiRecruitLocationKind) => {
      const section = kind === 'departure' ? departure : destination;

      navigation.navigate('TaxiLocationPicker', {
        initialLocation: section.selectedLocation ?? undefined,
        initialName: section.customValue.trim(),
        kind,
      });
    },
    [departure, destination, navigation],
  );

  const footerPaddingBottom = insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <Animated.View style={[styles.flex, screenAnimatedStyle]}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityLabel="뒤로 가기"
              accessibilityRole="button"
              activeOpacity={0.84}
              onPress={navigation.goBack}
              style={styles.headerButton}>
              <Icon
                color={COLORS.text.primary}
                name="arrow-back"
                size={22}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>파티 만들기</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {paddingBottom: footerPaddingBottom},
            ]}
            keyboardShouldPersistTaps="handled"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}>
            <Animated.View layout={createSectionLayoutTransition()}>
              <TaxiCreateLocationSection
                customPlaceholder="출발지를 직접 입력하세요"
                customValue={departure.customValue}
                disabledLabel={departure.disabledLabel}
                hasMapSelection={departure.hasMapSelection}
                helperText={departure.helperText}
                helperTone={departure.helperTone}
                mapActionDisabled={departure.mapActionDisabled}
                mapActionLabel={departure.mapActionLabel}
                mode={departure.mode}
                options={departure.options}
                selectedLabel={departure.selectedLabel}
                title="출발지"
                onChangeCustomValue={setCustomDepartureValue}
                onPressCustom={selectDepartureCustom}
                onPressMapAction={() => {
                  handlePressMapAction('departure');
                }}
                onPressPreset={selectDeparturePreset}
              />
            </Animated.View>

            <Animated.View layout={createSectionLayoutTransition()}>
              <TaxiCreateLocationSection
                customPlaceholder="도착지를 직접 입력하세요"
                customValue={destination.customValue}
                disabledLabel={destination.disabledLabel}
                hasMapSelection={destination.hasMapSelection}
                helperText={destination.helperText}
                helperTone={destination.helperTone}
                mapActionDisabled={destination.mapActionDisabled}
                mapActionLabel={destination.mapActionLabel}
                mode={destination.mode}
                options={destination.options}
                selectedLabel={destination.selectedLabel}
                title="도착지"
                onChangeCustomValue={setCustomDestinationValue}
                onPressCustom={selectDestinationCustom}
                onPressMapAction={() => {
                  handlePressMapAction('destination');
                }}
                onPressPreset={selectDestinationPreset}
              />
            </Animated.View>

            <Animated.View layout={createSectionLayoutTransition()}>
              <TaxiCreateTimePicker
                hour={departureTime.hour}
                minute={departureTime.minute}
                summaryLabel={departureTime.summaryLabel}
                summaryTone={departureTime.summaryTone}
                onChangeHour={selectHour}
                onChangeMinute={selectMinute}
              />
            </Animated.View>

            <Animated.View
              layout={createSectionLayoutTransition()}
              style={styles.card}>
              <Text style={styles.memberTitle}>
                최대 인원{' '}
                <Text style={styles.memberCount}>{`${maxMembers}명`}</Text>{' '}
                <Text style={styles.memberCaption}>(본인 포함)</Text>
              </Text>

              <View style={styles.memberOptions}>
                {maxMemberOptions.map(option => {
                  return (
                    <RecruitMemberChip
                      key={option}
                      selected={option === maxMembers}
                      value={option}
                      onPress={() => selectMaxMembers(option)}
                    />
                  );
                })}
              </View>
            </Animated.View>

            <Animated.View layout={createSectionLayoutTransition()}>
              <TaxiCreateTagSection
                customTagInput={customTagInput}
                selectedTags={selectedTags}
                tagOptions={tagOptions}
                onAddCustomTag={addCustomTag}
                onChangeCustomTagInput={setCustomTagInput}
                onRemoveTag={removeTag}
                onTogglePresetTag={togglePresetTag}
              />
            </Animated.View>

            <Animated.View
              layout={createSectionLayoutTransition()}
              style={styles.card}>
              <Text style={styles.title}>상세 내용</Text>
              <TextInput
                maxLength={DETAIL_MAX_LENGTH}
                multiline
                placeholder="파티에 대한 추가 정보를 입력하세요. (예: 짐이 많아요, 여성분만 탑승 가능해요 등)"
                placeholderTextColor={COLORS.text.muted}
                selectionColor={COLORS.brand.primary}
                style={styles.detailInput}
                textAlignVertical="top"
                value={detail}
                onChangeText={setDetail}
                onFocus={handleFocusDetailInput}
              />
              <Text style={styles.detailCounter}>
                {`${detail.length}/${DETAIL_MAX_LENGTH}`}
              </Text>
            </Animated.View>
          </ScrollView>

          <View style={[styles.footer, {paddingBottom: footerPaddingBottom}]}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={canSubmit && !isSubmitting ? 0.9 : 1}
              disabled={!canSubmit || isSubmitting}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
              ]}>
              <Icon
                color={
                  canSubmit && !isSubmitting
                    ? COLORS.text.inverse
                    : COLORS.text.muted
                }
                name="car-sport-outline"
                size={22}
              />
              <Text
                style={[
                  styles.submitButtonLabel,
                  (!canSubmit || isSubmitting) &&
                    styles.submitButtonLabelDisabled,
                ]}>
                {isSubmitting ? '준비 중...' : '택시파티 모집 시작'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  memberTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  memberCount: {
    color: COLORS.brand.primaryStrong,
  },
  memberCaption: {
    color: COLORS.text.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  memberOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  memberButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 16,
  },
  memberButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  detailInput: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 15,
    lineHeight: 18,
    minHeight: 132,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  detailCounter: {
    alignSelf: 'flex-end',
    color: COLORS.text.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  footer: {
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 56,
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.background.subtle,
    shadowOpacity: 0,
  },
  submitButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  submitButtonLabelDisabled: {
    color: COLORS.text.muted,
  },
});
