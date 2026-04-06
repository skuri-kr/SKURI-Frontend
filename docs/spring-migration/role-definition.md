# 백엔드 역할 정의서 v1.0
(Firebase Serverless → Spring Migration)

> 최종 수정일: 2026-04-01
> 관련 문서: [도메인 분석](./domain-analysis.md) | [API 명세](./api-specification.md) | [구현 로드맵](./implementation-roadmap.md) | [Member 탈퇴 정책](./member-withdrawal-policy.md)
> 참고: AS-IS 섹션은 migration kickoff 시점의 legacy Firebase 구조를 설명한다. 마인크래프트 상세 설계/이력은 백엔드 레포 `docs/minecraft-spring-migration-plan.md`를 본다.

## 1. 문서 목적

본 문서는 Firebase 기반 서버리스 백엔드를 사용 중인 현재 시스템을  
Spring 기반 백엔드로 점진적으로 마이그레이션하기에 앞서,  
Spring 백엔드의 역할과 책임 범위를 명확히 정의하는 것을 목적으로 한다.

이를 통해 다음을 달성한다.

- 프론트엔드(React Native), Spring 백엔드, Firebase 간의 역할 분리
- 마이그레이션 범위 및 원칙 명확화
- 향후 요구사항 명세 및 API 설계의 기준점 제공

---

## 2. 현재 시스템 개요 (AS-IS)

### 2.1 기술 스택

- Client: React Native
- Backend: Firebase Serverless
  - Firestore
  - Cloud Functions
  - Firebase Authentication
  - Firebase Cloud Messaging (FCM)

### 2.2 현재 역할 구조

| 구성 요소 | 역할 |
|---------|-----|
| React Native | 화면 렌더링, 사용자 입력 처리, Firestore 직접 CRUD |
| Firestore | 데이터 저장소 + 실시간 데이터 동기화 |
| Cloud Functions | 이벤트 기반 처리 (알림 발송, 자동 작업) |
| Firebase Auth | 사용자 인증 |
| FCM | 푸시 알림 전송 |

---

## 3. 목표 시스템 개요 (TO-BE)

### 3.1 마이그레이션 목표

- Firebase Serverless 구조를 Spring 기반 중앙 백엔드 구조로 전환
- FCM을 제외한 모든 비즈니스 로직을 Spring으로 이전
- 데이터 및 비즈니스 규칙의 단일 진실의 출처를 Spring 백엔드로 통합

### 3.2 기술 스택 (목표)

- Client: React Native
- Backend: Spring Boot
- Database: MySQL (RDB)
- Authentication: Firebase Authentication
- Notification: Firebase Cloud Messaging (FCM)
- Real-time Communication:
  - SSE (Server-Sent Events)
  - WebSocket
  - Internal plugin bridge (HTTP + SSE)

---

## 4. Spring 백엔드의 역할 정의

### 4.1 비즈니스 로직의 최종 판단자

Spring 백엔드는 모든 도메인 규칙의 최종 판단을 수행한다.

- 데이터 생성/수정/삭제에 대한 유효성 검증
- 도메인 상태 전이 규칙 관리

예:
- 파티 생성 가능 조건
- 파티 인원 제한
- 파티 상태 변경 규칙
- 사용자 권한 검증

### 4.2 데이터 접근의 단일 관문

- 클라이언트는 데이터베이스에 직접 접근하지 않는다.
- 모든 데이터 접근은 Spring API를 통해 수행된다.
- Spring 백엔드는 MySQL과의 상호작용을 책임진다.

### 4.3 이벤트 기반 후처리

Firebase Cloud Functions에서 수행하던 역할을  
Spring 내부의 이벤트 기반 구조로 대체한다.

- 비즈니스 핵심 로직과 부가 효과(알림, 로그 등)를 분리한다.
- 도메인 이벤트를 통해 후처리를 수행한다.
- 회원 탈퇴처럼 외부 시스템(Firebase Auth) 정리가 필요한 경우에도, 핵심 트랜잭션과 after-commit 후처리를 분리한다.

