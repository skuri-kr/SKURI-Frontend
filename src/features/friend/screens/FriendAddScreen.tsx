import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
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
import Animated from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import {DataScanner} from 'react-native-data-scanner';

import {type CampusStackParamList} from '@/app/navigation/types';
import {invalidateData} from '@/app/data-freshness/dataInvalidation';
import {
  FRIEND_HUB_INVALIDATION_KEY,
  FRIEND_INBOX_COUNTS_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {StackHeader} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {
  enteringTransitions,
  exitingTransitions,
  layoutTransitions,
} from '@/shared/design-system/motion';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {FriendAvatar} from '../components/FriendAvatar';
import {useFriendAddData} from '../hooks/useFriendAddData';
import type {FriendSearchResult} from '../model/friend';
import {getDuplicateFriendProfileIds} from '../model/friendDisambiguation';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const formatCode = (value: string) => {
  const compactCode = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
  return [compactCode.slice(0, 3), compactCode.slice(3, 7), compactCode.slice(7, 11)]
    .filter(Boolean)
    .join('-');
};

const FRIEND_QR_PREFIX = 'skuri-friend:v1:';

const parseFriendQrPayload = (payload: string) => {
  if (!payload.startsWith(FRIEND_QR_PREFIX)) {
    return undefined;
  }

  const friendCode = payload.slice(FRIEND_QR_PREFIX.length);
  return /^SKR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(friendCode)
    ? friendCode
    : undefined;
};

const isScanCanceled = (scanError: unknown) =>
  scanError instanceof Error && /cancell?ed|취소/i.test(scanError.message);

const isCameraScanUnavailable = (scanError: unknown) =>
  scanError instanceof Error && /camera|permission|unavailable/i.test(scanError.message);

export const FriendAddScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const [friendCode, setFriendCode] = React.useState('');
  const [nicknameQuery, setNicknameQuery] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [showMyCodeQr, setShowMyCodeQr] = React.useState(false);
  const friendCodeInputRef = React.useRef<TextInput>(null);
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
      const result = await previewFriendCode(friendCode);
      if (result) {
        friendCodeInputRef.current?.blur();
        Keyboard.dismiss();
      }
    } catch (previewError) {
      Alert.alert('친구 코드 확인', getErrorMessage(previewError, '친구 코드를 확인하지 못했습니다.'));
    }
  }, [friendCode, previewFriendCode]);

  const handleScanFriendQr = React.useCallback(async () => {
    if (scanning) {
      return;
    }

    setScanning(true);
    try {
      let scanned: Awaited<ReturnType<typeof DataScanner.scanBarcode>>;
      try {
        scanned = await DataScanner.scanBarcode({
          enableAutoZoom: true,
          targetFormats: ['qr'],
        });
      } catch (scanError) {
        if (!navigation.isFocused()) {
          return;
        }
        if (isCameraScanUnavailable(scanError)) {
          Alert.alert('QR 스캔을 사용할 수 없어요', '카메라 권한과 기기 설정을 확인한 뒤 다시 시도해주세요.', [
            {text: '취소', style: 'cancel'},
            {text: '설정 열기', onPress: () => { Linking.openSettings().catch(() => undefined); }},
          ]);
        } else if (!isScanCanceled(scanError)) {
          Alert.alert('QR 스캔', getErrorMessage(scanError, 'QR 스캔을 시작하지 못했습니다. 카메라 권한과 기기 설정을 확인해주세요.'));
        }
        return;
      }

      invalidateFriendCodePreview();
      if (!navigation.isFocused()) {
        return;
      }
      const scannedFriendCode = parseFriendQrPayload(scanned.value);
      if (!scannedFriendCode) {
        Alert.alert('QR 코드 확인', '스쿠리 친구 QR 코드가 아니에요. 친구가 공유한 QR 코드를 다시 스캔해주세요.');
        return;
      }

      setFriendCode(scannedFriendCode);
      try {
        const result = await previewFriendCode(scannedFriendCode);
        if (result && navigation.isFocused()) {
          friendCodeInputRef.current?.blur();
          Keyboard.dismiss();
        }
      } catch (previewError) {
        if (navigation.isFocused()) {
          Alert.alert('친구 코드 확인', getErrorMessage(previewError, '친구 코드를 확인하지 못했습니다.'));
        }
      }
    } finally {
      setScanning(false);
    }
  }, [invalidateFriendCodePreview, navigation, previewFriendCode, scanning]);

  const handleSearch = React.useCallback(async () => {
    try {
      await searchFriends(nicknameQuery);
    } catch (searchError) {
      Alert.alert('친구 검색', getErrorMessage(searchError, '친구를 검색하지 못했습니다.'));
    }
  }, [nicknameQuery, searchFriends]);

  const duplicateResultIds = React.useMemo(
    () => getDuplicateFriendProfileIds(searchResults),
    [searchResults],
  );
  const hasDuplicateNickname = React.useMemo(() => {
    const nicknameCounts = new Map<string, number>();
    searchResults.forEach(result => {
      nicknameCounts.set(result.nickname, (nicknameCounts.get(result.nickname) ?? 0) + 1);
    });
    return [...nicknameCounts.values()].some(count => count > 1);
  }, [searchResults]);

  const handleSendRequest = React.useCallback(
    async (result: FriendSearchResult) => {
      try {
        const mutation = await sendFriendRequest(result.id);
        if (!mutation) {
          return;
        }
        invalidateData(FRIEND_HUB_INVALIDATION_KEY);
        if (mutation.status === 'ACCEPTED') {
          invalidateData(FRIEND_INBOX_COUNTS_INVALIDATION_KEY);
        }
        if (!navigation.isFocused()) {
          return;
        }
        if (mutation.status === 'ACCEPTED') {
          Alert.alert('친구가 되었어요', `${result.nickname}님과 친구가 되었습니다.`, [
            {text: '확인', onPress: () => navigation.goBack()},
          ]);
          return;
        }
        Alert.alert('친구 요청을 보냈어요', `${result.nickname}님의 수락을 기다려주세요.`, [
          {text: '확인', style: 'cancel'},
          {
            text: '요청 목록 보기',
            onPress: () => navigation.popTo('FriendHub', {initialTab: 'requests'}),
            style: 'default'
          },
        ]);
      } catch (requestError) {
        if (navigation.isFocused()) {
          Alert.alert('오류', getErrorMessage(requestError, '친구 요청을 보내지 못했습니다.'));
        }
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
            .then(() => {
              if (navigation.isFocused()) {
                Alert.alert('재발급 완료', '새 친구 코드가 발급되었습니다.');
              }
            })
            .catch(regenerateError => {
              if (navigation.isFocused()) {
                Alert.alert('오류', getErrorMessage(regenerateError, '친구 코드를 재발급하지 못했습니다.'));
              }
            });
        },
      },
    ]);
  }, [myCode?.canRegenerate, navigation, regenerateMyCode]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader onPressBack={() => navigation.goBack()} title="친구 추가" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={regenerating} onPress={handleCopyMyCode} style={styles.secondaryAction}>
                  <Icon color={COLORS.text.secondary} name="copy-outline" size={17} />
                  <Text style={styles.secondaryActionText}>복사</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={regenerating} onPress={() => { handleShareMyCode().catch(() => undefined); }} style={styles.secondaryAction}>
                  <Icon color={COLORS.text.secondary} name="share-social-outline" size={17} />
                  <Text style={styles.secondaryActionText}>공유</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel={showMyCodeQr ? '내 친구 QR 코드 닫기' : '내 친구 QR 코드 보기'}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => setShowMyCodeQr(current => !current)}
                  style={styles.secondaryAction}>
                  <Icon color={COLORS.text.secondary} name="qr-code-outline" size={17} />
                  <Text style={styles.secondaryActionText}>QR 코드</Text>
                </TouchableOpacity>
              </View>
              {showMyCodeQr ? (
                <Animated.View
                  entering={enteringTransitions.fadeInDown()}
                  exiting={exitingTransitions.fadeOutUp()}
                  style={styles.qrCodeContainer}>
                  <QRCode
                    backgroundColor={COLORS.background.surface}
                    color={COLORS.text.primary}
                    ecl="M"
                    quietZone={8}
                    size={172}
                    value={`${FRIEND_QR_PREFIX}${myCode.code}`}
                  />
                  <Text style={styles.qrCodeHint}>친구가 이 QR 코드를 스캔하면 친구 코드를 빠르게 확인할 수 있어요.</Text>
                </Animated.View>
              ) : null}
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
        <Animated.View layout={layoutTransitions.cardExpand()} style={styles.inputCard}>
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
              ref={friendCodeInputRef}
              style={styles.textInput}
              value={friendCode}
            />
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={previewing} onPress={() => { handlePreview().catch(() => undefined); }} style={styles.searchButton}>
              {previewing ? <ActivityIndicator color={COLORS.text.inverse} size="small" /> : <Text style={styles.searchButtonText}>확인</Text>}
            </TouchableOpacity>
          </View>
          {preview ? (
            <Animated.View
              entering={enteringTransitions.fadeInDown()}
              exiting={exitingTransitions.fadeOutUp()}>
              <SearchResultRow result={preview} loading={sendingFriendIds.has(preview.id)} onSend={() => { handleSendRequest(preview).catch(() => undefined); }} />
            </Animated.View>
          ) : null}
        </Animated.View>

        <Text style={styles.sectionTitle}>닉네임으로 찾기</Text>
        <Animated.View layout={layoutTransitions.cardExpand()} style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="친구 닉네임 검색"
              autoCorrect={false}
              onChangeText={value => {
                setNicknameQuery(value);
                resetSearch();
              }}
              placeholder="닉네임을 입력해주세요"
              placeholderTextColor={COLORS.text.placeholder}
              returnKeyType="done"
              style={styles.textInput}
              value={nicknameQuery}
            />
            <TouchableOpacity accessibilityLabel="검색" accessibilityRole="button" activeOpacity={0.82} disabled={searching} onPress={() => { handleSearch().catch(() => undefined); }} style={styles.searchButton}>
              {searching ? <ActivityIndicator color={COLORS.text.inverse} size="small" /> : <Icon color={COLORS.text.inverse} name="search" size={18} />}
            </TouchableOpacity>
          </View>
          {hasDuplicateNickname ? <Text style={styles.duplicateNicknameHint}>동일한 닉네임의 사용자가 있을 수 있어요. 학과와 식별 코드를 확인해주세요.</Text> : null}
          {searchResults.map(result => (
            <Animated.View
              entering={enteringTransitions.fadeInDown()}
              exiting={exitingTransitions.fadeOutUp()}
              key={result.id}
              layout={layoutTransitions.gentleExpand()}>
              <SearchResultRow discriminator={duplicateResultIds.has(result.id) ? result.id.slice(-6).toUpperCase() : undefined} result={result} loading={sendingFriendIds.has(result.id)} onSend={() => { handleSendRequest(result).catch(() => undefined); }} />
            </Animated.View>
          ))}
          {searchNextCursor ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} disabled={searching} onPress={() => { loadMoreSearchResults(nicknameQuery).catch(searchError => Alert.alert('친구 검색', getErrorMessage(searchError, '검색 결과를 더 불러오지 못했습니다.'))); }} style={styles.loadMoreButton}>{searching ? <ActivityIndicator color={COLORS.brand.primary} size="small" /> : <Text style={styles.loadMoreText}>더 보기</Text>}</TouchableOpacity> : null}
          {!searching && completedSearchQuery === nicknameQuery.trim() && searchResults.length === 0 ? <Text style={styles.emptySearch}>검색 결과가 없어요.</Text> : null}
        </Animated.View>
        <Text style={styles.sectionTitle}>QR 코드로 추가</Text>
        <TouchableOpacity
          accessibilityLabel="친구 QR 코드 스캔"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={scanning}
          onPress={() => {
            handleScanFriendQr().catch(() => undefined);
          }}
          style={styles.qrScanCard}>
          {scanning ? (
            <ActivityIndicator color={COLORS.brand.primary} />
          ) : (
            <Icon color={COLORS.accent.blue} name="qr-code-outline" size={28} />
          )}
          <View style={styles.qrScanContent}>
            <Text style={styles.qrScanTitle}>{scanning ? 'QR 스캔을 준비하고 있어요' : '친구 QR 코드 스캔'}</Text>
            <Text style={styles.qrScanDescription}>스쿠리 친구 QR 코드를 스캔한 뒤, 요청 전에 상대를 확인해요.</Text>
          </View>
          <Icon color={COLORS.text.muted} name="chevron-forward" size={20} />
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getRelationshipAction = (result: FriendSearchResult) => {
  switch (result.relationshipState) {
    case 'REQUESTABLE':
      return {enabled: true, label: '요청'};
    case 'INCOMING_PENDING':
      return {enabled: true, label: '수락'};
    case 'OUTGOING_PENDING':
      return {enabled: false, label: '요청 보냄'};
    case 'ALREADY_FRIEND':
      return {enabled: false, label: '이미 친구'};
  }
};

