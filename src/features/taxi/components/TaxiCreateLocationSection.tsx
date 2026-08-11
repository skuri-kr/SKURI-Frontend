import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {
  enteringTransitions,
  exitingTransitions,
  layoutTransitions,
} from '@/shared/design-system/motion';

interface TaxiCreateLocationSectionProps {
  customPlaceholder: string;
  customValue: string;
  disabledLabel: string | null;
  hasMapSelection: boolean;
  helperText: string | null;
  helperTone: 'success' | 'warning' | null;
  mapActionDisabled: boolean;
  mapActionLabel: string;
  mode: 'preset' | 'custom';
  options: readonly string[][];
  selectedLabel: string;
  title: string;
  onChangeCustomValue: (value: string) => void;
  onPressCustom: () => void;
  onPressMapAction: () => void;
  onPressPreset: (label: string) => void;
}

interface TaxiCreateLocationChipProps {
  disabled?: boolean;
  label: string;
  selected: boolean;
  onPress: () => void;
}

const CUSTOM_OPTION_LABEL = '직접 입력';
const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const DISABLED_CHIP_TEXT_COLOR = '#D1D5DB';

const TaxiCreateLocationChip = ({
  disabled = false,
  label,
  selected,
  onPress,
}: TaxiCreateLocationChipProps) => {
  const selectedProgress = useSharedValue(selected ? 1 : 0);
  const disabledProgress = useSharedValue(disabled ? 1 : 0);

  React.useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, {duration: 180});
  }, [selected, selectedProgress]);

  React.useEffect(() => {
    disabledProgress.value = withTiming(disabled ? 1 : 0, {duration: 180});
  }, [disabled, disabledProgress]);

  const animatedChipStyle = useAnimatedStyle(
    () => {
      const baseBackgroundColor = interpolateColor(
        selectedProgress.value,
        [0, 1],
        [COLORS.background.surface, COLORS.brand.primary],
      );
      const baseBorderColor = interpolateColor(
        selectedProgress.value,
        [0, 1],
        [COLORS.border.default, COLORS.brand.primary],
      );
      const baseScale = interpolate(selectedProgress.value, [0, 1], [1, 1.02]);

      return {
        backgroundColor: interpolateColor(
          disabledProgress.value,
          [0, 1],
          [baseBackgroundColor, COLORS.background.subtle],
        ),
        borderColor: interpolateColor(
          disabledProgress.value,
          [0, 1],
          [baseBorderColor, COLORS.border.subtle],
        ),
        transform: [
          {
            scale: interpolate(disabledProgress.value, [0, 1], [baseScale, 1]),
          },
        ],
      };
    },
    [],
  );

  const animatedLabelStyle = useAnimatedStyle(() => {
    const baseTextColor = interpolateColor(
      selectedProgress.value,
      [0, 1],
      [COLORS.text.secondary, COLORS.text.inverse],
    );

    return {
      color: interpolateColor(
        disabledProgress.value,
        [0, 1],
        [baseTextColor, DISABLED_CHIP_TEXT_COLOR],
      ),
    };
  });

  return (
    <AnimatedTouchableOpacity
      accessibilityRole="button"
      activeOpacity={disabled ? 1 : 0.84}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, animatedChipStyle]}>
      <Animated.Text style={[styles.chipLabel, animatedLabelStyle]}>
        {label}
      </Animated.Text>
    </AnimatedTouchableOpacity>
  );
};

export const TaxiCreateLocationSection = ({
  customPlaceholder,
  customValue,
  disabledLabel,
  hasMapSelection,
  helperText,
  helperTone,
  mapActionDisabled,
  mapActionLabel,
  mode,
  options,
  selectedLabel,
  title,
  onChangeCustomValue,
  onPressCustom,
  onPressMapAction,
  onPressPreset,
}: TaxiCreateLocationSectionProps) => {
  return (
    <Animated.View
      layout={layoutTransitions.cardExpand()}
      style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.chips}>
        {options.flat().map(option => {
          const isDisabled = disabledLabel === option;
          const isSelected = mode === 'preset' && selectedLabel === option;

          return (
            <TaxiCreateLocationChip
              disabled={isDisabled}
              key={option}
              label={option}
              selected={isSelected}
              onPress={() => onPressPreset(option)}
            />
          );
        })}

        <TaxiCreateLocationChip
          label={CUSTOM_OPTION_LABEL}
          selected={mode === 'custom'}
          onPress={onPressCustom}
        />
      </View>

      {mode === 'custom' ? (
        <Animated.View
          entering={enteringTransitions.fadeInDown()}
          exiting={exitingTransitions.fadeOutUp()}
          layout={layoutTransitions.cardExpand()}
          style={styles.customSection}>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={customPlaceholder}
              placeholderTextColor={COLORS.text.muted}
              selectionColor={COLORS.brand.primary}
              style={styles.input}
              value={customValue}
              onChangeText={onChangeCustomValue}
            />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={mapActionDisabled ? 1 : 0.84}
              disabled={mapActionDisabled}
              onPress={onPressMapAction}
              style={[
                styles.mapActionButton,
                hasMapSelection
                  ? styles.mapActionButtonSelected
                  : styles.mapActionButtonDefault,
                mapActionDisabled && styles.mapActionButtonDisabled,
              ]}>
              <Icon
                color={
                  mapActionDisabled
                    ? COLORS.text.muted
                    : hasMapSelection
                    ? COLORS.status.success
                    : COLORS.accent.blue
                }
                name="location"
                size={16}
              />
              <Text
                style={[
                  styles.mapActionLabel,
                  hasMapSelection
                    ? styles.mapActionLabelSelected
                    : styles.mapActionLabelDefault,
                  mapActionDisabled && styles.mapActionLabelDisabled,
                ]}>
                {mapActionLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {helperText && helperTone ? (
            <View
              style={[
                styles.banner,
                helperTone === 'success'
                  ? styles.successBanner
                  : styles.warningBanner,
              ]}>
              <View style={styles.bannerContent}>
                <Icon
                  color={
                    helperTone === 'success'
                      ? COLORS.status.success
                      : COLORS.status.warning
                  }
                  name={
                    helperTone === 'success'
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.bannerLabel,
                    helperTone === 'success'
                      ? styles.successBannerLabel
                      : styles.warningBannerLabel,
                  ]}>
                  {helperText}
                </Text>
              </View>

              {helperTone === 'success' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.84}
                  onPress={onPressMapAction}
                  style={styles.bannerActionButton}>
                  <Text style={styles.bannerActionLabel}>변경</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  bannerActionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 12,
  },
  bannerActionLabel: {
    color: COLORS.status.success,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  bannerContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bannerLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  chip: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  customSection: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 18,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mapActionButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 12,
  },
  mapActionButtonDefault: {
    backgroundColor: COLORS.accent.blueSoft,
    borderColor: '#BFDBFE',
  },
  mapActionButtonDisabled: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.default,
  },
  mapActionButtonSelected: {
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.border.accent,
  },
  mapActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  mapActionLabelDefault: {
    color: COLORS.accent.blue,
  },
  mapActionLabelDisabled: {
    color: COLORS.text.muted,
  },
  mapActionLabelSelected: {
    color: COLORS.status.success,
  },
  successBanner: {
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.border.accent,
  },
  successBannerLabel: {
    color: COLORS.status.success,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  warningBanner: {
    backgroundColor: COLORS.accent.orangeSoft,
    borderColor: '#FED7AA',
  },
  warningBannerLabel: {
    color: COLORS.status.warning,
  },
});
