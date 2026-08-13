import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import type {ChatThreadNewMessagePreviewViewData} from './types';

const NEW_MESSAGE_BUTTON_HEIGHT = 42;

interface ChatThreadScrollActionsProps {
  bottomInset: number
  newMessagePreview: ChatThreadNewMessagePreviewViewData | null
  onPressScrollToBottom: () => void
  showScrollToBottom: boolean
}

export const ChatThreadScrollActions = ({
  bottomInset,
  newMessagePreview,
  onPressScrollToBottom,
  showScrollToBottom,
}: ChatThreadScrollActionsProps) => {
  if (!newMessagePreview && !showScrollToBottom) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {showScrollToBottom && !newMessagePreview ? (
        <TouchableOpacity
          accessibilityLabel="최신 메시지로 이동"
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={onPressScrollToBottom}
          style={[styles.scrollToBottomButton, {bottom: bottomInset}]}>
          <Icon
            color={COLORS.text.secondary}
            name="chevron-down"
            size={24}
          />
        </TouchableOpacity>
      ) : null}

      {newMessagePreview ? (
        <TouchableOpacity
          accessibilityLabel={`${newMessagePreview.senderName}: ${newMessagePreview.text}. 최신 메시지로 이동`}
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={onPressScrollToBottom}
          style={[styles.newMessageButton, {bottom: bottomInset}]}>
          <Icon
            color={COLORS.brand.primaryStrong}
            name="chatbubble-ellipses-outline"
            size={17}
          />
          <View style={styles.newMessageTextWrap}>
            <Text numberOfLines={1} style={styles.newMessageSenderName}>
              {newMessagePreview.senderName}
            </Text>
            <Text numberOfLines={1} style={styles.newMessageText}>
              {newMessagePreview.text}
            </Text>
          </View>
          <Icon
            color={COLORS.text.muted}
            name="chevron-down"
            size={18}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  newMessageButton: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: NEW_MESSAGE_BUTTON_HEIGHT,
    paddingHorizontal: SPACING.md,
    position: 'absolute',
    width: '76%',
    ...SHADOWS.raised,
  },
  newMessageSenderName: {
    color: COLORS.text.strong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  newMessageText: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  newMessageTextWrap: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  scrollToBottomButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: SPACING.lg,
    width: 44,
    ...SHADOWS.raised,
  },
});
