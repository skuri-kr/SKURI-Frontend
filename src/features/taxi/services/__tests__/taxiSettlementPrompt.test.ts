import {
  calculateTaxiDistanceMeters,
  canShowTaxiSettlementPrompt,
  findTaxiAccountCandidate,
  isNearTaxiSettlementDestination,
  isTaxiSettlementTimeFallbackDue,
  isWithinTaxiSettlementLocationWindow,
} from '../taxiSettlementPrompt';

describe('taxiSettlementPrompt', () => {
  describe('findTaxiAccountCandidate', () => {
    it('계좌번호와 예금주가 함께 있는 텍스트를 감지한다', () => {
      expect(findTaxiAccountCandidate('110453954441 허민재')).toEqual({
        accountHolder: '허민재',
        accountNumber: '110453954441',
        bankName: undefined,
      });
    });

    it('은행 별칭이 있는 계좌번호를 감지하고 정식 은행명으로 정규화한다', () => {
      expect(findTaxiAccountCandidate('110332929 신한')).toEqual({
        accountHolder: undefined,
        accountNumber: '110332929',
        bankName: '신한은행',
      });
    });

    it('전화번호 형태의 계좌번호도 예외 없이 감지한다', () => {
      expect(findTaxiAccountCandidate('010-1234-5678 허민재')).toEqual({
        accountHolder: '허민재',
        accountNumber: '01012345678',
        bankName: undefined,
      });
    });

    it('공백과 하이픈으로 나뉜 계좌번호와 은행명을 감지한다', () => {
      expect(
        findTaxiAccountCandidate('카뱅 3333 01 1234567 입금 부탁드려요'),
      ).toEqual({
        accountHolder: undefined,
        accountNumber: '3333011234567',
        bankName: '카카오뱅크',
      });
    });

    it('계좌번호만 있거나 길이 범위를 벗어나면 감지하지 않는다', () => {
      expect(findTaxiAccountCandidate('110453954441')).toBeNull();
      expect(findTaxiAccountCandidate('1234567 허민재')).toBeNull();
      expect(findTaxiAccountCandidate('123456789012345678901 허민재')).toBeNull();
    });

    it('계좌 입력 라벨은 예금주로 오인하지 않는다', () => {
      expect(findTaxiAccountCandidate('계좌번호 110453954441')).toBeNull();
    });

    it('계좌 안내 문구보다 계좌번호에 가장 가까운 예금주를 선택한다', () => {
      expect(findTaxiAccountCandidate('내 계좌는 110453954441 허민재')).toEqual({
        accountHolder: '허민재',
        accountNumber: '110453954441',
        bankName: undefined,
      });
    });
  });

  it('리더이고 모집 중/마감이며 정산 대상이 있을 때만 노출한다', () => {
    expect(
      canShowTaxiSettlementPrompt({
        hasSettlementTarget: true,
        isLeader: true,
        partyStatus: 'open',
      }),
    ).toBe(true);
    expect(
      canShowTaxiSettlementPrompt({
        hasSettlementTarget: true,
        isLeader: true,
        partyStatus: 'closed',
      }),
    ).toBe(true);
    expect(
      canShowTaxiSettlementPrompt({
        hasSettlementTarget: true,
        isLeader: false,
        partyStatus: 'open',
      }),
    ).toBe(false);
    expect(
      canShowTaxiSettlementPrompt({
        hasSettlementTarget: false,
        isLeader: true,
        partyStatus: 'open',
      }),
    ).toBe(false);
    expect(
      canShowTaxiSettlementPrompt({
        hasSettlementTarget: true,
        isLeader: true,
        partyStatus: 'arrived',
      }),
    ).toBe(false);
  });

  it('위치 트리거는 정확하고 최근인 300m 이내 위치에서만 통과한다', () => {
    const nowMs = Date.parse('2026-08-17T12:00:00.000Z');
    const destination = {lat: 37.3805, lng: 126.9286, name: '성결대학교'};

    expect(
      isNearTaxiSettlementDestination({
        destination,
        location: {
          accuracyMeters: 35,
          latitude: 37.381,
          longitude: 126.9286,
          timestampMs: nowMs - 5_000,
        },
        nowMs,
      }),
    ).toBe(true);
    expect(
      isNearTaxiSettlementDestination({
        destination,
        location: {
          accuracyMeters: 2_000,
          latitude: 37.3805,
          longitude: 126.9286,
          timestampMs: nowMs - 5_000,
        },
        nowMs,
      }),
    ).toBe(false);
    expect(
      isNearTaxiSettlementDestination({
        destination,
        location: {
          accuracyMeters: 35,
          latitude: 37.3805,
          longitude: 126.9286,
          timestampMs: nowMs - 60_001,
        },
        nowMs,
      }),
    ).toBe(false);
    expect(
      isNearTaxiSettlementDestination({
        destination,
        location: {
          accuracyMeters: 35,
          latitude: 37.384,
          longitude: 126.9286,
          timestampMs: nowMs - 5_000,
        },
        nowMs,
      }),
    ).toBe(false);
  });

  it('출발 10분 전부터 4시간 후까지만 위치 트리거를 허용한다', () => {
    const departureTimeISO = '2026-08-17T12:00:00.000Z';
    const departureTimeMs = Date.parse(departureTimeISO);

    expect(
      isWithinTaxiSettlementLocationWindow({
        departureTimeISO,
        nowMs: departureTimeMs - 10 * 60_000,
      }),
    ).toBe(true);
    expect(
      isWithinTaxiSettlementLocationWindow({
        departureTimeISO,
        nowMs: departureTimeMs - 10 * 60_000 - 1,
      }),
    ).toBe(false);
    expect(
      isWithinTaxiSettlementLocationWindow({
        departureTimeISO,
        nowMs: departureTimeMs + 4 * 60 * 60_000,
      }),
    ).toBe(true);
    expect(
      isWithinTaxiSettlementLocationWindow({
        departureTimeISO,
        nowMs: departureTimeMs + 4 * 60 * 60_000 + 1,
      }),
    ).toBe(false);
  });

  it('출발 20분 후 시간 보조 트리거가 켜진다', () => {
    const departureTimeISO = '2026-08-17T12:00:00.000Z';
    const departureTimeMs = Date.parse(departureTimeISO);

    expect(
      isTaxiSettlementTimeFallbackDue({
        departureTimeISO,
        nowMs: departureTimeMs + 20 * 60_000 - 1,
      }),
    ).toBe(false);
    expect(
      isTaxiSettlementTimeFallbackDue({
        departureTimeISO,
        nowMs: departureTimeMs + 20 * 60_000,
      }),
    ).toBe(true);
  });

  it('거리 계산은 동일 좌표에서 0m를 반환한다', () => {
    expect(
      calculateTaxiDistanceMeters(
        {latitude: 37.3805, longitude: 126.9286},
        {lat: 37.3805, lng: 126.9286},
      ),
    ).toBe(0);
  });
});
