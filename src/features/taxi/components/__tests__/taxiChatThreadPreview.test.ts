import {
  getTaxiChatNewMessagePreview,
  isTaxiChatOutgoingItem,
} from '../taxiChatThreadPreview';

describe('taxiChatThreadPreview', () => {
  it('계좌 메시지는 닉네임과 안전한 요약으로 변환한다', () => {
    const preview = getTaxiChatNewMessagePreview({
      accountData: {
        accountHolder: '홍길동',
        accountNumber: '1234',
        bankName: '스쿠리은행',
        hideName: false,
      },
      direction: 'incoming',
      id: 'account-1',
      senderName: '택시 친구',
      text: '계좌를 보냈어요.',
      timeLabel: '오전 10:00',
      type: 'account-message',
    });

    expect(preview).toEqual({
      id: 'account-1',
      senderName: '택시 친구',
      text: '계좌 정보를 보냈어요.',
    });
  });

  it('시스템·도착·종료 메시지는 신규 메시지 미리보기를 만들지 않는다', () => {
    expect(
      getTaxiChatNewMessagePreview({
        id: 'system-1',
        text: '파티가 시작됐어요.',
        type: 'system-message',
      }),
    ).toBeNull();
    expect(
      getTaxiChatNewMessagePreview({
        id: 'end-1',
        text: '파티가 종료됐어요.',
        type: 'end-message',
      }),
    ).toBeNull();
  });

  it('내가 보낸 텍스트와 계좌 메시지를 자동 하단 이동 대상으로 판단한다', () => {
    expect(
      isTaxiChatOutgoingItem({
        direction: 'outgoing',
        id: 'message-1',
        messageKind: 'text',
        minuteKey: '2026-08-13 10:00',
        senderId: 'member-1',
        senderName: '나',
        text: '출발해요',
        timeLabel: '오전 10:00',
        type: 'text-message',
      }),
    ).toBe(true);
  });
});
