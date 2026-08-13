import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {InquiryHistoryListItem} from '../InquiryHistoryListItem';
import type {InquiryHistoryItemViewData} from '../../model/inquiryHistoryViewData';

const item: InquiryHistoryItemViewData = {
  adminAnswer: '문제를 확인했고 다음 배포에 반영하겠습니다.',
  content:
    '첫 번째 줄입니다.\n두 번째 줄입니다.\n세 번째 줄입니다.\n네 번째 줄입니다.',
  createdAtLabel: '2026.08.13 12:00',
  id: 'inquiry-1',
  statusLabel: '처리 완료',
  statusTone: 'green',
  subject: '긴 문의 제목',
  typeLabel: '버그 신고',
  typeTone: 'orange',
};

const InquiryHistoryListItemHarness = () => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <InquiryHistoryListItem
      expanded={expanded}
      item={item}
      onToggle={() => setExpanded(previous => !previous)}
    />
  );
};

describe('InquiryHistoryListItem', () => {
  it('카드를 누르면 원문과 관리자 답변을 펼치고 다시 접는다', () => {
    render(<InquiryHistoryListItemHarness />);

    expect(screen.getByText(item.content).props.numberOfLines).toBe(3);
    expect(screen.queryByText('관리자 답변')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: '긴 문의 제목. 버그 신고. 처리 완료. 2026.08.13 12:00. 펼치기',
      }).props.accessibilityState,
    ).toEqual({expanded: false});

    fireEvent.press(
      screen.getByRole('button', {
        name: '긴 문의 제목. 버그 신고. 처리 완료. 2026.08.13 12:00. 펼치기',
      }),
    );

    expect(screen.getByText(item.content).props.numberOfLines).toBeUndefined();
    expect(screen.getByText('관리자 답변')).not.toBeNull();
    expect(screen.getByText(item.adminAnswer!)).not.toBeNull();
    expect(
      screen.getByRole('button', {
        name: `긴 문의 제목. 버그 신고. 처리 완료. 2026.08.13 12:00. 문의 내용 ${
          item.content
        }. 관리자 답변 ${item.adminAnswer!}. 접기`,
      }).props.accessibilityState,
    ).toEqual({expanded: true});

    fireEvent.press(
      screen.getByRole('button', {
        name: `긴 문의 제목. 버그 신고. 처리 완료. 2026.08.13 12:00. 문의 내용 ${
          item.content
        }. 관리자 답변 ${item.adminAnswer!}. 접기`,
      }),
    );

    expect(screen.queryByText('관리자 답변')).toBeNull();
    expect(screen.getByText(item.content).props.numberOfLines).toBe(3);
  });
});