### 4.4 마인크래프트 bridge와 화이트리스트의 최종 판단자

Spring 백엔드는 마인크래프트 기능도 예외 없이 최종 판단한다.

- 플러그인은 Firebase RTDB를 직접 읽고 쓰지 않는다.
- 앱/플러그인/채팅방 사이 데이터 흐름은 Spring이 통제한다.
- 화이트리스트, 서버 상태, 온라인 플레이어, JE/BE 검증 규칙은 서버가 source of truth를 가진다.
- 마인크래프트 공개방 canonical id는 `public:game:minecraft`로 고정한다.
- 플러그인 내부 API는 `X-Skuri-Minecraft-Secret` 기반 서버 대 서버 인증으로 보호한다.
- 앱의 마인크래프트 채팅은 기존 Chat 도메인을 재사용하되, 서버가 `TEXT`/`IMAGE` -> 플러그인 표시 규칙과 시스템 메시지 알림 예외를 강제한다.

---

## 5. 클라이언트(React Native)의 역할

클라이언트는 다음 책임을 유지한다.

- 화면 렌더링
- 사용자 입력 처리
- 사용자 경험(UX) 개선 로직
  - 로딩 처리
  - optimistic UI
  - 버튼 비활성화 등

단, 데이터의 최종 상태 및 비즈니스 규칙 판단은 수행하지 않는다.

---

## 6. 비즈니스 규칙을 서버에서 관리한다는 의미

본 프로젝트에서 비즈니스 규칙이란  
서비스 도메인에서 “이 행위가 가능한지 / 불가능한지”를 판단하는 규칙을 의미한다.

- 클라이언트는 사용자의 의도를 요청으로 전달한다.
- 서버는 요청의 가능 여부를 판단한다.
- 서버의 판단 결과가 항상 최종 결과이다.

이는 “클라이언트에는 화면만 있다”는 의미는 아니다.

---

## 7. 인증(Authentication) 및 권한(Authorization) 구조

### 7.1 인증 방식

- 인증(Authentication)은 Firebase Authentication에 위임한다.
- 클라이언트는 Firebase Auth를 통해 로그인한다.
- 로그인 성공 시 Firebase에서 ID Token(JWT)을 발급받는다.

### 7.2 서버 인증 흐름

1. 클라이언트는 Firebase Auth로 발급받은 ID Token을  
   HTTP 요청의 Authorization 헤더에 포함하여 서버에 전달한다.
2. Spring 백엔드는 Firebase Admin SDK를 사용해 토큰을 검증한다.
3. 검증 성공 시 토큰에 포함된 uid를 사용자 식별자로 사용한다.
4. 검증된 토큰의 `email`이 `@sungkyul.ac.kr`가 아니면 요청을 거부한다. (403)
5. Auth Emulator는 `local-emulator` 프로필에서만 허용하며, 운영/일반 local 프로필에서 emulator host가 감지되면 기동을 차단한다.
6. `members.status = WITHDRAWN`인 회원은 보호 API에서 `403 MEMBER_WITHDRAWN`으로 차단한다.
7. 예외적으로 `POST /v1/members`는 탈퇴한 동일 UID가 명시적인 `409 WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED`를 받을 수 있도록 통과시킨다.

Spring 백엔드는 Access Token / Refresh Token을 직접 발급하거나 관리하지 않는다.

### 7.3 권한(Authorization)

- 인증된 사용자(uid)를 기준으로
- 도메인별 권한 검증을 Spring의 비즈니스 로직에서 수행한다.
- 기본 정책은 “모든 API 인증 필요”이며, 아래 공개 API만 예외로 `permitAll` 처리한다.
  - `GET /v1/app-versions/**`
  - `GET /v1/app-notices/**`
  - `GET /v1/legal-documents/**`
  - `GET /v1/campus-banners/**`
  - `GET /uploads/**` (`MEDIA_STORAGE_PROVIDER=LOCAL`일 때 `media.storage.url-prefix` 기준 공개 업로드 파일 조회)
  - `GET /v3/api-docs/**`
  - `GET /swagger-ui/**`, `GET /swagger-ui.html`
  - `GET /scalar/**`
