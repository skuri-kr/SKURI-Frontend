import {getLoginBackgroundSeason} from '../loginBackgroundSeason';

describe('getLoginBackgroundSeason', () => {
  it.each([
    [1, 'autumn'],
    [2, 'spring'],
    [3, 'spring'],
    [4, 'spring'],
    [5, 'spring'],
    [6, 'spring'],
    [7, 'spring'],
    [8, 'autumn'],
    [9, 'autumn'],
    [10, 'autumn'],
    [11, 'autumn'],
    [12, 'autumn'],
  ] as const)('%i월에는 %s 배경을 선택한다', (month, expected) => {
    const date = new Date(2026, month - 1, 1);

    expect(getLoginBackgroundSeason(date)).toBe(expected);
  });
});