const SearchResultRow = ({discriminator, loading, onSend, result}: {discriminator?: string; loading: boolean; onSend: () => void; result: FriendSearchResult}) => {
  const action = getRelationshipAction(result);

  return <View style={styles.resultRow}>
    <FriendAvatar photoUrl={result.photoUrl} />
    <View style={styles.resultContent}>
      <Text style={styles.resultName}>{result.nickname}</Text>
      <Text style={styles.resultDepartment}>{result.department || '학과 정보 없음'}</Text>
      {discriminator ? <Text style={styles.resultDiscriminator}>식별 코드 · {discriminator}</Text> : null}
    </View>
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={loading || !action.enabled}
      onPress={onSend}
      style={[styles.requestButton, !action.enabled ? styles.disabledRequestButton : null]}>
      {loading ? <ActivityIndicator color={COLORS.brand.primary} size="small" /> : <Text style={[styles.requestButtonText, !action.enabled ? styles.disabledText : null]}>{action.label}</Text>}
    </TouchableOpacity>
  </View>
};

const styles = StyleSheet.create({
  safeArea: {backgroundColor: COLORS.background.page, flex: 1},
  keyboardAvoidingView: {flex: 1},
  content: {padding: SPACING.lg, paddingBottom: 40},
  sectionTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: SPACING.sm, marginTop: SPACING.lg, paddingHorizontal: 4},
  codeCard: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, minHeight: 158, padding: SPACING.xl, ...SHADOWS.card},
  code: {color: COLORS.brand.primaryStrong, fontSize: 24, fontWeight: '800', letterSpacing: 1.2, lineHeight: 32},
  codeHint: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.sm, textAlign: 'center'},
  codeActions: {flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg},
  secondaryAction: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: 6, height: 36, justifyContent: 'center', paddingHorizontal: SPACING.lg},
  secondaryActionText: {color: COLORS.text.secondary, fontSize: 13, fontWeight: '700'},
  regenerateButton: {marginTop: SPACING.lg, minHeight: 20},
  qrCodeContainer: {alignItems: 'center', borderTopColor: COLORS.border.subtle, borderTopWidth: 1, marginTop: SPACING.lg, paddingTop: SPACING.lg},
  qrCodeHint: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: SPACING.sm, textAlign: 'center'},
  regenerateText: {color: COLORS.text.muted, fontSize: 12, textDecorationLine: 'underline'},
  disabledText: {color: COLORS.text.muted},
  codeErrorContent: {alignItems: 'center', gap: SPACING.sm},
  codeErrorText: {color: COLORS.text.secondary, fontSize: 13, lineHeight: 20, textAlign: 'center'},
  retryCodeButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 36, justifyContent: 'center', paddingHorizontal: SPACING.lg},
  retryCodeButtonText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  inputCard: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, ...SHADOWS.card},
  inputRow: {alignItems: 'center', flexDirection: 'row', padding: SPACING.md},
  textInput: {backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, color: COLORS.text.primary, flex: 1, fontSize: 14, height: 44, paddingHorizontal: SPACING.md},
  searchButton: {alignItems: 'center', backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md, height: 44, justifyContent: 'center', marginLeft: SPACING.sm, minWidth: 50, paddingHorizontal: SPACING.md},
  searchButtonText: {color: COLORS.text.inverse, fontSize: 14, fontWeight: '700'},
  resultRow: {alignItems: 'center', borderTopColor: COLORS.border.subtle, borderTopWidth: 1, flexDirection: 'row', minHeight: 76, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md},
  resultContent: {flex: 1, marginLeft: SPACING.md},
  resultName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  resultDepartment: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  resultDiscriminator: {color: COLORS.text.placeholder, fontSize: 11, lineHeight: 16, marginTop: 1},
  duplicateNicknameHint: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.md},
  requestButton: {alignItems: 'center', backgroundColor: COLORS.brand.primaryTint, borderRadius: RADIUS.md, height: 34, justifyContent: 'center', minWidth: 58, paddingHorizontal: SPACING.sm},
  disabledRequestButton: {backgroundColor: COLORS.background.subtle},
  requestButtonText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  emptySearch: {color: COLORS.text.muted, fontSize: 13, padding: SPACING.lg, textAlign: 'center'},
  loadMoreButton: {alignItems: 'center', borderTopColor: COLORS.border.subtle, borderTopWidth: 1, height: 44, justifyContent: 'center'},
  loadMoreText: {color: COLORS.brand.primaryStrong, fontSize: 13, fontWeight: '700'},
  qrScanCard: {alignItems: 'center', backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, flexDirection: 'row', gap: SPACING.md, minHeight: 88, paddingHorizontal: SPACING.lg, ...SHADOWS.card},
  qrScanContent: {flex: 1},
  qrScanTitle: {color: COLORS.text.primary, fontSize: 14, fontWeight: '700', lineHeight: 20},
  qrScanDescription: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
});
