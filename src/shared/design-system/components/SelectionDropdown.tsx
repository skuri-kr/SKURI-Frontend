import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../tokens';

interface SelectionDropdownProps {
  isOpen: boolean;
  maxHeight?: number;
  onPressSelect: (value: string) => void;
  onRequestClose?: () => void;
  onPressTrigger: () => void;
  options: string[];
  placeholder?: string;
  selectedValue?: string;
  style?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
}

interface TriggerLayout {
  height: number;
  width: number;
  x: number;
  y: number;
}

export const SelectionDropdown = ({
  isOpen,
  maxHeight = 208,
  onPressSelect,
  onRequestClose,
  onPressTrigger,
  options,
  placeholder = '',
  selectedValue,
  style,
  triggerStyle,
}: SelectionDropdownProps) => {
  const insets = useSafeAreaInsets();
  const {height: windowHeight, width: windowWidth} = useWindowDimensions();
  const triggerLabel = selectedValue || placeholder;
  const progress = useSharedValue(isOpen ? 1 : 0);
  const wrapperRef = React.useRef<View>(null);
  const visibilityRequestRef = React.useRef(0);
  const pendingOpenAnimationRef = React.useRef(false);
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [triggerLayout, setTriggerLayout] = React.useState<TriggerLayout | null>(null);
  const preferredDropdownHeight = Math.min(options.length * 44, maxHeight);

  const measureTrigger = React.useCallback(() => {
    wrapperRef.current?.measureInWindow((x, y, width, height) => {
      if (!width || !height) {
        return;
      }

      setTriggerLayout({x, y, width, height});
    });
  }, []);

  const handleModalHidden = React.useCallback((requestId: number) => {
    if (requestId !== visibilityRequestRef.current) {
      return;
    }

    setModalVisible(false);
    setTriggerLayout(null);
  }, []);

  const closeModalWithAnimation = React.useCallback(() => {
    const requestId = visibilityRequestRef.current;
    progress.value = withTiming(0, {duration: 180}, finished => {
      if (finished) {
        runOnJS(handleModalHidden)(requestId);
      }
    });
  }, [handleModalHidden, progress]);

  React.useEffect(() => {
    if (!isOpen) {
      pendingOpenAnimationRef.current = false;

      if (isModalVisible) {
        closeModalWithAnimation();
      } else {
        progress.value = 0;
        setTriggerLayout(null);
      }

      return;
    }

    visibilityRequestRef.current += 1;

    if (isModalVisible) {
      pendingOpenAnimationRef.current = false;
      progress.value = withTiming(1, {
        duration: 220,
      });
    }

    const frame = requestAnimationFrame(() => {
      measureTrigger();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    closeModalWithAnimation,
    isModalVisible,
    isOpen,
    measureTrigger,
    progress,
    windowHeight,
    windowWidth,
  ]);

  React.useEffect(() => {
    if (!isOpen || !triggerLayout || isModalVisible) {
      return;
    }

    progress.value = 0;
    visibilityRequestRef.current += 1;
    pendingOpenAnimationRef.current = true;
    setModalVisible(true);
  }, [isModalVisible, isOpen, progress, triggerLayout]);

  const dropdownPlacement = React.useMemo(() => {
    if (!triggerLayout) {
      return null;
    }

    const gap = 8;
    const horizontalPadding = 12;
    const verticalPadding = 12;
    const minDropdownHeight = Math.min(preferredDropdownHeight, 44);

    const width = Math.min(triggerLayout.width, windowWidth - horizontalPadding * 2);
    const left = Math.max(
      horizontalPadding,
      Math.min(triggerLayout.x, windowWidth - width - horizontalPadding),
    );

    const spaceBelow =
      windowHeight -
      insets.bottom -
      verticalPadding -
      (triggerLayout.y + triggerLayout.height + gap);
    const spaceAbove = triggerLayout.y - insets.top - verticalPadding - gap;
    const openUpwards =
      spaceBelow < preferredDropdownHeight && spaceAbove > spaceBelow;
    const availableHeight = openUpwards ? spaceAbove : spaceBelow;
    const height = Math.max(
      minDropdownHeight,
      Math.min(preferredDropdownHeight, availableHeight),
    );
    const top = openUpwards
      ? Math.max(insets.top + verticalPadding, triggerLayout.y - height - gap)
      : Math.min(
          triggerLayout.y + triggerLayout.height + gap,
          windowHeight - insets.bottom - verticalPadding - height,
        );

    return {
      height,
      left,
      openUpwards,
      top,
      width,
    };
  }, [
    insets.bottom,
    insets.top,
    preferredDropdownHeight,
    triggerLayout,
    windowHeight,
    windowWidth,
  ]);

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [dropdownPlacement?.openUpwards ? 8 : -8, 0],
        ),
      },
    ],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.08]),
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const handleRequestClose = React.useCallback(() => {
    if (onRequestClose) {
      onRequestClose();
      return;
    }

    onPressTrigger();
  }, [onPressTrigger, onRequestClose]);

  const handleModalShow = React.useCallback(() => {
    if (!pendingOpenAnimationRef.current) {
      return;
    }

    pendingOpenAnimationRef.current = false;
    progress.value = withTiming(1, {
      duration: 220,
    });
  }, [progress]);

  return (
    <View
      ref={wrapperRef}
      collapsable={false}
      style={[styles.wrapper, style]}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPressTrigger}
        style={[styles.trigger, triggerStyle]}>
        <Text
          style={[
            styles.triggerLabel,
            !selectedValue ? styles.triggerPlaceholderLabel : undefined,
          ]}>
          {triggerLabel}
        </Text>
        <Animated.View style={chevronAnimatedStyle}>
          <Icon
            color={COLORS.text.muted}
            name="chevron-down"
            size={16}
          />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        animationType="none"
        onShow={handleModalShow}
        onRequestClose={handleRequestClose}
        transparent
        visible={isModalVisible && dropdownPlacement !== null}>
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, backdropAnimatedStyle]}
          />
          <Pressable
            onPressIn={handleRequestClose}
            style={StyleSheet.absoluteFill}
          />

          {dropdownPlacement ? (
            <Animated.View
              style={[
                styles.dropdown,
                dropdownAnimatedStyle,
                {
                  height: dropdownPlacement.height,
                  left: dropdownPlacement.left,
                  top: dropdownPlacement.top,
                  width: dropdownPlacement.width,
                },
              ]}>
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}>
            {options.map(option => {
              const isSelected = option === selectedValue;

              return (
                <TouchableOpacity
                  key={option}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => onPressSelect(option)}
                  style={[
                    styles.option,
                    isSelected ? styles.optionSelected : undefined,
                  ]}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected ? styles.optionLabelSelected : undefined,
                    ]}>
                    {option}
                  </Text>

                  {isSelected ? (
                    <Icon
                      color={COLORS.brand.primary}
                      name="checkmark"
                      size={16}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 50,
  },
  modalRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdrop: {
    backgroundColor: COLORS.text.primary,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    paddingHorizontal: 17,
  },
  triggerLabel: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  triggerPlaceholderLabel: {
    color: COLORS.text.muted,
  },
  dropdown: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 24,
    ...SHADOWS.raised,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 44,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  optionSelected: {
    backgroundColor: COLORS.brand.primaryTint,
  },
  optionLabel: {
    color: COLORS.text.strong,
    fontSize: 14,
    lineHeight: 20,
  },
  optionLabelSelected: {
    color: COLORS.brand.primaryStrong,
    fontWeight: '600',
  },
});
