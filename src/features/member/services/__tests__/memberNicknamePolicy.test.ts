import {
  containsReservedNicknameKeyword,
  RESERVED_NICKNAME_MESSAGE,
} from '../memberNicknamePolicy';

describe('memberNicknamePolicy', () => {
  it.each([
    '스쿠리 유저',
    '새 스 쿠 리\u3000유 저 계정',
    '우리 운영자님',
  ])('공백 형태와 관계없이 예약어가 포함된 %s 닉네임을 차단한다', nickname => {
    expect(containsReservedNicknameKeyword(nickname)).toBe(true);
  });

  it('일반 닉네임은 허용한다', () => {
    expect(containsReservedNicknameKeyword('스쿠리친구')).toBe(false);
    expect(RESERVED_NICKNAME_MESSAGE).toContain('사용할 수 없습니다');
  });
});
