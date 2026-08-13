import React from 'react';
import type {
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

import {ChatThreadCore} from './ChatThreadCore';
import type {
  ChatThreadItemViewData,
  ChatThreadMessageViewData,
} from './types';

interface ChatMessageListProps {
  autoScrollKey?: number | string
  bottomOverlayInset?: number
  contentContainerStyle?: StyleProp<ViewStyle>
  hasOlderMessages?: boolean
  headerContent?: React.ReactNode
  items: ChatThreadItemViewData[]
  loadingOlderMessages?: boolean
  onLoadOlderMessages?: () => Promise<void> | void
  onLongPressMessage?: (
    item: ChatThreadMessageViewData,
    event: GestureResponderEvent,
  ) => void
}

export const ChatMessageList = ({
  autoScrollKey,
  bottomOverlayInset,
  contentContainerStyle,
  hasOlderMessages,
  headerContent,
  items,
  loadingOlderMessages,
  onLoadOlderMessages,
  onLongPressMessage,
}: ChatMessageListProps) => {
  return (
    <ChatThreadCore
      autoScrollKey={autoScrollKey}
      bottomOverlayInset={bottomOverlayInset}
      contentContainerStyle={contentContainerStyle}
      getNewMessagePreview={item => {
        if (item.type !== 'text-message') {
          return null;
        }

        return {
          id: item.id,
          senderName: item.senderName,
          text: item.messageKind === 'image' ? '사진을 보냈어요.' : item.text,
        };
      }}
      hasOlderItems={hasOlderMessages}
      headerContent={headerContent}
      items={items}
      isCurrentUserItem={item =>
        item.type === 'text-message' && item.direction === 'outgoing'
      }
      loadingOlderItems={loadingOlderMessages}
      onLoadOlderItems={onLoadOlderMessages}
      onLongPressMessage={onLongPressMessage}
    />
  );
};
