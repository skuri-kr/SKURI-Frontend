import {
  estimateTaxiFarePerPerson,
  formatEstimatedTaxiFareLabel,
} from '../taxiFareEstimator';

describe('taxiFareEstimator', () => {
  it('아직 자리가 남아 있으면 다음 탑승자까지 포함해 1인 요금을 계산한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 1,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBe(2400);

    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 2,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBe(1600);

    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 3,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBe(1200);
  });

  it('파티가 가득 찼으면 현재 인원 기준으로 1인 요금을 계산한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 4,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBe(1200);
  });

  it('current-members-only 전략이면 현재 인원 기준으로만 계산한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 1,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
        splitStrategy: 'current-members-only',
      }),
    ).toBe(4800);

    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 2,
        departureLabel: '명학역',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
        splitStrategy: 'current-members-only',
      }),
    ).toBe(2400);
  });

  it('나눗셈 결과는 소수점을 버림한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 2,
        departureLabel: '금정역',
        destinationLabel: '범계역',
        maxMemberCount: 4,
      }),
    ).toBe(2433);
  });

  it('양방향 경로를 같은 요금으로 계산한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 1,
        departureLabel: '성결대학교',
        destinationLabel: '명학역',
        maxMemberCount: 4,
      }),
    ).toBe(2400);
  });

  it('preset이 아닌 경로는 알 수 없음으로 처리한다', () => {
    expect(
      estimateTaxiFarePerPerson({
        currentMemberCount: 1,
        departureLabel: '직접 입력 출발지',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBeNull();

    expect(
      formatEstimatedTaxiFareLabel({
        currentMemberCount: 1,
        departureLabel: '직접 입력 출발지',
        destinationLabel: '성결대학교',
        maxMemberCount: 4,
      }),
    ).toBe('알 수 없음');
  });
});
