import {buildAppSettingScreenData} from '../useAppSettingData';

const legalItemIds = (showAdPrivacy: boolean) => {
  const data = buildAppSettingScreenData('1.0.0', showAdPrivacy);
  return data.sections.find(section => section.id === 'legal')?.items.map(item => item.id);
};

describe('buildAppSettingScreenData', () => {
  it('UMP 개인정보 옵션이 필요하지 않으면 광고 설정을 숨긴다', () => {
    expect(legalItemIds(false)).toEqual([
      'terms-of-use',
      'privacy-policy',
    ]);
  });

  it('UMP 개인정보 옵션이 필요할 때만 광고 설정을 표시한다', () => {
    expect(legalItemIds(true)).toEqual([
      'terms-of-use',
      'privacy-policy',
      'ad-privacy',
    ]);
  });
});
