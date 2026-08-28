export const buildCafeteriaShareUrl = (): string =>
  'https://link.skuri.kr/cafeteria';

export const getMatchingNoticeShareTitle = (
  noticeId: string,
  notice?: {id: string; title: string} | null,
): string | undefined =>
  notice?.id === noticeId ? notice.title : undefined;

export const buildNoticeShareMessage = (
  shareUrl: string,
  title?: string,
): string =>
  [title?.trim() || '성결대학교 학교 공지', shareUrl].join('\n');

export const buildCafeteriaShareMessage = (): string =>
  `이번 주 성결대학교 학식 메뉴를 확인해 보세요.\n${buildCafeteriaShareUrl()}`;

export const buildBoardShareMessage = (shareUrl: string): string =>
  `스쿠리 커뮤니티 게시글을 확인해 보세요.\n${shareUrl}`;
