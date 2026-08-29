export const AD_ITEM_INTERVAL = 10;

export type InterleavedAdItem<T> =
  | {
      content: T;
      kind: 'content';
    }
  | {
      key: string;
      kind: 'ad';
      slotIndex: number;
    };

interface InterleaveAdsOptions {
  enabled?: boolean;
  interval?: number;
}

export const interleaveAds = <T>(
  items: T[],
  {enabled = true, interval = AD_ITEM_INTERVAL}: InterleaveAdsOptions = {},
): InterleavedAdItem<T>[] => {
  if (!enabled || interval <= 0) {
    return items.map(content => ({content, kind: 'content'}));
  }

  const result: InterleavedAdItem<T>[] = [];

  items.forEach((content, index) => {
    result.push({content, kind: 'content'});

    const contentCount = index + 1;
    if (contentCount % interval === 0) {
      const slotIndex = contentCount / interval;
      result.push({
        key: `ad-${slotIndex}`,
        kind: 'ad',
        slotIndex,
      });
    }
  });

  return result;
};

export const interleaveAdGroups = <T>(
  items: T[],
  {enabled = true, interval = AD_ITEM_INTERVAL}: InterleaveAdsOptions = {},
): InterleavedAdItem<T[]>[] => {
  if (!enabled || interval <= 0) {
    return items.length > 0
      ? [{content: items, kind: 'content'}]
      : [];
  }

  const result: InterleavedAdItem<T[]>[] = [];

  for (let startIndex = 0; startIndex < items.length; startIndex += interval) {
    const group = items.slice(startIndex, startIndex + interval);
    const slotIndex = startIndex / interval + 1;
    result.push({content: group, kind: 'content'});

    if (group.length === interval) {
      result.push({
        key: `ad-${slotIndex}`,
        kind: 'ad',
        slotIndex,
      });
    }
  }

  return result;
};
