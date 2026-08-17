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
import type {TaxiChatSettlementMemberViewData} from '../model/taxiChatViewData';
import {TaxiChatBottomSheet} from './TaxiChatBottomSheet';

interface TaxiArriveSettlementSheetProps {
  initialAccountInfo?: Partial<AccountInfo> | null;
  loading?: boolean;
  members: TaxiChatSettlementMemberViewData[];
  onClose: () => void;
  onSubmit: (payload: {
    account: AccountInfo;
    settlementTargetMemberIds: string[];
    taxiFare: number;
  }) => void;
  visible: boolean;
}

export const TaxiArriveSettlementSheet = ({
  initialAccountInfo,
  loading = false,
  members,
  onClose,
  onSubmit,
  visible,
}: TaxiArriveSettlementSheetProps) => {
  const [accountHolder, setAccountHolder] = React.useState('');
  const [accountHolderInputKey, setAccountHolderInputKey] = React.useState(0);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [bankDropdownOpen, setBankDropdownOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState('');
  const [hideName, setHideName] = React.useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    [],
  );
  const [taxiFareInput, setTaxiFareInput] = React.useState('');
  const accountHolderInputRef = React.useRef<TextInput>(null);
  const accountNumberInputRef = React.useRef<TextInput>(null);
  const taxiFareInputRef = React.useRef<TextInput>(null);
  const {createFocusHandler, handleBlur, handleScroll, scrollRef} =
    useBottomSheetInputVisibility(visible);

  const leaderMember = React.useMemo(
    () => members.find(member => member.isLeader) ?? null,
    [members],
  );
  const selectableMembers = React.useMemo(
    () => members.filter(member => !member.isLeader),
    [members],
  );
  const selectableMemberIds = React.useMemo(
    () => selectableMembers.map(member => member.id),
    [selectableMembers],
  );

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setAccountHolder(initialAccountInfo?.accountHolder ?? '');
    setAccountHolderInputKey(current => current + 1);
    setAccountNumber(initialAccountInfo?.accountNumber ?? '');
    setBankName(initialAccountInfo?.bankName ?? '');
    setHideName(initialAccountInfo?.hideName ?? false);
    setTaxiFareInput('');
    setBankDropdownOpen(false);
    setSelectedMemberIds(selectableMemberIds);
  }, [initialAccountInfo, selectableMemberIds, visible]);

  const parsedTaxiFare = Number(taxiFareInput.replace(/,/g, '').trim());
  const canSubmit =
    bankName.trim().length > 0 &&
    accountHolder.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    Number.isFinite(parsedTaxiFare) &&
    parsedTaxiFare > 0 &&
    selectedMemberIds.length > 0;

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(current =>
      current.includes(memberId)
        ? current.filter(id => id !== memberId)
        : [...current, memberId],
    );
  };

  return (
    <TaxiChatBottomSheet
      onClose={onClose}
      onScroll={handleScroll}
      scrollRef={scrollRef}
      visible={visible}>
      <View style={styles.headerRow}>
        <View style={styles.titleIconWrap}>
          <Icon
            color={COLORS.status.success}
            name="location-outline"
            size={16}
          />
        </View>
        <Text style={styles.title}>{'택시 도착 & 정산'}</Text>
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
          placeholder="계좌번호 입력"
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

      <View style={styles.divider} />

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>총 택시비</Text>
        <View style={styles.fareInputWrap}>
          <TextInput
            keyboardType="number-pad"
            onBlur={handleBlur}
            onFocus={createFocusHandler(taxiFareInputRef)}
            placeholder="예: 4800"
            placeholderTextColor={COLORS.text.placeholder}
            ref={taxiFareInputRef}
            selectionColor={COLORS.brand.primary}
            style={styles.fareInput}
            value={taxiFareInput}
            onChangeText={setTaxiFareInput}
          />
          <Text style={styles.fareSuffix}>원</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.memberHeaderRow}>
          <Text style={styles.fieldLabel}>
            {`정산 대상 멤버 (${selectedMemberIds.length}명 선택)`}
          </Text>
          <Text style={styles.memberGuide}>리더는 자동 포함됩니다.</Text>
        </View>

        {leaderMember ? (
          <View style={[styles.memberRow, styles.memberRowLeader]}>
            <View style={styles.memberLeft}>
              <View
                style={[styles.memberCheckWrap, styles.memberCheckWrapLeader]}>
                <Icon color={COLORS.text.inverse} name="person" size={11} />
              </View>
              <View>
                <Text style={styles.memberLabel}>
                  {leaderMember.label}
                  {leaderMember.isCurrentUser ? ' (나)' : ''}
                </Text>
                <Text style={styles.memberMeta}>리더 자동 포함</Text>
              </View>
            </View>
            <Text style={styles.leaderPill}>자동 포함</Text>
          </View>
        ) : null}

        <View style={styles.memberList}>
          {selectableMembers.map(member => {
            const selected = selectedMemberIds.includes(member.id);

            return (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.84}
                key={member.id}
                onPress={() => {
                  toggleMember(member.id);
                }}
                style={[
                  styles.memberRow,
                  selected
                    ? styles.memberRowSelected
                    : styles.memberRowUnselected,
                ]}>
                <View style={styles.memberLeft}>
                  <View
                    style={[
                      styles.memberCheckWrap,
                      selected
                        ? styles.memberCheckWrapSelected
                        : styles.memberCheckWrapUnselected,
                    ]}>
                    {selected ? (
                      <Icon
                        color={COLORS.text.inverse}
                        name="checkmark"
                        size={12}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.memberLabel}>
                    {member.label}
                    {member.isCurrentUser ? ' (나)' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

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
            if (!canSubmit) {
              return;
            }

            onSubmit({
              account: {
                accountHolder: accountHolder.trim(),
                accountNumber: accountNumber.trim(),
                bankName: bankName.trim(),
                hideName,
              },
              settlementTargetMemberIds: selectedMemberIds,
              taxiFare: parsedTaxiFare,
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
            {loading ? '처리 중...' : '확인'}
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
  divider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginTop: SPACING.lg,
  },
  fareInput: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
    lineHeight: 16,
    padding: 0,
  },
  fareInputWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  fareSuffix: {
    color: COLORS.text.muted,
    fontSize: 14,
    lineHeight: 16,
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
  leaderPill: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  memberCheckWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  memberCheckWrapLeader: {
    backgroundColor: COLORS.text.secondary,
  },
  memberCheckWrapSelected: {
    backgroundColor: COLORS.brand.primary,
  },
  memberCheckWrapUnselected: {
    borderColor: COLORS.border.default,
    borderWidth: 1.5,
  },
  memberGuide: {
    color: COLORS.text.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  memberHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberLabel: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  memberLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  memberList: {
    gap: SPACING.sm,
  },
  memberMeta: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  memberRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  memberRowLeader: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.subtle,
    marginBottom: SPACING.sm,
  },
  memberRowSelected: {
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.border.accent,
  },
  memberRowUnselected: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
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
    backgroundColor: COLORS.brand.primaryTint,
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
