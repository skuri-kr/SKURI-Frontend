# RN Spring 연동 진행 현황

> 최종 수정일: 2026-08-28
> 관련 문서: [RN Spring 연동 아키텍처 가이드](./frontend-architecture-guideline.md) | [RN Spring 연동 로드맵](./frontend-integration-roadmap.md) | [Spring API 커버리지와 로깅 가이드](./frontend-api-coverage.md) | [API 명세](./api-specification.md)

---

## 1. 문서 목적

이 문서는 React Native 프론트의 Spring 마이그레이션 작업이
현재 어디까지 진행되었는지 기록하는 상태 문서다.

이 문서는 다음 목적을 가진다.

- 현재 완료된 phase와 미완료 phase를 빠르게 파악
- 다음 Codex 스레드가 어디서부터 이어야 하는지 즉시 판단
- 이미 합의된 아키텍처/실행 규칙을 다시 뒤흔들지 않도록 기준 고정
- 참고: 관리자 웹 `/users` 상세용 `GET /v1/admin/members/{memberId}/activity`와 목록용 `GET /v1/admin/members` 확장 계약(`realname`, `lastLoginOs`, `currentAppVersion`, `sortBy/sortDirection`)은 backend에 존재하지만, 본 문서는 RN 앱 마이그레이션 상태만 추적한다. `currentAppVersion`은 최근 활성 FCM 토큰의 `app_version` 기준으로 제공된다.
- 참고: 관리자 웹 `/dashboard`용 `GET /v1/admin/dashboard/summary`, `GET /v1/admin/dashboard/activity`, `GET /v1/admin/dashboard/recent-items`도 backend에 존재하지만, 본 문서는 RN 앱 마이그레이션 상태만 추적한다. 일자 버킷은 `Asia/Seoul`, `totalMembers`는 `members` 전체 row 기준이다.
- 참고: 관리자 웹 `/parties`용 `GET /v1/admin/parties`, `GET /v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`, `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests`는 backend에 존재하지만, 본 문서는 RN 앱 마이그레이션 상태만 추적한다.
- 참고: 관리자 웹 `/boards`용 `GET /v1/admin/posts`, `GET /v1/admin/posts/{postId}`, `PATCH /v1/admin/posts/{postId}/moderation`, `GET /v1/admin/comments`, `PATCH /v1/admin/comments/{commentId}/moderation`는 backend에 존재하지만, 본 문서는 RN 앱 마이그레이션 상태만 추적한다.

---

## 2. 현재 기준 결론

- 최종 구조 기준 문서는 작성 완료
- 실행 로드맵 문서는 작성 완료
- Phase A 공통 transport 기반 구축은 1차 완료
- auth/member 경로의 Spring concrete repository는 CompleteProfile/guard 정리까지 연결 완료
- App Notice / Notification Center는 Spring API + 중앙 DI 기준으로 전환 완료
- Notification Center는 REST 초기 로드 + SSE 실시간 반영까지 연결 완료
- Taxi Home은 Spring REST query + join request/pending/chat entry 범위까지 연결 완료
- Taxi Party는 Spring REST/SSE + 중앙 DI 기준으로 my party / join request / leader 승인·거절 / recruit(create) / 지도 선택 기반 자유 입력 좌표 정책 / ChatScreen 고급 상태전이 chain까지 구현 완료
- Taxi Chat detail은 Spring REST/STOMP + 중앙 DI 기준으로 리더/멤버 메뉴, 수정/취소, ACCOUNT payload, arrive/end/cancel 서버 생성 메시지 흐름, 정산 현황 상단 공지 UI까지 구현 완료
- Taxi Chat detail의 STOMP lifecycle/auth reset blocker는 해소되어 이전 인증 세션 재사용 경로를 닫음
- 일반 Chat은 Spring REST/STOMP + 중앙 DI 기준으로 public discover/detail/join/leave/create surface, list/detail/messages/read/mute 및 `/user/queue/chat-rooms` summary realtime 연결 완료
- Community chat screen chain은 더 이상 mock `communityHomeRepository`/`chatDetailRepository`를 source of truth로 사용하지 않는다.
- Board detail, Notice home/detail, Community board home은 더 이상 feature-local repository entrypoint를 source of truth로 사용하지 않는다.
- Campus academic calendar detail은 중앙 DI `academicRepository` 기준으로 수렴했고, legacy Firebase/detail entrypoint dead path는 제거됐다.
- Board / Notice / Campus central repository는 이제 mock이 아니라 Spring concrete repository를 기본 source of truth로 사용한다.
- Minecraft feature는 Spring REST + public SSE 기준으로 overview/players/accounts 경로 연결이 완료됐다.
- Community board 탭은 중앙 DI `boardRepository`의 Spring 응답을 기준으로 목록/featured post를 조합한다.
- Board public contract는 관리자 moderation을 반영해 `HIDDEN` 게시글을 목록/상세에서 제외하고, `HIDDEN` 댓글은 placeholder로 마스킹한다.
- Phase H follow-up까지 반영되어 Board / Notice / Campus 본체 이전과 남아 있던 backend contract gap 3개 정리가 완료됐다.
- 공지·게시물 공유는 Share API에서 8자리 코드를 발급하고, 앱 링크 수신 시 인증 후 원본 ID를 resolve하는 Spring 계약으로 연결됐다. 기존 긴 링크와 deferred deep link는 지원하지 않는다.
- 공개 일반 채팅방은 joined/not joined를 함께 표시하고, 미참여 room detail preview + 참여하기 CTA + leave 후 not joined 복귀 정책까지 프론트에 반영됐다.
- 전역 DI와 feature-local entrypoint의 혼재는 줄었고, Taxi Home screen chain의 mock singleton도 제거됨
- 공식 작업 전략은 `migrate-as-you-centralize`

즉, 현재 상태는 다음과 같이 요약할 수 있다.

- 공통 infra는 준비되었고
- auth/bootstrap, CompleteProfile, FCM token 경로는 Spring 기준으로 고정됐고
- auth 진입선의 프로필/온보딩 source of truth도 member profile + local adjunct 기준으로 정리됐다.
- 이제 App Notice / Notification Center는 실서버 기준으로 동작하고, Notification Center는 SSE로 실시간 반영된다.
- Taxi Home도 목록/개인 상태 조회, 동승 요청 생성/취소, 수락 대기 화면, 실제 파티 채팅 진입까지 Spring 기준으로 정리됐다.
- Taxi Party의 전역 탭 상태(`My Party`, `JoinRequestCount`)와 leader join request 처리 모달은 더 이상 mock `IPartyRepository` 메모리 상태를 source of truth로 보지 않는다.
- Taxi Party의 주요 subscription은 SSE signal + Spring REST snapshot 재조회 기준으로 동기화된다.
- Taxi Chat detail도 mock singleton이 아니라 Spring REST/STOMP를 source of truth로 사용하기 시작했다.
- Taxi Chat detail의 STOMP client는 로그아웃/계정 전환 시 이전 Authorization 세션을 재사용하지 않도록 정리된다.
- 일반 Chat도 중앙 DI `chatRepository`를 기준으로 요약 목록/상세/메시지/read/mute 상태를 Spring source of truth로 읽는다.
- 일반 Chat room summary/unread/tab indicator는 `/user/queue/chat-rooms` 이벤트와 REST snapshot을 함께 사용해 같은 room cache를 기준으로 동기화된다.
- 일반 Chat의 Phase F 범위는 닫혔고, 다음 남은 Chat backlog는 이미지 메시지 실사용 연결과 이후 legacy 정리다.
- Phase G는 완료 상태이며, campus home/cafeteria detail을 포함한 남은 screen-level mock chain 정리를 마쳤다.
- Phase H는 Board / Notice / Campus central repository 전환과 follow-up contract 반영까지 완료 상태다.
- Minecraft feature는 feature-local composition 경계에 남아 있지만, 런타임 데이터는 이미 Spring API/SSE를 source of truth로 사용한다.

---

## 3. Phase 진행 현황

