import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Alert,
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {
  COLORS,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import Button from '@/shared/ui/Button';
import {ChatAvatar, ChatThreadCore} from '@/shared/ui/chat';

import type {
  TaxiChatAccountMessageViewData,
  TaxiChatTextMessageViewData,
  TaxiChatThreadItemViewData,
} from '../model/taxiChatViewData';
import {
  getTaxiChatNewMessagePreview,
  isTaxiChatOutgoingItem,
} from './taxiChatThreadPreview';

interface TaxiChatMessageListProps {
  autoScrollKey?: number | string;
  bottomOverlayInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  hasOlderMessages?: boolean;
  headerContent?: React.ReactNode;
  items: TaxiChatThreadItemViewData[];
  loadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<void> | void;
  onLongPressMessage?: (
    item: TaxiChatAccountMessageViewData | TaxiChatTextMessageViewData,
    event: GestureResponderEvent,
  ) => void;
  onPressEndPartyExit?: () => void;
}

const copyToClipboard = (value: string, message: string) => {
  Clipboard.setString(value);
  Alert.alert('복사 완료', message);
};

const formatMaskedAccountHolder = (accountHolder: string, hideName: boolean) => {
  if (!hideName) {
    return accountHolder;
  }

  if (accountHolder.length <= 1) {
    return accountHolder;
  }

  return `${accountHolder.slice(0, 1)}${'*'.repeat(accountHolder.length - 1)}`;
};

export const TaxiChatMessageList = ({
  autoScrollKey,
  bottomOverlayInset,
  contentContainerStyle,
  hasOlderMessages,
  headerContent,
  items,
  loadingOlderMessages,
  onLongPressMessage,
  onLoadOlderMessages,
  onPressEndPartyExit,
}: TaxiChatMessageListProps) => {
  return (
    <ChatThreadCore
      autoScrollKey={autoScrollKey}
      bottomOverlayInset={bottomOverlayInset}
      contentContainerStyle={contentContainerStyle}
      getNewMessagePreview={getTaxiChatNewMessagePreview}
      hasOlderItems={hasOlderMessages}
      headerContent={headerContent}
      items={items}
      isCurrentUserItem={isTaxiChatOutgoingItem}
      loadingOlderItems={loadingOlderMessages}
      onLoadOlderItems={onLoadOlderMessages}
      onLongPressMessage={onLongPressMessage}
      renderCustomItem={item => {
        if (item.type === 'end-message') {
          return (
            <View style={styles.specialWrap}>
              <View style={styles.endCard}>
                <View style={styles.endCardContent}>
                  <Icon
                    color={COLORS.status.success}
                    name="checkmark-circle-outline"
                    size={18}
                  />
                  <Text style={styles.endCardLabel}>{item.text}</Text>
                </View>

                {onPressEndPartyExit ? (
                  <Button
                    onPress={onPressEndPartyExit}
                    size="small"
                    style={styles.endLeaveButton}
                    textStyle={styles.endLeaveButtonText}
                    title="파티 나가기"
                    variant="secondary"
                  />
                ) : null}
              </View>
            </View>
          );
        }

        if (item.type === 'account-message') {
          const accountHolderLabel = formatMaskedAccountHolder(
            item.accountData.accountHolder,
            item.accountData.hideName,
          );
          const isOutgoing = item.direction === 'outgoing';
          const accountIconColor = isOutgoing
            ? 'rgba(255,255,255,0.9)'
            : COLORS.accent.blue;

          return (
            <View style={styles.messageWrap}>
              {isOutgoing ? (
                <View style={styles.accountMessageRow}>
                  <View style={styles.accountTimeWrap}>
                    <Text style={styles.accountTimeLabel}>{item.timeLabel}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.92}
                    delayLongPress={220}
                    disabled={!onLongPressMessage}
                    onLongPress={event => {
                      onLongPressMessage?.(item, event);
                    }}>
                    <View
                      style={[styles.accountBubble, styles.accountBubbleOutgoing]}>
                      <View style={styles.accountBubbleBody}>
                        <View style={styles.accountBubbleTitleRow}>
                          <Icon
                            color={accountIconColor}
                            name="wallet"
                            size={14}
                            style={styles.accountBubbleTitleIcon}
                          />
                          <Text
                            style={[
                              styles.accountBubbleTitle,
                              styles.accountBubbleTitleOutgoing,
                            ]}>
                            계좌 정보
                          </Text>
                        </View>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.accountBubbleHolder,
                            styles.accountBubbleHolderOutgoing,
                          ]}>
                          {accountHolderLabel}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.accountBubbleBank,
                            styles.accountBubbleBankOutgoing,
                          ]}>
                          {item.accountData.bankName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.accountBubbleNumber,
                            styles.accountBubbleNumberOutgoing,
                          ]}>
                          {item.accountData.accountNumber}
                        </Text>
                      </View>

                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.84}
                        onPress={() => {
                          copyToClipboard(
                            item.accountData.accountNumber,
                            '계좌번호가 복사되었습니다.',
                          );
                        }}
                        style={[
                          styles.accountBubbleCopyButton,
                          styles.accountBubbleCopyButtonOutgoing,
                        ]}>
                        <Text
                          style={[
                            styles.accountBubbleCopyLabel,
                            styles.accountBubbleCopyLabelOutgoing,
                          ]}>
                          계좌번호 복사
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.incomingRow}>
                  <View style={styles.avatarWrap}>
                    <ChatAvatar avatar={item.avatar} />
                  </View>

                  <View style={styles.incomingContent}>
                    <Text style={styles.senderName}>{item.senderName}</Text>

                    <View style={styles.accountIncomingBubbleRow}>
                      <TouchableOpacity
                        activeOpacity={0.92}
                        delayLongPress={220}
                        disabled={!onLongPressMessage}
                        onLongPress={event => {
                          onLongPressMessage?.(item, event);
                        }}>
                        <View
                          style={[styles.accountBubble, styles.accountBubbleIncoming]}>
                          <View style={styles.accountBubbleBody}>
                            <View style={styles.accountBubbleTitleRow}>
                              <Icon
                                color={accountIconColor}
                                name="wallet"
                                size={14}
                                style={styles.accountBubbleTitleIcon}
                              />
                              <Text
                                style={[
                                  styles.accountBubbleTitle,
                                  styles.accountBubbleTitleIncoming,
                                ]}>
                                계좌 정보
                              </Text>
                            </View>

                            <Text
                              numberOfLines={1}
                              style={[
                                styles.accountBubbleHolder,
                                styles.accountBubbleHolderIncoming,
                              ]}>
                              {accountHolderLabel}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.accountBubbleBank,
                                styles.accountBubbleBankIncoming,
                              ]}>
                              {item.accountData.bankName}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.accountBubbleNumber,
                                styles.accountBubbleNumberIncoming,
                              ]}>
                              {item.accountData.accountNumber}
                            </Text>
                          </View>

                          <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.84}
                            onPress={() => {
                              copyToClipboard(
                                item.accountData.accountNumber,
                                '계좌번호가 복사되었습니다.',
                              );
                            }}
                            style={[
                              styles.accountBubbleCopyButton,
                              styles.accountBubbleCopyButtonIncoming,
                            ]}>
                            <Text
                              style={[
                                styles.accountBubbleCopyLabel,
                                styles.accountBubbleCopyLabelIncoming,
                              ]}>
                              계좌번호 복사
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      <Text style={styles.accountTimeLabel}>{item.timeLabel}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        }

        if (item.type === 'arrived-message') {
          const arrivedAccountHolder = item.accountData
            ? formatMaskedAccountHolder(
                item.accountData.accountHolder,
                item.accountData.hideName,
              )
            : undefined;
          const arrivedAccountLabel = item.accountLabel;

          return (
            <View style={styles.specialWrap}>
              <View style={styles.arrivedCardStack}>
                <LinearGradient
                  colors={['#2BCB7E', '#17B96E']}
                  end={{x: 1, y: 1}}
                  start={{x: 0, y: 0}}
                  style={styles.arrivedHeaderCard}>
                  <View style={styles.arrivedHeaderRow}>
                    <View style={styles.arrivedIconWrap}>
                      <Icon
                        color={COLORS.text.inverse}
                        name="location"
                        size={20}
                      />
                    </View>
                    <View style={styles.arrivedHeaderCopy}>
                      <Text style={styles.arrivedHeaderTitle}>
                        택시가 목적지에 도착했어요!
                      </Text>
                      <Text style={styles.arrivedHeaderTime}>{item.timeLabel}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.arrivedBodyCard}>
                  <View style={styles.arrivedBody}>
                    <View style={styles.arrivedInfoRow}>
                      <Text style={styles.arrivedInfoLabel}>총 택시비</Text>
                      <Text style={styles.arrivedInfoValue}>
                        {item.taxiFare
                          ? `${item.taxiFare.toLocaleString('ko-KR')}원`
                          : '미정'}
                      </Text>
                    </View>

                    <View
                      style={[styles.arrivedInfoRow, styles.arrivedInfoRowSpaced]}>
                      <Text style={styles.arrivedInfoLabel}>N빵 인원</Text>
                      <Text numberOfLines={1} style={styles.arrivedSplitMemberLabel}>
                        {item.splitMemberSummaryLabel ??
                          (item.splitMemberCount
                            ? `${item.splitMemberCount}명`
                            : '미정')}
                      </Text>
                    </View>

                    <View
                      style={[styles.arrivedInfoRow, styles.arrivedInfoRowSpaced]}>
                      <Text style={styles.arrivedAmountLabel}>1인당 금액</Text>
                      <Text style={styles.arrivedAmountValue}>
                        {item.perPersonAmount
                          ? `${item.perPersonAmount.toLocaleString('ko-KR')}원`
                          : '미정'}
                      </Text>
                    </View>

                    <View style={styles.arrivedDivider} />

                    {arrivedAccountLabel ? (
                      <View style={styles.arrivedAccountCard}>
                        <Text style={styles.arrivedAccountCardLabel}>송금 계좌</Text>
                        {arrivedAccountHolder ? (
                          <Text style={styles.arrivedAccountCardHolder}>
                            {arrivedAccountHolder}
                          </Text>
                        ) : null}
                        <Text style={styles.arrivedAccountCardValue}>
                          {arrivedAccountLabel.replace(' ', ' · ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {arrivedAccountLabel ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.84}
                      onPress={() => {
                        copyToClipboard(
                          arrivedAccountLabel,
                          '정산 계좌가 복사되었습니다.',
                        );
                      }}
                      style={styles.arrivedCopyButton}>
                      <Icon
                        color={COLORS.status.success}
                        name="copy-outline"
                        size={14}
                      />
                      <Text style={styles.arrivedCopyLabel}>계좌번호 복사</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }

        return null;
      }}
    />
  );
};