- 보호 API에 인증 정보가 없거나 유효하지 않으면 401을 반환한다.
- 관리자 권한 정책:
  - 인증 필터에서 `uid` 기준 `members.isAdmin` 조회 후 `true`면 `ROLE_ADMIN` authority를 부여한다.
  - Admin API는 공통 메타 어노테이션(`@AdminApiAccess`, 내부적으로 `@PreAuthorize("hasRole('ADMIN')")`)으로 보호한다.
  - Admin 경로(`/v1/admin/**`)에 비관리자 접근 시 `403 ADMIN_REQUIRED`를 반환한다.
  - 상태 변경 Admin API(`POST`, `PUT`, `PATCH`, `DELETE`)는 `admin_audit_logs`에 `actor/action/target/diff`를 기록하고, `target_id`는 raw 입력이 아니라 canonical 운영 키로 저장한다. 감사 실패가 비즈니스 응답을 500으로 만들지 않도록 best-effort로 처리한다.
  - Member 관리자 전용 예시:
  - `GET /v1/admin/dashboard/summary`
  - `GET /v1/admin/dashboard/activity`
  - `GET /v1/admin/dashboard/recent-items`
  - `GET /v1/admin/members`
  - `GET /v1/admin/members/{memberId}`
  - `GET /v1/admin/members/{memberId}/activity`
  - `PATCH /v1/admin/members/{memberId}/admin-role`
  - 관리자 대시보드 API는 모두 조회 전용(`GET`)이며, `admin_audit_logs` 적재 대상에 포함하지 않는다.
  - 관리자 대시보드 집계/일자 버킷은 `Asia/Seoul` 기준으로 고정한다. `activity.days`는 `7 | 30`만 허용하고, `recent-items`는 Inquiry/Report/AppNotice/Party를 `createdAt DESC`로 병합한 read model만 제공한다.
  - 관리자 대시보드 `summary.totalMembers`는 `members` 전체 row 기준이다. soft delete tombstone(`WITHDRAWN`)을 제외한 ACTIVE-only 집계는 이번 범위에 포함하지 않는다.
  - `GET /v1/admin/members`는 `query/status/isAdmin/department` 필터와 `sortBy/sortDirection` 정렬을 지원한다. 정렬 미지정 시 `joinedAt DESC`, null 값은 항상 마지막이다.
  - Member 운영 목록의 이름 컬럼은 `members.realname`을 사용한다.
  - Member 운영 목록의 `lastLoginOs`, `currentAppVersion`은 최근 활성 FCM 토큰의 `fcm_tokens.platform`, `fcm_tokens.app_version`을 같은 대표 토큰 기준으로 사용한다.
  - `POST /v1/members/me/fcm-tokens`의 `appVersion`은 optional이며, 신규 토큰 등록 시 미전송하면 `null`로 저장하고 기존 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지한다.
  - Member 활동 요약 조회는 ACTIVE 회원만 허용하고, 탈퇴 회원 대상 조회는 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`으로 거부한다.
  - Member 활동 요약은 현재 저장된 post/comment/party/inquiry/report 데이터만 집계하는 read-only 관리자 모델이며, 댓글은 삭제되지 않은 부모 post 기준으로만 포함한다. 상태 변경/복원 로직을 포함하지 않는다.
  - Member 관리자 권한 변경은 현재 `members.isAdmin` boolean만 갱신한다.
  - 자기 자신의 계정 대상 관리자 권한 변경은 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`로 거부한다.
  - 탈퇴 회원에 대한 관리자 권한 변경은 `409 CONFLICT`를 반환한다.
  - 마지막 관리자 수 계산 같은 추가 보호 정책은 이번 범위에 포함하지 않는다.
  - admin-role 변경 감사 로그는 최소 snapshot(`id`, `email`, `nickname`, `isAdmin`, `status`)만 저장하고 `bankAccount`, `notificationSetting`는 포함하지 않는다.
  - TaxiParty 관리자 전용 예시:
    - `GET /v1/admin/parties`
    - `GET /v1/admin/parties/{partyId}`
    - `GET /v1/admin/parties/{partyId}/messages`
    - `PATCH /v1/admin/parties/{partyId}/status`
    - `DELETE /v1/admin/parties/{partyId}/members/{memberId}`
    - `POST /v1/admin/parties/{partyId}/messages/system`
    - `GET /v1/admin/parties/{partyId}/join-requests`
  - Chat 관리자 전용 예시:
    - `GET /v1/admin/chat-rooms`
    - `GET /v1/admin/chat-rooms/{chatRoomId}`
    - `GET /v1/admin/chat-rooms/{chatRoomId}/messages`
    - `POST /v1/admin/chat-rooms`
    - `DELETE /v1/admin/chat-rooms/{chatRoomId}`
  - Chat 관리자 조회는 read-only 운영 API이며 `admin_audit_logs` 적재 대상에 포함하지 않는다.
  - `GET /v1/admin/chat-rooms*`는 현재 관리자 계정의 membership/학과와 무관하게 `isPublic=true && type!=PARTY` 공개 채팅방 전체를 조회한다.
    - 응답은 기존 chat DTO를 재사용하되 관리자 개인 상태 필드는 `joined=false`, `unreadCount=0`, `isMuted=false`, `lastReadAt=null`로 고정한다.
  - `GET /v1/admin/parties/{partyId}/messages`는 party membership 없이 `party:{partyId}` canonical chat room 기준 메시지를 조회한다.
  - TaxiParty 관리자 상태 변경은 운영자 권한으로 호출할 수 있지만, 기존 파티 상태 머신 불변식은 그대로 유지한다.
    - `CLOSE`: `OPEN`에서만
    - `REOPEN`: `CLOSED`에서만
    - `CANCEL`: `OPEN | CLOSED`에서만
    - `END`: `ARRIVED`에서만
  - TaxiParty 관리자 상태 변경 감사 로그는 최소 snapshot(`id`, `status`, `endReason`, `settlementStatus`, `endedAt`)만 저장한다.
  - TaxiParty 관리자 멤버 제거는 leader를 제외한 일반 멤버에만 허용한다.
    - `ARRIVED`, `ENDED` 상태에서는 제거를 허용하지 않는다.
    - 채팅방 membership sync, leave 시스템 메시지, SSE `KICKED`, notification event는 기존 public kick 로직과 동일하게 재사용한다.
    - 멤버 제거 감사 로그는 최소 snapshot(`partyId`, `memberId`, `isLeader`, `joinedAt`)만 저장한다.
  - TaxiParty 관리자 시스템 메시지는 party chat room이 있을 때만 허용한다.
    - 표시 기준은 `senderName=관리자`, `senderPhotoUrl=null`이며 leader/member를 사칭하지 않는다.
    - 시스템 메시지 감사 로그는 최소 snapshot(`id`, `chatRoomId`, `senderId`, `senderName`, `type`, `source`, `text`, `createdAt`)만 저장한다.
  - TaxiParty 관리자 join request 조회는 현재 `PENDING` 상태만 latest-first(`requestedAt DESC`)로 읽는다. 승인/거절 액션은 이번 범위에 포함하지 않는다.
  - Academic 관리자 전용 예시:
    - `POST /v1/admin/academic-schedules`
    - `PUT /v1/admin/academic-schedules/{scheduleId}`
    - `PUT /v1/admin/academic-schedules/bulk`
    - `DELETE /v1/admin/academic-schedules/{scheduleId}`
    - `POST /v1/admin/courses/bulk`
    - `DELETE /v1/admin/courses`
  - 학사 일정 관리자 bulk sync는 `scopeStartDate ~ scopeEndDate` 범위 안에 완전히 포함되는 기존 일정만 대상으로 하고, 자연키 `title + startDate + endDate + type` 기준으로 create/update/delete를 판단한다.
  - 학사 일정 bulk sync 감사 로그는 row 전체 before/after 대신 `scopeStartDate`, `scopeEndDate`, `created`, `updated`, `deleted` 요약 snapshot만 저장한다.
