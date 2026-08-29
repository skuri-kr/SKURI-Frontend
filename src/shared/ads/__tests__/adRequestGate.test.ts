import {
  MIN_AD_REQUEST_INTERVAL_MS,
  getAdRequestDelay,
  recordAdRequest,
  resetAdRequestGateForTests,
} from '../adRequestGate';

describe('adRequestGate', () => {
  beforeEach(() => {
    resetAdRequestGateForTests();
  });

  it('처음 방문한 광고 슬롯은 즉시 요청할 수 있다', () => {
    expect(getAdRequestDelay('noticeList:1', 1_000)).toBe(0);
  });

  it('같은 슬롯의 재요청은 60초까지 지연한다', () => {
    recordAdRequest('noticeList:1', 1_000);

    expect(getAdRequestDelay('noticeList:1', 11_000)).toBe(
      MIN_AD_REQUEST_INTERVAL_MS - 10_000,
    );
    expect(getAdRequestDelay('noticeList:1', 61_000)).toBe(0);
  });

  it('서로 다른 위치와 슬롯은 독립적으로 판단한다', () => {
    recordAdRequest('noticeList:1', 1_000);

    expect(getAdRequestDelay('noticeList:2', 1_500)).toBe(0);
    expect(getAdRequestDelay('communityBoardList:1', 1_500)).toBe(0);
  });
});
