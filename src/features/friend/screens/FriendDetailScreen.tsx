import React from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {type CampusStackParamList} from '@/app/navigation/types';
import {SettingsRow, SettingsSection, StackHeader, StateCard} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';
import {RepositoryError} from '@/shared/lib/errors';

import {FriendAvatar} from '../components/FriendAvatar';
import {FriendMinecraftAccountTree} from '../components/FriendMinecraftAccountTree';
import {useFriendDetailData} from '../hooks/useFriendDetailData';

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message.trim() ? error.message : fallback;
const isMissingFriendRelationship = (error: unknown) =>
  error instanceof RepositoryError &&
  (error.context?.apiErrorCode === 'FRIENDSHIP_NOT_FOUND' ||
    error.context?.apiErrorCode === 'FRIEND_TARGET_NOT_FOUND');

export const FriendDetailScreen = () => {
  useScreenView();
  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const route = useRoute<any>();
  const {friendId} = route.params as CampusStackParamList['FriendDetail'];
  const {
    blockFriend,
    error,
    friend,
    loading,
    minecraftAccounts,
    minecraftAccountsError,
    minecraftAccountsLoading,
    mutating,
    reload,
    reloadMinecraftAccounts,
    removeFriend,
    updateFavorite,
  } = useFriendDetailData(friendId);

  const showMutationError = React.useCallback(
    (actionError: unknown, fallback: string) => {
      if (!navigation.isFocused()) {
        return;
      }

      const shouldLeave = isMissingFriendRelationship(actionError);
      Alert.alert('오류', getErrorMessage(actionError, fallback), [
        {
          text: '확인',
          onPress: shouldLeave
            ? () => {
                invalidateData(FRIEND_HUB_INVALIDATION_KEY);
                if (navigation.isFocused()) {
                  navigation.goBack();
                }
              }
            : undefined,
        },
      ]);
    },
    [navigation],
  );

  const handleFavorite = React.useCallback(() => {
    updateFavorite()
      .then(() => {
        invalidateData(FRIEND_HUB_INVALIDATION_KEY);
      })
      .catch(actionError => {
        showMutationError(actionError, '즐겨찾기를 변경하지 못했습니다.');
      });
  }, [showMutationError, updateFavorite]);

  const handleRemove = React.useCallback(() => {
    Alert.alert('친구 끊기', `${friend?.nickname || '이 친구'}님과 친구 관계를 끊을까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '친구 끊기', style: 'destructive', onPress: () => {
        removeFriend().then(removed => {
          if (!removed) {
            return;
          }
          invalidateData(FRIEND_HUB_INVALIDATION_KEY);
          if (navigation.isFocused()) {
            navigation.goBack();
          }
        }).catch(removeError => {
          showMutationError(removeError, '친구 관계를 끊지 못했습니다.');
        });
      }},
    ]);
  }, [friend?.nickname, navigation, removeFriend, showMutationError]);

  const handleBlock = React.useCallback(() => {
    Alert.alert('친구 차단', `${friend?.nickname || '이 친구'}님을 차단할까요? 친구 관계와 대기 중인 요청도 함께 정리됩니다.\n\n공개 게시판과 공개 채팅의 기존 콘텐츠는 계속 보일 수 있습니다.`, [
      {text: '취소', style: 'cancel'},
      {text: '차단', style: 'destructive', onPress: () => {
        blockFriend().then(blocked => {
          if (!blocked) {
            return;
          }
          invalidateData(FRIEND_HUB_INVALIDATION_KEY);
          if (navigation.isFocused()) {
            navigation.goBack();
          }
        }).catch(blockError => {
          showMutationError(blockError, '친구를 차단하지 못했습니다.');
        });
      }},
    ]);
  }, [blockFriend, friend?.nickname, navigation, showMutationError]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        rightAccessory={friend ? <TouchableOpacity accessibilityLabel={`즐겨찾기 ${friend.favorite ? '해제' : '추가'}`} accessibilityRole="button" activeOpacity={0.82} disabled={mutating} onPress={handleFavorite} style={styles.favoriteButton}><Icon color={friend.favorite ? COLORS.accent.yellow : COLORS.text.muted} name={friend.favorite ? 'star' : 'star-outline'} size={23} /></TouchableOpacity> : undefined}
        title="친구 정보"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !friend ? <StateCard description="친구 정보를 준비하고 있습니다." icon={<ActivityIndicator color={COLORS.brand.primary} />} title="친구 정보를 불러오는 중" /> : null}
        {error && !friend ? <StateCard actionLabel="다시 시도" description={error} icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />} onPressAction={() => { reload().catch(() => undefined); }} title="친구 정보를 불러오지 못했습니다" /> : null}
        {friend ? <>
          <View style={styles.profileCard}>
            <FriendAvatar photoUrl={friend.photoUrl} size={88} />
            <Text style={styles.nickname}>{friend.nickname}</Text>
            <Text style={styles.department}>{friend.department || '학과 정보가 없어요'}</Text>
          </View>
          <View style={styles.minecraftSection}>
            <Text style={styles.minecraftTitle}>마인크래프트 계정</Text>
            {minecraftAccountsLoading ? (
              <StateCard
                description="친구의 등록 계정을 확인하고 있습니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="마인크래프트 계정을 불러오는 중"
              />
            ) : null}
            {!minecraftAccountsLoading && minecraftAccountsError ? (
              <StateCard
                actionLabel="다시 시도"
                description={minecraftAccountsError}
                icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />}
                onPressAction={() => {
                  reloadMinecraftAccounts().catch(() => undefined);
                }}
                title="마인크래프트 계정을 불러오지 못했습니다"
              />
            ) : null}
            {!minecraftAccountsLoading && !minecraftAccountsError && minecraftAccounts?.selfAccounts.length === 0 ? (
              <StateCard
                description="아직 등록한 마인크래프트 대표 계정이 없어요."
                icon={<Icon color={COLORS.brand.primary} name="game-controller-outline" size={28} />}
                title="등록된 계정이 없어요"
              />
            ) : null}
            {!minecraftAccountsLoading && !minecraftAccountsError ? (
              <View style={styles.minecraftAccountList}>
                {minecraftAccounts?.selfAccounts.map(account => (
                  <FriendMinecraftAccountTree
                    account={account}
                    key={`${account.gameName}-${account.edition}`}
                  />
                ))}
              </View>
            ) : null}
          </View>
          <SettingsSection style={styles.section} title="친구 관리">
            <SettingsRow accessoryType="chevron" disabled={mutating} iconBackgroundColor={COLORS.accent.yellowSoft} iconColor={COLORS.accent.yellowStrong} iconName="star-outline" onPress={handleFavorite} showDivider title={friend.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'} />
            <SettingsRow accessoryType="chevron" disabled={mutating} iconBackgroundColor={COLORS.accent.orangeSoft} iconColor={COLORS.accent.orange} iconName="person-remove-outline" onPress={handleRemove} showDivider title="친구 끊기" />
            <SettingsRow accessoryType="chevron" disabled={mutating} iconBackgroundColor={COLORS.accent.pinkSoft} iconColor={COLORS.status.danger} iconName="ban-outline" onPress={handleBlock} title="차단하기" />
          </SettingsSection>
          <Text style={styles.note}>시간표 공유, 택시파티 및 채팅방 초대 기능은 후속 업데이트에서 제공될 예정이에요.</Text>
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  favoriteButton: {alignItems: 'center', height: 36, justifyContent: 'center', width: 36},
  profileCard: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderRadius: 16, paddingVertical: SPACING.xxl},
  nickname: {color: COLORS.text.primary, fontSize: 20, fontWeight: '800', lineHeight: 28, marginTop: SPACING.md},
  department: {color: COLORS.text.muted, fontSize: 13, lineHeight: 20, marginTop: 2},
  minecraftSection: {marginTop: SPACING.xl},
  minecraftTitle: {color: COLORS.text.primary, fontSize: 15, fontWeight: '800', lineHeight: 22, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs},
  minecraftAccountList: {gap: SPACING.sm},
  section: {marginTop: SPACING.xl},
  note: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.xl, paddingHorizontal: SPACING.md, textAlign: 'center'},
});