| Phase                                                 | 상태           | 비고                                                                                       |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| Phase A. 공통 Transport 구축                          | 진행 완료(1차) | 공통 API/실시간 레이어 및 전역 token resolver 추가                                         |
| Phase B. 인증/회원 bootstrap 정리                     | 완료           | CompleteProfile/guard/source-of-truth 정리까지 완료                                        |
| Phase C. App Notice / Notification Center / Taxi Home | 완료           | App Notice/Notification Center/Taxi Home screen chain 완료                                 |
| Phase D. Notification 정식 이전                       | 완료           | REST + unread count + SSE 실시간 동기화 완료                                               |
| Phase E. Taxi Party 정식 이전                         | 완료           | recruit 지도 선택 기반 자유 입력, Chat header/action tray, ACCOUNT/ARRIVE payload, 서버 생성 SYSTEM/ARRIVED/END 흐름까지 반영 완료 |
| Phase F. Chat 정식 이전                               | 완료           | Taxi Chat detail + 일반 공개 chat discover/detail/join/leave/create + summary realtime + read/mute + central DI 수렴 완료 |
| Phase G. 남은 mock 화면 체인 정리                     | 완료           | Board/Notice/Community/Campus 계열 screen-level local chain 정리 완료                      |
| Phase H. 정리/수렴                                    | 완료           | Board/Notice/Campus central repository Spring 전환 및 follow-up contract gap 3개 반영 완료 |

---

## 4. 이번까지 완료된 작업

### 4.1 아키텍처/로드맵 문서화

다음 문서를 추가하거나 갱신했다.

- `docs/spring-migration/frontend-architecture-guideline.md`
- `docs/spring-migration/frontend-integration-roadmap.md`
- `docs/spring-migration/implementation-roadmap.md`

핵심으로 고정된 규칙:

- Repository는 도메인 경계로 유지한다.
- 화면 조합은 Query/Assembler/Facade로 분리한다.
- 전역 DI가 최종 목표다.
- 하지만 전면 선리팩터링은 하지 않는다.
- 공통 infra는 먼저 진행하고, feature migration은 중앙화와 함께 진행한다.

### 4.2 Phase A 구현

다음 공통 파일을 추가했다.

- `src/shared/api/apiConfig.ts`
- `src/shared/api/authTokenProvider.ts`
- `src/shared/api/apiErrorMapper.ts`
- `src/shared/api/httpClient.ts`
- `src/shared/api/index.ts`
- `src/shared/realtime/sseClient.ts`
- `src/shared/realtime/chatSocketClient.ts`
- `src/shared/realtime/index.ts`

인증 훅에는 다음 연결을 추가했다.

- `src/features/auth/hooks/useAuthSession.ts`
  - `authRepository.refreshToken()`을 전역 auth token resolver에 등록

### 4.3 Phase A 결과

현재 가능한 것:

- 공통 REST base URL/timeout/config 관리
- Bearer token 자동 주입 가능한 HTTP client 사용
- SSE 연결에 필요한 URL/헤더/options 준비
- STOMP CONNECT에 필요한 URL/헤더/options 준비
- Spring repository 구현 시 공통 transport 재사용 가능

현재 아직 남은 것:

- concrete Spring repository 구현
- concrete feature에 맞는 SSE/STOMP 사용 지점 확장

### 4.4 Phase B 구현

다음 auth/member 경로를 추가하거나 갱신했다.

- `src/features/member/data/api/memberApiClient.ts`
- `src/features/member/data/dto/memberDto.ts`
- `src/features/member/data/dto/updateMemberProfileDto.ts`
- `src/features/member/data/mappers/memberMapper.ts`
- `src/features/member/data/repositories/IMemberRepository.ts`
- `src/features/member/data/repositories/SpringMemberRepository.ts`
- `src/features/member/model/types.ts`
- `src/features/member/services/memberFcmTokenService.ts`
- `src/features/member/index.ts`
- `src/di/RepositoryContext.ts`
- `src/di/RepositoryProvider.tsx`
- `src/di/repositoryContracts.ts`
- `src/di/useRepository.ts`
- `src/features/auth/services/authSessionService.ts`
- `src/features/auth/services/authLocalAdjunctService.ts`
- `src/features/auth/hooks/useAuthSession.ts`
- `src/app/bootstrap/registerPushHandlers.ts`
- `src/features/auth/services/permissionOnboardingService.ts`
- `src/features/auth/hooks/usePermissionOnboarding.ts`
- `src/features/auth/services/profileCompletionService.ts`
- `src/features/auth/hooks/useCompleteProfile.ts`
- `src/features/user/data/repositories/IUserRepository.ts`
- `src/features/user/data/repositories/FirebaseUserRepository.ts`

핵심 변경:

- Spring member API client/repository를 공통 transport 위에 추가
- `memberRepository`를 전역 DI에 등록
- `useAuthSession()`에서 인증 사용자 감지 시 아래 bootstrap 순서를 고정
  1. Firebase 로그인 상태 확인
  2. Firebase ID Token 확보
  3. `POST /v1/members`
  4. `GET /v1/members/me`
- `signInWithGoogle()` / `signInWithEmailAndPassword()`는 auth session 준비가 끝날 때까지 대기
- bootstrap 실패 시 half-authenticated 상태로 진행하지 않고 세션을 정리
- 앱 런타임 토큰 등록/refresh/로그아웃 토큰 해제를 모두 `/v1/members/me/fcm-tokens`로 전환
- `IUserRepository`의 Firebase FCM token 저장 메서드를 제거해 direct Firebase 저장 경로를 정리
- `CompleteProfileScreen` 저장 경로를 `PATCH /v1/members/me`로 이전
- auth state의 핵심 프로필 source of truth를 mock user profile 구독이 아니라 Spring member profile + local adjunct 기준으로 전환
- `permissionsComplete`를 AsyncStorage 기반 local adjunct로 영속화해 앱 재시작 후에도 유지되게 정리
- `finalizeGoogleSignIn()` / auth bootstrap 경로에서 `createInitialUserProfile()` / `syncLoginMetadata()` 의존을 제거
- backend 계약에 닉네임 중복 검사가 없음을 확인하고 CompleteProfile의 frontend pre-check를 제거

### 4.5 Phase B 결과

현재 가능한 것:

- 앱 재시작 시 기존 Firebase 세션이 있으면 Spring member bootstrap을 먼저 수행
- 신규 로그인 시 login function이 member bootstrap 완료 전에는 성공으로 반환되지 않음
- `CompleteProfileScreen` 제출값이 `PATCH /v1/members/me`로 저장됨
- `useAuthSession()`은 mock `userRepository.subscribeToUserProfile()` 없이 auth state를 구성함
- auth state `user`는 Spring member profile + local adjunct(`permissionsComplete`)를 source of truth로 사용함
- `PermissionOnboarding` 완료 상태가 user id 기준 local adjunct에 저장되어 앱 재시작 후에도 유지됨
- FCM token 등록/refresh/삭제가 member repository 경유로 Spring API를 호출함
- hook/screen에 서버 DTO를 직접 노출하지 않고 auth/member는 repository 경계만 참조함

Phase B 완료 판단 근거:

- `useAuthSession()`은 [useAuthSession.ts](/Users/jisung/SKTaxi/src/features/auth/hooks/useAuthSession.ts#L177)에서 member bootstrap 후 `GET /v1/members/me` 응답과 local adjunct를 합쳐 auth state를 만든다.
- `useAuthEntryGuard()`는 [useAuthEntryGuard.ts](/Users/jisung/SKTaxi/src/app/guards/useAuthEntryGuard.ts#L11)에서 이 auth state만 읽고 `CompleteProfile` / `PermissionOnboarding` 진입 여부를 결정한다.
- `permissionsComplete`는 [authLocalAdjunctService.ts](/Users/jisung/SKTaxi/src/features/auth/services/authLocalAdjunctService.ts#L1)에서 user id 기준 AsyncStorage에 저장되므로 mock in-memory 기본값으로 되돌아가지 않는다.
- `CompleteProfile` 제출 시 [profileCompletionService.ts](/Users/jisung/SKTaxi/src/features/auth/services/profileCompletionService.ts#L27)에서 member repository의 `updateMyProfile()`만 호출하고, frontend 닉네임 중복 pre-check는 수행하지 않는다.

### 4.6 Phase C 구현

다음 feature를 Spring API 기준으로 연결했다.

- App Notice
  - `src/features/settings/data/api/appNoticeApiClient.ts`
  - `src/features/settings/data/dto/appNoticeDto.ts`
  - `src/features/settings/data/mappers/appNoticeMapper.ts`
  - `src/features/settings/data/repositories/SpringAppNoticeRepository.ts`
  - `src/features/settings/application/appNoticeViewAssembler.ts`
  - `src/features/settings/hooks/useAppNoticeFeedData.ts`
  - `src/features/settings/hooks/useAppNoticeDetailData.ts`
- Notification Center
  - `src/features/user/data/api/notificationApiClient.ts`
  - `src/features/user/data/dto/notificationDto.ts`
  - `src/features/user/data/mappers/notificationMapper.ts`
  - `src/features/user/data/repositories/SpringNotificationRepository.ts`
  - `src/features/user/application/notificationCenterAssembler.ts`
  - `src/features/user/hooks/useNotificationCenterData.ts`
- Taxi Home
  - `src/features/taxi/data/api/taxiHomeApiClient.ts`
  - `src/features/taxi/data/dto/taxiHomeDto.ts`
  - `src/features/taxi/application/taxiHomeQuery.ts`
  - `src/features/taxi/application/taxiAcceptancePendingQuery.ts`
  - `src/features/taxi/hooks/useTaxiHomeData.ts`
  - `src/features/taxi/hooks/useTaxiAcceptancePendingData.ts`
  - `src/features/taxi/screens/TaxiScreen.tsx`
  - `src/features/taxi/screens/AcceptancePendingScreen.tsx`

이번 단계에서 실제로 사용한 API contract:

- App Notice
  - `GET /v1/app-notices`
  - `GET /v1/app-notices/{appNoticeId}`
- Notification Center
  - `GET /v1/notifications`
  - `POST /v1/notifications/{notificationId}/read`
  - `POST /v1/notifications/read-all`
  - `DELETE /v1/notifications/{notificationId}`
- Taxi Home
  - `GET /v1/parties?status=OPEN&size=50&sort=createdAt,desc`
  - `GET /v1/members/me/parties`
  - `GET /v1/members/me/join-requests?status=PENDING`
  - `GET /v1/members/me/join-requests`
  - `GET /v1/parties/{id}`
  - `POST /v1/parties/{partyId}/join-requests`
  - `PATCH /v1/join-requests/{id}/cancel`

계약 확인 결과:

- 로컬 `http://localhost:8080/v3/api-docs`, `/Users/jisung/skuri-backend`, markdown 명세를 모두 대조했고, 실제 구현은 `/v3/api-docs`를 1순위 기준으로 맞췄다.
- App Notice는 backend 응답에 작성자/조회수 필드가 없어서 assembler에서 화면 전용 placeholder/optional 값으로 흡수했다.
- Notification enum은 backend canonical enum을 repository mapper에서 기존 app navigation이 소비하는 문자열로 정규화했다.
- Notification의 `POST_LIKED + noticeId`는 `notice_post_like`로 유지하되 알림함 icon/탭 이동에서 notice detail dead path가 되지 않게 정리했다.
- SpringAppNoticeRepository의 상세 404는 공통 API mapper가 반환하는 `RepositoryError(NOT_FOUND)` 기준으로 null 처리한다.
- Taxi Home card에 필요한 예상 요금/참여자 아바타/요청 상태 일부는 현재 backend summary에 없어서 query layer에서 fallback 값으로 조합했다.
- Taxi Home의 `getMyParties()` / `getMyJoinRequests()`는 개인 상태 조회로 묶고, `NETWORK_ERROR` / `TIMEOUT` / `RATE_LIMITED`만 read-only fallback, 인증/권한/계약 오류는 화면 에러로 올린다.

### 4.7 Phase C 결과

현재 가능한 것:

- `RepositoryProvider`의 `appNoticeRepository` 기본 구현은 `SpringAppNoticeRepository`다.
- `RepositoryProvider`의 `notificationRepository` 기본 구현은 `SpringNotificationRepository`다.
- App Notice 목록/상세 hook은 feature-local entrypoint 없이 중앙 DI의 `appNoticeRepository`를 직접 사용한다.
- Notification Center hook은 feature-local entrypoint 없이 중앙 DI의 `notificationRepository`를 직접 사용한다.
- Notification Center 읽음 처리/전체 읽음 처리/단건 삭제는 Spring REST를 호출한다.
- Taxi Home은 feature-local repository entrypoint 없이 `loadTaxiHomeQueryResult()` query를 통해 실제 파티 목록, 내 활성 파티, 내 pending join request 상태를 읽는다.
- Taxi Home의 동승 요청 생성은 `POST /v1/parties/{partyId}/join-requests`로 연결되고, 중복 요청(`ALREADY_REQUESTED`)은 pending request 재조회로 복구한다.
- Taxi Home 플로팅 파티 채팅 버튼과 joined card action은 `GET /v1/members/me/parties` 결과의 active party id를 기준으로 실제 `Chat` route로 이동한다.
- AcceptancePending은 `loadTaxiAcceptancePendingSource()` query가 `GET /v1/members/me/join-requests` + `GET /v1/parties/{id}`를 조합해 상태를 읽고, 취소는 `PATCH /v1/join-requests/{id}/cancel`로 처리한다.

현재 아직 남은 것:

- `IPartyRepository`의 main flow Spring 구현과 전역 DI 교체는 완료됐지만, 고급 상태 전이와 leave 경계는 아직 분산돼 있다.
- Taxi Party의 고급 상태 전이/정산 흐름, 자유 입력 위치 정책, system message contract 부재 보고는 아직 남아 있다.
- 일반 community/custom chat 영역의 REST/STOMP 전환은 아직 Phase F 범위다.

feature별 상태:

- 완료
  - App Notice
  - Notification Center
  - Taxi Home
- 부분 완료
  - Taxi Chat detail

### 4.8 Phase D 구현

이번 스레드에서는 Notification realtime과 Taxi Chat detail source of truth를 다음처럼 옮겼다.

- Notification realtime
  - `src/shared/realtime/xhrSseStream.ts`
  - `src/features/user/data/api/notificationApiClient.ts`
  - `src/features/user/data/dto/notificationDto.ts`
  - `src/features/user/data/repositories/SpringNotificationRepository.ts`
  - `src/features/user/hooks/useNotificationCenterData.ts`
- Taxi Chat detail / DI 정리
  - `src/features/taxi/data/api/taxiChatApiClient.ts`
  - `src/features/taxi/data/dto/taxiChatDto.ts`
  - `src/features/taxi/data/mappers/taxiChatMapper.ts`
  - `src/features/taxi/data/repositories/SpringTaxiChatRepository.ts`
  - `src/features/taxi/application/taxiChatDetailAssembler.ts`
  - `src/features/taxi/hooks/useTaxiChatDetailData.ts`
  - `src/di/RepositoryContext.ts`
  - `src/di/RepositoryProvider.tsx`
  - `src/di/repositoryContracts.ts`
  - `src/di/useRepository.ts`
- runtime dependency
  - `package.json`
  - `package-lock.json`
  - `@stomp/stompjs`

이번 단계에서 실제로 사용한 계약:

- Notification
  - `GET /v1/notifications`
  - `GET /v1/notifications/unread-count`
  - `GET /v1/sse/notifications`
  - SSE event: `SNAPSHOT`, `NOTIFICATION`, `UNREAD_COUNT_CHANGED`, `HEARTBEAT`
- Taxi Chat detail
  - `GET /v1/parties/{partyId}`
  - `GET /v1/chat-rooms/party:{partyId}`
  - `GET /v1/chat-rooms/party:{partyId}/messages`
  - `PATCH /v1/chat-rooms/party:{partyId}/settings`
  - `PATCH /v1/chat-rooms/party:{partyId}/read`
  - `DELETE /v1/parties/{partyId}/members/me`
  - STOMP publish: `/app/chat/party:{partyId}`
  - STOMP subscribe: `/topic/chat/party:{partyId}`
  - STOMP error queue: `/user/queue/errors`

보충 메모:

- RN 클라이언트의 STOMP 연결은 backend의 native WebSocket endpoint `/ws-native`를 직접 사용한다.
- `/ws`는 기존 웹/SockJS 클라이언트 호환용으로 유지하고, RN은 `/ws/websocket` 우회 경로를 더 이상 사용하지 않는다.

### 4.9 Phase D 결과

현재 가능한 것:

- Notification Center는 중앙 DI의 `notificationRepository`를 통해 REST 초기 로드 후 SSE로 신규 알림과 unread count 변경을 반영한다.
- 단건 읽음/전체 읽음/단건 삭제/전체 삭제는 repository cache를 즉시 갱신하고, SSE unread count가 cache와 어긋나면 REST 재조회로 다시 맞춘다.
- `useNotificationCenterData()`는 polling이 아니라 repository subscription을 사용한다.
- Taxi Chat detail은 중앙 DI의 `taxiChatRepository`를 사용하고, `taxiChatRepository.ts` mock singleton을 source of truth로 보지 않는다.
- Taxi Chat detail의 과거 메시지/기본 방 상태는 REST로 로드하고, 신규 메시지 수신과 전송은 STOMP로 처리한다.
- Taxi Chat detail의 음소거 토글은 `PATCH /v1/chat-rooms/{id}/settings`, 방 열람 중 읽음 시각 반영은 `PATCH /v1/chat-rooms/{id}/read`, 파티 나가기는 `DELETE /v1/parties/{id}/members/me`를 사용한다.
- Taxi Chat 화면용 조합 로직은 hook 안에서 직접 만들지 않고 `taxiChatDetailAssembler`로 분리했다.

현재 아직 남은 것:

- Taxi Party domain의 고급 command/state transition(close/reopen/end/직접 leave 포함)은 아직 남아 있다.
- 일반 community/custom chat list/detail, `/v1/chat-rooms`, `/user/queue/chat-rooms` 기반 요약 갱신은 아직 legacy/mock 경로가 남아 있다.

### 4.10 Phase D blocker fix

이번 스레드에서는 Taxi Chat detail의 STOMP lifecycle/auth reset blocker를 정리했다.

- `SpringTaxiChatRepository`는 마지막 subscriber가 해제되면 room subscription뿐 아니라 STOMP client 자체를 deactivate한다.
- `SpringTaxiChatRepository.resetSession()`은 auth 세션 변경 시 `currentPartyId`, party state cache, room/error subscription, STOMP client를 함께 정리한다.
- `useAuthSession()`은 로그아웃 직전과 auth uid 변경 시 `taxiChatRepository.resetSession()`을 호출한다.
- 따라서 새 계정의 첫 STOMP 구독은 기존 connected socket을 재사용하지 않고, 새 `beforeConnect`에서 새 token으로 다시 연결한다.

이 blocker fix 기준으로는 Phase D close 판단을 막던 STOMP auth/session 재사용 리스크가 해소됐다.

### 4.11 Phase E 구현

Phase E와 이번 후속 스레드까지 반영한 현재 구현은 Taxi Party runtime source of truth를 다음처럼 Spring 쪽으로 이동했다.

- Taxi Party DI / repository
  - `src/features/taxi/data/api/taxiHomeApiClient.ts`
  - `src/features/taxi/data/dto/taxiHomeDto.ts`
  - `src/features/taxi/data/mappers/taxiPartyMapper.ts`
  - `src/features/taxi/data/repositories/SpringPartyRepository.ts`
  - `src/di/RepositoryProvider.tsx`
- Leader join request flow / badge 정리
  - `src/features/taxi/providers/JoinRequestProvider.tsx`
  - `src/features/taxi/hooks/useMyParty.ts`
  - `src/features/taxi/hooks/useJoinRequestStatus.ts`
  - `src/features/taxi/hooks/useJoinRequestModal.ts`
- 알림 정리
  - `src/features/taxi/data/repositories/SpringNotificationActionRepository.ts`
  - `src/app/bootstrap/pushNotificationRuntime.ts`
  - `src/app/navigation/services/notificationNavigation.ts`
  - `src/app/navigation/services/normalizePushNotificationType.ts`
- Recruit(create) 경로 정리
  - `src/features/taxi/hooks/useTaxiRecruitForm.ts`
  - `src/features/taxi/model/taxiRecruitData.ts`
- Recruit / Chat Phase E 마감 UI 정리
  - `src/features/taxi/screens/RecruitScreen.tsx`
  - `src/features/taxi/screens/TaxiLocationPickerScreen.tsx`
  - `src/features/taxi/components/TaxiCreateLocationSection.tsx`
  - `src/features/taxi/screens/ChatScreen.tsx`
  - `src/features/taxi/components/TaxiChatSummaryCard.tsx`
  - `src/features/taxi/components/TaxiChatComposer.tsx`
  - `src/features/taxi/components/TaxiChatMessageList.tsx`
  - `src/features/taxi/components/TaxiChatHeaderMenu.tsx`
  - `src/features/taxi/components/TaxiTaxiCallSheet.tsx`
  - `src/features/taxi/components/TaxiAccountSheet.tsx`
  - `src/features/taxi/components/TaxiArriveSettlementSheet.tsx`
  - `src/features/taxi/components/TaxiSettlementStatusSheet.tsx`
  - `src/features/taxi/components/TaxiPartyEditSheet.tsx`
- Taxi Chat assembler / DTO / repository 정리
  - `src/features/taxi/model/taxiChatViewData.ts`
  - `src/features/taxi/data/dto/taxiChatDto.ts`
  - `src/features/taxi/data/mappers/taxiChatMapper.ts`
  - `src/features/taxi/application/taxiChatDetailAssembler.ts`
  - `src/features/taxi/data/repositories/ITaxiChatRepository.ts`
  - `src/features/taxi/data/repositories/SpringTaxiChatRepository.ts`
  - `src/features/taxi/hooks/useTaxiChatDetailData.ts`
- System message contract 정리
  - `src/features/taxi/services/joinRequestService.ts`
  - `src/features/taxi/services/partyCreationService.ts`
  - `src/features/taxi/services/systemMessageContract.ts`

이번 단계에서 실제로 사용한 계약:

- Taxi Party read / status
  - `GET /v1/parties`
  - `GET /v1/parties/{partyId}`
  - `GET /v1/members/me/parties`
  - `GET /v1/members/me/join-requests`
- Taxi Party command
  - `POST /v1/parties`
  - `PATCH /v1/parties/{id}`
  - `POST /v1/parties/{id}/cancel`
  - `PATCH /v1/join-requests/{id}/cancel`
  - `PATCH /v1/join-requests/{id}/accept`
  - `PATCH /v1/join-requests/{id}/decline`
  - `GET /v1/parties/{partyId}/join-requests`
  - `PATCH /v1/parties/{id}/close`
  - `PATCH /v1/parties/{id}/reopen`
  - `PATCH /v1/parties/{id}/arrive`
  - `PATCH /v1/parties/{id}/end`
  - `DELETE /v1/parties/{id}/members/{memberId}`
  - `DELETE /v1/parties/{id}/members/me`
  - `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm`
- Taxi Party SSE
  - `GET /v1/sse/parties`
  - `GET /v1/sse/parties/{partyId}/join-requests`
  - `GET /v1/sse/members/me/join-requests`
- Notification cleanup
  - `GET /v1/notifications`
  - `DELETE /v1/notifications/{notificationId}`
- Taxi Chat detail
  - `GET /v1/chat-rooms/party:{partyId}`
  - `GET /v1/chat-rooms/party:{partyId}/messages`
  - `PATCH /v1/chat-rooms/party:{partyId}/settings`
  - `PATCH /v1/chat-rooms/party:{partyId}/read`
  - publish: `/app/chat/party:{partyId}` (`TEXT`, `ACCOUNT`)
  - subscribe: `/topic/chat/party:{partyId}`
  - error queue: `/user/queue/errors`

이번 구현 판단 메모:

- 2026-03-21 기준 `http://localhost:8080/v3/api-docs`를 다시 확인해 `/v1/sse/parties`, `/v1/sse/parties/{partyId}/join-requests`, `/v1/sse/members/me/join-requests`의 event/query contract를 우선 기준으로 사용했다.
- `SpringPartyRepository`의 subscription은 polling이 아니라 `SSE signal -> REST snapshot refresh` 방식으로 바꿨다.
- 이유는 SSE payload를 hook/screen까지 직접 올리지 않고 repository/query 경계에서 기존 mapper를 재사용하기 위해서다.
- 따라서 leader action 이후 화면 반영 기준은 optimistic write가 아니라 `REST mutation -> repository refresh + SSE follow-up signal`이다.
- `PARTY_JOIN_REQUEST` 알림 삭제는 `notification.data.requestId` 기준으로 좁혀, 같은 party의 다른 pending 요청 알림을 같이 지우지 않도록 수정했다.
- FCM push runtime은 backend enum 이름(`PARTY_JOIN_REQUEST`, `PARTY_JOIN_ACCEPTED`, `PARTY_JOIN_DECLINED` 등)을 기존 frontend navigation type으로 정규화한다.
- `RecruitScreen`의 자유 입력은 더 이상 이름만 제출하지 않고, 직접 입력 + 지도 선택을 모두 거친 `name + lat + lng`가 확보될 때만 `POST /v1/parties`로 제출한다.
- `TaxiLocationPickerScreen`은 기존 `react-native-maps`를 재사용해 출발지/도착지별 좌표를 stack route param으로 돌려주고, `useTaxiRecruitForm()`이 이를 draft state로 흡수한다.
- ChatScreen은 `partyRepository.subscribeToParty()`의 SSE signal을 받아 `taxiChatRepository.getPartyChat()` REST snapshot을 다시 읽으므로, leader/member action 이후 summary/status가 stale 상태로 남지 않는다.
- backend chat contract 기준으로 client-authored `SYSTEM` / `ARRIVED` / `END`는 제거했다. leader 승인, arrive, cancel/end 이후 메시지는 backend가 생성하고 프론트는 snapshot/STOMP subscribe로만 렌더링한다.
- `ACCOUNT`는 `bankName`, `accountNumber`, `accountHolder`, `hideName`, `remember` payload를 그대로 전송하고, `remember=true`일 때의 저장 semantics는 backend에 위임한다.
- `PATCH /v1/parties/{id}/arrive`는 `taxiFare`, `settlementTargetMemberIds`, `account { bankName, accountNumber, accountHolder, hideName }`를 전송하고, ARRIVED 메시지 snapshot과 settlement summary는 같은 backend snapshot을 source of truth로 사용한다.

### 4.12 Phase E 결과

현재 가능한 것:

- `RepositoryProvider`의 `partyRepository` 기본 구현은 `SpringPartyRepository`다.
- `RepositoryProvider`의 `notificationActionRepository` 기본 구현은 `SpringNotificationActionRepository`다.
- `useMyParty()`는 `GET /v1/members/me/parties` + `GET /v1/parties/{id}`를 통해 active party를 계산하므로 Main tab의 `hasParty`가 mock 메모리 상태와 분리된다.
- `JoinRequestProvider`의 `joinRequestCount`는 active leader party들의 `GET /v1/parties/{partyId}/join-requests` 결과를 기준으로 계산된다.
- leader join request modal의 승인/거절은 `PATCH /v1/join-requests/{id}/accept|decline`를 실제 호출하고, 후속 badge/status는 repository refresh와 SSE signal로 다시 맞춘다.
- `useJoinRequestStatus()`는 단일 request id를 Spring API 기준으로 재조회하므로 leader 모달에서 취소/처리 상태를 더 이상 mock store로 보지 않는다.
- `RecruitScreen` 제출은 `POST /v1/parties`를 호출하고, 생성된 `partyId`로 바로 Taxi Chat screen chain에 진입한다.
- `RecruitScreen`의 출발지/도착지 직접 입력은 `직접 입력 -> 지도에서 선택 -> name + lat + lng 확정` 순서를 강제하고, 선택 완료 시 초록 안내 배너와 `변경` 액션을 노출한다.
- 승인/거절 이후 stale `PARTY_JOIN_REQUEST` 알림은 Spring notification REST를 다시 조회해 `requestId`가 일치하는 알림만 삭제한다.
- `useMyParty`, `JoinRequestProvider`, `useJoinRequestStatus`, `usePendingJoinRequest`, `useParty`, `subscribeToJoinRequests()`는 Taxi Party SSE signal을 받아 REST snapshot을 다시 읽는다.
- `SpringPartyRepository.sendSystemMessage()`는 더 이상 성공처럼 끝나는 no-op가 아니라, backend contract 부재를 드러내는 명시적 오류로 정리됐다.
- `ChatScreen` header menu는 멤버일 때 `파티 나가기`, 리더일 때 `수정하기`/`파티 없애기`만 노출하며, 수정은 `PATCH /v1/parties/{id}`, 파티 없애기는 `POST /v1/parties/{id}/cancel`로 연결한다.
- `ChatScreen` 하단 `+` 액션 트레이는 `택시 호출`, `계좌 전송`, `모집 마감/재개`, `택시 도착`, `정산 현황`, `파티 종료`를 파티 상태와 리더 여부에 따라 분기한다.
- `택시 호출`은 카카오T / Uber / 티머니GO 딥링크를 `canOpenURL/openURL`로 연결하고, 실패 시 앱 설치 안내를 노출한다.
- `계좌 전송`은 `ACCOUNT` payload 전체를 STOMP로 전송하고, repository는 실제 `ACCOUNT` message 수신까지 대기해 반영한다.
- Taxi 홈 파티 목록은 `OPEN`과 `CLOSED`를 각각 조회해 merge하고, `CLOSED`는 비활성 카드로 노출한다.
- 파티 도착/강퇴/멤버별 정산 확인은 `SpringPartyRepository` 경계에서 각각 `PATCH /v1/parties/{id}/arrive`, `DELETE /v1/parties/{id}/members/{memberId}`, `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm`으로 연결됐다.
- direct leave는 더 이상 `SpringTaxiChatRepository` 전용 책임이 아니고, `DELETE /v1/parties/{id}/members/me`를 `SpringPartyRepository.leaveParty()`로 옮겨 party domain command로 정리했다.
- leader 모집 상태 전이는 `PATCH /v1/parties/{id}/close`, `PATCH /v1/parties/{id}/reopen`, `PATCH /v1/parties/{id}/end`까지 screen chain에 연결됐다.
- 정산 현황은 상단 공지형 summary + 확장 패널 + 리더용 정산 관리 modal로 분리했고, `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm` 결과를 재조회 data에 반영한다.
- `택시 도착`, `파티 종료`, `파티 취소`, leader 승인 후 시스템 안내는 클라이언트 publish가 아니라 backend가 생성한 `ARRIVED` / `END` / `SYSTEM` message를 렌더링하는 흐름으로 정리됐다.
- `TaxiAccountSheet` 입력값은 그대로 `ACCOUNT` payload로 이어지고, `TaxiArriveSettlementSheet`는 실제 멤버 선택 상태를 들고 `settlementTargetMemberIds`를 leader 제외 기준으로 전송한다.
- `ChatArrivalDataResponse` / `SettlementSummaryResponse`의 `hideName`, `splitMemberCount`, `settlementTargetMemberIds`, `accountData`가 mapper/assembler를 거쳐 상단 정산 공지와 ARRIVED message card에 반영된다.
- `SpringTaxiChatRepository`의 ACCOUNT pending은 room event 수신뿐 아니라 duplicate topic frame과 REST snapshot fallback으로도 해제해, 실기기에서 성공 후 `전송 중...`이 고착되지 않게 보강했다.
- 멤버 `파티 나가기`는 성공 직후 leave guard를 세워 stale refresh/SSE callback을 무시하고 `resetSession()` 후 화면을 빠져나오게 정리했다.

현재 아직 남은 것:

- Taxi Party SSE는 연결됐지만, SSE payload를 직접 domain state로 쓰지 않고 signal-only로 사용하므로 REST snapshot 재조회 비용은 여전히 남아 있다.
- 일반 community/custom chat list/detail과 `/v1/chat-rooms`, `/user/queue/chat-rooms` 기반 일반 Chat 이전은 여전히 Phase F 범위로 남아 있다.

---

### 4.13 Phase F 구현

이번 스레드에서는 일반 Chat의 공개방 수동 참여 정책까지 포함해 Phase F 프론트 범위를 닫을 수 있는 수준으로 정리했다.

추가/갱신한 대표 파일:

- `src/features/chat/data/api/chatApiClient.ts`
- `src/features/chat/data/dto/chatDto.ts`
- `src/features/chat/data/mappers/chatMapper.ts`
- `src/features/chat/data/repositories/SpringChatRepository.ts`
- `src/features/chat/application/chatDetailAssembler.ts`
- `src/features/community/application/communityChatQuery.ts`
- `src/features/chat/hooks/useChatRooms.ts`
- `src/features/chat/hooks/useChatRoom.ts`
- `src/features/chat/hooks/useChatMessages.ts`
- `src/features/chat/hooks/useChatActions.ts`
- `src/features/chat/hooks/useCommunityTabUnreadIndicator.ts`
- `src/features/chat/hooks/useChatDetailData.ts`
- `src/features/community/hooks/useCommunityChatData.ts`
- `src/di/RepositoryProvider.tsx`
- `src/shared/realtime/minimalStompClient.ts`
- `src/shared/realtime/index.ts`

정리한 legacy 경로:

- `src/features/chat/data/repositories/MockChatRepository.ts`
- `src/features/chat/data/repositories/FirebaseChatRepository.ts`
- `src/features/chat/data/repositories/MockChatDetailRepository.ts`
- `src/features/chat/data/repositories/chatDetailRepository.ts`
- `src/features/chat/data/composition/chatRuntime.ts`
- `src/features/chat/mocks/chatDetail.mock.ts`

이번 단계에서 실제로 사용한 일반 Chat contract:

- REST
  - `GET /v1/chat-rooms`
  - `GET /v1/chat-rooms?type=UNIVERSITY|DEPARTMENT|GAME|CUSTOM`
  - `GET /v1/chat-rooms/{chatRoomId}`
  - `POST /v1/chat-rooms`
  - `POST /v1/chat-rooms/{chatRoomId}/join`
  - `DELETE /v1/chat-rooms/{chatRoomId}/members/me`
  - `GET /v1/chat-rooms/{chatRoomId}/messages`
  - `PATCH /v1/chat-rooms/{chatRoomId}/read`
  - `PATCH /v1/chat-rooms/{chatRoomId}/settings`
- STOMP
  - endpoint: `/ws-native`
  - publish: `/app/chat/{chatRoomId}`
  - subscribe room: `/topic/chat/{chatRoomId}`
  - subscribe summary: `/user/queue/chat-rooms`
  - subscribe error: `/user/queue/errors`

이번 구현의 핵심 변화:

- `RepositoryProvider`의 기본 `chatRepository`를 `SpringChatRepository`로 교체했다.
- 일반 Chat 목록은 더 이상 `joined=true`만 가정하지 않고, public discover room + joined room을 같은 cache에서 joined 상태와 함께 렌더링한다.
- Community chat list는 `학교 전체방 → 학과방 → 마인크래프트방 → joined custom → not joined custom` 정렬 정책을 query layer에서 고정한다.
- `useCommunityChatData()`는 더 이상 mock `communityHomeRepository`에서 채팅 요약을 읽지 않고 `useChatRooms('all')` 결과를 query layer에서 조합한다.
- `useChatDetailData()`는 미참여 public room을 오류로 처리하지 않고 detail preview + 참여하기 CTA로 노출하며, join 성공 후에만 messages/STOMP/read/mute 흐름을 시작한다.
- leave 성공 시 room detail과 list summary는 not joined 상태로 즉시 정리하되, 화면은 같은 detail preview에 남기지 않고 커뮤니티 탭 채팅 세그먼트로 바로 복귀시킨다. `/user/queue/chat-rooms`의 `CHAT_ROOM_REMOVED`도 joined-room summary 제거 신호로 흡수한다.
- room unread / last message / room summary / community tab indicator는 모두 `SpringChatRepository` cache와 `/user/queue/chat-rooms` event를 기준으로 동기화한다.
- unread/tab badge는 joined room만 계산하도록 명시적으로 고정했다.
- create API는 `chatApiClient` / `IChatRepository` / `SpringChatRepository` 경계까지 연결했고, UI는 아직 노출하지 않는다.
- 일반 Chat의 client SYSTEM 전송 dead path는 제거했다.
- read/mute는 backend가 summary event를 보내지 않는 계약이므로 `PATCH /read`, `PATCH /settings` 성공 직후 repository cache를 로컬 patch해 일관성을 유지한다. 읽음 요청은 실기기 시계 차이로 unread가 복원되지 않게 room의 최신 visible server timestamp(`lastMessage.createdAt`/`updatedAt`)를 기준으로 보정해 전송한다.
- taxi 전용 STOMP 유틸을 일반화해 `src/shared/realtime/minimalStompClient.ts`로 올리고 Taxi/일반 chat이 같은 transport를 재사용한다.

이번 스레드에서 확인된 일반 Chat backend 계약:

- 이번 실기기 보강 시점에는 로컬 `http://localhost:8080/v3/api-docs`를 다시 확인할 수 있었고, 실제 구현은 OpenAPI와 `/Users/jisung/skuri-backend` 코드, `docs/spring-migration/api-specification.md`를 대조해 맞췄다.
- backend는 `GET /v1/chat-rooms`에서 보이는 public room + joined private room summary를 반환하고, 미참여 public room의 detail 조회는 허용한다.
- 반면 `GET /messages`, `SEND /app/chat/{chatRoomId}`, `SUBSCRIBE /topic/chat/{chatRoomId}`는 여전히 `ChatRoomMember`를 요구하므로, 미참여 public room은 detail preview와 join CTA까지만 열 수 있다.
- backend에는 `POST /v1/chat-rooms`, `POST /v1/chat-rooms/{id}/join`, `DELETE /v1/chat-rooms/{id}/members/me`, `CHAT_ROOM_REMOVED` summary event, 공개방 seed/backfill이 이미 추가됐다.

### 4.14 Phase F 결과

현재 가능한 것:

- `RepositoryProvider`의 `chatRepository` 기본 구현은 `SpringChatRepository`다.
- 일반 Chat 목록은 `GET /v1/chat-rooms` 계열 응답을 기준으로 joined / not joined public room을 함께 렌더링한다.
- 미참여 public room도 detail 조회할 수 있고, detail screen은 description / recent message / member count / 참여하기 CTA를 preview로 노출한다.
- 참여하기 성공 후에는 `GET /messages`, `/topic/chat/{id}`, `PATCH /read`, `PATCH /settings`가 joined room lifecycle에 맞게 바로 이어진다.
- 나가기 성공 후에는 unread/mute/lastRead 상태를 joined summary cache와 충돌 없이 정리한 뒤, 커뮤니티 탭 채팅 세그먼트로 즉시 돌아간다.
- 일반 Chat 메시지 이력은 `GET /v1/chat-rooms/{id}/messages` cursor pagination을 사용하고, 화면에는 시간 오름차순으로 재정렬해 렌더링한다.
- 일반 Chat 신규 메시지는 `/topic/chat/{id}` topic subscribe로 수신하고, joined room summary는 `/user/queue/chat-rooms` 이벤트로 받아 목록/상세/알림 설정/읽음 상태 구독자에게 동시에 반영된다.
- Community tab unread indicator는 전체 joined 일반 chat의 `unreadCount` 합계를 기준으로 계산된다.
- Community chat screen chain은 Spring room summary를 읽고, room open 시 joined/not joined 상태에 맞는 `ChatDetail` 화면으로 이동한다.
- 일반 Chat read 변경은 `PATCH /read`에 room의 최신 visible timestamp를 실어 보내고, 응답의 `lastReadAt` 기준으로 room cache를 patch하므로 refresh/re-enter 후에도 unread가 다시 복원되지 않는다. mute도 `PATCH /settings` 성공 직후 cache를 patch해 room summary와 tab indicator가 어긋나지 않는다.
- create API는 repository/API layer까지 연결됐고, create UI는 아직 노출하지 않는다.

현재 아직 남은 것:

- 일반 Chat 이미지 업로드/이미지 메시지 실사용 연결은 아직 남아 있다.
- Board/Notice/Campus 등 다른 미이전 도메인과 남은 mock 화면 체인 정리는 다음 phase 범위다.

---

### 4.15 Phase G 구현

이번 스레드에서는 Spring API를 새로 붙이지 않고, 남아 있던 mock/Firebase/direct import 경로 중 이번에 안전하게 닫을 수 있는 feature-local entrypoint와 dead path를 정리했다.

추가/갱신한 대표 파일:

- `src/features/board/hooks/useBoardDetailData.ts`
- `src/features/notice/hooks/useNoticeHomeData.ts`
- `src/features/notice/hooks/useNoticeDetailData.ts`
- `src/features/community/application/communityBoardQuery.ts`
- `src/features/community/hooks/useCommunityBoardData.ts`
- `src/features/campus/hooks/useAcademicCalendarDetailData.ts`
- `src/features/board/index.ts`
- `src/features/notice/index.ts`
- `src/features/campus/index.ts`

이번 스레드에서 제거한 대표 legacy/dead path:

- `src/features/board/data/repositories/boardDetailRepository.ts`
- `src/features/board/data/repositories/MockBoardDetailRepository.ts`
- `src/features/board/data/repositories/IBoardDetailRepository.ts`
- `src/features/board/data/repositories/FirebaseBoardRepository.ts`
- `src/features/board/mocks/boardDetail.mock.ts`
- `src/features/notice/data/repositories/noticeHomeRepository.ts`
- `src/features/notice/data/repositories/noticeDetailRepository.ts`
- `src/features/notice/data/repositories/MockNoticeHomeRepository.ts`
- `src/features/notice/data/repositories/MockNoticeDetailRepository.ts`
- `src/features/notice/data/repositories/FirebaseNoticeRepository.ts`
- `src/features/community/data/repositories/communityHomeRepository.ts`
- `src/features/community/data/repositories/MockCommunityHomeRepository.ts`
- `src/features/community/mocks/communityHome.mock.ts`
- `src/features/campus/data/repositories/academicCalendarDetailRepository.ts`
- `src/features/campus/data/repositories/MockAcademicCalendarDetailRepository.ts`
- `src/features/campus/data/repositories/IAcademicCalendarDetailRepository.ts`
- `src/features/campus/data/repositories/FirebaseAcademicRepository.ts`
- `src/features/campus/data/repositories/FirebaseCafeteriaRepository.ts`
- `src/features/campus/hooks/useCampusHomeRepository.ts`
- `src/features/campus/data/repositories/ICampusHomeRepository.ts`
- `src/features/campus/mocks/MockCampusHomeRepository.ts`
- `src/features/campus/mocks/campusHomeViewData.ts`
- `src/features/campus/data/repositories/ICafeteriaDetailRepository.ts`
- `src/features/campus/data/repositories/MockCafeteriaDetailRepository.ts`
- `src/features/campus/data/repositories/cafeteriaDetailRepository.ts`
- `src/features/campus/mocks/cafeteriaDetail.mock.ts`

이번 구현의 핵심 변화:

- Board detail은 더 이상 전용 mock singleton을 거치지 않고 중앙 DI `boardRepository`에서 게시글/댓글을 읽어 화면 모델로 조합한다.
- Notice home/detail은 전용 home/detail repository entrypoint를 제거하고 중앙 DI `noticeRepository` + 기존 hook/query 경계로 수렴했다.
- Notice domain에 남아 있던 mock source path 정리를 통해 runtime 경로는 중앙 DI `noticeRepository` 기준으로만 유지한다.
- Community board home은 `communityBoardQuery`를 통해 중앙 DI `boardRepository` 결과를 화면 모델로 변환하고, feature-local `communityHomeRepository` 의존을 제거했다.
- Campus academic calendar detail은 중앙 DI `academicRepository`에서 schedule을 읽어 detail source로 변환한다.
- Campus home은 `campusHomeQuery`에서 중앙 DI `noticeRepository` / `userRepository` / `timetableRepository` / `courseRepository` / `cafeteriaRepository` / `academicRepository`와 기존 taxi query를 조합하는 구조로 수렴했다.
- Cafeteria detail은 `cafeteriaMenuAssembler`를 통해 중앙 DI `cafeteriaRepository`의 weekly menu를 화면 모델로 재구성하고, 가격/반응 mock metadata 의존을 제거했다.
- 2026-03-29 기준 backend는 학식 응답에 `categories`와 `menuEntries`를 추가 제공하므로, Cafeteria detail과 Campus preview는 Figma 구현 시 구조화 메타데이터를 직접 사용할 수 있다.
- 2026-03-29 기준 backend는 같은 주 안에서 동일한 `category + title`의 메타데이터 일관성도 저장 시점에 강제하므로, 프론트는 주간 동일성을 전제로 상세 dedupe와 preview 대표 메뉴 선택을 구현할 수 있다.
- Campus home / cafeteria detail의 feature-local repository entrypoint는 제거했고, screen-level source of truth를 중앙 DI + query/assembler 기준으로 정리했다.
- `MockCafeteriaRepository`는 더 이상 runtime/import 참조가 없어 제거했고, 학식 데이터 source of truth는 중앙 DI `cafeteriaRepository`로 일원화했다.
- `MockCourseRepository` / `MockTimetableRepository`는 중앙 DI 기준으로 campus home timetable preview를 재현할 수 있도록 timetable detail mock을 seed source로 흡수했다.
- Board/Notice/Campus에 남아 있던 Firebase repository 파일과 dead local repository surface는 runtime import가 없는 dead path였으므로 제거했다.

### 4.16 Phase G 결과

현재 가능한 것:

- Board detail은 중앙 DI `boardRepository` 기준으로 게시글/댓글을 읽고 screen view data를 만든다.
- Notice home/detail은 중앙 DI `noticeRepository`와 기존 notice hook 계층을 기준으로 동작한다.
- Community board home은 중앙 DI `boardRepository`와 query layer를 기준으로 community screen model을 만든다.
- Campus academic calendar detail은 중앙 DI `academicRepository` 기준으로 동작한다.
- Campus home은 중앙 DI repository들을 조합하는 `campusHomeQuery` 기준으로 동작한다.
- Cafeteria detail은 중앙 DI `cafeteriaRepository`와 assembler 기준으로 동작한다.
- Board/Notice/Campus의 dead Firebase repository surface는 제거되어 runtime source of truth 후보에서 빠졌다.

현재 아직 남은 것:

- 일반 Chat 이미지 업로드/이미지 메시지 실사용 연결은 아직 남아 있다.

### 4.17 Phase H 구현

이번 스레드에서는 Board / Notice / Campus 도메인의 central mock repository를 Spring concrete repository로 교체하고, 화면 조합은 기존 query/hook 경계에서 흡수하도록 정리했다.

추가/갱신한 대표 파일:

- `src/features/board/data/api/boardApiClient.ts`
- `src/features/board/data/dto/boardDto.ts`
- `src/features/board/data/mappers/boardMapper.ts`
- `src/features/board/data/repositories/SpringBoardRepository.ts`
- `src/features/notice/data/api/noticeApiClient.ts`
- `src/features/notice/data/dto/noticeDto.ts`
- `src/features/notice/data/mappers/noticeMapper.ts`
- `src/features/notice/data/repositories/SpringNoticeRepository.ts`
- `src/features/campus/data/api/campusApiClient.ts`
- `src/features/campus/data/dto/campusDto.ts`
- `src/features/campus/data/mappers/campusMapper.ts`
- `src/features/campus/data/repositories/SpringAcademicRepository.ts`
- `src/features/campus/data/repositories/SpringCafeteriaRepository.ts`
- `src/di/RepositoryProvider.tsx`
- `src/features/board/hooks/useBoardWrite.ts`
- `src/features/board/hooks/useBoardEdit.ts`
- `src/features/board/hooks/useBoardDetailData.ts`
- `src/features/board/screens/BoardDetailScreen.tsx`
- `src/features/notice/hooks/useNoticeDetailData.ts`
- `src/features/notice/screens/NoticeDetailScreen.tsx`

이번 구현의 핵심 변화:

- `RepositoryProvider`의 기본 `boardRepository` / `noticeRepository` / `academicRepository` / `cafeteriaRepository`를 Spring 구현으로 전환했다.
- Board write는 `POST /v1/images` 업로드 결과를 먼저 모은 뒤 `POST /v1/posts`에 포함해 생성하고, 더 이상 mock storage path를 타지 않는다.
- Board detail은 `GET /v1/posts/{id}` + `GET /v1/posts/{id}/comments`를 기준으로 like / bookmark / comment submit / delete를 Spring source of truth에 연결했다.
- Board edit는 backend `PATCH /v1/posts/{id}` 계약에 맞춰 title/content/category/isAnonymous/images를 보내고, 이미지 변경 시에만 전체 목록 교체 semantics를 사용한다.
- Notice home/detail/read/like/comments는 `SpringNoticeRepository`를 기준으로 동작하고, detail 진입 시 `POST /v1/notices/{id}/read`를 호출한다.
- Notice detail은 더 이상 placeholder bookmark reaction을 보여주지 않고, 실제 Spring contract가 있는 like + comments만 연결한다.
- Campus academic/cafeteria 화면은 `GET /v1/academic-schedules`, `GET /v1/cafeteria-menus`, `GET /v1/cafeteria-menus/{weekId}`를 source of truth로 사용한다.
- Community board home은 중앙 DI `boardRepository`를 통해 Spring 게시글 목록을 조합한다.
- Board의 dead storage hook path는 제거했다.

이번 스레드에서 반영된 backend contract 보강:

- `GET /v1/posts` summary에 `bookmarkCount`가 추가되어 Board list / Community featured popularity를 서버 지표로 계산할 수 있다.
- `PATCH /v1/posts/{postId}`가 `title/content/category/isAnonymous/images`를 지원한다. `images`는 전체 목록 교체 semantics이며 `[]`는 전체 제거를 의미한다.
- `PATCH /v1/notice-comments/{commentId}`가 추가되어 Notice 댓글 수정이 가능해졌다. 수정 가능 필드는 `content`만이며 `isAnonymous`는 유지된다.

### 4.18 Phase H 결과

현재 가능한 것:

- Board list/detail/comments/like/bookmark/write/edit는 중앙 DI `SpringBoardRepository` 기준으로 동작한다.
- Board list / Community featured popularity는 `GET /v1/posts` summary의 `bookmarkCount`를 그대로 source of truth로 사용한다.
- Notice home/detail/read/like/comments는 중앙 DI `SpringNoticeRepository` 기준으로 동작한다.
- Notice detail은 본인 댓글에 대해 수정 액션을 노출하고 `PATCH /v1/notice-comments/{commentId}`를 호출한다.
- Campus academic calendar detail, campus home academic preview, cafeteria detail, campus home cafeteria preview는 Spring API 기준으로 동작한다.
- Community board home은 더 이상 central mock repository가 아니라 Spring board source를 기준으로 화면 모델을 만든다.
- `RepositoryProvider` 기준 남아 있던 Board / Notice / Academic / Cafeteria central mock 기본값은 제거됐다.

현재 아직 남은 것:

- 일반 Chat 이미지 업로드/이미지 메시지 실사용 연결은 아직 남아 있다.

---

## 5. 현재 남아 있는 구조 상태

현재 앱은 여전히 아래 두 구조가 혼재한다.

- 전역 DI (`RepositoryProvider`, `RepositoryContext`, `useRepository`)
- feature-local repository entrypoint

이 혼재 상태는 아직 정상 범위다.
현재 공식 전략은 다음과 같다.

- Phase A는 이 혼재 상태와 무관하게 먼저 진행
- Phase B 이후 concrete feature migration 시
  해당 feature를 전역 DI 기준으로 함께 수렴

즉, 다음 작업자는 앱 전체를 먼저 전면 리팩터링하지 않는다.

Phase G 완료 후 구조 상태:

- App Notice의 screen entrypoint는 제거됐고 중앙 DI `appNoticeRepository`로 수렴했다.
- Notification Center의 screen entrypoint는 제거됐고 중앙 DI `notificationRepository`로 수렴했다.
- Taxi Home/AcceptancePending screen chain은 `shared/api` 위의 query/application adapter로 수렴했고, `ITaxiAcceptancePendingRepository` mock singleton은 제거됐다.
- Taxi Party의 전역 상태(`useMyParty`, `JoinRequestProvider`, `useJoinRequestStatus`, `useJoinRequestModal`)는 중앙 DI `partyRepository`/`notificationActionRepository` 기준으로 수렴했다.
- RecruitScreen도 더 이상 `taxiRecruitRepository` mock singleton을 source of truth로 사용하지 않고 중앙 `partyRepository`를 통해 `/v1/parties`를 호출한다.
- Taxi Chat detail은 중앙 DI `taxiChatRepository`와 assembler로 수렴했고, feature-local taxi chat singleton은 더 이상 source of truth가 아니다.
- 일반 Chat도 중앙 DI `chatRepository`와 query/assembler 경계로 수렴했고, feature-local general chat mock repository는 제거됐다.
- Board domain 기본 source는 중앙 DI `SpringBoardRepository`로 전환됐고, write/edit/detail/Community board 조합이 모두 같은 repository를 기준으로 동작한다.
- Notice domain 기본 source는 중앙 DI `SpringNoticeRepository`로 전환됐고, home/detail/read/like/comments가 같은 repository cache를 기준으로 동작한다.
- Community board home은 `communityBoardQuery` + 중앙 DI `boardRepository`로 수렴했고, `communityHomeRepository`는 제거됐다.
- Campus academic/cafeteria domain 기본 source는 중앙 DI `SpringAcademicRepository` / `SpringCafeteriaRepository`로 전환됐다.
- Campus home은 중앙 DI repository들을 조합하는 `campusHomeQuery`로 수렴했고, academic/cafeteria preview도 Spring source를 읽는다.
- Cafeteria detail은 중앙 DI `cafeteriaRepository` + `cafeteriaMenuAssembler` 기준으로 동작하고, central mock 기본값은 제거됐다.
- Minecraft feature는 `minecraftRuntime` composition을 통해 `SpringMinecraftRepository` + `minecraftRealtimeService`를 사용하며, Campus/Chat 화면에서 같은 Spring source를 재사용한다.
- Chat domain의 다음 남은 구조 과제는 이미지 메시지 실사용 연결과 이후 legacy 정리다.

---

## 6. 다음 우선순위

현재 시점에서 가장 자연스러운 다음 단계는 아래 순서다.

1. Chat 이미지 메시지 업로드 실사용 연결
2. Taxi/Chat domain의 signal-only realtime 비용 정리
3. 이후 남은 legacy 정리

이 순서를 권장하는 이유:

- Notification domain은 Phase D에서 닫혔고, Taxi Party와 Chat의 Phase E/F 범위도 frontend contract 기준으로 정리됐으며, Phase H도 follow-up gap 반영까지 마감됐다.
- Board/Notice/Campus는 frontend source of truth 전환과 남은 backend gap 정리가 끝났으므로 다음 남은 우선순위는 Chat 이미지 메시지 실사용 연결이다.
- 전역 DI 수렴은 concrete feature migration을 따라가며 진행하는 현재 전략과 맞는다.

---

## 7. 다음 작업자가 반드시 지켜야 할 규칙

- 먼저 앱 전체 DI를 한 번에 뒤집으려 하지 않는다.
- 공통 transport를 우회하는 새로운 HTTP/SSE/STOMP 코드를 만들지 않는다.
- 새 feature-local singleton repository를 추가하지 않는다.
- Spring API를 붙이는 feature는 같은 작업에서 중앙 DI 수렴까지 시도한다.
- 서버 DTO를 hook/screen으로 직접 올리지 않는다.
- touched feature에서 direct mock import가 남아 있으면 같이 제거한다.
- phase는 작업 단위로 진행하되, 커밋은 phase 전체를 한 번에 묶지 않는다.
- 커밋은 리뷰 가능한 작은 단위로 분리한다.
- 기능 추가, 리팩터링, 테스트, 문서 수정은 가능한 분리 커밋으로 나눈다.
- 런타임 코드와 문서 변경은 가능하면 별도 커밋으로 분리한다.
- 커밋 메시지는 Conventional Commits를 사용하고, 타입은 영어, 나머지 메시지는 한국어로 작성한다.
- 작업 후 이 상태 문서와 로드맵 문서를 함께 갱신한다.

---

## 8. 현재 알려진 주의사항

### 8.0 API 계약 참조 소스

다음 작업자는 실제 API 호출 구현 전에 아래 순서로 계약을 확인한다.

1. 로컬 백엔드 `/v3/api-docs`
   - 예: `http://localhost:8080/v3/api-docs`
2. 백엔드 코드
   - 경로: `/Users/jisung/skuri-backend`
3. markdown 명세
   - `docs/spring-migration/api-specification.md`

충돌 시 우선순위:

- `/v3/api-docs`
- 백엔드 코드
- markdown 명세

즉, handoff 문서나 로드맵 문서만 보고 endpoint를 추측해서 구현하지 않는다.

### 8.0.1 허용된 known caveat

- 기존 사용자 업그레이드 시 `PermissionOnboarding`이 1회 다시 열릴 수 있다.
- 이는 Firestore 기반 과거 온보딩 상태를 AsyncStorage local adjunct로 일괄 backfill하지 않은 현재 구조에서 발생 가능한 현상이다.
- 현재 제품 판단상 허용된 상태이며, 이 사유만으로 Phase D 이상 작업을 막지 않는다.

### 8.1 타입체크

`npx tsc --noEmit`는 현재 프로젝트의 기존 선행 오류들 때문에 전체 성공하지 않는다.

현재 확인된 기존 선행 오류 영역:

- `firebase-cloud-functions/src/index.ts`

따라서 다음 작업자는 다음 원칙으로 검증한다.

- 변경한 파일 기준 타입 오류가 없는지 우선 확인
- 전체 타입 오류는 기존 오류와 신규 오류를 분리해서 판단

### 8.2 실시간 클라이언트 상태

현재 `src/shared/realtime/*`는 공통 option builder뿐 아니라 실제 feature 연결도 일부 포함한다.

즉:

- Notification SSE는 `xhrSseStream` 기반 concrete client가 연결된 상태다.
- Taxi Party SSE도 같은 `xhrSseStream` 기반 concrete client를 signal transport로 재사용한다.
- Taxi Chat detail은 shared STOMP transport를 재사용하는 concrete client가 연결된 상태고, subscriber 0건 또는 auth uid 변경 시 해당 client를 정리한다.
- 일반 Chat도 같은 shared STOMP transport를 사용해 `/topic/chat/{chatRoomId}`와 `/user/queue/chat-rooms`를 구독한다.

---

## 9. 한 줄 상태 요약

- 아키텍처 기준 수립 완료
- 실행 로드맵 수립 완료
- Phase A 1차 완료
- Phase B 후속 정리 완료
- Phase C는 App Notice / Notification Center / Taxi Home 완료 상태
- Phase D는 Notification realtime까지 완료
- Phase E는 recruit map picker + ChatScreen action tray/정산 현황 + 새 backend contract 반영까지 완료 상태
- Phase D blocker fix까지 반영되어 close 가능 상태
- Phase F는 Taxi Chat detail + 일반 공개 Chat discover/detail/join/leave/create + summary realtime까지 완료 상태
