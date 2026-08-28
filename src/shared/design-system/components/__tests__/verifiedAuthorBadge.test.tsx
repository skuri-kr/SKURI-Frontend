import React from 'react';
import {render} from '@testing-library/react-native';

import {DetailCommentCard} from '../DetailCommentCard';

const comment = {
  authorLabel: '운영자',
  body: '댓글 내용',
  dateLabel: '08.29 10:00',
  id: 'comment-1',
  isDeleted: false,
  isLiked: false,
  isReply: false,
  likeCount: 0,
};

describe('운영자 작성자 인증 배지', () => {
  it('운영자 댓글에만 인증 아이콘을 표시한다', () => {
    const view = render(
      <DetailCommentCard comment={{...comment, isAuthorAdmin: true}} />,
    );

    expect(view.getByLabelText('운영자 인증됨')).toBeTruthy();

    view.rerender(
      <DetailCommentCard comment={{...comment, isAuthorAdmin: false}} />,
    );

    expect(view.queryByLabelText('운영자 인증됨')).toBeNull();
  });
});
