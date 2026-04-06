# SKURI 백엔드 구현 로드맵

> 최종 수정일: 2026-04-02
> 관련 문서: [도메인 분석](./domain-analysis.md) | [ERD](./erd.md) | [API 명세](./api-specification.md) | [기술 전략](./tech-strategy.md) | [역할 정의](./role-definition.md) | [Member 탈퇴 정책](./member-withdrawal-policy.md)
> 보조 참고: 채팅 Firestore → MySQL 이관 참고는 백엔드 레포 `docs/chat-firestore-to-mysql-migration-reference.md`, 마인크래프트 상세 설계/이력은 백엔드 레포 `docs/minecraft-spring-migration-plan.md`

---

## 1. 현재 상태

| 항목 | 상태 |
|------|------|
| Spring Boot | 4.0.3 |
| Java | 21 |
| 빌드 도구 | Gradle |
| 현재 의존성 | JPA, Web MVC, Validation, Security, Firebase Admin, Springdoc OpenAPI(Swagger UI/Scalar), Thumbnailator, TwelveMonkeys WebP, Lombok, MySQL Connector |
| 구현 상태 | Phase 0 완료 (공통 기반 구축), Phase 1 완료, Phase 2 완료 (TaxiParty + SSE 반영), Phase 3 완료 (Chat + WebSocket 반영), Phase 4 완료 (Board 반영), Phase 5 완료 (Notice + AppNotice + 공통 Comment 정책 반영), Phase 6 완료 (Academic + 시간표/학사일정/관리자 강의 bulk 반영), Phase 7 완료 (Support + 문의/신고/앱 버전/학식 운영 API 반영), Phase 8 완료 (Notification 인프라), Phase 9 완료 (인프라/배포 기준 정리), Phase 10 완료 (Member 탈퇴/계정 라이프사이클), Phase 11 완료 (운영 공통 인프라 / Admin 공통), Phase 12 완료 (이미지/미디어 업로드 인프라 1차), Phase 13 완료 (마인크래프트 public/internal API + public SSE + bridge outbox + 앱 연동 반영) |

---

## 1.1 문서 동기화 및 데이터 마이그레이션 운영 규칙

- `docs/` 아래의 공유 계약 문서(`api-specification.md`, `domain-analysis.md`, `erd.md`, `implementation-roadmap.md`, `role-definition.md`)는 백엔드 레포 최신본을 기준으로 유지하고, 프론트 레포 대응 문서에도 즉시 동일 내용으로 동기화한다.
- 채팅 Firestore → MySQL 이관 참고사항은 백엔드 레포 `docs/chat-firestore-to-mysql-migration-reference.md`에 누적 관리한다.
- 데이터 마이그레이션 관련 신규 발견사항(컬렉션 구조, ID 매핑, seed 충돌 가능성, 요약 필드 재계산 규칙 등)이 생기면 위 참고 문서를 먼저 갱신하고, 필요 시 `api-specification.md`, `domain-analysis.md`, `erd.md`에도 함께 반영한다.
- Firebase/RTDB export -> MySQL 적재는 `infra/migration`의 스프링 1회성 배치 러너로 수행한다. 공지 이관은 `plan=NOTICES`, 사용자/시간표/마인크래프트 컷오버는 `plan=CUTOVER`를 사용하며, 둘 다 운영 app 컨테이너와 분리된 별도 실행을 기본으로 한다.
- 운영에서 migration을 실행할 때는 `migration.enabled=true`, `spring.main.web-application-type=none`을 사용해 웹 서버를 띄우지 않고 종료형 배치로 돌린다. 공지 스케줄러와 충돌 가능성이 있는 시간대에는 `NOTICE_SYNC_SCHEDULER_ENABLED=false`로 잠시 비활성화한 뒤 dry-run/apply를 순차 실행한다.
- cutover 시간표 이관은 live MySQL `courses`에 존재하는 학기만 관리 대상으로 본다. live MySQL에 없는 학기(예: 새 DB에서 관리하지 않는 이전 학기)와 users export에 없는 `userId`의 시간표는 적재하지 않고 `timetable-skips.json`으로만 남긴다.
- 프론트/백엔드 구현 에이전트의 최종 보고에는 “상대 레포의 동일 문서를 바로 동기화하라”는 문구를 반드시 포함한다.

## 1.2 완료 작업: OpenAPI Show Schema 전수 보강

- 전체 REST 성공 응답 중 `2xx + application/json`이며 `ApiResponse<T>`의 `T`가 DTO/List/PageResponse인 API에 대해 `Scalar Show schema`가 concrete `data` 타입을 노출하도록 전수 보강했다.
- `useReturnTypeSchema` 대신 도메인별 OpenAPI wrapper schema(`OpenApi*Schemas`)를 사용해 `Show schema` 품질을 고정했다.
- 예외 대상은 기존 정책대로 `ApiResponse<Void>`, `204`, SSE로 유지한다.
- `/v3/api-docs` 전수 회귀 테스트를 추가해 대상 성공 응답이 다시 generic `data`로 후퇴하지 않도록 검증한다.

## 1.3 완료 작업: Board Admin moderation P1

- 관리자 게시글/댓글 운영 P1 계약을 추가했다.
  - `GET /v1/admin/posts`
  - `GET /v1/admin/posts/{postId}`
  - `PATCH /v1/admin/posts/{postId}/moderation`
  - `GET /v1/admin/comments`
  - `PATCH /v1/admin/comments/{commentId}/moderation`
- moderation 상태는 `VISIBLE`, `HIDDEN`, `DELETED`를 지원한다.
- 내부 표현은 Board 기존 soft delete 규칙을 유지하면서 `is_hidden` visibility 플래그를 최소 확장해 구현한다.
  - `DELETED`: 기존 soft delete 재사용 (`posts.is_deleted=true`, `comments`는 placeholder soft delete)
  - `HIDDEN`: hard delete 없이 관리자 visibility 차단
- public board 조회는 `HIDDEN` 게시글을 제외하고, `HIDDEN` 댓글은 thread 구조 유지를 위해 placeholder로 노출한다.
- 관리자 write API 2개는 `@AdminAudit` 대상으로 포함하고, snapshot은 moderation 판단에 필요한 최소 필드만 남긴다.

---

## 2. 구현 순서 총괄

```
Phase 0: 프로젝트 기반 구축
    ↓
Phase 1: Member 도메인 (인증 + 회원)
    ↓
Phase 2: TaxiParty 도메인 (핵심 비즈니스)
    ↓
Phase 3: Chat 도메인 (WebSocket 채팅 엔진)
    ↓
Phase 4: Board 도메인 (커뮤니티 게시판)
    ↓
Phase 5: Notice 도메인 (공지 + RSS 크롤러)
    ↓
Phase 6: Academic 도메인 (학사 정보)
    ↓
Phase 7: Support 도메인 (문의/신고/운영)
    ↓
Phase 8: Notification 인프라 (이벤트 기반 알림)
    ↓
Phase 9: 인프라 및 배포
    ↓
Phase 10: Member 탈퇴/계정 라이프사이클
    ↓
Phase 11: 운영 공통 인프라 (Admin 공통)
    ↓
Phase 12: 이미지/미디어 업로드 인프라
    ↓
Phase 13: 마인크래프트 Spring 전환
```

---

## 3. Phase 상세

---

### Phase 0: 프로젝트 기반 구축

> 모든 도메인의 공통 기반을 먼저 구축한다.

#### 0-1. 추가 의존성

| 의존성 | 용도 |
|--------|------|
| `spring-boot-starter-validation` | Bean Validation (`@Valid`, `@NotBlank` 등) - 적용 완료 |
| `spring-boot-starter-security` | Spring Security (인증/인가 필터 체인) - Phase 1에서 추가 |
| `firebase-admin` | Firebase Admin SDK (ID Token 검증, FCM 발송) - Phase 1에서 추가 |
| `springdoc-openapi-starter-webmvc-ui` | OpenAPI 스펙 + Swagger UI 자동 노출 |
| `springdoc-openapi-starter-webmvc-scalar` | Scalar API 문서 UI 자동 노출 |

#### 0-2. 패키지 구조 생성 (Phase 0 범위)

```
com.skuri.skuri_backend
├── common/
│   ├── entity/
│   │   └── BaseTimeEntity.java
│   ├── dto/
│   │   └── ApiResponse.java
│   │   └── PageResponse.java
│   ├── exception/
│   │   ├── ErrorCode.java              (enum)
│   │   ├── BusinessException.java
│   │   └── GlobalExceptionHandler.java
│   └── config/
│       └── JpaAuditingConfig.java
└── SkuriBackendApplication.java
```

> `domain/`, `infra/` 패키지는 각 Phase 구현 시점에 순차적으로 생성한다.

#### 0-3. 구현 항목

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 1 | BaseTimeEntity | `common/entity/BaseTimeEntity.java` | `createdAt`, `updatedAt` 자동 관리 (`@MappedSuperclass` + JPA Auditing) |
| 2 | JPA Auditing 설정 | `common/config/JpaAuditingConfig.java` | `@EnableJpaAuditing` |
| 3 | ApiResponse | `common/dto/ApiResponse.java` | 공통 응답 래퍼 (`success`, `data`, `message`) |
| 4 | PageResponse | `common/dto/PageResponse.java` | 페이지네이션 응답 (`content`, `page`, `size`, `totalElements`, `hasNext`) |
| 5 | ErrorCode | `common/exception/ErrorCode.java` | 에러 코드 enum (`UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT` 등) |
| 6 | BusinessException | `common/exception/BusinessException.java` | 비즈니스 예외 기본 클래스 |
| 7 | GlobalExceptionHandler | `common/exception/GlobalExceptionHandler.java` | `@RestControllerAdvice` 글로벌 예외 처리 |
| 8 | application.yml | `resources/application.yml` | MySQL, JPA, 서버 설정 |

#### 0-4. 완료 기준

- [x] 빌드 성공 (`./gradlew build`)
- [x] 애플리케이션 정상 기동
- [x] 존재하지 않는 API 호출 시 `ApiResponse` 형태의 에러 응답 반환

#### 0-5. OpenAPI 문서화 고정 규칙

- 모든 REST 엔드포인트는 선언한 responseCode마다 `@ApiResponse`의 `content + examples`를 제공한다.
- `@ApiResponse`의 description-only 선언을 금지한다. (Scalar/Swagger 상태코드별 예시 혼선 방지)
- 공통 에러 코드(`401/403/404/409/422/500`) 예시는 공통 상수/컴포넌트로 재사용한다.
- 하나의 상태코드에 여러 비즈니스 에러코드가 매핑되면 `@ExampleObject`를 복수로 선언해 에러코드별 예시를 분리한다.
- `CONFLICT/NOT_FOUND/FORBIDDEN` 같은 포괄 예시는 최소화하고, 가능한 경우 도메인별 실제 `errorCode/message` 예시를 우선한다.
- SSE(`text/event-stream`)는 이벤트 스트림 예시를 별도로 제공하고, 에러 응답은 `application/json` 예시를 제공한다.
- SSE `200` 문서화는 `stream_full`(연속 스트림 흐름)과 이벤트별 단건 예시(`SNAPSHOT`, `HEARTBEAT`, 도메인 이벤트)를 함께 제공한다.
- SSE 이벤트별 예시는 런타임 발행 이벤트(`SseEmitter.event().name(...)`)와 payload 구조를 그대로 반영한다.
- 머지 전 `/v3/api-docs` 기준으로 responseCode별 example 누락이 없는지 자동 검증한다.
- 머지 전 Scalar에서 대표 API를 열어 200/4xx 탭의 예시가 동일하게 보이지 않는지 수동 확인한다.

