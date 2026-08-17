import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {ToggleSwitch} from '@/shared/design-system/components';
import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';
import type {UserAccountInfo as AccountInfo} from '@/shared/types/user';
import {AccountBankDropdown} from '@/features/user/components/AccountBankDropdown';

import {useBottomSheetInputVisibility} from '../hooks/useBottomSheetInputVisibility';
import {TAXI_ACCOUNT_BANK_NAMES} from '../model/accountBank';
import {TaxiChatBottomSheet} from './TaxiChatBottomSheet';

interface TaxiAccountSheetProps {
  initialAccountInfo?: Partial<AccountInfo> | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    accountHolder: string;
    accountNumber: string;
    bankName: string;
    hideName: boolean;
    remember: boolean;
  }) => void;
  visible: boolean;
}

export const TaxiAccountSheet = ({
  initialAccountInfo,
  loading = false,
  onClose,
  onSubmit,
  visible,
}: TaxiAccountSheetProps) => {
  const [accountHolder, setAccountHolder] = React.useState('');
  const [accountHolderInputKey, setAccountHolderInputKey] = React.useState(0);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [bankDropdownOpen, setBankDropdownOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState('');
  const [hideName, setHideName] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const accountHolderInputRef = React.useRef<TextInput>(null);
  const accountNumberInputRef = React.useRef<TextInput>(null);
  const {createFocusHandler, handleBlur, handleScroll, scrollRef} =
    useBottomSheetInputVisibility(visible);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setAccountHolder(initialAccountInfo?.accountHolder ?? '');
    setAccountHolderInputKey(current => current + 1);
    setAccountNumber(initialAccountInfo?.accountNumber ?? '');
    setBankName(initialAccountInfo?.bankName ?? '');
    setHideName(initialAccountInfo?.hideName ?? false);
    setRemember(false);
    setBankDropdownOpen(false);
  }, [initialAccountInfo, visible]);

  const canSubmit =
    bankName.trim().length > 0 &&
    accountHolder.trim().length > 0 &&
    accountNumber.trim().length > 0;

  return (
    <TaxiChatBottomSheet
      onClose={onClose}
      onScroll={handleScroll}
      scrollRef={scrollRef}
      visible={visible}>
      <View style={styles.headerRow}>
        <View style={styles.titleIconWrap}>
          <Icon color={COLORS.accent.blue} name="card-outline" size={16} />
        </View>
        <Text style={styles.title}>계좌 전송</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>이름</Text>
        <TextInput
          autoCorrect={false}
          defaultValue={accountHolder}
          key={accountHolderInputKey}
          onBlur={handleBlur}
          onFocus={createFocusHandler(accountHolderInputRef)}
          placeholder="이름 입력"
          placeholderTextColor={COLORS.text.placeholder}
          ref={accountHolderInputRef}
          selectionColor={COLORS.brand.primary}
          spellCheck={false}
          style={styles.input}
          onChangeText={setAccountHolder}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>은행명</Text>
        <AccountBankDropdown
          bankNames={TAXI_ACCOUNT_BANK_NAMES}
          isOpen={bankDropdownOpen}
          selectedBankName={bankName}
          onPressSelect={nextBankName => {
            setBankName(nextBankName);
            setBankDropdownOpen(false);
          }}
          onRequestClose={() => {
            setBankDropdownOpen(false);
          }}
          onPressTrigger={() => {
            setBankDropdownOpen(current => !current);
          }}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>계좌번호</Text>
        <TextInput
          keyboardType="number-pad"
          onBlur={handleBlur}
          onFocus={createFocusHandler(accountNumberInputRef)}
          placeholder="계좌번호 입력 (숫자만)"
          placeholderTextColor={COLORS.text.placeholder}
          ref={accountNumberInputRef}
          selectionColor={COLORS.brand.primary}
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopyWrap}>
          <Text style={styles.toggleTitle}>이름 가리기</Text>
          <Text style={styles.toggleDescription}>예) 홍길동 → 홍**</Text>
        </View>
        <ToggleSwitch value={hideName} onValueChange={setHideName} />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={() => {
          setRemember(current => !current);
        }}
        style={styles.checkboxRow}>
        <View
          style={[styles.checkbox, remember ? styles.checkboxSelected : null]}>
          {remember ? (
            <Icon color={COLORS.text.inverse} name="checkmark" size={12} />
          ) : null}
        </View>
        <View style={styles.checkboxCopyWrap}>
          <Text style={styles.checkboxTitle}>계좌 정보 저장하기</Text>
          <Text style={styles.checkboxDescription}>
            다음에 빠르게 입력할 수 있어요
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={onClose}
          style={[styles.button, styles.cancelButton]}>
          <Text style={styles.cancelButtonLabel}>취소</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={canSubmit && !loading ? 0.84 : 1}
          disabled={!canSubmit || loading}
          onPress={() => {
            onSubmit({
              accountHolder: accountHolder.trim(),
              accountNumber: accountNumber.trim(),
              bankName: bankName.trim(),
              hideName,
              remember,
            });
          }}
          style={[
            styles.button,
            canSubmit && !loading
              ? styles.submitButton
              : styles.submitButtonDisabled,
          ]}>
          <Text
            style={[
              styles.submitButtonLabel,
              (!canSubmit || loading) && styles.submitButtonLabelDisabled,
            ]}>
            {loading ? '전송 중...' : '전송'}
          </Text>
        </TouchableOpacity>
      </View>
    </TaxiChatBottomSheet>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  cancelButton: {
    backgroundColor: COLORS.background.subtle,
  },
  cancelButtonLabel: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: COLORS.text.placeholder,
    borderRadius: 6,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginTop: 2,
    width: 20,
  },
  checkboxCopyWrap: {
    flex: 1,
    gap: 2,
  },
  checkboxDescription: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  checkboxRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  checkboxSelected: {
    backgroundColor: COLORS.brand.primary,
    borderColor: COLORS.brand.primary,
  },
  checkboxTitle: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  fieldLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 6,
  },
  formSection: {
    marginTop: SPACING.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  submitButton: {
    backgroundColor: COLORS.brand.primary,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.background.subtle,
  },
  submitButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  submitButtonLabelDisabled: {
    color: COLORS.text.placeholder,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  titleIconWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.blueSoft,
    borderRadius: RADIUS.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  toggleCopyWrap: {
    flex: 1,
    gap: 2,
  },
  toggleDescription: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  toggleTitle: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
