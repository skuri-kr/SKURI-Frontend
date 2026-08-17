import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

interface ChatComposerBarProps {
  editing?: ChatComposerEditingState;
  imageButtonAccessibilityLabel?: string;
  imageButtonDisabled?: boolean;
  keyboardVisible?: boolean;
  leadingAccessory?: React.ReactNode;
  onChangeText: (value: string) => void;
  onPressImage?: () => void;
  onSend: (value: string) => void;
  placeholder: string;
  sendAccessibilityLabel?: string;
  sendDisabled?: boolean;
  textInputProps?: TextInputProps;
  value: string;
}

export interface ChatComposerEditingState {
  onCancel: () => void;
}

export const CHAT_COMPOSER_ROW_BASE_HEIGHT = 49;
export const CHAT_COMPOSER_EDITING_BAR_HEIGHT = 36;

export const ChatComposerBar = ({
  editing,
  imageButtonAccessibilityLabel = '이미지 보내기',
  imageButtonDisabled = false,
  keyboardVisible = false,
  leadingAccessory,
  onChangeText,
  onPressImage,
  onSend,
  placeholder,
  sendAccessibilityLabel,
  sendDisabled = false,
  textInputProps,
  value,
}: ChatComposerBarProps) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = keyboardVisible ? 10 : Math.max(insets.bottom, 10);
  const sendEnabled = !sendDisabled && value.trim().length > 0;
  const resolvedSendAccessibilityLabel =
    sendAccessibilityLabel ?? (editing ? '메시지 수정 저장' : '메시지 전송');

  return (
    <View style={styles.container}>
      {editing ? (
        <View style={styles.editingBar}>
          <Text style={styles.editingLabel}>메시지 수정 중</Text>
          <TouchableOpacity
            accessibilityLabel="메시지 수정 취소"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={editing.onCancel}
            style={styles.editingCancelButton}>
            <Text style={styles.editingCancelLabel}>취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View
        style={[
          styles.row,
          {
            paddingBottom: bottomPadding,
          },
        ]}>
        {leadingAccessory}

        {onPressImage ? (
          <TouchableOpacity
            accessibilityLabel={imageButtonAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={imageButtonDisabled ? 1 : 0.82}
            disabled={imageButtonDisabled}
            onPress={onPressImage}
            style={styles.imageButton}>
            <Icon color={COLORS.text.muted} name="image-outline" size={18} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.inputSurface}>
          <TextInput
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.text.muted}
            style={styles.input}
            value={value}
            {...textInputProps}
          />
        </View>

        <TouchableOpacity
          accessibilityLabel={resolvedSendAccessibilityLabel}
          accessibilityRole="button"
          activeOpacity={sendEnabled ? 0.82 : 1}
          disabled={!sendEnabled}
          onPress={() => {
            const trimmed = value.trim();

            if (!trimmed) {
              return;
            }

            onSend(trimmed);
          }}
          style={[
            styles.sendButton,
            sendEnabled ? styles.sendButtonEnabled : styles.sendButtonDisabled,
          ]}>
          <Icon
            color={sendEnabled ? COLORS.text.inverse : COLORS.text.muted}
            name={editing ? 'checkmark' : 'paper-plane-outline'}
            size={18}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
  },
  editingBar: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: CHAT_COMPOSER_EDITING_BAR_HEIGHT,
    paddingHorizontal: SPACING.lg,
  },
  editingCancelButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  editingCancelLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  editingLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  imageButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  input: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    padding: 0,
  },
  inputSurface: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.lg,
    flex: 1,
    height: 39,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 60,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    zIndex: 2,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border.default,
  },
  sendButtonEnabled: {
    backgroundColor: COLORS.brand.primary,
  },
});