#### 0-6. OpenAPI 예시 상수 구조 규칙

- OpenAPI 예시 상수는 단일 파일 집중을 피하고 도메인별 파일로 분리 유지한다.
  - 예: `infra/openapi/OpenApiCommonExamples.java`, `OpenApiMemberExamples.java`, `OpenApiTaxiPartyExamples.java`
- 신규 도메인 API를 추가할 때 해당 도메인 예시 상수 파일을 함께 추가/갱신한다.
- Service/Entity 예외 규칙(`BusinessException`, `ErrorCode`) 변경 시 예시 상수와 Controller `@ApiResponses`를 동일 PR에서 동기화한다.
- 커스텀 예외 메시지를 사용하는 경우, 예시 메시지도 실제 런타임 메시지와 동일하게 유지한다.

#### 0-7. 계약/보안/범위 운영 정책

- API 계약의 런타임 기준은 `/v3/api-docs`로 고정하고, `docs/api-specification.md`는 같은 PR에서 반드시 동기화한다.
- WebSocket은 CONNECT 인증만으로 종료하지 않고 목적지(`SEND /app/chat/{chatRoomId}`, `SUBSCRIBE /topic/chat/{chatRoomId}`)별 인가를 서버에서 강제한다.
- 브라우저 REST API CORS와 WebSocket CORS는 `*`를 금지하고, 프로필/환경별 허용 Origin(`API_ALLOWED_ORIGIN_PATTERNS`, `CHAT_WS_ALLOWED_ORIGIN_PATTERNS`)을 명시한다.
- 요청 범위 외 수정은 별도 PR 분리를 원칙으로 하며, 불가피하게 포함할 경우 PR에 근거와 영향 범위를 명시한다.

---

### Phase 1: Member 도메인

> 모든 도메인의 기반. Firebase ID Token 검증 + 회원 관리.

#### 1-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Member` | `members` | 회원 기본 정보 + `BankAccount`(Embedded) + `NotificationSetting`(Embedded) |
| `LinkedAccount` | `linked_accounts` | 로그인 계정 연결 (`GOOGLE`/`PASSWORD`/`UNKNOWN`, 비소셜 provider 부가정보는 null 저장) |

#### 1-2. 인프라 (Auth)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 1 | Firebase 초기화 | `infra/auth/config/FirebaseConfig.java` | Firebase Admin SDK 초기화 (`@Bean FirebaseApp`) |
| 2 | Token 검증 | `infra/auth/firebase/FirebaseTokenVerifier.java` | `FirebaseAuth.verifyIdToken()` 래핑 |
| 3 | 인증 필터 | `infra/auth/firebase/FirebaseAuthenticationFilter.java` | `OncePerRequestFilter` — ID Token 추출, 검증, SecurityContext 설정 |
| 4 | Security 설정 | `infra/auth/config/SecurityConfig.java` | 필터 체인 (`/v1/app-versions/**`, `/v1/app-notices/**`, `/v1/legal-documents/**` permitAll, 나머지 인증 필수) |
| 5 | OpenAPI 설정 | `infra/openapi/OpenApiConfig.java` | 전역 API 메타데이터, Bearer 보안 스키마, GroupedOpenApi 설정 |
| 6 | Emulator 가드 | `infra/auth/config/FirebaseAuthEnvironmentGuard.java` | `local-emulator` 전용 허용 + emulator host 오염 차단 |

#### 1-3. API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/v1/members` | 회원 가입 (ID Token에서 정보 추출, 멱등) |
| `GET` | `/v1/members/me` | 내 프로필 조회 (lastLogin 갱신) |
| `PATCH` | `/v1/members/me` | 프로필 부분 수정 (닉네임, 학번, 학과, photoUrl) |
| `DELETE` | `/v1/members/me/photo` | 프로필 사진 제거 (본인 소유 member-scoped PROFILE_IMAGE면 storage 원본/썸네일 정리) |
| `PUT` | `/v1/members/me/bank-account` | 계좌 정보 수정 |
| `PATCH` | `/v1/members/me/notification-settings` | 알림 설정 부분 수정 |
| `GET` | `/v1/members/{id}` | 특정 회원 공개 프로필 조회 |
| `GET` | `/v1/admin/members` | 관리자 회원 목록 조회 (검색/필터/페이지네이션) |
| `GET` | `/v1/admin/members/{memberId}` | 관리자 회원 상세 조회 |
| `GET` | `/v1/admin/members/{memberId}/activity` | 관리자 회원 활동 요약 조회 |
| `PATCH` | `/v1/admin/members/{memberId}/admin-role` | 관리자 권한 부여/회수 |

#### 1-4. 완료 기준

- [x] Firebase ID Token으로 인증 성공/실패 동작
- [x] `@sungkyul.ac.kr` 이메일 도메인 제한 동작
- [x] 회원 가입 → 프로필 조회 → 프로필 수정 플로우 동작
- [x] 인증 없이 보호된 API 호출 시 401 반환
- [x] OpenAPI JSON(`/v3/api-docs`) + Swagger UI + Scalar 노출
- [x] `local-emulator` 프로필에서만 Auth Emulator 사용 가능하고, 다른 프로필에서 emulator host 사용 시 기동 차단

---

### Phase 2: TaxiParty 도메인

> 앱의 핵심 비즈니스. 상태 머신, 동시성 제어, 정산 로직.

#### 2-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Party` | `parties` | 파티 정보 + `Location`(Embedded) + `Settlement`(Embedded) |
| `PartyMember` | `party_members` | 파티 멤버 (N:M) |
| `PartyTag` | `party_tags` | 파티 태그 |
| `MemberSettlement` | `member_settlements` | 멤버별 정산 상태 |
| `JoinRequest` | `join_requests` | 동승 요청 |

#### 2-2. 핵심 비즈니스 로직

| 로직 | 설명 |
|------|------|
| 파티 상태 머신 | `OPEN → CLOSED → ARRIVED → ENDED` 전이 규칙 |
| 파티 수정 정책 | `PATCH /v1/parties/{id}`는 `departureTime`, `detail`만 허용 (리더, OPEN/CLOSED) |
| 정원 자동 마감 | 동승 요청 수락 후 `currentMembers == maxMembers` 시 자동 `CLOSED` 전이 |
| 동시성 제어 | Optimistic Lock (`@Version`) — 동시 동승 신청 방어 |
| Aggregate 저장 정책 | `PartyMember/PartyTag/MemberSettlement`는 `Party` aggregate(cascade/orphanRemoval)로 일괄 저장 |
| 정산 | 도착 시 택시비 입력 → 인원수 자동 나눔(정수 나눗셈/버림) → 멤버별 정산 확인 → 전체 완료 시 정산 상태 `COMPLETED` (파티 종료는 `/end`에서만) |
| 자동 종료 | `@Scheduled` 4시간마다 — 12시간 초과 파티 자동 `ENDED` (endReason=TIMEOUT) |
| 권한 분리 | 파티 리더만: 마감/재개/도착/정산/강퇴/종료/취소, 요청자만: 요청 취소 |
| 관리자 운영 | `/v1/admin/parties*`는 목록/상세/상태 변경과 후속 운영 API(멤버 제거/시스템 메시지/pending join request 조회)를 제공한다. 상태 변경은 기존 entity 전이(`close/reopen/cancel/forceEnd`)만 재사용하고, 멤버 제거는 leader를 제외한 일반 멤버에만 허용한다. |
| SSE 이벤트 정책 | 강퇴(`KICKED`) 이벤트는 강퇴 당사자를 포함한 기존 파티 멤버에게 전송 |

#### 2-3. API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/v1/parties` | 파티 생성 |
| `GET` | `/v1/parties` | 파티 목록 조회 (status, 출발지/도착지 필터) |
| `GET` | `/v1/parties/{id}` | 파티 상세 조회 |
| `PATCH` | `/v1/parties/{id}` | 파티 수정 (출발시각/상세, 리더) |
| `PATCH` | `/v1/parties/{id}/close` | 모집 마감 (리더) |
| `PATCH` | `/v1/parties/{id}/reopen` | 모집 재개 (리더) |
| `PATCH` | `/v1/parties/{id}/arrive` | 도착 처리 + 정산 시작 (리더) |
| `PATCH` | `/v1/parties/{id}/end` | 파티 강제 종료 (리더) |
| `POST` | `/v1/parties/{id}/cancel` | 파티 취소 (리더) |
| `DELETE` | `/v1/parties/{id}/members/{memberId}` | 멤버 강퇴 (리더) |
| `DELETE` | `/v1/parties/{id}/members/me` | 파티 탈퇴 (본인) |
| `POST` | `/v1/parties/{partyId}/join-requests` | 동승 요청 |
| `PATCH` | `/v1/join-requests/{id}/accept` | 요청 수락 (리더) |
| `PATCH` | `/v1/join-requests/{id}/decline` | 요청 거절 (리더) |
| `PATCH` | `/v1/join-requests/{id}/cancel` | 요청 취소 (요청자) |
| `GET` | `/v1/parties/{partyId}/join-requests` | 파티 요청 목록 (리더) |
| `GET` | `/v1/members/me/join-requests` | 내 요청 목록 |
| `PATCH` | `/v1/parties/{id}/settlement/members/{memberId}/confirm` | 개별 정산 확인 (리더) |
| `GET` | `/v1/members/me/parties` | 내 파티 목록 |
| `GET` | `/v1/members/me/taxi-history` | 택시 이용 내역 목록 (MyScreen / TaxiHistoryScreen 전용) |
| `GET` | `/v1/members/me/taxi-history/summary` | 택시 이용 내역 요약 (완료 횟수/절약 금액) |
| `GET` | `/v1/sse/parties` | 파티 목록/상태 실시간 구독 (SSE) |
| `GET` | `/v1/sse/parties/{partyId}/join-requests` | 특정 파티 동승 요청 실시간 구독 (SSE, 리더 전용) |
| `GET` | `/v1/sse/members/me/join-requests` | 내 동승 요청 상태 실시간 구독 (SSE) |
| `GET` | `/v1/admin/parties` | 관리자 파티 목록 조회 (status/departureDate/query/page/size, 기본 정렬 `departureTime DESC`) |
| `GET` | `/v1/admin/parties/{partyId}` | 관리자 파티 상세 조회 (leader/members/pendingJoinRequestCount/settlement/chatRoom 메타 포함) |
| `PATCH` | `/v1/admin/parties/{partyId}/status` | 관리자 파티 상태 변경 (`CLOSE`, `REOPEN`, `CANCEL`, `END`) |
| `DELETE` | `/v1/admin/parties/{partyId}/members/{memberId}` | 관리자 파티 멤버 제거 (leader 제외, `ARRIVED`/`ENDED` 불가) |
| `POST` | `/v1/admin/parties/{partyId}/messages/system` | 관리자 파티 시스템 메시지 전송 (`senderName=관리자`, `senderPhotoUrl=null`) |
| `GET` | `/v1/admin/parties/{partyId}/join-requests` | 관리자 pending join request 목록 조회 (최신 요청순) |

