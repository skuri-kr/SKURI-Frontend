import {
  RESERVED_NICKNAME_MESSAGE,
} from '@/features/member/services/memberNicknamePolicy';

import {validateCompleteProfileForm} from '../profileCompletionService';

jest.mock('@/shared/lib/analytics', () => ({
  setUserProperties: jest.fn(),
}));

const validValues = {
  ageConfirmed: true,
  department: '컴퓨터공학과',
  displayName: '가람',
  studentId: '20241234',
  termsAccepted: true,
};

describe('validateCompleteProfileForm', () => {
  it('예약어가 포함된 닉네임으로 회원가입을 완료하지 못하게 한다', () => {
    expect(
      validateCompleteProfileForm({
        ...validValues,
        displayName: '스쿠리 유저2',
      }),
    ).toBe(RESERVED_NICKNAME_MESSAGE);
  });

  it('일반 닉네임은 통과시킨다', () => {
    expect(validateCompleteProfileForm(validValues)).toBeNull();
  });
});
