import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import {ChatAvatar} from './ChatAvatar';
import {MessageImageBubble} from './MessageImageBubble';
import {ChatThreadScrollActions} from './ChatThreadScrollActions';
import type {
  ChatThreadDateDividerViewData,
  ChatThreadItemViewData,
  ChatThreadMessageViewData,
  ChatThreadNewMessagePreviewViewData,
  ChatThreadSystemMessageViewData,
} from './types';

interface ChatThreadCoreProps<
  TItem extends {id: string; type: string} = ChatThreadItemViewData,
> {
  autoScrollKey?: number | string
  bottomOverlayInset?: number
  contentContainerStyle?: StyleProp<ViewStyle>
  getNewMessagePreview?: (
    item: TItem,
  ) => ChatThreadNewMessagePreviewViewData | null
  headerContent?: React.ReactNode
  hasOlderItems?: boolean
  items: TItem[]
  isCurrentUserItem?: (item: TItem) => boolean
  loadingOlderItems?: boolean
  onLoadOlderItems?: () => Promise<void> | void
  onLongPressMessage?: (
    item: ChatThreadMessageViewData,
    event: GestureResponderEvent,
  ) => void
  renderCustomItem?: (item: TItem, index: number) => React.ReactNode
}

const isDateDivider = (
  item: {type: string},
): item is ChatThreadDateDividerViewData => item.type === 'date-divider';

const isSystemMessage = (
  item: {type: string},
): item is ChatThreadSystemMessageViewData => item.type === 'system-message';

const isTextMessage = (
  item: {type: string},
): item is ChatThreadMessageViewData => item.type === 'text-message';

const getPreviousMessage = <TItem extends {type: string}>(
  items: TItem[],
  index: number,
) => {
  for (let itemIndex = index - 1; itemIndex >= 0; itemIndex -= 1) {
    const item = items[itemIndex];

    if (!item || !isTextMessage(item)) {
      return null;
    }

    return item;
  }

  return null;
};

const getNextMessage = <TItem extends {type: string}>(
  items: TItem[],
  index: number,
) => {
  for (let itemIndex = index + 1; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];

    if (!item || !isTextMessage(item)) {
      return null;
    }

    return item;
  }

  return null;
};

const isSameGroup = (
  currentMessage: ChatThreadMessageViewData,
  adjacentMessage: ChatThreadMessageViewData | null,
) =>
  Boolean(
    adjacentMessage &&
      adjacentMessage.direction === currentMessage.direction &&
      adjacentMessage.senderId === currentMessage.senderId &&
      adjacentMessage.minuteKey === currentMessage.minuteKey,
  );

const LOAD_OLDER_THRESHOLD = 200;
const AUTO_SCROLL_DISTANCE = 72;

interface PendingOlderScrollRestore {
  contentHeight: number
  firstItemId: string
  offsetY: number
}

export const ChatThreadCore = <
  TItem extends {id: string; type: string} = ChatThreadItemViewData,