- Support API 접근 정책:
  - 공개 조회:
    - `GET /v1/app-versions/{platform}`
    - `GET /v1/legal-documents/{documentKey}`
    - `GET /v1/campus-banners`
  - 인증 사용자:
    - `POST /v1/inquiries`
    - `GET /v1/inquiries/my`
    - `POST /v1/images` with `context=INQUIRY_IMAGE`
    - `POST /v1/reports`
    - `GET /v1/cafeteria-menus`
    - `GET /v1/cafeteria-menus/{weekId}`
    - `PUT /v1/cafeteria-menu-reactions/{menuId}`
  - 관리자 전용:
    - `GET /v1/admin/legal-documents`
    - `GET /v1/admin/legal-documents/{documentKey}`
    - `PUT /v1/admin/legal-documents/{documentKey}`
    - `DELETE /v1/admin/legal-documents/{documentKey}`
    - `GET /v1/admin/inquiries`
    - `PATCH /v1/admin/inquiries/{inquiryId}/status`
    - `GET /v1/admin/reports`
    - `PATCH /v1/admin/reports/{reportId}/status`
    - `PUT /v1/admin/app-versions/{platform}`
    - `POST /v1/admin/cafeteria-menus`
    - `PUT /v1/admin/cafeteria-menus/{weekId}`
    - `DELETE /v1/admin/cafeteria-menus/{weekId}`
  - 운영 데이터 노출:
    - Inquiry의 구조화 개인정보(`userEmail`, `userName`, `userRealname`, `userStudentId`)는 관리자에게만 노출한다.
    - 회원 탈퇴 이후에는 동일 필드에 탈퇴 마스킹 정책을 적용한 값만 조회한다.
    - 자유서술 `content`는 운영 추적을 위해 자동 마스킹하지 않는다.
