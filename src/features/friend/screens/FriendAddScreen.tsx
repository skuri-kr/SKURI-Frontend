import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {StateCard, StackHeader} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendAvatar} from '../components/FriendAvatar';
import {useFriendAddData} from '../hooks/useFriendAddData';
import type {FriendSearchResult} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const formatCode = (value: string) => value.trim().toUpperCase();

export const FriendAddScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const [friendCode, setFriendCode] = React.useState('');
  const [nicknameQuery, setNicknameQuery] = React.useState('');
  const {
    loadingMyCode,
    completedSearchQuery,
    invalidateFriendCodePreview,
    loadMoreSearchResults,
    myCode,
    myCodeError,
    preview,
    previewFriendCode,
    previewing,
    regenerating,
    regenerateMyCode,
    reloadMyCode,
    resetSearch,
    searchFriends,
    searchResults,
    searchNextCursor,
    searching,
    sendFriendRequest,
    sendingFriendIds,
  } = useFriendAddData();

  const handlePreview = React.useCallback(async () => {
    try {
      await previewFriendCode(friendCode);
    } catch (previewError) {
      Alert.alert('친구 코드 확인', getErrorMessage(previewError, '친구 코드를 확인하지 못했습니다.'));
    }
  }, [friendCode, previewFriendCode]);

  const handleSearch = React.useCallback(async () => {
    try {
      await searchFriends(nicknameQuery);
    } catch (searchError) {
      Alert.alert('친구 검색', getErrorMessage(searchError, '친구를 검색하지 못했습니다.'));
    }
  }, [nicknameQuery, searchFriends]);

  const handleSendRequest = React.useCallback(
    async (result: FriendSearchResult) => {
      try {
        const mutation = await sendFriendRequest(result.id);
        if (!mutation) {
          return;
        }
        if (mutation.status === 'ACCEPTED') {
          Alert.alert('친구가 되었어요', `${result.nickname}님과 친구가 되었습니다.`, [
            {text: '확인', onPress: () => navigation.goBack()},
          ]);
          return;
        }
        Alert.alert('친구 요청을 보냈어요', `${result.nickname}님의 수락을 기다려주세요.`);
      } catch (requestError) {
        Alert.alert('오류', getErrorMessage(requestError, '친구 요청을 보내지 못했습니다.'));
      }
    },
    [navigation, sendFriendRequest],
  );

  const handleCopyMyCode = React.useCallback(() => {
    if (!myCode) {
      return;
    }
    Clipboard.setString(myCode.code);
    Alert.alert('복사 완료', '친구 코드가 클립보드에 복사되었습니다.');
  }, [myCode]);

  const handleShareMyCode = React.useCallback(async () => {
    if (!myCode) {
      return;
    }
    try {
      await Share.share({message: `스쿠리 친구 코드: ${myCode.code}`});
    } catch {
      Alert.alert('공유 오류', '친구 코드를 공유하지 못했습니다.');
    }
  }, [myCode]);

  const handleRegenerate = React.useCallback(() => {
    if (!myCode?.canRegenerate) {
      return;
    }
    Alert.alert('친구 코드 재발급', '기존 친구 코드는 더 이상 사용할 수 없습니다. 새 코드로 바꿀까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '재발급',
        style: 'destructive',
        onPress: () => {
          regenerateMyCode()
            .then(() => Alert.alert('재발급 완료', '새 친구 코드가 발급되었습니다.'))
            .catch(regenerateError => {
              Alert.alert('오류', getErrorMessage(regenerateError, '친구 코드를 재발급하지 못했습니다.'));
            });
        },
      },
    ]);
  }, [myCode?.canRegenerate, regenerateMyCode]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="친구 추가" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>내 친구 코드</Text>
        <View style={styles.codeCard}>
          {loadingMyCode ? <ActivityIndicator color={COLORS.brand.primary} /> : null}
          {!loadingMyCode && myCode ? (
            <>
              <Text style={styles.code}>{myCode.code}</Text>
              <Text style={styles.codeHint}>이 코드를 친구에게 보내면 빠르게 친구 요청을 받을 수 있어요.</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={handleCopyMyCode} style={styles.secondaryAction}>
                  <Icon color={COLORS.text.secondary} name="copy-outline" size={17} />
                  <Text style={styles.secondaryActionText}>복사</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => { handleShareMyCode().catch(() => undefined); }} style={styles.secondaryAction}>
                  <Icon color={COLORS.text.secondary} name="share-social-outline" size={17} />
                  <Text style={styles.secondaryActionText}>공유</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={!myCode.canRegenerate || regenerating}
                onPress={handleRegenerate}
                style={styles.regenerateButton}>
                {regenerating ? <ActivityIndicator color={COLORS.text.muted} size="small" /> : <Text style={[styles.regenerateText, !myCode.canRegenerate ? styles.disabledText : null]}>친구 코드 재발급</Text>}
              </TouchableOpacity>
            </>
          ) : null}
          {!loadingMyCode && !myCode && myCodeError ? (
            <View style={styles.codeErrorContent}>
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={24}
              />
              <Text style={styles.codeErrorText}>{myCodeError}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => {
                  reloadMyCode().catch(() => undefined);
                }}
                style={styles.retryCodeButton}>
                <Text style={styles.retryCodeButtonText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>친구 코드로 추가</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="친구 코드"
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={value => {
                invalidateFriendCodePreview();
                setFriendCode(formatCode(value));
              }}
              placeholder="예: SKR-7K4M-9Q2D"
              placeholderTextColor={COLORS.text.placeholder}
              style={styles.textInput}
              value={friendCode}
            />
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={previewing} onPress={() => { handlePreview().catch(() => undefined); }} style={styles.searchButton}>
              {previewing ? <ActivityIndicator color={COLORS.text.inverse} size="small" /> : <Text style={styles.searchButtonText}>확인</Text>}
            </TouchableOpacity>
          </View>
          {preview ? <SearchResultRow result={preview} loading={sendingFriendIds.has(preview.id)} onSend={() => { handleSendRequest(preview).catch(() => undefined); }} /> : null}
        </View>

        <Text style={styles.sectionTitle}>닉네임으로 찾기</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="친구 닉네임 검색"
              autoCorrect={false}
              onChangeText={value => {
                setNicknameQuery(value);
                resetSearch();
              }}
              onSubmitEditing={() => { handleSearch().catch(() => undefined); }}
              placeholder="두 글자 이상 입력해주세요"
              placeholderTextColor={COLORS.text.placeholder}
              returnKeyType="search"
              style={styles.textInput}
              value={nicknameQuery}
            />
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={searching} onPress={() => { handleSearch().catch(() => undefined); }} style={styles.searchButton}>
              {searching ? <ActivityIndicator color={COLORS.text.inverse} size="small" /> : <Icon color={COLORS.text.inverse} name="search" size={18} />}
            </TouchableOpacity>
          </View>
          {searchResults.map(result => <SearchResultRow key={result.id} result={result} loading={sendingFriendIds.has(result.id)} onSend={() => { handleSendRequest(result).catch(() => undefined); }} />)}
          {searchNextCursor ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={searching} onPress={() => { loadMoreSearchResults(nicknameQuery).catch(searchError => Alert.alert('친구 검색', getErrorMessage(searchError, '검색 결과를 더 불러오지 못했습니다.'))); }} style={styles.loadMoreButton}>{searching ? <ActivityIndicator color={COLORS.brand.primary} size="small" /> : <Text style={styles.loadMoreText}>더 보기</Text>}</TouchableOpacity> : null}
          {!searching && completedSearchQuery === nicknameQuery.trim() && searchResults.length === 0 ? <Text style={styles.emptySearch}>검색 결과가 없어요.</Text> : null}
        </View>
        <StateCard
          description="카메라 권한과 QR 인식 기능은 후속 버전에서 제공할 예정이에요."
          icon={<Icon color={COLORS.accent.blue} name="qr-code-outline" size={28} />}
          title="QR 추가는 준비 중이에요"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const SearchResultRow = ({loading, onSend, result}: {loading: boolean; onSend: () => void; result: FriendSearchResult}) => (
  <View style={styles.resultRow}>
    <FriendAvatar photoUrl={result.photoUrl} />
    <View style={styles.resultContent}>
      <Text style={styles.resultName}>{result.nickname}</Text>
      <Text style={styles.resultDepartment}>{result.department || '학과 정보 없음'}</Text>
    </View>
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={loading || !result.canSendFriendRequest}
      onPress={onSend}
      style={[styles.requestButton, !result.canSendFriendRequest ? styles.disabledRequestButton : null]}>
      {loading ? <ActivityIndicator color={COLORS.brand.primary} size="small" /> : <Text style={[styles.requestButtonText, !result.canSendFriendRequest ? styles.disabledText : null]}>{result.canSendFriendRequest ? '요청' : '요청 불가'}</Text>}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  sectionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: SPACING.sm, marginTop: SPACING.lg, paddingHorizontal: 4},
  codeCard: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, minHeight: 158, padding: SPACING.xl, ...SHADOWS.card},
  code: {color: COLORS.brand.primaryStrong, fontSize: 24, fontWeight: '800', letterSpacing: 1.2, lineHeight: 32},
  codeHint: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.sm, textAlign: 'center'},
  codeActions: {flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg},
  secondaryAction: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: 6, height: 36, justifyContent: 'center', paddingHorizontal: SPACING.lg},
  secondaryActionText: {color: COLORS.text.secondary, fontSize: 13, fontWeight: '700'},
  regenerateButton: {marginTop: SPACING.lg, minHeight: 20},
  regenerateText: {color: COLORS.text.muted, fontSize: 12, textDecorationLine: 'underline'},
  disabledText: {color: COLORS.text.muted},
  codeErrorContent: {alignItems: 'center', gap: SPACING.sm},
  codeErrorText: {color: COLORS.text.secondary, fontSize: 13, lineHeight: 20, textAlign: 'center'},
  retryCodeButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 36, justifyContent: 'center', paddingHorizontal: SPACING.lg},
  retryCodeButtonText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  inputCard: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card},
  inputRow: {alignItems: 'center', flexDirection: 'row', padding: SPACING.md},
  textInput: {backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, color: COLORS.text.primary, flex: 1, fontSize: 14, height: 44, paddingHorizontal: SPACING.md},
  searchButton: {alignItems: 'center', backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md, height: 44, justifyContent: 'center', marginLeft: SPACING.sm, minWidth: 50, paddingHorizontal: SPACING.md},
  searchButtonText: {color: COLORS.text.inverse, fontSize: 14, fontWeight: '700'},
  resultRow: {alignItems: 'center', borderTopColor: COLORS.border.subtle, borderTopWidth: 1, flexDirection: 'row', minHeight: 76, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md},
  resultContent: {flex: 1, marginLeft: SPACING.md},
  resultName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  resultDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  requestButton: {alignItems: 'center', backgroundColor: COLORS.brand.primaryTint, borderRadius: RADIUS.md, height: 34, justifyContent: 'center', minWidth: 58, paddingHorizontal: SPACING.sm},
  disabledRequestButton: {backgroundColor: COLORS.background.subtle},
  requestButtonText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  emptySearch: {color: COLORS.text.muted, fontSize: 13, padding: SPACING.lg, textAlign: 'center'},
  loadMoreButton: {alignItems: 'center', borderTopColor: COLORS.border.subtle, borderTopWidth: 1, height: 44, justifyContent: 'center'},
  loadMoreText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
});
