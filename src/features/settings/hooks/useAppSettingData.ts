import React from 'react';

import {COLORS} from '@/shared/design-system/tokens';

import type {
  AppSettingActionKey,
  AppSettingRowViewData,
  AppSettingScreenViewData,
} from '../model/appSettingViewData';
import {getCurrentAppVersion} from '../services/appVersionService';

type AppSettingIconKey =
  | 'darkMode'
  | 'termsOfUse'
  | 'privacyPolicy'
  | 'adPrivacy'
  | 'appName'
  | 'appVersion';

type AppSettingItemType = 'toggle' | 'link' | 'value';

interface AppSettingItemConfig {
  actionKey: AppSettingActionKey;
  disabled?: boolean;
  iconKey: AppSettingIconKey;
  id: string;
  subtitle?: string;
  title: string;
  type: AppSettingItemType;
  value?: string;
}

interface AppSettingSectionConfig {
  id: string;
  items: AppSettingItemConfig[];
  title: string;
}

const APP_SETTING_SECTIONS_BASE: AppSettingSectionConfig[] = [
  {
    id: 'display',
    title: '화면',
    items: [
      {
        actionKey: 'darkMode',
        disabled: true,
        iconKey: 'darkMode',
        id: 'dark-mode',
        subtitle: '추후 지원 예정',
        title: '다크 모드',
        type: 'toggle',
      },
    ],
  },
  {
    id: 'legal',
    title: '법적 정보',
    items: [
      {
        actionKey: 'termsOfUse',
        iconKey: 'termsOfUse',
        id: 'terms-of-use',
        title: '이용약관',
        type: 'link',
      },
      {
        actionKey: 'privacyPolicy',
        iconKey: 'privacyPolicy',
        id: 'privacy-policy',
        title: '개인정보 처리방침',
        type: 'link',
      },
      {
        actionKey: 'adPrivacy',
        iconKey: 'adPrivacy',
        id: 'ad-privacy',
        subtitle: '광고 동의 선택을 확인하거나 변경합니다',
        title: '광고 개인정보 설정',
        type: 'link',
      },
    ],
  },
  {
    id: 'app-info',
    title: '앱 정보',
    items: [
      {
        actionKey: 'appName',
        iconKey: 'appName',
        id: 'app-name',
        title: '앱 이름',
        type: 'value',
        value: '스쿠리 - SKURI',
      },
      {
        actionKey: 'appVersion',
        iconKey: 'appVersion',
        id: 'app-version',
        title: '버전',
        type: 'value',
      },
    ],
  },
];

const buildAppSettingSections = (
  appVersion: string,
): AppSettingSectionConfig[] => {
  return APP_SETTING_SECTIONS_BASE.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.actionKey === 'appVersion'
        ? {...item, value: `v${appVersion}`}
        : {...item},
    ),
  }));
};

const resolveRowIcon = (iconKey: AppSettingIconKey) => {
  switch (iconKey) {
    case 'darkMode':
      return {
        iconBackgroundColor: COLORS.background.subtle,
        iconColor: COLORS.text.secondary,
        iconName: 'moon-outline',
      };
    case 'termsOfUse':
      return {
        iconBackgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
        iconName: 'document-text-outline',
      };
    case 'privacyPolicy':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'shield-checkmark-outline',
      };
    case 'adPrivacy':
      return {
        iconBackgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
        iconName: 'options-outline',
      };
    case 'appName':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
        iconName: 'phone-portrait-outline',
      };
    case 'appVersion':
    default:
      return {
        iconBackgroundColor: COLORS.background.subtle,
        iconColor: COLORS.text.secondary,
        iconName: 'code-slash-outline',
      };
  }
};

const mapRow = (
  item: AppSettingSectionConfig['items'][number],
): AppSettingRowViewData => {
  const icon = resolveRowIcon(item.iconKey);

  return {
    accessoryType:
      item.type === 'toggle'
        ? 'toggle'
        : item.type === 'link'
          ? 'chevron'
          : 'value',
    actionKey: item.actionKey,
    disabled: Boolean(item.disabled),
    ...icon,
    id: item.id,
    subtitle: item.subtitle,
    title: item.title,
    toggleValue: false,
    valueLabel: item.value,
  };
};

const mapScreen = (
  sections: AppSettingSectionConfig[],
): AppSettingScreenViewData => {
  return {
    sections: sections.map(section => ({
      id: section.id,
      items: section.items.map(mapRow),
      title: section.title,
    })),
  };
};

export const useAppSettingData = () => {
  const data = React.useMemo<AppSettingScreenViewData>(() => {
    return mapScreen(buildAppSettingSections(getCurrentAppVersion()));
  }, []);

  return {data};
};
