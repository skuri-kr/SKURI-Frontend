const UNKNOWN_TAXI_FARE_LABEL = '알 수 없음';

export type TaxiFareSplitStrategy =
  | 'anticipate-next-passenger'
  | 'current-members-only';

const PRESET_ROUTE_BASE_FARES = new Map<string, number>([
  [createRouteKey('명학역', '성결대학교'), 4800],
  [createRouteKey('안양역', '성결대학교'), 6700],
  [createRouteKey('금정역', '성결대학교'), 5700],
  [createRouteKey('범계역', '성결대학교'), 7100],
  [createRouteKey('명학역', '안양역'), 5600],
  [createRouteKey('명학역', '금정역'), 6100],
  [createRouteKey('명학역', '범계역'), 5500],
  [createRouteKey('안양역', '금정역'), 7200],
  [createRouteKey('안양역', '범계역'), 7500],
  [createRouteKey('금정역', '범계역'), 7300],
]);

export interface EstimateTaxiFareParams {
  currentMemberCount: number;
  departureLabel: string;
  destinationLabel: string;
  maxMemberCount: number;
  splitStrategy?: TaxiFareSplitStrategy;
}

function normalizeLocationLabel(label: string) {
  return label.trim();
}

function createRouteKey(a: string, b: string) {
  return [normalizeLocationLabel(a), normalizeLocationLabel(b)].sort().join('::');
}

function resolveExpectedSplitCount({
  currentMemberCount,
  maxMemberCount,
  splitStrategy = 'anticipate-next-passenger',
}: Pick<
  EstimateTaxiFareParams,
  'currentMemberCount' | 'maxMemberCount' | 'splitStrategy'
>) {
  if (currentMemberCount <= 0 || maxMemberCount <= 0) {
    return null;
  }

  if (splitStrategy === 'current-members-only') {
    return currentMemberCount;
  }

  return currentMemberCount >= maxMemberCount
    ? currentMemberCount
    : currentMemberCount + 1;
}

export function estimateTaxiFarePerPerson({
  currentMemberCount,
  departureLabel,
  destinationLabel,
  maxMemberCount,
  splitStrategy,
}: EstimateTaxiFareParams): number | null {
  const baseFare = PRESET_ROUTE_BASE_FARES.get(
    createRouteKey(departureLabel, destinationLabel),
  );

  if (!baseFare) {
    return null;
  }

  const splitCount = resolveExpectedSplitCount({
    currentMemberCount,
    maxMemberCount,
    splitStrategy,
  });

  if (!splitCount) {
    return null;
  }

  return Math.floor(baseFare / splitCount);
}

export function formatEstimatedTaxiFareLabel(
  params: EstimateTaxiFareParams,
): string {
  const estimatedFarePerPerson = estimateTaxiFarePerPerson(params);

  if (estimatedFarePerPerson === null) {
    return UNKNOWN_TAXI_FARE_LABEL;
  }

  return `${estimatedFarePerPerson.toLocaleString('ko-KR')}원`;
}