#### 2-4. 완료 기준

- [x] 파티 생성 → 동승 요청 → 수락 → 마감 → 도착 → 정산 → 종료 전체 플로우 동작
- [x] 상태 머신 규칙 위반 시 적절한 에러 반환
- [x] Optimistic Lock으로 동시 요청 방어
- [x] 파티 자동 종료 스케줄러 동작
- [x] `/v1/sse/parties` 연결 + heartbeat + SNAPSHOT/변경 이벤트 전송 동작
- [x] 동승 요청 SSE 2종(`/v1/sse/parties/{partyId}/join-requests`, `/v1/sse/members/me/join-requests`) 연결 + snapshot/변경 이벤트 전송 동작

#### 2-5. 운영 모니터링 기준 (확정)

| 항목 | 수집 지표 | Warning | Critical |
|------|-----------|---------|----------|
| API 동시성 충돌 | `PARTY_CONCURRENT_MODIFICATION` 응답 건수(10분) + TaxiParty 변경 API 대비 비율 | 10분 5건 초과 또는 2% 초과 | 10분 20건 초과 또는 10% 초과 |
| 스케줄러 충돌률 | `conflicted/target` (배치 1회 기준) | `target >= 10` 이고 20% 이상 | 40% 이상 |
| 스케줄러 처리 실패 | `target > 0`인데 `ended = 0` 연속 횟수 | 2회 연속 | 3회 연속 |
| 스케줄러 미실행 | 최근 배치 실행 로그 기준 | - | 5시간 이상 실행 로그 없음 |
| SSE SNAPSHOT 지연 | `/v1/sse/parties`, `/v1/sse/parties/{partyId}/join-requests`, `/v1/sse/members/me/join-requests` SNAPSHOT 생성 시간(p95) | 500ms 초과 | 1s 초과 |
| SSE 활성 연결 수 | 인스턴스별 party/join-request SSE 동시 연결 수 합계 | 500 초과 | 1,000 초과 |
| JoinRequest SSE 전송 실패율 | 5분 윈도우 `failed/total` (eventType별 집계 로그) | 5% 초과 | 10% 초과 |

운영 목표(SLO):
- TaxiParty 변경 API 대비 동시성 충돌 비율 월 평균 1% 미만 유지
- timeout 배치 처리 성공률(`ended/target`) 월 평균 95% 이상 유지

운영/감사 로그 정책:
- Phase 2에서는 파티 수정 감사 로그를 별도 저장하지 않음
- 사용자 활동 로그 도메인 도입 시 수정 이력 로깅을 확장 예정

SSE 운영 제약:
- 현재 구현은 인스턴스 메모리(`ConcurrentHashMap`) 기반 구독 관리(단일 인스턴스 전제)
- SSE subscribe 경로는 전용 read-only snapshot 서비스에서 DTO payload를 먼저 계산한 뒤 `SseEmitter`를 생성/등록한다. `spring.jpa.open-in-view=false`를 공통으로 강제해 long-lived SSE 요청이 JDBC connection을 요청 수명 동안 붙잡지 않게 유지한다.
- JDBC connection 진단은 Hikari `connection-timeout`(기본 30초) + `leak-detection-threshold`(기본 20초, `DB_LEAK_DETECTION_THRESHOLD_MS` override 가능)를 source of truth로 사용한다.
- 수평 확장 시 Redis Pub/Sub 또는 메시지 브로커 기반 fan-out 구조로 전환 필요

#### 2-6. 테스트 구현 기준 (고정 규칙)

- API 추가/수정 시 Contract 테스트를 엔드포인트 단위로 추가한다.
  - 최소: 정상 1, 인증/권한 1, 검증/비즈니스 예외 1
- 상태 전이/권한/정산/동시성 로직 변경 시 Service 테스트를 추가한다.
  - 최소: 성공 1, 실패 1
- 응답 스키마 변경 시 필드 존재/미노출 조건을 Contract 테스트로 검증한다.
- OpenAPI 응답 예시를 수정한 경우, 상태코드별 `errorCode/message` 정합성(명세/실응답/문서)을 함께 검증한다.
- 머지 전 검증 명령은 `./gradlew build`를 기준으로 한다. (테스트는 `application-test.yaml` 사용)

#### 2-7. 후속 확장 구현 완료 내역 (동승 요청 SSE)

- [x] `/v1/sse/parties/{partyId}/join-requests` 구현 (리더 화면: 요청 목록 실시간 갱신)
- [x] `/v1/sse/members/me/join-requests` 구현 (요청자 화면: 수락/거절/취소 상태 실시간 갱신)
- [x] 이벤트 계약 확정: `JOIN_REQUEST_CREATED`, `JOIN_REQUEST_UPDATED`, `MY_JOIN_REQUEST_CREATED`, `MY_JOIN_REQUEST_UPDATED`, `SNAPSHOT`, `HEARTBEAT`
- [x] 권한 규칙 확정: 파티별 구독은 리더만 허용(`NOT_PARTY_LEADER`), 내 요청 구독은 본인만 허용

---

### Phase 3: Chat 도메인

> 공개 채팅방 + 파티 채팅 엔진. WebSocket(STOMP) 기반 실시간 통신.

#### 3-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `ChatRoom` | `chat_rooms` | 채팅방 (UNIVERSITY, DEPARTMENT, GAME, CUSTOM, PARTY) |
| `ChatMessage` | `chat_messages` | 채팅 메시지 (TEXT, IMAGE, SYSTEM, ACCOUNT, ARRIVED, END) |
| `ChatRoomMember` | `chat_room_members` | 채팅방 멤버 (lastReadAt, muted) |

#### 3-2. 핵심 구현

| 항목 | 설명 |
|------|------|
| WebSocket 설정 | STOMP over SockJS(`/ws`) + native WebSocket(`/ws-native`), Firebase ID Token 인증 |
| WebSocket 인가 | CONNECT 이후 SEND/SUBSCRIBE 목적지별 멤버십 검증 |
| 브라우저/실시간 CORS | 프로필/환경별 허용 Origin 설정 (`API_ALLOWED_ORIGIN_PATTERNS`, `CHAT_WS_ALLOWED_ORIGIN_PATTERNS`) |
| ChatService | 공통 채팅 엔진 (메시지 저장, 전송, 읽음 처리) |
| PartyMessageService | 파티 채팅 규칙 (계좌 공유, 도착 메시지, 종료 메시지) — Chat 엔진 사용 |
| 공개방 seed/backfill | 학교 전체방/마인크래프트방/학과방을 idempotent startup seed로 보장 |
| 공개방 visibility/membership | `UNIVERSITY/GAME/CUSTOM` 전체 노출, `DEPARTMENT`는 본인 학과만 노출, public room의 joined/not joined 목록/상세 정책 제공 |
| 학과 변경 side effect | 회원 학과 변경 시 기존 학과방 membership 자동 제거, 새 학과방 자동 참여는 하지 않음 |
| 채팅방 목록 요약 스트림 | 목록 화면은 `/user/queue/chat-rooms` 단일 구독으로 카드 요약(이름/인원/마지막 메시지/미읽음) 수신 |
| 읽음 처리 | `ChatRoomMember.lastReadAt` 기반 미읽음 수 계산 |

#### 3-3. API (REST + WebSocket)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/chat-rooms` | 채팅방 목록 (타입 필터) |
| `POST` | `/v1/chat-rooms` | 커스텀 공개 채팅방 생성 (생성자는 자동 joined) |
| `GET` | `/v1/chat-rooms/{id}` | 채팅방 상세 |
| `POST` | `/v1/chat-rooms/{id}/join` | 공개 채팅방 참여 |
| `DELETE` | `/v1/chat-rooms/{id}/members/me` | 공개 채팅방 나가기 |
| `GET` | `/v1/chat-rooms/{id}/messages` | 메시지 목록 (커서 기반 페이지네이션) |
| `PATCH` | `/v1/chat-rooms/{id}/read` | 읽음 처리 (`lastReadAt` 단조 증가) |
| `PATCH` | `/v1/chat-rooms/{id}/settings` | 채팅방 설정(음소거 등) |
| WebSocket | `SUBSCRIBE /user/queue/chat-rooms` | 내 채팅방 목록 요약 실시간 수신 |
| WebSocket | `SUBSCRIBE /topic/chat/{chatRoomId}` | 채팅방 상세 메시지 실시간 수신 |
| WebSocket | `SEND /app/chat/{chatRoomId}` | 채팅방 메시지 전송 |
| `GET` | `/v1/admin/chat-rooms` | 공개 채팅방 전체 목록 조회 (관리자, public non-party) |
| `GET` | `/v1/admin/chat-rooms/{id}` | 공개 채팅방 상세 조회 (관리자, public non-party) |
| `GET` | `/v1/admin/chat-rooms/{id}/messages` | 공개 채팅방 메시지 조회 (관리자, membership 불필요) |
| `POST` | `/v1/admin/chat-rooms` | 공개 채팅방 생성 (관리자) |
| `DELETE` | `/v1/admin/chat-rooms/{chatRoomId}` | 공개 채팅방 삭제 (관리자) |
| `GET` | `/v1/admin/parties/{partyId}/messages` | 파티 채팅 메시지 조회 (관리자, membership 불필요) |

#### 3-4. 완료 기준

- [x] WebSocket 연결 및 실시간 메시지 송수신 동작
- [x] 채팅방 목록 화면이 `/user/queue/chat-rooms` 단일 구독으로 카드 요약을 실시간 반영
- [x] 채팅방 상세 화면 진입 시 해당 room topic만 구독하고, 이탈 시 구독 해제
- [x] 파티 채팅방 자동 생성 (파티 생성 시) 동작
- [x] 읽음/미읽음 처리 동작
- [x] 파티 채팅 특수 메시지 (계좌, 도착, 종료) 동작
- [x] 공개 일반 채팅방의 joined/not joined 목록/상세 정책 및 join/leave/create REST 계약 동작
- [x] 공개방 seed/backfill과 학과 변경 membership 제거 정책 동작
- [x] 관리자 공개 채팅방 조회 API (`GET /v1/admin/chat-rooms`, `GET /v1/admin/chat-rooms/{chatRoomId}`, `GET /v1/admin/chat-rooms/{chatRoomId}/messages`)가 join 여부와 무관하게 public non-party room을 조회
- [x] 관리자 파티 채팅 조회 API (`GET /v1/admin/parties/{partyId}/messages`)가 party membership 없이 cursor pagination 계약을 재사용
- [x] 관리자 공개 채팅방 쓰기 API (`POST/DELETE /v1/admin/chat-rooms`) + `ADMIN_REQUIRED` 권한 정책 동작

---

### Phase 4: Board 도메인

> 커뮤니티 게시판. CRUD + 익명 + 좋아요/북마크.

#### 4-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Post` | `posts` | 게시글 |
| `PostImage` | `post_images` | 게시글 이미지 |
| `Comment` | `comments` | 댓글/대댓글 (self-reference) |
| `CommentLike` | `comment_likes` | 댓글 좋아요 |
| `PostInteraction` | `post_interactions` | 좋아요 + 북마크 통합 |

#### 4-2. 핵심 로직

