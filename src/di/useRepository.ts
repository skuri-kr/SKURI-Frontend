// SKTaxi: Repository 접근 훅 - DIP 의존성 주입 구현
// 컴포넌트에서 Repository에 쉽게 접근할 수 있는 훅 제공

import {useContext} from 'react';

import {RepositoryContext, RepositoryContainer} from './RepositoryContext';
import type {
  IAcademicRepository,
  IAccountManagementRepository,
  IAppConfigRepository,
  IAppNoticeRepository,
  IAuthRepository,
  IBoardRepository,
  ICampusBannerRepository,
  ICafeteriaRepository,
  IChatRepository,
  IFriendRepository,
  IInquiryFormRepository,
  ILegalDocumentRepository,
  IMemberDirectoryRepository,
  IMemberRepository,
  IMyPageRepository,
  INotificationActionRepository,
  INotificationRepository,
  INotificationSettingsScreenRepository,
  INoticeRepository,
  IPartyRepository,
  IProfileEditRepository,
  IReportRepository,
  ITaxiChatRepository,
  ITimetableRepository,
  IUserActivityRepository,
} from './repositoryContracts';

/**
 * 전체 Repository 컨테이너 접근 훅
 * @throws Provider 없이 사용 시 에러
 */
export function useRepositories(): RepositoryContainer {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
}

/**
 * Party Repository 접근 훅
 */
export function usePartyRepository(): IPartyRepository {
  const {partyRepository} = useRepositories();
  return partyRepository;
}

/**
 * Chat Repository 접근 훅
 */
export function useChatRepository(): IChatRepository {
  const {chatRepository} = useRepositories();
  return chatRepository;
}

/**
 * Friend Repository 접근 훅
 */
export function useFriendRepository(): IFriendRepository {
  const {friendRepository} = useRepositories();
  return friendRepository;
}

/**
 * Board Repository 접근 훅
 */
export function useBoardRepository(): IBoardRepository {
  const {boardRepository} = useRepositories();
  return boardRepository;
}

/**
 * Notice Repository 접근 훅
 */
export function useNoticeRepository(): INoticeRepository {
  const {noticeRepository} = useRepositories();
  return noticeRepository;
}

/**
 * Report Repository 접근 훅
 */
export function useReportRepository(): IReportRepository {
  const {reportRepository} = useRepositories();
  return reportRepository;
}

/**
 * Notification Repository 접근 훅
 */
export function useNotificationRepository(): INotificationRepository {
  const {notificationRepository} = useRepositories();
  return notificationRepository;
}

/**
 * App Notice Repository 접근 훅
 */
export function useAppNoticeRepository(): IAppNoticeRepository {
  const {appNoticeRepository} = useRepositories();
  return appNoticeRepository;
}

/**
 * Cafeteria Repository 접근 훅
 */
export function useCafeteriaRepository(): ICafeteriaRepository {
  const {cafeteriaRepository} = useRepositories();
  return cafeteriaRepository;
}

/**
 * Academic Repository 접근 훅
 */
export function useAcademicRepository(): IAcademicRepository {
  const {academicRepository} = useRepositories();
  return academicRepository;
}

/**
 * Campus banner Repository 접근 훅
 */
export function useCampusBannerRepository(): ICampusBannerRepository {
  const {campusBannerRepository} = useRepositories();
  return campusBannerRepository;
}

/**
 * Auth Repository 접근 훅
 */
export function useAuthRepository(): IAuthRepository {
  const {authRepository} = useRepositories();
  return authRepository;
}

/**
 * Member Repository 접근 훅
 */
export function useMemberRepository(): IMemberRepository {
  const {memberRepository} = useRepositories();
  return memberRepository;
}

export function useMemberDirectoryRepository(): IMemberDirectoryRepository {
  const {memberDirectoryRepository} = useRepositories();
  return memberDirectoryRepository;
}

export function useMyPageRepository(): IMyPageRepository {
  const {myPageRepository} = useRepositories();
  return myPageRepository;
}

export function useProfileEditRepository(): IProfileEditRepository {
  const {profileEditRepository} = useRepositories();
  return profileEditRepository;
}

export function useUserActivityRepository(): IUserActivityRepository {
  const {userActivityRepository} = useRepositories();
  return userActivityRepository;
}

export function useNotificationSettingsScreenRepository(): INotificationSettingsScreenRepository {
  const {notificationSettingsScreenRepository} = useRepositories();
  return notificationSettingsScreenRepository;
}

export function useAccountManagementRepository(): IAccountManagementRepository {
  const {accountManagementRepository} = useRepositories();
  return accountManagementRepository;
}

export function useAppConfigRepository(): IAppConfigRepository {
  const {appConfigRepository} = useRepositories();
  return appConfigRepository;
}

export function useInquiryFormRepository(): IInquiryFormRepository {
  const {inquiryFormRepository} = useRepositories();
  return inquiryFormRepository;
}

export function useLegalDocumentRepository(): ILegalDocumentRepository {
  const {legalDocumentRepository} = useRepositories();
  return legalDocumentRepository;
}

export function useTimetableRepository(): ITimetableRepository {
  const {timetableRepository} = useRepositories();
  return timetableRepository;
}

/**
 * Notification action Repository 접근 훅
 */
export function useNotificationActionRepository(): INotificationActionRepository {
  const {notificationActionRepository} = useRepositories();
  return notificationActionRepository;
}

/**
 * Taxi chat Repository 접근 훅
 */
export function useTaxiChatRepository(): ITaxiChatRepository {
  const {taxiChatRepository} = useRepositories();
  return taxiChatRepository;
}

/**
 * 전체 Repository 컨테이너 접근 훅 (별칭)
 * useRepositories와 동일
 */
export const useRepository = useRepositories;
