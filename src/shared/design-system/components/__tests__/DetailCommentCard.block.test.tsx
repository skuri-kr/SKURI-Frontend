import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

import {DetailCommentCard} from '../DetailCommentCard';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../LinkifiedText', () => ({LinkifiedText: () => null}));
jest.mock('../ProfileAvatar', () => ({ProfileAvatar: () => null}));
jest.mock('../VerifiedAuthorBadge', () => ({VerifiedAuthorBadge: () => null}));

const baseComment = {
  authorLabel: '익명1',
  body: '댓글',
  dateLabel: '방금 전',
  id: 'comment-1',
  isDeleted: false,
  isLiked: false,
  isMine: false,
  isReply: false,
  likeCount: 0,
};

describe('DetailCommentCard 콘텐츠 차단', () => {
  it('다른 사용자의 활성 댓글에만 차단 액션을 표시한다', () => {
    const onPressBlock = jest.fn();
    const screen = render(
      <DetailCommentCard comment={baseComment} onPressBlock={onPressBlock} />,
    );

    fireEvent.press(screen.getByText('차단'));
    expect(onPressBlock).toHaveBeenCalledTimes(1);

    screen.rerender(
      <DetailCommentCard
        comment={{...baseComment, isMine: true}}
        onPressBlock={onPressBlock}
      />,
    );
    expect(screen.queryByText('차단')).toBeNull();

    screen.rerender(
      <DetailCommentCard
        comment={{...baseComment, isDeleted: true}}
        onPressBlock={onPressBlock}
      />,
    );
    expect(screen.queryByText('차단')).toBeNull();
  });
});