| 로직 | 설명 |
|------|------|
| 익명 처리 | `anonId`는 `{scopeId}:{userId}` 기반 짧은 안정 해시(`ac:` prefix)로 생성하고, `anonymousOrder`는 글 단위 순번으로 재사용/부여 |
| 좋아요/북마크 | `PostInteraction` 단일 테이블, 등록/취소 방식 |
| 카운트 관리 | `viewCount`, `likeCount`, `commentCount`, `bookmarkCount` 동기화 |
| 댓글 좋아요 | `comment_likes` 저장 + `comments.likeCount` 동기화, 목록/생성/수정 응답에 `isLiked` 합성 |
| 게시글 수정 정책 | `PATCH /v1/posts/{postId}`는 `title/content/category/isAnonymous`와 `images` 전체 교체를 지원하며 `images[]` 원소는 null 불가 |
| 댓글 구조 | 무제한 depth 저장 + flat list 조회 응답 (`parentId`, `depth`) |
| 부모 삭제 정책(B) | 부모 댓글은 placeholder soft delete(`삭제된 댓글입니다`), 자식 댓글은 유지 |

#### 4-3. API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/v1/posts` | 게시글 작성 |
| `GET` | `/v1/posts` | 게시글 목록 (카테고리 필터, 페이지네이션) |
| `GET` | `/v1/posts/{postId}` | 게시글 상세 (조회수 증가) |
| `PATCH` | `/v1/posts/{postId}` | 게시글 부분 수정 (작성자, `isAnonymous`/`images` 전체 교체 포함) |
| `DELETE` | `/v1/posts/{postId}` | 게시글 삭제 (작성자) |
| `POST` | `/v1/posts/{postId}/like` | 좋아요 토글 |
| `POST` | `/v1/posts/{postId}/bookmark` | 북마크 토글 |
| `DELETE` | `/v1/posts/{postId}/like` | 좋아요 취소 |
| `DELETE` | `/v1/posts/{postId}/bookmark` | 북마크 취소 |
| `GET` | `/v1/posts/bookmarked` | 북마크한 게시글 목록 |
| `GET` | `/v1/posts/{postId}/comments` | 댓글 목록 |
| `POST` | `/v1/posts/{postId}/comments` | 댓글 작성 |
| `PATCH` | `/v1/comments/{commentId}` | 댓글 부분 수정 (`content`, optional `isAnonymous`) |
| `POST` | `/v1/comments/{commentId}/like` | 댓글 좋아요 등록 |
| `DELETE` | `/v1/comments/{commentId}/like` | 댓글 좋아요 취소 |
| `DELETE` | `/v1/comments/{commentId}` | 댓글 삭제 |
| `GET` | `/v1/members/me/posts` | 내가 작성한 게시글 목록 |
| `GET` | `/v1/members/me/bookmarks` | 내가 북마크한 게시글 목록 |
| `POST` | `/v1/images` | 이미지 업로드 |
| `GET` | `/v1/sse/posts` | 게시물 목록/조회수 실시간 구독 (후속 범위) |

#### 4-4. 완료 기준

- [x] 게시글 CRUD + 댓글/상호작용 API 동작
- [x] 익명 댓글 순번 부여 규칙(`anonId`, `anonymousOrder`) 동작
- [x] 좋아요/북마크 등록/취소 + 카운트 동기화 동작
- [x] 무제한 depth 댓글 + flat list 조회 + 부모 삭제 정책(B) 동작

---

### Phase 5: Notice 도메인

> 학교 공지 크롤링 + 앱 공지 관리.

#### 5-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Notice` | `notices` | 학교 공지 (크롤링) |
| `NoticeComment` | `notice_comments` | 공지 댓글 |
| `NoticeCommentLike` | `notice_comment_likes` | 공지 댓글 좋아요 |
| `NoticeReadStatus` | `notice_read_status` | 읽음 상태 |
| `NoticeLike` | `notice_likes` | 공지 좋아요 |
| `NoticeBookmark` | `notice_bookmarks` | 공지 북마크 |
| `AppNotice` | `app_notices` | 앱 운영 공지 |
| `AppNoticeReadStatus` | `app_notice_read_status` | 앱 공지 읽음 상태 |

#### 5-2. 핵심 구현

| 항목 | 설명 |
|------|------|
| RSS 크롤러 | `@Scheduled` 평일 08:00~19:50, 10분마다 RSS 피드 파싱 → DB 저장 |
| rssFingerprint | 레거시(`title|fullLink|rawDate`) 기준 변경 감지 |
| contentHash | 링크를 제외한 실제 내용 + 상세 본문/첨부 기반 SHA1 해시로 dedup |
| detail 재검증 | 신규/메타 변경/`detailHash` 없음/24시간 초과 시 재크롤링 |
| 공지 ID | `Base64(link).replace(/=+$/, '').slice(0, 120)` — 링크 기반 안정 ID |
| 저장 구조 | `rssPreview`(RSS 미리보기), `bodyHtml`(원문 HTML), `bodyText`(정규화 text), `thumbnailUrl`(`TEXT` 목록용 첫 이미지 URL 캐시), `summary`(향후 AI 요약 예약) |
| 목록 조회 최적화 | `/v1/notices`는 목록 전용 projection으로 필요한 컬럼만 select하고, `thumbnailUrl` 저장 컬럼을 그대로 사용한다. 목록 경로에서는 `bodyHtml/bodyText/attachments`를 select하지 않는다. |
| 공지 댓글 수정 정책 | `PATCH /v1/notice-comments/{id}`는 `content`와 optional `isAnonymous`를 지원하며, 익명 전환 시 기존 번호 재사용/신규 부여 정책을 따른다 |
| 공지 댓글 좋아요 | `notice_comment_likes` 저장 + `notice_comments.likeCount` 동기화, 목록/생성/수정 응답에 `isLiked` 합성 |
| 공지 북마크 저장 모델 | `NoticeLike`와 분리된 `notice_bookmarks` 테이블, 등록/취소는 idempotent |

#### 5-3. API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/notices` | 공지 목록 (카테고리/검색 필터) |
| `GET` | `/v1/notices/{id}` | 공지 상세 조회 |
| `POST` | `/v1/notices/{id}/read` | 읽음 표시 |
| `POST` | `/v1/notices/{id}/like` | 좋아요 등록 |
| `DELETE` | `/v1/notices/{id}/like` | 좋아요 취소 |
| `POST` | `/v1/notices/{id}/bookmark` | 북마크 등록 |
| `DELETE` | `/v1/notices/{id}/bookmark` | 북마크 취소 |
| `GET` | `/v1/notices/{noticeId}/comments` | 공지 댓글 목록 |
| `POST` | `/v1/notices/{noticeId}/comments` | 공지 댓글 작성 |
| `PATCH` | `/v1/notice-comments/{id}` | 공지 댓글 부분 수정 (`content`, optional `isAnonymous`) |
| `POST` | `/v1/notice-comments/{id}/like` | 공지 댓글 좋아요 등록 |
| `DELETE` | `/v1/notice-comments/{id}/like` | 공지 댓글 좋아요 취소 |
| `DELETE` | `/v1/notice-comments/{id}` | 공지 댓글 삭제 |
| `GET` | `/v1/members/me/notice-bookmarks` | 내가 북마크한 공지 목록 |
| `GET` | `/v1/app-notices` | 앱 공지 목록 (**Public**) |
| `GET` | `/v1/app-notices/{id}` | 앱 공지 상세 |
| `GET` | `/v1/members/me/app-notices/unread-count` | 미읽음 앱 공지 수 |
| `POST` | `/v1/members/me/app-notices/{appNoticeId}/read` | 앱 공지 읽음 처리 |
| `POST` | `/v1/admin/app-notices` | 앱 공지 생성 (관리자) |
| `PATCH` | `/v1/admin/app-notices/{appNoticeId}` | 앱 공지 부분 수정 (관리자) |
| `DELETE` | `/v1/admin/app-notices/{appNoticeId}` | 앱 공지 삭제 (관리자) |
| `POST` | `/v1/admin/notices/sync` | 학교 공지 동기화 실행 (관리자) |

#### 5-4. 완료 기준

- [x] RSS 크롤러가 주기적으로 공지 수집 동작
- [x] 중복 공지 필터링 동작
- [x] 공지 댓글 + 익명 순번 동작
- [x] 공지 북마크 등록/취소/내 목록 동작
- [x] AppNotice 비인증 조회 동작

#### 5-5. 공통 Comment 정책 (Board/Notice 공통)

- Comment 도메인은 Board/Notice에 종속된 부가 기능이 아니라 공통 정책을 공유하는 독립 하위 도메인으로 본다.
- 저장 정책:
  - `parentId` self-reference를 유지하되 depth 제한은 제거한다.
  - Board / Notice 모두 무제한 대댓글을 허용한다.
- 조회 정책:
  - 댓글 조회 API는 flat list를 반환한다.
  - 각 댓글은 최소 `id`, `parentId`, `depth`, `createdAt`, `updatedAt`, `isDeleted`를 포함한다.
  - 서버는 thread 순서를 보장한 flat list를 반환하고, 클라이언트가 이를 트리처럼 렌더링한다.
- 삭제 정책:
  - 부모 삭제 시 placeholder soft delete는 유지한다.
  - 하위 댓글은 depth와 무관하게 모두 보존한다.
- 알림 정책:
  - Board / Notice 공통 댓글 알림 마스터는 `commentNotifications`로 통일한다.
  - Board 게시글 북마크 기반 댓글 알림은 `bookmarkedPostCommentNotifications`로 분리한다.
  - 댓글 작성 시 수신 대상이 중복되면 푸시/인앱 인박스는 1회만 생성한다.

#### 5-5. AI / RAG 준비 메모

- `summary` 컬럼은 추후 AI가 생성한 공지 요약 저장용으로 예약한다.
- `bodyText`는 `bodyHtml`을 정규화한 plain text로 저장하고, 추후 chunking/embedding의 원본으로 사용한다.
- `thumbnailUrl`은 상세 HTML의 첫 번째 `img[src]`를 sync 시점에 추출해 저장하고, 기존 row는 `migration.plan=NOTICE_THUMBNAILS` backfill로 보정한다.
- `data:` / `blob:` / 과도하게 긴 `img[src]`는 저장하지 않고 `null`로 정리한다.
- `contentHash`가 변하면 기존 AI 요약/임베딩은 재생성 대상으로 간주한다.
- 공지 챗봇(RAG)은 `title`, `category`, `postedAt`, `link`를 citation 메타데이터로 사용한다.
- `bodyHtml`은 RN 앱의 웹형 렌더링 요구 때문에 유지한다. AI/RAG는 `bodyText`를 기준으로 처리한다.

---

### Phase 6: Academic 도메인

> 학사 정보 조회 + 시간표 관리 + 관리자 운영 API 제공.

#### 6-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Course` | `courses` + `course_schedules` | 강의 정보 |
| `UserTimetable` | `user_timetables` + `user_timetable_courses` | 사용자 시간표 |
| `UserTimetableManualCourse` | `user_timetable_manual_courses` | 사용자 직접 입력 강의 |
| `AcademicSchedule` | `academic_schedules` | 학사 일정 |

