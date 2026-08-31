// SKTaxi: Repository Context 정의 - DIP 의존성 주입 구현
// React Context를 사용하여 Repository 인스턴스를 앱 전체에 제공

import {createContext} from 'react';
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
  IContentBlockRepository,
  IFriendInvitationRepository,
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
 * 모든 Repository 인스턴스를 포함하는 컨테이너 타입
 */
export interface RepositoryContainer {
  partyRepository: IPartyRepository;
  chatRepository: IChatRepository;
  contentBlockRepository: IContentBlockRepository;
  friendRepository: IFriendInvitationRepository;
  boardRepository: IBoardRepository;
  noticeRepository: INoticeRepository;
  reportRepository: IReportRepository;
  notificationRepository: INotificationRepository;
  appNoticeRepository: IAppNoticeRepository;
  cafeteriaRepository: ICafeteriaRepository;
  academicRepository: IAcademicRepository;
  campusBannerRepository: ICampusBannerRepository;
  authRepository: IAuthRepository;
  memberRepository: IMemberRepository;
  memberDirectoryRepository: IMemberDirectoryRepository;
  myPageRepository: IMyPageRepository;
  profileEditRepository: IProfileEditRepository;
  userActivityRepository: IUserActivityRepository;
  notificationSettingsScreenRepository: INotificationSettingsScreenRepository;
  accountManagementRepository: IAccountManagementRepository;
  appConfigRepository: IAppConfigRepository;
  inquiryFormRepository: IInquiryFormRepository;
  legalDocumentRepository: ILegalDocumentRepository;
  timetableRepository: ITimetableRepository;
  notificationActionRepository: INotificationActionRepository;
  taxiChatRepository: ITaxiChatRepository;
}

/**
 * Repository Context
 * Provider 없이 사용 시 undefined - useRepository 훅에서 에러 처리
 */
export const RepositoryContext = createContext<RepositoryContainer | undefined>(
  undefined,
);
