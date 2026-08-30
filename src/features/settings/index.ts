export {SpringAppNoticeRepository} from './data/repositories/SpringAppNoticeRepository';
export {SpringAppConfigRepository} from './data/repositories/SpringAppConfigRepository';
export type {
  AppNotice,
  IAppNoticeRepository,
} from './data/repositories/IAppNoticeRepository';
export type {
  AppVersionInfo,
  IAppConfigRepository,
  VersionModalConfig,
} from './data/repositories/IAppConfigRepository';
export type {ILegalDocumentRepository} from './data/repositories/ILegalDocumentRepository';
export type {
  IInquiryFormRepository,
  SubmitInquiryFormPayload,
} from './data/repositories/IInquiryFormRepository';
export type {
  CreateInquiryData,
  Inquiry,
  InquiryType,
  IInquiryRepository,
} from './data/repositories/IInquiryRepository';

export {useAppSettingData} from './hooks/useAppSettingData';
export {CURRENT_TERMS_VERSION} from './constants/legalDocumentVersions';
export {useAppNoticeFeedData} from './hooks/useAppNoticeFeedData';
export {useLegalDocumentData} from './hooks/useLegalDocumentData';
export {useInquiryFormData} from './hooks/useInquiryFormData';
export {useInquiryHistoryData} from './hooks/useInquiryHistoryData';
export { AppNoticeDetailScreen } from './screens/AppNoticeDetailScreen';
export { InquiryHistoryScreen } from './screens/InquiryHistoryScreen';
export { InquiriesScreen } from './screens/InquiriesScreen';
export { LegalDocumentScreen } from './screens/LegalDocumentScreen';
export { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
export { SettingScreen } from './screens/SettingScreen';
export { TermsOfUseScreen } from './screens/TermsOfUseScreen';
export { AppNoticeFeedList } from './components/AppNoticeFeedList';

export type {
  InquiryFormTypeKey,
} from './model/inquiryFormSource';
export type {
  InquiryFormScreenViewData,
  InquiryTypeOptionViewData,
} from './model/inquiryFormViewData';
export type {
  InquiryHistoryItemViewData,
  InquiryHistoryScreenViewData,
} from './model/inquiryHistoryViewData';
export type {
  LegalDocumentBannerIconKey,
  LegalDocumentBannerLineSource,
  LegalDocumentBannerLineTone,
  LegalDocumentBannerTone,
  LegalDocumentKey,
  LegalDocumentSectionSource,
  LegalDocumentSource,
} from './model/legalDocumentSource';
export type {
  LegalDocumentBannerLineViewData,
  LegalDocumentBannerViewData,
  LegalDocumentScreenViewData,
  LegalDocumentSectionViewData,
} from './model/legalDocumentViewData';

export {
  buildAppNoticeForegroundNotification,
  navigateToAppNoticeDetail,
} from './services/appNoticeNavigationService';
export {
  checkVersionUpdate,
  getCurrentAppVersion,
  getMinimumRequiredVersion,
} from './services/appVersionService';
