import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';
import {
  CHAT_COMPOSER_ROW_BASE_HEIGHT,
  ChatComposerBar,
  type ChatComposerEditingState,
} from '@/shared/ui/chat';

import type {
  TaxiChatActionTrayActionId,
  TaxiChatActionTrayActionViewData,
} from '../model/taxiChatViewData';

interface TaxiChatComposerProps {
  actionTrayActions: TaxiChatActionTrayActionViewData[];
  actionTrayVisible: boolean;
  editing?: ChatComposerEditingState;
  imageButtonDisabled?: boolean;
  keyboardVisible: boolean;
  onChangeText: (value: string) => void;
  onPressAction: (actionId: TaxiChatActionTrayActionId) => void;
  onPressImage: () => void;
  onPressToggleTray: () => void;
  onSend: (value: string) => void;
  placeholder: string;
  sendDisabled?: boolean;
  value: string;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export const TAXI_CHAT_COMPOSER_BAR_HEIGHT = 60;
export const TAXI_CHAT_ACTION_TRAY_HEIGHT = 130;

const getActionIconName = (actionId: TaxiChatActionTrayActionId) => {
  switch (actionId) {
    case 'callTaxi':
      return 'car-outline';
    case 'sendAccount':
      return 'card-outline';
    case 'pasteAccount':
      return 'clipboard-outline';
    case 'close':
      return 'pause-outline';
    case 'reopen':
      return 'play-outline';
    case 'arrive':
      return 'location-outline';
    case 'settlementStatus':
      return 'wallet-outline';
    case 'end':
      return 'close-outline';
    default:
      return 'ellipse-outline';
  }
};

const getActionToneStyle = (action: TaxiChatActionTrayActionViewData) => {
  switch (action.id) {
    case 'callTaxi':
      return {
        backgroundColor: COLORS.accent.yellowSoft,
        iconColor: COLORS.accent.yellow,
      };
    case 'sendAccount':
      return {
        backgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
      };
    case 'pasteAccount':
      return {
        backgroundColor: COLORS.accent.purpleSoft,
        iconColor: COLORS.accent.purple,
      };
    case 'reopen':
    case 'arrive':
      return {
        backgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
      };
    default:
      break;
  }

  switch (action.tone) {
    case 'info':
      return {
        backgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
      };
    case 'warning':
      return {
        backgroundColor: COLORS.accent.orangeSoft,
        iconColor: COLORS.status.warning,
      };
    case 'danger':
      return {
        backgroundColor: '#FEE2E2',
        iconColor: COLORS.status.danger,
      };
    case 'purple':
      return {
        backgroundColor: COLORS.accent.purpleSoft,
        iconColor: COLORS.accent.purple,
      };
    case 'brand':
    default:
      return {
        backgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primaryStrong,
      };
  }
};

export const TaxiChatComposer = ({
  actionTrayActions,
  actionTrayVisible,
  editing,
  imageButtonDisabled = false,
  keyboardVisible,
  onChangeText,
  onPressAction,
  onPressImage,
  onPressToggleTray,
  onSend,
  placeholder,
  sendDisabled = false,
  value,
}: TaxiChatComposerProps) => {
  const insets = useSafeAreaInsets();
  const hasTrayActions = !editing && actionTrayActions.length > 0;
  const trayProgress = useSharedValue(actionTrayVisible ? 1 : 0);
  const composerRowHeight =
    CHAT_COMPOSER_ROW_BASE_HEIGHT +
    (keyboardVisible ? 10 : Math.max(insets.bottom, 10));

  React.useEffect(() => {
    trayProgress.value = withTiming(actionTrayVisible ? 1 : 0, {duration: 180});
  }, [actionTrayVisible, trayProgress]);

  const toggleButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      trayProgress.value,
      [0, 1],
      [COLORS.brand.primary, COLORS.text.primary],
    ),
  }));

  const toggleIconStyle = useAnimatedStyle(() => ({
    transform: [
      {rotate: `${interpolate(trayProgress.value, [0, 1], [0, 45])}deg`},
    ],
  }));

  const trayStyle = useAnimatedStyle(() => ({
    opacity: trayProgress.value,
    transform: [{translateY: interpolate(trayProgress.value, [0, 1], [18, 0])}],
  }));

  const leadingAccessory = hasTrayActions ? (
    <AnimatedTouchableOpacity
      accessibilityLabel={
        actionTrayVisible ? '액션 메뉴 닫기' : '액션 메뉴 열기'
      }
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPressToggleTray}
      style={[styles.leadingButton, toggleButtonStyle]}>
      <Animated.View style={toggleIconStyle}>
        <Icon color={COLORS.text.inverse} name="add" size={20} />
      </Animated.View>
    </AnimatedTouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      {hasTrayActions ? (
        <Animated.View
          pointerEvents={actionTrayVisible ? 'auto' : 'none'}
          style={[
            styles.tray,
            trayStyle,
            {
              bottom: composerRowHeight,
            },
          ]}>
          <View style={styles.trayGrid}>
            {actionTrayActions.map(action => {
              const toneStyle = getActionToneStyle(action);

              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.84}
                  key={action.id}
                  onPress={() => onPressAction(action.id)}
                  style={styles.trayAction}>
                  <View
                    style={[
                      styles.trayActionIconWrap,
                      {backgroundColor: toneStyle.backgroundColor},
                    ]}>
                    <Icon
                      color={toneStyle.iconColor}
                      name={getActionIconName(action.id)}
                      size={24}
                    />
                  </View>
                  <Text style={styles.trayActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      <ChatComposerBar
        editing={editing}
        imageButtonDisabled={imageButtonDisabled || Boolean(editing)}
        keyboardVisible={keyboardVisible}
        leadingAccessory={leadingAccessory}
        onChangeText={onChangeText}
        onPressImage={onPressImage}
        onSend={onSend}
        placeholder={placeholder}
        sendDisabled={sendDisabled}
        value={value}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  leadingButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  tray: {
    backgroundColor: COLORS.background.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    left: 0,
    minHeight: TAXI_CHAT_ACTION_TRAY_HEIGHT,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    position: 'absolute',
    right: 0,
    zIndex: 1,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
  },
  trayAction: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  trayActionIconWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  trayActionLabel: {
    color: COLORS.text.strong,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
  },
  trayGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
});
