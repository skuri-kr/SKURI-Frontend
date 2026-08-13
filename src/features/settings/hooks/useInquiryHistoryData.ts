import React from 'react';
import {format} from 'date-fns';

import {inquiryApiClient} from '../data/api/inquiryApiClient';
import type {
  InquiryListItemResponseDto,
  InquiryStatusDto,
  InquiryTypeDto,
} from '../data/dto/inquiryDto';
import type {
  InquiryHistoryItemViewData,
  InquiryHistoryScreenViewData,
} from '../model/inquiryHistoryViewData';

const INQUIRY_TYPE_META: Record<
  InquiryTypeDto,
  Pick<InquiryHistoryItemViewData, 'typeLabel' | 'typeTone'>
> = {
  ACCOUNT: {
    typeLabel: '계정',
    typeTone: 'purple',
  },
  BUG: {
    typeLabel: '버그 신고',
    typeTone: 'orange',
  },
  FEATURE: {
    typeLabel: '기능 제안',
    typeTone: 'blue',
  },
  OTHER: {
    typeLabel: '기타',
    typeTone: 'gray',
  },
  SERVICE: {
    typeLabel: '서비스 문의',
    typeTone: 'green',
  },
};

const INQUIRY_STATUS_META: Record<
  InquiryStatusDto,
  Pick<InquiryHistoryItemViewData, 'statusLabel' | 'statusTone'>
> = {
  IN_PROGRESS: {
    statusLabel: '처리 중',
    statusTone: 'blue',
  },
  PENDING: {
    statusLabel: '접수됨',
    statusTone: 'orange',
  },
  RESOLVED: {
    statusLabel: '처리 완료',
    statusTone: 'green',
  },
};

const formatInquiryDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return format(date, 'yyyy.MM.dd HH:mm');
};

const mapInquiryItem = (
  item: InquiryListItemResponseDto,
): InquiryHistoryItemViewData => {
  const typeMeta = INQUIRY_TYPE_META[item.type];
  const statusMeta = INQUIRY_STATUS_META[item.status];
  const attachmentCount =
    item.attachments.length > 0
      ? `이미지 ${item.attachments.length}장`
      : undefined;
  const thumbnail = item.attachments[0];

  return {
    adminAnswer: item.answer ?? undefined,
    attachmentCountLabel: attachmentCount,
    content: item.content,
    createdAtLabel: formatInquiryDateTime(item.createdAt),
    id: item.id,
    statusLabel: statusMeta.statusLabel,
    statusTone: statusMeta.statusTone,
    subject: item.subject,
    thumbnailUri: thumbnail ? thumbnail.thumbUrl || thumbnail.url : undefined,
    typeLabel: typeMeta.typeLabel,
    typeTone: typeMeta.typeTone,
  };
};

const toViewData = (
  items: InquiryListItemResponseDto[],
): InquiryHistoryScreenViewData => ({
  countLabel: `${items.length}건`,
  items: items.map(mapInquiryItem),
  title: '내 문의 내역',
});

export const useInquiryHistoryData = () => {
  const [data, setData] = React.useState<InquiryHistoryScreenViewData>();
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const response = await inquiryApiClient.getMyInquiries();
      setData(toViewData(response.data));
    } catch (caughtError) {
      console.error('Failed to fetch inquiry history data', caughtError);
      setError('문의 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return {
    data,
    error,
    loading,
    reload,
  };
};
