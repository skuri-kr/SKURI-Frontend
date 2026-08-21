import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  SettingsRow,
  SettingsSection,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendAvatar} from '../components/FriendAvatar';
import {useFriendSettingsData} from '../hooks/useFriendSettingsData';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const getDuplicateBlockIds = (
  blocks: ReadonlyArray<{
    department: string | null;
    id: string;
    nickname: string;
  }>,
) => {
  const counts = new Map<string, number>();
  blocks.forEach(block => {
    const key = JSON.stringify([block.nickname, block.department]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return new Set(
    blocks
      .filter(block => {
        const key = JSON.stringify([block.nickname, block.department]);
        return counts.get(key)! > 1;
      })
      .map(block => block.id),
  );
};

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

const ErrorBanner = ({error, onRetry}: ErrorBannerProps) => (
  <View style={styles.errorBanner}>
    <Icon color={COLORS.accent.orange} name="alert-circle-outline" size={18} />
    <Text numberOfLines={2} style={styles.errorBannerText}>
      {error}
    </Text>
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onRetry}
      style={styles.errorRetryButton}>
      <Text style={styles.errorRetryText}>재시도</Text>
    </TouchableOpacity>
  </View>
);

export const FriendSettingsScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {
    blocks,
    blocksError,
    hasLoadedBlocks,
    loadingBlocks,
    loadingPrivacy,
    privacy,
    privacyError,
    reloadBlocks,
    reloadPrivacy,
    savingPrivacy,
    unblockMember,
    unblockingIds,
    updateNicknameSearchable,
  } = useFriendSettingsData();
  const duplicateBlockIds = React.useMemo(
    () => getDuplicateBlockIds(blocks),
    [blocks],
  );

  const handleUnblock = React.useCallback(
    (friendId: string, nickname: string) => {
      Alert.alert('차단 해제', `${nickname}님의 차단을 해제할까요? 차단을 해제해도 이전 친구 관계는 복원되지 않습니다.`, [
        {text: '취소', style: 'cancel'},
        {
          text: '차단 해제',
          onPress: () => {
            unblockMember(friendId).catch(actionError => {
              if (navigation.isFocused()) {
                Alert.alert('오류', getErrorMessage(actionError, '차단을 해제하지 못했습니다.'));
              }
            });
          },
        },
      ]);
    },
    [navigation, unblockMember],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="친구 설정" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadingPrivacy && !privacy ? (
          <StateCard
            description="검색 공개 설정을 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="검색 공개 설정을 불러오는 중"
          />
        ) : null}
        {privacyError && !privacy ? (
          <StateCard
            actionLabel="다시 시도"
            description={privacyError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadPrivacy().catch(() => undefined);
            }}
            title="검색 공개 설정을 불러오지 못했습니다"
          />
        ) : null}
        {privacy ? (
          <>
            {privacyError ? (
              <ErrorBanner
                error={privacyError}
                onRetry={() => {
                  reloadPrivacy().catch(() => undefined);
                }}
              />
            ) : null}
            <SettingsSection title="검색 공개 설정">
              <SettingsRow
                accessoryType="toggle"
                iconBackgroundColor={COLORS.brand.primaryTint}
                iconColor={COLORS.brand.primaryStrong}
                iconName="search-outline"
                onToggle={nextValue => {
                  updateNicknameSearchable(nextValue).catch(actionError =>
                    Alert.alert(
                      '오류',
                      getErrorMessage(actionError, '검색 공개 설정을 저장하지 못했습니다.'),
                    ),
                  );
                }}
                subtitle="다른 사용자가 닉네임으로 나를 찾을 수 있어요."
                subtitleNumberOfLines={2}
                title="닉네임 검색 허용"
                titleWeight="700"
                toggleDisabled={savingPrivacy}
                toggleValue={privacy.nicknameSearchable}
              />
            </SettingsSection>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>차단한 사용자</Text>
        {loadingBlocks && !hasLoadedBlocks ? (
          <StateCard
            description="차단 목록을 준비하고 있습니다."
            icon={<ActivityIndicator color={COLORS.brand.primary} />}
            title="차단 목록을 불러오는 중"
          />
        ) : null}
        {blocksError && !hasLoadedBlocks ? (
          <StateCard
            actionLabel="다시 시도"
            description={blocksError}
            icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
            onPressAction={() => {
              reloadBlocks().catch(() => undefined);
            }}
            title="차단 목록을 불러오지 못했습니다"
          />
        ) : null}
        {hasLoadedBlocks ? (
          <>
            {blocksError ? (
              <ErrorBanner
                error={blocksError}
                onRetry={() => {
                  reloadBlocks().catch(() => undefined);
                }}
              />
            ) : null}
            {blocks.length > 0 ? (
              <View style={styles.blockCard}>
                {blocks.map((block, index) => (
                  <View
                    key={block.id}
                    style={[
                      styles.blockRow,
                      index < blocks.length - 1 ? styles.rowDivider : null,
                    ]}>
                    <FriendAvatar photoUrl={block.photoUrl} />
                    <View style={styles.blockContent}>
                      <Text style={styles.blockName}>{block.nickname}</Text>
                      <Text style={styles.blockDepartment}>
                        {block.department || '학과 정보 없음'}
                      </Text>
                      {duplicateBlockIds.has(block.id) ? (
                        <Text style={styles.blockIdentifier}>
                          식별 코드 · {block.id.slice(-6).toUpperCase()}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={unblockingIds.has(block.id)}
                      onPress={() => handleUnblock(block.id, block.nickname)}
                      style={styles.unblockButton}>
                      {unblockingIds.has(block.id) ? (
                        <ActivityIndicator color={COLORS.text.secondary} size="small" />
                      ) : (
                        <Text style={styles.unblockText}>차단 해제</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <StateCard
                description="차단한 사용자가 없어요."
                icon={<Icon color={COLORS.text.muted} name="shield-checkmark-outline" size={28} />}
                title="차단 목록이 비어 있어요"
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: 4,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.orangeSoft,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  errorBannerText: {color: COLORS.text.secondary, flex: 1, fontSize: 12, lineHeight: 18},
  errorRetryButton: {paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs},
  errorRetryText: {color: COLORS.accent.orange, fontSize: 12, fontWeight: '700'},
  blockCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  blockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
  },
  rowDivider: {borderBottomColor: COLORS.border.subtle, borderBottomWidth: 1},
  blockContent: {flex: 1, marginLeft: SPACING.md},
  blockName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  blockDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  blockIdentifier: {color: COLORS.text.tertiary, fontSize: 11, lineHeight: 16, marginTop: 2},
  unblockButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    height: 34,
    justifyContent: 'center',
    minWidth: 66,
    paddingHorizontal: SPACING.sm,
  },
  unblockText: {color: COLORS.text.secondary, fontSize: 12, fontWeight: '700'},
});
