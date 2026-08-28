import {
  mapBoardCommentDto,
  mapBoardPostSummaryDto,
} from '../boardMapper';

describe('게시판 작성자 운영자 상태 매핑', () => {
  it('게시글과 댓글의 현재 운영자 상태를 보존한다', () => {
    const post = mapBoardPostSummaryDto({
      authorId: 'member-1',
      authorName: '운영자',
      authorProfileImage: 'https://cdn.skuri.app/profiles/member-1.png',
      bookmarkCount: 0,
      category: 'GENERAL',
      commentCount: 0,
      content: '게시글 내용',
      createdAt: '2026-08-29T10:00:00',
      hasImage: false,
      id: 'post-1',
      isAnonymous: false,
      isAuthorAdmin: true,
      isBookmarked: false,
      isCommentedByMe: false,
      isLiked: false,
      isPinned: false,
      likeCount: 0,
      title: '게시글 제목',
      viewCount: 0,
    });
    const comment = mapBoardCommentDto('post-1', {
      anonymousOrder: null,
      authorId: 'member-1',
      authorName: '운영자',
      authorProfileImage: 'https://cdn.skuri.app/profiles/member-1.png',
      content: '댓글 내용',
      createdAt: '2026-08-29T10:00:00',
      depth: 0,
      id: 'comment-1',
      isAnonymous: false,
      isAuthor: false,
      isAuthorAdmin: true,
      isDeleted: false,
      isLiked: false,
      isPostAuthor: false,
      likeCount: 0,
      parentId: null,
      updatedAt: '2026-08-29T10:00:00',
    });

    expect(post.isAuthorAdmin).toBe(true);
    expect(comment.isAuthorAdmin).toBe(true);
  });
});
