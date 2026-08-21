const NICKNAME_SPACE_PATTERN =
  /[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g;
const RESERVED_NICKNAME_KEYWORDS = ['스쿠리유저', '운영자'] as const;

export const containsReservedNicknameKeyword = (nickname: string) => {
  const compactNickname = nickname
    .normalize('NFC')
    .trim()
    .replace(NICKNAME_SPACE_PATTERN, '')
    .toLocaleLowerCase();

  return RESERVED_NICKNAME_KEYWORDS.some(keyword =>
    compactNickname.includes(keyword),
  );
};

export const RESERVED_NICKNAME_MESSAGE =
  '‘스쿠리 유저’ 또는 ‘운영자’가 포함된 닉네임은 사용할 수 없습니다.';
