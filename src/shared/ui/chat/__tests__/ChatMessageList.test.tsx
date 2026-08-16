import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {FlatList, StyleSheet, Text} from 'react-native';

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

  it('이전 메시지를 끝에 추가해도 보고 있던 위치를 네이티브 앵커로 유지한다', async () => {
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
    const flatList = view.UNSAFE_getByType(FlatList);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    act(() => {
      flatList.props.onScrollBeginDrag?.();
      flatList.props.onEndReached?.({distanceFromEnd: 0});
      flatList.props.onEndReached?.({distanceFromEnd: 0});
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onLoadOlderMessages).toHaveBeenCalledTimes(1);
    expect(flatList.props.inverted).toBe(true);
    expect(flatList.props.maintainVisibleContentPosition).toEqual({
      minIndexForVisible: 0,
    });

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

    expect(flatList.props.data.map((item: ChatThreadItemViewData) => item.id)).toEqual([
      'message-1',
      'message-0',
    ]);

    act(() => {
      flatList.props.onEndReached?.({distanceFromEnd: 0});
    });

    expect(onLoadOlderMessages).toHaveBeenCalledTimes(1);

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

    loadingView.UNSAFE_getByType(FlatList).props.onEndReached?.({
      distanceFromEnd: 0,
    });
    expect(onLoadOlderMessages).not.toHaveBeenCalled();

    loadingView.rerender(
      <ChatMessageList
        hasOlderMessages={false}
        items={items}
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );
    loadingView.UNSAFE_getByType(FlatList).props.onEndReached?.({
      distanceFromEnd: 0,
    });

    expect(onLoadOlderMessages).not.toHaveBeenCalled();
  });

  it('사용자가 다시 끌어올릴 때에만 다음 이전 메시지 요청을 허용한다', async () => {
    const onLoadOlderMessages = jest.fn(() => Promise.resolve());
    const view = render(
      <ChatMessageList
        hasOlderMessages
        items={items}
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );
    const flatList = view.UNSAFE_getByType(FlatList);

    act(() => {
      flatList.props.onEndReached?.({distanceFromEnd: 0});
      flatList.props.onEndReached?.({distanceFromEnd: 0});
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onLoadOlderMessages).toHaveBeenCalledTimes(1);

    act(() => {
      flatList.props.onScrollBeginDrag?.();
      flatList.props.onEndReached?.({distanceFromEnd: 0});
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onLoadOlderMessages).toHaveBeenCalledTimes(2);
  });

  it('inverted 목록의 상단 콘텐츠를 footer로 렌더링한다', () => {
    const view = render(
      <ChatMessageList
        headerContent={
          <Text>채팅방 요약</Text>
        }
        items={items}
      />,
    );
    const flatList = view.UNSAFE_getByType(FlatList);

    expect(flatList.props.ListFooterComponent).toBeTruthy();
    expect(view.getByText('채팅방 요약')).toBeTruthy();
  });

  it('과거 메시지를 읽는 중에는 신규 메시지 미리보기를 중앙에 표시하고 chevron 버튼을 숨긴다', () => {
    const view = render(<ChatMessageList items={items} />);
    const flatList = view.UNSAFE_getByType(FlatList);

    fireEvent.scroll(flatList, createScrollEvent(850));

    expect(view.getByLabelText('최신 메시지로 이동')).toBeTruthy();
    expect(flatList.props.showsVerticalScrollIndicator).toBe(true);

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
    const flatList = view.UNSAFE_getByType(FlatList);

    fireEvent.scroll(flatList, createScrollEvent(72));

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
