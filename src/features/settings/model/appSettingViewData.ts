export type AppSettingActionKey =
  | 'darkMode'
  | 'termsOfUse'
  | 'privacyPolicy'
  | 'adPrivacy'
  | 'appName'
  | 'appVersion';

export type AppSettingRowAccessory = 'toggle' | 'chevron' | 'value';

export interface AppSettingRowViewData {
  accessoryType: AppSettingRowAccessory;
  actionKey: AppSettingActionKey;
  disabled: boolean;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: string;
  id: string;
  subtitle?: string;
  title: string;
  toggleValue?: boolean;
  valueLabel?: string;
}

export interface AppSettingSectionViewData {
  id: string;
  items: AppSettingRowViewData[];
  title: string;
}

export interface AppSettingScreenViewData {
  sections: AppSettingSectionViewData[];
}