#### 6-2. API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/courses` | 강의 검색 (학기, 학과, 교수, 키워드) |
| `GET` | `/v1/timetables/my/semesters` | 내 시간표 학기 목록 조회 |
| `GET` | `/v1/timetables/my` | 내 시간표 조회 |
| `POST` | `/v1/timetables/my/courses` | 시간표에 강의 추가 |
| `POST` | `/v1/timetables/my/manual-courses` | 직접 입력 강의 추가 |
| `DELETE` | `/v1/timetables/my/courses/{courseId}` | 시간표에서 강의 삭제 |
| `GET` | `/v1/academic-schedules` | 학사 일정 목록 |
| `POST` | `/v1/admin/academic-schedules` | 학사 일정 추가 (관리자) |
| `PUT` | `/v1/admin/academic-schedules/{scheduleId}` | 학사 일정 수정 (관리자) |
| `PUT` | `/v1/admin/academic-schedules/bulk` | 학사 일정 범위 bulk sync (관리자) |
| `DELETE` | `/v1/admin/academic-schedules/{scheduleId}` | 학사 일정 삭제 (관리자) |
| `POST` | `/v1/admin/courses/bulk` | 학기 강의 일괄 등록 (관리자) |
| `DELETE` | `/v1/admin/courses` | 학기 강의 전체 삭제 (관리자) |

#### 6-3. 완료 기준

- [x] 강의 검색 필터(`semester`, `department`, `professor`, `search`, `dayOfWeek`, `grade`) 동작
- [x] 내 시간표 학기 목록 조회 동작
- [x] 내 시간표 조회/강의 추가/직접 입력 강의 추가/강의 삭제 동작
- [x] 시간표 무결성 규칙 적용
  - [x] 같은 사용자 + 학기 조합은 시간표 1개만 허용
  - [x] 같은 시간표 내 동일 강의 중복 추가 차단
  - [x] 오프라인 강의만 같은 요일/교시 겹침 시간 충돌 차단
  - [x] 온라인 직접 입력 강의는 슬롯 없이 저장
- [x] 온라인 공식 강의도 슬롯 없이 저장되고 충돌 검사에서 제외
- [x] 학사 일정 조회 동작
- [x] 관리자 학사 일정 CRUD + bulk sync 동작
- [x] 관리자 학기 강의 bulk 업서트/전체 삭제 동작
- [x] OpenAPI (`/v3/api-docs`, Swagger UI, Scalar) 반영
- [x] Phase 6 Postman 수동 검증 컬렉션(`etc/postman_collection.json > 06. Academic`) 반영

구현 계약 메모:
- 강의 bulk 등록 계약은 `credits` + 강의 단위 `location`으로 통일한다.
- 학사 일정 bulk sync는 `scopeStartDate ~ scopeEndDate` 범위 안에 완전히 포함되는 기존 일정만 대상으로 한다.
- 학사 일정 bulk sync의 자연키는 `title + startDate + endDate + type` 이며, 변경 가능 필드는 `description`, `isPrimary`다.
- 학사 일정 bulk sync는 legacy Firebase 스크립트 호환을 위해 `type: single | multi | SINGLE | MULTI`를 모두 허용한다.
- 관리자 강의 bulk 등록은 `isOnline`을 지원하며, `null`이면 `false`로 처리한다.
- `isOnline=true`인 공식 강의는 `schedule=[]` 또는 `null`만 허용하고, `location`은 입력되어도 서버에서 `null`로 정규화한다.
- 시간표 조회/추가/삭제는 동일한 시간표 응답(`courses[] + slots[]`)을 반환한다.
- `GET /v1/timetables/my/semesters`는 강의 카탈로그 학기와 사용자 시간표 학기의 합집합을 최신 학기 우선으로 반환한다.
- 직접 입력 강의는 `Course` 마스터와 분리된 `UserTimetableManualCourse`로 저장한다.
- `courses[]`는 공식 강의와 직접 입력 강의를 함께 반환하고, 각 항목에 실제 `isOnline` 값을 포함한다.
- 온라인 강의는 공식 강의/직접 입력 강의를 막론하고 `slots[]`에 포함되지 않으며 시간 충돌 검사 대상이 아니다.
- 시간표 색상 결정 책임은 백엔드가 아닌 프론트엔드(RN 앱)에 둔다.
- `GET /v1/timetables/my`의 semester 기본값은 서버 규칙(`2~7월 -> yyyy-1`, `8~12월 -> yyyy-2`, `1월 -> 전년도 yyyy-2`)을 사용한다.
- 실제 학교 학기 시작은 3월/9월이지만, 스쿠리는 수강신청/시간표 준비 수요를 반영해 학기 기준을 한 달 앞당겨 사용한다.
- Academic 도메인의 요일 표현은 `1-6 (월-토)`를 사용한다.

#### 6-4. 학사 일정 알림 정책 (Phase 8 연동 예정)

- 기본 트리거 기준일은 `AcademicSchedule.startDate`로 본다.
- 기본 발송 시각은 `오전 09:00`이다.
- 기본 발송 대상은 중요 일정(`isPrimary = true`)이다.
- 기본 발송 시점은 일정 당일 `오전 09:00`이다.
- 사용자 옵션으로 다음 정책을 추가 허용한다.
  - 일정 전날 `오전 09:00` 추가
  - 중요 일정만이 아니라 모든 일정 대상 확장
- 실제 FCM/인앱 인박스 발송은 Phase 8 Notification 인프라에서 구현한다.

---

### Phase 7: Support 도메인

> 문의/신고, 앱 버전, 학식 메뉴 관리.

#### 7-1. 엔티티

| 엔티티 | 테이블 | 설명 |
|--------|--------|------|
| `Inquiry` | `inquiries` | 문의 |
| `Report` | `reports` | 신고 |
| `AppVersion` | `app_versions` | 앱 버전 (ios, android) |
| `CafeteriaMenu` | `cafeteria_menus` | 학식 메뉴 |

`Report` 기준 enum:
- `targetType`: `POST`, `COMMENT`, `MEMBER`, `CHAT_MESSAGE`, `CHAT_ROOM`, `TAXI_PARTY`
- `status`: `PENDING`, `REVIEWING`, `ACTIONED`, `REJECTED`
- duplicate policy: `reporterId + targetType + targetId` 전 상태 기준 재신고 금지
- `CHAT_MESSAGE.targetAuthorId = message.senderId`
- `CHAT_ROOM.targetAuthorId = chatRoom.createdBy` (seed/public 방처럼 creator가 없으면 `null` 허용, `PARTY` 타입 방은 제외)
- `TAXI_PARTY.targetAuthorId = party.leaderId`
- `GET /v1/app-versions/{platform}`는 저장 데이터가 없으면 기본 `minimumVersion=1.0.0` 응답
- `GET /v1/legal-documents/{documentKey}`는 `documentKey=termsOfUse|privacyPolicy` 고정 키만 허용하며, `isActive=false` 또는 미존재 문서는 `404 LEGAL_DOCUMENT_NOT_FOUND`
- 초기 이용약관/개인정보 처리방침 2건은 1회성 seed migration으로 적재하고 이후에는 관리자 API로 관리
- 문의 첨부 이미지는 `POST /v1/images?context=INQUIRY_IMAGE` 2단계 업로드 후 `POST /v1/inquiries` 본문의 `attachments[]`로 저장한다.
- 문의는 첨부 이미지를 최대 3개까지 허용하며, 메타데이터 전체(`url`, `thumbUrl`, `width`, `height`, `size`, `mime`)를 JSON 컬럼으로 보존한다.
- 문의 첨부는 모든 문의 유형에서 허용하며, 탈퇴 후에도 문의 기록과 함께 보존한다.
- 학식 메뉴 조회 응답은 기존 `menus`를 유지하면서 `categories`, `menuEntries`를 추가 제공한다.
- `menuEntries`는 날짜/카테고리별 메뉴 제목, 보조 태그, 실제 좋아요/싫어요 집계, `myReaction`을 담는 구조화 필드이며 가격은 포함하지 않는다.
- 학식 메뉴 ID는 `weekId + category + title` 기준의 stable weekly identifier를 사용한다.
- 학식 좋아요/싫어요는 `cafeteria_menu_reactions` 도메인으로 분리하고, `PUT /v1/cafeteria-menu-reactions/{menuId}` 한 개의 upsert API로 등록/전환/취소를 처리한다.
- 관리자 `likeCount`/`dislikeCount` 입력값은 deprecated이며 저장 시 무시한다. 실제 응답 카운트는 사용자 반응 row가 source of truth다.
- 같은 주 안에서 동일 카테고리의 동일 메뉴 제목은 날짜가 달라도 `badges`, `likeCount`, `dislikeCount`가 동일해야 하며, 관리자 저장 시 서버가 이를 검증한다.

#### 7-2. API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/v1/inquiries` | 문의 접수 |
| `GET` | `/v1/inquiries/my` | 내 문의 목록 |
| `POST` | `/v1/reports` | 신고 접수 |
| `GET` | `/v1/app-versions/{platform}` | 앱 버전 정보 (**Public**) |
| `GET` | `/v1/legal-documents/{documentKey}` | 이용약관/개인정보 처리방침 조회 (**Public**) |
| `GET` | `/v1/cafeteria-menus` | 학식 메뉴 (이번 주) |
| `GET` | `/v1/cafeteria-menus/{weekId}` | 특정 주차 학식 메뉴 |
| `PUT` | `/v1/cafeteria-menu-reactions/{menuId}` | 학식 메뉴 반응 등록/전환/취소 |
| `GET` | `/v1/admin/legal-documents` | 법적 문서 목록 조회 (관리자) |
| `GET` | `/v1/admin/legal-documents/{documentKey}` | 법적 문서 상세 조회 (관리자) |
| `PUT` | `/v1/admin/legal-documents/{documentKey}` | 법적 문서 생성/전체 수정 (관리자) |
| `DELETE` | `/v1/admin/legal-documents/{documentKey}` | 법적 문서 삭제 (관리자) |
| `GET` | `/v1/admin/inquiries` | 문의 전체 목록 조회 (관리자) |
| `PATCH` | `/v1/admin/inquiries/{inquiryId}/status` | 문의 상태 처리 (관리자) |
| `GET` | `/v1/admin/reports` | 신고 전체 목록 조회 (관리자) |
| `PATCH` | `/v1/admin/reports/{reportId}/status` | 신고 상태 처리 (관리자) |
| `PUT` | `/v1/admin/app-versions/{platform}` | 앱 버전 정보 업데이트 (관리자) |
| `POST` | `/v1/admin/cafeteria-menus` | 학식 메뉴 등록 (관리자) |
| `PUT` | `/v1/admin/cafeteria-menus/{weekId}` | 학식 메뉴 수정 (관리자) |
| `DELETE` | `/v1/admin/cafeteria-menus/{weekId}` | 학식 메뉴 삭제 (관리자) |

#### 7-3. 완료 기준

- [x] 문의/신고 접수 동작
- [x] 문의 첨부 이미지 업로드 컨텍스트 및 메타데이터 저장 동작
- [x] 앱 버전 비인증 조회 동작
- [x] 법적 문서 비인증 조회 동작
- [x] 학식 메뉴 조회 동작
- [x] 관리자 문의/신고 목록 조회 및 상태 처리 동작
- [x] 관리자 법적 문서 운영 API 동작
- [x] 관리자 앱 버전/학식 메뉴 운영 API 동작
- [x] Admin 권한 정책(`ROLE_ADMIN`, `403 ADMIN_REQUIRED`) 및 공개 버전/법적 문서 조회(`permitAll`) 반영
- [x] Support 페이지 응답 포맷 `PageResponse` 일관화 및 수동 검증 컬렉션(`etc/postman_collection.json > 07. Support`) 반영