- Academic API 접근 정책:
  - `GET /v1/courses`
  - `GET /v1/timetables/my/semesters`
  - `GET /v1/timetables/my`
  - `POST /v1/timetables/my/courses`
  - `POST /v1/timetables/my/manual-courses`
  - `DELETE /v1/timetables/my/courses/{courseId}`
  - `GET /v1/academic-schedules`
  - 위 경로는 모두 인증이 필요하며, 시간표 API는 인증된 사용자 본인 기준으로만 동작한다.
  - 시간표 API는 공식 강의 카탈로그와 직접 입력 강의를 서버에서 함께 조립해 `courses[] + slots[]`로 반환한다.
  - 공식 강의와 직접 입력 강의는 저장/소유권 모델을 분리한 채 유지한다.
  - 온라인 강의는 공식 강의/직접 입력 강의를 막론하고 `courses[].isOnline = true`로 명시하고 `slots[]`에는 포함하지 않는다.
  - 공식 온라인 강의는 현재 온라인 직접 입력 강의와 같은 의미로 취급하며, 시간 충돌 검사 대상에서도 제외한다.
- 파티 권한 예시:
  - 리더 전용:
    - `PATCH /v1/parties/{id}`
    - `PATCH /v1/parties/{id}/close`
    - `PATCH /v1/parties/{id}/reopen`
    - `PATCH /v1/parties/{id}/arrive`
    - `PATCH /v1/parties/{id}/end`
    - `POST /v1/parties/{id}/cancel`
    - `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm`
    - `DELETE /v1/parties/{id}/members/{memberId}`
    - `PATCH /v1/join-requests/{id}/accept`, `PATCH /v1/join-requests/{id}/decline`
  - 요청자 본인: `PATCH /v1/join-requests/{id}/cancel`
  - 멤버 본인: `DELETE /v1/parties/{id}/members/me`
  - 인증 사용자 본인 전용 조회:
    - `GET /v1/members/me/parties`
    - `GET /v1/members/me/taxi-history`
    - `GET /v1/members/me/taxi-history/summary`
  - 관리자 운영 전용:
    - `GET /v1/admin/parties`
    - `GET /v1/admin/parties/{partyId}`
    - `PATCH /v1/admin/parties/{partyId}/status`
    - `DELETE /v1/admin/parties/{partyId}/members/{memberId}`
    - `POST /v1/admin/parties/{partyId}/messages/system`
    - `GET /v1/admin/parties/{partyId}/join-requests`
  - 정책 메모:
    - 리더는 일반 `leave`가 없고, 파티 종료 의도는 `cancel` 또는 `end`로만 표현한다.
    - 리더 승계는 지원하지 않으며 리더가 파티를 없애면 서버가 종료 상태와 채팅/알림 이벤트를 함께 생성한다.
    - Taxi history 화면용 `role/status/paymentAmount/completedRideCount/savedFareAmount`는 클라이언트 계산값이 아니라 서버가 `Party.status`, `Party.endReason`, 정산 snapshot을 기준으로 확정한다.
    - 관리자 override도 리더 전용 public action과 동일한 entity 전이만 재사용하며, 임의 상태 점프는 허용하지 않는다.
    - 관리자 멤버 제거도 기존 aggregate 규칙을 재사용하며, leader 제거/리더 승계 정책은 이번 범위에 포함하지 않는다.