>({
  autoScrollKey,
  bottomOverlayInset = SPACING.lg,
  contentContainerStyle,
  getNewMessagePreview,
  headerContent,
  hasOlderItems = false,
  items,
  isCurrentUserItem,
  loadingOlderItems = false,
  onLoadOlderItems,
  onLongPressMessage,
  renderCustomItem,
}: ChatThreadCoreProps<TItem>) => {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const loadOlderInFlightRef = React.useRef(false);
  const pendingOlderScrollRestoreRef =
    React.useRef<PendingOlderScrollRestore | null>(null);
  const previousItemCountRef = React.useRef(0);
  const previousLastItemIdRef = React.useRef<string | undefined>(undefined);
  const previousAutoScrollKeyRef = React.useRef<number | string | undefined>(
    autoScrollKey,
  );
  const isNearBottomRef = React.useRef(true);
  const [isBeyondViewport, setIsBeyondViewport] = React.useState(false);
  const [newMessagePreview, setNewMessagePreview] =
    React.useState<ChatThreadNewMessagePreviewViewData | null>(null);
  const lastItemId = items[items.length - 1]?.id;

  const scrollToBottom = React.useCallback((animated = true) => {
    setNewMessagePreview(null);
    setIsBeyondViewport(false);
    isNearBottomRef.current = true;
    scrollViewRef.current?.scrollToEnd({animated});
  }, []);

  const handleContentSizeChange = React.useCallback(
    (_contentWidth: number, contentHeight: number) => {
      const pendingRestore = pendingOlderScrollRestoreRef.current;

      if (!pendingRestore || contentHeight <= pendingRestore.contentHeight) {
        return;
      }

      const originalFirstItemIndex = items.findIndex(
        item => item.id === pendingRestore.firstItemId,
      );

      if (originalFirstItemIndex <= 0) {
        return;
      }

      pendingOlderScrollRestoreRef.current = null;
      scrollViewRef.current?.scrollTo({
        animated: false,
        y:
          pendingRestore.offsetY +
          (contentHeight - pendingRestore.contentHeight),
      });
    },
    [items],
  );

  React.useEffect(() => {
    const previousItemCount = previousItemCountRef.current;
    const previousLastItemId = previousLastItemIdRef.current;
    const receivedInitialItems = previousItemCount === 0 && items.length > 0;
    const appendedItems =
      items.length > previousItemCount &&
      previousItemCount > 0 &&
      lastItemId !== previousLastItemId;
    const lastItem = items[items.length - 1];

    previousItemCountRef.current = items.length;
    previousLastItemIdRef.current = lastItemId;

    if (receivedInitialItems) {
      scrollToBottom(false);
      return;
    }

    if (!appendedItems || !lastItem) {
      return;
    }

    if (isNearBottomRef.current || isCurrentUserItem?.(lastItem)) {
      scrollToBottom();
      return;
    }

    const preview = getNewMessagePreview?.(lastItem);

    if (preview) {
      setNewMessagePreview(preview);
    }
  }, [getNewMessagePreview, isCurrentUserItem, items, lastItemId, scrollToBottom]);

  React.useEffect(() => {
    const previousAutoScrollKey = previousAutoScrollKeyRef.current;
    previousAutoScrollKeyRef.current = autoScrollKey;

    if (
      previousAutoScrollKey !== autoScrollKey &&
      isNearBottomRef.current
    ) {
      scrollToBottom(false);
    }
  }, [autoScrollKey, scrollToBottom]);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
      const distanceFromBottom = Math.max(
        0,
        contentSize.height - layoutMeasurement.height - contentOffset.y,
      );
      const isNearBottom = distanceFromBottom <= AUTO_SCROLL_DISTANCE;
      const nextIsBeyondViewport =
        distanceFromBottom > layoutMeasurement.height;

      isNearBottomRef.current = isNearBottom;

      setIsBeyondViewport(previousValue =>
        previousValue === nextIsBeyondViewport
          ? previousValue
          : nextIsBeyondViewport,
      );

      if (isNearBottom) {
        setNewMessagePreview(previousPreview =>
          previousPreview ? null : previousPreview,
        );
      }

      if (
        !onLoadOlderItems ||
        !hasOlderItems ||
        loadingOlderItems ||
        loadOlderInFlightRef.current ||
        contentOffset.y > LOAD_OLDER_THRESHOLD
      ) {
        return;
      }

      loadOlderInFlightRef.current = true;
      const firstItemId = items[0]?.id;

      if (firstItemId) {
        pendingOlderScrollRestoreRef.current = {
          contentHeight: contentSize.height,
          firstItemId,
          offsetY: contentOffset.y,
        };
      }

      Promise.resolve()
        .then(onLoadOlderItems)
        .catch(() => {
          pendingOlderScrollRestoreRef.current = null;
        })
        .finally(() => {
          loadOlderInFlightRef.current = false;
        });
    },
    [hasOlderItems, items, loadingOlderItems, onLoadOlderItems],
  );

  return (
    <View style={styles.threadContainer}>
      <ScrollView
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        ref={scrollViewRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator>
      {onLoadOlderItems ? (
        <View
          accessibilityLabel={
            loadingOlderItems ? '이전 메시지 불러오는 중' : undefined
          }
          accessibilityRole={loadingOlderItems ? 'progressbar' : undefined}
          style={styles.loadingOlderWrap}>
          {loadingOlderItems ? (
            <ActivityIndicator color={COLORS.brand.primary} size="small" />
          ) : null}
        </View>
      ) : null}

      {headerContent}

        {items.map((item, index) => {
        if (isDateDivider(item)) {
          return (
            <View key={item.id} style={styles.dateDividerRow}>
              <View style={styles.dateDividerLine} />
              <Text style={styles.dateDividerLabel}>{item.label}</Text>
              <View style={styles.dateDividerLine} />
            </View>
          );
        }

        if (isSystemMessage(item)) {
          return (
            <View key={item.id} style={styles.systemMessageWrap}>
              <Text style={styles.systemMessageLabel}>{item.text}</Text>
            </View>
          );
        }

        if (!isTextMessage(item)) {
          const customItem = renderCustomItem?.(item, index);

          if (customItem == null) {
            return null;
          }

          return <React.Fragment key={item.id}>{customItem}</React.Fragment>;
        }

        const previousMessage = getPreviousMessage(items, index);
        const nextMessage = getNextMessage(items, index);
        const isGroupStart = !isSameGroup(item, previousMessage);
        const isGroupEnd = !isSameGroup(item, nextMessage);
        const wrapperStyle =
          item.direction === 'outgoing'
            ? styles.outgoingMessageWrap
            : styles.incomingMessageWrap;

        if (item.direction === 'outgoing') {
          return (
            <View
              key={item.id}
              style={[
                styles.messageWrap,
                wrapperStyle,
                !isGroupEnd ? styles.messageWrapCompact : null,
                isGroupStart ? styles.messageWrapSpaced : null,
              ]}>
              <View style={styles.outgoingRow}>
                {isGroupEnd ? (
                  <Text style={[styles.timeLabel, styles.outgoingTimeLabel]}>
                    {item.timeLabel}
                  </Text>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.92}
                  delayLongPress={220}
                  disabled={!onLongPressMessage || Boolean(item.imageUrl)}
                  style={styles.pressableBubble}
                  onLongPress={event => {
                    onLongPressMessage?.(item, event);
                  }}>
                  <View
                    style={[
                      styles.bubble,
                      styles.outgoingBubble,
                      item.messageKind === 'image' ? styles.imageBubble : null,
                    ]}>
                    {item.imageUrl ? (
                      <MessageImageBubble
                        onLongPress={event => {
                          onLongPressMessage?.(item, event);
                        }}
                        uri={item.imageUrl}
                      />
                    ) : (
                      <Text style={[styles.messageText, styles.outgoingMessageText]}>
                        {item.text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        return (
          <View
            key={item.id}
            style={[
              styles.messageWrap,
              wrapperStyle,
              !isGroupEnd ? styles.messageWrapCompact : null,
              isGroupStart ? styles.messageWrapSpaced : null,
            ]}>
            <View style={styles.incomingRow}>
              <View style={styles.avatarWrap}>
                {isGroupStart ? <ChatAvatar avatar={item.avatar} /> : <ChatAvatar />}
              </View>

              <View style={styles.incomingContent}>
                {isGroupStart ? (
                  <Text style={styles.senderName}>{item.senderName}</Text>
                ) : null}
                <View style={styles.incomingBubbleRow}>
                  <TouchableOpacity
                    activeOpacity={0.92}
                    delayLongPress={220}
                    disabled={!onLongPressMessage || Boolean(item.imageUrl)}
                    style={styles.pressableBubble}
                    onLongPress={event => {
                      onLongPressMessage?.(item, event);
                    }}>
                    <View
                      style={[
                        styles.bubble,
                        styles.incomingBubble,
                        item.messageKind === 'image' ? styles.imageBubble : null,
                      ]}>
                      {item.imageUrl ? (
                        <MessageImageBubble
                          onLongPress={event => {
                            onLongPressMessage?.(item, event);
                          }}
                          uri={item.imageUrl}
                        />
                      ) : (
                        <Text style={styles.messageText}>{item.text}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {isGroupEnd ? (
                    <Text style={styles.timeLabel}>{item.timeLabel}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        );
        })}
      </ScrollView>

      <ChatThreadScrollActions
        bottomInset={bottomOverlayInset}
        newMessagePreview={newMessagePreview}
        onPressScrollToBottom={scrollToBottom}
        showScrollToBottom={isBeyondViewport}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarWrap: {
    width: 36,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  dateDividerLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
  },
  dateDividerLine: {
    backgroundColor: COLORS.border.default,
    flex: 1,
    height: 1,
  },
  dateDividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: SPACING.md,
  },
  imageBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  incomingBubble: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  incomingBubbleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  incomingContent: {
    flex: 1,
  },
  incomingMessageWrap: {
    alignItems: 'flex-start',
  },
  incomingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  loadingOlderWrap: {
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: SPACING.xs,
  },
  messageText: {
    color: COLORS.text.primary,
    fontSize: 14,
    lineHeight: 22,
  },
  messageWrap: {
    marginBottom: SPACING.xs,
    marginTop: 0,
  },
  messageWrapCompact: {
    marginBottom: SPACING.xs,
  },
  messageWrapSpaced: {
    marginTop: SPACING.sm,
  },
  outgoingBubble: {
    backgroundColor: COLORS.brand.primary,
    borderTopRightRadius: 4,
  },
  outgoingMessageText: {
    color: COLORS.text.inverse,
  },
  outgoingMessageWrap: {
    alignItems: 'flex-end',
  },
  outgoingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  pressableBubble: {
    flexShrink: 1,
    maxWidth: '82%',
  },
  outgoingTimeLabel: {
    textAlign: 'right',
  },
  senderName: {
    color: COLORS.text.strong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  systemMessageLabel: {
    backgroundColor: COLORS.background.grayLight,
    borderRadius: RADIUS.md,
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
    textAlign: 'center',
  },
  systemMessageWrap: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  timeLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  threadContainer: {
    flex: 1,
  },
});
