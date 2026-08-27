const LINK_ORIGIN = 'https://link.skuri.kr';

const toNoticeShareId = (noticeId: string): string =>
  noticeId.replace(/\+/g, '-').replace(/\//g, '_');

export const buildNoticeShareUrl = (noticeId: string): string =>
  `${LINK_ORIGIN}/notice/${encodeURIComponent(toNoticeShareId(noticeId))}`;

export const buildCafeteriaShareUrl = (): string =>
  `${LINK_ORIGIN}/cafeteria`;

export const buildBoardShareUrl = (postId: string): string =>
  `${LINK_ORIGIN}/board/${encodeURIComponent(postId)}`;

export const buildNoticeShareMessage = (
  noticeId: string,
  title?: string,
): string =>
  [title?.trim() || '성결대학교 학교 공지', buildNoticeShareUrl(noticeId)].join(
    '\n',
  );

export const buildCafeteriaShareMessage = (): string =>
  `이번 주 성결대학교 학식 메뉴를 확인해 보세요.\n${buildCafeteriaShareUrl()}`;

export const buildBoardShareMessage = (postId: string): string =>
  `스쿠리 커뮤니티 게시글을 확인해 보세요.\n${buildBoardShareUrl(postId)}`;
