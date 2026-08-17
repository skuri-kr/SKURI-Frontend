import type {
  SubscriptionCallbacks,
  Unsubscribe,
} from '@/shared/types/subscription';

import type {TaxiRecruitDraft} from '../../model/taxiRecruitData';
import type {
  TaxiChatAccountMessageDraft,
  TaxiChatImageUploadInput,
  TaxiChatSessionSnapshot,
  TaxiChatSourceData,
} from '../../model/taxiChatViewData';

export interface ITaxiChatRepository {
  createPartyChat(draft: TaxiRecruitDraft): Promise<{partyId: string}>;
  getPartyChat(partyId: string): Promise<TaxiChatSourceData | null>;
  loadOlderMessages(partyId: string): Promise<void>;
  getSessionSnapshot(): TaxiChatSessionSnapshot;
  resetSession(): Promise<void>;
  sendAccountMessage(
    partyId: string,
    payload: TaxiChatAccountMessageDraft,
  ): Promise<TaxiChatSourceData | null>;
  sendMessage(
    partyId: string,
    messageText: string,
  ): Promise<TaxiChatSourceData | null>;
  sendImageMessage(
    partyId: string,
    imageUrl: string,
  ): Promise<TaxiChatSourceData | null>;
  updateMessage(
    partyId: string,
    messageId: string,
    text: string,
  ): Promise<TaxiChatSourceData | null>;
  deleteMessage(
    partyId: string,
    messageId: string,
  ): Promise<TaxiChatSourceData | null>;
  setCurrentParty(partyId: string): Promise<void>;
  subscribeToPartyChat(
    partyId: string,
    callbacks: SubscriptionCallbacks<TaxiChatSourceData | null>,
  ): Unsubscribe;
  subscribeToSession(listener: () => void): () => void;
  updateNotificationSetting(
    partyId: string,
    enabled: boolean,
  ): Promise<TaxiChatSourceData | null>;
  uploadImage(image: TaxiChatImageUploadInput): Promise<string>;
}
