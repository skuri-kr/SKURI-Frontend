import type {ContentDetailBadgeTone} from '@/shared/types/contentDetailViewData';

export interface InquiryHistoryItemViewData {
  adminAnswer?: string;
  attachmentCountLabel?: string;
  content: string;
  createdAtLabel: string;
  id: string;
  statusLabel: string;
  statusTone: ContentDetailBadgeTone;
  subject: string;
  thumbnailUri?: string;
  typeLabel: string;
  typeTone: ContentDetailBadgeTone;
}

export interface InquiryHistoryScreenViewData {
  countLabel: string;
  items: InquiryHistoryItemViewData[];
  title: string;
}
