import React from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type {RootStackParamList} from '@/app/navigation/types';
import {SelectionDropdown} from '@/shared/design-system/components';
import {
  COLORS,
  MOTION,
  RADIUS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useDepartments, useScreenView} from '@/shared/hooks';

import {AuthActionButton} from '../components/AuthActionButton';
import {
  AUTH_BRAND_ACCENT_COLOR,
  AUTH_BRAND_GRADIENT,
} from '../constants/authPalette';
import {useCompleteProfile} from '../hooks/useCompleteProfile';

const NICKNAME_MAX_LENGTH = 7;

const ProfileCheckRow = ({
  checked,
  label,
  linkLabel,
  onPress,
  onPressLink,
}: {
  checked: boolean;
  label: string;
  linkLabel?: string;
  onPress: () => void;
  onPressLink?: () => void;
}) => {
  const progress = useSharedValue(checked ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, MOTION.spring.controlPop);
  }, [checked, progress]);

  const animatedCheckBoxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.background.surface, AUTH_BRAND_ACCENT_COLOR],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.border.default, AUTH_BRAND_ACCENT_COLOR],
    ),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 1.04]),
      },
    ],
  }));

  const animatedCheckIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.5, 1]),
      },
    ],
  }));

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{checked}}
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.checkRow}>
      <Animated.View style={[styles.checkBox, animatedCheckBoxStyle]}>
        <Animated.View style={animatedCheckIconStyle}>
          <Icon color={COLORS.text.inverse} name="checkmark" size={14} />
        </Animated.View>
      </Animated.View>

      <Text style={styles.checkLabel}>{label}</Text>

      {linkLabel && onPressLink ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={onPressLink}>
          <Text style={styles.checkLinkLabel}>{linkLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

export const CompleteProfileScreen = () => {
  useScreenView();

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {loading, submitProfile} = useCompleteProfile();
  const {
    departments,
    error: departmentError,
    loading: departmentsLoading,
    reload: reloadDepartments,
  } = useDepartments();
  const [displayName, setDisplayName] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [studentId, setStudentId] = React.useState('');
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);

  const isReady =
    displayName.trim().length > 0 &&
    displayName.trim().length <= NICKNAME_MAX_LENGTH &&
    department.trim().length > 0 &&
    studentId.trim().length > 0 &&
    ageConfirmed &&
    termsAccepted;

  const closeDropdown = React.useCallback(() => {
    setDropdownOpen(false);
  }, []);

  const handleSave = React.useCallback(async () => {
    try {
      await submitProfile({
        ageConfirmed,
        department,
        displayName,
        studentId,
        termsAccepted,
      });
    } catch (error: any) {
      Alert.alert(
        '오류',
        error?.message || '프로필 저장에 실패했습니다. 다시 시도해주세요.',
      );
    }
  }, [
    ageConfirmed,
    department,
    displayName,
    studentId,
    submitProfile,
    termsAccepted,
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>

      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => {
          Keyboard.dismiss();
          closeDropdown();
        }}>
        <View style={styles.screen}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {paddingBottom: 148 + insets.bottom},
            ]}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              closeDropdown();
            }}
            showsVerticalScrollIndicator={false}>
            <View style={styles.heroBadge}>
              <LinearGradient
                colors={AUTH_BRAND_GRADIENT}
                end={{x: 1, y: 1}}
                start={{x: 0, y: 0}}
                style={styles.heroBadgeInner}>
                <Icon color={COLORS.text.inverse} name="person" size={30} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>프로필을 설정해요</Text>
            <Text style={styles.subtitle}>
              성결대 학생임을 확인하고 서비스를 이용할 수 있어요
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                닉네임 <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  maxLength={NICKNAME_MAX_LENGTH}
                  onChangeText={setDisplayName}
                  onFocus={closeDropdown}
                  placeholder="사용할 닉네임을 입력해요"
                  placeholderTextColor={COLORS.text.muted}
                  style={styles.input}
                  value={displayName}
                />
                <Text style={styles.countLabel}>
                  {displayName.length}/{NICKNAME_MAX_LENGTH}
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                학과 <Text style={styles.requiredMark}>*</Text>
              </Text>
              <SelectionDropdown
                isOpen={isDropdownOpen}
                onPressSelect={value => {
                  setDepartment(value);
                  setDropdownOpen(false);
                }}
                onRequestClose={closeDropdown}
                onPressTrigger={() => {
                  Keyboard.dismiss();
                  setDropdownOpen(current => !current);
                }}
                options={departments}
                placeholder={departmentsLoading ? '학과를 불러오는 중...' : '학과를 선택해요'}
                selectedValue={department}
                style={styles.dropdown}
              />
              {departmentError ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => {
                    reloadDepartments().catch(() => undefined);
                  }}>
                  <Text style={styles.departmentError}>{departmentError} 다시 시도</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                학번 <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={value => {
                  setStudentId(value.replace(/[^0-9]/g, ''));
                }}
                onFocus={closeDropdown}
                placeholder="학번을 입력해요 (예: 20241234)"
                placeholderTextColor={COLORS.text.muted}
                style={styles.input}
                value={studentId}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.checkSection}>
              <ProfileCheckRow
                checked={ageConfirmed}
                label="성결대 학생이고 19세 이상이에요"
                onPress={() => setAgeConfirmed(value => !value)}
              />
              <ProfileCheckRow
                checked={termsAccepted}
                label="이용약관(EULA 포함)에 동의해요"
                linkLabel="약관 보기"
                onPress={() => setTermsAccepted(value => !value)}
                onPressLink={() => navigation.navigate('TermsOfUseForAuth' as keyof RootStackParamList)}
              />
            </View>
          </ScrollView>

          <View
            style={styles.footer}>
            <AuthActionButton
              colors={AUTH_BRAND_GRADIENT}
              disabled={!isReady}
              label={loading ? '저장 중...' : '프로필 설정 완료'}
              loading={loading}
              onPress={handleSave}
            />

            {!isReady ? (
              <Text style={styles.footerHelper}>
                모든 항목을 입력하고 약관에 동의해주세요
              </Text>
            ) : (
              <View style={styles.footerHelperSpace}/>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.surface,
    flex: 1,
  },
  screen: {
    backgroundColor: COLORS.background.surface,
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: 24,
  },
  heroBadge: {
    marginBottom: 16,
  },
  heroBadgeInner: {
    alignItems: 'center',
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    width: 64,
    shadowColor: AUTH_BRAND_ACCENT_COLOR,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.text.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: COLORS.text.strong,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  requiredMark: {
    color: COLORS.brand.primary,
  },
  inputWrap: {
    justifyContent: 'center',
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    height: 50,
    lineHeight: 18,
    paddingHorizontal: 17,
    paddingRight: 64,
  },
  countLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    position: 'absolute',
    right: 16,
  },
  dropdown: {
    zIndex: 10,
  },
  departmentError: {
    color: COLORS.status.danger,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  divider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginBottom: 24,
    marginTop: 12,
  },
  checkSection: {
    gap: 16,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  checkBox: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: 8,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkLabel: {
    color: COLORS.text.strong,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  checkLinkLabel: {
    color: COLORS.brand.primary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textDecorationLine: 'underline',
  },
  footer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: SPACING.xxl,
    paddingTop: 21,
    position: 'absolute',
    right: 0,
  },
  footerHelper: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
    height: 16,
  },
  footerHelperSpace: {
    height: 16,
    marginTop: 8,
  },
});