- 게시판 권한 예시:
  - 게시글 작성자 전용:
    - `PATCH /v1/posts/{postId}`
    - `DELETE /v1/posts/{postId}`
    - 위반 시 `403 NOT_POST_AUTHOR`
  - 댓글 작성자 전용:
    - `PATCH /v1/comments/{commentId}`
    - `DELETE /v1/comments/{commentId}`
    - 위반 시 `403 NOT_COMMENT_AUTHOR`
  - 내 데이터 전용:
    - `GET /v1/members/me/posts`
    - `GET /v1/members/me/bookmarks`
  - 관리자 전용:
    - `GET /v1/admin/posts`
    - `GET /v1/admin/posts/{postId}`
    - `PATCH /v1/admin/posts/{postId}/moderation`
    - `GET /v1/admin/comments`
    - `PATCH /v1/admin/comments/{commentId}/moderation`
    - 위반 시 `403 ADMIN_REQUIRED`
  - 정책 메모:
    - 관리자 override는 public 작성자 권한 체크를 우회하지만, hard delete는 하지 않는다.
    - moderation 상태는 `VISIBLE`, `HIDDEN`, `DELETED`를 사용하고 `DELETED`는 기존 soft delete를 재사용한다.
    - `DELETED`는 복구하지 않고, `HIDDEN <-> VISIBLE`만 허용한다.
- Legal Document 권한 예시:
  - 공개 조회:
    - `GET /v1/legal-documents/{documentKey}`
    - `documentKey`: `termsOfUse` | `privacyPolicy`
  - 관리자 전용:
    - `GET /v1/admin/legal-documents`
    - `GET /v1/admin/legal-documents/{documentKey}`
    - `PUT /v1/admin/legal-documents/{documentKey}`
    - `DELETE /v1/admin/legal-documents/{documentKey}`
    - 위반 시 `403 ADMIN_REQUIRED`
- Notice 권한 예시:
  - 공개 조회:
    - `GET /v1/app-notices`
    - `GET /v1/app-notices/{appNoticeId}`
  - 인증 사용자 전용:
    - `GET /v1/members/me/app-notices/unread-count`
    - `POST /v1/members/me/app-notices/{appNoticeId}/read`
    - `GET /v1/members/me/notice-bookmarks`
    - `POST /v1/notices/{noticeId}/bookmark`
    - `DELETE /v1/notices/{noticeId}/bookmark`
  - 공지 댓글 작성자 전용:
    - `PATCH /v1/notice-comments/{commentId}`
    - `DELETE /v1/notice-comments/{commentId}`
    - 위반 시 `403 NOT_NOTICE_COMMENT_AUTHOR`
  - 관리자 전용:
    - `POST /v1/admin/notices/sync`
    - `POST /v1/admin/app-notices`
    - `PATCH /v1/admin/app-notices/{appNoticeId}`
    - `DELETE /v1/admin/app-notices/{appNoticeId}`
    - 위반 시 `403 ADMIN_REQUIRED`
