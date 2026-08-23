import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  FormField,
  InfoBanner,
  SegmentedControl,
  StateCard,
  ToneBadge,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {useMinecraftAccounts} from '../hooks/useMinecraftAccounts';
import type {
  MinecraftAccountEntry,
  MinecraftEdition,
} from '../model/types';
import { MinecraftStackHeader } from '../components/MinecraftStackHeader';

const MAX_TOTAL_ACCOUNTS = 4;
const AVATAR_SIZE = 48;
const EDITION_ITEMS = [
  {id: 'JE', label: 'Java Edition'},
  {id: 'BE', label: 'Bedrock Edition'},
] as const;

const getAvatarUri = (uuid: string) => {
  const avatarKey =
    uuid && !uuid.startsWith('be:')
      ? uuid
      : '8667ba71b85a4004af54457a9734eed7';

  return `https://minotar.net/avatar/${avatarKey}/48`;
};

const formatLinkedDate = (timestamp?: number) => {
  if (!timestamp) {
    return '-';
  }

  try {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
};

const sortAccounts = (accounts: MinecraftAccountEntry[]) => {
  const parents = accounts
    .filter(account => !account.whoseFriend)
    .sort((left, right) => left.nickname.localeCompare(right.nickname, 'ko'));
  const friends = accounts
    .filter(account => !!account.whoseFriend)
    .sort((left, right) => {
      const friendCompare = (left.whoseFriend ?? '').localeCompare(
        right.whoseFriend ?? '',
        'ko',
      );

      if (friendCompare !== 0) {
        return friendCompare;
      }

      return left.nickname.localeCompare(right.nickname, 'ko');
    });

  return [...parents, ...friends];
};

export const MinecraftAccountScreen = () => {
  useScreenView();

  const navigation =
    useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const {
    accounts,
    deleteAccount,
    error,
    loading,
    refresh,
    registerAccount,
    registering,
  } = useMinecraftAccounts();

  const [nickname, setNickname] = React.useState('');
  const [edition, setEdition] = React.useState<MinecraftEdition>('JE');

  useFocusEffect(
    React.useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const sortedAccounts = React.useMemo(() => sortAccounts(accounts), [accounts]);
  const parentAccount =
    React.useMemo(
      () => sortedAccounts.find(account => !account.whoseFriend) ?? null,
      [sortedAccounts],
    );
  const friendAccounts = React.useMemo(
    () => sortedAccounts.filter(account => !!account.whoseFriend),
    [sortedAccounts],
  );

  const remainingSlots = MAX_TOTAL_ACCOUNTS - sortedAccounts.length;
  const trimmedNickname = nickname.trim();
  const canRegister =
    trimmedNickname.length > 0 && remainingSlots > 0 && !registering;
  const isFriendRegistration = Boolean(parentAccount);

  const handleRegister = React.useCallback(async () => {
    if (!trimmedNickname) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }

    try {
      await registerAccount(
        trimmedNickname,
        edition,
        isFriendRegistration ? parentAccount?.nickname : undefined,
      );
      setNickname('');

      Alert.alert(
        '등록 완료',
        isFriendRegistration
          ? '친구 계정이 등록되었습니다.'
          : '마인크래프트 계정이 등록되었습니다.',
      );
    } catch (caughtError: any) {
      Alert.alert(
        '오류',
        caughtError?.message || '마인크래프트 계정을 등록하지 못했습니다.',
      );
    }
  }, [
    edition,
    isFriendRegistration,
    parentAccount?.nickname,
    registerAccount,
    trimmedNickname,
  ]);

  const handleDeleteAccount = React.useCallback(
    (account: MinecraftAccountEntry) => {
      const hasLinkedFriends = sortedAccounts.some(
        current => current.whoseFriend === account.nickname,
      );

      if (!account.whoseFriend && hasLinkedFriends) {
        Alert.alert(
          '삭제할 수 없어요',
          '친구 계정이 연결되어 있어 먼저 친구 계정을 삭제해야 합니다.',
        );
        return;
      }

      Alert.alert(
        '계정 삭제',
        `${account.nickname} 계정을 삭제하시겠습니까?`,
        [
          {text: '취소', style: 'cancel'},
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              deleteAccount(account.id)
                .then(() => {
                  Alert.alert('삭제 완료', '계정이 삭제되었습니다.');
                })
                .catch((caughtError: any) => {
                  Alert.alert(
                    '오류',
                    caughtError?.message ||
                      '마인크래프트 계정을 삭제하지 못했습니다.',
                  );
                });
            },
          },
        ],
      );
    },
    [deleteAccount, sortedAccounts],
  );

  const handleFocusNicknameInput = React.useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({animated: true});
    }, 120);
  }, []);

  const helperLines = isFriendRegistration
    ? [
        `대표 계정 ${parentAccount?.nickname}에 연결할 친구 계정을 등록할 수 있어요.`,
        `남은 슬롯은 ${remainingSlots}개입니다. 최대 4개까지 등록할 수 있어요.`,
      ]
    : [
        '처음 등록하는 계정은 대표 계정으로 사용됩니다.',
        '대표 계정을 등록한 뒤 친구 계정을 최대 3개까지 추가할 수 있어요.',
      ];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <MinecraftStackHeader
          onPressBack={() => navigation.goBack()}
          title="마인크래프트 계정 등록"
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}>
          {loading && sortedAccounts.length === 0 ? (
            <StateCard
              description="등록된 마인크래프트 계정을 불러오고 있습니다."
              icon={<ActivityIndicator color={COLORS.brand.primary} />}
              title="계정 정보를 불러오는 중"
            />
          ) : null}

          {!loading && error && sortedAccounts.length === 0 ? (
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
                refresh().catch(() => undefined);
              }}
              title="계정 정보를 불러오지 못했습니다"
            />
          ) : null}

          {!loading || sortedAccounts.length > 0 ? (
            <>
              <InfoBanner
                backgroundColor={COLORS.brand.primaryTint}
                iconColor={COLORS.brand.primary}
                iconName="information-circle-outline"
                lines={helperLines}
                style={styles.banner}
                textColor={COLORS.brand.primaryStrong}
              />

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <View style={styles.summaryTitleRow}>
                      <Image source={require('/assets/images/minecraft/steve_face.png')} style={styles.summaryTitleIcon} />
                      <Text style={styles.summaryTitle}>등록 현황</Text>
                    </View>
                    <Text style={styles.summarySubtitle}>
                      내 계정 1개 + 친구 계정 3개까지 등록 가능
                    </Text>
                  </View> 

                  <View style={styles.summaryCountBadge}>
                    <Text style={styles.summaryCountText}>
                      {sortedAccounts.length}/{MAX_TOTAL_ACCOUNTS}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryMetrics}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>대표 계정</Text>
                    <Text style={styles.metricValue}>
                      {parentAccount ? parentAccount.nickname : '미등록'}
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>친구 계정</Text>
                    <Text style={styles.metricValue}>
                      {friendAccounts.length}개
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleWrap}>
                    <Icon
                      color={COLORS.accent.blue}
                      name="people-outline"
                      size={18}
                    />
                    <Text style={styles.cardTitle}>등록된 계정</Text>
                  </View>

                  {loading ? (
                    <ActivityIndicator
                      color={COLORS.text.muted}
                      size="small"
                      style={styles.inlineSpinner}
                    />
                  ) : null}
                </View>

                {sortedAccounts.length === 0 ? (
                  <View style={styles.emptyCardState}>
                    <Icon
                      color={COLORS.text.muted}
                      name="cube-outline"
                      size={30}
                    />
                    <Text style={styles.emptyCardTitle}>
                      아직 등록된 계정이 없습니다
                    </Text>
                    <Text style={styles.emptyCardDescription}>
                      계정을 등록해야 서버에 접속할 수 있어요.
                    </Text>
                  </View>
                ) : (
                  sortedAccounts.map((account, index) => {
                    const isFriend = Boolean(account.whoseFriend);

                    return (
                      <View
                        key={account.id}
                        style={[
                          styles.accountRow,
                          index < sortedAccounts.length - 1
                            ? styles.accountRowDivider
                            : undefined,
                        ]}>
                        <Image
                          source={{uri: getAvatarUri(account.uuid)}}
                          style={styles.avatar}
                        />

                        <View style={styles.accountBody}>
                          <View style={styles.accountTitleRow}>
                            <Text style={styles.accountName}>
                              {account.nickname}
                            </Text>
                            <ToneBadge
                              label={account.edition}
                              tone={
                                account.edition === 'JE' ? 'blue' : 'purple'
                              }
                              badgeStyle={{paddingVertical: 2, paddingHorizontal: 8, minHeight: 0}}
                              textStyle={{...TYPOGRAPHY.caption2, fontWeight: '600'}}
                            />
                            <ToneBadge
                              label={isFriend ? '친구 계정' : '대표 계정'}
                              tone={isFriend ? 'orange' : 'green'}
                              badgeStyle={{paddingVertical: 2, paddingHorizontal: 8, minHeight: 0}}
                              textStyle={{...TYPOGRAPHY.caption2, fontWeight: '600'}}
                            />
                          </View>

                          <Text style={styles.accountMeta}>
                            등록일 {formatLinkedDate(account.linkedAt)}
                          </Text>

                          {isFriend ? (
                            <Text style={styles.accountHint}>
                              {account.whoseFriend} 계정에 연결됨
                            </Text>
                          ) : (
                            <Text style={styles.accountHint}>
                              서버 입장 기준이 되는 대표 계정입니다
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity
                          accessibilityLabel={`${account.nickname} 계정 삭제`}
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          onPress={() => handleDeleteAccount(account)}
                          style={styles.deleteButton}>
                          <Icon
                            color={COLORS.status.danger}
                            name="trash-outline"
                            size={18}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleWrap}>
                    <Icon
                      color={COLORS.brand.primary}
                      name="add-circle-outline"
                      size={18}
                    />
                    <Text style={styles.cardTitle}>
                      {isFriendRegistration ? '친구 계정 추가' : '대표 계정 등록'}
                    </Text>
                  </View>
                </View>

                {remainingSlots > 0 ? (
                  <>
                    <FormField
                      label="마인크래프트 닉네임"
                      required
                      style={styles.field}>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={setNickname}
                        onFocus={handleFocusNicknameInput}
                        placeholder="예: Yangdding"
                        placeholderTextColor={COLORS.text.muted}
                        style={styles.input}
                        value={nickname}
                      />
                    </FormField>

                    <FormField label="에디션" required style={styles.field}>
                      <SegmentedControl
                        items={EDITION_ITEMS}
                        onSelect={itemId => setEdition(itemId)}
                        selectedId={edition}
                        variant="surface"
                      />
                    </FormField>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.9}
                      disabled={!canRegister}
                      onPress={handleRegister}
                      style={[
                        styles.registerButton,
                        canRegister ? styles.registerButtonEnabled : undefined,
                      ]}>
                      {registering ? (
                        <ActivityIndicator
                          color={
                            canRegister ? COLORS.text.inverse : COLORS.text.muted
                          }
                          size="small"
                          style={styles.buttonSpinner}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.registerButtonText,
                          canRegister
                            ? styles.registerButtonTextEnabled
                            : undefined,
                        ]}>
                        등록하기
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.emptyCardState}>
                    <Icon
                      color={COLORS.text.muted}
                      name="checkmark-circle-outline"
                      size={30}
                    />
                    <Text style={styles.emptyCardTitle}>
                      등록 가능한 수를 모두 채웠습니다
                    </Text>
                    <Text style={styles.emptyCardDescription}>
                      새 계정을 등록하려면 기존 계정을 먼저 삭제해주세요.
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.lg,
  },
  banner: {
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  summaryTitleIcon: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.xs,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  summarySubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  summaryCountBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  summaryCountText: {
    color: COLORS.brand.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  metricCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  metricLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  cardHeaderTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  inlineSpinner: {
    marginLeft: SPACING.md,
  },
  emptyCardState: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 28,
  },
  emptyCardTitle: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyCardDescription: {
    color: COLORS.text.tertiary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingVertical: SPACING.sm,
  },
  accountRowDivider: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
  },
  avatar: {
    borderRadius: 12,
    height: AVATAR_SIZE,
    marginRight: SPACING.md,
    width: AVATAR_SIZE,
  },
  accountBody: {
    flex: 1,
  },
  accountTitleRow: {
    alignItems: 'center',
    columnGap: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: SPACING.xs,
  },
  accountName: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  accountMeta: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  accountHint: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 36,
    justifyContent: 'center',
    marginLeft: SPACING.md,
    width: 36,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    lineHeight: 16,
    height: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  errorText: {
    color: COLORS.status.danger,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: SPACING.md,
  },
  registerButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
  },
  registerButtonEnabled: {
    backgroundColor: COLORS.brand.primary,
  },
  buttonSpinner: {
    marginRight: SPACING.sm,
  },
  registerButtonText: {
    color: COLORS.text.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  registerButtonTextEnabled: {
    color: COLORS.text.inverse,
  },
});
