export type InquiryTypeDto =
  | 'ACCOUNT'
  | 'BUG'
  | 'FEATURE'
  | 'OTHER'
  | 'SERVICE';

export interface InquiryAttachmentDto {
  height: number;
  mime: string;
  size: number;
  thumbUrl: string;
  url: string;
  width: number;
}

export interface CreateInquiryRequestDto {
  attachments?: InquiryAttachmentDto[] | null;
  content: string;
  subject: string;
  type: InquiryTypeDto;
}

export interface InquiryCreateResponseDto {
  createdAt: string;
  id: string;
  status: string;
}

export type InquiryStatusDto = 'IN_PROGRESS' | 'PENDING' | 'RESOLVED';

export interface InquiryListItemResponseDto {
  answer: string | null;
  attachments: InquiryAttachmentDto[];
  content: string;
  createdAt: string;
  id: string;
  status: InquiryStatusDto;
  subject: string;
  type: InquiryTypeDto;
  updatedAt: string;
}
