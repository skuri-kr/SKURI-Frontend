export interface VersionedChatMessage {
  createdAt?: unknown;
  deletedAt?: unknown;
  editedAt?: unknown;
  isDeleted?: boolean;
  updatedAt?: unknown;
}

const toTimestamp = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
  }

  return Number.NEGATIVE_INFINITY;
};

const resolveMessageVersion = (message: VersionedChatMessage) =>
  Math.max(
    toTimestamp(message.updatedAt),
    toTimestamp(message.deletedAt),
    toTimestamp(message.editedAt),
    toTimestamp(message.createdAt),
  );

/**
 * Keeps an already-applied newer edit or deletion from being resurrected by a
 * delayed REST page, snapshot, or STOMP frame. When timestamps tie, a deleted
 * tombstone wins because showing stale message contents is less safe.
 */
export const selectNewestChatMessage = <T extends VersionedChatMessage>(
  currentMessage: T,
  nextMessage: T,
): T => {
  const currentVersion = resolveMessageVersion(currentMessage);
  const nextVersion = resolveMessageVersion(nextMessage);

  if (nextVersion > currentVersion) {
    return nextMessage;
  }

  if (nextVersion < currentVersion) {
    return currentMessage;
  }

  if (nextMessage.isDeleted && !currentMessage.isDeleted) {
    return nextMessage;
  }

  return currentMessage;
};
