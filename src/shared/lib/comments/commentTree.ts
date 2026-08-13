export interface CommentTreeNode<T> {
  isDeleted?: boolean;
  replies: T[];
}

export interface FlattenedCommentTreeEntry<T> {
  comment: T;
  parent: T | null;
}

export const flattenVisibleCommentTree = <
  T extends CommentTreeNode<T>,
>(
  comments: T[],
  parent: T | null = null,
): FlattenedCommentTreeEntry<T>[] =>
  comments.flatMap(comment => {
    const replyEntries = flattenVisibleCommentTree(comment.replies, comment);

    if (comment.isDeleted && replyEntries.length === 0) {
      return [];
    }

    return [
      {
        comment,
        parent,
      },
      ...replyEntries,
    ];
  });
