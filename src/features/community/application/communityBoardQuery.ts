import type {IBoardRepository} from '@/features/board/data/repositories/IBoardRepository';
import {
  filterBoardPostsBySearchText,
  toBoardFilterOptions,
} from '@/features/board/services/boardPostService';
import type {BoardPost} from '@/features/board/model/types';

import type {
  CommunityBoardPageResult,
  CommunityBoardSearchFilters,
  CommunityBoardSourceItem,
} from '../model/communityHomeData';

const extractHashtags = (content: string) =>
  Array.from(
    new Set(
      (content.match(/#[^\s#]+/g) ?? []).map(hashtag =>
        hashtag.replace(/^#/, '').trim(),
      ),
    ),
  );

const getPostPopularityScore = (post: BoardPost) =>
  post.likeCount * 2 + post.commentCount * 3 + post.bookmarkCount * 4;

const toCommunityBoardSourceItem = (
  post: BoardPost,
): CommunityBoardSourceItem => ({
  authorName: post.authorName,
  authorProfileImage: post.authorProfileImage,
  bookmarkCount: post.bookmarkCount,
  category: post.category,
  commentCount: post.commentCount,
  content: post.content,
  createdAt: post.createdAt.toISOString(),
  hashtags: extractHashtags(post.content),
  id: post.id,
  isAnonymous: Boolean(post.isAnonymous),
  isBookmarked: Boolean(post.isBookmarked),
  isCommentedByMe: Boolean(post.isCommentedByMe),
  isLiked: Boolean(post.isLiked),
  likeCount: post.likeCount,
  thumbnailUrl: post.thumbnailUrl,
  title: post.title,
  viewCount: post.viewCount,
});

export const loadCommunityBoardPage = async ({
  boardRepository,
  cursor,
  filters,
  limit,
}: {
  boardRepository: IBoardRepository;
  cursor?: unknown;
  filters: CommunityBoardSearchFilters;
  limit: number;
}): Promise<CommunityBoardPageResult> => {
  const page =
    cursor == null
      ? await boardRepository.getPosts(toBoardFilterOptions(filters), limit)
      : await boardRepository.getMorePosts(
          toBoardFilterOptions(filters),
          cursor,
          limit,
        );

  const visibleItems = filterBoardPostsBySearchText(page.data, filters.searchText);

  let featuredPost: CommunityBoardSourceItem | undefined;

  if (!filters.category && !filters.searchText && cursor == null) {
    const popularPage = await boardRepository.getPosts({sortBy: 'popular'}, 1);
    const visiblePopular = popularPage.data;
    const [popularPost] = visiblePopular.sort(
      (left, right) =>
        getPostPopularityScore(right) - getPostPopularityScore(left),
    );
    featuredPost = popularPost
      ? toCommunityBoardSourceItem(popularPost)
      : undefined;
  }

  return {
    featuredPost,
    items: visibleItems.map(toCommunityBoardSourceItem),
    nextCursor: page.hasMore ? page.cursor : undefined,
  };
};
