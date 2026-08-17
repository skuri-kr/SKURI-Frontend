import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {navigateToCampusScreen} from '@/app/navigation/services/campusEntryNavigation';
import type {CommunityStackParamList} from '@/app/navigation/types';
import {useReportRepository} from '@/di';
import type {ReportCategory} from '@/features/report';
import {
  ChatDetailSkeleton,
  DetailNotFoundState,
  StateCard,
} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {
  usePlayChatSoundOnNewMessage,
  useScreenEnterAnimation,
  useScreenView,
} from '@/shared/hooks';
import {pickImageAsset} from '@/shared/lib/media/pickImageAsset';
import Button from '@/shared/ui/Button';
import {
  ChatComposerBar,
  ChatHeader,
  ChatMessagePopupMenu,
  ChatMessageList,
  ChatPopupMenu,
  resolveChatMenuPosition,
  type ChatThreadItemViewData,
  type ChatThreadMessageViewData,
} from '@/shared/ui/chat';
import {isWithinChatMessageEditWindow} from '@/shared/ui/chat/chatMessageMutationPolicy';
import {ReportReasonModal} from '@/shared/ui/ReportReasonModal';
import {MinecraftServerGuideModal} from '@/features/minecraft/components/MinecraftServerGuideModal';
import {
  GUIDE_SERVER_ADDRESS_FALLBACK,
  MINECRAFT_CHAT_ROOM_ID,
} from '@/features/minecraft/constants/minecraftGuide';
import {useMinecraftServerOverview} from '@/features/minecraft/hooks/useMinecraftServerOverview';

import {useChatDetailData} from '../hooks/useChatDetailData';
import type {ChatStackParamList} from '../model/navigation';
import {
  CHAT_REPORT_CATEGORIES,
  submitChatMessageReport,
  submitChatRoomReport,
} from '../services/chatReportService';

type ChatDetailNavigationProp = NativeStackNavigationProp<
  CommunityStackParamList,
  'ChatDetail'
>;

const getLatestPlayableMessageId = (
  items: ChatThreadItemViewData[] | undefined,
) => {
  if (!items) {
    return null;
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (item.type === 'text-message') {
      return item.id;
    }
  }

  return null;
};

