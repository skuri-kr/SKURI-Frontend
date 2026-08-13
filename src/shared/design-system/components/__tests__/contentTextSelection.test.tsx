import React from 'react';
import {render} from '@testing-library/react-native';

import {DetailBodyBlocks} from '../DetailBodyBlocks';
import {DetailCommentCard} from '../DetailCommentCard';

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

jest.mock('../ImageLightboxModal', () => ({
  ImageLightboxModal: () => null,
}));

describe('상세 콘텐츠 텍스트 선택', () => {
  it('게시물 본문 텍스트를 선택할 수 있다', () => {
    const view = render(
      <DetailBodyBlocks
        blocks={[
          {
            id: 'paragraph-1',
            text: '선택 가능한 게시물 본문',
            type: 'paragraph',
          },
        ]}
      />,
    );

    expect(view.getByText('선택 가능한 게시물 본문').props.selectable).toBe(
      true,
    );
  });

  it('일반 댓글 본문만 선택할 수 있다', () => {
    const comment = {
      authorLabel: '작성자',
      body: '선택 가능한 댓글',
      dateLabel: '08.13 15:20',
      id: 'comment-1',
      isDeleted: false,
      isLiked: false,
      isReply: false,
      likeCount: 0,
    };
    const view = render(<DetailCommentCard comment={comment} />);

    expect(view.getByText('선택 가능한 댓글').props.selectable).toBe(true);

    view.rerender(
      <DetailCommentCard
        comment={{
          ...comment,
          body: '삭제된 댓글입니다',
          isDeleted: true,
        }}
      />,
    );

    expect(view.getByText('삭제된 댓글입니다').props.selectable).toBe(false);
  });
});
