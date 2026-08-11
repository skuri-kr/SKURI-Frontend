import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import type {ReportCategory} from '@/features/report';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

export interface ReportReasonModalProps {
  categories: ReportCategory[];
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onSelectCategory: (value: ReportCategory) => void;
  onSubmit: () => void;
  reason: string;
  selectedCategory: ReportCategory | null;
  submitting?: boolean;
  title: string;
  visible: boolean;
}

const REPORT_REASON_MAX_LENGTH = 2000;

export const ReportReasonModal = ({
  categories,
  onChangeReason,
  onClose,
  onSelectCategory,
  onSubmit,
  reason,
  selectedCategory,
  submitting = false,
  title,
  visible,
}: ReportReasonModalProps) => {
  const isSubmitEnabled = Boolean(selectedCategory && reason.trim()) && !submitting;

  return (
    <Modal
      animationType="fade"
      onRequestClose={submitting ? undefined : onClose}
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          disabled={submitting}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}>
          <TouchableWithoutFeedback
            accessible={false}
            onPress={Keyboard.dismiss}>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>
                신고 유형을 선택하고 사유를 남겨주세요. 접수된 신고는 운영팀이 검토합니다.
              </Text>

              <Text style={styles.sectionTitle}>신고 유형</Text>
              <View style={styles.categoryWrap}>
                {categories.map(category => {
                  const isSelected = selectedCategory === category;

                  return (
                    <TouchableOpacity
                      key={category}
                      accessibilityRole="button"
                      activeOpacity={0.86}
                      disabled={submitting}
                      onPress={() => onSelectCategory(category)}
                      style={[
                        styles.categoryChip,
                        isSelected ? styles.categoryChipSelected : null,
                      ]}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected ? styles.categoryLabelSelected : null,
                        ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.reasonHeader}>
                <Text style={styles.sectionTitle}>신고 사유</Text>
                <Text style={styles.counterLabel}>
                  {reason.length}/{REPORT_REASON_MAX_LENGTH}
                </Text>
              </View>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <TextInput
                  editable={!submitting}
                  maxLength={REPORT_REASON_MAX_LENGTH}
                  multiline
                  onChangeText={onChangeReason}
                  placeholder="신고 사유를 자세히 입력해주세요."
                  placeholderTextColor={COLORS.text.placeholder}
                  style={styles.reasonInput}
                  textAlignVertical="top"
                  value={reason}
                />
              </ScrollView>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={submitting ? 1 : 0.84}
                  disabled={submitting}
                  onPress={onClose}
                  style={[styles.button, styles.cancelButton]}>
                  <Text style={styles.cancelLabel}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={isSubmitEnabled ? 0.84 : 1}
                  disabled={!isSubmitEnabled}
                  onPress={onSubmit}
                  style={[
                    styles.button,
                    isSubmitEnabled
                      ? styles.submitButton
                      : styles.submitButtonDisabled,
                  ]}>
                  <Text
                    style={[
                      styles.submitLabel,
                      isSubmitEnabled ? null : styles.submitLabelDisabled,
                    ]}>
                    {submitting ? '신고 접수 중...' : '신고하기'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  keyboardWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  dialog: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.xl,
    maxHeight: '82%',
    maxWidth: 440,
    minHeight: 420,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    ...SHADOWS.raised,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  description: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.accent.orangeSoft,
  },
  categoryLabel: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  categoryLabelSelected: {
    color: COLORS.accent.orange,
  },
  reasonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  counterLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: SPACING.lg,
  },
  reasonInput: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    height: 180,
    lineHeight: 21,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  button: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: COLORS.background.subtle,
  },
  cancelLabel: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.accent.orange,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border.default,
  },
  submitLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  submitLabelDisabled: {
    color: COLORS.text.tertiary,
  },
});
