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
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {useAuth} from '@/features/auth';
import {useFriendInboxCounts} from '@/features/friend';
import {
  DefaultProfileAvatar,
  ProfileScreenSkeleton,
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

import {MyPageMenuSection} from '../components/MyPageMenuSection';
import {MyPageStatCard} from '../components/MyPageStatCard';
import {useMyPageData} from '../hooks/useMyPageData';
import type {MyPageMenuItemViewData} from '../model/myPageViewData';
import {withdrawCurrentUser} from '../services/userProfileService';

const AVATAR_SIZE = 100;

export const MyScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const insets = useSafeAreaInsets();
  const {loading: authLoading, signOut} = useAuth();
  const {data, error, loading, reload} = useMyPageData();
  const {counts: friendInboxCounts, reload: reloadFriendInboxCounts} =
    useFriendInboxCounts();

  const [withdrawing, setWithdrawing] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const hasReceivedInitialFocus = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasReceivedInitialFocus.current) {
        hasReceivedInitialFocus.current = true;
        return;
      }

      Promise.all([
        reload(),
        reloadFriendInboxCounts(),
      ]).catch(() => undefined);
    }, [reload, reloadFriendInboxCounts]),
  );

  const openAction = React.useCallback(
    (actionKey: MyPageMenuItemViewData['actionKey']) => {
      switch (actionKey) {
        case 'profileEdit':
          navigation.navigate('ProfileEdit');
          return;
        case 'minecraftAccount':
          navigation.navigate('MinecraftAccount');
          return;
        case 'minecraftServer':
          navigation.navigate('MinecraftDetail');
          return;
        case 'friendHub':
          navigation.navigate('FriendHub');
          return;
        case 'myPosts':
          navigation.navigate('MyPosts');
          return;
        case 'bookmarks':
          navigation.navigate('Bookmarks');
          return;
        case 'taxiHistory':
          navigation.navigate('TaxiHistory');
          return;
        case 'notificationSettings':
          navigation.navigate('NotificationSettings');
          return;
        case 'accountManagement':
          navigation.navigate('AccountModification');
          return;
        case 'inquiries':
          navigation.navigate('Inquiries', {type: 'service'});
          return;
        case 'inquiryHistory':
          navigation.navigate('InquiryHistory');
          return;
        case 'appSettings':
          navigation.navigate('Setting');
          return;
        default:
          Alert.alert('구현 예정', '추후 구현 예정입니다.');
      }
    },
    [navigation],
  );

  const handlePressMenuItem = React.useCallback(
    (item: MyPageMenuItemViewData) => {
      openAction(item.actionKey);
    },
    [openAction],
  );

  const handleConfirmWithdraw = React.useCallback(async () => {
    try {
      setWithdrawing(true);

      await withdrawCurrentUser();

      try {
        await signOut();
      } catch {
        // 계정 삭제 후 signOut 실패는 무시
      }
    } catch (caughtError: any) {
      const message =
        caughtError?.message ||
        '회원탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      Alert.alert('오류', message);
    } finally {
      setWithdrawing(false);
    }
  }, [signOut]);

  const handleWithdraw = React.useCallback(() => {
    Alert.alert(
      '회원탈퇴',
      '정말 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        {text: '취소', style: 'cancel'},
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            handleConfirmWithdraw().catch(() => undefined);
          },
        },
      ],
    );
  }, [handleConfirmWithdraw]);

  const handleSignOut = React.useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await signOut();
          } catch {
            Alert.alert(
              '오류',
              '로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.',
            );
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <StackHeader onPressBack={() => navigation.goBack()} title="마이페이지" />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {paddingBottom: insets.bottom + 28},
          ]}
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
              style={styles.stateCard}
              title="마이페이지를 불러오지 못했습니다"
            />
          ) : null}

          {data ? (
            <>
              <View style={styles.profileSection}>
                {data.profile.photoUrl ? (
                  <SkeletonImage
                    source={{uri: data.profile.photoUrl}}
                    style={styles.avatarImage}
                  />
                ) : (
                  <DefaultProfileAvatar
                    iconSize={AVATAR_SIZE / 2}
                    size={AVATAR_SIZE}
                    style={styles.avatarFallback}
                  />
                )}

                <View style={styles.profileBody}>
                  <Text style={styles.displayName}>{data.profile.displayName}</Text>
                  <Text style={styles.subtitle}>{data.profile.subtitle}</Text>
                  <Text style={styles.email}>{data.profile.email}</Text>

                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={() => navigation.navigate('ProfileEdit')}
                    style={styles.editButton}>
                    <Text style={styles.editButtonLabel}>
                      {data.profile.editLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.statsRow}>
                {data.stats.map(item => (
                  <MyPageStatCard
                    key={item.id}
                    item={item}
                    onPress={stat => openAction(stat.actionKey)}
                  />
                ))}
              </View>

              {data.sections.map(section => (
                <MyPageMenuSection
                  badgeCounts={{
                    friendHub: friendInboxCounts?.totalActionCount ?? 0,
                  }}
                  key={section.id}
                  onPressItem={handlePressMenuItem}
                  section={section}
                />
              ))}

              <View style={styles.logoutSection}>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  disabled={authLoading || signingOut || withdrawing}
                  onPress={handleSignOut}
                  style={[
                    styles.logoutButton,
                    authLoading || signingOut || withdrawing
                      ? styles.disabledButton
                      : undefined,
                  ]}>
                  {signingOut ? (
                    <ActivityIndicator color={COLORS.status.danger} />
                  ) : (
                    <Text style={styles.logoutLabel}>로그아웃</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.78}
                  disabled={authLoading || signingOut || withdrawing}
                  onPress={handleWithdraw}
                  style={styles.withdrawButton}>
                  {withdrawing ? (
                    <View style={styles.withdrawLoadingRow}>
                      <ActivityIndicator
                        color={COLORS.status.danger}
                        size="small"
                      />
                      <Text style={styles.withdrawLabel}>처리 중...</Text>
                    </View>
                  ) : (
                    <Text style={styles.withdrawLabel}>회원탈퇴</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
  },
  stateCard: {
    marginTop: SPACING.xs,
  },
  profileSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  avatarImage: {
    borderRadius: RADIUS.pill,
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  avatarFallback: {
    flexShrink: 0,
  },
  profileBody: {
    flex: 1,
  },
  displayName: {
    color: COLORS.text.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  email: {
    color: COLORS.text.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  editButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  editButtonLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  logoutSection: {
    marginTop: SPACING.sm,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    height: 53,
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  logoutLabel: {
    color: COLORS.status.danger,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  withdrawButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  withdrawLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: 'underline',
  },
  withdrawLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
