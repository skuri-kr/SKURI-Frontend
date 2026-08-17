import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {useReportRepository} from '@/di';
import {useAuth} from '@/features/auth';
import type {ReportCategory} from '@/features/report';
import {StateCard} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {
  useKeyboardInset,
  usePlayChatSoundOnNewMessage,
  useScreenEnterAnimation,
  useScreenView,
} from '@/shared/hooks';
import {pickImageAsset} from '@/shared/lib/media/pickImageAsset';
import type {UserAccountInfo as AccountInfo} from '@/shared/types/user';
import {
  CHAT_COMPOSER_EDITING_BAR_HEIGHT,
  ChatHeader,
  ChatMessagePopupMenu,
  resolveChatMenuPosition,
  resolveCurrentMessage,
  restoreComposerDraftAfterEdit,
  type ChatMessageMenuState,
} from '@/shared/ui/chat';
import {isWithinChatMessageEditWindow} from '@/shared/ui/chat/chatMessageMutationPolicy';
import {ReportReasonModal} from '@/shared/ui/ReportReasonModal';

import {TaxiAccountSheet} from '../components/TaxiAccountSheet';
import {TaxiArriveSettlementSheet} from '../components/TaxiArriveSettlementSheet';
import {
  TAXI_CHAT_COMPOSER_BAR_HEIGHT,
  TaxiChatComposer,
} from '../components/TaxiChatComposer';
import {TaxiChatHeaderNotice} from '../components/TaxiChatHeaderNotice';
import {TaxiChatHeaderMenu} from '../components/TaxiChatHeaderMenu';
import {TaxiChatMessageList} from '../components/TaxiChatMessageList';
import {TaxiChatSummaryCard} from '../components/TaxiChatSummaryCard';
import {TaxiPartyEditSheet} from '../components/TaxiPartyEditSheet';
import {TaxiSettlementStatusSheet} from '../components/TaxiSettlementStatusSheet';
import {
  TaxiTaxiCallSheet,
  type TaxiCallProvider,
} from '../components/TaxiTaxiCallSheet';
import {useTaxiChatDetailData} from '../hooks/useTaxiChatDetailData';
import type {TaxiStackParamList} from '../model/navigation';
import type {
  TaxiChatAccountMessageViewData,
  TaxiChatActionTrayActionId,
  TaxiChatThreadItemViewData,
  TaxiChatTextMessageViewData,
} from '../model/taxiChatViewData';
import {
  CHAT_REPORT_CATEGORIES,
  submitChatMessageReport,
  submitTaxiPartyReport,
} from '@/features/chat/services/chatReportService';

type TaxiChatNavigationProp = NativeStackNavigationProp<
  TaxiStackParamList,
  'Chat'
>;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const logAccountSheetEvent = (
  event: string,
  details?: Record<string, unknown>,
) => {
  if (!__DEV__) {
    return;
  }

  console.log('[taxi-chat][account-sheet]', {
    event,
    ...details,
  });
};

const getTaxiCallUrl = ({
  destinationLat,
  destinationLng,
  provider,
}: {
  destinationLat: number;
  destinationLng: number;
  provider: TaxiCallProvider;
}) => {
  switch (provider) {
    case 'kakaoT':
      return `kakaot://taxi?&dest_lat=${destinationLat}&dest_lng=${destinationLng}`;
    case 'tmoneyGo':
      return 'tmoneygo://';
    case 'uber':
    default:
      return 'uber://';
  }
};

const getTaxiCallProviderLabel = (provider: TaxiCallProvider) => {
  switch (provider) {
    case 'kakaoT':
      return '카카오T';
    case 'tmoneyGo':
      return '티머니GO';
    case 'uber':
    default:
      return 'Uber';
  }
};

const getLatestPlayableMessageId = (
  items: TaxiChatThreadItemViewData[] | undefined,
) => {
  if (!items) {
    return null;
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (
      item.type === 'text-message' ||
      item.type === 'account-message' ||
      item.type === 'arrived-message'
    ) {
      return item.id;
    }
  }

  return null;
};

