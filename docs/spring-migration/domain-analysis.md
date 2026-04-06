# Spring 백엔드 도메인 분석

> 최종 수정일: 2026-04-01
> 분석 기준: 레거시 Firestore/Cloud Functions 구조 + 현재 RN repository/transport 구조 + 현재 Spring 구현

본 문서는 SKURI Taxi의 레거시 Firebase 구조와 현재 Spring Boot + MySQL 구현을 함께 대조해 정리한 **도메인 분석 결과**입니다.

---

## 목차

1. [분석 개요](#1-분석-개요)
2. [도메인 목록](#2-도메인-목록)
3. [도메인 상세](#3-도메인-상세)
4. [도메인 간 관계](#4-도메인-간-관계)
5. [인프라 계층](#5-인프라-계층)
6. [패키지 구조](#6-패키지-구조)
7. [핵심 엔티티 설계](#7-핵심-엔티티-설계)
8. [마이그레이션 우선순위](#8-마이그레이션-우선순위)

---

## 1. 분석 개요

### 1.1 분석 원칙

- **화면(UI) 기준이 아닌 "비즈니스 개념" 기준**으로 도메인 식별
- Firestore 컬렉션, Cloud Functions 트리거, Context/Hook 구조를 주요 근거로 사용
- 기술적 관심사(Auth, FCM, 실시간 통신)는 도메인이 아닌 **인프라**로 분리

### 1.2 분석 대상

| 소스 | 분석 항목 |
|------|----------|
| 프론트 레포 `docs/references/legacy/firestore-data-structure.md` | 레거시 Firestore 컬렉션 구조 |
| 프론트 레포 `docs/references/legacy/scripts/` | 레거시 운영 스크립트/이벤트 처리 참고 |
| 프론트 레포 `src/features`, `src/shared`, `src/di` | 현재 RN repository/query/transport 구조 |
| 백엔드 레포 `src/main/java/com/skuri/skuri_backend/domain` | 현재 Spring 도메인 구현 |

### 1.3 설계 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 파티 채팅 | TaxiParty 도메인에서 규칙 관리, Chat 엔진 사용 | 계좌 공유, 도착/정산 메시지 등 파티 고유 규칙 존재 |
| Minecraft 연동 | `Minecraft` 도메인 + `Chat` 연계 | 플러그인/화이트리스트/서버 상태/검증을 Spring으로 이관 |
| Settlement(정산) | Party 내부에 임베디드 | 실제 결제/송금 API 연동 계획 없음 |
| Notification | 인프라 계층으로 유지 | 자체 비즈니스 규칙 없음, 이벤트 결과 전달용 |

---

## 2. 도메인 목록

### 2.1 최종 도메인 (8개 + 인프라)

| # | 도메인 | 유형 | 핵심 책임 | 주요 엔티티 |
|---|--------|------|----------|------------|
| 1 | **Member** | Core | 회원 프로필, 계정 정보, 알림 설정 | Member, NotificationSetting, LinkedAccount, BankAccount |
| 2 | **TaxiParty** | Core | 택시 동승 모집, 요청 처리, 정산, 파티 채팅 규칙 | Party, JoinRequest, Settlement, PartyMessage |
| 3 | **Chat** | Supporting | 공개 채팅방 관리, 메시지 교환 (채팅 엔진) | ChatRoom, ChatMessage, ChatRoomMember |
| 4 | **Minecraft** | Supporting | 마인크래프트 계정/화이트리스트, 서버 상태, 플러그인 bridge | MinecraftAccount, MinecraftServerState, MinecraftOnlinePlayer, MinecraftBridgeEvent |
| 5 | **Board** | Supporting | 게시글 CRUD, 댓글, 좋아요/북마크 | Post, Comment, PostInteraction |
| 6 | **Notice** | Supporting | 학교 공지 크롤링/조회, 앱 공지 | Notice, NoticeComment, AppNotice, NoticeReadStatus, AppNoticeReadStatus |
| 7 | **Academic** | Generic | 강의 정보, 시간표, 학사 일정 | Course, UserTimetable, AcademicSchedule |
| 8 | **Support** | Generic | 문의/신고 접수, 앱 버전, 법적 문서, 학식 메뉴 | Inquiry, Report, AppVersion, LegalDocument, CafeteriaMenu |
| - | **Notification** | Infra | 도메인 이벤트 기반 알림 인박스 | UserNotification |

### 2.2 도메인 유형 정의

- **Core**: 앱의 핵심 비즈니스 가치를 제공하는 도메인
- **Supporting**: Core 도메인을 지원하는 도메인
- **Generic**: 범용적이고 교체 가능한 도메인
- **Infra**: 도메인 횡단 관심사, 기술적 인프라

---

## 3. 도메인 상세

### 3.1 Member (회원)

```
책임: 사용자 인증 후 프로필 관리, 계좌 정보, 알림 설정

Firestore 컬렉션:
  - users/{uid}
  - users/{uid}.notificationSettings
  - users/{uid}/chatRoomNotifications/{chatRoomId}

Hooks:
  - useUserProfile
  - useAccountInfo
  - useNotificationSettings

엔티티:
  - Member
    - uid, email, nickname, studentId, department
    - photoURL, realname, isAdmin, joinedAt, lastLogin
  - NotificationSetting
    - allNotifications, partyNotifications, noticeNotifications
    - boardLikeNotifications, commentNotifications, bookmarkedPostCommentNotifications
    - systemNotifications
    - academicScheduleNotifications, academicScheduleDayBeforeEnabled, academicScheduleAllEventsEnabled
    - noticeNotificationsDetail (카테고리별 상세 설정)
  - LinkedAccount
    - provider, providerId, email, providerDisplayName, photoURL
  - BankAccount
    - bankName, accountNumber, accountHolder, hideName

특이사항:
  - 모든 도메인에서 참조하는 핵심 엔티티
  - FCM 토큰 관리는 인프라(Notification)로 이동
  - 인증 필터에서 `email` 도메인(`@sungkyul.ac.kr`)을 강제 검증
  - 보호 API는 활성 회원(`members.status = ACTIVE`)만 접근 가능하며, 탈퇴 회원은 `403 MEMBER_WITHDRAWN`으로 차단
  - 회원 생성 시 `nickname`은 기본값 `스쿠리 유저`로 저장
  - 회원 생성 시 `realname`은 provider 프로필 이름(`linked_accounts.provider_display_name`)으로 초기화
  - 회원 생성 시 `members.photo_url`은 `null`, 소셜 프로필 이미지(`picture`)는 `linked_accounts.photo_url`에만 저장
  - `linked_accounts.provider`는 `GOOGLE`, `PASSWORD`, `UNKNOWN`을 사용
  - 소셜 로그인(`GOOGLE`)이 아닌 경우 `linked_accounts`는 `provider`를 제외한 provider 부가 컬럼을 `null`로 저장
  - `linked_accounts.providerId`는 provider 계정 식별자(예: `firebase.identities[<sign_in_provider>][0]`)를 저장하며, 비소셜 로그인에서는 `null`
  - 회원 탈퇴는 hard delete 대신 soft delete tombstone(`status`, `withdrawnAt`)으로 관리
  - 탈퇴 시 `members` row는 보존하되 개인정보를 스크럽하고, `linked_accounts`는 전량 삭제
  - 탈퇴한 동일 Firebase UID는 `POST /v1/members`에서 재활성화하지 않고 `409 WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED`를 반환
  - 관리자 백오피스용 회원 관리 API는 `/v1/admin/members`, `/v1/admin/members/{memberId}`, `/v1/admin/members/{memberId}/activity`, `/v1/admin/members/{memberId}/admin-role`로 제공한다.
  - 관리자 회원 목록은 `query/status/isAdmin/department` 필터와 `sortBy/sortDirection` 정렬을 지원한다. 정렬 미지정 시 `joinedAt DESC`, null 값은 항상 마지막이다.
  - 관리자 회원 목록의 이름 컬럼은 `members.realname`을 사용한다.
  - 관리자 회원 목록의 `lastLoginOs`, `currentAppVersion`은 최근 활성 FCM 토큰(`coalesce(last_used_at, created_at)` 최신)의 `fcm_tokens.platform`, `fcm_tokens.app_version`을 함께 사용한다.
  - `POST /v1/members/me/fcm-tokens`의 `appVersion`은 optional이며, 신규 토큰 등록 시 미전송하면 `null`로 저장하고 같은 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지한다.
  - 관리자 대시보드 read-model API는 `/v1/admin/dashboard/summary`, `/v1/admin/dashboard/activity`, `/v1/admin/dashboard/recent-items`로 제공한다.
  - 관리자 대시보드 집계는 모두 `Asia/Seoul` 기준이며, `summary.newMembersToday`는 `members.joinedAt` 기준 오늘 `00:00 ~ generatedAt`, `activity`는 `7 | 30`일 버킷만 지원한다.
  - `summary.totalMembers`는 `members` 전체 row 수를 사용한다. soft delete tombstone(`WITHDRAWN`)도 포함하며, ACTIVE 전용 카운트는 이번 read model 범위에 포함하지 않는다.
  - `recent-items`는 현재 저장된 Inquiry/Report/AppNotice/Party만 source로 사용하고, 게시된 앱 공지(`publishedAt <= now`)만 포함한다. 학교 공지 sync 이력이나 별도 운영 action은 대시보드 계약에 포함하지 않는다.
  - 관리자 상세 응답은 운영 화면 요구에 맞춰 `bankAccount`, `notificationSetting`, `withdrawnAt`를 포함한다.
  - 활동 요약은 ACTIVE 회원만 제공하며, 현재 저장된 post/comment/party/inquiry/report 데이터를 조합한 read-only 관리자 read model이다. 댓글은 삭제되지 않은 comment이면서 부모 post도 삭제되지 않은 경우만 집계한다. 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`을 반환한다.
  - 활동 요약의 count는 `posts/comments/partiesCreated/partiesJoined/inquiries/reportsSubmitted`를 사용하고, recent list는 도메인별 최신 5건으로 유지한다.
  - 관리자 권한 변경은 기존 `members.isAdmin` boolean만 조작하며, 자기 자신의 계정 대상 요청은 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`, 탈퇴 회원 대상 요청은 `409 CONFLICT`로 거부한다.
  - 이번 Phase는 self role change guard만 적용하고, 마지막 관리자 수 계산 같은 추가 운영 정책은 후속 범위로 남긴다.
  - admin-role 변경 감사 로그는 최소 snapshot(`id`, `email`, `nickname`, `isAdmin`, `status`)만 저장하고 `bankAccount`, `notificationSetting`는 적재하지 않는다.
```

### 3.2 TaxiParty (택시 파티)

```
책임: 택시 동승 파티 전체 라이프사이클 관리

Firestore 컬렉션:
  - parties/{partyId}
  - joinRequests/{requestId}
  - chats/{partyId}/messages/{messageId}
  - chats/{partyId}/notificationSettings/{uid}

Cloud Functions:
  - onPartyCreate (파티 생성 알림)
  - onJoinRequestCreate (동승 요청 알림)
  - onJoinRequestUpdate (승인/거절 알림)
  - onPartyStatusUpdate (상태 변경 알림)
  - onSettlementComplete (정산 완료 알림)
  - onPartyMemberKicked (강퇴 알림)
  - onPartyEnded (파티 종료 알림)
  - cleanupOldParties (12시간 초과 파티 정리)

Hooks:
  - useParties, useParty, useMyParty
  - useJoinRequest, useJoinRequestStatus, usePendingJoinRequest
  - usePartyActions

실시간 채널 책임 분리:
  - Party SSE (`/v1/sse/parties`): 파티 카드 목록/상태 전이/멤버 변동 브로드캐스트
  - JoinRequest SSE (`/v1/sse/parties/{partyId}/join-requests`): 파티 리더용 동승 요청 리스트 실시간 갱신
  - JoinRequest SSE (`/v1/sse/members/me/join-requests`): 요청자 본인 요청 상태 실시간 갱신
  - Chat WebSocket: 채팅 메시지/채팅방 요약 실시간 갱신

엔티티:
  - Party
    - id, leaderId, departure, destination, departureTime
    - maxMembers, members[], tags[], detail
    - status (OPEN → CLOSED → ARRIVED → ENDED)
    - endReason (ARRIVED, CANCELLED, TIMEOUT, WITHDRAWED)
    - settlement (Embedded)
  - JoinRequest
    - id, partyId, leaderId, requesterId
    - status (PENDING → ACCEPTED | DECLINED | CANCELED)
  - Settlement (Embedded)
    - status (PENDING, COMPLETED)
    - taxiFare
    - splitMemberCount (정산 대상 non-leader 수 + leader)
    - perPersonAmount
    - settlementAccount snapshot (bankName, accountNumber, accountHolder, hideName)
    - memberSettlements (Map<memberId, MemberSettlement>)
  - MemberSettlement (Embedded)
    - settled, settledAt

정산 정책:
  - 앱 내 결제/송금 기능은 제공하지 않으며, 향후에도 제공하지 않음
  - 정산 상태(`memberSettlements`) 변경은 파티 리더만 가능
  - 일반 멤버는 자신의 정산 상태를 직접 변경할 수 없음
  - 도착 처리 요청은 `taxiFare`, `settlementTargetMemberIds`, `account snapshot`을 함께 받는다
  - `settlementTargetMemberIds`에는 현재 파티의 non-leader 멤버만 포함할 수 있다
  - `perPersonAmount`는 `taxiFare / (정산대상인원 + 리더 1명)` 정수 나눗셈(버림)으로 계산
  - 정수 나눗셈으로 생기는 잔여 1원 단위 금액은 서버에서 분배하지 않음(리더 현장 정산 정책)
  - 동승 요청 승인, 모집 마감/재개, 멤버 나가기, 도착 처리, 취소/종료는 서버가 파티 채팅방 안내 메시지(`SYSTEM`/`ARRIVED`/`END`)를 생성한다
  - 동승 요청 승인으로 파티가 정원에 도달하면 `SYSTEM` 메시지는 `합류 안내 -> 모집 마감 안내` 순서로 같은 트랜잭션 안에서 저장되고, 커밋 후 같은 순서로 브로드캐스트된다

상태 머신:
  Party:
    OPEN → CLOSED       (리더: 모집 마감)
    CLOSED → OPEN       (리더: 모집 재개)
    OPEN|CLOSED 내 정보 수정 (리더: departureTime/detail만)
    OPEN|CLOSED → ARRIVED  (리더: 도착 처리 → 정산 시작)
    ARRIVED 상태에서 멤버 정산 완료 처리 (모든 멤버 완료 시 settlementStatus=COMPLETED)
    ARRIVED → ENDED     (리더 종료 요청(`/end`) → endReason=FORCE_ENDED, 미정산 멤버 있어도 가능)
    OPEN|CLOSED → ENDED     (리더 취소)
    OPEN|CLOSED|ARRIVED → ENDED (스케줄러 timeout 자동 종료)

  JoinRequest: PENDING → ACCEPTED | DECLINED | CANCELED
    - CANCELED: 요청자 본인만 취소 가능 (PENDING 상태에서만)
    - 리더는 DECLINE으로 거절 (CANCEL 아님)
    - ACCEPTED 처리로 멤버가 정원(`maxMembers`)에 도달하면 Party 상태를 자동으로 CLOSED 전이

동시성 제어:
  - Party 엔티티의 `@Version` 기반 Optimistic Lock으로 동시 동승 요청/수락 충돌을 방어
  - 같은 사용자의 파티 생성/동승 요청/수락 경로는 `members` row lock으로 직렬화하여 `ALREADY_IN_PARTY` 불변식을 보존
  - 같은 사용자의 동승 요청은 `members` row lock 하에서 `PENDING` 존재 여부를 확인해 동일 파티 live request 중복을 차단하고, 취소/거절 이후 재요청 이력은 허용
  - 충돌 시 `PARTY_CONCURRENT_MODIFICATION` 에러로 재시도 유도

저장소 설계:
  - `PartyMember`, `PartyTag`, `MemberSettlement`는 `Party` aggregate 내부 컬렉션으로 관리
  - 영속화는 `PartyRepository` 단일 저장으로 처리(cascade + orphanRemoval)
  - 하위 엔티티 전용 Repository는 현재 운영 코드에서 사용하지 않음
  - 관리자 운영 목록 조회는 `PartyRepository.searchAdminParties(status, departureDate, query)`로 제공하며, `query`는 출발지/도착지/leaderId/leader nickname을 검색한다.

파티 수정 정책:
  - `PATCH /v1/parties/{id}`는 `departureTime`, `detail`만 허용 (화이트리스트)
  - `OPEN`, `CLOSED` 상태에서만 수정 가능
  - `CLOSED` 상태에서 수정해도 상태 자동 변경 없음 (`reopen`으로만 모집 재개)

관리자 운영 API:
  - `GET /v1/admin/parties`, `GET /v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`
  - `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests`
  - 관리자 상태 변경 액션은 `CLOSE | REOPEN | CANCEL | END` 4개만 제공한다.
  - 관리자라도 기존 상태 머신을 우회하지 않는다.
    - `CLOSE`: `OPEN`에서만 가능
    - `REOPEN`: `CLOSED`에서만 가능
    - `CANCEL`: `OPEN | CLOSED`에서만 가능
    - `END`: `ARRIVED`에서만 가능 (`forceEnd()` 재사용)
  - 상태 변경 후 파티 채팅방 시스템 메시지/SSE/Notification event는 기존 public service와 동일한 규칙을 재사용한다.
  - 관리자 audit snapshot은 최소 상태 필드(`id`, `status`, `endReason`, `settlementStatus`, `endedAt`)만 저장한다.
  - 운영 응답에서는 현재 도메인에 없는 `gender`, `lastStatusChangedAt` 같은 파생 필드를 억지로 만들지 않는다.
  - 관리자 멤버 제거는 기존 `party.removeMember(...)` + 채팅방 membership sync + leave 시스템 메시지 + SSE `KICKED` + `PartyMemberKicked` notification event를 재사용한다.
    - leader 제거는 `PARTY_LEADER_REMOVAL_NOT_ALLOWED`로 차단한다.
    - `ARRIVED`, `ENDED` 상태에서는 멤버 제거를 허용하지 않는다.
  - 관리자 시스템 메시지는 party chat room이 있을 때만 생성되며, 서버 내부적으로 `SYSTEM` + `ADMIN_SYSTEM` source를 사용해 leader/member 사칭을 피한다.
    - 응답/표시 기준 `senderName`은 `관리자`, `senderPhotoUrl`은 `null`이다.
  - 관리자 join request 조회는 현재 `PENDING` 상태만 대상으로 하며, `requestedAt(createdAt) DESC` 최신순 정렬을 사용한다.
  - write admin audit(`멤버 제거`, `시스템 메시지`)는 최소 snapshot만 저장한다.
    - party member: `partyId`, `memberId`, `isLeader`, `joinedAt`
    - chat message: `id`, `chatRoomId`, `senderId`, `senderName`, `type`, `source`, `text`, `createdAt`

파티 자동 종료 정책 (@Scheduled):
  - 실행 주기: 4시간마다
  - 기준: createdAt 기준 12시간 초과한 파티
  - 대상: ENDED가 아닌 모든 파티 (OPEN, CLOSED, ARRIVED 포함)
  - 처리: status=ENDED, endReason=TIMEOUT
  - 구현: Firebase Cloud Functions onSchedule → Spring @Scheduled 대체

endReason 종류:
  - ARRIVED: (레거시) 과거 자동 종료 정책에서 사용된 종료 사유
  - FORCE_ENDED: 리더 종료 요청(`/end`)으로 종료 (미정산 멤버 있을 수 있음)
  - CANCELLED: 리더 취소
  - TIMEOUT: 자동 종료 (12시간 초과)
  - WITHDRAWED: 리더 탈퇴로 인한 종료

택시 이용 내역 조회 규칙:
  - 화면 전용 API는 `/v1/members/me/parties`와 분리한 `/v1/members/me/taxi-history`, `/v1/members/me/taxi-history/summary`로 제공
  - history 목록은 `OPEN`, `CLOSED`를 제외하고 `ARRIVED`, `ENDED`만 포함
  - `dateTime`은 persisted data 기준으로 항상 `departureTime` 사용
  - `role`은 `leaderId == me`면 `LEADER`, 아니면 `MEMBER`
  - `paymentAmount`는 정산 정보가 있으면 `perPersonAmount`, 없으면 `null`
  - 외부 history status 매핑:
    - `ARRIVED`, `ENDED + FORCE_ENDED`, `ENDED + ARRIVED(legacy)` → `COMPLETED`
    - `ENDED + TIMEOUT` → 정산 snapshot(`settlementStatus`, `taxiFare`, `perPersonAmount`)이 있으면 `COMPLETED`, 없으면 `CANCELLED`
    - `ENDED + CANCELLED`, `ENDED + WITHDRAWED` → `CANCELLED`
  - summary는 동일한 history 집합을 사용하고 `completedRideCount = COMPLETED 개수`
  - `savedFareAmount = Σ(taxiFare - perPersonAmount)` for completed entries
    - 1회 파티 기준 “혼자 탔다면 `taxiFare`를 냈을 것”이라는 최소 침습 가정을 사용
    - 취소/정산 미존재 항목은 집계에서 제외

회원 탈퇴 연계 정책:
  - 리더 탈퇴 시 active party는 `ENDED + WITHDRAWED`로 종료
  - 리더 탈퇴와 동시에 해당 파티의 `PENDING` join request는 `DECLINED`로 정리
  - 일반 멤버 탈퇴는 `OPEN`, `CLOSED` 상태에서만 자동 이탈 허용
  - 일반 멤버가 `ARRIVED` 파티에 속해 있으면 정산 회피 방지를 위해 회원 탈퇴를 거부
  - 탈퇴 회원이 요청자인 `PENDING` join request는 `CANCELED`로 정리

파티 채팅 특수 메시지:
  - ACCOUNT: 계좌 정보 공유
  - ARRIVED: 도착 알림 (요금, 1인당 금액)
  - END: 파티 종료 알림
```

### 3.3 Chat (채팅)

```
책임: 공개 채팅방 관리 및 채팅 엔진 제공

Firestore 컬렉션:
  - chatRooms/{chatRoomId}
  - chatRooms/{chatRoomId}/messages/{messageId}
  - users/{uid}/chatRoomStates/{chatRoomId}

Cloud Functions:
  - onChatRoomMessageCreated (채팅 알림)
  - syncMinecraftChatMessage (MC 연동)

Hooks:
  - useChatRooms, useChatRoom
  - useChatMessages, useChatActions
  - useChatRoomNotifications, useChatRoomStates

엔티티:
  - ChatRoom
    - id, name, type (UNIVERSITY, DEPARTMENT, GAME, CUSTOM, PARTY)
    - department, description, createdBy
    - memberCount, messageCount, isPublic, maxMembers
    - lastMessage (Embedded)
    - members[]는 별도 ChatRoomMember 엔티티로 관리 (lastReadAt, muted 필드 포함)
  - ChatMessage
    - id, chatRoomId, senderId, senderName
    - text, type (TEXT, IMAGE, SYSTEM, ACCOUNT, ARRIVED, END)
    - createdAt (서버 타임스탬프)
    - clientCreatedAt (클라이언트 타임스탬프 — Optimistic UI용 보조 필드, 서버 저장 X)
    - accountData, arrivalData (파티 채팅 전용)
    - direction, source, minecraftUuid (MC 연동용)
  - ChatRoomMember
    - userId, chatRoomId, lastReadAt, muted

채팅방 타입:
  - UNIVERSITY: 전체 채팅방
  - DEPARTMENT: 학과별 채팅방
  - GAME: 게임(Minecraft) 채팅방
  - CUSTOM: 사용자 생성 채팅방
  - PARTY: 택시 파티 채팅방 (TaxiParty에서 관리)

역할:
  - 파티 채팅: TaxiParty 도메인이 규칙 관리, Chat은 엔진만 제공
  - 공개 채팅: Chat 도메인이 전체 관리
  - 공식 공개방은 seed migration으로 `UNIVERSITY 1개 + GAME 1개 + 학과방들 + 사용자 생성 CUSTOM` 구조를 유지
  - 공개방 visibility는 서버가 강제한다.
    - `UNIVERSITY`, `GAME`, `CUSTOM`: 전체 사용자 노출
    - `DEPARTMENT`: 본인 학과와 일치하는 방만 노출
    - 회원 `department`는 서버 카탈로그 기준 canonical 값으로 정규화하고 legacy 학과명은 alias 매핑으로 흡수
  - 미참여 공개방도 목록/상세 조회는 가능하지만, 메시지 조회/읽음/mute는 참여자만 가능
  - 관리자 운영 조회는 별도 admin read API로 제공한다.
    - `GET /v1/admin/chat-rooms*`: `isPublic=true && type!=PARTY` 공개 채팅방 전체를 membership/학과 제한 없이 조회
    - 개인 상태 필드(`joined`, `unreadCount`, `isMuted`, `lastReadAt`)는 기존 DTO를 재사용하되 고정값/`null`로 내려간다
  - 공개방 참여/나가기/커스텀방 생성은 REST(`POST /v1/chat-rooms`, `POST /v1/chat-rooms/{id}/join`, `DELETE /v1/chat-rooms/{id}/members/me`)로 처리
  - 공개방 create/join은 가입 완료된 active member만 가능하며, 미가입 UID는 `MEMBER_NOT_FOUND`
  - 커스텀 공개방 생성자는 자동으로 joined 상태가 되며, join 시 초기 unread는 0으로 시작한다
  - 공개방 참여/나가기와 파티 채팅 멤버 입장/퇴장은 실제 `SYSTEM` chat message를 저장하고 `/topic/chat/{chatRoomId}`로 브로드캐스트한다
  - REST/STOMP `ChatMessageResponse`는 `senderPhotoUrl`(nullable)을 포함한다.
    - 앱 사용자 메시지: `members.photo_url`
    - Minecraft origin 메시지: Minotar URL (`minecraftUuid` 기준)
    - 시스템 메시지: `null`
  - `linked_accounts.photo_url` fallback은 사용하지 않는다.
  - 멤버 입장 직후 생성된 join `SYSTEM` 메시지는 해당 신규 멤버의 `lastReadAt`을 서버가 최신 메시지 시각으로 맞춰 unread가 0으로 유지되게 한다
  - 회원 프로필 학과 변경 시 기존 학과방 membership은 자동 제거하고, 새 학과방은 자동 참여시키지 않는다
  - 채팅방 목록 실시간: `/user/queue/chat-rooms` 사용자 전용 요약 채널 1개 구독
  - 채팅방 상세 실시간: `/topic/chat/{chatRoomId}` 방 단위 구독
  - 채팅방 메시지 전송: `/app/chat/{chatRoomId}`
  - 마인크래프트 canonical 공개방은 `public:game:minecraft`로 고정하고, 앱/플러그인 양방향 메시지는 별도 `minecraft` 도메인 bridge가 fan-out 한다.
  - STOMP 에러 수신: `/user/queue/errors` (`errorCode/message/timestamp`)
  - WS 인가: CONNECT 인증 후에도 SEND/SUBSCRIBE 시 채팅방 멤버십을 서버에서 추가 검증
  - 미읽음 계산: `message.createdAt > lastReadAt` 기준 (동일 시각은 읽음)
  - `lastReadAt`는 서버 현재 시각과 마지막 메시지 시각을 상한으로 clamp하여 미래 시각 입력으로 인한 unread 왜곡을 방지
  - 방별 다중 구독(모든 방 topic 동시 구독)은 연결 수/브로드캐스트 비용 증가로 사용하지 않음
  - 회원 탈퇴 시 `chat_room_members`는 전부 정리하고 `chat_rooms.member_count`를 즉시 동기화
  - 탈퇴 회원의 기존 WebSocket 세션은 best-effort로 종료하고, 남아 있는 `/topic/chat/**` outbound delivery도 차단
  - 과거 `chat_messages.senderName`은 Phase 10에서 일괄 수정하지 않고 이력 보존을 우선
```

### 3.4 Minecraft (마인크래프트)

```
책임: 마인크래프트 계정 등록/화이트리스트, 서버 상태, 온라인 플레이어, 플러그인 bridge 관리

현재 구조 근거:
  - Paper 플러그인: Firebase RTDB `mc_chat/messages`, `serverStatus`, `whitelist/*`
  - 앱: Minecraft 상세 화면의 RTDB/Mock repository 의존
  - Cloud Functions: RTDB -> Firestore 공개 채팅방 메시지 동기화

목표 구조:
  - 공개 채팅방 canonical id는 `public:game:minecraft`
  - 앱 채팅은 기존 Chat REST + STOMP를 그대로 사용
  - 앱의 서버 상태/플레이어 목록/계정 등록은 `minecraft` 도메인 public API + SSE 사용
  - 플러그인은 `minecraft` 도메인의 internal HTTP + SSE bridge에 연결

Public API:
  - `GET /v1/minecraft/overview`
  - `GET /v1/minecraft/players`
  - `GET /v1/members/me/minecraft-accounts`
  - `POST /v1/members/me/minecraft-accounts`
  - `DELETE /v1/members/me/minecraft-accounts/{accountId}`
  - `GET /v1/sse/minecraft`

Internal API:
  - `POST /internal/minecraft/chat/messages`
  - `PUT /internal/minecraft/server-state`
  - `PUT /internal/minecraft/online-players`
  - `GET /internal/minecraft/stream`

엔티티/Read model:
  - MinecraftAccount
    - ownerMemberId, parentAccountId, accountRole(SELF/FRIEND)
    - edition(JAVA/BEDROCK), gameName, normalizedKey, avatarUuid
    - lastSeenAt
  - MinecraftServerState
    - serverKey, online, currentPlayers, maxPlayers
    - version, serverAddress, mapUrl, lastHeartbeatAt
  - MinecraftOnlinePlayer
    - serverKey, normalizedKey, edition, playerName
    - avatarUuid, minecraftAccountId, verified, joinedAt
  - MinecraftBridgeEvent
    - eventId, eventType, payload, expiresAt

비즈니스 규칙:
  - 회원당 총 4개 계정까지 등록 가능
  - 본인 계정은 1개만 허용
  - 친구 계정은 최대 3개
  - 친구 계정이 있으면 parent 자기 계정 삭제 금지
  - Java는 Mojang lookup 기반 UUID 검증, Bedrock은 기존 name normalization 규칙 유지
  - 화이트리스트 enabled on/off는 서버 설정값으로만 관리하고 앱/관리자 실시간 토글은 제공하지 않음
  - 앱 -> 마인크래프트는 `TEXT` 그대로 전달, `IMAGE`는 placeholder text로 변환
  - 마인크래프트 -> 앱 senderName은 무조건 Minecraft 닉네임 사용
  - Minecraft origin `senderPhotoUrl`은 Minotar URL을 사용하고, Bedrock은 Steve UUID fallback을 사용
  - 마인크래프트방 `SYSTEM` 메시지는 공개방 일반 membership 메시지와 달리 push/inbox 대상에 포함
```

### 3.5 Board (게시판)

```
책임: 커뮤니티 게시글 및 상호작용 관리

Firestore 컬렉션:
  - boardPosts/{postId}
  - boardComments/{commentId}
  - userBoardInteractions/{userId}_{postId}

Hooks:
  - useBoardPosts, useBoardPost
  - useBoardComments, useBoardWrite, useBoardEdit
  - usePostActions, useUserBoardInteractions
  - useBoardCategoryCounts

엔티티:
  - Post
    - id, title, content, authorId, authorName, authorProfileImage
    - isAnonymous, anonId, category
    - viewCount, likeCount, commentCount, bookmarkCount
    - isPinned, isHidden, isDeleted, images[], createdAt, updatedAt
  - Comment
    - id, postId, content, authorId, authorName, authorProfileImage
    - isAnonymous, anonId (`{postId}:{userId}` 기반 SHA-256 짧은 안정 식별자)
    - anonymousOrder (서버 계산, 아래 규칙 참조)
    - parentId (self-reference), likeCount, isHidden, isDeleted
    - depth 제한 없음 (무제한 self-reference)
    - 조회 응답은 flat list + `parentId` + `depth` + `likeCount` + `isLiked`
    - 부모 삭제 정책(B): 부모는 placeholder("삭제된 댓글입니다")로 soft delete, 자식은 유지
  - CommentLike
    - userId, commentId
    - 댓글 좋아요 중복 방지 및 comment.likeCount 동기화 용도

  anonymousOrder 계산 규칙:
    - 게시글(postId) 단위로 같은 작성자의 익명 댓글에 동일 번호를 유지
    - 댓글 작성/익명 전환 시 같은 작성자의 기존 익명 댓글이 있으면 → 기존 순번 재사용
    - 없으면 → 새 순번 부여 (`max(anonymousOrder) + 1`)
    - 댓글 삭제 후 순번 재계산 없음 (삭제된 댓글도 번호 영구 보존)
    - isAnonymous = false이면 anonymousOrder = null
  댓글 수정 정책:
    - `PATCH /v1/comments/{commentId}`는 `content`와 optional `isAnonymous`를 지원
    - `isAnonymous` 생략 시 기존 값을 유지
    - `false -> true`: 같은 게시글에서 기존 익명 번호가 있으면 재사용, 없으면 새 번호 부여
    - `true -> false`: 실명 댓글로 전환하며 `anonId`, `anonymousOrder`를 정리
  - PostInteraction
    - userId, postId, isLiked, isBookmarked
    - 좋아요/북마크 카운트 동기화는 Post aggregate와 같은 트랜잭션에서 처리

조회/정렬:
  - 게시글 정렬: latest/popular/mostCommented/mostViewed
  - 내 작성글: GET /v1/members/me/posts
  - 내 북마크글: GET /v1/members/me/bookmarks

게시글 수정 정책:
  - `PATCH /v1/posts/{postId}`는 `title`, `content`, `category`, `isAnonymous`를 부분 수정으로 지원
  - `images`는 생성과 동일한 구조를 사용하며, 필드를 보내면 전체 이미지 목록 교체
  - `images[]`의 각 원소는 `null` 불가
  - `images: []`는 전체 제거, `images` 생략/null은 기존 유지

카테고리:
  - GENERAL (일반)
  - QUESTION (질문)
  - REVIEW (후기)
  - ANNOUNCEMENT (공지)

회원 탈퇴 연계 정책:
  - 게시글/댓글 본문은 보존
  - `authorId`, `authorName`, `authorProfileImage`는 탈퇴 사용자 익명화 값으로 치환
  - 탈퇴 회원의 좋아요/북마크 기록은 삭제하고 `likeCount`, `bookmarkCount`를 보정

관리자 moderation 정책:
  - 관리자 전용 API:
    - `GET /v1/admin/posts`
    - `GET /v1/admin/posts/{postId}`
    - `PATCH /v1/admin/posts/{postId}/moderation`
    - `GET /v1/admin/comments`
    - `PATCH /v1/admin/comments/{commentId}/moderation`
  - moderation 상태는 `VISIBLE`, `HIDDEN`, `DELETED`
  - 기존 soft delete를 유지하고 `isHidden` visibility 필드만 최소 확장해 상태를 표현한다.
    - `VISIBLE`: `isHidden=false`, `isDeleted=false`
    - `HIDDEN`: `isHidden=true`, `isDeleted=false`
    - `DELETED`: 기존 soft delete (`isDeleted=true`)
  - 게시글 public 조회는 `HIDDEN`, `DELETED`를 모두 제외한다.
  - 댓글 public 조회는 `DELETED`와 동일하게 thread 구조를 유지해야 하므로, `HIDDEN` 댓글도 placeholder로 마스킹한다.
  - `commentCount`는 public active comment 기준이므로 `VISIBLE -> HIDDEN/DELETED` 시 감소하고 `HIDDEN -> VISIBLE` 시 증가한다.
  - `DELETED`는 복구하지 않고, `HIDDEN <-> VISIBLE`만 허용한다. 같은 상태 재요청이나 `DELETED -> *`는 `409`로 차단한다.
```

### 3.6 Notice (공지사항)

```
책임: 학교 공지 수집 및 앱 공지 관리

Firestore 컬렉션:
  - notices/{noticeId}
  - notices/{noticeId}/readBy/{uid}
  - noticeComments/{commentId}
  - appNotices/{noticeId}

Cloud Functions:
  - scheduledRSSFetch (10분 주기, 평일 08:00~19:50)
  - onNoticeCreated (새 공지 알림)
  - onAppNoticeCreated (앱 공지 알림)

Hooks:
  - useNotices, useNotice, useRecentNotices
  - useNoticeComments, useNoticeLike
  - useAppNotice, useAppNotices
  - useNoticeSettings

엔티티:
  - Notice
    - id (Base64(link).replace(/=+$/, '').slice(0, 120) — 링크 기반 안정 ID)
    - title, rssPreview, summary, link, postedAt, category
    - department, author, source
    - rssFingerprint (레거시 링크/날짜 기반 변경 감지용)
    - detailHash (상세 HTML/첨부 변경 감지용)
    - contentHash (실제 내용 기반 dedup용)
    - bodyText (plain text), bodyHtml (HTML), thumbnailUrl (첫 이미지 URL cache), attachments[]
    - detailCheckedAt (상세 재검증 시각)
    - viewCount, likeCount, commentCount, bookmarkCount
  - NoticeComment
    - id, noticeId, userId, userDisplayName
    - content, isAnonymous, anonId (`{noticeId}:{userId}` 기반 SHA-256 짧은 안정 식별자)
    - anonymousOrder (서버 계산: Board Comment의 anonymousOrder 계산 규칙과 동일, noticeId 단위로 같은 작성자 번호 유지)
    - parentId, likeCount, isDeleted
    - depth 제한 없음 (무제한 self-reference)
    - 조회 응답은 Board Comment와 동일하게 flat list + `parentId` + `depth` + `likeCount` + `isLiked`
    - 부모 삭제 정책: Board Comment와 동일하게 placeholder soft delete
  - NoticeCommentLike
    - userId, commentId
    - 공지 댓글 좋아요 중복 방지 및 noticeComment.likeCount 동기화 용도
  - NoticeReadStatus
    - userId, noticeId, isRead, readAt
  - NoticeLike
    - userId, noticeId
    - 공지 좋아요 중복 방지 및 likeCount 동기화 용도
  - NoticeBookmark
    - userId, noticeId
    - 공지 북마크 중복 방지 및 내 북마크 목록 조회 용도
  - AppNotice
    - id, title, content
    - category (UPDATE, MAINTENANCE, EVENT, GENERAL)
    - priority (HIGH, NORMAL, LOW)
    - imageUrls[], actionUrl, publishedAt

조회/응답 정책:
  - 내 북마크 공지: GET /v1/members/me/notice-bookmarks
  - 목록 item은 공개 Notice API와 naming parity를 유지하기 위해 `rssPreview`, `postedAt`를 그대로 사용
  - 북마크 등록/취소는 `NoticeLike`와 별도 저장 모델을 사용하며 idempotent 하게 처리
  - 공개 Notice 목록/상세는 `bookmarkCount`와 현재 사용자 기준 `isBookmarked`를 함께 반환
  - 공개 Notice 목록은 projection query로 필요한 컬럼만 읽고, 저장된 `thumbnailUrl`을 그대로 사용한다. 목록 경로에서는 `bodyHtml`, `bodyText`, `attachments`를 select하지 않는다.

동기화 정책:
  - 스케줄: 평일 08:00~19:50, 10분 주기, Asia/Seoul
  - 링크 기반 안정 ID는 유지한다.
  - `rssFingerprint`는 레거시(`title|fullLink|rawDate`) 기준을 유지한다.
  - `contentHash`는 링크를 제외한 실제 내용 + 상세 본문/첨부 기반으로 계산해 중복을 배제한다.
  - `rssPreview`는 RSS `description/content/contentSnippet` fallback으로 수집한 미리보기 텍스트다.
  - `rssPreview`는 RSS 길이 제한 때문에 중간에서 잘릴 수 있으며, AI 요약을 의미하지 않는다.
  - `summary`는 추후 AI가 생성한 공지 요약을 저장하기 위한 예약 필드다. 현재 공개 API에는 노출하지 않는다.
  - `bodyHtml`은 상세 페이지 `.view-con`에서 수집한 HTML 원문이며, RN 앱이 웹 구조를 최대한 유지해 렌더링할 수 있도록 그대로 저장한다.
  - `bodyText`는 `bodyHtml`에서 태그를 제거하고 줄바꿈/표 셀 구분을 정규화한 내부 텍스트다.
  - `thumbnailUrl`은 `TEXT` 타입 `thumbnail_url` 컬럼에 저장하며, 상세 크롤링 성공 시 `bodyHtml`의 첫 번째 `img[src]`를 추출해 저장한다.
  - `img[src]`가 비어 있거나 `data:` / `blob:` / 과도하게 긴 값이면 `thumbnailUrl`은 `null`로 저장한다. 상세를 refresh하지 않으면 기존 값을 유지한다.
  - 기존 row의 `thumbnailUrl`은 네트워크 재크롤링 없이 DB `bodyHtml`만 읽는 `NOTICE_THUMBNAILS` backfill plan으로 보정하고, 저장 부적절한 `src`는 `null`로 정리한다.
  - 성결대학교 사이트의 TLS 체인 이슈로 인해, 현재 Spring 구현은 공지 RSS/상세 크롤링 경로에서만 TLS 인증서 검증을 비활성화한다.
  - 개별 공지 저장 실패는 전체 동기화를 중단하지 않고 `failed`로 집계한 뒤 다음 공지 처리를 계속한다.
  - 상세 재크롤링 조건:
    - 신규 공지
    - RSS 메타 변경
    - `detailHash` 없음
    - 마지막 상세 검증 시점이 24시간 초과
  - 관리자 수동 sync는 상세 재크롤링을 강제로 수행한다.

회원 탈퇴 연계 정책:
  - 공지 본문은 회원과 독립적인 외부 데이터이므로 영향 없음
  - `NoticeComment`는 본문을 유지하고 `userId`, `userDisplayName`만 익명화
  - `NoticeCommentLike`, `NoticeLike`, `NoticeBookmark`, `NoticeReadStatus`는 탈퇴 회원 기준으로 정리

댓글 수정 정책:
  - `PATCH /v1/notice-comments/{commentId}`는 `content`와 optional `isAnonymous`를 지원
  - `isAnonymous` 생략 시 기존 값을 유지
  - `false -> true`: 같은 공지에서 기존 익명 번호가 있으면 재사용, 없으면 새 번호 부여
  - `true -> false`: 실명 댓글로 전환하며 `anonId`, `anonymousOrder`를 정리

향후 확장 준비:
  - AI 요약은 `summary` 컬럼에 저장하고, `contentHash`가 바뀌면 기존 AI 요약을 무효화한다.
  - RAG/공지 챗봇은 `bodyText`를 기준으로 chunking/embedding을 수행하고, `title/category/postedAt/link`를 citation 메타데이터로 사용한다.

학교 공지 카테고리 (14개):
  새소식, 학사, 학생, 장학/등록/학자금, 입학,
  취업/진로개발/창업, 공모/행사, 교육/글로벌, 일반,
  입찰구매정보, 사회봉사센터, 장애학생지원센터, 생활관, 비교과
```

### 3.7 Academic (학사 정보)

```
책임: 강의/시간표/학사일정 정보 제공

Firestore 컬렉션:
  - courses/{courseId}
  - userTimetables/{docId}
  - academicSchedules/{scheduleId}

Hooks:
  - useTimetable
  - useAcademicSchedules
  - useCourseSearch

엔티티:
  - Course
    - id, grade, category, code, division, name
    - credits, professor, schedule[], location, isOnline
    - note, semester, department
    - 공식 강의도 `isOnline=true`를 가질 수 있으며, 이 경우 `schedule[]`은 비어 있어야 한다.
  - CourseSchedule (Embedded)
    - dayOfWeek (1-6), startPeriod, endPeriod
  - UserTimetable
    - id, userId, semester
    - unique(userId, semester)
    - 공식 강의는 `UserTimetableCourse`, 직접 입력 강의는 `UserTimetableManualCourse`로 별도 저장
    - 같은 시간표 내 동일 공식 강의 중복 추가 금지
    - 오프라인 강의 추가 시 dayOfWeek/startPeriod/endPeriod overlap 차단
    - 온라인 공식 강의와 온라인 직접 입력 강의는 모두 시간 충돌 검사 대상이 아니며 `slots[]`에 포함되지 않음
    - 조회 응답은 공식 강의와 직접 입력 강의를 합친 `courses[] + slots[]` 구조를 사용
    - `courses[]` 각 항목은 `isOnline`을 포함하고, 공식 강의/직접 입력 강의 모두 실제 온라인 여부를 그대로 반영한다.
    - 공식 온라인 강의는 직접 입력 온라인 강의와 같은 의미로 취급하지만 저장 모델은 합치지 않는다.
    - `GET /v1/timetables/my`는 semester 미지정 시 현재 날짜 기준 `2~7월 -> yyyy-1`, `8~12월 -> yyyy-2`, `1월 -> 전년도 yyyy-2` 규칙으로 현재 학기를 해석
    - 실제 학교 학기 시작은 3월/9월이지만, 수강신청/시간표 준비 수요를 반영해 스쿠리 학기 기준을 한 달 앞당겨 사용
  - UserTimetableCourse
    - timetableId, courseId
  - UserTimetableManualCourse
    - id, timetableId, name, professor, credits
    - isOnline, location, dayOfWeek, startPeriod, endPeriod
    - 온라인 강의는 location/schedule 없이 저장 가능
  - AcademicSchedule
    - id, title, startDate, endDate
    - type (SINGLE, MULTI), isPrimary, description
    - 관리자 bulk sync API(`PUT /v1/admin/academic-schedules/bulk`)는 `scopeStartDate ~ scopeEndDate` 범위 안에 완전히 포함되는 기존 일정만 대상으로 한다.
    - bulk sync 자연키는 `title + startDate + endDate + type`이며, 같은 자연키는 같은 일정으로 보고 `description`, `isPrimary`만 변경 가능 필드로 취급한다.
    - bulk sync는 legacy Firebase 스크립트 호환을 위해 `type: single | multi | SINGLE | MULTI`를 모두 허용한다.
  - Course 검색
    - semester/department/professor/dayOfWeek(1-6)/grade 필터 지원
    - search는 강의명/과목코드/카테고리/교수/강의실/비고를 대상으로 한다
    - 공식 온라인 강의는 `isOnline=true`, `schedule=[]`, `location=null`로 정규화해 반환할 수 있다.
  - Timetable 학기 옵션
    - `GET /v1/timetables/my/semesters`
    - 강의 카탈로그 학기 + 내 시간표 학기(직접 입력 포함)의 합집합을 최신 학기 우선으로 반환

학사 일정 알림 정책 (후속 구현):
  - 기본 트리거 기준일은 `startDate`다.
  - 기본 발송 시각은 당일 오전 09:00이다.
  - 기본 대상은 중요 일정(`isPrimary = true`)이다.
  - 사용자 옵션으로 전날 오전 09:00 추가 발송과 모든 일정 대상 확장을 허용한다.
  - 실제 발송은 Notification 인프라(FCM + 인앱 인박스) Phase에서 처리한다.

회원 탈퇴 연계 정책:
  - `user_timetables`는 탈퇴 회원 기준으로 전량 삭제
```

### 3.8 Support (지원/운영)

```
책임: 문의/신고 접수, 앱 버전 관리, 법적 문서 관리, 학식 메뉴

Firestore 컬렉션:
  - inquiries/{docId}
  - reports/{reportId}
  - appVersion/{platform}
  - cafeteriaMenus/{weekId}
  - adminAuditLogs/{logId}
  - qr_logs/{logId}

Hooks:
  - useSubmitInquiry
  - useCafeteriaMenu

엔티티:
  - Inquiry
    - id, type (FEATURE, BUG, ACCOUNT, SERVICE, OTHER)
    - subject, content, attachments[] (url, thumbUrl, width, height, size, mime)
    - userId, userEmail, userName
    - userRealname, userStudentId
    - status (PENDING, IN_PROGRESS, RESOLVED), adminMemo
    - attachments는 최대 3개, JPEG/PNG/WebP만 허용
    - 요청에서 attachments 생략/null은 허용하고 서버에서 빈 배열로 정규화
    - 응답은 항상 `attachments: []` 형태를 유지하며 null을 반환하지 않음
  - Report
    - id, targetType (POST, COMMENT, MEMBER, CHAT_MESSAGE, CHAT_ROOM, TAXI_PARTY)
    - targetId, targetAuthorId, category, reason
    - `CHAT_MESSAGE.targetAuthorId = message.senderId`
    - `CHAT_ROOM.targetAuthorId = chatRoom.createdBy` (creator가 없는 seed/public 방은 null 허용, `PARTY` 타입 방은 제외)
    - `TAXI_PARTY.targetAuthorId = party.leaderId`
    - reporterId, status (PENDING, REVIEWING, ACTIONED, REJECTED)
    - action, adminMemo
    - duplicate policy: unique(reporterId, targetType, targetId)
  - AppVersion
    - platform (ios, android)
    - minimumVersion, forceUpdate, message
    - title, showButton, buttonText, buttonUrl
    - fallback policy: 저장 데이터가 없으면 `minimumVersion=1.0.0`, `forceUpdate=false`, `showButton=false`
  - LegalDocument
    - documentKey (`termsOfUse`, `privacyPolicy`)
    - title
    - banner(iconKey, title, tone, lines[])
    - sections[] (id, title, paragraphs[])
    - footerLines[]
    - isActive
    - 공개 API는 `isActive=true` 문서만 조회 가능, 비활성/미존재는 `404 LEGAL_DOCUMENT_NOT_FOUND`
    - 초기 2건은 1회성 seed migration으로 적재하고 이후에는 관리자 API로 수정
  - CafeteriaMenu
    - weekId, weekStart, weekEnd
    - menus: Map<date, Map<restaurant, items[]>>
    - menuEntries: Map<date, Map<category, entries[]>>
    - entry: id(weekId+category+title 기반 stable id), title, badges[] (code, label), likeCount, dislikeCount, myReaction
    - 조회 응답은 기존 `menus`를 유지하면서 `categories`, `menuEntries`를 함께 제공하고, `likeCount`/`dislikeCount`는 실제 사용자 반응 집계다.
    - 가격은 학식 API 계약에 포함하지 않는다.
    - 보조 태그는 관리자 입력 메타데이터로 저장하고, 관리자 요청의 `likeCount`/`dislikeCount`는 deprecated 입력으로만 남기며 저장 시 무시한다.
    - 같은 주 안에서 동일한 `category + title`이 여러 날짜에 반복되면 `badges`, `likeCount`, `dislikeCount`는 모두 동일해야 하며, badge 순서도 비교에 포함한다.
  - CafeteriaMenuReaction
    - PK: (memberId, menuId)
    - weekId, category, title, reaction(LIKE/DISLIKE)
    - 한 사용자당 한 주간 메뉴에 하나의 반응만 허용하고, `PUT /v1/cafeteria-menu-reactions/{menuId}`로 등록/전환/취소한다.
    - 메뉴 삭제 시 해당 주차 반응을 함께 제거하고, 메뉴 수정 시 현재 주차 메뉴 집합에 없는 반응 row는 정리한다.
  - AdminAuditLog
    - id, actorId, action, targetType, targetId
    - diffBefore (JSON snapshot), diffAfter (JSON snapshot), timestamp
    - 상태 변경 Admin API(`POST`, `PUT`, `PATCH`, `DELETE`)를 공통 interceptor/filter 계층에서 자동 기록
    - `targetId`는 UUID 외에 semester/platform/weekId 같은 운영 식별자도 허용

운영 공통 규약:
  - `/v1/admin/**`는 공통 인가 어노테이션(`@AdminApiAccess`)과 `ADMIN_REQUIRED` 표준 응답으로 보호
  - 문의/신고 목록은 `AdminPageRequestPolicy` 기준 `page=0`, `size=20`, `size<=100`, 정렬 `createdAt DESC`를 사용
  - CSV export와 자유 검색은 Phase 11에서 문서 규약만 정리하고 런타임 API는 추가하지 않음
  - 문의 첨부 이미지는 `POST /v1/images?context=INQUIRY_IMAGE` 업로드 결과 메타데이터를 그대로 재사용한다.

회원 탈퇴 연계 정책:
  - inquiry/report record는 운영 추적 목적상 보존
  - inquiry의 구조화 개인정보(`userEmail`, `userName`, `userRealname`, `userStudentId`)만 마스킹
  - inquiry 첨부 이미지 메타데이터와 업로드된 이미지는 탈퇴 후에도 보존
  - 자유서술 `content` 전체 자동 마스킹은 Phase 10 범위에서 제외
```

---

## 4. 도메인 간 관계

### 4.1 관계 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE                              │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │
│  │     Auth     │  │   Notification    │  │      WebSocket       │  │
│  │  (Security)  │  │  (FCM + Inbox)    │  │   (실시간 채팅)      │  │
│  └──────────────┘  └─────────▲─────────┘  └──────────▲───────────┘  │
│                              │ Domain Events          │              │
└──────────────────────────────┼────────────────────────┼──────────────┘
                               │                        │
┌──────────────────────────────┼────────────────────────┼──────────────┐
│                          DOMAIN LAYER                                │
│                              │                        │              │
│  ┌────────────┐         ┌────┴────────┐         ┌────┴────┐         │
│  │   Member   │◄────────│  TaxiParty  │────────►│   Chat  │         │
│  │            │         │             │  uses   │ (Engine)│         │
│  │ - 프로필   │         │ - 파티 관리 │         │         │         │
│  │ - 계좌     │         │ - 동승 요청 │         │ - 채팅방│         │
│  │ - 알림설정 │         │ - 정산      │         │ - 메시지│         │
│  └─────▲──────┘         │ - 파티채팅  │         └────▲────┘         │
│        │                │   (규칙)    │              │              │
│        │                └─────────────┘              │              │
│        │                                             │              │
│  ┌─────┴──────┐    ┌──────────┐    ┌────────────────┴───┐          │
│  │   Board    │    │  Notice  │    │      Academic      │          │
│  │            │    │          │    │                    │          │
│  │ - 게시글   │    │ - 공지   │    │ - 강의/시간표     │          │
│  │ - 댓글     │    │ - 댓글   │    │ - 학사일정        │          │
│  │ - 좋아요   │    │ - 앱공지 │    └────────────────────┘          │
│  └────────────┘    └──────────┘                                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                         Support                                 │ │
│  │     문의 / 신고 / 앱버전 / 학식메뉴                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 의존 관계 설명

| 관계 | 유형 | 설명 |
|------|------|------|
| 모든 도메인 → Member | 약결합 | userId/authorId 참조만, 필요시 조회 |
| TaxiParty → Chat | 사용 | 파티 채팅은 Chat 엔진 사용, 규칙은 TaxiParty에서 관리 |
| TaxiParty ↔ PartyChat | 강결합 | 파티 생성/종료 시 채팅방도 함께 생성/비활성화 |
| Board, Notice → Member | 약결합 | 작성자 참조만 |
| Academic, Support | 독립 | 공용 데이터, 다른 도메인과 직접 의존 없음 |

### 4.3 도메인 이벤트

| 도메인 | 이벤트 | 수신자 |
|--------|--------|--------|
| TaxiParty | PartyCreatedEvent | Notification (푸시) |
| TaxiParty | JoinRequestCreatedEvent | Notification |
| TaxiParty | JoinRequestAcceptedEvent | Notification |
| TaxiParty | JoinRequestDeclinedEvent | Notification |
| TaxiParty | PartyStatusChangedEvent | Notification |
| TaxiParty | SettlementCompletedEvent | Notification |
| TaxiParty | MemberKickedEvent | Notification |
| Chat | ChatMessageCreatedEvent | Notification |
| Board | PostLikedEvent | Notification |
| Board | CommentCreatedEvent | Notification |
| Notice | NoticeCreatedEvent | Notification |
| Notice | AppNoticeCreatedEvent | Notification |

---

## 5. 인프라 계층

### 5.1 인프라 구성 요소

| 인프라 | 현재 기술 | Spring 마이그레이션 |
|--------|----------|-------------------|
| **Auth** | Firebase Auth (Google Sign-In) | Spring Security + Firebase Admin SDK (ID Token 검증, SecurityContext 설정) |
| **Push** | FCM + Cloud Functions | FCM (Firebase Admin SDK) |
| **Notification** | userNotifications 컬렉션 + users.fcmTokens[] | `user_notifications` + `fcm_tokens` 테이블 + 이벤트 리스너 |
| **Storage** | Firebase Storage | `StorageRepository` 추상화 + LOCAL 파일시스템 기본 구현, FIREBASE provider 포함 후속 S3/OCI/GCS provider 확장 |
| **Realtime** | Firestore onSnapshot | SSE + WebSocket (STOMP over SockJS `/ws` + native `/ws-native`) |
| **Scheduler** | Cloud Functions onSchedule | Spring Scheduler / Quartz |
| **Audit** | adminAuditLogs 컬렉션 | Spring AOP + AuditLog 테이블 |

실시간 채널 분리 정책:
- SSE:
  - `/v1/sse/parties` (파티 목록/상태)
  - `/v1/sse/parties/{partyId}/join-requests` (파티 리더용 동승요청 목록/상태)
  - `/v1/sse/members/me/join-requests` (요청자 본인 동승요청 상태)
  - 알림, 게시물 목록/조회수
  - subscribe 시점의 초기 snapshot은 전용 read-only 서비스에서 DTO로 계산한 뒤 emitter에 전송하며, `spring.jpa.open-in-view=false`를 전제로 long-lived 연결과 JPA/커넥션 수명을 분리한다.
- WebSocket: 채팅(목록 요약 `/user/queue/chat-rooms`, 상세 메시지 `/topic/chat/{chatRoomId}`, 전송 `/app/chat/{chatRoomId}`)
  - 파티 멤버 변화(수락/탈퇴/강퇴)는 `chat_room_members`와 `chat_rooms.member_count`를 즉시 동기화한다.

### 5.2 Notification 인프라 상세

```
역할: 도메인 이벤트를 수신하여 사용자에게 알림 전달

구성요소:
  - UserNotification (인앱 알림 인박스)
  - FcmToken (멀티 디바이스 토큰 저장)
  - PushNotificationService (FCM 전송)
  - DomainEventNotificationListener (이벤트 수신)
  - NotificationSseService (실시간 알림/미읽음 수 SSE)
  - AcademicScheduleReminderScheduler (09:00 Asia/Seoul 리마인더 발행)

UserNotification 엔티티:
  - id, userId, type, title, message
  - data (JSON), isRead, readAt, createdAt

알림 타입:
  - PARTY_CREATED, PARTY_JOIN_REQUEST, PARTY_JOIN_ACCEPTED
  - PARTY_JOIN_DECLINED, PARTY_CLOSED, PARTY_ARRIVED
  - PARTY_ENDED, MEMBER_KICKED, SETTLEMENT_COMPLETED
  - CHAT_MESSAGE, POST_LIKED, COMMENT_CREATED
  - NOTICE, APP_NOTICE, ACADEMIC_SCHEDULE

정책 원칙:
  - Spring Notification 인프라는 현행 RN + Firebase Cloud Functions 운영 정책을 기본으로 이관한다.
  - 저장 모델은 Firestore가 아니라 MySQL `user_notifications`, `fcm_tokens`를 사용한다.
  - 상태 변경 성공 이후 `after-commit`으로 이벤트를 발행한다.
  - 인앱 저장 실패/푸시 실패는 핵심 비즈니스 트랜잭션을 롤백시키지 않는다.
  - 회원 탈퇴 시 `user_notifications`, `fcm_tokens`는 전량 삭제하고 회원 개인 SSE 연결도 종료한다.
  - Phase 8 런타임은 `allNotifications`를 마스터 토글로 정규화해 적용한다. 단, `AppNoticePriority.HIGH`와 파티 채팅 알림은 문서화된 예외 정책을 따른다.
  - FCM push payload는 특정 RN legacy type에 종속되지 않고, canonical `NotificationType` + 리소스 식별자(`partyId`, `noticeId` 등)를 사용한다.
  - 플랫폼별 알림 표현(sound/channel)은 `PushPresentationProfile`로 분리한다. 현재 `PARTY`, `CHAT`, `NOTICE`, `DEFAULT` 프로필을 사용한다.
  - 서버는 클라이언트 route/screen 이름을 payload에 넣지 않으며, 클라이언트가 `type + data`를 기준으로 이동 대상을 결정한다.

현행 운영 정책 기준:
  - `PARTY_CREATED`: 생성자 제외 전체 사용자 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 미생성
  - `PARTY_JOIN_REQUEST`: 파티 리더 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `PARTY_JOIN_ACCEPTED` / `PARTY_JOIN_DECLINED`: 요청자 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `PARTY_CLOSED`: 리더 제외 파티 멤버 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 미생성
  - `PARTY_ARRIVED`: 리더 제외 파티 멤버 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `SETTLEMENT_COMPLETED`: 파티 전체 멤버 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `MEMBER_KICKED`: 강퇴된 멤버 대상, 자진 이탈과 리더 제외, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `PARTY_ENDED`: 리더 제외 파티 멤버 대상, `allNotifications` + `partyNotifications` 반영, 인앱 인박스 생성
  - `CHAT_MESSAGE`(공개 채팅): 채팅방 멤버 대상, `allNotifications` + 채팅방 mute 반영, 인앱 인박스 미생성. 단, 멤버 입장/퇴장 `SYSTEM` 메시지는 push에서 제외
  - `CHAT_MESSAGE`(파티 채팅): 파티 멤버 대상, `TEXT`/`IMAGE`뿐 아니라 `ACCOUNT`/일반 `SYSTEM`/`ARRIVED`/`END`도 포함, 채팅 mute 중심 parity를 유지하고 전역 토글은 현재 미반영, 인앱 인박스 미생성, payload canonical 식별자는 `chatRoomId`. 단, 멤버 입장/퇴장 `SYSTEM` 메시지는 push에서 제외
  - `POST_LIKED`: 게시글 작성자 대상, 자기 좋아요 제외, `allNotifications` + `boardLikeNotifications` 반영, 인앱 인박스 생성
  - `COMMENT_CREATED`(게시글): 게시글 작성자, 부모 댓글 작성자, 게시글 북마크 사용자 대상, 자기 자신 제외, `allNotifications` + `commentNotifications` + `bookmarkedPostCommentNotifications` 반영, 중복 대상자는 1회 dedupe 후 인앱 인박스 생성
  - `COMMENT_CREATED`(공지): 현재 `Notice.author`는 문자열 필드만 있어 공지 작성자 식별이 불가능하므로, 부모 댓글 작성자 대상 답글 알림만 발송하며 `allNotifications` + `commentNotifications`를 반영
  - `NOTICE`: `allNotifications` + `noticeNotifications` + `noticeNotificationsDetail` 반영
  - `APP_NOTICE`: 일반 공지는 `allNotifications` + `systemNotifications` 반영, `AppNoticePriority.HIGH`는 설정 무시 강제 발송
  - `ACADEMIC_SCHEDULE`: `allNotifications` + `academicScheduleNotifications` 반영, 기본은 중요 일정(`isPrimary=true`)만 대상

Phase 8 댓글 알림 정책:
  - Board/Notice 공통 댓글 알림 설정은 `commentNotifications`를 사용한다.
  - `COMMENT_CREATED`(게시글)은 게시글 작성자/부모 댓글 작성자 외에도 "해당 게시글을 북마크한 사용자"를 수신 대상에 포함한다.
  - 게시글 북마크 기반 댓글 알림은 `bookmarkedPostCommentNotifications`로 분리한다.
  - 동일 사용자가 여러 수신 조건에 동시에 해당하면 푸시/인앱 인박스는 1회만 생성한다.

학사 일정 리마인더 정책:
  - 이벤트명: `AcademicScheduleReminder`
  - 기본 발송 시각: 오전 09:00 (Asia/Seoul)
  - 기본 대상: 중요 일정(`isPrimary = true`)
  - 사용자 옵션:
    - 전날 오전 09:00 추가
    - 모든 일정 대상 확장
  - 멀티데이 일정은 `startDate`를 기준으로 리마인더를 계산한다.
  - 구현 시 `NotificationSetting`은 최소 아래 설정을 추가한다:
    - `academicScheduleNotifications`
    - `academicScheduleDayBeforeEnabled`
    - `academicScheduleAllEventsEnabled`
```

---

## 6. 패키지 구조

> 현재 코드베이스(Phase 7 Support 구현 반영 시점) 기준 구조입니다.

```
com.skuri.skuri_backend
├── common
│   ├── config
│   ├── dto
│   ├── entity
│   └── exception
│
├── domain
│   ├── app
│   │   └── controller
│   │       └── AppNoticeController.java
│   │
│   ├── support
│   │   ├── controller
│   │   │   ├── AppVersionController.java
│   │   │   ├── LegalDocumentController.java
│   │   │   ├── InquiryController.java
│   │   │   ├── ReportController.java
│   │   │   ├── CafeteriaMenuController.java
│   │   │   ├── InquiryAdminController.java
│   │   │   ├── ReportAdminController.java
│   │   │   ├── AppVersionAdminController.java
│   │   │   ├── LegalDocumentAdminController.java
│   │   │   └── CafeteriaMenuAdminController.java
│   │   ├── dto
│   │   │   ├── request
│   │   │   └── response
│   │   ├── entity
│   │   ├── exception
│   │   ├── repository
│   │   └── service
│   │
│   ├── member
│   │   ├── controller
│   │   │   └── MemberController.java
│   │   ├── dto
│   │   │   ├── request
│   │   │   └── response
│   │   ├── entity
│   │   │   ├── Member.java
│   │   │   ├── LinkedAccount.java
│   │   │   ├── LinkedAccountProvider.java
│   │   │   ├── BankAccount.java
│   │   │   └── NotificationSetting.java
│   │   ├── exception
│   │   ├── repository
│   │   │   ├── MemberRepository.java
│   │   │   ├── MemberRepositoryCustom.java
│   │   │   ├── MemberRepositoryImpl.java
│   │   │   └── LinkedAccountRepository.java
│   │   └── service
│   │
│   ├── notification
│   │   ├── controller
│   │   ├── dto
│   │   │   ├── request
│   │   │   └── response
│   │   ├── entity
│   │   ├── event
│   │   ├── exception
│   │   ├── model
│   │   ├── repository
│   │   ├── scheduler
│   │   └── service
│   │
│   └── taxiparty
│       ├── controller
│       │   ├── PartyController.java
│       │   ├── JoinRequestController.java
│       │   └── PartySseController.java
│       ├── dto
│       │   ├── request
│       │   └── response
│       ├── entity
│       │   ├── Party.java
│       │   ├── PartyMember.java
│       │   ├── PartyTag.java
│       │   ├── MemberSettlement.java
│       │   └── JoinRequest.java
│       ├── exception
│       ├── repository
│       ├── scheduler
│       │   ├── PartySseHeartbeatScheduler.java
│       │   └── PartyTimeoutScheduler.java
│       └── service
│           ├── TaxiPartyService.java
│           ├── PartySseService.java
│           ├── JoinRequestSseService.java
│           ├── PartyTimeoutBatchService.java
│           └── PartyTimeoutCommandService.java
│
└── infra
	    └── auth
	        ├── config
	        │   ├── ApiAccessDeniedHandler.java
	        │   ├── ApiAuthenticationEntryPoint.java
	        │   ├── FirebaseAuthProperties.java
	        │   ├── SecurityConfig.java
	        │   ├── FirebaseConfig.java
	        │   ├── FirebaseCredentialsCondition.java
	        │   └── FirebaseAuthEnvironmentGuard.java
        └── firebase
            ├── AuthenticatedMember.java
            ├── AuthenticatedMemberSupport.java
            ├── DisabledFirebaseTokenVerifier.java
            ├── EmailDomainRestrictedException.java
            ├── FirebaseAdminTokenVerifier.java
            ├── FirebaseAuthenticationFilter.java
            ├── FirebaseTokenClaims.java
            ├── FirebaseTokenVerifier.java
            └── InvalidFirebaseTokenException.java
```

> `chat`, `board`, `notice`, `academic`, `support`, `notification` 패키지는
> 로드맵 Phase 2 이후 순차 구현 시 같은 `domain/*`, `infra/*` 규칙으로 확장한다.
>
> Phase 13에서는 아래 패키지를 추가한다.
>
> - `domain/minecraft`
>   - `controller`: public API, internal bridge API, public SSE, internal SSE
>   - `dto/request`, `dto/response`
>   - `entity`
>   - `exception`
>   - `repository`
>   - `service`

---

## 7. 핵심 엔티티 설계

### 7.1 Member 도메인

```java
@Entity
@Table(name = "members")
public class Member extends BaseTimeEntity {
    @Id
    private String id;  // Firebase UID 또는 자체 UUID

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "nickname")
    private String nickname;
    private String studentId;
    private String department;
    private String photoUrl;
    private String realname;
    private boolean isAdmin;

    @Enumerated(EnumType.STRING)
    private MemberStatus status; // ACTIVE, WITHDRAWN

    @Embedded
    private BankAccount bankAccount;

    @Embedded
    private NotificationSetting notificationSetting;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;
}

@Embeddable
public class BankAccount {
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private boolean hideName;
}

@Embeddable
public class NotificationSetting {
    private boolean allNotifications = true;
    private boolean partyNotifications = true;
    private boolean noticeNotifications = true;
    private boolean boardLikeNotifications = true;
    private boolean commentNotifications = true;
    private boolean bookmarkedPostCommentNotifications = true;
    private boolean systemNotifications = true;
    private boolean academicScheduleNotifications = true;
    private boolean academicScheduleDayBeforeEnabled = true;
    private boolean academicScheduleAllEventsEnabled = false;

    @Convert(converter = BooleanMapJsonConverter.class)
    @Column(columnDefinition = "JSON")
    private Map<String, Boolean> noticeNotificationsDetail;
}

@Entity
@Table(
    name = "linked_accounts",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_linked_account_member_provider", columnNames = {"member_id", "provider"})
    }
)
public class LinkedAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Enumerated(EnumType.STRING)
    private LinkedAccountProvider provider;  // GOOGLE, PASSWORD, UNKNOWN

    @Column(name = "provider_id")
    private String providerId;

    private String email;

    @Column(name = "provider_display_name")
    private String providerDisplayName;

    // 소셜 계정 프로필 이미지 (비소셜 로그인은 null)
    private String photoUrl;
}
```

### 7.2 TaxiParty 도메인

```java
@Entity
@Table(name = "parties")
public class Party extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String leaderId;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "name", column = @Column(name = "departure_name")),
        @AttributeOverride(name = "lat", column = @Column(name = "departure_lat")),
        @AttributeOverride(name = "lng", column = @Column(name = "departure_lng"))
    })
    private Location departure;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "name", column = @Column(name = "destination_name")),
        @AttributeOverride(name = "lat", column = @Column(name = "destination_lat")),
        @AttributeOverride(name = "lng", column = @Column(name = "destination_lng"))
    })
    private Location destination;

    private LocalDateTime departureTime;
    private int maxMembers;

    @ElementCollection
    @CollectionTable(name = "party_members", joinColumns = @JoinColumn(name = "party_id"))
    private List<PartyMember> members = new ArrayList<>();

    // PartyMember (Embeddable)
    // @Column(name = "member_id") String memberId;
    // @Column(name = "joined_at") LocalDateTime joinedAt;

    @ElementCollection
    @CollectionTable(name = "party_tags", joinColumns = @JoinColumn(name = "party_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    private String detail;

    @Enumerated(EnumType.STRING)
    private PartyStatus status = PartyStatus.OPEN;

    @Enumerated(EnumType.STRING)
    private EndReason endReason;

    private LocalDateTime endedAt;

    @Embedded
    private Settlement settlement;

    // === 비즈니스 메서드 ===

    public void close() {
        validateLeaderAction();
        this.status = PartyStatus.CLOSED;
    }

    public void arrive(int taxiFare) {
        validateLeaderAction();
        this.status = PartyStatus.ARRIVED;
        this.settlement = Settlement.create(taxiFare, this.members);
    }

    public void end(EndReason reason) {
        this.status = PartyStatus.ENDED;
        this.endReason = reason;
        this.endedAt = LocalDateTime.now();
    }

    public void addMember(String memberId) {
        if (this.members.size() >= this.maxMembers) {
            throw new PartyFullException();
        }
        this.members.add(memberId);
    }

    public void removeMember(String memberId) {
        this.members.remove(memberId);
    }

    public boolean isMember(String memberId) {
        return this.members.contains(memberId);
    }

    public boolean isLeader(String memberId) {
        return this.leaderId.equals(memberId);
    }
}

@Embeddable
public class Location {
    private String name;
    private Double lat;
    private Double lng;
}

public enum PartyStatus {
    OPEN, CLOSED, ARRIVED, ENDED
}

public enum EndReason {
    ARRIVED, FORCE_ENDED, CANCELLED, TIMEOUT, WITHDRAWED
}

// ⚠️ JPA 주의: @Embeddable 내부 @ElementCollection은 JPA 표준 비호환.
// Party 엔티티에서 직접 @ElementCollection으로 member_settlements를 관리하거나,
// Settlement를 별도 @Entity로 분리하는 방식으로 구현 시 변경 필요.
@Embeddable
public class Settlement {
    @Enumerated(EnumType.STRING)
    private SettlementStatus status = SettlementStatus.PENDING;

    private Integer perPersonAmount;

    @ElementCollection
    @CollectionTable(name = "member_settlements", joinColumns = @JoinColumn(name = "party_id"))
    @MapKeyColumn(name = "member_id")
    private Map<String, MemberSettlement> memberSettlements = new HashMap<>();

    // members: 리더를 제외한 멤버만 포함 (리더는 수금자이므로 정산 대상 아님)
    // 선행 조건: nonLeaderMembers.size() > 0 (API /arrive에서 NO_MEMBERS_TO_SETTLE로 사전 검증)
    public static Settlement create(int taxiFare, List<String> nonLeaderMembers) {
        if (nonLeaderMembers.isEmpty()) {
            throw new BusinessException(ErrorCode.NO_MEMBERS_TO_SETTLE);
        }
        Settlement settlement = new Settlement();
        settlement.perPersonAmount = taxiFare / nonLeaderMembers.size();
        settlement.status = SettlementStatus.PENDING;
        nonLeaderMembers.forEach(m -> settlement.memberSettlements.put(m, new MemberSettlement()));
        return settlement;
    }

    public void markSettled(String memberId) {
        MemberSettlement ms = memberSettlements.get(memberId);
        if (ms != null) {
            ms.markSettled();
        }
        checkAllSettled();
    }

    private void checkAllSettled() {
        boolean allSettled = memberSettlements.values().stream()
            .allMatch(MemberSettlement::isSettled);
        if (allSettled) {
            this.status = SettlementStatus.COMPLETED;
        }
    }
}

@Embeddable
public class MemberSettlement {
    private boolean settled = false;
    private LocalDateTime settledAt;

    public void markSettled() {
        this.settled = true;
        this.settledAt = LocalDateTime.now();
    }
}

@Entity
@Table(name = "join_requests")
public class JoinRequest extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String partyId;

    @Column(nullable = false)
    private String leaderId;

    @Column(nullable = false)
    private String requesterId;

    @Enumerated(EnumType.STRING)
    private JoinRequestStatus status = JoinRequestStatus.PENDING;

    public void accept() {
        validatePending();
        this.status = JoinRequestStatus.ACCEPTED;
    }

    public void decline() {
        validatePending();
        this.status = JoinRequestStatus.DECLINED;
    }

    public void cancel() {
        validatePending();
        this.status = JoinRequestStatus.CANCELED;
    }

    private void validatePending() {
        if (this.status != JoinRequestStatus.PENDING) {
            throw new AlreadyProcessedException();
        }
    }
}

public enum JoinRequestStatus {
    PENDING, ACCEPTED, DECLINED, CANCELED
}
```

### 7.3 Chat 도메인

```java
@Entity
@Table(name = "chat_rooms")
public class ChatRoom extends BaseTimeEntity {
    @Id
    private String id;

    private String name;

    @Enumerated(EnumType.STRING)
    private ChatRoomType type;

    private String department;
    private String description;
    private String createdBy;
    private boolean isPublic;
    private Integer maxMembers;

    // members는 chat_room_members 테이블의 별도 ChatRoomMember 엔티티로 관리
    // (lastReadAt, muted 필드가 필요하므로 @ElementCollection 대신 @OneToMany 사용)
    private int memberCount;
    private int messageCount;

    @Embedded
    private LastMessage lastMessage;

    // 팩토리 메서드
    public static ChatRoom forParty(String partyId) {
        ChatRoom room = new ChatRoom();
        room.id = "party:" + partyId;
        room.type = ChatRoomType.PARTY;
        room.isPublic = false;
        return room;
    }
}

// ChatRoomMember — chat_room_members 테이블 매핑
@Entity
@Table(name = "chat_room_members")
public class ChatRoomMember {
    @Id @GeneratedValue
    private Long id;

    private String chatRoomId;
    private String userId;
    private LocalDateTime joinedAt;
    private LocalDateTime lastReadAt;
    private boolean muted;
}

public enum ChatRoomType {
    UNIVERSITY, DEPARTMENT, GAME, CUSTOM, PARTY
}

@Embeddable
public class LastMessage {
    private MessageType type;
    private String text;
    private String senderId;
    private String senderName;
    private LocalDateTime createdAt;
}

@Entity
@Table(name = "chat_messages")
public class ChatMessage extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String chatRoomId;

    // 앱 사용자는 member id, Minecraft origin 메시지는 synthetic sender key 사용
    @Column(nullable = false)
    private String senderId;

    private String senderName;

    @Lob
    private String text;

    @Enumerated(EnumType.STRING)
    private MessageType type = MessageType.TEXT;

    // 파티 채팅 전용 (nullable)
    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "JSON")
    private AccountData accountData;

    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "JSON")
    private ArrivalData arrivalData;

    // Minecraft 연동용 (nullable)
    @Enumerated(EnumType.STRING)
    private MessageDirection direction;

    private String source;
    private String minecraftUuid;
}

public enum MessageType {
    TEXT, IMAGE, SYSTEM,
    ACCOUNT, ARRIVED, END  // 파티 채팅 전용
}

public enum MessageDirection {
    MC_TO_APP, APP_TO_MC, SYSTEM
}
```

### 7.4 Minecraft 도메인

```java
@Entity
@Table(name = "minecraft_accounts")
public class MinecraftAccount extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String ownerMemberId;

    private String parentAccountId;

    @Enumerated(EnumType.STRING)
    private MinecraftAccountRole accountRole; // SELF, FRIEND

    @Enumerated(EnumType.STRING)
    private MinecraftEdition edition; // JAVA, BEDROCK

    @Column(nullable = false)
    private String gameName;

    @Column(nullable = false, unique = true)
    private String normalizedKey; // uuid(without hyphen) or be:{normalized_name}

    @Column(nullable = false)
    private String avatarUuid;

    private LocalDateTime lastSeenAt;
}

@Entity
@Table(name = "minecraft_server_state")
public class MinecraftServerState {
    @Id
    private String serverKey; // skuri

    private boolean online;
    private int currentPlayers;
    private int maxPlayers;
    private String version;
    private String serverAddress;
    private String mapUrl;
    private LocalDateTime lastHeartbeatAt;
}

@Entity
@Table(name = "minecraft_online_players")
public class MinecraftOnlinePlayer extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String serverKey;
    private String normalizedKey;

    @Enumerated(EnumType.STRING)
    private MinecraftEdition edition;

    private String playerName;
    private String avatarUuid;
    private String minecraftAccountId;
    private boolean verified;
    private LocalDateTime joinedAt;
}

@Entity
@Table(name = "minecraft_bridge_events")
public class MinecraftBridgeEvent extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String eventId;

    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false, columnDefinition = "json")
    private String payload;

    private LocalDateTime expiresAt;
}
```

- `minecraft_inbound_events`는 plugin -> backend 채팅/시스템 메시지의 `eventId`를 claim하고 `chat_message_id`를 기록해 at-least-once 재시도 중복을 차단한다.
- 앱 공개 API는 계정/서버 상태/플레이어 목록 조회와 계정 등록/삭제를 담당한다.
- 플러그인 internal API는 채팅/시스템 메시지/서버 상태/온라인 플레이어 스냅샷을 수신한다.
- 플러그인 internal SSE는 앱 -> 마인크래프트 메시지와 whitelist snapshot/delta를 전달한다.
- 앱 채팅은 기존 Chat 도메인 STOMP를 재사용하되, `public:game:minecraft` room만 Minecraft bridge와 연결한다.
- plugin -> backend 메시지는 `eventId` 기반 idempotent 저장을 전제로 한다.
- bridge outbox는 `Last-Event-ID` 기반 replay를 지원하며, 같은 `createdAt` 충돌 시 `minecraft_bridge_events.id`를 tie-breaker로 사용해 whitelist/app message 유실을 막는다.

### 7.5 TaxiParty ↔ Chat 협력 구조

- 파티 생성 시 `ChatService.createPartyChatRoom`이 `party:{partyId}` 비공개 채팅방을 생성/동기화한다.
- 클라이언트 직접 전송 가능 타입은 `TEXT`, `IMAGE`, `ACCOUNT`만 허용한다.
- `ACCOUNT` 메시지는 클라이언트가 계좌 snapshot을 payload로 보내고, `remember=true`면 회원 프로필 계좌도 함께 갱신한다.
- `SYSTEM`, `ARRIVED`, `END`는 서버 전용 메시지다.
  - 동승 요청 승인, 모집 마감, 모집 재개, 멤버 나가기 → `SYSTEM` 메시지 생성
  - 도착 처리 → 정산 snapshot이 포함된 `ARRIVED` 메시지 생성
  - 리더 취소/종료/탈퇴 종료 → `END` 메시지 생성
- 위 서버 생성 메시지는 모두 `GET /v1/chat-rooms/{chatRoomId}/messages`와 `/topic/chat/{chatRoomId}`의 동일 계약으로 전달된다.
- 관리자 파티 상세는 `GET /v1/admin/parties/{partyId}/messages`로 party membership 없이 동일 메시지 page 계약을 조회한다.
- 파티 상태 변경과 서버 생성 채팅 메시지는 같은 트랜잭션 안에서 저장하고, WebSocket 브로드캐스트는 커밋 후 수행한다.

---

## 8. 마이그레이션 우선순위

### 8.1 단계별 마이그레이션 계획

| 순서 | 도메인 | 우선순위 | 이유 | 예상 복잡도 |
|------|--------|---------|------|------------|
| 1 | **Member** | 필수 | 모든 도메인의 기반, Auth와 함께 | 중 |
| 2 | **TaxiParty** | 필수 | 앱의 핵심 비즈니스 | 상 |
| 3 | **Chat** | 필수 | TaxiParty와 연동, WebSocket | 상 |
| 4 | **Minecraft** | 높음 | 기존 RTDB/Cloud Functions/플러그인을 Spring으로 흡수해야 함 | 상 |
| 5 | **Notice** | 높음 | 스케줄러(RSS) 포함, 독립적 | 중 |
| 6 | **Board** | 중간 | 비교적 단순한 CRUD | 중 |
| 7 | **Academic** | 낮음 | 읽기 위주, 낮은 복잡도 | 하 |
| 8 | **Support** | 낮음 | 관리 기능, 마지막 | 하 |

### 8.2 마이그레이션 체크리스트

- [x] **Phase 1: 기반 구축**
  - [x] Spring Boot 프로젝트 셋업
  - [x] MySQL 스키마 설계
  - [x] Spring Security + Firebase Admin SDK (ID Token 검증) 설정
  - [x] Member 도메인 구현
    - [x] Firebase ID Token 검증 필터/인증 컨텍스트 구성 (서버 토큰 발급 없음)
    - [x] `members.isAdmin` 기반 `ROLE_ADMIN` authority 부여 + `@PreAuthorize("hasRole('ADMIN')")` 적용
    - [x] 공개 API(`GET /v1/app-versions/**`, `GET /v1/app-notices/**`, `GET /v1/legal-documents/**`, `GET /v3/api-docs/**`, `GET /swagger-ui/**`, `GET /scalar/**`) permitAll
    - [x] 보호 API 미인증 요청 401, 이메일 도메인 불일치 403, 관리자 API 비권한 요청 `403 ADMIN_REQUIRED`

- [ ] **Phase 2: 핵심 비즈니스**
  - [x] TaxiParty 도메인 구현
  - [x] Chat 도메인 구현 (WebSocket)
  - [x] 도메인 이벤트 + Notification 인프라
  - [x] FCM 푸시 연동
  - [ ] Minecraft 도메인 구현 (public/internal API + bridge)

- [x] **Phase 3: 부가 기능**
  - [x] Notice 도메인 + RSS 크롤러
  - [x] Board 도메인 (무제한 depth 댓글, flat list 조회, 부모 삭제 정책 B 반영)
  - [x] Academic 도메인
  - [x] Support 도메인

- [ ] **Phase 4: 데이터 마이그레이션**
  - [ ] Firestore → MySQL 데이터 이관 스크립트
  - [ ] 점진적 트래픽 전환
  - [ ] Firebase Functions 비활성화

---

## 참고 문서

- 레거시 Firestore 데이터 구조: 프론트 레포 `docs/references/legacy/firestore-data-structure.md`
- 현재 API 계약: `api-specification.md`
- [역할 정의](./role-definition.md)
- 마인크래프트 상세 설계/이력: 백엔드 레포 `docs/minecraft-spring-migration-plan.md`

---

> **문서 이력**
> - 2026-04-06: Admin Chat read API 반영 — 관리자 공개 채팅방 목록/상세/메시지 조회와 관리자 파티 채팅 메시지 조회 책임, membership 우회 범위를 Chat/TaxiParty 협력 규칙에 추가
> - 2026-03-30: Minecraft 도메인 분석 추가 — 별도 도메인 분리 결정, public/internal API, whitelist/서버 상태/bridge outbox 설계를 반영
> - 2026-02-03: 초안 작성 (도메인 분석 완료)
> - 2026-03-05: Board 도메인 구현 반영 — 댓글 depth 1 제한, 부모 placeholder soft delete 정책(B), 내 게시글/북마크 조회 책임 추가
> - 2026-03-07: Board/Notice 공통 Comment 정책 구현 반영 — 무제한 depth, flat list 응답, 댓글 알림 설정 분리
> - 2026-03-08: Phase 8 Notification 인프라 반영 — RDB 저장 모델(`user_notifications`, `fcm_tokens`), after-commit 이벤트, 학사 일정 알림 설정, `PARTY_*` canonical enum 동기화
> - 2026-03-09: Phase 10 Member 라이프사이클 반영 — soft delete tombstone, 동일 UID 재가입 차단, TaxiParty/Chat/Board/Notice/Support/Notification/Academic 탈퇴 정합성 정책 추가
> - 2026-03-10: Phase 11 Admin 공통 인프라 반영 — `AdminAuditLog` 엔티티를 `actorId/action/targetType/targetId/diffBefore/diffAfter/timestamp` 구조로 구체화하고, Support 운영 목록/인가 공통 규약을 반영
> - 2026-03-25: Notice 북마크 구현 반영 — `NoticeBookmark` 저장 모델, 내 북마크 공지 목록 naming parity(`rssPreview`, `postedAt`), withdrawal cleanup 정책 추가
> - 2026-03-29: Member Admin API review fix — self role change 금지와 admin-role 감사 로그 최소 snapshot 정책을 Member 도메인 설명에 반영하고, 관리자 상세 응답의 `bankAccount` 유지 계약을 명시
> - 2026-03-29: TaxiParty Admin P1 반영 — 관리자 파티 목록/상세/상태 변경 API와 검색 기준, 상태 전이 재사용 정책, 최소 감사 snapshot 범위를 TaxiParty 도메인 설명에 반영
> - 2026-03-29: TaxiParty Admin follow-up 반영 — 관리자 멤버 제거/시스템 메시지/pending join request 조회와 leader 제거 금지, 관리자 시스템 메시지 sender semantics, pending 최신순 조회 규칙을 반영
