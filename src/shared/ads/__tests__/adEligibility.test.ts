import {
  DETAIL_AD_MIN_BODY_HEIGHT,
  isDetailAdEligible,
} from '../adEligibility';

describe('isDetailAdEligible', () => {
  it('본문과 첨부 영역이 600dp 미만이면 상세 광고를 표시하지 않는다', () => {
    expect(isDetailAdEligible(DETAIL_AD_MIN_BODY_HEIGHT - 1)).toBe(false);
  });

  it('본문과 첨부 영역이 600dp 이상이면 상세 광고를 표시한다', () => {
    expect(isDetailAdEligible(DETAIL_AD_MIN_BODY_HEIGHT)).toBe(true);
  });
});
