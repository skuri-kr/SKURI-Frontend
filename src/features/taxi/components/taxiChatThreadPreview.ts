import type {ChatThreadNewMessagePreviewViewData} from '@/shared/ui/chat/types';

import type {TaxiChatThreadItemViewData} from '../model/taxiChatViewData';

export const getTaxiChatNewMessagePreview = (
  item: TaxiChatThreadItemViewData,
): ChatThreadNewMessagePreviewViewData | null => {
  if (item.type === 'text-message') {
    return {
      id: item.id,
      senderName: item.senderName,
      text: item.messageKind === 'image' ? '사진을 보냈어요.' : item.text,
    };
  }

  if (item.type === 'account-message') {
    return {
      id: item.id,
      senderName: item.senderName,
      text: '계좌 정보를 보냈어요.',
    };
  }

  return null;
};

export const isTaxiChatOutgoingItem = (item: TaxiChatThreadItemViewData) =>
  (item.type === 'text-message' || item.type === 'account-message') &&
  item.direction === 'outgoing';
