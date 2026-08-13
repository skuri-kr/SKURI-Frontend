import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {ScrollView, StyleSheet} from 'react-native';

import {ChatMessageList} from '../ChatMessageList';
import type {ChatThreadItemViewData} from '../types';

jest.mock('../ChatAvatar', () => ({
  ChatAvatar: () => null,
}));

jest.mock('../MessageImageBubble', () => ({
  MessageImageBubble: () => null,
}));

const items: ChatThreadItemViewData[] = [
  {
    direction: 'incoming',
    id: 'message-1',
    messageKind: 'text',
    minuteKey: '2026-08-11 10:00',
    senderId: 'member-1',
    senderName: '테스터',
    text: '첫 메시지',
    timeLabel: '오전 10:00',
    type: 'text-message',
  },
];

const createScrollEvent = (offsetY: number) => ({
  nativeEvent: {
    contentOffset: {y: offsetY},
    contentSize: {height: 2000, width: 360},
    layoutMeasurement: {height: 500, width: 360},
  },
});

describe('ChatMessageList', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('이전 메시지를 불러온 뒤에도 보고 있던 위치를 유지한다', async () => {
    jest.useFakeTimers();

    let resolveLoad: (() => void) | undefined;
    const onLoadOlderMessages = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveLoad = resolve;
        }),
    );
    const view = render(
      <ChatMessageList
        hasOlderMessages
        items={items}
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );
    const scrollView = view.UNSAFE_getByType(ScrollView);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.scroll(scrollView, createScrollEvent(220));
    expect(onLoadOlderMessages).not.toHaveBeenCalled();

    fireEvent.scroll(scrollView, createScrollEvent(40));
    fireEvent.scroll(scrollView, createScrollEvent(20));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onLoadOlderMessages).toHaveBeenCalledTimes(1);
    expect(scrollView.props.maintainVisibleContentPosition).toBeUndefined();

    view.rerender(
      <ChatMessageList
        hasOlderMessages
        items={[
          {
            direction: 'incoming',
            id: 'message-0',
            messageKind: 'text',
            minuteKey: '2026-08-11 09:59',
            senderId: 'member-0',
            senderName: '이전 친구',
            text: '이전 메시지',
            timeLabel: '오전 9:59',
            type: 'text-message',
          },
          ...items,
        ]}
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );

    scrollView.props.onContentSizeChange?.(360, 2450);

    expect(scrollView.instance.scrollTo).toHaveBeenCalledWith({
      animated: false,
      y: 490,
    });

    await act(async () => {
      resolveLoad?.();
    });
  });

  it('이전 메시지를 불러오는 중이거나 마지막 페이지이면 추가 요청하지 않는다', () => {
    const onLoadOlderMessages = jest.fn();
    const loadingView = render(
      <ChatMessageList
        hasOlderMessages
        items={items}
        loadingOlderMessages
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );

    fireEvent.scroll(loadingView.UNSAFE_getByType(ScrollView), createScrollEvent(0));
    expect(onLoadOlderMessages).not.toHaveBeenCalled();

    loadingView.rerender(
      <ChatMessageList
        hasOlderMessages={false}
        items={items}
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );
    fireEvent.scroll(loadingView.UNSAFE_getByType(ScrollView), createScrollEvent(0));

    expect(onLoadOlderMessages).not.toHaveBeenCalled();
  });

  it('과거 메시지를 읽는 중에는 신규 메시지 미리보기를 중앙에 표시하고 chevron 버튼을 숨긴다', () => {
    const view = render(<ChatMessageList items={items} />);
    const scrollView = view.UNSAFE_getByType(ScrollView);

    fireEvent.scroll(scrollView, createScrollEvent(850));

    expect(view.getByLabelText('최신 메시지로 이동')).toBeTruthy();
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);

    view.rerender(
      <ChatMessageList
        items={[
          ...items,
          {
            direction: 'incoming',
            id: 'message-2',
            messageKind: 'text',
            minuteKey: '2026-08-11 10:01',
            senderId: 'member-2',
            senderName: '새 친구',
            text: '새로운 메시지',
            timeLabel: '오전 10:01',
            type: 'text-message',
          },
        ]}
      />,
    );

    const newMessageButton = view.getByLabelText(
      '새 친구: 새로운 메시지. 최신 메시지로 이동',
    );
    expect(newMessageButton).toBeTruthy();
    expect(StyleSheet.flatten(newMessageButton.props.style)).toMatchObject({
      alignSelf: 'center',
      width: '76%',
    });
    expect(view.queryByLabelText('최신 메시지로 이동')).toBeNull();

    fireEvent.press(newMessageButton);

    expect(view.queryByText('새로운 메시지')).toBeTruthy();
    expect(view.queryByLabelText('새 친구: 새로운 메시지. 최신 메시지로 이동')).toBeNull();
  });

  it('최하단에 가까우면 새 메시지 미리보기를 표시하지 않는다', () => {
    const view = render(<ChatMessageList items={items} />);
    const scrollView = view.UNSAFE_getByType(ScrollView);

    fireEvent.scroll(scrollView, createScrollEvent(1430));

    view.rerender(
      <ChatMessageList
        items={[
          ...items,
          {
            direction: 'incoming',
            id: 'message-2',
            messageKind: 'image',
            minuteKey: '2026-08-11 10:01',
            senderId: 'member-2',
            senderName: '새 친구',
            text: '',
            timeLabel: '오전 10:01',
            type: 'text-message',
          },
        ]}
      />,
    );

    expect(view.queryByText('사진을 보냈어요.')).toBeNull();
  });
});