export const ChatDetailScreen = () => {
  useScreenView();

  const navigation = useNavigation<ChatDetailNavigationProp>();
  const route =
    useRoute<
      NativeStackScreenProps<ChatStackParamList, 'ChatDetail'>['route']
    >();
  const reportRepository = useReportRepository();
  const insets = useSafeAreaInsets();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const {
    data,
    error,
    hasOlderMessages,
    joinRoom,
    leaveRoom,
    loadOlderMessages,
    loading,
    loadingOlderMessages,
    membershipLoading,
    notificationTogglePending,
    notFound,
    reload,
    sendMessage,
    sendImageMessage,
    toggleNotification,
    updateMessage,
    deleteMessage,
  } = useChatDetailData(route.params?.chatRoomId);
  const {serverUrl} = useMinecraftServerOverview();
  const [composerValue, setComposerValue] = React.useState('');
  const [imageSending, setImageSending] = React.useState(false);
  const [messageMutationInFlight, setMessageMutationInFlight] =
    React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<{
    draft: string;
    id: string;
  } | null>(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [messageMenuState, setMessageMenuState] = React.useState<{
    message: ChatThreadMessageViewData;
    right: number;
    top: number;
  } | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = React.useState(false);
  const [isReportVisible, setIsReportVisible] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [selectedReportCategory, setSelectedReportCategory] =
    React.useState<ReportCategory | null>(null);
  const [isMinecraftGuideVisible, setMinecraftGuideVisible] =
    React.useState(false);
  const [reportTarget, setReportTarget] = React.useState<
    {id: string; type: 'message'} | {id: string; type: 'room'} | null
  >(null);
  const isMinecraftChatRoom =
    route.params?.chatRoomId === MINECRAFT_CHAT_ROOM_ID;
  const guideServerAddress = serverUrl || GUIDE_SERVER_ADDRESS_FALLBACK;
  const latestPlayableMessageId = React.useMemo(
    () => getLatestPlayableMessageId(data?.items),
    [data?.items],
  );

  usePlayChatSoundOnNewMessage(data?.roomId, latestPlayableMessageId);

  const navigateToCommunityChat = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('BoardMain', {
      initialSegment: 'chat',
    });
  }, [navigation]);

  const handlePressBack = navigateToCommunityChat;

  const handleOpenMinecraftGuide = React.useCallback(() => {
    setMinecraftGuideVisible(true);
  }, []);

  const handleCloseMinecraftGuide = React.useCallback(() => {
    setMinecraftGuideVisible(false);
  }, []);

  const handlePressMinecraftAccountRegistration = React.useCallback(() => {
    setMinecraftGuideVisible(false);
    navigateToCampusScreen(navigation, 'MinecraftAccount');
  }, [navigation]);

  const handleSend = React.useCallback(
    async (messageText: string) => {
      if (messageMutationInFlight) {
        return;
      }

      try {
        if (editingMessage) {
          setMessageMutationInFlight(true);
          await updateMessage(editingMessage.id, messageText);
          setComposerValue(editingMessage.draft);
          setEditingMessage(null);
          return;
        }

        await sendMessage(messageText);
        setComposerValue('');
      } catch (sendError) {
        Alert.alert(
          editingMessage ? '메시지 수정 실패' : '메시지 전송 실패',
          sendError instanceof Error
            ? sendError.message
            : editingMessage
            ? '메시지를 수정하지 못했습니다.'
            : '메시지를 전송하지 못했습니다.',
        );
      } finally {
        setMessageMutationInFlight(false);
      }
    },
    [editingMessage, messageMutationInFlight, sendMessage, updateMessage],
  );

  const handleCancelEdit = React.useCallback(() => {
    if (!editingMessage || messageMutationInFlight) {
      return;
    }

    setComposerValue(editingMessage.draft);
    setEditingMessage(null);
  }, [editingMessage, messageMutationInFlight]);

  const handleEditMessage = React.useCallback(() => {
    const message = messageMenuState?.message;

    if (
      !message ||
      message.direction !== 'outgoing' ||
      message.messageKind !== 'text' ||
      message.isDeleted ||
      isMinecraftChatRoom ||
      !isWithinChatMessageEditWindow(message.createdAt)
    ) {
      return;
    }

    setMenuVisible(false);
    setMessageMenuState(null);
    setEditingMessage({
      draft: composerValue,
      id: message.id,
    });
    setComposerValue(message.text);
  }, [composerValue, isMinecraftChatRoom, messageMenuState]);

  const handleDeleteMessage = React.useCallback(() => {
    const message = messageMenuState?.message;

    if (
      !message ||
      message.direction !== 'outgoing' ||
      message.isDeleted ||
      isMinecraftChatRoom ||
      messageMutationInFlight
    ) {
      return;
    }

    setMessageMenuState(null);
    Alert.alert('메시지 삭제', '이 메시지를 삭제할까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setMessageMutationInFlight(true);
          deleteMessage(message.id)
            .catch(deleteError => {
              Alert.alert(
                '메시지 삭제 실패',
                deleteError instanceof Error
                  ? deleteError.message
                  : '메시지를 삭제하지 못했습니다.',
              );
            })
            .finally(() => {
              setMessageMutationInFlight(false);
            });
        },
      },
    ]);
  }, [
    deleteMessage,
    isMinecraftChatRoom,
    messageMenuState,
    messageMutationInFlight,
  ]);

  const handleJoin = React.useCallback(async () => {
    try {
      await joinRoom();
    } catch (joinError) {
      Alert.alert(
        '참여하기 실패',
        joinError instanceof Error
          ? joinError.message
          : '채팅방에 참여하지 못했습니다.',
      );
    }
  }, [joinRoom]);

  const handlePickImage = React.useCallback(async () => {
    if (imageSending) {
      return;
    }

    const image = await pickImageAsset();

    if (!image) {
      return;
    }

    try {
      setImageSending(true);
      await sendImageMessage({
        fileName: image.fileName,
        mimeType: image.mimeType,
        uri: image.uri,
      });
    } catch (sendError) {
      Alert.alert(
        '이미지 전송 실패',
        sendError instanceof Error
          ? sendError.message
          : '이미지를 전송하지 못했습니다.',
      );
    } finally {
      setImageSending(false);
    }
  }, [imageSending, sendImageMessage]);

  const handleLeave = React.useCallback(() => {
    Alert.alert('채팅방 나가기', '채팅방에서 나갈까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          leaveRoom()
            .then(() => {
              setComposerValue('');
              setMenuVisible(false);
              navigateToCommunityChat();
            })
            .catch(leaveError => {
              Alert.alert(
                '채팅방 나가기 실패',
                leaveError instanceof Error
                  ? leaveError.message
                  : '채팅방에서 나가지 못했습니다.',
              );
            });
        },
      },
    ]);
  }, [leaveRoom, navigateToCommunityChat]);

  const handleCloseReportModal = React.useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setIsReportVisible(false);
    setReportTarget(null);
    setSelectedReportCategory(null);
    setReportReason('');
  }, [isReportSubmitting]);

  const handleOpenRoomReport = React.useCallback(() => {
    if (!route.params?.chatRoomId) {
      return;
    }

    setMenuVisible(false);
    setMessageMenuState(null);
    setReportTarget({id: route.params.chatRoomId, type: 'room'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, [route.params?.chatRoomId]);

  const handleLongPressMessage = React.useCallback(
    (message: ChatThreadMessageViewData, pageX: number, pageY: number) => {
      const isOwnMessage = message.direction === 'outgoing';
      const canCopy = !message.isDeleted && message.messageKind !== 'image';
      const canEdit =
        !isMinecraftChatRoom &&
        isOwnMessage &&
        !message.isDeleted &&
        message.messageKind === 'text' &&
        isWithinChatMessageEditWindow(message.createdAt);
      const canDelete =
        !isMinecraftChatRoom && isOwnMessage && !message.isDeleted;
      const canReport = !message.isDeleted && !isOwnMessage;

      if (!canCopy && !canEdit && !canDelete && !canReport) {
        return;
      }

      setMenuVisible(false);
      const position = resolveChatMenuPosition({pageX, pageY});

      setMessageMenuState({
        message,
        ...position,
      });
    },
    [isMinecraftChatRoom],
  );

  const handleCopyMessage = React.useCallback(() => {
    const message = messageMenuState?.message;

    if (!message) {
      return;
    }

    if (message.messageKind === 'image') {
      Alert.alert('복사 불가', '이미지 메시지는 복사할 수 없습니다.');
      return;
    }

    const text = message.text.trim();

    if (!text) {
      Alert.alert('복사 불가', '복사할 텍스트가 없습니다.');
      return;
    }

    Clipboard.setString(text);
    Alert.alert('복사 완료', '메시지가 클립보드에 복사되었습니다.');
  }, [messageMenuState]);

  const handleOpenMessageReport = React.useCallback(() => {
    const messageId = messageMenuState?.message.id;

    if (!messageId) {
      return;
    }

    setMessageMenuState(null);
    setReportTarget({id: messageId, type: 'message'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, [messageMenuState]);

  const handleSubmitReport = React.useCallback(async () => {
    if (!reportTarget) {
      return;
    }

    if (!selectedReportCategory) {
      Alert.alert('신고 유형 선택', '신고 유형을 선택해주세요.');
      return;
    }

    if (!reportReason.trim()) {
      Alert.alert('신고 사유 입력', '신고 사유를 입력해주세요.');
      return;
    }

    try {
      setIsReportSubmitting(true);

      if (reportTarget.type === 'message') {
        await submitChatMessageReport(
          reportRepository,
          reportTarget.id,
          selectedReportCategory,
          reportReason,
        );
      } else {
        await submitChatRoomReport(
          reportRepository,
          reportTarget.id,
          selectedReportCategory,
          reportReason,
        );
      }

      handleCloseReportModal();
      Alert.alert(
        '신고 접수 완료',
        '신고가 접수되었습니다. 운영팀이 확인 후 처리할 예정입니다.',
      );
    } catch (caughtError) {
      Alert.alert(
        '신고 접수 실패',
        caughtError instanceof Error
          ? caughtError.message
          : '신고 접수에 실패했습니다.',
      );
    } finally {
      setIsReportSubmitting(false);
    }
  }, [
    handleCloseReportModal,
    reportReason,
    reportRepository,
    reportTarget,
    selectedReportCategory,
  ]);

  const canOpenRoomMenu = Boolean(
    data &&
      (data.menu.canLeave ||
        data.menu.canReport ||
        data.menu.canToggleNotification),
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        {data ? (
          <ChatHeader
            header={data.header}
            onPressBack={handlePressBack}
            onPressMenu={
              canOpenRoomMenu
                ? () => setMenuVisible(previousValue => !previousValue)
                : undefined
            }
          />
        ) : (
          <View style={[styles.headerPlaceholder, {paddingTop: insets.top}]} />
        )}

        {loading ? (
          <ChatDetailSkeleton />
        ) : notFound ? (
          <View style={styles.centeredState}>
            <DetailNotFoundState
              actionLabel="목록으로 돌아가기"
              onPressAction={handlePressBack}
              title="채팅방을 찾을 수 없어요"
            />
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
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
              title="채팅 상세를 불러오지 못했습니다"
            />
          </View>
        ) : data ? (
          data.mode === 'preview' && data.preview ? (
            <View
              style={[
                styles.previewWrap,
                isMinecraftChatRoom
                  ? styles.previewWrapWithGuideButton
                  : undefined,
              ]}>
              <View style={styles.previewCard}>
                <View style={styles.previewStatusPill}>
                  <Text style={styles.previewStatusLabel}>
                    {data.preview.statusLabel}
                  </Text>
                </View>

                <Text style={styles.previewDescription}>
                  {data.header.title}
                </Text>
                <Text style={styles.previewHelperText}>
                  {data.preview.description}
                </Text>

                <View style={styles.previewInfoRow}>
                  <View style={styles.previewInfoItem}>
                    <Icon
                      color={COLORS.text.muted}
                      name="people-outline"
                      size={16}
                    />
                    <Text style={styles.previewInfoText}>
                      {data.preview.memberCountLabel}
                    </Text>
                  </View>

                  <View style={styles.previewInfoItem}>
                    <Icon
                      color={COLORS.text.muted}
                      name="time-outline"
                      size={16}
                    />
                    <Text style={styles.previewInfoText}>
                      {data.preview.timeLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewMessageCard}>
                  <Text style={styles.previewMessageCaption}>최근 메시지</Text>
                  <Text style={styles.previewMessageText}>
                    {data.preview.lastMessageText}
                  </Text>
                </View>

                <Button
                  loading={membershipLoading}
                  onPress={handleJoin}
                  style={styles.previewJoinButton}
                  title={data.preview.joinLabel}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.threadWrap}>
                <ChatMessageList
                  contentContainerStyle={[
                    styles.threadContent,
                    isMinecraftChatRoom
                      ? styles.threadContentWithGuideButton
                      : undefined,
                  ]}
                  hasOlderMessages={hasOlderMessages}
                  items={data.items}
                  loadingOlderMessages={loadingOlderMessages}
                  onLoadOlderMessages={loadOlderMessages}
                  onLongPressMessage={(message, event) => {
                    handleLongPressMessage(
                      message,
                      event.nativeEvent.pageX,
                      event.nativeEvent.pageY,
                    );
                  }}
                />
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}>
                <ChatComposerBar
                  editing={
                    editingMessage ? {onCancel: handleCancelEdit} : undefined
                  }
                  imageButtonDisabled={imageSending || Boolean(editingMessage)}
                  onChangeText={setComposerValue}
                  onPressImage={() => {
                    handlePickImage().catch(() => undefined);
                  }}
                  onSend={handleSend}
                  placeholder={
                    editingMessage
                      ? '수정할 메시지를 입력하세요'
                      : data.composerPlaceholder
                  }
                  sendDisabled={messageMutationInFlight}
                  value={composerValue}
                />
              </KeyboardAvoidingView>
            </>
          )
        ) : null}

        {isMinecraftChatRoom ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={handleOpenMinecraftGuide}
            style={[
              styles.minecraftGuideFloatingButton,
              {top: insets.top + 68},
            ]}>
            <Icon
              color={COLORS.text.inverse}
              name="compass-outline"
              size={16}
            />
            <Text style={styles.minecraftGuideFloatingButtonText}>
              서버 접속 방법
            </Text>
          </TouchableOpacity>
        ) : null}

        {data ? (
          <ChatPopupMenu
            canReport={data.menu.canReport}
            canToggleNotification={data.menu.canToggleNotification}
            leaveLabel={data.menu.leaveLabel}
            notificationDisabled={notificationTogglePending}
            notificationEnabled={data.menu.notificationEnabled}
            onClose={() => setMenuVisible(false)}
            onLeave={data.menu.canLeave ? handleLeave : undefined}
            onReport={handleOpenRoomReport}
            onToggleNotification={() => {
              toggleNotification().catch(() => undefined);
            }}
            visible={menuVisible}
          />
        ) : null}

        <ChatMessagePopupMenu
          canCopy={Boolean(
            messageMenuState &&
              !messageMenuState.message.isDeleted &&
              messageMenuState.message.messageKind !== 'image',
          )}
          canDelete={Boolean(
            messageMenuState &&
              !isMinecraftChatRoom &&
              !messageMenuState.message.isDeleted &&
              messageMenuState.message.direction === 'outgoing',
          )}
          canEdit={Boolean(
            messageMenuState &&
              !isMinecraftChatRoom &&
              !messageMenuState.message.isDeleted &&
              messageMenuState.message.direction === 'outgoing' &&
              messageMenuState.message.messageKind === 'text' &&
              isWithinChatMessageEditWindow(messageMenuState.message.createdAt),
          )}
          canReport={Boolean(
            messageMenuState &&
              !messageMenuState.message.isDeleted &&
              messageMenuState.message.direction !== 'outgoing',
          )}
          onClose={() => setMessageMenuState(null)}
          onCopy={handleCopyMessage}
          onDelete={handleDeleteMessage}
          onEdit={handleEditMessage}
          onReport={handleOpenMessageReport}
          right={messageMenuState?.right ?? 12}
          top={messageMenuState?.top ?? 64}
          visible={messageMenuState !== null}
        />

        <ReportReasonModal
          categories={CHAT_REPORT_CATEGORIES}
          onChangeReason={setReportReason}
          onClose={handleCloseReportModal}
          onSelectCategory={setSelectedReportCategory}
          onSubmit={() => {
            handleSubmitReport().catch(() => undefined);
          }}
          reason={reportReason}
          selectedCategory={selectedReportCategory}
          submitting={isReportSubmitting}
          title={
            reportTarget?.type === 'message' ? '메시지 신고' : '채팅방 신고'
          }
          visible={isReportVisible}
        />

        <MinecraftServerGuideModal
          onClose={handleCloseMinecraftGuide}
          onPressAccountRegistration={handlePressMinecraftAccountRegistration}
          serverAddress={guideServerAddress}
          visible={isMinecraftGuideVisible}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centeredState: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  headerPlaceholder: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  previewCard: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: 24,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  previewDescription: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: SPACING.sm,
  },
  previewHelperText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  previewInfoItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  previewInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  previewInfoText: {
    color: COLORS.text.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  previewJoinButton: {
    marginTop: SPACING.md,
  },
  previewMessageCaption: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  previewMessageCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: 18,
    padding: SPACING.lg,
  },
  previewMessageText: {
    color: COLORS.text.strong,
    fontSize: 15,
    lineHeight: 22,
  },
  previewStatusLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  previewStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.brand.primarySoft,
    borderRadius: 999,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  previewWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  previewWrapWithGuideButton: {
    paddingTop: SPACING.xxl + 40,
  },
  screen: {
    flex: 1,
  },
  minecraftGuideFloatingButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    ...SHADOWS.floating,
  },
  minecraftGuideFloatingButtonText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginLeft: SPACING.xs,
  },
  threadContent: {
    paddingBottom: SPACING.md,
  },
  threadContentWithGuideButton: {
    paddingBottom: 56,
  },
  threadWrap: {
    flex: 1,
  },
});
