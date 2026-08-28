import React from 'react';
import {Image, Linking, StyleSheet} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {COLORS} from '../../tokens';
import {DetailBodyBlocks} from '../DetailBodyBlocks';
import {DetailCommentCard} from '../DetailCommentCard';

jest.mock('../ImageLightboxModal', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');

  return {
    ImageLightboxModal: ({visible}: {visible: boolean}) =>
      visible
        ? ReactModule.createElement(Text, null, '이미지 뷰어 열림')
        : null,
  };
});

const mockOpenUrl = jest.spyOn(Linking, 'openURL');
const mockGetSize = jest.spyOn(Image, 'getSize');
const mockPrefetch = jest.spyOn(Image, 'prefetch');

describe('상세 본문 외부 링크', () => {
  beforeEach(() => {
    mockOpenUrl.mockReset().mockResolvedValue(undefined);
    mockGetSize.mockReset().mockImplementation((_url, success) => {
      success(1200, 800);
    });
    mockPrefetch.mockReset().mockResolvedValue(false);
  });

  it('공지와 게시물의 평문 URL을 파란색 밑줄 링크로 표시하고 연다', async () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            id: 'paragraph-1',
            text: '신청: https://example.com/apply',
            type: 'paragraph',
          },
        ]}
      />,
    );
    const link = view.getByText('https://example.com/apply');

    expect(StyleSheet.flatten(link.props.style)).toEqual(
      expect.objectContaining({
        color: COLORS.accent.blue,
        textDecorationLine: 'underline',
      }),
    );

    fireEvent.press(link);

    await waitFor(() => {
      expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com/apply');
    });
  });

  it('공지 HTML에서 보존한 링크 문구를 표시하고 실제 href를 연다', async () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            id: 'paragraph-1',
            segments: [
              {text: '신청은 ', type: 'text'},
              {
                text: '여기에서 참여',
                type: 'link',
                url: 'https://example.com/apply',
              },
            ],
            text: '신청은 여기에서 참여',
            type: 'paragraph',
          },
        ]}
      />,
    );

    fireEvent.press(view.getByText('여기에서 참여'));

    await waitFor(() => {
      expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com/apply');
    });
  });

  it('일반 댓글 URL도 같은 링크 동작을 제공한다', async () => {
    const view = render(
      <DetailCommentCard
        comment={{
          authorLabel: '작성자',
          body: '자세한 내용은 www.example.com에서 확인',
          dateLabel: '08.28 10:00',
          id: 'comment-1',
          isDeleted: false,
          isLiked: false,
          isReply: false,
          likeCount: 0,
        }}
      />,
    );

    fireEvent.press(view.getByText('www.example.com'));

    await waitFor(() => {
      expect(mockOpenUrl).toHaveBeenCalledWith('https://www.example.com/');
    });
  });

  it('삭제된 댓글은 URL을 링크로 만들지 않는다', () => {
    const view = render(
      <DetailCommentCard
        comment={{
          authorLabel: '작성자',
          body: 'https://example.com',
          dateLabel: '08.28 10:00',
          id: 'comment-1',
          isDeleted: true,
          isLiked: false,
          isReply: false,
          likeCount: 0,
        }}
      />,
    );

    expect(view.getByText('https://example.com').props.accessibilityRole).toBe(
      undefined,
    );
  });

  it('링크 이미지는 탭하면 URL을 열고 길게 누르면 뷰어를 연다', async () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            alt: '핵심역량 진단 포스터',
            id: 'image-1',
            imageUrl: 'https://example.com/poster.png',
            linkUrl: 'https://example.com/apply',
            type: 'image',
          },
        ]}
      />,
    );
    const imageButton = view.getByLabelText('핵심역량 진단 포스터');

    fireEvent.press(imageButton);

    await waitFor(() => {
      expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com/apply');
    });

    fireEvent(imageButton, 'longPress');
    expect(view.getByText('이미지 뷰어 열림')).toBeTruthy();
    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
  });

  it('링크가 없는 이미지는 기존처럼 탭해서 뷰어를 연다', () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            alt: '일반 이미지',
            id: 'image-1',
            imageUrl: 'https://example.com/image.png',
            type: 'image',
          },
        ]}
      />,
    );

    fireEvent.press(view.getByLabelText('일반 이미지'));

    expect(view.getByText('이미지 뷰어 열림')).toBeTruthy();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it('표의 명시 링크와 평문 URL을 외부 브라우저로 전달한다', async () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            html: '<table><tr><td>https://example.com/table</td></tr></table>',
            id: 'table-1',
            type: 'table',
          },
        ]}
      />,
    );
    const webView = view.getByTestId('detail-table-webview');

    expect(webView.props.source.html).toContain('linkifyTextNodes');
    expect(
      webView.props.onShouldStartLoadWithRequest({url: 'about:blank'}),
    ).toBe(true);
    expect(
      webView.props.onShouldStartLoadWithRequest({
        url: 'https://example.com/table',
      }),
    ).toBe(false);

    await waitFor(() => {
      expect(mockOpenUrl).toHaveBeenCalledWith('https://example.com/table');
    });
  });
});