- Campus 권한 예시:
  - 공개 조회:
    - `GET /v1/campus-banners`
  - 관리자 전용:
    - `GET /v1/admin/campus-banners`
    - `GET /v1/admin/campus-banners/{bannerId}`
    - `POST /v1/admin/campus-banners`
    - `PATCH /v1/admin/campus-banners/{bannerId}`
    - `DELETE /v1/admin/campus-banners/{bannerId}`
    - `PUT /v1/admin/campus-banners/order`
    - 위반 시 `403 ADMIN_REQUIRED`
- Image 업로드 권한 예시:
  - 인증 사용자:
    - `POST /v1/images` with `context=POST_IMAGE`
    - `POST /v1/images` with `context=CHAT_IMAGE`
    - `POST /v1/images` with `context=PROFILE_IMAGE`
    - `POST /v1/images` with `context=INQUIRY_IMAGE`
  - 관리자 전용:
    - `POST /v1/images` with `context=APP_NOTICE_IMAGE`
    - `POST /v1/images` with `context=CAMPUS_BANNER_IMAGE`
    - 위반 시 `403 ADMIN_REQUIRED`
  - 공개 조회:
    - LOCAL provider에서는 업로드 결과 URL(`GET /uploads/**`)을 클라이언트가 그대로 표시할 수 있도록 공개 제공한다.
    - LOCAL provider의 공개 경로는 잘못된/만료된 Bearer 토큰이 헤더에 있어도 인증 실패로 차단하지 않는다.
    - FIREBASE provider에서는 Firebase Storage download URL을 그대로 응답한다.

---

## 8. 실시간 통신 설계 범위

### 8.1 실시간 제공 대상 기능

- 파티 목록
- 파티 상태
- 채팅
- 알림
- 게시물 목록
- 게시물 조회수

### 8.2 통신 방식 분리

| 기능 | 통신 방식 |
|----|----|
| 파티 목록 / 상태 | SSE |
| 알림 | SSE |
| 게시물 목록 / 조회수 | SSE |
| 마인크래프트 상세 상태 / 플레이어 목록 | SSE (`/v1/sse/minecraft`) |
| 채팅방 목록 요약 (이름/인원/마지막 메시지/미읽음) | WebSocket (`/user/queue/chat-rooms`) |
| 채팅방 상세 메시지 | WebSocket (`/topic/chat/{chatRoomId}`) |
| 채팅방 메시지 전송 | WebSocket (`/app/chat/{chatRoomId}`) |
| 채팅 에러 이벤트 | WebSocket (`/user/queue/errors`) |
| 플러그인 -> 백엔드 마인크래프트 이벤트 | Internal HTTP (`/internal/minecraft/**`) |
| 백엔드 -> 플러그인 화이트리스트/앱 채팅 전달 | Internal SSE (`/internal/minecraft/stream`) |

