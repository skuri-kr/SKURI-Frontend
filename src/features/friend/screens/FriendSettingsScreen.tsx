import React from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {SettingsRow, SettingsSection, StackHeader, StateCard} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendAvatar} from '../components/FriendAvatar';
import {useFriendSettingsData} from '../hooks/useFriendSettingsData';

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message.trim() ? error.message : fallback;

export const FriendSettingsScreen = () => {
  useScreenView();
  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {blocks, error, loading, privacy, reload, savingPrivacy, unblockMember, unblockingId, updateNicknameSearchable} = useFriendSettingsData();

  const handleUnblock = React.useCallback((friendId: string, nickname: string) => {
    Alert.alert('차단 해제', `${nickname}님의 차단을 해제할까요?`, [
      {text: '취소', style: 'cancel'},
      {text: '차단 해제', onPress: () => { unblockMember(friendId).catch(actionError => Alert.alert('오류', getErrorMessage(actionError, '차단을 해제하지 못했습니다.'))); }},
    ]);
  }, [unblockMember]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="친구 설정" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !privacy ? <StateCard description="친구 설정을 준비하고 있습니다." icon={<ActivityIndicator color={COLORS.brand.primary} />} title="친구 설정을 불러오는 중" /> : null}
        {error && !privacy ? <StateCard actionLabel="다시 시도" description={error} icon={<Icon color={COLORS.accent.orange} name="alert-circle-outline" size={28} />} onPressAction={() => { reload().catch(() => undefined); }} title="친구 설정을 불러오지 못했습니다" /> : null}
        {privacy ? <>
          <SettingsSection title="검색 공개 설정">
            <SettingsRow accessoryType="toggle" iconBackgroundColor={COLORS.brand.primaryTint} iconColor={COLORS.brand.primaryStrong} iconName="search-outline" onToggle={nextValue => { updateNicknameSearchable(nextValue).catch(actionError => Alert.alert('오류', getErrorMessage(actionError, '검색 공개 설정을 저장하지 못했습니다.'))); }} subtitle="다른 사용자가 닉네임으로 나를 찾을 수 있어요." subtitleNumberOfLines={2} title="닉네임 검색 허용" titleWeight="700" toggleDisabled={savingPrivacy} toggleValue={privacy.nicknameSearchable} />
          </SettingsSection>
          <Text style={styles.sectionTitle}>차단한 사용자</Text>
          {blocks.length > 0 ? <View style={styles.blockCard}>{blocks.map((block, index) => <View key={block.id} style={[styles.blockRow, index < blocks.length - 1 ? styles.rowDivider : null]}><FriendAvatar photoUrl={block.photoUrl} /><View style={styles.blockContent}><Text style={styles.blockName}>{block.nickname}</Text><Text style={styles.blockDepartment}>{block.department || '학과 정보 없음'}</Text></View><TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={unblockingId === block.id} onPress={() => handleUnblock(block.id, block.nickname)} style={styles.unblockButton}>{unblockingId === block.id ? <ActivityIndicator color={COLORS.text.secondary} size="small" /> : <Text style={styles.unblockText}>차단 해제</Text>}</TouchableOpacity></View>)}</View> : <StateCard description="차단한 사용자가 없어요." icon={<Icon color={COLORS.text.muted} name="shield-checkmark-outline" size={28} />} title="차단 목록이 비어 있어요" />}
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  sectionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: SPACING.sm, marginTop: SPACING.xl, paddingHorizontal: 4},
  blockCard: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card},
  blockRow: {alignItems: 'center', flexDirection: 'row', minHeight: 72, paddingHorizontal: SPACING.lg},
  rowDivider: {borderBottomColor: COLORS.border.subtle, borderBottomWidth: 1},
  blockContent: {flex: 1, marginLeft: SPACING.md},
  blockName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  blockDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  unblockButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 34, justifyContent: 'center', minWidth: 66, paddingHorizontal: SPACING.sm},
  unblockText: {color: COLORS.text.secondary, fontSize: 12, fontWeight: '700'},
});
