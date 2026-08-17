import {
  selectNewestChatMessage,
  type VersionedChatMessage,
} from '../chatMessageVersion';

type Message = VersionedChatMessage & {
  text?: string;
};

describe('selectNewestChatMessage', () => {
  it('더 늦게 도착한 오래된 수정 응답보다 최신 삭제 tombstone을 유지한다', () => {
    const deleted: Message = {
      createdAt: '2026-08-17T10:00:00.000Z',
      deletedAt: '2026-08-17T10:02:00.000Z',
      isDeleted: true,
      updatedAt: '2026-08-17T10:02:00.000Z',
    };
    const staleEdit: Message = {
      createdAt: '2026-08-17T10:00:00.000Z',
      editedAt: '2026-08-17T10:01:00.000Z',
      isDeleted: false,
      updatedAt: '2026-08-17T10:01:00.000Z',
    };

    expect(selectNewestChatMessage(deleted, staleEdit)).toBe(deleted);
  });

  it('동일 시각이면 삭제 tombstone을 우선한다', () => {
    const edited: Message = {
      createdAt: '2026-08-17T10:00:00.000Z',
      isDeleted: false,
      updatedAt: '2026-08-17T10:01:00.000Z',
    };
    const deleted: Message = {
      createdAt: '2026-08-17T10:00:00.000Z',
      isDeleted: true,
      updatedAt: '2026-08-17T10:01:00.000Z',
    };

    expect(selectNewestChatMessage(edited, deleted)).toBe(deleted);
  });
});