export const ChatScreen = () => {
  useScreenView();

  const navigation = useNavigation<TaxiChatNavigationProp>();
  const route =
    useRoute<NativeStackScreenProps<TaxiStackParamList, 'Chat'>['route']>();
  const reportRepository = useReportRepository();
  const insets = useSafeAreaInsets();
  const {height: keyboardHeight, isVisible: keyboardVisible} =
    useKeyboardInset();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const {user} = useAuth();
  const {
    actionInFlightId,
    cancelParty,
    closeParty,
    confirmSettlement,
    data,
    deleteMessage,
    endParty,
    error,
    hasOlderMessages,
    leaveParty,
    loadOlderMessages,
    loading,
    loadingOlderMessages,
    notificationTogglePending,
    reload,
    reopenParty,
    sendAccountMessage,
    sendImageMessage,
    sendMessage,
    startSettlement,
    toggleNotification,
    updateMessage,
    updateParty,
  } = useTaxiChatDetailData(route.params?.partyId);
  const [composerValue, setComposerValue] = React.useState('');
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [actionTrayVisible, setActionTrayVisible] = React.useState(false);
  const [taxiCallSheetVisible, setTaxiCallSheetVisible] = React.useState(false);
  const [accountSheetVisible, setAccountSheetVisible] = React.useState(false);
  const [editSheetVisible, setEditSheetVisible] = React.useState(false);
  const [arriveSheetVisible, setArriveSheetVisible] = React.useState(false);
  const [settlementSheetVisible, setSettlementSheetVisible] =
    React.useState(false);
  const [sessionAccountInfo, setSessionAccountInfo] =
    React.useState<AccountInfo | null>(null);
  const [sendingAccount, setSendingAccount] = React.useState(false);
  const [sendingImage, setSendingImage] = React.useState(false);
  const [messageMutationInFlight, setMessageMutationInFlight] =
    React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<{
    draft: string;
    id: string;
  } | null>(null);
  const [messageMenuState, setMessageMenuState] =
    React.useState<ChatMessageMenuState | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = React.useState(false);
  const [isReportVisible, setIsReportVisible] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [selectedReportCategory, setSelectedReportCategory] =
    React.useState<ReportCategory | null>(null);
  const [reportTarget, setReportTarget] = React.useState<
    {id: string; type: 'message'} | {id: string; type: 'party'} | null
  >(null);
  const accountInfo = user?.accountInfo ?? user?.account ?? null;
  const latestPlayableMessageId = React.useMemo(
    () => getLatestPlayableMessageId(data?.items),
    [data?.items],
  );
  const currentMessageMenuMessage = React.useMemo(() => {
    const item = resolveCurrentMessage(data?.items, messageMenuState);

    return item?.type === 'text-message' || item?.type === 'account-message'
      ? item
      : null;
  }, [data?.items, messageMenuState]);

  usePlayChatSoundOnNewMessage(data?.roomId, latestPlayableMessageId);

  const snapshotAccountInfo = React.useMemo<AccountInfo | null>(() => {
    const nextAccountInfo = data?.summary.settlementNotice?.accountData;

    if (!nextAccountInfo) {
      return null;
    }

    return {
      accountHolder: nextAccountInfo.accountHolder,
      accountNumber: nextAccountInfo.accountNumber,
      bankName: nextAccountInfo.bankName,
      hideName: nextAccountInfo.hideName,
    };
  }, [data?.summary.settlementNotice?.accountData]);

  const resolvedAccountInfo =
    sessionAccountInfo ?? snapshotAccountInfo ?? accountInfo;

  React.useEffect(() => {
    if ((data?.actionTrayActions.length ?? 0) === 0 && actionTrayVisible) {
      setActionTrayVisible(false);
    }
  }, [actionTrayVisible, data?.actionTrayActions.length]);

  const handlePressBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('TaxiMain');
  }, [navigation]);

  const runAction = React.useCallback(
    async ({
      fallbackMessage,
      onSuccess,
      task,
      title,
    }: {
      fallbackMessage: string;
      onSuccess?: () => void;
      task: () => Promise<void>;
      title: string;
    }) => {
      try {
        await task();
        onSuccess?.();
      } catch (actionError) {
        Alert.alert(title, getErrorMessage(actionError, fallbackMessage));
      }
    },
    [],
  );

  const handleLeaveParty = React.useCallback(() => {
    Alert.alert('파티 나가기', '현재 파티에서 나갈까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          runAction({
            fallbackMessage: '파티를 나가지 못했습니다.',
            onSuccess: () => {
              navigation.navigate('TaxiMain');
            },
            task: async () => {
              await leaveParty();
            },
            title: '파티 나가기 실패',
          }).catch(() => undefined);
        },
      },
    ]);
  }, [leaveParty, navigation, runAction]);

  const handleCloseReportModal = React.useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setIsReportVisible(false);
    setReportTarget(null);
    setSelectedReportCategory(null);
    setReportReason('');
  }, [isReportSubmitting]);

  const handleOpenPartyReport = React.useCallback(() => {
    if (!route.params?.partyId) {
      return;
    }

    setMenuVisible(false);
    setMessageMenuState(null);
    setReportTarget({id: route.params.partyId, type: 'party'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, [route.params?.partyId]);

  const handleLongPressMessage = React.useCallback(
    (
      message: TaxiChatAccountMessageViewData | TaxiChatTextMessageViewData,
      pageX: number,
      pageY: number,
    ) => {
      const isOwnMessage = message.direction === 'outgoing';
      const isDeleted =
        message.type === 'text-message' && Boolean(message.isDeleted);
      const canCopy =
        message.type === 'account-message' ||
        (!isDeleted && message.messageKind !== 'image');
      const canEdit =
        message.type === 'text-message' &&
        isOwnMessage &&
        !isDeleted &&
        message.messageKind === 'text' &&
        isWithinChatMessageEditWindow(message.createdAt);
      const canDelete = isOwnMessage && !isDeleted;
      const canReport = !isDeleted && !isOwnMessage;

      if (!canCopy && !canEdit && !canDelete && !canReport) {
        return;
      }

      setMenuVisible(false);
      const position = resolveChatMenuPosition({pageX, pageY});

      setMessageMenuState({
        messageId: message.id,
        ...position,
      });
    },
    [],
  );

  const handleCopyMessage = React.useCallback(() => {
    const message = currentMessageMenuMessage;

    if (!message) {
      return;
    }

    if (message.type === 'text-message' && message.messageKind === 'image') {
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
  }, [currentMessageMenuMessage]);

  const handleCancelEdit = React.useCallback(() => {
    if (!editingMessage || messageMutationInFlight) {
      return;
    }

    setComposerValue(editingMessage.draft);
    setEditingMessage(null);
  }, [editingMessage, messageMutationInFlight]);

  const handleEditMessage = React.useCallback(() => {
    const message = currentMessageMenuMessage;

    if (
      !message ||
      message.type !== 'text-message' ||
      message.direction !== 'outgoing' ||
      message.messageKind !== 'text' ||
      message.isDeleted ||
      !isWithinChatMessageEditWindow(message.createdAt)
    ) {
      return;
    }

    setMenuVisible(false);
    setActionTrayVisible(false);
    setMessageMenuState(null);
    setEditingMessage({
      draft: composerValue,
      id: message.id,
    });
    setComposerValue(message.text);
  }, [composerValue, currentMessageMenuMessage]);

  const handleDeleteMessage = React.useCallback(() => {
    const message = currentMessageMenuMessage;

    if (
      !message ||
      message.direction !== 'outgoing' ||
      ('isDeleted' in message && message.isDeleted) ||
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
                getErrorMessage(deleteError, '메시지를 삭제하지 못했습니다.'),
              );
            })
            .finally(() => {
              setMessageMutationInFlight(false);
            });
        },
      },
    ]);
  }, [deleteMessage, currentMessageMenuMessage, messageMutationInFlight]);

  const handleOpenMessageReport = React.useCallback(() => {
    const messageId = currentMessageMenuMessage?.id;

    if (!messageId) {
      return;
    }

    setMessageMenuState(null);
    setReportTarget({id: messageId, type: 'message'});
    setSelectedReportCategory(null);
    setReportReason('');
    setIsReportVisible(true);
  }, [currentMessageMenuMessage]);

  React.useEffect(() => {
    if (
      messageMenuState &&
      (!currentMessageMenuMessage ||
        (currentMessageMenuMessage.type === 'text-message' &&
          currentMessageMenuMessage.isDeleted))
    ) {
      setMessageMenuState(null);
    }
  }, [currentMessageMenuMessage, messageMenuState]);

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
        await submitTaxiPartyReport(
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

  const handleCancelParty = React.useCallback(() => {
    Alert.alert('파티 없애기', '파티를 취소하고 채팅을 종료할까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '파티 없애기',
        style: 'destructive',
        onPress: () => {
          runAction({
            fallbackMessage: '파티를 취소하지 못했습니다.',
            onSuccess: () => {
              navigation.navigate('TaxiMain');
            },
            task: async () => {
              await cancelParty();
            },
            title: '파티 취소 실패',
          }).catch(() => undefined);
        },
      },
    ]);
  }, [cancelParty, navigation, runAction]);

  const handleEndParty = React.useCallback(() => {
    Alert.alert('파티 종료', '정산을 마무리하고 파티를 종료할까요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '파티 종료',
        style: 'destructive',
        onPress: () => {
          runAction({
            fallbackMessage: '파티 종료에 실패했습니다.',
            task: async () => {
              await endParty();
            },
            title: '파티 종료 실패',
          }).catch(() => undefined);
        },
      },
    ]);
  }, [endParty, runAction]);

  const handleActionTrayAction = React.useCallback(
    (actionId: TaxiChatActionTrayActionId) => {
      setActionTrayVisible(false);

      if (actionId === 'callTaxi') {
        setTaxiCallSheetVisible(true);
        return;
      }

      if (actionId === 'sendAccount') {
        setAccountSheetVisible(true);
        return;
      }

      if (actionId === 'arrive') {
        setArriveSheetVisible(true);
        return;
      }

      if (actionId === 'settlementStatus') {
        setSettlementSheetVisible(true);
        return;
      }

      const actionConfig = {
        close: {
          confirmMessage: '새 동승 요청을 받지 않도록 모집을 마감할까요?',
          fallbackMessage: '모집 마감에 실패했습니다.',
          task: closeParty,
          title: '모집 마감',
        },
        end: {
          confirmMessage: '정산을 마무리하고 파티를 종료할까요?',
          fallbackMessage: '파티 종료에 실패했습니다.',
          task: endParty,
          title: '파티 종료',
        },
        reopen: {
          confirmMessage: '다시 동승 요청을 받을 수 있도록 모집을 재개할까요?',
          fallbackMessage: '모집 재개에 실패했습니다.',
          task: reopenParty,
          title: '모집 재개',
        },
      }[actionId];

      if (!actionConfig) {
        return;
      }

      Alert.alert(actionConfig.title, actionConfig.confirmMessage, [
        {text: '취소', style: 'cancel'},
        {
          text: '확인',
          onPress: () => {
            runAction({
              fallbackMessage: actionConfig.fallbackMessage,
              task: async () => {
                await actionConfig.task();
              },
              title: `${actionConfig.title} 실패`,
            }).catch(() => undefined);
          },
        },
      ]);
    },
    [closeParty, endParty, reopenParty, runAction],
  );

  const handleSubmitArrive = React.useCallback(
    (payload: {
      account: AccountInfo;
      settlementTargetMemberIds: string[];
      taxiFare: number;
    }) => {
      runAction({
        fallbackMessage: '도착 처리에 실패했습니다.',
        onSuccess: () => {
          setArriveSheetVisible(false);
        },
        task: async () => {
          setSessionAccountInfo(payload.account);
          await startSettlement(payload);
        },
        title: '도착 처리 실패',
      }).catch(() => undefined);
    },
    [runAction, startSettlement],
  );

  const handleSend = React.useCallback(
    async (messageText: string) => {
      if (messageMutationInFlight) {
        return;
      }

      try {
        if (editingMessage) {
          const submittedEdit = editingMessage;
          const submittedComposerValue = composerValue;

          setMessageMutationInFlight(true);
          await updateMessage(submittedEdit.id, messageText);
          setComposerValue(currentValue =>
            restoreComposerDraftAfterEdit({
              currentValue,
              previousDraft: submittedEdit.draft,
              submittedValue: submittedComposerValue,
            }),
          );
          setEditingMessage(null);
          return;
        }

        await sendMessage(messageText);
        setComposerValue('');
      } catch (sendError) {
        Alert.alert(
          editingMessage ? '메시지 수정 실패' : '메시지 전송 실패',
          getErrorMessage(
            sendError,
            editingMessage
              ? '메시지를 수정하지 못했습니다.'
              : '메시지를 전송하지 못했습니다.',
          ),
        );
      } finally {
        setMessageMutationInFlight(false);
      }
    },
    [
      composerValue,
      editingMessage,
      messageMutationInFlight,
      sendMessage,
      updateMessage,
    ],
  );

  const handlePickImage = React.useCallback(async () => {
    if (sendingImage) {
      return;
    }

    const image = await pickImageAsset();

    if (!image) {
      return;
    }

    try {
      setSendingImage(true);
      await sendImageMessage({
        fileName: image.fileName,
        mimeType: image.mimeType,
        uri: image.uri,
      });
    } catch (sendError) {
      Alert.alert(
        '이미지 전송 실패',
        getErrorMessage(sendError, '이미지를 전송하지 못했습니다.'),
      );
    } finally {
      setSendingImage(false);
    }
  }, [sendImageMessage, sendingImage]);

  const handleSelectTaxiCallProvider = React.useCallback(
    async (provider: TaxiCallProvider) => {
      if (!data) {
        return;
      }

      const url = getTaxiCallUrl({
        destinationLat: data.summary.destinationLocation.lat,
        destinationLng: data.summary.destinationLocation.lng,
        provider,
      });
      const providerLabel = getTaxiCallProviderLabel(provider);

      try {
        const canOpen = await Linking.canOpenURL(url);

        if (!canOpen) {
          Alert.alert(
            '앱 실행 불가',
            `${providerLabel} 앱을 열 수 없습니다. 설치 여부와 딥링크 설정을 확인해주세요.`,
          );
          return;
        }

        await Linking.openURL(url);
        setTaxiCallSheetVisible(false);
      } catch (linkError) {
        Alert.alert(
          '택시 호출 실패',
          getErrorMessage(
            linkError,
            `${providerLabel} 앱을 열지 못했습니다. 다시 시도해주세요.`,
          ),
        );
      }
    },
    [data],
  );

  const handleSubmitAccount = React.useCallback(
    async ({
      accountHolder,
      accountNumber,
      bankName,
      hideName,
      remember,
    }: {
      accountHolder: string;
      accountNumber: string;
      bankName: string;
      hideName: boolean;
      remember: boolean;
    }) => {
      const nextAccountInfo: AccountInfo = {
        accountHolder,
        accountNumber,
        bankName,
        hideName,
      };

      logAccountSheetEvent('submit-start', {
        bankName,
        hideName,
        remember,
      });
      setSendingAccount(true);

      try {
        await sendAccountMessage({
          ...nextAccountInfo,
          remember,
        });
        logAccountSheetEvent('submit-success', {
          bankName,
          hideName,
          remember,
        });
        setSessionAccountInfo(nextAccountInfo);
        setAccountSheetVisible(false);
      } catch (submitError) {
        logAccountSheetEvent('submit-error', {
          bankName,
          error:
            submitError instanceof Error ? submitError.message : submitError,
          hideName,
          remember,
        });
        Alert.alert(
          '계좌 전송 실패',
          getErrorMessage(submitError, '계좌 정보를 전송하지 못했습니다.'),
        );
      } finally {
        logAccountSheetEvent('submit-finally', {
          bankName,
          hideName,
          remember,
        });
        setSendingAccount(false);
      }
    },
    [sendAccountMessage],
  );

  const settlementMembers = data?.summary.members ?? [];
  const threadBottomPadding =
    TAXI_CHAT_COMPOSER_BAR_HEIGHT +
    (editingMessage ? CHAT_COMPOSER_EDITING_BAR_HEIGHT : 0) +
    insets.bottom +
    SPACING.md +
    keyboardHeight;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        {data ? (
          <ChatHeader
            header={data.header}
            onPressBack={handlePressBack}
            onPressMenu={() => setMenuVisible(previousValue => !previousValue)}
          />
        ) : (
          <View style={[styles.headerPlaceholder, {paddingTop: insets.top}]} />
        )}

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={COLORS.brand.primary} size="large" />
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
              title="파티 채팅을 불러오지 못했습니다"
            />
          </View>
        ) : data ? (
          <>
            <TaxiChatHeaderNotice
              settlementNotice={data.summary.settlementNotice}
            />

            <View style={styles.threadWrap}>
              <TaxiChatMessageList
                autoScrollKey={keyboardHeight}
                bottomOverlayInset={threadBottomPadding}
                contentContainerStyle={[
                  styles.threadContent,
                  {
                    paddingTop: threadBottomPadding,
                  },
                ]}
                hasOlderMessages={hasOlderMessages}
                headerContent={<TaxiChatSummaryCard summary={data.summary} />}
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
                onPressEndPartyExit={handlePressBack}
              />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'position' : 'height'}
              keyboardVerticalOffset={0}
              pointerEvents="box-none"
              style={styles.composerOverlay}>
              <TaxiChatComposer
                actionTrayActions={data.actionTrayActions}
                actionTrayVisible={actionTrayVisible}
                editing={
                  editingMessage ? {onCancel: handleCancelEdit} : undefined
                }
                imageButtonDisabled={sendingImage || Boolean(editingMessage)}
                keyboardVisible={keyboardVisible}
                onChangeText={setComposerValue}
                onPressAction={handleActionTrayAction}
                onPressImage={() => {
                  handlePickImage().catch(() => undefined);
                }}
                onPressToggleTray={() => {
                  setActionTrayVisible(current => !current);
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
        ) : null}

        {data ? (
          <TaxiChatHeaderMenu
            canCancelParty={data.menu.canCancelParty}
            canEditParty={data.menu.canEditParty}
            canLeave={Boolean(data.menu.canLeave)}
            canReport
            destructiveActionLabel={
              data.summary.partyStatus === 'open' ||
              data.summary.partyStatus === 'closed'
                ? '파티 없애기'
                : '파티 종료'
            }
            notificationDisabled={notificationTogglePending}
            notificationEnabled={data.menu.notificationEnabled}
            onClose={() => setMenuVisible(false)}
            onEditParty={() => {
              if (!data.menu.canEditParty) {
                Alert.alert(
                  '수정 불가',
                  '모집 중 또는 모집 마감 상태에서만 수정할 수 있습니다.',
                );
                return;
              }

              setEditSheetVisible(true);
            }}
            onPressDestructiveAction={() => {
              if (data.summary.partyStatus === 'ended') {
                handlePressBack();
                return;
              }

              if (
                data.summary.partyStatus === 'open' ||
                data.summary.partyStatus === 'closed'
              ) {
                handleCancelParty();
                return;
              }

              handleEndParty();
            }}
            onLeaveParty={handleLeaveParty}
            onReport={handleOpenPartyReport}
            onToggleNotification={() => {
              toggleNotification().catch(toggleError => {
                Alert.alert(
                  '알림 설정 실패',
                  getErrorMessage(
                    toggleError,
                    '알림 설정을 변경하지 못했습니다.',
                  ),
                );
              });
            }}
            visible={menuVisible}
          />
        ) : null}

        {data ? (
          <>
            <TaxiTaxiCallSheet
              onClose={() => {
                setTaxiCallSheetVisible(false);
              }}
              onSelectProvider={provider => {
                handleSelectTaxiCallProvider(provider).catch(() => undefined);
              }}
              visible={taxiCallSheetVisible}
            />

            <TaxiAccountSheet
              initialAccountInfo={resolvedAccountInfo}
              loading={sendingAccount}
              onClose={() => {
                setAccountSheetVisible(false);
              }}
              onSubmit={payload => {
                handleSubmitAccount(payload).catch(() => undefined);
              }}
              visible={accountSheetVisible}
            />

            <TaxiPartyEditSheet
              initialDepartureTimeISO={data.summary.departureTimeISO}
              initialDetail={data.summary.detail}
              loading={actionInFlightId === 'edit'}
              onClose={() => {
                setEditSheetVisible(false);
              }}
              onSubmit={payload => {
                runAction({
                  fallbackMessage: '파티 수정에 실패했습니다.',
                  onSuccess: () => {
                    setEditSheetVisible(false);
                  },
                  task: async () => {
                    await updateParty(payload);
                  },
                  title: '파티 수정 실패',
                }).catch(() => undefined);
              }}
              visible={editSheetVisible}
            />

            <TaxiArriveSettlementSheet
              initialAccountInfo={resolvedAccountInfo}
              loading={actionInFlightId === 'arrive'}
              members={settlementMembers}
              onClose={() => {
                setArriveSheetVisible(false);
              }}
              onSubmit={handleSubmitArrive}
              visible={arriveSheetVisible}
            />

            <TaxiSettlementStatusSheet
              isLeader={data.summary.management.isLeader}
              loadingActionId={actionInFlightId}
              notice={data.summary.settlementNotice}
              onClose={() => {
                setSettlementSheetVisible(false);
              }}
              onConfirmMember={memberId => {
                runAction({
                  fallbackMessage: '정산 확인에 실패했습니다.',
                  task: async () => {
                    await confirmSettlement(memberId);
                  },
                  title: '정산 확인 실패',
                }).catch(() => undefined);
              }}
              visible={settlementSheetVisible}
            />
          </>
        ) : null}

        <ChatMessagePopupMenu
          canCopy={Boolean(
            currentMessageMenuMessage &&
              (currentMessageMenuMessage.type === 'account-message' ||
                (!currentMessageMenuMessage.isDeleted &&
                  currentMessageMenuMessage.messageKind !== 'image')),
          )}
          canDelete={Boolean(
            currentMessageMenuMessage &&
              currentMessageMenuMessage.direction === 'outgoing' &&
              (currentMessageMenuMessage.type === 'account-message' ||
                !currentMessageMenuMessage.isDeleted),
          )}
          canEdit={Boolean(
            currentMessageMenuMessage &&
              currentMessageMenuMessage.type === 'text-message' &&
              currentMessageMenuMessage.direction === 'outgoing' &&
              !currentMessageMenuMessage.isDeleted &&
              currentMessageMenuMessage.messageKind === 'text' &&
              isWithinChatMessageEditWindow(
                currentMessageMenuMessage.createdAt,
              ),
          )}
          canReport={Boolean(
            currentMessageMenuMessage &&
              currentMessageMenuMessage.direction !== 'outgoing' &&
              (currentMessageMenuMessage.type === 'account-message' ||
                !currentMessageMenuMessage.isDeleted),
          )}
          onClose={() => setMessageMenuState(null)}
          onCopy={handleCopyMessage}
          onDelete={handleDeleteMessage}
          onEdit={handleEditMessage}
          onReport={handleOpenMessageReport}
          right={messageMenuState?.right ?? 12}
          top={messageMenuState?.top ?? 64}
          visible={Boolean(messageMenuState && currentMessageMenuMessage)}
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
            reportTarget?.type === 'message' ? '메시지 신고' : '택시파티 신고'
          }
          visible={isReportVisible}
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
  composerOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
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
  screen: {
    flex: 1,
  },
  threadContainer: {
    flex: 1,
  },
  threadContent: {
    paddingBottom: SPACING.md,
  },
  threadWrap: {
    flex: 1,
  },
});
