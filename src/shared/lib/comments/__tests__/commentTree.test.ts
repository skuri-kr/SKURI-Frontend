import {flattenVisibleCommentTree} from '../commentTree';

interface TestComment {
  id: string;
  isDeleted?: boolean;
  replies: TestComment[];
}

const comment = (
  id: string,
  replies: TestComment[] = [],
  isDeleted = false,
): TestComment => ({
  id,
  isDeleted,
  replies,
});

describe('flattenVisibleCommentTree', () => {
  it('답글이 없는 삭제 댓글은 표시 목록에서 제외한다', () => {
    const entries = flattenVisibleCommentTree([
      comment('visible'),
      comment('deleted-leaf', [], true),
    ]);

    expect(entries.map(entry => entry.comment.id)).toEqual(['visible']);
  });

  it('표시할 답글이 있는 삭제 댓글은 placeholder로 유지한다', () => {
    const entries = flattenVisibleCommentTree([
      comment('deleted-parent', [comment('visible-reply')], true),
    ]);

    expect(entries.map(entry => entry.comment.id)).toEqual([
      'deleted-parent',
      'visible-reply',
    ]);
    expect(entries[1]?.parent?.id).toBe('deleted-parent');
  });

  it('삭제 댓글만 남은 가지는 가장 위 부모까지 모두 제외한다', () => {
    const entries = flattenVisibleCommentTree([
      comment(
        'deleted-parent',
        [comment('deleted-reply', [], true)],
        true,
      ),
    ]);

    expect(entries).toEqual([]);
  });

  it('여러 단계 아래에 표시할 답글이 있으면 삭제된 부모 경로를 유지한다', () => {
    const entries = flattenVisibleCommentTree([
      comment(
        'deleted-root',
        [
          comment(
            'deleted-middle',
            [comment('visible-descendant')],
            true,
          ),
        ],
        true,
      ),
    ]);

    expect(entries.map(entry => entry.comment.id)).toEqual([
      'deleted-root',
      'deleted-middle',
      'visible-descendant',
    ]);
  });
});
