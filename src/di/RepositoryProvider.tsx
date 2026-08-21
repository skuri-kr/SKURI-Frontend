// SKTaxi: Repository Provider 컴포넌트 - DIP 의존성 주입 구현
// Repository 인스턴스를 앱 전체에 제공하는 Provider

import React, {useMemo, type ReactNode} from 'react';

import {SpringBoardRepository} from '@/features/board/data/repositories/SpringBoardRepository';
import {
  SpringMemberDirectoryRepository,
  SpringMemberRepository,
} from '@/features/member';
import {RepositoryContext, RepositoryContainer} from './RepositoryContext';
import {FirebaseAuthRepository} from '@/features/auth';
import {SpringAcademicRepository} from '@/features/campus/data/repositories/SpringAcademicRepository';
import {SpringCampusBannerRepository} from '@/features/campus/data/repositories/SpringCampusBannerRepository';
import {SpringCafeteriaRepository} from '@/features/campus/data/repositories/SpringCafeteriaRepository';
import {SpringChatRepository} from '@/features/chat/data/repositories/SpringChatRepository';
import {SpringFriendRepository} from '@/features/friend';
import {SpringNoticeRepository} from '@/features/notice/data/repositories/SpringNoticeRepository';
import {SpringReportRepository} from '@/features/report';
import {SpringAppConfigRepository} from '@/features/settings/data/repositories/SpringAppConfigRepository';
import {SpringAppNoticeRepository} from '@/features/settings/data/repositories/SpringAppNoticeRepository';
import {SpringInquiryFormRepository} from '@/features/settings/data/repositories/SpringInquiryFormRepository';
import {SpringLegalDocumentRepository} from '@/features/settings/data/repositories/SpringLegalDocumentRepository';
import {SpringPartyRepository} from '@/features/taxi/data/repositories/SpringPartyRepository';
import {SpringNotificationActionRepository} from '@/features/taxi/data/repositories/SpringNotificationActionRepository';
import {SpringTaxiChatRepository} from '@/features/taxi/data/repositories/SpringTaxiChatRepository';
import {SpringTimetableRepository} from '@/features/timetable/data/repositories/SpringTimetableRepository';
import {SpringAccountManagementRepository} from '@/features/user/data/repositories/SpringAccountManagementRepository';
import {SpringMyPageRepository} from '@/features/user/data/repositories/SpringMyPageRepository';
import {SpringNotificationRepository} from '@/features/user/data/repositories/SpringNotificationRepository';
import {SpringNotificationSettingsScreenRepository} from '@/features/user/data/repositories/SpringNotificationSettingsScreenRepository';
import {SpringProfileEditRepository} from '@/features/user/data/repositories/SpringProfileEditRepository';
import {SpringUserActivityRepository} from '@/features/user/data/repositories/SpringUserActivityRepository';

interface RepositoryProviderProps {
  children: ReactNode;
  /**
   * 커스텀 Repository 컨테이너 주입 (테스트용)
   * 제공되지 않으면 기본 Spring 구현체 사용
   */
  customRepositories?: Partial<RepositoryContainer>;
}

/**
 * Repository Provider 컴포넌트
 * App.tsx 최상위에서 사용하여 모든 하위 컴포넌트에 Repository 제공
 */
export function RepositoryProvider({
  children,
  customRepositories,
}: RepositoryProviderProps) {
  // Repository 인스턴스를 메모이제이션하여 불필요한 재생성 방지
  // 이는 Context re-render 문제를 방지
  const repositories = useMemo<RepositoryContainer>(() => {
    const memberRepository = new SpringMemberRepository();
    const defaultRepositories: RepositoryContainer = {
      partyRepository: new SpringPartyRepository(),
      chatRepository: new SpringChatRepository(),
      friendRepository: new SpringFriendRepository(),
      boardRepository: new SpringBoardRepository(),
      noticeRepository: new SpringNoticeRepository(),
      reportRepository: new SpringReportRepository(),
      notificationRepository: new SpringNotificationRepository(),
      appNoticeRepository: new SpringAppNoticeRepository(),
      cafeteriaRepository: new SpringCafeteriaRepository(),
      academicRepository: new SpringAcademicRepository(),
      campusBannerRepository: new SpringCampusBannerRepository(),
      authRepository: new FirebaseAuthRepository(),
      memberRepository,
      memberDirectoryRepository: new SpringMemberDirectoryRepository(),
      myPageRepository: new SpringMyPageRepository(),
      profileEditRepository: new SpringProfileEditRepository(memberRepository),
      userActivityRepository: new SpringUserActivityRepository(),
      notificationSettingsScreenRepository:
        new SpringNotificationSettingsScreenRepository(memberRepository),
      accountManagementRepository: new SpringAccountManagementRepository(),
      appConfigRepository: new SpringAppConfigRepository(),
      inquiryFormRepository: new SpringInquiryFormRepository(),
      legalDocumentRepository: new SpringLegalDocumentRepository(),
      timetableRepository: new SpringTimetableRepository(),
      notificationActionRepository: new SpringNotificationActionRepository(),
      taxiChatRepository: new SpringTaxiChatRepository(),
    };

    // 커스텀 Repository가 제공되면 병합 (테스트용)
    if (customRepositories) {
      return {
        ...defaultRepositories,
        ...customRepositories,
      };
    }

    return defaultRepositories;
  }, [customRepositories]);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}
