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

import {
  COLORS,
  RADIUS,
  SPACING,
} from '../tokens';

interface DetailComposerProps {
  anonymousAccessibilityLabel?: string;
  anonymousChecked?: boolean;
  anonymousDisabled?: boolean;
  anonymousLabel?: string;
  editable?: boolean;
  leadingActionAccessibilityLabel?: string;
  leadingIconName?: string;
  onChangeText?: (value: string) => void;
  onPressLeadingAction?: () => void;
  onSend?: (value: string) => void;
  onToggleAnonymous?: () => void;
  placeholder: string;
  sendAccessibilityLabel?: string;
  sendEnabled?: boolean;
  textInputProps?: TextInputProps;
  value?: string;
}

export const DetailComposer = React.forwardRef<TextInput, DetailComposerProps>(
  (
    {
      anonymousAccessibilityLabel = '익명 댓글 설정',
      anonymousChecked,
      anonymousDisabled = false,
      anonymousLabel = '익명',
      editable = true,
      leadingActionAccessibilityLabel = '첨부',
      leadingIconName,
      onChangeText,
      onPressLeadingAction,
      onSend,
      onToggleAnonymous,
      placeholder,
      sendAccessibilityLabel = '전송',
      sendEnabled,
      textInputProps,
      value,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const [internalValue, setInternalValue] = React.useState('');
    const resolvedValue = value ?? internalValue;
    const isSendEnabled =
      sendEnabled ?? (editable && resolvedValue.trim().length > 0);
    const showAnonymousToggle =
      typeof anonymousChecked === 'boolean' && typeof onToggleAnonymous === 'function';

    const handleChangeText = React.useCallback(
      (nextValue: string) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }

        onChangeText?.(nextValue);
      },
      [onChangeText, value],
    );

    const handleSend = React.useCallback(() => {
      const trimmedValue = resolvedValue.trim();

      if (!trimmedValue || !isSendEnabled) {
        return;
      }

      onSend?.(trimmedValue);

      if (value === undefined) {
        setInternalValue('');
      }
    }, [isSendEnabled, onSend, resolvedValue, value]);

    return (
      <View style={[styles.container, {paddingBottom: insets.bottom}]}>
        <View style={styles.row}>
          {leadingIconName && onPressLeadingAction ? (
            <TouchableOpacity
              accessibilityLabel={leadingActionAccessibilityLabel}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onPressLeadingAction}
              style={styles.leadingButton}>
              <Icon
                color={COLORS.text.muted}
                name={leadingIconName}
                size={18}
              />
            </TouchableOpacity>
          ) : null}

          {showAnonymousToggle ? (
            <TouchableOpacity
              accessibilityLabel={anonymousAccessibilityLabel}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: anonymousChecked,
                disabled: anonymousDisabled,
              }}
              activeOpacity={anonymousDisabled ? 1 : 0.82}
              disabled={anonymousDisabled}
              onPress={onToggleAnonymous}
              style={[
                styles.anonymousButton,
                anonymousDisabled ? styles.anonymousButtonDisabled : null,
              ]}>
              <View
                style={[
                  styles.checkbox,
                  anonymousChecked ? styles.checkboxChecked : null,
                  anonymousDisabled ? styles.checkboxDisabled : null,
                ]}>
                {anonymousChecked ? (
                  <Icon color={COLORS.text.inverse} name="checkmark" size={12} />
                ) : null}
              </View>
              <View style={styles.anonymousLabelWrap}>
                <Icon
                  color={
                    anonymousDisabled ? COLORS.text.muted : COLORS.text.secondary
                  }
                  name="person-circle-outline"
                  size={14}
                />
                <Text
                  style={[
                    styles.anonymousLabel,
                    anonymousDisabled ? styles.anonymousLabelDisabled : null,
                  ]}>
                  {anonymousLabel}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.inputSurface}>
            <TextInput
              ref={ref}
              editable={editable}
              onChangeText={handleChangeText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.text.muted}
              style={styles.input}
              textAlignVertical="center"
              value={resolvedValue}
              {...textInputProps}
            />
          </View>

          <TouchableOpacity
            accessibilityLabel={sendAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={isSendEnabled ? 0.82 : 1}
            disabled={!isSendEnabled}
            onPress={handleSend}
            style={[
              styles.sendButton,
              isSendEnabled ? styles.sendButtonActive : null,
            ]}>
            <Icon
              color={isSendEnabled ? COLORS.text.inverse : COLORS.text.muted}
              name="paper-plane-outline"
              size={18}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

DetailComposer.displayName = 'DetailComposer';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.surface,
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 13,
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  leadingButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  anonymousButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 40,
    paddingHorizontal: SPACING.md,
  },
  anonymousButtonDisabled: {
    opacity: 0.7,
  },
  anonymousLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  anonymousLabel: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
    padding: 0,
  },
  anonymousLabelDisabled: {
    color: COLORS.text.muted,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: 6,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  checkboxChecked: {
    backgroundColor: COLORS.brand.primary,
    borderColor: COLORS.brand.primary,
  },
  checkboxDisabled: {
    borderColor: COLORS.border.default,
  },
  inputSurface: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.lg,
    flex: 1,
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  input: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
    lineHeight: 18,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: COLORS.border.default,
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sendButtonActive: {
    backgroundColor: COLORS.brand.primary,
  },
});