const styles = StyleSheet.create({
  accountBubble: {
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  accountBubbleBank: {
    fontSize: 12,
    lineHeight: 16,
  },
  accountBubbleBankIncoming: {
    color: COLORS.text.muted,
  },
  accountBubbleBankOutgoing: {
    color: 'rgba(255,255,255,0.8)',
  },
  accountBubbleBody: {
    paddingBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  accountBubbleCopyButton: {
    alignItems: 'center',
    height: 33,
    justifyContent: 'center',
    paddingBottom: 8,
    paddingTop: 9,
  },
  accountBubbleCopyButtonIncoming: {
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
  },
  accountBubbleCopyButtonOutgoing: {
    borderTopColor: 'rgba(255,255,255,0.2)',
    borderTopWidth: 1,
  },
  accountBubbleCopyLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  accountBubbleCopyLabelIncoming: {
    color: COLORS.accent.blue,
  },
  accountBubbleCopyLabelOutgoing: {
    color: 'rgba(255,255,255,0.8)',
  },
  accountBubbleHolder: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  accountBubbleHolderIncoming: {
    color: COLORS.text.primary,
  },
  accountBubbleHolderOutgoing: {
    color: COLORS.text.inverse,
  },
  accountBubbleIncoming: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderTopLeftRadius: 2,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    maxWidth: 156,
    minWidth: 156,
  },
  accountBubbleNumber: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  accountBubbleNumberIncoming: {
    color: COLORS.text.strong,
  },
  accountBubbleNumberOutgoing: {
    color: COLORS.text.inverse,
  },
  accountBubbleOutgoing: {
    backgroundColor: COLORS.brand.primary,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: 2,
    minWidth: 104,
  },
  accountBubbleTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  accountBubbleTitleIcon: {
    height: 14,
    width: 15,
  },
  accountBubbleTitleIncoming: {
    color: COLORS.text.secondary,
  },
  accountBubbleTitleOutgoing: {
    color: 'rgba(255,255,255,0.9)',
  },
  accountBubbleTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  accountIncomingBubbleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  accountMessageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  accountTimeLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  accountTimeWrap: {
    paddingBottom: 2,
  },
  arrivedAccountCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  arrivedAccountCardHolder: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  arrivedAccountCardLabel: {
    color: COLORS.text.placeholder,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 4,
  },
  arrivedAccountCardValue: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  arrivedAmountLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  arrivedAmountValue: {
    color: COLORS.status.success,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  arrivedBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrivedBodyCard: {
    backgroundColor: COLORS.background.surface,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
  arrivedCardStack: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    width: '100%',
    ...SHADOWS.card,
  },
  arrivedCopyButton: {
    alignItems: 'center',
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 41,
    justifyContent: 'center',
  },
  arrivedCopyLabel: {
    color: COLORS.status.success,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  arrivedDivider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginTop: 8,
  },
  arrivedHeaderCard: {
    alignSelf: 'stretch',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    width: '100%',
  },
  arrivedHeaderCopy: {
    gap: 2,
  },
  arrivedHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  arrivedHeaderTime: {
    color: 'rgba(255,255,255,0.7)',
    ...TYPOGRAPHY.caption2,
  },
  arrivedHeaderTitle: {
    color: COLORS.text.inverse,
    ...TYPOGRAPHY.body1,
    fontWeight: '700',
  },
  arrivedIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  arrivedInfoLabel: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  arrivedInfoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arrivedInfoRowSpaced: {
    marginTop: 8,
  },
  arrivedInfoValue: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  arrivedSplitMemberLabel: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginLeft: SPACING.md,
    textAlign: 'right',
  },
  avatarWrap: {
    width: 36,
  },
  endCard: {
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.border.accent,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    width: '100%',
  },
  endCardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  endCardLabel: {
    color: COLORS.status.success,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  endLeaveButton: {
    alignSelf: 'stretch',
    borderColor: COLORS.status.danger,
    marginTop: SPACING.md,
  },
  endLeaveButtonText: {
    color: COLORS.status.danger,
    fontWeight: '700',
  },
  incomingContent: {
    flex: 1,
  },
  incomingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  messageWrap: {
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  senderName: {
    color: COLORS.text.strong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  specialWrap: {
    alignSelf: 'stretch',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
});
