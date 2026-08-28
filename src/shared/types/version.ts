export interface VersionModalConfig {
  icon?: string;
  title?: string;
  message?: string;
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
}

export interface AppVersionInfo {
  minimumVersion: string;
  forceUpdate: boolean;
  modalConfig?: VersionModalConfig;
}

export type StartupModalMode =
  | 'hidden'
  | 'force-update'
  | 'soft-update'
  | 'maintenance';

export type VisibleStartupModalMode = Exclude<StartupModalMode, 'hidden'>;

export interface StartupNoticeItem {
  body: string;
  id: string;
  isImportant?: boolean;
  publishedLabel: string;
  summary: string;
  title: string;
}
