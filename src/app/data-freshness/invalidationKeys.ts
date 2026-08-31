import type {DataInvalidationKey} from './dataInvalidation';

export const CAMPUS_HOME_INVALIDATION_KEY: DataInvalidationKey = 'campus.home';
export const TAXI_HOME_INVALIDATION_KEY: DataInvalidationKey = 'taxi.home';
export const COMMUNITY_BOARD_LIST_INVALIDATION_KEY: DataInvalidationKey =
  'community.board.list';
export const NOTICE_LIST_INVALIDATION_KEY: DataInvalidationKey = 'notice.list';
export const PROFILE_BOARD_BOOKMARKS_INVALIDATION_KEY: DataInvalidationKey =
  'profile.boardBookmarks';
export const PROFILE_NOTICE_BOOKMARKS_INVALIDATION_KEY: DataInvalidationKey =
  'profile.noticeBookmarks';
export const PROFILE_MY_POSTS_INVALIDATION_KEY: DataInvalidationKey =
  'profile.myPosts';
export const FRIEND_HUB_INVALIDATION_KEY: DataInvalidationKey = 'friend.hub';
export const FRIEND_INBOX_COUNTS_INVALIDATION_KEY: DataInvalidationKey =
  'friend.inboxCounts';
export const CONTENT_BLOCKS_INVALIDATION_KEY: DataInvalidationKey =
  'content.blocks';

export const PROFILE_BOOKMARKS_INVALIDATION_KEYS = [
  PROFILE_BOARD_BOOKMARKS_INVALIDATION_KEY,
  PROFILE_NOTICE_BOOKMARKS_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const BOARD_DETAIL_READ_INVALIDATION_KEYS = [
  COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

/**
 * 콘텐츠 차단은 작성자 단위로 적용된다. 댓글 화면에서 차단했더라도
 * 해당 작성자의 게시글이 남아 있을 수 있는 커뮤니티 목록과 저장 목록을 함께 갱신한다.
 */
export const CONTENT_BLOCK_AUTHOR_INVALIDATION_KEYS = [
  COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
  PROFILE_BOARD_BOOKMARKS_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const BOARD_MUTATION_INVALIDATION_KEYS = [
  COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
  PROFILE_BOARD_BOOKMARKS_INVALIDATION_KEY,
  PROFILE_MY_POSTS_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const BOARD_WRITE_INVALIDATION_KEYS = [
  COMMUNITY_BOARD_LIST_INVALIDATION_KEY,
  PROFILE_MY_POSTS_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_DETAIL_READ_INVALIDATION_KEYS = [
  NOTICE_LIST_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_READ_STATUS_INVALIDATION_KEYS = [
  NOTICE_LIST_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_MUTATION_INVALIDATION_KEYS = [
  NOTICE_LIST_INVALIDATION_KEY,
  CAMPUS_HOME_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_BOOKMARK_INVALIDATION_KEYS = [
  NOTICE_LIST_INVALIDATION_KEY,
  PROFILE_NOTICE_BOOKMARKS_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS = [
  ...NOTICE_DETAIL_READ_INVALIDATION_KEYS,
  CAMPUS_HOME_INVALIDATION_KEY,
] as const satisfies readonly DataInvalidationKey[];

export const NOTICE_CONTENT_BLOCK_INVALIDATION_KEYS = [
  ...NOTICE_DETAIL_WITH_CAMPUS_INVALIDATION_KEYS,
  ...CONTENT_BLOCK_AUTHOR_INVALIDATION_KEYS,
] as const satisfies readonly DataInvalidationKey[];
