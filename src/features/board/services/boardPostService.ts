import type { BoardFilterOptions } from '../data/repositories/IBoardRepository';
import type { BoardFormData, BoardPost, BoardSearchFilters } from '../model/types';

interface BoardAuthorSnapshot {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export function toBoardFilterOptions(filters: BoardSearchFilters): BoardFilterOptions {
  return {
    category: filters.category,
    authorId: filters.authorId,
    searchText: filters.searchText,
    sortBy: filters.sortBy,
  };
}

export function filterBoardPostsBySearchText(
  posts: BoardPost[],
  searchText?: string,
): BoardPost[] {
  if (!searchText) {
    return posts;
  }

  const normalizedSearch = searchText.toLowerCase();

  return posts.filter((post) => {
    const textMatch =
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.content.toLowerCase().includes(normalizedSearch) ||
      post.authorName.toLowerCase().includes(normalizedSearch);

    const hashtagMatch = normalizedSearch.startsWith('#')
      ? post.content.includes(normalizedSearch)
      : post.content.includes(`#${normalizedSearch}`);

    return textMatch || hashtagMatch;
  });
}

export function buildBoardPostCreatePayload(
  author: BoardAuthorSnapshot,
  formData: BoardFormData,
): Omit<
  BoardPost,
  'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'bookmarkCount'
> {
  return {
    title: formData.title.trim(),
    content: formData.content.trim(),
    category: formData.category,
    authorId: author.uid,
    authorName: author.displayName || '익명',
    authorProfileImage: author.photoURL ?? null,
    isAuthorAdmin: false,
    isAnonymous: !!formData.isAnonymous,
    isPinned: false,
    isDeleted: false,
    images: [],
  };
}

export function buildBoardPostUpdatePayload(formData: BoardFormData): Partial<BoardPost> {
  return {
    title: formData.title.trim(),
    content: formData.content.trim(),
    category: formData.category,
  };
}