---

### Phase 8: Notification 인프라

> 도메인 이벤트 기반 알림 시스템. FCM + 인앱 인박스.
> 기본 이관 원칙: 기존 RN + Firebase Cloud Functions 운영 정책을 우선 보존한다. 다만 `allNotifications` 및 도메인 토글 반영이 현행 구현에서 일관되지 않은 항목은 Phase 8 설계에서 명시적으로 정규화한다.

#### 8-1. 구현 범위

| 항목 | 설명 |
|------|------|
| `UserNotification` 엔티티 | 알림 인박스 테이블 |
| `FcmToken` 엔티티 | FCM 토큰 관리 |
| `PushNotificationService` | Firebase Admin SDK로 FCM 발송 |
| `NotificationService` | 인박스 저장 + 조회 |
| `DomainEventNotificationListener` | `@EventListener` 기반 수신 + 실패 격리 처리 |

#### 8-2. 도메인 이벤트 → 알림 매핑

| 이벤트 | 알림 타입 | FCM | 인박스 |
|--------|-----------|-----|--------|
| PartyCreatedEvent | PARTY_CREATED | O | X |
| JoinRequestCreatedEvent | PARTY_JOIN_REQUEST | O | O |
| JoinRequestAcceptedEvent | PARTY_JOIN_ACCEPTED | O | O |
| JoinRequestDeclinedEvent | PARTY_JOIN_DECLINED | O | O |
| PartyStatusChangedEvent | PARTY_CLOSED / PARTY_ARRIVED | O | O |
| SettlementCompletedEvent | SETTLEMENT_COMPLETED | O | O |
| MemberKickedEvent | MEMBER_KICKED | O | O |
| ChatMessageCreatedEvent | CHAT_MESSAGE | O | X |
| PostLikedEvent | POST_LIKED | O | O |
| CommentCreatedEvent | COMMENT_CREATED | O | O |
| NoticeCreatedEvent | NOTICE | O | O |
| AppNoticeCreatedEvent | APP_NOTICE | O | O |
| AcademicScheduleReminderEvent | ACADEMIC_SCHEDULE | O | O |

#### 8-2-1. 알림 정책 상세 (현행 운영 정책 기준)

| 알림 타입 | 기본 트리거 | 기본 수신 대상 | 제외/예외 | 설정 반영 | 인앱 인박스 |
|-----------|-------------|----------------|-----------|-----------|-------------|
| `PARTY_CREATED` | 새 파티 생성 | 생성자 제외 전체 사용자 | 생성자 제외 | `allNotifications` + `partyNotifications` | X |
| `PARTY_JOIN_REQUEST` | 동승 요청 생성 | 파티 리더 | 토큰 없음 시 푸시 없음 | `allNotifications` + `partyNotifications` | O |
| `PARTY_JOIN_ACCEPTED` / `PARTY_JOIN_DECLINED` | 동승 요청 상태 변경 | 요청자 | `accepted` / `declined` 외 상태 미발송 | `allNotifications` + `partyNotifications` | O |
| `PARTY_CLOSED` | 파티 상태 `open -> closed` | 리더 제외 파티 멤버 | 해당 상태 전이 외 미발송 | `allNotifications` + `partyNotifications` | X |
| `PARTY_ARRIVED` | 파티 상태 `* -> arrived` | 리더 제외 파티 멤버 | 해당 상태 전이 외 미발송 | `allNotifications` + `partyNotifications` | O |
| `SETTLEMENT_COMPLETED` | 마지막 정산 완료 | 파티 전체 멤버 | 이미 정산 완료 상태였으면 미발송 | `allNotifications` + `partyNotifications` | O |
| `MEMBER_KICKED` | 파티 멤버 강퇴 | 강퇴된 멤버 | 자진 이탈(`_selfLeaveMemberId`)과 리더 제외 | `allNotifications` + `partyNotifications` | O |
| `PARTY_ENDED` | 파티 해체 | 리더 제외 파티 멤버 | 리더만 남은 파티는 제외 | `allNotifications` + `partyNotifications` | O |
| `CHAT_MESSAGE` (공개 채팅) | 공개 채팅방 메시지 생성 | 채팅방 멤버(송신자 제외) | 채팅방 mute 대상 제외 | `allNotifications` + 채팅방 mute | X |
| `CHAT_MESSAGE` (파티 채팅) | 파티 채팅 메시지 생성 (`TEXT`, `IMAGE`, `ACCOUNT`, `SYSTEM`, `ARRIVED`, `END`) | 파티 멤버(송신자 제외) | 파티 채팅 mute 대상 제외, payload는 `chatRoomId` canonical 사용 | 채팅 mute 중심 parity 우선, 전역 토글은 현재 미반영 | X |
| `POST_LIKED` | 게시글 좋아요 생성 | 게시글 작성자 | 자기 글 좋아요 제외 | `allNotifications` + `boardLikeNotifications` | O |
| `COMMENT_CREATED` (게시글) | 게시글 댓글/답글 생성 | 게시글 작성자, 부모 댓글 작성자, 게시글 북마크 사용자 | 자기 자신 대상 제외, 동일 사용자 중복 수신은 1회로 dedupe | `allNotifications` + `commentNotifications` + `bookmarkedPostCommentNotifications` | O |
| `COMMENT_CREATED` (공지) | 공지 댓글 답글 생성 | 부모 댓글 작성자 | `Notice.author`가 회원 식별자가 아니어서 루트 공지 작성자 알림은 현재 미지원 | `allNotifications` + `commentNotifications` | O |
| `NOTICE` | 새 학교 공지 생성 | 공지 허용 사용자 | 카테고리 상세 토글 비활성 사용자 제외 | `allNotifications` + `noticeNotifications` + `noticeNotificationsDetail` | O |
| `APP_NOTICE` | 앱 공지 생성 | 일반: 시스템 알림 허용 사용자 / `HIGH`: 전체 사용자 | `HIGH`는 설정 무시 강제 발송 | 일반: `allNotifications` + `systemNotifications` / `HIGH`: 설정 무시 | O |
| `ACADEMIC_SCHEDULE` | 학사 일정 리마인더 시각 도달 | 학사 일정 알림 허용 사용자 | 기본은 중요 일정만 대상 | `allNotifications` + `academicScheduleNotifications` | O |

- 저장 구조는 Firestore가 아니라 RDB 테이블(`user_notifications`, `fcm_tokens`)을 사용한다.
- FCM 전송은 `sendEachForMulticast` 500개 배치와 invalid token 정리 정책을 유지한다.
- 로컬/테스트에서 Firebase Messaging bean이 없으면 no-op sender로 기동/테스트를 허용한다.
- FCM raw push payload는 canonical `NotificationType` + 리소스 식별자(`partyId`, `noticeId`, `chatRoomId` 등)를 사용하며, 특정 RN legacy payload에 맞추지 않는다.
- 플랫폼별 sound/channel은 `PushPresentationProfile`로 관리한다. `PARTY`, `CHAT`, `NOTICE`, `DEFAULT` 프로필을 사용하고, `DEFAULT`는 현재 Android channel override를 두지 않는다.

#### 8-2-2. 학사 일정 알림 사용자 옵션 (계획)

- `academicScheduleNotifications`: 학사 일정 알림 마스터 토글
- `academicScheduleDayBeforeEnabled`: 전날 오전 09:00 추가 여부
- `academicScheduleAllEventsEnabled`: 중요 일정만이 아니라 모든 일정 대상으로 확장할지 여부
- 기본값:
  - `academicScheduleNotifications = true`
  - `academicScheduleDayBeforeEnabled = true`
  - `academicScheduleAllEventsEnabled = false`

#### 8-3. API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/notifications` | 알림 인박스 목록 |
| `POST` | `/v1/notifications/{id}/read` | 알림 읽음 처리 |
| `POST` | `/v1/notifications/read-all` | 전체 읽음 처리 |
| `DELETE` | `/v1/notifications/{id}` | 알림 삭제 |
| `GET` | `/v1/notifications/unread-count` | 미읽음 수 |
| `POST` | `/v1/members/me/fcm-tokens` | FCM 토큰 등록 |
| `DELETE` | `/v1/members/me/fcm-tokens` | FCM 토큰 해제 |
| `GET` | `/v1/sse/notifications` | 알림 실시간 구독 (SSE) |

#### 8-4. 완료 기준

- [x] 도메인 이벤트 발행 → after-commit 리스너 수신 동작
- [x] FCM 푸시 발송 동작
- [x] 알림 인박스 CRUD 동작
- [x] 알림 설정 반영 (mute, 카테고리별 on/off)
- [x] 학사 일정 리마인더 정책 반영 (기본: 중요 일정 당일 09:00, 옵션: 전날 추가 / 모든 일정)
- [x] 기존 Cloud Functions 운영 정책과의 parity 검증 (수신 대상, 예외 조건, 인앱 생성 여부)
- [x] `/v1/sse/notifications`로 인앱 실시간 알림/미읽음 수 반영 동작

---

### Phase 9: 인프라 및 배포

> Docker, OCI, CI/CD.
> 확정 전략: `OCI 1대 + docker-compose.prod.yml(app + MySQL + Redis)`, GitHub `production` 환경 승인 기반 반자동 배포.

#### 9-1. 구현 항목

| # | 항목 | 설명 | 상태 |
|---|------|------|------|
| 1 | Dockerfile | Spring Boot 멀티스테이지 빌드 | [x] |
| 2 | docker-compose.yml | app + MySQL + Redis 로컬 개발 환경 | [x] |
| 3 | Redis 범위 정리 | 이번 Phase는 컨테이너/환경변수/문서화까지만 반영 | [x] |
| 4 | OCI 배포 설계 | `OCI 단일 인스턴스 + docker-compose.prod.yml(app + MySQL + Redis)`, 운영 `.env`, Firebase 파일 주입 전략 | [x] |
| 5 | GitHub Actions CD | `main` 반영 후 `production` 환경 승인 기반 OCI/AWS 멀티플랫폼 배포 + `health/public API/CORS/OpenAPI` smoke check | [x] |
| 6 | OpenAPI 운영 정책 | `local/local-emulator` 노출, `prod` 기본 비노출 | [x] |
| 7 | 프로필 / `.env` 전략 정리 | `application/local/local-emulator/prod/test` 체계 + env 기반 local 정리 | [x] |
| 8 | 배포 가이드 / 체크리스트 | 배포 전/후 점검, smoke check, rollback 문서화 | [x] |
| 9 | OCI 실제 리소스 생성 및 최초 배포 | 서버/네트워크/운영 파일 실 배포 | [x] |

#### 9-2. 완료 기준

- [x] `docker compose up` 기준의 로컬 환경 파일/문서 준비
- [x] CI/CD 파이프라인 초안 반영
- [x] OCI 배포 및 정상 동작
- [x] 운영 smoke check 수행 확인 (`/actuator/health`, `GET /v1/app-versions/android`, admin REST CORS preflight, prod OpenAPI 비노출)
- [ ] rollback 실제 수행 확인

