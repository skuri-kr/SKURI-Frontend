export const CHAT_MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

export const isWithinChatMessageEditWindow = (createdAt: unknown) => {
  const createdAtMillis = new Date(String(createdAt)).getTime();

  if (!Number.isFinite(createdAtMillis)) {
    return false;
  }

  return Date.now() - createdAtMillis <= CHAT_MESSAGE_EDIT_WINDOW_MS;
};
