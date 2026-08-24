import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {ToggleSwitch} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

export interface PopupMenuToggleItem {
  disabled?: boolean;
  iconName: string;
  id: string;
  label: string;
  onPress: () => void;
  type: 'toggle';
  value: boolean;
}

export interface PopupMenuActionItem {
  iconName: string;
  id: string;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  type: 'action';
}

export type PopupMenuItem = PopupMenuToggleItem | PopupMenuActionItem;

interface PopupMenuProps {
  items: PopupMenuItem[];
  onClose: () => void;
  right?: number;
  top?: number;
  visible: boolean;
  width?: number;
}

const MENU_ANIMATION_IN_DURATION = 180;
const MENU_ANIMATION_OUT_DURATION = 140;

export const PopupMenu = ({
  items,
  onClose,
  right = 12,
  top = 64,
  visible,
  width = 184,
}: PopupMenuProps) => {
  const pendingActionRef = React.useRef<(() => void) | null>(null);
  const [shouldRender, setShouldRender] = React.useState(visible);
  const [renderItems, setRenderItems] = React.useState(items);
  const [renderPosition, setRenderPosition] = React.useState({
    right,
    top,
    width,
  });
  const progress = useSharedValue(visible ? 1 : 0);

  const finishClosing = React.useCallback(() => {
    setShouldRender(false);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pendingAction) {
      requestAnimationFrame(pendingAction);
    }
  }, []);

  const handleClose = React.useCallback(() => {
    pendingActionRef.current = null;
    onClose();
  }, [onClose]);

  const handleActionPress = React.useCallback(
    (action: () => void) => {
      pendingActionRef.current = action;
      onClose();
    },
    [onClose],
  );

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setRenderItems(items);
    setRenderPosition({
      right,
      top,
      width,
    });
  }, [items, right, top, visible, width]);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      progress.value = withTiming(1, {duration: MENU_ANIMATION_IN_DURATION});
      return;
    }

    progress.value = withTiming(
      0,
      {duration: MENU_ANIMATION_OUT_DURATION},
      finished => {
        if (finished) {
          runOnJS(finishClosing)();
        }
      },
    );
  }, [finishClosing, progress, visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {translateY: interpolate(progress.value, [0, 1], [-8, 0])},
      {scale: interpolate(progress.value, [0, 1], [0.96, 1])},
    ],
  }));

  if (!shouldRender || renderItems.length === 0) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      transparent
      visible={shouldRender}>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, overlayAnimatedStyle]}
        />
        <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />

        <Animated.View
          style={[
            styles.card,
            {
              right: renderPosition.right,
              top: renderPosition.top,
              width: renderPosition.width,
            },
            cardAnimatedStyle,
          ]}>
          {renderItems.map((item, index) => {
            const showDivider = index < renderItems.length - 1;

            return (
              <React.Fragment key={item.id}>
                {item.type === 'toggle' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{disabled: item.disabled}}
                    activeOpacity={item.disabled ? 1 : 0.82}
                    disabled={item.disabled}
                    onPress={item.onPress}
                    style={[
                      styles.toggleRow,
                      item.disabled ? styles.disabledRow : null,
                    ]}>
                    <View style={styles.rowLabelGroup}>
                      <Icon
                        color={COLORS.text.secondary}
                        name={item.iconName}
                        size={15}
                      />
                      <Text style={styles.rowLabel}>{item.label}</Text>
                    </View>
                    <ToggleSwitch
                      disabled={item.disabled}
                      pressable={false}
                      size="compact"
                      value={item.value}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={() => handleActionPress(item.onPress)}
                    style={styles.actionRow}>
                    <Icon
                      color={
                        item.tone === 'danger'
                          ? COLORS.status.danger
                          : COLORS.text.secondary
                      }
                      name={item.iconName}
                      size={15}
                    />
                    <Text
                      style={[
                        styles.rowLabel,
                        item.tone === 'danger' ? styles.dangerLabel : null,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}

                {showDivider ? <View style={styles.divider} /> : null}
              </React.Fragment>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 20,
    ...SHADOWS.raised,
  },
  dangerLabel: {
    color: COLORS.status.danger,
  },
  disabledRow: {
    opacity: 0.56,
  },
  divider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginHorizontal: SPACING.md,
  },
  overlay: {
    backgroundColor: 'rgba(15,23,42,0.06)',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  rowLabel: {
    color: COLORS.text.strong,
    fontSize: 14,
    lineHeight: 20,
  },
  rowLabelGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
  },
});
