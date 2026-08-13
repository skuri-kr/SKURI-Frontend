import {
  formatKoreanCompactDateTime,
  formatKoreanRelativeTime,
} from '../datetime';

describe('datetime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 13, 18, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatKoreanRelativeTime', () => {
    it.each([
      [new Date(2026, 7, 13, 17, 59, 30), '방금 전'],
      [new Date(2026, 7, 13, 17, 30), '30분 전'],
      [new Date(2026, 7, 13, 15, 0), '3시간 전'],
      [new Date(2026, 7, 3, 18, 0), '10일 전'],
      [new Date(2026, 5, 13, 18, 0), '2개월 전'],
      [new Date(2024, 7, 13, 18, 0), '2년 전'],
    ])('%s를 %s로 표시한다', (value, expected) => {
      expect(formatKoreanRelativeTime(value)).toBe(expected);
    });

    it('미래 시간과 유효하지 않은 값은 기존 정책을 유지한다', () => {
      expect(formatKoreanRelativeTime(new Date(2026, 7, 13, 18, 1))).toBe(
        '곧',
      );
      expect(formatKoreanRelativeTime('invalid')).toBe('');
    });
  });

  describe('formatKoreanCompactDateTime', () => {
    it('올해 작성한 댓글은 연도를 생략한다', () => {
      expect(formatKoreanCompactDateTime(new Date(2026, 7, 13, 15, 20))).toBe(
        '08.13 15:20',
      );
    });

    it('다른 해에 작성한 댓글은 연도를 포함한다', () => {
      expect(formatKoreanCompactDateTime(new Date(2025, 7, 13, 17, 10))).toBe(
        '2025.08.13 17:10',
      );
    });

    it('유효하지 않은 값은 빈 문자열로 표시한다', () => {
      expect(formatKoreanCompactDateTime('invalid')).toBe('');
    });
  });
});