운영 원칙:
- 채팅방 목록 화면은 사용자 요약 채널 1개만 구독한다.
- 채팅방 상세 화면은 입장한 방 topic만 구독하고, 화면 이탈 시 해제한다.
- 미읽음 계산은 `message.createdAt > lastReadAt` 기준을 사용한다.
- `lastReadAt`는 과거 값 요청을 무시해 단조 증가를 보장하고, 미래 시각 요청은 서버 현재 시각과 마지막 메시지 시각을 상한으로 clamp한다.
- 모든 채팅방 topic 동시 구독 방식은 서버 fan-out/모바일 리소스 비용 증가로 금지한다.
- 비공개 채팅방(PARTY 포함)은 멤버만 topic 구독/메시지 전송이 가능해야 한다.
- 파티 채팅의 `SYSTEM`/`ARRIVED`/`END`는 서버만 생성하며, 클라이언트는 `TEXT`/`IMAGE`/`ACCOUNT`만 전송한다.
- 파티 `SYSTEM` 메시지는 동승 승인, 모집 마감, 모집 재개, 멤버 나가기 같은 상태 변화 안내에 사용한다.
- `ACCOUNT` 메시지는 snapshot payload와 `remember` 의미를 포함하고, `ARRIVED` 메시지는 서버가 정산 snapshot을 채워 넣는다.
- 동승 요청 수락으로 파티가 자동 `CLOSED` 되면 `SYSTEM` 메시지는 `합류 안내 -> 모집 마감 안내` 순서로 저장/브로드캐스트한다.
- 파티 채팅 `CHAT_MESSAGE` 알림은 `ACCOUNT`/`SYSTEM`/`ARRIVED`/`END`도 포함하며, push payload 이동 식별자는 `chatRoomId`를 canonical로 사용한다.
- 마인크래프트 상세 화면은 채팅과 상태 채널을 분리한다.
  - 채팅: 기존 WebSocket 채널
  - 서버 상태/플레이어 목록: `/v1/sse/minecraft`
- 플러그인과의 통신은 모바일 WebSocket과 분리한 internal bridge를 사용한다.
- internal plugin SSE는 `Last-Event-ID` replay를 지원해 reconnect 시 whitelist/app message를 복구한다.
- 마인크래프트방 시스템 메시지는 일반 공개방 membership 메시지와 달리 push/inbox 대상에 포함한다.

### 8.3 실시간 통신 인증

- REST API: 매 요청마다 ID Token 전달
- SSE / WebSocket: 연결 시작 시 ID Token 전달
- 연결 인증 성공 후에는 추가 토큰 검증 없이 통신을 유지한다.
- 단, WebSocket은 연결 이후에도 목적지(`/app/chat/{chatRoomId}`, `/topic/chat/{chatRoomId}`)별 권한 검증을 수행한다.

---

## 9. 마이그레이션 전략

- 기능(도메인) 단위 점진적 마이그레이션을 적용한다.
- Firebase와 Spring 백엔드는 일정 기간 공존할 수 있다.

---

## 10. 실패 허용 정책

- 비즈니스 핵심 로직은 실패 시 전체 요청을 실패로 처리한다.
- 알림, 로그 등 부가 효과는 실패하더라도 핵심 로직에는 영향을 주지 않는다.
- 알림 부가 효과는 상태 변경 성공 이후 `after-commit` 이벤트로 실행한다.
- FCM 자격증명이 없는 로컬/테스트 환경에서는 no-op sender 또는 mock으로 대체 가능해야 하며, 이 경우에도 애플리케이션 기동과 테스트는 유지되어야 한다.
- Optimistic Lock 충돌은 정상 경쟁 상황으로 간주하되, `409` 에러율/배치 충돌률 임계치를 초과하면 운영 알림을 발생시킨다.
  - 상세 임계치: `implementation-roadmap.md`의 "Phase 2 > 2-5 운영 모니터링 기준" 준수

---

## 11. Firebase에 잔존하는 역할

Spring 마이그레이션 이후에도 Firebase는 다음 역할을 유지한다.

- Firebase Authentication
- Firebase Cloud Messaging (FCM)

유지하지 않는 역할:

- 마인크래프트 RTDB 채팅 브리지
- 마인크래프트 서버 상태/화이트리스트 저장소
- 마인크래프트 Cloud Functions 동기화 로직

---

## 12. 정리

Spring 백엔드는 본 프로젝트에서 다음과 같은 역할을 수행한다.

- 비즈니스 규칙의 최종 판단자
- 데이터 접근의 단일 관문
- 실시간 데이터 제공자
- 인증 결과를 신뢰하고 권한을 판단하는 서버

---

## 13. 다음 단계

본 문서를 기준으로 다음 작업을 진행한다.

1. 요구사항 명세서 작성
2. API 명세 (REST / SSE / WebSocket)
3. 도메인 모델링 및 패키지 구조 설계
