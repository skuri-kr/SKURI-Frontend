import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  DefaultProfileAvatar,
  ProfileScreenSkeleton,
  SelectionDropdown,
  SkeletonImage,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';
import {pickImageAsset} from '@/shared/lib/media/pickImageAsset';

import {useProfileEditScreenData} from '../hooks/useProfileEditScreenData';
import type {ProfilePhotoUploadInput} from '../model/profileEditSource';

const PROFILE_EDIT_SCREEN_TITLE = '프로필 수정';
const PROFILE_EDIT_SAVE_LABEL = '저장하기';

export const ProfileEditScreen = () => {
  useScreenView();

  const navigation =
    useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {data, error, loading, reload, saveChanges, saving} =
    useProfileEditScreenData();

  const [displayName, setDisplayName] = React.useState('');
  const [studentId, setStudentId] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [pendingPhoto, setPendingPhoto] =
    React.useState<ProfilePhotoUploadInput | null>(null);
  const [isPhotoMarkedForRemoval, setPhotoMarkedForRemoval] =
    React.useState(false);
  const allowExitRef = React.useRef(false);

  React.useEffect(() => {
    if (!data) {
      return;
    }

    setDisplayName(data.displayName);
    setStudentId(data.studentId);
    setDepartment(data.department);
    setPendingPhoto(null);
    setPhotoMarkedForRemoval(false);
  }, [data]);

  const avatarUri = pendingPhoto?.uri ?? (isPhotoMarkedForRemoval ? null : data?.photoUrl ?? null);
  const hasPhoto =
    Boolean(pendingPhoto) || Boolean(data?.photoUrl && !isPhotoMarkedForRemoval);
  const hasTextChanges =
    !!data &&
    (displayName.trim() !== data.displayName.trim() ||
      studentId.trim() !== data.studentId.trim() ||
      department.trim() !== data.department.trim());
  const hasPhotoChanges =
    Boolean(pendingPhoto) || Boolean(data?.photoUrl && isPhotoMarkedForRemoval);
  const hasUnsavedChanges = hasTextChanges || hasPhotoChanges;

  const closeDropdown = React.useCallback(() => {
    setDropdownOpen(false);
  }, []);

  const proceedBack = React.useCallback(
    (action?: Parameters<typeof navigation.dispatch>[0]) => {
      allowExitRef.current = true;

      if (action) {
        navigation.dispatch(action);
        return;
      }

      navigation.goBack();
    },
    [navigation],
  );

  const showDiscardChangesAlert = React.useCallback(
    (onConfirm: () => void) => {
      Alert.alert(
        '변경 사항이 저장되지 않았습니다',
        '저장하지 않고 나가면 변경된 내용이 사라집니다.',
        [
          {text: '계속 수정', style: 'cancel'},
          {
            text: '나가기',
            style: 'destructive',
            onPress: onConfirm,
          },
        ],
      );
    },
    [],
  );

  const handleRequestBack = React.useCallback(() => {
    if (saving) {
      return;
    }

    if (!hasUnsavedChanges) {
      proceedBack();
      return;
    }

    showDiscardChangesAlert(() => {
      proceedBack();
    });
  }, [hasUnsavedChanges, proceedBack, saving, showDiscardChangesAlert]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowExitRef.current) {
        return;
      }

      if (saving) {
        event.preventDefault();
        return;
      }

      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      showDiscardChangesAlert(() => {
        proceedBack(event.data.action);
      });
    });

    return unsubscribe;
  }, [
    hasUnsavedChanges,
    navigation,
    proceedBack,
    saving,
    showDiscardChangesAlert,
  ]);

  const handlePressPhoto = React.useCallback(async () => {
    try {
      const image = await pickImageAsset();

      if (!image) {
        return;
      }

      setPendingPhoto({
        fileName: image.fileName,
        mimeType: image.mimeType,
        uri: image.uri,
      });
      setPhotoMarkedForRemoval(false);
    } catch (caughtError) {
      console.error('프로필 사진 업로드 실패', caughtError);
      const message =
        caughtError instanceof Error && caughtError.message.trim()
          ? caughtError.message
          : '프로필 사진을 변경하지 못했습니다.';
      Alert.alert('오류', message);
    }
  }, []);

  const handleRemovePhoto = React.useCallback(() => {
    if (!hasPhoto) {
      return;
    }

    setPendingPhoto(null);
    setPhotoMarkedForRemoval(Boolean(data?.photoUrl));
  }, [data?.photoUrl, hasPhoto]);

  const handleSave = React.useCallback(async () => {
    if (!data) {
      return;
    }

    const trimmedDisplayName = displayName.trim();
    const trimmedStudentId = studentId.trim();
    const trimmedDepartment = department.trim();

    if (!trimmedDisplayName) {
      Alert.alert('입력 필요', '닉네임을 입력해주세요.');
      return;
    }

    if (trimmedDisplayName.length > 7) {
      Alert.alert('입력 확인', '닉네임은 최대 7글자까지 가능합니다.');
      return;
    }

    if (!/^20\d{6}$/.test(trimmedStudentId)) {
      Alert.alert('입력 확인', '학번은 20으로 시작하는 8자리 숫자여야 합니다.');
      return;
    }

    if (!trimmedDepartment) {
      Alert.alert('입력 필요', '학과를 선택해주세요.');
      return;
    }

    try {
      await saveChanges({
        department: trimmedDepartment,
        displayName: trimmedDisplayName,
        photoChange: pendingPhoto
          ? {
              image: pendingPhoto,
              type: 'upload',
            }
          : data.photoUrl && isPhotoMarkedForRemoval
            ? {
                type: 'remove',
              }
            : undefined,
        studentId: trimmedStudentId,
      });

      Alert.alert('저장 완료', '프로필이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            proceedBack();
          },
        },
      ]);
    } catch (caughtError) {
      console.error('프로필 저장 실패', caughtError);
      const message =
        caughtError instanceof Error && caughtError.message.trim()
          ? caughtError.message
          : '프로필을 저장하지 못했습니다.';
      Alert.alert('오류', message);
    }
  }, [
    data,
    department,
    displayName,
    isPhotoMarkedForRemoval,
    pendingPhoto,
    proceedBack,
    saveChanges,
    studentId,
  ]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={handleRequestBack}
        title={PROFILE_EDIT_SCREEN_TITLE}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loading && !data ? (
          <ProfileScreenSkeleton />
        ) : null}

        {error && !data ? (
          <StateCard
            actionLabel="다시 시도"
            description={error}
            icon={
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={28}
              />
            }
            onPressAction={() => {
              reload().catch(() => undefined);
            }}
            title="프로필 수정 정보를 불러오지 못했습니다"
          />
        ) : null}

        {data ? (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatarFrame}>
                {avatarUri ? (
                  <SkeletonImage
                    source={{uri: avatarUri}}
                    style={styles.avatarCircle}
                  />
                ) : (
                  <View style={styles.avatarCircle}>
                    <DefaultProfileAvatar
                      backgroundColor={COLORS.background.subtle}
                      iconSize={42}
                      size={96}
                      style={styles.avatarFallback}
                    />
                  </View>
                )}

                {hasPhoto ? (
                  <TouchableOpacity
                    accessibilityLabel="프로필 사진 제거"
                    accessibilityRole="button"
                    activeOpacity={0.86}
                    disabled={saving}
                    onPress={handleRemovePhoto}
                    style={styles.removePhotoFloatingButton}>
                    <Icon
                      color={COLORS.status.danger}
                      name="close"
                      size={14}
                    />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.86}
                  disabled={saving}
                  onPress={() => {
                    handlePressPhoto().catch(() => undefined);
                  }}
                  style={styles.cameraButton}>
                  <Icon
                    color={COLORS.text.inverse}
                    name="camera-outline"
                    size={14}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>닉네임</Text>
                <TextInput
                  maxLength={7}
                  onChangeText={setDisplayName}
                  onFocus={closeDropdown}
                  placeholder="닉네임 입력"
                  placeholderTextColor={COLORS.text.muted}
                  style={styles.input}
                  value={displayName}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>학번</Text>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={value => {
                    setStudentId(value.replace(/[^0-9]/g, ''));
                  }}
                  onFocus={closeDropdown}
                  placeholder="예: 20210001"
                  placeholderTextColor={COLORS.text.muted}
                  style={styles.input}
                  value={studentId}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>학과</Text>
                <SelectionDropdown
                  isOpen={isDropdownOpen}
                  maxHeight={208}
                  onPressSelect={value => {
                    setDepartment(value);
                    setDropdownOpen(false);
                  }}
                  onRequestClose={closeDropdown}
                  onPressTrigger={() => {
                    Keyboard.dismiss();
                    setDropdownOpen(current => !current);
                  }}
                  options={data.departmentOptions}
                  selectedValue={department}
                />
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              disabled={saving}
              onPress={handleSave}
              style={styles.saveButton}>
              {saving ? (
                <ActivityIndicator
                  color={COLORS.text.inverse}
                  size="small"
                  style={styles.saveSpinner}
                />
              ) : null}
              <Text style={styles.saveLabel}>
                {saving ? '저장 중...' : PROFILE_EDIT_SAVE_LABEL}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 32,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarFrame: {
    position: 'relative',
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: 9999,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  avatarFallback: {
    flexShrink: 0,
  },
  removePhotoFloatingButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: 9999,
    height: 28,
    justifyContent: 'center',
    left: -4,
    position: 'absolute',
    top: -4,
    width: 28,
    ...SHADOWS.card,
  },
  cameraButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: 9999,
    bottom: 0,
    height: 32,
    justifyContent: 'center',
    right: 0,
    position: 'absolute',
    width: 32,
  },
  formSection: {
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    height: 50,
    lineHeight: 18,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    marginTop: 32,
  },
  saveSpinner: {
    marginRight: 8,
  },
  saveLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
