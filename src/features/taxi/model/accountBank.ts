export const TAXI_ACCOUNT_BANK_NAMES: string[] = [
  '카카오뱅크',
  '토스뱅크',
  '국민은행',
  '신한은행',
  '하나은행',
  '우리은행',
  '기업은행',
  '농협은행',
  'SC제일은행',
  '씨티은행',
  '대구은행',
  '부산은행',
  '경남은행',
  '광주은행',
  '전북은행',
  '제주은행',
  'SH수협은행',
  '케이뱅크',
];

const BANK_NAME_BY_ALIAS: Record<string, string> = {
  ibk: '기업은행',
  kb: '국민은행',
  'k뱅크': '케이뱅크',
  sc: 'SC제일은행',
  sh: 'SH수협은행',
  'sc제일': 'SC제일은행',
  'sc제일은행': 'SC제일은행',
  'sh수협': 'SH수협은행',
  'sh수협은행': 'SH수협은행',
  '경남': '경남은행',
  '경남은행': '경남은행',
  '광주': '광주은행',
  '광주은행': '광주은행',
  '국민': '국민은행',
  '국민은행': '국민은행',
  '기업': '기업은행',
  '기업은행': '기업은행',
  '농협': '농협은행',
  '농협은행': '농협은행',
  '대구': '대구은행',
  '대구은행': '대구은행',
  '부산': '부산은행',
  '부산은행': '부산은행',
  '수협': 'SH수협은행',
  '신한': '신한은행',
  '신한은행': '신한은행',
  '씨티': '씨티은행',
  '씨티은행': '씨티은행',
  '우리': '우리은행',
  '우리은행': '우리은행',
  '전북': '전북은행',
  '전북은행': '전북은행',
  '제주': '제주은행',
  '제주은행': '제주은행',
  '카뱅': '카카오뱅크',
  '카카오': '카카오뱅크',
  '카카오뱅크': '카카오뱅크',
  '케이뱅크': '케이뱅크',
  '토스': '토스뱅크',
  '토스뱅크': '토스뱅크',
  '하나': '하나은행',
  '하나은행': '하나은행',
};

const normalizeBankText = (value: string) =>
  value.replace(/\s/g, '').toLowerCase();

const aliasesByLength = Object.keys(BANK_NAME_BY_ALIAS).sort(
  (left, right) => right.length - left.length,
);

export const resolveTaxiAccountBankName = (value: string) => {
  const normalizedValue = normalizeBankText(value);

  if (!normalizedValue) {
    return undefined;
  }

  const matchedAlias = aliasesByLength.find(alias =>
    normalizedValue.includes(alias),
  );

  return matchedAlias ? BANK_NAME_BY_ALIAS[matchedAlias] : undefined;
};
