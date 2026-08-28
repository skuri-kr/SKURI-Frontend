import {mapNoticeCommentDto} from '../noticeMapper';

describe('mapNoticeCommentDto', () => {
  it('공지 댓글의 작성자 현재 프로필 이미지를 보존한다', () => {
    const comment = mapNoticeCommentDto('notice-1', {
      anonymousOrder: null,
      authorId: 'member-1',
      authorName: '홍길동',
      authorProfileImage: 'https://cdn.skuri.app/profiles/member-current.png',
      content: '댓글 내용',
      createdAt: '2026-08-28T10:00:00',
      depth: 0,
      id: 'comment-1',
      isAnonymous: false,
      isAuthor: false,
      isDeleted: false,
      isLiked: false,
      likeCount: 0,
      parentId: null,
      updatedAt: '2026-08-28T10:00:00',
    });

    expect(comment.authorProfileImage).toBe(
      'https://cdn.skuri.app/profiles/member-current.png',
    );
  });
});
