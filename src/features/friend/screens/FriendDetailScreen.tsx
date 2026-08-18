import React from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {SettingsRow, SettingsSection, StackHeader, StateCard} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendAvatar} from '../components/FriendAvatar';
import {useFriendDetailData} from '../hooks/useFriendDetailData';

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message.trim() ? error.message : fallback;

export const FriendDetailScreen = () => {
  useScreenView();
  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const route = useRoute<any>();
  const {friendId} = route.params as CampusStackParamList['FriendDetail'];
  const {blockFriend, error, friend, loading, mutating, reload, removeFriend, updateFavorite} = useFriendDetailData(friendId);

  const handleRemove = React.useCallback(() => {
    Alert.alert('친구 끊기', `${friend?.nickname || '이 친구'}님과 친구 관계를 끊을까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '친구 끊기', style: 'destructive', onPress: () => {
        removeFriend().then(() => navigation.goBack()).catch(removeError => Alert.alert('오류', getErrorMessage(removeError, '친구 관계를 끊지 못했습니다.')));
      }},
    ]);
  }, [friend?.nickname, navigation, removeFriend]);

  const handleBlock = React.useCallback(() => {
    Alert.alert('친구 차단', `${friend?.nickname || '이 친구'}님을 차단할까요? 친구 관계와 대기 중인 요청도 함께 정리됩니다.`, [
      {text: '취소', style: 'cancel'},
      {text: '차단', style: 'destructive', onPress: () => {
        blockFriend().then(() => navigation.goBack()).catch(blockError => Alert.alert('오류', getErrorMessage(blockError, '친구를 차단하지 못했습니다.')));
      }},
    ]);
  }, [blockFriend, friend?.nickname, navigation]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        rightAccessory={friend ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={mutating} onPress={() => { updateFavorite().catch(actionError => Alert.alert('오류', getErrorMessage(actionError, '즐겨찾기를 변경하지 못했습니다.'))); }} style={styles.favoriteButton}><Icon color={friend.favorite ? COLORS.accent.yellow : COLORS.text.muted} name={friend.favorite ? 'star' : 'star-outline'} size={23} /></TouchableOpacity> : undefined}
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
          <SettingsSection style={styles.section} title="친구 관리">
            <SettingsRow accessoryType="chevron" iconBackgroundColor={COLORS.accent.yellowSoft} iconColor={COLORS.accent.yellowStrong} iconName="star-outline" onPress={() => { updateFavorite().catch(actionError => Alert.alert('오류', getErrorMessage(actionError, '즐겨찾기를 변경하지 못했습니다.'))); }} showDivider title={friend.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'} />
            <SettingsRow accessoryType="chevron" iconBackgroundColor={COLORS.accent.orangeSoft} iconColor={COLORS.accent.orange} iconName="person-remove-outline" onPress={handleRemove} showDivider title="친구 끊기" />
            <SettingsRow accessoryType="chevron" iconBackgroundColor={COLORS.accent.pinkSoft} iconColor={COLORS.status.danger} iconName="ban-outline" onPress={handleBlock} title="차단하기" />
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
  section: {marginTop: SPACING.xl},
  note: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.xl, paddingHorizontal: SPACING.md, textAlign: 'center'},
});
