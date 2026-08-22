import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';

import type {TimetableShareScope} from '../model/timetableDomain';
import {TimetableBottomSheet} from './TimetableBottomSheet';

interface ScopeOption {
  description: string;
  iconName: string;
  id?: TimetableShareScope;
  title: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    description: '시간표가 있는지와 수업 정보 모두 숨겨요.',
    iconName: 'lock-closed-outline',
    id: 'PRIVATE',
    title: '비공개',
  },
  {
    description: '수업 중인 요일과 교시만 보여요.',
    iconName: 'time-outline',
    id: 'BUSY_ONLY',
    title: '바쁜 시간만',
  },
  {
    description: '과목명, 강의실 등 시간표 상세를 보여요.',
    iconName: 'calendar-outline',
    id: 'DETAILS',
    title: '상세 시간표',
  },
];

const DEFAULT_OPTION: ScopeOption = {
  description: '기본 공개 범위를 그대로 적용해요.',
  iconName: 'return-up-back-outline',
  title: '기본값 사용',
};

interface TimetableSharingScopeSheetProps {
  allowDefault?: boolean;
  currentScope?: TimetableShareScope;
  onClose: () => void;
  onSelect: (scope?: TimetableShareScope) => void;
  visible: boolean;
}

export const TimetableSharingScopeSheet = ({
  allowDefault = false,
  currentScope,
  onClose,
  onSelect,
  visible,
}: TimetableSharingScopeSheetProps) => {
  const options = allowDefault ? [DEFAULT_OPTION, ...SCOPE_OPTIONS] : SCOPE_OPTIONS;

  return (
    <TimetableBottomSheet
      onClose={onClose}
      snapPoints={allowDefault ? ['62%'] : ['54%']}
      visible={visible}>
      <Text style={styles.title}>공개 범위 선택</Text>
      <Text style={styles.description}>
        공개 범위는 친구에게 보이는 내 시간표에만 적용돼요.
      </Text>
      <View style={styles.optionList}>
        {options.map(option => {
          const isDefault = option.id === undefined;
          const selected = isDefault
            ? currentScope === undefined
            : option.id === currentScope;
          return (
            <TouchableOpacity
              accessibilityLabel={option.title}
              accessibilityRole="button"
              accessibilityState={{selected}}
              activeOpacity={0.82}
              key={option.title}
              onPress={() => onSelect(option.id)}
              style={[
                styles.option,
                selected ? styles.optionSelected : undefined,
              ]}>
              <View style={styles.iconWrap}>
                <Icon color={COLORS.brand.primaryStrong} name={option.iconName} size={19} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {selected ? (
                <Icon color={COLORS.brand.primaryStrong} name="checkmark-circle" size={20} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </TimetableBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {color: COLORS.text.primary, fontSize: 18, fontWeight: '800', lineHeight: 26, marginTop: SPACING.sm},
  description: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.xs},
  optionList: {gap: SPACING.sm, marginTop: SPACING.lg},
  option: {alignItems: 'center', borderColor: COLORS.border.subtle, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', minHeight: 68, padding: SPACING.md},
  optionSelected: {backgroundColor: COLORS.brand.primaryTint, borderColor: COLORS.brand.primary},
  iconWrap: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 36, justifyContent: 'center', marginRight: SPACING.sm, width: 36},
  optionText: {flex: 1, marginRight: SPACING.sm},
  optionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20},
  optionDescription: {color: COLORS.text.muted, fontSize: 11, lineHeight: 16, marginTop: 1},
});
