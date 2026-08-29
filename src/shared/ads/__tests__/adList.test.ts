import {interleaveAdGroups, interleaveAds} from '../adList';

describe('interleaveAds', () => {
  it('콘텐츠가 10개 미만이면 광고를 추가하지 않는다', () => {
    const result = interleaveAds(Array.from({length: 9}, (_, index) => index));

    expect(result.filter(item => item.kind === 'ad')).toHaveLength(0);
  });

  it('실제 콘텐츠 10개마다 광고를 상한 없이 추가한다', () => {
    const result = interleaveAds(Array.from({length: 25}, (_, index) => index));

    expect(
      result.flatMap((item, index) =>
        item.kind === 'ad' ? [{index, slotIndex: item.slotIndex}] : [],
      ),
    ).toEqual([
      {index: 10, slotIndex: 1},
      {index: 21, slotIndex: 2},
    ]);
  });

  it('광고 비활성화 시 콘텐츠만 반환한다', () => {
    const result = interleaveAds(
      Array.from({length: 20}, (_, index) => index),
      {enabled: false},
    );

    expect(result).toHaveLength(20);
    expect(result.every(item => item.kind === 'content')).toBe(true);
  });
});

describe('interleaveAdGroups', () => {
  it('10개 단위 카드 뒤에만 광고를 추가하고 마지막 미완성 묶음 뒤에는 추가하지 않는다', () => {
    const result = interleaveAdGroups(
      Array.from({length: 25}, (_, index) => index),
    );

    expect(
      result.map(item =>
        item.kind === 'ad'
          ? `ad-${item.slotIndex}`
          : `content-${item.content.length}`,
      ),
    ).toEqual(['content-10', 'ad-1', 'content-10', 'ad-2', 'content-5']);
  });
});
