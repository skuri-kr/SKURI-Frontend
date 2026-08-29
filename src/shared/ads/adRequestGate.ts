export const MIN_AD_REQUEST_INTERVAL_MS = 60_000;

const lastRequestAtBySlot = new Map<string, number>();

export const getAdRequestDelay = (
  slotKey: string,
  now = Date.now(),
): number => {
  const lastRequestAt = lastRequestAtBySlot.get(slotKey);
  if (lastRequestAt === undefined) {
    return 0;
  }

  return Math.max(0, MIN_AD_REQUEST_INTERVAL_MS - (now - lastRequestAt));
};

export const recordAdRequest = (slotKey: string, now = Date.now()) => {
  lastRequestAtBySlot.set(slotKey, now);
};

export const resetAdRequestGateForTests = () => {
  lastRequestAtBySlot.clear();
};