---

### Phase 10: Member 탈퇴/계정 라이프사이클

> 회원 탈퇴 정책 문서화, lifecycle 모델 반영, `DELETE /v1/members/me`, 연관 도메인 정합성 처리 구현 완료.

> 운영 rollout 주의: Phase 10 이전 운영 DB는 앱 기동 전에 `members.status`를 수동 SQL로 `ACTIVE` 백필해야 한다. 상세 절차는 [배포 가이드](./deployment-guide.md#10-phase-10-회원-lifecycle-마이그레이션)를 참조한다.

#### 10-1. 구현 항목

| # | 항목 | 설명 |
|---|------|------|
| 1 | 탈퇴 정책 문서화 | [Member 탈퇴 정책](./member-withdrawal-policy.md)로 soft delete, 재가입, 개인정보 처리, Firebase 후처리 정책 확정 |
| 2 | 도메인 영향 반영 | TaxiParty/Chat/Board/Notice/Support/Notification/Academic 정합성 처리 구현 |
| 3 | `DELETE /v1/members/me` API | 인증 사용자 본인 탈퇴 처리 및 정책 기반 예외 응답 구현 |
| 4 | 개인정보 처리 | Member PII 스크럽, linked_accounts/알림/FCM/시간표 삭제, 콘텐츠 익명화 반영 |
| 5 | 회귀 검증 | Contract/Service/도메인 정합성 테스트 추가 및 빌드 검증 |

#### 10-2. API

| Method | Path | 설명 |
|--------|------|------|
| `DELETE` | `/v1/members/me` | 회원 탈퇴 (즉시 탈퇴, soft delete tombstone + 도메인 후처리) |

#### 10-3. 완료 기준

- [x] 탈퇴 정책이 문서로 확정됨
- [x] `DELETE /v1/members/me` 동작 및 예외 케이스 검증 완료
- [x] 연관 도메인 데이터 정합성/개인정보 처리 규칙 검증 완료

---

### Phase 11: 운영 공통 인프라 (Admin 공통)

> 도메인별 Admin API를 횡단하는 공통 권한/감사/백오피스 기능을 구축한다.

#### 11-1. 구현 항목

| # | 항목 | 설명 |
|---|------|------|
| 1 | Admin 권한 공통화 | `ADMIN_REQUIRED` 정책, 공통 인가 컴포넌트, 실패 응답 표준화 |
| 2 | 운영 감사 로그 | Admin API 호출자/대상/변경 diff 기록, 추적성 확보 |
| 3 | 운영 백오피스 연동 기준 | 페이지네이션/검색/필터/정렬 규약, CSV 내보내기 등 운영 UX 규약 |
| 4 | Admin Contract Guard | 관리자/비관리자/미인증 시나리오 테스트 및 OpenAPI 예시 일관성 검증 |
| 5 | 운영 데이터 접근 정책 | 문의/신고/공지/학사 데이터의 접근 범위, 보존 기간, 개인정보 마스킹 규칙 |

#### 11-2. 비고

- 현재 `docs/api-specification.md`에 정의된 Admin API는 Phase 3/5/6/7에 도메인별로 배치한다.
- 특정 도메인에 귀속되지 않는 운영 공통 기능/엔드포인트만 Phase 11 대상으로 관리한다.
- 2안 적용 기준:
  - Firebase 인증 필터에서 `members.isAdmin=true` 사용자에 `ROLE_ADMIN` authority를 부여한다.
  - Admin 엔드포인트는 공통 메타 어노테이션(`@AdminApiAccess`, 내부적으로 `@PreAuthorize("hasRole('ADMIN')")`)으로 보호한다.
  - Admin 경로 접근 거부는 `ADMIN_REQUIRED`(`403`)를 반환한다.
- Phase 11 구현 결정:
  - `ADMIN_REQUIRED` 판별은 `/v1/admin/**` 경로 기준 공통 resolver로 정리한다.
  - 감사 로그는 상태 변경 Admin API(`POST`, `PUT`, `PATCH`, `DELETE`)만 저장하고, `GET` 조회는 고빈도/저효용 로그와 개인정보 중복 적재를 피하기 위해 제외한다.
  - Support 운영 목록(`GET /v1/admin/inquiries`, `GET /v1/admin/reports`)은 `PageResponse` + `page=0`/`size=20`/`size<=100` + 고정 정렬 `createdAt,DESC` 규약을 사용한다.
  - Member 운영 목록(`GET /v1/admin/members`)은 `PageResponse` + `page=0`/`size=20`/`size<=100` + `query/status/isAdmin/department` 필터를 사용한다. 정렬은 `sortBy/sortDirection`으로 확장하되, 기본값은 `joinedAt,DESC`, null 값은 항상 마지막이다.
  - 운영 목록의 이름 컬럼은 `members.realname`을 사용한다. `lastLoginOs`, `currentAppVersion`은 최근 활성 FCM 토큰의 `fcm_tokens.platform`, `fcm_tokens.app_version`을 대표 토큰 기준으로 함께 사용한다.
  - `POST /v1/members/me/fcm-tokens`는 optional `appVersion`을 받는다. 신규 토큰 등록 시 미전송하면 `null`로 저장하고, 같은 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지한다.
  - 관리자 대시보드 read API(`GET /v1/admin/dashboard/summary`, `GET /v1/admin/dashboard/activity`, `GET /v1/admin/dashboard/recent-items`)는 현재 저장된 도메인 데이터만 집계하는 read-only 모델이다. 상태 변경, sync 실행, 보정 배치는 포함하지 않는다.
  - 관리자 대시보드 집계/버킷 기준은 `Asia/Seoul`로 고정한다. `summary.newMembersToday`는 `joinedAt` 기준 오늘 `00:00 ~ generatedAt`, `activity.days`는 `7 | 30`만 허용, `recent-items`는 Inquiry/Report/AppNotice/Party를 `createdAt DESC`로 병합하고 게시된 앱 공지만 포함한다.
  - `summary.totalMembers`는 `members` 전체 row 기준이다. soft delete tombstone(`WITHDRAWN`)도 count에 포함하며, ACTIVE-only count는 이번 범위에 추가하지 않는다.
  - Member 활동 요약(`GET /v1/admin/members/{memberId}/activity`)은 ACTIVE 회원만 조회 가능하며, 현재 저장 데이터 기준 count + recent 5건 read model만 제공한다. 댓글 집계/최근 댓글은 삭제되지 않은 부모 게시글 기준으로만 포함하고, 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`으로 비제공 처리한다.
  - Member 관리자 권한 변경(`PATCH /v1/admin/members/{memberId}/admin-role`)은 `members.is_admin` boolean만 갱신하고 감사 로그를 남긴다. 자기 자신의 계정 대상 요청은 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`로 막고, 마지막 관리자 수 계산 같은 추가 정책은 후속 범위로 남긴다.
  - Member admin-role 감사 로그는 최소 snapshot(`id`, `email`, `nickname`, `isAdmin`, `status`)만 저장하며 `bankAccount`, `notificationSetting`는 적재하지 않는다.
  - CSV export와 자유 검색은 백오피스 요구사항이 확정될 때까지 문서 규약만 유지하고 런타임 API는 추가하지 않는다.

#### 11-3. 완료 기준

- [x] Admin 공통 인가/감사 로그가 모든 Admin API에 일관 적용됨
- [x] 운영 대상(문의/신고) 조회/처리 API 계약 및 권한 검증 완료
- [x] 백오피스 연동 기본 규약(페이지네이션/필터/정렬/CSV 보류)이 문서와 테스트 기준으로 정리됨

---

### Phase 12: 이미지/미디어 업로드 인프라

> 현재 도메인 API가 "업로드된 URL 입력"을 받는 구조를 공통 업로드 인프라로 정리한다.
> 1차 범위는 이미지 업로드부터 구현하고, 이후 미디어 확장이 가능한 storage/context 구조를 확보한다.

#### 12-1. 구현 항목

| # | 항목 | 설명 |
|---|------|------|
| 1 | 업로드 API | `POST /v1/images` multipart 업로드 API 구현, 인증 사용자 기준 접근 정책 정리 |
| 2 | Storage 추상화 | 스토리지 구현체 교체가 가능한 공통 repository/service 인터페이스 정리 |
| 3 | 업로드 정책 | 파일 크기, MIME type, 경로 naming, 썸네일 생성, context별 허용 규칙 확정 |
| 4 | 도메인 연동 | 게시판(`images[]`), 채팅(`imageUrl`), 앱 공지(`imageUrls[]`), 프로필(`photoUrl`) 업로드 플로우 연결 |
| 5 | 계약/검증 | OpenAPI, Postman, Contract 테스트, 운영 문서 동기화 |

#### 12-2. API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/v1/images` | 이미지 업로드 (multipart/form-data, context 기반) |

#### 12-3. 비고

- 1차 런타임 범위는 **이미지(image)** 업로드이며, video/audio 등 일반 media 확장은 storage/context 설계를 먼저 열어 두고 후속 범위로 둔다.
- context enum은 `POST_IMAGE`, `CHAT_IMAGE`, `APP_NOTICE_IMAGE`, `CAMPUS_BANNER_IMAGE`, `PROFILE_IMAGE`, `INQUIRY_IMAGE`로 확정한다.
- 권한 정책은 `POST_IMAGE`, `CHAT_IMAGE`, `PROFILE_IMAGE`, `INQUIRY_IMAGE`는 인증 사용자, `APP_NOTICE_IMAGE`, `CAMPUS_BANNER_IMAGE`는 관리자 전용으로 운영한다.
- `PROFILE_IMAGE` 저장 경로는 소유권 검증을 위해 `profiles/{memberId}/YYYY/MM/DD/{uuid}.{ext}` member-scoped 패턴을 사용한다.
- 기존 Board/Chat/AppNotice/Profile 계약과의 호환성을 우선하며, URL 직접 입력 경로는 유지한다.
- 기본 storage provider는 **LOCAL 파일시스템**이며, `StorageRepository` 인터페이스를 통해 `FIREBASE` provider를 포함한 cloud provider(S3/OCI/Firebase 등) 구현체를 교체 가능하게 둔다.

#### 12-4. 완료 기준

- [x] `/v1/images` 런타임 API와 OpenAPI 문서가 `/v3/api-docs` 기준으로 동기화됨
- [x] 파일 크기/MIME/context validation 및 대표 실패 케이스 Contract 테스트가 추가됨
- [x] 게시판/채팅/앱 공지/프로필 중 최소 1개 이상에서 업로드 후 저장 플로우가 실제로 검증됨
- [x] `README`, `docs/api-specification.md`, `etc/postman_collection.json`이 업로드 정책 기준으로 동기화됨

---

### Phase 13: 마인크래프트 Spring 전환

> Firebase RTDB 기반 마인크래프트 플러그인 연동을 Spring 중심 구조로 이관한 범위와 운영 기준을 정리한다.
> 상세 설계/이력은 백엔드 레포 `docs/minecraft-spring-migration-plan.md`를 기준으로 본다.

#### 13-1. 목표

- 마인크래프트 관련 기능에서 Firebase RTDB 의존 제거
- `public:game:minecraft` 공개방을 중심으로 앱/플러그인 양방향 채팅 통합
- 서버 상태, 온라인 플레이어, 화이트리스트, JE/BE 검증을 Spring `minecraft` 도메인으로 이관
- 시스템 메시지 push 정책을 Firebase Functions 의도와 동일하게 Spring Notification 인프라로 흡수

#### 13-2. 구현 항목

| # | 항목 | 설명 |
|---|------|------|
| 1 | Minecraft 도메인 신설 | `domain/minecraft` 패키지에 계정, 서버 상태, 온라인 플레이어, bridge outbox read model 추가 |
| 2 | Public API | `GET /v1/minecraft/overview`, `GET /v1/minecraft/players`, `GET/POST/DELETE /v1/members/me/minecraft-accounts*` 구현 |
| 3 | Public SSE | `GET /v1/sse/minecraft`로 서버 상태/플레이어 목록 snapshot + delta 제공 |
| 4 | Internal bridge API | 플러그인용 `/internal/minecraft/chat/messages`, `/internal/minecraft/server-state`, `/internal/minecraft/online-players`, `/internal/minecraft/stream` 구현 |
| 5 | Shared secret 인증 | `X-Skuri-Minecraft-Secret` 헤더 기반 서버 대 서버 인증 추가 |
| 6 | Chat 연동 | `public:game:minecraft` room 메시지를 앱 STOMP와 플러그인 SSE fan-out으로 동시 처리 |
| 7 | Notification 연동 | GAME room 시스템 메시지 push/inbox 예외 정책 반영 |
| 8 | 문서/검증 | OpenAPI, ERD, 도메인 문서, Contract/Service 테스트 동기화 |

#### 13-3. 데이터 설계

신규 read model / 테이블 초안:

- `minecraft_accounts`
- `minecraft_server_state`
- `minecraft_online_players`
- `minecraft_bridge_events`

기존 테이블 재사용:

- `chat_rooms`
- `chat_messages`

핵심 정책:

- canonical room id는 `public:game:minecraft`
- 마인크래프트 메시지는 `chat_messages`에 저장
- `senderPhotoUrl`은 앱 사용자면 `members.photo_url`, 마인크래프트 origin이면 Minotar URL 사용
- `senderId`는 앱 사용자는 member id, 마인크래프트 origin은 synthetic sender key를 사용

#### 13-4. PR 분리 기준

- PR 1: 백엔드 `minecraft` 도메인 + public/internal API
- PR 2: 플러그인 Firebase 제거 + Spring bridge 전환
- PR 3: 앱 Minecraft repository/화면 전환
- PR 4: Firebase Minecraft 코드 제거 및 컷오버 정리

#### 13-5. 구현 반영 상태

- [x] `/v1/minecraft/**`, `/v1/members/me/minecraft-accounts/**`, `/v1/sse/minecraft` 계약이 `/v3/api-docs` 기준으로 문서화됨
- [x] `/internal/minecraft/**` secret 인증과 SSE 예시가 OpenAPI에 반영됨
- [x] 마인크래프트 채팅이 `public:game:minecraft` room에 저장되고 앱 STOMP로 브로드캐스트됨
- [x] 앱 `IMAGE` 메시지가 플러그인 outbound 시 placeholder text로 변환됨
- [x] GAME room 시스템 메시지가 Notification 인프라를 통해 push/inbox 정책과 함께 처리됨
- [x] 계정 등록 개수 제한, parent 삭제 금지, JE/BE 중복 방지 규칙 Service 테스트가 추가됨
- [x] overview/accounts/internal auth Contract 테스트가 추가됨

#### 13-6. 비고

- 과거 RTDB/Firestore 마인크래프트 메시지 이력은 이관하지 않는다.
- 마인크래프트 서버는 1대 고정으로 가정한다.
- 화이트리스트 enabled on/off 실시간 토글 UI는 이번 범위에 포함하지 않는다.

---

## 4. Phase 간 의존 관계

```
Phase 0 ─── 필수 선행 ──→ Phase 1 (Member)
Phase 1 ─── 필수 선행 ──→ Phase 2 (TaxiParty)
Phase 2 ─── 필수 선행 ──→ Phase 3 (Chat)
Phase 1 ─── 필수 선행 ──→ Phase 4 (Board)
Phase 1 ─── 필수 선행 ──→ Phase 5 (Notice)
Phase 1 ─── 필수 선행 ──→ Phase 6 (Academic)
Phase 1 ─── 필수 선행 ──→ Phase 7 (Support)
Phase 2~7 ── 연동 ──→ Phase 8 (Notification)
전체 ───────────────→ Phase 9 (인프라/배포)
Phase 1~9 ─────────────→ Phase 10 (Member 탈퇴)
Phase 3/5/6/7 ── 연동 ──→ Phase 11 (운영 공통 Admin 인프라)
Phase 1/3/4/5 ── 연동 ──→ Phase 12 (이미지/미디어 업로드 인프라)
Phase 1/3/8 ── 연동 ──→ Phase 13 (마인크래프트 Spring 전환)
```

**참고:** Phase 4~7 (Board, Notice, Academic, Support)은 서로 독립적이므로 **병렬 구현 가능**합니다.
단, Phase 2 → Phase 3은 파티 채팅 연동 때문에 **순차 구현 필수**입니다.

---

## 5. 각 Phase의 내부 구현 순서 (공통 패턴)

모든 도메인은 아래 순서로 bottom-up 구현합니다:

```
1. Entity + Enum          (도메인 모델)
2. Repository             (데이터 접근)
3. Service                (비즈니스 로직)
4. DTO (Request/Response) (API 계약)
5. Controller             (API 엔드포인트)
6. Event (필요 시)         (도메인 이벤트 발행)
7. OpenAPI 문서화          (`@Tag`, `@Operation`, `@ApiResponses`, DTO `@Schema`, GroupedOpenApi 반영)
8. Serena Memory 동기화    (`.serena/memories/*.md`에서 영향받는 항목 갱신)
```

---

## 6. Serena Memory 운영 규칙

- Serena Memory는 코드 구현 문서가 아니라, "현재 프로젝트 상태를 빠르게 회복하기 위한 온보딩 요약"으로 유지한다.
- 기능/정책/운영 규칙 변경 시 아래 매핑으로 같은 PR에서 함께 갱신한다.
  - 아키텍처/도메인: `project_overview`, `codebase_structure`
  - 스타일/정책/검증 기준: `code_style_and_conventions`, `task_completion_checklist`
  - 실행/테스트/운영 명령: `suggested_commands`
- 머지 전 점검:
  - `serena.check_onboarding_performed`
  - `serena.list_memories`
  - 최근 변경과 메모리 내용 불일치 여부 확인

---

## 참고 문서

- [도메인 분석](./domain-analysis.md) — 도메인 상세 및 엔티티 설계
- [ERD](./erd.md) — 테이블 스키마 및 인덱스
- [API 명세](./api-specification.md) — 전체 API 상세 스펙
- [기술 전략](./tech-strategy.md) — 기술 선택 근거 및 포트폴리오 전략
- [역할 정의](./role-definition.md) — Spring 백엔드의 책임 범위
- 백엔드 레포 `docs/minecraft-spring-migration-plan.md` — 앱/플러그인/백엔드 통합 전환 상세 설계

---

> **문서 이력**
> - 2026-04-06: Admin Chat read API 구현 반영 — 공개 채팅방 관리자 목록/상세/메시지 조회와 관리자 파티 메시지 조회를 Phase 3/Phase 2 운영 API 및 완료 기준에 추가
> - 2026-04-01: Phase 13 구현 반영 완료 상태로 갱신 — 마인크래프트 public/internal API, public SSE, bridge outbox, IMAGE placeholder, notification policy, 테스트/문서 완료 기준을 체크 상태로 동기화
> - 2026-03-30: Phase 13 마인크래프트 Spring 전환 계획 추가 — public/internal API, SSE bridge, whitelist/검증 이관 범위, PR 분리 기준, 완료 기준을 문서화
> - 2026-02-26: 초안 작성
> - 2026-03-05: Admin API를 도메인 Phase(3/5/6/7)에 배치, Phase 11(운영 공통 Admin 인프라) 추가, Phase 4/6/7/8 API 경로·메서드 동기화
> - 2026-03-05: Support Phase에 관리자 문의/신고 조회·처리 API 추가 (`/v1/admin/inquiries`, `/v1/admin/reports`)
> - 2026-03-05: Admin 권한 정책 구현 반영 — `ROLE_ADMIN + @PreAuthorize`, `ADMIN_REQUIRED` 표준화, Chat Admin API(`POST/DELETE /v1/admin/chat-rooms`) 완료 기준 반영
> - 2026-03-05: Phase 4(Board) 구현 반영 — 댓글 depth 1 제한, 부모 삭제 정책(B: placeholder soft delete), `/v1/members/me/posts|bookmarks` API 및 카운트 동기화 전략 문서화
> - 2026-03-06: README/로드맵 현재 상태를 Phase 4 완료 기준으로 동기화하고, Board API 경로 변수명을 코드 기준(`postId/commentId`)으로 정렬
> - 2026-03-07: Board/Notice 공통 Comment 정책 구현 반영 — 무제한 depth, flat list 응답, 댓글 알림 설정 분리(`commentNotifications`, `bookmarkedPostCommentNotifications`)
> - 2026-03-08: Phase 7 완료 기준으로 현재 상태를 갱신하고, Support 운영 API/기본 앱 버전 fallback/Postman 수동 검증 컬렉션 경로를 반영
> - 2026-03-08: Phase 8 Notification 구현 반영 — `PARTY_*` canonical enum, RDB 저장 구조, FCM token/no-op sender, 학사 일정 리마인더, Notification SSE/인박스/정책 parity 동기화
> - 2026-03-08: Phase 8 Push payload 계약 보강 — canonical `type + data`, `contractVersion`, platform별 sound/channel presentation profile 문서화
> - 2026-03-29: Member Admin API review fix — self role change 금지와 최소 감사 snapshot 정책을 Phase 11 운영 규약에 반영
> - 2026-03-29: TaxiParty Admin P1 구현 반영 — `/v1/admin/parties`, `/v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`를 Phase 2 API/운영 규약에 추가하고, 관리자 상태 변경은 기존 파티 상태 머신 전이만 재사용하도록 고정
> - 2026-03-29: TaxiParty Admin follow-up 구현 반영 — `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests`를 Phase 2 운영 API에 추가하고, leader 제거 금지/관리자 시스템 메시지 sender 표기/pending 최신순 조회 규칙을 문서화
> - 2026-03-10: Phase 11 완료 반영 — `@AdminApiAccess` 기반 공통 인가, `admin_audit_logs` 저장 인프라, Support 운영 목록 규약(`PageResponse`, `createdAt,DESC`, `page/size` 검증), Admin guard/OpenAPI convention 테스트 기준 문서화
> - 2026-03-10: Phase 12 구현 반영 — `/v1/images` 런타임/OpenAPI/Postman, `StorageRepository` + LOCAL/FIREBASE provider, context 권한 정책(`POST/CHAT/PROFILE` 인증, `APP_NOTICE` 관리자)을 문서 기준으로 동기화
> - 2026-03-25: Notice 북마크 구현 반영 — `NoticeBookmark` 테이블, idempotent 등록/취소, `/v1/members/me/notice-bookmarks` 목록 API와 withdrawal cleanup 동기화
