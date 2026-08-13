import React from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  COLORS,
  MOTION,
  RADIUS,
  SPACING,
} from '@/shared/design-system/tokens';

interface TaxiHomeSearchBarProps {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}

export const TaxiHomeSearchBar = ({
  onChangeText,
  placeholder,
  value,
}: TaxiHomeSearchBarProps) => {
  const {width: windowWidth} = useWindowDimensions();
  const inputRef = React.useRef<TextInput>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [showSearchContent, setShowSearchContent] = React.useState(false);
  const progress = useSharedValue(0);
  const fullWidth = windowWidth - SPACING.lg * 2;

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const isExpanding = expanded;

    progress.value = withTiming(
      isExpanding ? 1 : 0,
      {duration: MOTION.duration.normal},
      finished => {
        if (!finished) {
          return;
        }

        if (isExpanding) {
          runOnJS(focusInput)();
          return;
        }

        runOnJS(setShowSearchContent)(false);
      },
    );
  }, [expanded, focusInput, progress]);

  const containerAnimatedStyle = useAnimatedStyle(
    () => ({
      width: interpolate(progress.value, [0, 1], [44, fullWidth]),
    }),
    [fullWidth],
  );

  const searchContentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [8, 0]),
      },
    ],
  }));

  const handleExpand = React.useCallback(() => {
    setShowSearchContent(true);
    setExpanded(true);
  }, []);

  const handleCollapse = React.useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    onChangeText('');
    setExpanded(false);
  }, [onChangeText]);

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {showSearchContent ? (
        <Animated.View style={[styles.searchContent, searchContentAnimatedStyle]}>
          <TouchableOpacity
            accessibilityLabel="검색 닫기"
            accessibilityRole="button"
            activeOpacity={0.8}
            hitSlop={8}
            onPress={handleCollapse}
            style={styles.iconButton}>
            <Icon
              color={COLORS.text.muted}
              name="chevron-forward"
              size={20}
            />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.text.muted}
            returnKeyType="search"
            selectionColor={COLORS.brand.primary}
            style={styles.input}
            value={value}
          />
          {value ? (
            <TouchableOpacity
              accessibilityLabel="검색어 지우기"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => onChangeText('')}
              style={styles.iconButton}>
              <Icon
                color={COLORS.text.muted}
                name="close-circle"
                size={18}
              />
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      ) : (
        <TouchableOpacity
          accessibilityLabel="택시 출발지 검색 열기"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={handleExpand}
          style={styles.compactButton}>
          <Icon color={COLORS.text.muted} name="search-outline" size={20} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 10,
  },
  compactButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  searchContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  iconButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  input: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    paddingVertical: 0,
  },
});
