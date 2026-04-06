# Spring 백엔드 API 명세

> 최종 수정일: 2026-03-30
> 관련 문서: [도메인 분석](./domain-analysis.md) | [ERD](./erd.md) | [Member 탈퇴 정책](./member-withdrawal-policy.md)

---

## 목차

1. [공통 사항](#1-공통-사항)
2. [Member API](#2-member-api)
3. [TaxiParty API](#3-taxiparty-api)
4. [Chat API](#4-chat-api)
5. [Board API](#5-board-api)
6. [Notice API](#6-notice-api)
7. [Academic API](#7-academic-api)
8. [Support API](#8-support-api)
9. [Notification API](#9-notification-api)
10. [SSE (Server-Sent Events)](#10-sse-server-sent-events)
11. [Image API](#11-image-api)
12. [Admin API](#12-admin-api)
13. [Minecraft API](#13-minecraft-api)

---

## 1. 공통 사항

### 1.1 Base URL

```
Production: (도메인 미정)
Development: http://localhost:8080/v1
```

### 1.1-1 계약 소스 정책

- 런타임 API 계약의 최종 기준은 `/v3/api-docs`입니다.
- 본 문서(`docs/api-specification.md`)는 사람이 읽는 설명 문서이며, 코드 변경 PR에서 `/v3/api-docs`와 함께 동기화합니다.

### 1.2 인증

대부분의 API는 Firebase Authentication의 ID Token(JWT)을 사용한 Bearer 인증이 필요합니다.

```http
Authorization: Bearer <firebase_id_token>
```

**Public API (인증 불필요):**

비즈니스 API 기준으로는 아래 5개 API만 인증 없이 호출 가능합니다.  
추가로 API 문서 UI/스펙 조회 엔드포인트도 인증 없이 접근 가능합니다.

| API | 이유 |
|-----|------|
| `GET /v1/app-versions/{platform}` | 앱 실행 초기(로그인 전) 강제 업데이트 여부 확인 |
| `GET /v1/app-notices` | 로그인 전 점검 공지 / 긴급 공지 표시 필요 |
| `GET /v1/app-notices/{appNoticeId}` | 로그인 전 개별 점검/업데이트 공지 상세 표시 필요 |
| `GET /v1/legal-documents/{documentKey}` | 설정 화면의 이용약관 / 개인정보 처리방침 표시 |
| `GET /v1/campus-banners` | 로그인 전 캠퍼스 홈 배너 노출 필요 |
| `GET /v3/api-docs/**` | OpenAPI 스펙(JSON) 조회 |
| `GET /swagger-ui/**`, `GET /swagger-ui.html` | Swagger UI 조회 |
| `GET /scalar/**` | Scalar UI 조회 |

### 1.3 공통 Response 형식

> 공통 응답은 `ApiResponse`의 `@JsonInclude(Include.NON_NULL)` 정책을 사용합니다.
> 즉, `null` 값 필드는 직렬화 시 생략될 수 있습니다.
> 예외적으로 채팅 메시지 payload의 `senderPhotoUrl`은 값이 없어도 `null`로 명시적으로 포함합니다.
> `senderPhotoUrl`의 source of truth는 "앱 사용자 메시지 = members.photo_url, Minecraft origin 메시지 = Minotar URL" 규칙을 따릅니다.

**성공 응답:**
```json
{
  "success": true,
  "data": { ... }
}
```

**페이지네이션 응답:**
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**에러 응답:**
```json
{
  "success": false,
  "message": "에러 메시지",
  "errorCode": "ERROR_CODE",
  "timestamp": "2026-02-03T12:00:00Z"
}
```

### 1.4 공통 에러 코드

| HTTP 상태 | 에러 코드 | 설명 |
|----------|----------|------|
| 400 | `INVALID_REQUEST` | 잘못된 요청 |
| 401 | `UNAUTHORIZED` | 인증 필요 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 403 | `ADMIN_REQUIRED` | 관리자 권한 필요 |
| 403 | `MEMBER_WITHDRAWN` | 탈퇴한 회원 접근 차단 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 충돌 (중복 등) |
| 409 | `WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED` | 탈퇴한 동일 UID 재가입 불가 |
| 409 | `MEMBER_WITHDRAWAL_NOT_ALLOWED` | 현재 상태상 회원 탈퇴 불가 |
| 409 | `RESOURCE_CONCURRENT_MODIFICATION` | 낙관적 락 기반 동시 수정 충돌 |
| 422 | `VALIDATION_ERROR` | 유효성 검사 실패 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### 1.5 공통 Query Parameters

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `page` | int | 0 | 페이지 번호 (0부터 시작) |
| `size` | int | 20 | 페이지 크기 (최대 100) |
| `sort` | string | - | 정렬 기준 (예: `createdAt,desc`) |

---

## 2. Member API

> 구현 상태 (2026-04-06):
> - 구현 완료: `POST /v1/members`, `GET /v1/members/me`, `PATCH /v1/members/me`, `DELETE /v1/members/me/photo`, `PUT /v1/members/me/bank-account`, `PATCH /v1/members/me/notification-settings`, `DELETE /v1/members/me`, `GET /v1/members/{id}`, `POST/DELETE /v1/members/me/fcm-tokens`
> - 계정 라이프사이클 정책: [Member 탈퇴 정책](./member-withdrawal-policy.md)

### 2.1 인증 및 로그인 플로우

본 프로젝트는 **Firebase Authentication을 인증 주체로 유지**합니다.

- 로그인/토큰 발급/토큰 갱신(Refresh Token 포함)은 **클라이언트(RN) + Firebase Auth**가 담당합니다.
- Spring 백엔드는 클라이언트가 전달한 **Firebase ID Token(JWT)** 을 검증하여 인증을 처리합니다.
- 따라서 Spring 백엔드에는 `/auth/*` 형태의 “로그인/토큰 재발급” API가 존재하지 않습니다.

> 참고: 로그아웃은 클라이언트에서 Firebase Auth 로그아웃을 수행합니다.
> 서버는 푸시 알림을 위한 FCM 토큰 등록/해제 API만 제공합니다. (2.4 참고)

---

#### 전체 로그인 플로우

클라이언트는 Firebase의 `isNewUser` 플래그를 기준으로 신규/기존 회원을 구분하여 서버 API를 분기 호출합니다.

```
클라이언트 (React Native)
    │
    ├─ 1. Google Sign-In → Firebase ID Token + isNewUser 플래그 수신
    │
    ├─ 이메일 도메인 검증 (@sungkyul.ac.kr)
    │      └─ 실패 시 → 로그인 중단, 안내 메시지 표시
    │
    ├─ isNewUser == true (신규 회원)
    │      ├─ POST /v1/members          ← 회원 레코드 생성
    │      └─ CompleteProfile 화면   ← 닉네임/학번/학과 입력
    │
    └─ isNewUser == false (기존 회원)
           ├─ GET /v1/members/me        ← last_login 갱신 + 프로필 조회
           └─ 홈 화면
```

> **주의:** Firebase의 `isNewUser`가 간헐적으로 부정확할 수 있습니다.
> 서버는 `POST /v1/members` 중복 호출(이미 존재하는 활성 uid)에 대해 **200 OK + 기존 프로필**을 반환하여 안전하게 처리합니다.
> 단, 이미 탈퇴 처리된 동일 uid는 `409 WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED`를 반환하며 재활성화하지 않습니다.

**이메일 도메인 제한:**
모든 인증 API에서 Firebase ID Token의 `email`이 `@sungkyul.ac.kr`로 끝나지 않으면 `403`을 반환합니다.

```json
{
  "success": false,
  "errorCode": "EMAIL_DOMAIN_RESTRICTED",
  "message": "성결대학교 이메일(@sungkyul.ac.kr)만 사용 가능합니다."
}
```

**탈퇴 회원 접근 제한:**
- 보호 API에 탈퇴 회원 토큰이 들어오면 `403 MEMBER_WITHDRAWN`을 반환합니다.
- 예외적으로 `POST /v1/members`는 탈퇴한 동일 UID가 명시적인 `409 WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED`를 받을 수 있도록 허용됩니다.

**로컬 Auth Emulator 정책:**
- `local-emulator` 프로필에서만 Auth Emulator 사용을 허용합니다.
- 필수 환경변수: `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_PROJECT_ID`
- `local-emulator`에서는 `FIREBASE_CREDENTIALS_PATH`, `GOOGLE_APPLICATION_CREDENTIALS`를 비워 두는 것을 기본값으로 봅니다. 실제 서비스 계정 파일은 필요하지 않습니다.
- `firebase.auth.use-emulator=false` 상태에서 emulator host가 설정되면 서버는 기동 실패합니다. (운영 오염 방지)
- IntelliJ `실행 전` 작업은 `/Users/jisung/skuri-backend/bin/start-firebase-auth-emulator.sh` 사용을 권장합니다.
  - 이 스크립트는 PID를 `/tmp/firebase-auth-emulator.pid`에 기록하고,
    서버 종료 시(`local-emulator` 프로필) 해당 PID의 Emulator를 자동 종료합니다.

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_PROJECT_ID=sktaxi-acb4c \
SPRING_PROFILES_ACTIVE=local-emulator ./gradlew bootRun
```

- 위 예시는 호스트에서 서버를 직접 실행할 때 기준이다.
- 기본 DB는 `localhost:3306`을 사용하며, 필요하면 `DB_URL` 환경변수로 Docker MySQL(`localhost:3307`) 같은 다른 포트를 덮어쓸 수 있다.
- Docker 컨테이너에서 emulator를 사용할 경우 `127.0.0.1` 대신 `host.docker.internal:9099` 같은 호스트 접근 주소를 사용해야 한다.

---

### 2.2 회원 가입

#### POST /v1/members
신규 회원 레코드 생성 (첫 로그인 시 1회 호출)

**인증:** Firebase ID Token 필수

Spring 서버 처리:
1. Firebase Admin SDK로 ID Token 검증 → `uid`, `email`, `sign_in_provider`, provider 계정 정보(`name`, `picture`, provider id) 추출
   - `google.com` provider를 강제하지 않는다.
   - `linked_accounts.provider`는 `GOOGLE`, `PASSWORD`, `UNKNOWN` 중 하나로 저장한다.
   - 소셜 로그인(`GOOGLE`)이 아닌 경우 `linked_accounts`는 `provider`를 제외한 provider 부가 컬럼(`provider_id`, `email`, `provider_display_name`, `photo_url`)을 `null`로 저장한다.
2. `members` 테이블에서 `uid` 조회
   - **없음 (신규)** → INSERT + `linked_accounts` INSERT → 201 Created
   - **있음 + ACTIVE (중복)** → 별도 처리 없이 기존 프로필 200 OK 반환 (idempotent)
   - **있음 + WITHDRAWN** → 409 Conflict (`WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED`)

> 정책: 회원 생성 시 `members.photoUrl`은 `null`로 저장한다.  
> 소셜 계정 프로필 이미지(`picture`)는 `linked_accounts.photo_url`에만 저장한다.
> 회원 생성 시 `members.realname`은 provider 프로필 이름(`linked_accounts.provider_display_name`)으로 초기화한다.
>
> 용어 구분:
> - API 요청/응답의 `nickname` = `members.nickname` (앱 내 닉네임)
> - 소셜 계정 이름 = `linked_accounts.provider_display_name`

**Request:** (body 없음, ID Token만 사용)

**Response (신규 생성 — 201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "firebase_uid",
    "email": "user@sungkyul.ac.kr",
    "nickname": "스쿠리 유저",
    "studentId": null,
    "department": null,
    "realname": "홍길동",
    "photoUrl": null,
    "isAdmin": false,
    "bankAccount": null,
    "joinedAt": "2026-02-03T12:00:00Z"
  }
}
```

**Response (중복 호출 — 200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "firebase_uid",
    "email": "user@sungkyul.ac.kr",
    "nickname": "홍길동",
    "studentId": "20201234",
    "department": "컴퓨터공학과",
    "realname": "홍길동",
    "photoUrl": null,
    "isAdmin": false,
    "bankAccount": { ... },
    "joinedAt": "2024-03-01T00:00:00Z"
  }
}
```

**Response (탈퇴한 동일 UID 재가입 시도 — 409 Conflict):**
```json
{
  "success": false,
  "message": "탈퇴한 계정은 같은 인증 계정으로 재가입할 수 없습니다.",
  "errorCode": "WITHDRAWN_MEMBER_REJOIN_NOT_ALLOWED",
  "timestamp": "2026-03-09T12:00:00"
}
```

---

### 2.3 회원 정보

#### GET /v1/members/me
내 정보 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "홍길동",
    "studentId": "20201234",
    "department": "컴퓨터공학과",
    "photoUrl": "https://...",
    "realname": "홍길동",
    "isAdmin": false,
    "bankAccount": {
      "bankName": "카카오뱅크",
      "accountNumber": "3333-01-1234567",
      "accountHolder": "홍길동",
      "hideName": false
    },
    "notificationSetting": {
      "allNotifications": true,
      "partyNotifications": true,
      "noticeNotifications": true,
      "boardLikeNotifications": true,
      "commentNotifications": true,
      "bookmarkedPostCommentNotifications": true,
      "systemNotifications": true,
      "academicScheduleNotifications": true,
      "academicScheduleDayBeforeEnabled": true,
      "academicScheduleAllEventsEnabled": false,
      "noticeNotificationsDetail": {
        "news": true,
        "academy": true,
        "scholarship": false
      }
    },
    "joinedAt": "2024-03-01T00:00:00Z",
    "lastLogin": "2026-03-02T09:10:11Z"
  }
}
```

#### PATCH /v1/members/me
내 정보 수정

- 부분 업데이트 API입니다.
- 요청 본문에 포함되지 않은 필드는 기존 값을 유지합니다.
- JSON `null`도 런타임에서는 "변경 없음"으로 해석합니다. 특히 `photoUrl: null`은 삭제가 아니라 기존 값을 유지합니다.
- `nickname`은 `members.nickname`을 수정합니다.
- `department`는 서버가 지원하는 학과 카탈로그 기준으로만 허용합니다.
  - legacy 표기(예: `소프트웨어학과`)는 canonical 값으로 정규화해 저장합니다.
  - 지원하지 않는 값은 `422 VALIDATION_ERROR`를 반환합니다.
- `realname`은 회원 생성 시 provider 이름으로 초기화되며, 이 API로 수정할 수 없습니다.
- `photoUrl`은 `POST /v1/images`의 `PROFILE_IMAGE` 업로드 결과 URL 중 **본인이 업로드한 member-scoped URL**만 새 값으로 재사용할 수 있습니다.
- 이미 저장된 `photoUrl`을 그대로 다시 보내는 것은 허용합니다. 이 예외는 legacy unscoped 내부 URL을 포함합니다.
- 다른 회원의 내부 profile 업로드 URL이나 profile 컨텍스트가 아닌 내부 storage URL은 `422 VALIDATION_ERROR`를 반환합니다.
- 프로필 사진 삭제는 `DELETE /v1/members/me/photo`를 사용합니다.

**Request:**
```json
{
  "nickname": "새닉네임",
  "studentId": "20201234",
  "department": "컴퓨터공학과",
  "photoUrl": "https://cdn.skuri.app/uploads/profiles/dw9rPtuticbjnaYPkeiF3RGPpqk1/2026/04/06/photo.jpg"
}
```

#### DELETE /v1/members/me/photo
내 프로필 사진 삭제

- `members.photo_url`을 `null`로 갱신합니다.
- 현재 `photoUrl`이 요청 회원 본인 소유로 검증된 member-scoped `PROFILE_IMAGE` URL이면, storage에서 원본 파일과 썸네일(`_thumb`)도 함께 정리합니다.
- legacy unscoped 내부 `PROFILE_IMAGE` URL은 소유권을 증명할 수 없으므로 storage cleanup 없이 DB만 `null` 처리합니다.
- 외부 URL(소셜 provider URL 포함)이거나 이미 `photoUrl`이 `null`이면 DB만 안전하게 정리하고 storage 삭제는 시도하지 않습니다.
- storage 정리는 best-effort이며, 파일이 이미 없거나 일부 삭제가 실패해도 프로필 사진 삭제 자체는 성공으로 처리합니다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

#### PUT /v1/members/me/bank-account
계좌 정보 수정

**Request:**
```json
{
  "bankName": "카카오뱅크",
  "accountNumber": "3333-01-1234567",
  "accountHolder": "홍길동",
  "hideName": false
}
```

#### PATCH /v1/members/me/notification-settings
알림 설정 수정

- 부분 업데이트 API입니다.
- 요청 본문에 포함되지 않은 알림 필드는 기존 값을 유지합니다.
- 런타임 기준으로 현재 지원되는 필드는 `allNotifications`, `partyNotifications`, `noticeNotifications`, `boardLikeNotifications`, `commentNotifications`, `bookmarkedPostCommentNotifications`, `systemNotifications`, `academicScheduleNotifications`, `academicScheduleDayBeforeEnabled`, `academicScheduleAllEventsEnabled`, `noticeNotificationsDetail`입니다.
- 학사 일정 알림 기본값은 `academicScheduleNotifications=true`, `academicScheduleDayBeforeEnabled=true`, `academicScheduleAllEventsEnabled=false`입니다.

**Request:**
```json
{
  "partyNotifications": true,
  "noticeNotifications": false,
  "commentNotifications": true,
  "bookmarkedPostCommentNotifications": true,
  "academicScheduleNotifications": true,
  "academicScheduleDayBeforeEnabled": true,
  "academicScheduleAllEventsEnabled": false,
  "noticeNotificationsDetail": {
    "news": true,
    "academy": false
  }
}
```

#### GET /v1/members/{id}
특정 회원 공개 프로필 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "firebase_uid",
    "nickname": "홍길동",
    "department": "컴퓨터공학과",
    "photoUrl": "https://..."
  }
}
```

#### DELETE /v1/members/me
회원 탈퇴

- 즉시 탈퇴 정책을 사용합니다.
- `members` row는 soft delete tombstone으로 유지하고 `status=WITHDRAWN`, `withdrawnAt`를 기록합니다.
- 개인정보는 스크럽합니다.
  - `email`은 unique 충돌 방지용 placeholder로 치환
  - `studentId`, `department`, `photoUrl`, `realname`, 계좌 정보는 제거
  - `linked_accounts`, `user_notifications`, `fcm_tokens`, `user_timetables`는 삭제
- Board/Notice 콘텐츠는 보존하고 작성자 표시만 `탈퇴한 사용자`로 익명화합니다.
- TaxiParty는 리더 탈퇴 시 `WITHDRAWED`로 종료되며, 일반 멤버는 `ARRIVED` 파티 참여 중이면 탈퇴할 수 없습니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "회원 탈퇴가 완료되었습니다."
  }
}
```

**Response (탈퇴 불가 상태 — 409 Conflict):**
```json
{
  "success": false,
  "message": "현재 상태에서는 회원 탈퇴를 진행할 수 없습니다.",
  "errorCode": "MEMBER_WITHDRAWAL_NOT_ALLOWED",
  "timestamp": "2026-03-09T12:00:00"
}
```

### 2.4 FCM 토큰

> 구현 완료: Phase 8 (Notification 인프라)

#### POST /v1/members/me/fcm-tokens
FCM 토큰 등록

- 같은 토큰이 이미 존재하면 소유자/플랫폼을 현재 요청 기준으로 갱신합니다.
- `appVersion`은 optional이며, 신규 토큰 등록 시 미전송하면 `null`로 저장합니다.
- 같은 토큰 재등록 시 `appVersion`이 `null` 또는 빈 문자열이면 기존 값을 유지하고, 값이 오면 최신 값으로 갱신합니다.
- 멀티 디바이스를 지원하며, 토큰별 unique 제약을 사용합니다.

**Request:**
```json
{
  "token": "fcm_device_token",
  "platform": "ios",
  "appVersion": "1.4.2"
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

#### DELETE /v1/members/me/fcm-tokens
FCM 토큰 삭제

- 존재하지 않는 토큰이거나 본인 소유가 아니어도 성공 응답을 반환합니다.

**Request:**
```json
{
  "token": "fcm_device_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

#### FCM Raw Push Payload Contract

> Spring 서버는 특정 RN legacy payload에 맞추지 않습니다. 푸시 payload의 `data.type`은 서버 canonical enum을 그대로 사용하고,
> 클라이언트는 명세 기준으로 `type + data`를 해석해 화면 이동을 결정해야 합니다.

- 공통 원칙:
  - `notification.title` / `notification.body`: OS 알림 UI에 표시할 텍스트
  - `data.contractVersion`: 현재 `"1"`
  - `data.type`: canonical `NotificationType` enum (`PARTY_*`, `CHAT_MESSAGE`, `NOTICE`, `APP_NOTICE`, `ACADEMIC_SCHEDULE` 등)
  - `data.*Id`: 클라이언트가 상세 화면 이동 대상을 식별하기 위한 리소스 ID
  - 서버는 RN route/screen 이름을 payload에 넣지 않습니다.

**공통 형태:**
```json
{
  "notification": {
    "title": "새 성결대 학사 공지",
    "body": "2026학년도 1학기 수강신청 정정 안내"
  },
  "data": {
    "contractVersion": "1",
    "type": "NOTICE",
    "noticeId": "notice-uuid"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "notice_channel",
      "sound": "new_notice"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "new_notice.wav"
      }
    }
  }
}
```

**`data` 필드 키:**

| 키 | 설명 | nullable |
|---|---|---|
| `contractVersion` | push payload 계약 버전. 현재 `"1"` | X |
| `type` | canonical 알림 타입 enum | X |
| `partyId` | 파티 알림 계열 이동 식별자 (`CHAT_MESSAGE`는 사용하지 않음) | O |
| `requestId` | 동승 요청 식별자 | O |
| `chatRoomId` | 채팅방 식별자 (`CHAT_MESSAGE` canonical 식별자, 파티 채팅도 동일) | O |
| `postId` | 게시글 식별자 | O |
| `commentId` | 댓글 식별자 | O |
| `noticeId` | 학교 공지 식별자 | O |
| `appNoticeId` | 앱 공지 식별자 | O |
| `academicScheduleId` | 학사 일정 식별자 | O |

**프레젠테이션 프로필 (sound/channel):**

| 알림 그룹 | canonical type | Android | iOS |
|---|---|---|---|
| Party | `PARTY_CREATED`, `PARTY_JOIN_REQUEST`, `PARTY_JOIN_ACCEPTED`, `PARTY_JOIN_DECLINED`, `PARTY_CLOSED`, `PARTY_ARRIVED`, `PARTY_ENDED`, `MEMBER_KICKED`, `SETTLEMENT_COMPLETED` | `channelId=party_channel`, `sound=new_taxi_party` | `aps.sound=new_taxi_party.wav` |
| Chat | `CHAT_MESSAGE` | `channelId=chat_channel`, `sound=new_chat_notification` | `aps.sound=new_chat_notification.wav` |
| Notice | `NOTICE`, `APP_NOTICE`, `ACADEMIC_SCHEDULE` | `channelId=notice_channel`, `sound=new_notice` | `aps.sound=new_notice.wav` |
| Default | `POST_LIKED`, `COMMENT_CREATED` | 별도 channel/sound override 없음 (`priority=high`만 지정) | `aps.sound=default` |

- Android `party_channel`, `chat_channel`, `notice_channel`은 클라이언트가 미리 생성해둔 채널과 이름을 맞춰야 합니다.
- `Default` 그룹은 현재 서버가 별도 `channelId`를 강제하지 않습니다. 전용 기본 채널을 도입하려면 클라이언트와 채널 ID 계약을 함께 추가해야 합니다.

**논리적 이동 대상:**

| `type` | 필수 식별자 | 클라이언트가 여는 논리적 화면 |
|---|---|---|
| `PARTY_CREATED` | `partyId` | 파티 상세 또는 택시 탭 루트 |
| `PARTY_JOIN_REQUEST` | `partyId`, `requestId` | 동승 요청 확인 화면 |
| `PARTY_JOIN_ACCEPTED` / `PARTY_JOIN_DECLINED` | `partyId`, `requestId` | 파티 상세/요청 결과 화면 |
| `PARTY_CLOSED` / `PARTY_ARRIVED` / `PARTY_ENDED` / `MEMBER_KICKED` / `SETTLEMENT_COMPLETED` | `partyId` | 파티 상세 또는 파티 채팅 |
| `CHAT_MESSAGE` | `chatRoomId` | 채팅방 상세 |
| `POST_LIKED` | `postId` | 게시글 상세 |
| `COMMENT_CREATED` (게시글) | `postId`, `commentId` | 게시글 상세 + 댓글 포커스 |
| `COMMENT_CREATED` (공지) | `noticeId`, `commentId` | 공지 상세 + 댓글 포커스 |
| `NOTICE` | `noticeId` | 학교 공지 상세 |
| `APP_NOTICE` | `appNoticeId` | 앱 공지 상세 |
| `ACADEMIC_SCHEDULE` | `academicScheduleId` | 학사 일정 상세 |

**예시: `PARTY_JOIN_ACCEPTED`**
```json
{
  "notification": {
    "title": "동승 요청이 승인되었어요",
    "body": "파티에 합류하세요!"
  },
  "data": {
    "contractVersion": "1",
    "type": "PARTY_JOIN_ACCEPTED",
    "partyId": "party-uuid",
    "requestId": "request-uuid"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "party_channel",
      "sound": "new_taxi_party"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "new_taxi_party.wav"
      }
    }
  }
}
```

**예시: `COMMENT_CREATED`**
```json
{
  "notification": {
    "title": "내 게시글에 댓글이 달렸어요",
    "body": "새 댓글"
  },
  "data": {
    "contractVersion": "1",
    "type": "COMMENT_CREATED",
    "postId": "post-uuid",
    "commentId": "comment-uuid"
  },
  "android": {
    "priority": "high"
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "default"
      }
    }
  }
}
```

### 2.5 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `EMAIL_DOMAIN_RESTRICTED` | 403 | `@sungkyul.ac.kr` 이메일이 아닌 계정으로 로그인 시도 |
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원 |
| `BANK_ACCOUNT_NOT_FOUND` | 404 | 계좌 정보 미등록 상태에서 계좌 공유 시도 |

---

## 3. TaxiParty API

### 3.1 파티 조회

#### GET /v1/parties
파티 목록 조회

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 파티 상태 (OPEN, CLOSED) |
| `departureTime` | datetime | 출발 시간 이후 |
| `departureName` | string | 출발지 검색 |
| `destinationName` | string | 목적지 검색 |

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "leaderId": "leader_uuid",
        "leaderName": "홍길동",
        "leaderPhotoUrl": "https://...",
        "participantSummaries": [
          {
            "id": "leader_uuid",
            "photoUrl": "https://...",
            "nickname": "홍길동",
            "isLeader": true
          },
          {
            "id": "member_uuid_1",
            "photoUrl": null,
            "nickname": "김민수",
            "isLeader": false
          }
        ],
        "departure": {
          "name": "성결대학교",
          "lat": 37.123456,
          "lng": 127.123456
        },
        "destination": {
          "name": "안양역",
          "lat": 37.234567,
          "lng": 127.234567
        },
        "departureTime": "2026-02-03T14:00:00Z",
        "maxMembers": 4,
        "currentMembers": 2,
        "tags": ["빠른출발", "조용한분"],
        "detail": "택시비 나눠요",
        "status": "OPEN",
        "createdAt": "2026-02-03T12:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### GET /v1/parties/{partyId}
파티 상세 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "leaderId": "leader_uuid",
    "leaderName": "홍길동",
    "leaderPhotoUrl": "https://...",
    "departure": {
      "name": "성결대학교",
      "lat": 37.123456,
      "lng": 127.123456
    },
    "destination": {
      "name": "안양역",
      "lat": 37.234567,
      "lng": 127.234567
    },
    "departureTime": "2026-02-03T14:00:00Z",
    "maxMembers": 4,
    "members": [
      {
        "id": "member_uuid",
        "nickname": "홍길동",
        "photoUrl": "https://...",
        "isLeader": true,
        "joinedAt": "2026-02-03T12:00:00Z"
      },
      {
        "id": "member_uuid_2",
        "nickname": "김철수",
        "photoUrl": "https://...",
        "isLeader": false,
        "joinedAt": "2026-02-03T12:30:00Z"
      }
    ],
    "tags": ["빠른출발"],
    "detail": "택시비 나눠요",
    "status": "OPEN",
    "settlement": null,
    "createdAt": "2026-02-03T12:00:00Z"
  }
}
```

#### GET /v1/members/me/parties
내가 참여중인 파티 조회

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "ARRIVED",
      "departure": { ... },
      "destination": { ... },
      "isLeader": true,
      "settlement": {
        "status": "PENDING",
        "taxiFare": 14000,
        "splitMemberCount": 4,
        "perPersonAmount": 3500,
        "settlementTargetMemberIds": ["uuid", "uuid2", "uuid3"],
        "account": {
          "bankName": "카카오뱅크",
          "accountNumber": "3333-01-1234567",
          "accountHolder": "홍*동",
          "hideName": true
        },
        "memberSettlements": [
          {
            "memberId": "uuid",
            "displayName": "홍길동",
            "settled": true,
            "settledAt": "2026-02-03T14:30:00Z",
            "leftParty": false,
            "leftAt": null
          },
          {
            "memberId": "uuid2",
            "displayName": "김철수",
            "settled": false,
            "settledAt": null,
            "leftParty": true,
            "leftAt": "2026-02-03T14:40:00Z"
          }
        ]
      }
    }
  ]
}
```

#### GET /v1/members/me/taxi-history
택시 이용 내역 화면 전용 목록 조회

- `OPEN`, `CLOSED` 파티는 제외하고 `ARRIVED`, `ENDED` 상태만 반환합니다.
- `departureLabel`은 `parties.departure_name`, `arrivalLabel`은 `parties.destination_name`을 사용합니다.
- `dateTime`은 모든 history 항목에서 `parties.departure_time`을 사용합니다.
- `passengerCount`는 현재 파티 멤버 수(`parties.current_members`, 리더 포함)입니다.
- `paymentAmount`는 정산 정보가 있는 경우 `parties.per_person_amount`, 없으면 `null`입니다.
- `role`은 서버가 `leader_id == me` 여부로 `LEADER` / `MEMBER`를 최종 판단합니다.
- 외부 `status` 매핑:
  - `ARRIVED` → `COMPLETED`
  - `ENDED + FORCE_ENDED` → `COMPLETED`
  - `ENDED + ARRIVED`(레거시 종료 사유) → `COMPLETED`
  - `ENDED + TIMEOUT` → `settlement_status/taxi_fare/per_person_amount`가 있으면 `COMPLETED`, 없으면 `CANCELLED`
  - `ENDED + CANCELLED` / `ENDED + WITHDRAWED` → `CANCELLED`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "party-20260304-001",
      "departureLabel": "성결대학교",
      "arrivalLabel": "안양역",
      "dateTime": "2026-03-04T21:00:00",
      "passengerCount": 3,
      "paymentAmount": 5000,
      "role": "LEADER",
      "status": "COMPLETED"
    },
    {
      "id": "party-20260303-101",
      "departureLabel": "성결대학교",
      "arrivalLabel": "범계역",
      "dateTime": "2026-03-03T18:30:00",
      "passengerCount": 2,
      "paymentAmount": null,
      "role": "MEMBER",
      "status": "CANCELLED"
    }
  ]
}
```

#### GET /v1/members/me/taxi-history/summary
마이페이지/택시 이용 내역 상단 요약 조회

- `totalRideCount`는 취소 포함 전체 history 항목 수입니다.
- `completedRideCount`는 위 history 목록과 동일한 기준에서 외부 `status = COMPLETED`인 항목 수입니다.
- `savedFareAmount`는 동일한 completed 항목에 대해 `(taxiFare - perPersonAmount)`를 합산한 값입니다.
  - 혼자 탔다면 전체 `taxiFare`를 냈을 것으로 가정하고, 동승으로 줄어든 본인 부담 금액만 절약액으로 계산합니다.
  - 취소 항목과 정산 정보가 없는 항목은 합산하지 않습니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRideCount": 5,
    "completedRideCount": 4,
    "savedFareAmount": 9374
  }
}
```

### 3.2 파티 생성/관리

#### POST /v1/parties
파티 생성

**Request:**
```json
{
  "departure": {
    "name": "성결대학교",
    "lat": 37.123456,
    "lng": 127.123456
  },
  "destination": {
    "name": "안양역",
    "lat": 37.234567,
    "lng": 127.234567
  },
  "departureTime": "2026-02-03T14:00:00Z",
  "maxMembers": 4,
  "tags": ["빠른출발"],
  "detail": "택시비 나눠요"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "created_party_uuid",
    "chatRoomId": "party:created_party_uuid"
  }
}
```

#### PATCH /v1/parties/{partyId}
파티 수정 (리더만)

- 수정 가능 상태: `OPEN`, `CLOSED`
- 수정 가능 필드(화이트리스트): `departureTime`, `detail`
- `maxMembers` 포함 또는 허용되지 않은 필드 포함 시 `422 VALIDATION_ERROR`
- `departureTime`, `detail` 모두 누락 시 `422 VALIDATION_ERROR`
- `departureTime`은 현재 이후 시각이어야 함 (`@Future`)
- `CLOSED` 상태에서 시간/상세 수정 시에도 상태는 `CLOSED` 유지 (`reopen`으로만 모집 재개)
- 동승 요청(`PENDING`)과 기존 참여 멤버는 자동 취소/재동의 처리 없이 유지
- 응답은 최신 파티 상세(`PartyDetailResponse`) 반환

**Request:**
```json
{
  "departureTime": "2026-02-03T14:30:00",
  "detail": "10분 후 출발합니다."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "party_uuid",
    "status": "OPEN",
    "departureTime": "2026-02-03T14:30:00",
    "detail": "10분 후 출발합니다."
  }
}
```

**에러 코드 (update 전용):**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `NOT_PARTY_LEADER` | 403 | 리더가 아닌 사용자가 수정 시도 |
| `INVALID_PARTY_STATE_TRANSITION` | 409 | OPEN/CLOSED 상태가 아닌 파티 수정 시도 |
| `VALIDATION_ERROR` | 422 | 허용되지 않은 필드 포함 또는 수정 필드 누락/형식 오류 |

#### PATCH /v1/parties/{partyId}/close
파티 모집 마감 (리더만)

- 성공 시 파티 채팅방에 서버 생성 `SYSTEM` 메시지 `"모집이 마감되었어요."`가 추가됩니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CLOSED"
  }
}
```

#### PATCH /v1/parties/{partyId}/reopen
파티 모집 재개 (리더만)

- 성공 시 파티 채팅방에 서버 생성 `SYSTEM` 메시지 `"모집이 재개되었어요."`가 추가됩니다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "OPEN"
  }
}
```

#### PATCH /v1/parties/{partyId}/arrive
도착 및 정산 시작 (리더만)

- OPEN 또는 CLOSED 상태에서만 호출 가능
- 요청 본문에는 `taxiFare`, `settlementTargetMemberIds`, `account` snapshot이 모두 포함되어야 함
- `settlementTargetMemberIds`에는 현재 파티의 non-leader 멤버만 포함할 수 있음
- 리더를 제외한 멤버가 1명 이상 선택되어야 함 (정산 대상이 없으면 호출 불가)
- `splitMemberCount = settlementTargetMemberIds.size + 1` 이며 리더도 1/N 분모에 포함
- `perPersonAmount = taxiFare / splitMemberCount` 정수 나눗셈(버림)으로 계산
- 정수 나눗셈으로 생기는 잔여 1원 단위 금액은 서버에서 자동 분배하지 않음
- 성공 시 파티 상태/정산 snapshot 저장과 함께 파티 채팅방에 서버 생성 `ARRIVED` 메시지가 남음

**Request:**
```json
{
  "taxiFare": 14000,
  "settlementTargetMemberIds": ["member-2", "member-3"],
  "account": {
    "bankName": "카카오뱅크",
    "accountNumber": "3333-01-1234567",
    "accountHolder": "홍길동",
    "hideName": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ARRIVED",
    "settlement": {
      "status": "PENDING",
      "taxiFare": 14000,
      "splitMemberCount": 3,
      "perPersonAmount": 4666,
      "settlementTargetMemberIds": ["member-2", "member-3"],
      "account": {
        "bankName": "카카오뱅크",
        "accountNumber": "3333-01-1234567",
        "accountHolder": "홍*동",
        "hideName": true
      },
      "memberSettlements": [ ... ]
    }
  }
}
```

- `memberSettlements[*].displayName`은 ARRIVED 시점에 확정된 표시 이름 snapshot입니다.
- `memberSettlements[*].leftParty=true`이면 현재 파티 멤버에서는 제거되었지만 정산 대상에는 남아 있는 멤버입니다.
- ARRIVED 이후 멤버가 나가더라도 `taxiFare`, `perPersonAmount`, `splitMemberCount`, `settlementTargetMemberIds`는 재계산하지 않습니다.

**에러 코드 (arrive 전용):**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `PARTY_NOT_ARRIVABLE` | 409 | OPEN/CLOSED 상태가 아닌 파티 |
| `NO_MEMBERS_TO_SETTLE` | 409 | 리더 외 멤버가 없어 정산 불가 |
| `VALIDATION_ERROR` | 422 | `settlementTargetMemberIds`가 현재 non-leader 멤버 목록과 다르거나 `account` snapshot 검증 실패 |

#### PATCH /v1/parties/{partyId}/settlement/members/{memberId}/confirm
멤버 정산 완료 표시 (리더만)

- 파티 리더가 특정 멤버의 정산 상태를 `settled=true`로 확정합니다.
- 앱 내 결제/송금 기능은 제공하지 않으며, 향후에도 제공하지 않습니다.
- 일반 멤버는 자신의 정산 상태를 직접 변경할 수 없고, 리더가 실제 입금 확인 후 호출합니다.
- 모든 멤버의 정산이 완료되면 `allSettled=true`를 반환하고 정산 상태만 `COMPLETED`로 변경됩니다.
- 파티 상태를 `ENDED`로 바꾸려면 리더가 별도로 `PATCH /v1/parties/{partyId}/end`를 호출해야 합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "memberId": "member_uuid",
    "settled": true,
    "settledAt": "2026-02-03T14:30:00Z",
    "allSettled": true
  }
}
```

> **`allSettled: true`** 는 "모든 정산 확인 완료"를 의미합니다.
> 이 시점에도 파티 상태는 `ARRIVED`를 유지하며, 종료는 리더의 `/end` 호출에서만 발생합니다.

#### PATCH /v1/parties/{partyId}/end
파티 강제 종료 (리더만, 정산 미완료 상태에서도 가능)

- ARRIVED 상태에서만 호출 가능
- 미정산 멤버가 남아 있더라도 리더가 강제로 파티를 종료할 수 있음
- `endReason: FORCE_ENDED`로 기록

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ENDED",
    "endReason": "FORCE_ENDED"
  }
}
```

#### POST /v1/parties/{partyId}/cancel
파티 취소 (리더만)

- OPEN 또는 CLOSED 상태에서만 가능 (ARRIVED 상태 불가)
- 파티 상태 → `ENDED`, `endReason: CANCELLED`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ENDED",
    "endReason": "CANCELLED"
  }
}
```

**에러 코드:**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `PARTY_NOT_CANCELABLE` | 409 | ARRIVED 상태에서 취소 불가 |

### 3.3 멤버 관리

#### DELETE /v1/parties/{partyId}/members/me
파티 나가기 (멤버)

- 리더는 나가기 불가 (취소 또는 위임 불가 정책)
- 일반 멤버는 `OPEN`, `CLOSED`, `ARRIVED` 상태에서 나갈 수 있음
- `ENDED` 상태에서는 나가기 불가
- `ARRIVED` 상태에서 나가면 현재 파티 멤버에서는 제거되지만, ARRIVED 시점에 확정된 정산 snapshot은 유지됩니다.
  - `settlementTargetMemberIds`, `taxiFare`, `perPersonAmount`, `splitMemberCount` 재계산 없음
  - `memberSettlements[*].leftParty`, `leftAt`, `displayName`으로 이탈 멤버를 식별
  - 리더는 나간 정산 대상 멤버에 대해서도 계속 `confirmSettlement` 가능
- 리더가 탈퇴(회원탈퇴)하면 파티 강제 종료 (`endReason: WITHDRAWED`)
- 성공 시 파티 채팅방에 서버 생성 `SYSTEM` 메시지 `"홍길동님이 나갔어요."`가 추가됩니다. 닉네임이 비어 있거나 찾지 못하면 `"멤버가 나갔어요."`를 사용합니다.

**Response:**
```json
{
  "success": true
}
```

**에러 코드:**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `LEADER_CANNOT_LEAVE` | 409 | 리더는 나가기 불가 |
| `PARTY_ENDED` | 409 | 이미 종료된 파티에서는 나갈 수 없음 |

#### DELETE /v1/parties/{partyId}/members/{memberId}
멤버 강퇴 (리더만)

- OPEN 또는 CLOSED 상태에서만 가능 (ARRIVED 상태 불가)
- 리더 본인은 강퇴 불가

**Response:**
```json
{
  "success": true
}
```

**에러 코드:**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `CANNOT_KICK_IN_ARRIVED` | 409 | ARRIVED 상태에서 강퇴 불가 |
| `CANNOT_KICK_LEADER` | 400 | 리더 본인 강퇴 불가 |

### 3.4 동승 요청

#### GET /v1/parties/{partyId}/join-requests
파티의 동승 요청 목록 (리더만)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "request_uuid",
      "partyId": "party_uuid",
      "requesterId": "user_uuid",
      "requesterName": "김철수",
      "requesterPhotoUrl": "https://...",
      "status": "PENDING",
      "createdAt": "2026-02-03T12:30:00Z"
    }
  ]
}
```

#### POST /v1/parties/{partyId}/join-requests
동승 요청 생성

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "request_uuid",
    "status": "PENDING"
  }
}
```

#### GET /v1/members/me/join-requests
내가 보낸 동승 요청 목록

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 요청 상태 (PENDING, ACCEPTED, DECLINED, CANCELED) |

#### PATCH /v1/join-requests/{requestId}/accept
동승 요청 수락 (리더만)

- 요청 수락으로 파티 인원이 정원(`maxMembers`)에 도달하면 파티 상태는 자동으로 `CLOSED` 전이됩니다.
- 성공 시 파티 채팅방에 서버 생성 `SYSTEM` 메시지 `"{requesterName}님이 입장했어요."`가 추가됩니다. 닉네임이 비어 있거나 찾지 못하면 `"새 멤버가 입장했어요."`를 사용합니다.
- 정원 도달로 자동 `CLOSED` 되면 같은 트랜잭션 안에서 위 합류 안내 뒤에 `"모집이 마감되었어요."` `SYSTEM` 메시지가 추가됩니다.
- 실시간 브로드캐스트는 `합류 안내 -> 모집 마감 안내` 순서로 수행됩니다.
- history 조회는 기본 정렬이 `createdAt DESC`라서 더 나중에 저장된 모집 마감 메시지가 먼저 보일 수 있으며, 같은 `createdAt`인 경우에도 서버가 저장 순서를 기준으로 결정적으로 tie-break 합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "request_uuid",
    "status": "ACCEPTED",
    "partyId": "party_uuid"
  }
}
```

#### PATCH /v1/join-requests/{requestId}/decline
동승 요청 거절 (리더만)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "request_uuid",
    "status": "DECLINED"
  }
}
```

#### PATCH /v1/join-requests/{requestId}/cancel
동승 요청 취소 (요청자)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "request_uuid",
    "status": "CANCELED"
  }
}
```

### 3.5 에러 코드

| 에러 코드 | 설명 |
|----------|------|
| `PARTY_NOT_FOUND` | 파티를 찾을 수 없음 |
| `PARTY_FULL` | 파티 정원 초과 |
| `PARTY_CLOSED` | 모집 마감된 파티 |
| `PARTY_ENDED` | 이미 종료된 파티 |
| `NOT_PARTY_LEADER` | 리더 권한 필요 |
| `NOT_PARTY_MEMBER` | 파티 멤버가 아님 |
| `ALREADY_IN_PARTY` | 이미 다른 파티에 참여 중 |
| `ALREADY_REQUESTED` | 이미 동승 요청함 |
| `REQUEST_NOT_FOUND` | 동승 요청을 찾을 수 없음 |
| `REQUEST_ALREADY_PROCESSED` | 이미 처리된 요청 |
| `SETTLEMENT_NOT_COMPLETED` | 정산이 완료되지 않음 |
| `ALREADY_SETTLED` | 이미 정산 완료 처리됨 |
| `PARTY_NOT_ARRIVABLE` | OPEN/CLOSED 상태가 아닌 파티 (arrive 호출 불가) |
| `PARTY_NOT_CANCELABLE` | ARRIVED 상태에서 취소 불가 |
| `NO_MEMBERS_TO_SETTLE` | 정산 대상 멤버 없음 (리더만 남은 파티) |
| `LEADER_CANNOT_LEAVE` | 리더는 파티 나가기 불가 |
| `CANNOT_KICK_IN_ARRIVED` | ARRIVED 상태에서 강퇴 불가 |
| `CANNOT_KICK_LEADER` | 리더 본인 강퇴 불가 |
| `INVALID_PARTY_STATE_TRANSITION` | 허용되지 않는 파티 상태 전이 |
| `PARTY_CONCURRENT_MODIFICATION` | 동시 요청 충돌 발생 |

---

## 4. Chat API

### 4.1 채팅방 조회 / 공개방 멤버십

#### 공개방 기본 정책

- 공식 공개방 seed:
  - 학교 전체방 1개: `성결대학교 전체 채팅방`
  - 마인크래프트방 1개: `마인크래프트 채팅방`
  - 학과방: `{학과명} 채팅방`
- 노출 규칙:
  - `UNIVERSITY`, `GAME`, `CUSTOM` 공개방은 모든 사용자에게 보입니다.
  - `DEPARTMENT` 공개방은 본인 `department`와 일치하는 방만 보이고, 다른 학과 방은 목록/상세에서 숨깁니다.
  - `PARTY`는 공개방이 아니며 참여 중인 멤버에게만 보입니다.
- 미참여 공개방 정책:
  - 목록/상세에는 보입니다.
  - `description`, `lastMessage`, `lastMessageAt`, `memberCount`는 보입니다.
  - `joined=false`, `unreadCount=0`, `isMuted=false`로 내려갑니다.
  - `GET /v1/chat-rooms/{id}/messages`는 `NOT_CHAT_ROOM_MEMBER`를 반환합니다.
- 정렬 정책:
  - 서버가 최종 UI 정렬을 강제하지는 않습니다.
  - 프론트는 `type`, `joined`, `lastMessageAt` 메타데이터로 `학교 전체방 → 학과방 → 마인크래프트방 → joined custom → not joined custom` 정렬을 구성할 수 있습니다.

#### GET /v1/chat-rooms
접근 가능한 채팅방 목록

- 기본 정책: `보이는 공개 채팅방 + 내가 참여 중인 비공개 채팅방(PARTY 포함)`을 반환합니다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `type` | string | 채팅방 타입 (UNIVERSITY, DEPARTMENT, GAME, CUSTOM, PARTY) |
| `joined` | boolean | `true`면 참여 중인 채팅방만 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "public:university",
      "type": "UNIVERSITY",
      "name": "성결대학교 전체 채팅방",
      "description": "성결대학교 전체 채팅방입니다.",
      "isPublic": true,
      "memberCount": 150,
      "joined": false,
      "unreadCount": 0,
      "lastMessage": {
        "type": "TEXT",
        "text": "안녕하세요!",
        "senderName": "홍길동",
        "createdAt": "2026-02-03T12:00:00Z"
      },
      "lastMessageAt": "2026-02-03T12:00:00Z",
      "isMuted": false
    },
    {
      "id": "room_uuid",
      "type": "CUSTOM",
      "name": "시험기간 밤샘 메이트",
      "description": "기말고사 기간 같이 공부할 사람들 모여요.",
      "isPublic": true,
      "memberCount": 24,
      "joined": true,
      "unreadCount": 3,
      "lastMessage": {
        "type": "TEXT",
        "text": "중앙도서관 4층 자리 남아요.",
        "senderName": "김성결",
        "createdAt": "2026-02-03T23:10:00Z"
      },
      "lastMessageAt": "2026-02-03T23:10:00Z",
      "isMuted": false
    }
  ]
}
```

#### POST /v1/chat-rooms
커스텀 공개 채팅방 생성

**Request:**
```json
{
  "name": "시험기간 밤샘 메이트",
  "description": "기말고사 기간 같이 공부할 사람들 모여요."
}
```

**정책:**
- 생성 가능한 타입은 `CUSTOM` 고정입니다.
- 생성된 채팅방은 `isPublic=true` 공개 탐색 방입니다.
- 생성자는 즉시 `joined=true` 상태가 되며, `memberCount`는 1로 시작합니다.
- `members`에 가입 완료된 활성 회원만 생성할 수 있습니다. 미가입 UID는 `MEMBER_NOT_FOUND`를 반환합니다.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "room_uuid",
    "type": "CUSTOM",
    "name": "시험기간 밤샘 메이트",
    "description": "기말고사 기간 같이 공부할 사람들 모여요.",
    "isPublic": true,
    "memberCount": 1,
    "joined": true,
    "unreadCount": 0,
    "lastMessage": null,
    "lastMessageAt": null,
    "isMuted": false,
    "lastReadAt": null
  }
}
```

#### GET /v1/chat-rooms/{chatRoomId}
채팅방 상세

- 공개 채팅방은 `joined=false`여도 상세 조회할 수 있습니다.
- 비공개 채팅방은 멤버만 조회 가능합니다.
- 다른 학과 공개방은 `CHAT_ROOM_NOT_FOUND`로 숨깁니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "public:university",
    "type": "UNIVERSITY",
    "name": "성결대학교 전체 채팅방",
    "description": "성결대학교 전체 채팅방입니다.",
    "isPublic": true,
    "memberCount": 150,
    "joined": false,
    "unreadCount": 0,
    "lastMessage": {
      "type": "TEXT",
      "text": "안녕하세요!",
      "senderName": "홍길동",
      "createdAt": "2026-02-03T12:00:00Z"
    },
    "lastMessageAt": "2026-02-03T12:00:00Z",
    "isMuted": false,
    "lastReadAt": null
  }
}
```

#### POST /v1/chat-rooms/{chatRoomId}/join
공개 채팅방 참여

- 참여하기 버튼을 누르면 즉시 참여합니다.
- 이미 참여 중이면 `409 ALREADY_CHAT_ROOM_MEMBER`
- 정원이 있는 방에서 가득 찼으면 `409 CHAT_ROOM_FULL`
- 참여 직후 `unreadCount`는 0으로 시작하도록 `lastReadAt`을 현재 방의 마지막 메시지 시각으로 초기화합니다.
- `members`에 가입 완료된 활성 회원만 참여할 수 있습니다. 미가입 UID는 `MEMBER_NOT_FOUND`를 반환합니다.

#### DELETE /v1/chat-rooms/{chatRoomId}/members/me
공개 채팅방 나가기

- 모든 공개 채팅방은 나갈 수 있습니다.
- 나간 뒤에도 공개방 상세 조회는 계속 가능합니다.
- 나간 뒤 `joined=false`, `unreadCount=0`, `isMuted=false` 상태가 됩니다.

#### 학과 변경 정책

- `PATCH /v1/members/me`에서 `department`가 바뀌면 기존 학과방 membership은 자동 제거합니다.
- 새 학과방 membership은 자동 생성하지 않습니다.
- 다음 refresh/재진입 시 기존 학과방은 목록에서 제거되고 접근할 수 없습니다.

#### GET /v1/chat-rooms/{chatRoomId}/messages
채팅 메시지 조회

- `joined=true`인 경우에만 조회할 수 있습니다.
- 공개 채팅방이라도 미참여 상태면 `403 NOT_CHAT_ROOM_MEMBER`
- 각 메시지는 `senderPhotoUrl`을 포함합니다.
- 앱 사용자 메시지는 `members.photo_url`을 사용하고, 값이 없으면 명시적 `null`입니다.
- Minecraft origin 메시지는 `minecraftUuid` 기준 Minotar URL을 사용합니다. Bedrock은 Steve UUID fallback을 사용합니다.
- `linked_accounts.photo_url` fallback은 사용하지 않습니다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `cursorCreatedAt` | datetime | 다음 페이지 시작 기준 createdAt (nullable, `cursorId`와 쌍) |
| `cursorId` | string | 다음 페이지 시작 기준 messageId (nullable, `cursorCreatedAt`와 쌍) |
| `size` | int | 페이지 크기 (기본 50, 최대 100) |

**정렬/커서 규칙:**
- 정렬은 `createdAt DESC` 고정이며, 같은 `createdAt`에서는 서버 내부 저장 순서 tie-breaker를 사용해 결정적으로 정렬합니다.
- 다음 페이지 조회 조건은 아래와 같습니다.
  - `createdAt < cursorCreatedAt`
  - 또는 `createdAt == cursorCreatedAt AND cursorId`가 가리키는 메시지보다 내부 저장 순서상 더 오래된 메시지
- `nextCursor`는 현재 페이지의 마지막 메시지 `(createdAt, id)`로 생성됩니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_uuid",
        "chatRoomId": "room_id",
        "senderId": "user_uuid",
        "senderName": "홍길동",
        "senderPhotoUrl": "https://cdn.skuri.app/uploads/profiles/profile.jpg",
        "text": "안녕하세요!",
        "type": "TEXT",
        "createdAt": "2026-02-03T12:00:00Z"
      },
      {
        "id": "message_uuid_2",
        "chatRoomId": "room_id",
        "senderId": "user_uuid_2",
        "senderName": "시스템",
        "senderPhotoUrl": null,
        "text": "홍길동님이 입장했습니다.",
        "type": "SYSTEM",
        "createdAt": "2026-02-03T11:59:00Z"
      }
    ],
    "hasNext": true,
    "nextCursor": {
      "createdAt": "2026-02-03T11:59:00Z",
      "id": "message_uuid_2"
    }
  }
}
```

### 4.2 채팅방 사용자 상태

#### PATCH /v1/chat-rooms/{chatRoomId}/settings
채팅방 설정 (음소거 등)

**Request:**
```json
{
  "muted": true
}
```

#### PATCH /v1/chat-rooms/{chatRoomId}/read
읽음 처리

- 클라이언트는 채팅방 포커스 획득/이탈, 앱 백그라운드 전환 시점마다 `lastReadAt`을 갱신합니다.
- 요청 `lastReadAt`은 아래 형식을 모두 허용합니다.
  - timezone 없는 `LocalDateTime` 문자열: `2026-03-25T21:36:29`, `2026-03-25T21:36:29.837`, `2026-03-25T21:36:29.837407`
  - UTC/Z 문자열: `2026-03-25T12:36:29Z`, `2026-03-25T12:36:29.837Z`
  - offset 포함 ISO 8601 문자열: `2026-03-25T21:36:29+09:00`
- 프론트가 채팅 메시지 `createdAt` 값을 그대로 `lastReadAt`으로 보내는 현재 앱 입력도 서버가 그대로 수용합니다.
- 서버는 요청 문자열을 절대 시각으로 해석한 뒤 `Asia/Seoul` 기준 `LocalDateTime`으로 정규화하여 비교/저장합니다.
- timezone 없는 값은 `Asia/Seoul` 기준 로컬 시각으로 해석하고, `Z`/offset 값은 해당 절대 시각을 그대로 사용합니다.
- 서버는 저장된 `lastReadAt`보다 과거 시각 요청을 무시해 단조 증가를 보장하고, 미래 시각 요청은 서버 현재 시각과 마지막 메시지 시각을 상한으로 clamp합니다.
- 미읽음 계산 기준은 `message.createdAt > lastReadAt` 입니다. (`==` 는 읽음으로 간주)
- `PATCH /read` 응답과 채팅방 detail의 `lastReadAt`도 ISO 8601 UTC 문자열로 반환합니다.

**Request:**
```json
{
  "lastReadAt": "2026-03-25T21:36:29.837407"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chatRoomId": "public:university",
    "lastReadAt": "2026-03-25T12:36:29.837407Z",
    "updated": true
  }
}
```

### 4.3 메시지 전송 정책

> 채팅 메시지 **전송**은 WebSocket(STOMP)으로만 수행합니다. (§4.5 참고)

### 4.4 파티 채팅 (TaxiParty 도메인에서 관리)

파티 채팅 메시지 **전송**은 WebSocket(STOMP)으로만 수행합니다. (§4.5 참고)
파티 채팅 비즈니스 규칙(멤버 검증, 계좌 정보 조회 등)은 서버 내부 STOMP 핸들러에서 처리합니다.
- 파티 채팅 이력 조회는 `GET /v1/chat-rooms/{chatRoomId}/messages`를 사용합니다.
  - 예: `chatRoomId = party:{partyId}`
- 서버 생성 안내 메시지(`SYSTEM`/`ARRIVED`/`END`)도 동일한 조회/구독 경로로 전달됩니다.
- 동승 요청 수락/멤버 나가기 안내도 서버 생성 `SYSTEM` 메시지로만 저장/브로드캐스트되며, 클라이언트가 직접 전송하지 않습니다.
- 동승 요청 수락으로 파티가 정원에 도달하면 `SYSTEM` 메시지는 `합류 안내 -> 모집 마감 안내` 순서로 저장되고, 같은 순서로 브로드캐스트됩니다.

### 4.5 WebSocket (STOMP)

모든 채팅 메시지 **전송 및 실시간 수신**은 WebSocket(STOMP)을 통해 수행합니다.
채팅방 목록 화면은 방별 다중 구독이 아닌 **사용자 전용 요약 채널 1개**를 구독합니다.

#### STOMP Endpoint
- SockJS endpoint: `/ws`
- Native WebSocket endpoint: `/ws-native`
- 권장 사용:
  - 웹/SockJS 클라이언트: `/ws`
  - React Native native WebSocket 클라이언트: `/ws-native`
- React Native는 SockJS transport path인 `/ws/websocket` 우회 경로 대신 `/ws-native`를 사용합니다.

#### 연결 인증
연결 시 STOMP CONNECT 프레임 헤더에 Firebase ID Token을 포함합니다.

```
CONNECT
accept-version:1.2
Authorization:Bearer <firebase_id_token>

^@
```

> Spring의 `@MessageMapping` 핸들러에서 `Principal` 객체로 `uid`를 추출합니다.
> 연결 인증 성공 후에는 추가 토큰 검증 없이 세션을 유지합니다.

#### 연결 후 인가(Authorization)

- `SEND /app/chat/{chatRoomId}`: 해당 채팅방 멤버만 전송 가능
- `SUBSCRIBE /topic/chat/{chatRoomId}`: 해당 채팅방 멤버만 구독 가능
- 비멤버 요청은 `NOT_CHAT_ROOM_MEMBER` 에러로 거부됩니다.

#### 구독 토폴로지 (중요)

- 채팅방 목록 화면: `SUBSCRIBE /user/queue/chat-rooms` 1개만 구독
- 채팅방 상세 화면: 진입한 방에 한해 `SUBSCRIBE /topic/chat/{chatRoomId}` 구독
- STOMP 에러 수신: `SUBSCRIBE /user/queue/errors`
- 상세 화면 이탈 시 해당 room topic 구독을 즉시 해제
- 모든 채팅방 topic을 동시에 구독하는 방식은 사용하지 않음

---

#### 일반 채팅

| 방향 | 경로 | 설명 |
|------|------|------|
| 수신 (Subscribe) | `/user/queue/chat-rooms` | 내 채팅방 목록 카드 요약(이름/인원/마지막 메시지/미읽음) 수신 |
| 전송 (Publish) | `/app/chat/{chatRoomId}` | 메시지 전송 |
| 수신 (Subscribe) | `/topic/chat/{chatRoomId}` | 실시간 메시지 수신 |

**전송 포맷:**
```json
{ "type": "TEXT", "text": "안녕하세요!" }
{ "type": "IMAGE", "imageUrl": "https://..." }
```

- `IMAGE` 메시지의 `imageUrl`은 `POST /v1/images`의 `CHAT_IMAGE` 업로드 결과 URL을 그대로 사용합니다.
- 실시간 수신 payload와 `GET /v1/chat-rooms/{chatRoomId}/messages`의 `messages[]` item shape는 동일합니다.
- 일반 채팅 메시지의 `senderPhotoUrl`은 앱 사용자 메시지는 `members.photo_url`, Minecraft origin 메시지는 Minotar URL을 사용합니다.

**채팅방 목록 요약 이벤트 포맷 (서버 → 클라이언트):**
```json
{
  "eventType": "CHAT_ROOM_UPSERT",
  "chatRoomId": "room_uuid",
  "name": "컴공 24학번",
  "memberCount": 42,
  "unreadCount": 3,
  "lastMessage": {
    "type": "TEXT",
    "text": "오늘 과제 어디까지 했어?",
    "senderName": "홍길동",
    "createdAt": "2026-02-03T12:00:00Z"
  },
  "updatedAt": "2026-02-03T12:00:00Z"
}
```

> `eventType`은 `CHAT_ROOM_SNAPSHOT`, `CHAT_ROOM_UPSERT`, `CHAT_ROOM_REMOVED`를 사용합니다.
> `/user/queue/chat-rooms`는 joined room summary 기준 채널이며, 미참여 공개방 탐색 목록은 `GET /v1/chat-rooms` refresh 기준으로 유지합니다.

---

#### 파티 채팅

- 파티 채팅도 동일 경로를 사용합니다.
  - 전송: `/app/chat/party:{partyId}`
  - 수신: `/topic/chat/party:{partyId}`
- 클라이언트가 직접 보낼 수 있는 타입: `TEXT`, `IMAGE`, `ACCOUNT`
- 서버가 생성하는 타입: `SYSTEM`, `ARRIVED`, `END`
- 파티 채팅의 `SYSTEM`/`ARRIVED`/`END`는 도메인 이벤트(동승 승인, 멤버 나가기, 도착 처리, 취소/종료) 기준으로만 생성됨
- `SYSTEM` 메시지 예: 동승 승인, 모집 마감, 모집 재개, 멤버 나가기
- 파티 채팅 `CHAT_MESSAGE` push payload의 canonical 식별자는 항상 `chatRoomId`이며, 파티 채팅이라고 해서 별도 `partyId`를 추가하지 않습니다.
- 파티 채팅 실시간 수신 payload와 `GET /v1/chat-rooms/{chatRoomId}/messages`의 `messages[]` item shape는 동일합니다.
- 파티 채팅 메시지의 `senderPhotoUrl`은 `members.photo_url`을 사용하며, 사진이 없으면 `null`입니다.

**전송 포맷:**
```json
{ "type": "TEXT", "text": "곧 도착합니다!" }
{
  "type": "ACCOUNT",
  "account": {
    "bankName": "카카오뱅크",
    "accountNumber": "3333-01-1234567",
    "accountHolder": "홍길동",
    "hideName": true,
    "remember": true
  }
}
```
> `ACCOUNT` 타입: 계좌 snapshot을 payload로 전달합니다.
> `remember=true`이면 전송한 snapshot을 회원 프로필 계좌 정보에도 함께 저장합니다.
> 클라이언트가 `SYSTEM`, `ARRIVED`, `END`를 직접 보내면 `INVALID_REQUEST`로 거부됩니다.

**파티 채팅 `CHAT_MESSAGE` 알림 포맷 정책:**

| 메시지 타입 | title 예시 | body 예시 | data |
|---|---|---|---|
| `TEXT` | `명학역 → 성결대학교 파티 채팅방` | `홍길동 : 안녕하세요` | `chatRoomId=party:party_uuid` |
| `IMAGE` | `명학역 → 성결대학교 파티 채팅방` | `홍길동 : 사진을 보냈어요.` | `chatRoomId=party:party_uuid` |
| `ACCOUNT` | `명학역 → 성결대학교 파티 채팅방` | `홍길동 : 계좌 정보를 공유했어요. (카카오뱅크 3333-01-1234567)` | `chatRoomId=party:party_uuid` |
| `SYSTEM` (일반 안내) | `파티 안내 메시지` | `김철수님이 나갔어요.` | `chatRoomId=party:party_uuid` |

> 파티 채팅의 멤버 입장/퇴장 `SYSTEM` 메시지(`"{nickname}님이 입장했어요."`, `"{nickname}님이 나갔어요."`, fallback 포함)는 히스토리와 STOMP에는 노출되지만 `CHAT_MESSAGE` push는 보내지 않습니다.
> `SYSTEM`의 `"모집이 마감되었어요."`, `"모집이 재개되었어요."`, `ARRIVED`, `END` 메시지는 각각 `PARTY_CLOSED`, `PARTY_REOPENED`, `PARTY_ARRIVED`, `PARTY_ENDED` 도메인 알림으로만 푸시되며, 중복 `CHAT_MESSAGE` push는 보내지 않습니다.

**수신 포맷 (서버 → 클라이언트):**
```json
{
  "id": "message_uuid",
  "chatRoomId": "party:party_uuid",
  "senderId": "user_uuid",
  "senderName": "홍길동",
  "senderPhotoUrl": "https://cdn.skuri.app/uploads/profiles/profile.jpg",
  "type": "ACCOUNT",
  "text": "계좌 정보를 공유했어요. (카카오뱅크 3333-01-1234567)",
  "accountData": {
    "bankName": "카카오뱅크",
    "accountNumber": "3333-01-1234567",
    "accountHolder": "홍*동",
    "hideName": true
  },
  "createdAt": "2026-02-03T12:00:00Z"
}
```

```json
{
  "id": "message_uuid_2",
  "chatRoomId": "party:party_uuid",
  "senderId": "leader_uuid",
  "senderName": "홍길동",
  "senderPhotoUrl": null,
  "type": "ARRIVED",
  "text": "택시가 목적지에 도착했어요. 총 14000원, 3명 정산, 1인당 4666원입니다.",
  "arrivalData": {
    "taxiFare": 14000,
    "splitMemberCount": 3,
    "perPersonAmount": 4666,
    "settlementTargetMemberIds": ["member-2", "member-3"],
    "memberSettlements": [
      {
        "memberId": "member-2",
        "displayName": "김철수",
        "settled": false,
        "settledAt": null,
        "leftParty": false,
        "leftAt": null
      },
      {
        "memberId": "member-3",
        "displayName": "이영희",
        "settled": true,
        "settledAt": "2026-02-03T12:12:00Z",
        "leftParty": true,
        "leftAt": "2026-02-03T12:20:00Z"
      }
    ],
    "accountData": {
      "bankName": "카카오뱅크",
      "accountNumber": "3333-01-1234567",
      "accountHolder": "홍*동",
      "hideName": true
    }
  },
  "createdAt": "2026-02-03T12:05:00Z"
}
```

> STOMP 메시지 응답은 `ChatMessageResponse`의 `@JsonInclude(NON_NULL)` 정책을 따르므로, 타입별로 사용하지 않는 필드는 생략될 수 있습니다.

#### STOMP 에러 포맷 (서버 → 클라이언트)

```json
{
  "success": false,
  "errorCode": "NOT_CHAT_ROOM_MEMBER",
  "message": "채팅방 멤버가 아닙니다.",
  "timestamp": "2026-03-05T21:10:00"
}
```

### 4.6 트랜잭션 경계

| 작업 | 트랜잭션 범위 |
|------|------------|
| 메시지 전송 (STOMP 핸들러) | 메시지 DB 저장 + ChatRoom.messageCount 증가 → 커밋 후 구독자 브로드캐스트 |
| 채팅방 목록 요약 이벤트 | 메시지 저장/멤버수 변경 커밋 후 `/user/queue/chat-rooms`로 요약 이벤트 전송 |
| 읽음 처리 (`PATCH /v1/chat-rooms/{chatRoomId}/read`) | timezone 없는 `LocalDateTime` 또는 ISO 8601 `Z`/offset `lastReadAt` 허용, 단조 증가 갱신 + 미래 시각 clamp |
| 설정 수정 (`PATCH /v1/chat-rooms/{chatRoomId}/settings`) | ChatRoomMember.muted 갱신 |
| ACCOUNT 메시지 | payload snapshot 검증 + 선택적 회원 계좌 저장(`remember=true`) + 메시지 DB 저장 → 커밋 후 브로드캐스트 |
| 파티 상태 기반 서버 메시지 | party 상태/정산 snapshot 저장 후 `SYSTEM`/`ARRIVED`/`END` 메시지 DB 저장 → 커밋 후 브로드캐스트 |

> 브로드캐스트(WebSocket push)는 트랜잭션 커밋 성공 후 수행합니다. (트랜잭션 커밋 후 콜백)

### 4.7 에러 코드

| 에러 코드 | 설명 |
|----------|------|
| `CHAT_ROOM_NOT_FOUND` | 채팅방을 찾을 수 없음 |
| `CHAT_MESSAGE_NOT_FOUND` | 채팅 메시지를 찾을 수 없음 |
| `NOT_CHAT_ROOM_MEMBER` | 채팅방 멤버가 아님 |
| `CHAT_ROOM_FULL` | 채팅방 정원 초과 |
| `ALREADY_CHAT_ROOM_MEMBER` | 이미 참여 중인 채팅방 |
| `STOMP_AUTH_FAILED` | WebSocket STOMP 연결 인증 실패 (토큰 검증 오류) |
| `INVALID_REQUEST` | 클라이언트가 `SYSTEM`/`ARRIVED`/`END` 같은 서버 전용 메시지 타입을 전송한 경우 |
| `VALIDATION_ERROR` | `ACCOUNT` payload 또는 cursor 쿼리 조합 검증 실패 |

---

## 5. Board API

### 5.1 구현 범위

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/v1/posts` | 게시글 작성 |
| `GET` | `/v1/posts` | 게시글 목록 조회 |
| `GET` | `/v1/posts/{postId}` | 게시글 상세 조회 (조회수 증가) |
| `PATCH` | `/v1/posts/{postId}` | 게시글 수정 (작성자, `isAnonymous`/`images` 전체 교체 포함) |
| `DELETE` | `/v1/posts/{postId}` | 게시글 삭제 (작성자, soft delete) |
| `POST` | `/v1/posts/{postId}/like` | 좋아요 등록 |
| `DELETE` | `/v1/posts/{postId}/like` | 좋아요 취소 |
| `POST` | `/v1/posts/{postId}/bookmark` | 북마크 등록 |
| `DELETE` | `/v1/posts/{postId}/bookmark` | 북마크 취소 |
| `GET` | `/v1/posts/bookmarked` | 내 북마크 게시글 목록 |
| `GET` | `/v1/posts/{postId}/comments` | 댓글 목록 조회 (flat list, 무제한 depth) |
| `POST` | `/v1/posts/{postId}/comments` | 댓글/대댓글 작성 |
| `PATCH` | `/v1/comments/{commentId}` | 댓글 수정 (작성자, optional `isAnonymous` 지원) |
| `DELETE` | `/v1/comments/{commentId}` | 댓글 삭제 (작성자, placeholder soft delete) |
| `GET` | `/v1/members/me/posts` | 내가 작성한 게시글 목록 |
| `GET` | `/v1/members/me/bookmarks` | 내가 북마크한 게시글 목록 |
| `GET` | `/v1/admin/posts` | 관리자 게시글 목록 조회 |
| `GET` | `/v1/admin/posts/{postId}` | 관리자 게시글 상세 조회 |
| `PATCH` | `/v1/admin/posts/{postId}/moderation` | 관리자 게시글 moderation 상태 변경 |
| `GET` | `/v1/admin/comments` | 관리자 댓글 목록 조회 |
| `PATCH` | `/v1/admin/comments/{commentId}/moderation` | 관리자 댓글 moderation 상태 변경 |

### 5.2 게시글 목록/상세

#### GET /v1/posts

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | string | `GENERAL`, `QUESTION`, `REVIEW`, `ANNOUNCEMENT` |
| `search` | string | 제목/본문 검색 |
| `authorId` | string | 특정 작성자 필터 |
| `sort` | string | `latest`, `popular`, `mostCommented`, `mostViewed` |
| `page` | number | 기본 0 |
| `size` | number | 기본 20 (1~100) |

**Response**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "post_uuid",
        "title": "게시글 제목",
        "content": "내용 미리보기...",
        "authorId": "user_uuid",
        "authorName": "홍길동",
        "authorProfileImage": "https://...",
        "isAnonymous": false,
        "category": "GENERAL",
        "viewCount": 100,
        "likeCount": 10,
        "commentCount": 5,
        "bookmarkCount": 3,
        "isLiked": true,
        "isBookmarked": false,
        "isCommentedByMe": true,
        "hasImage": true,
        "thumbnailUrl": "https://cdn.skuri.app/posts/post-1/image-1-thumb.jpg",
        "isPinned": false,
        "createdAt": "2026-02-03T12:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

- 목록 summary의 `bookmarkCount`는 상세 응답의 `bookmarkCount`와 동일한 게시글 누적 북마크 수입니다.
- `isLiked`, `isBookmarked`, `isCommentedByMe`는 모두 현재 인증 사용자 기준 개인화 상태입니다.
- `isCommentedByMe`는 현재 사용자가 삭제되지 않은 댓글 또는 대댓글을 1개 이상 작성한 경우에만 `true`입니다.
- `thumbnailUrl`은 첫 번째 게시글 이미지의 목록용 URL이며, `thumbUrl`이 있으면 이를 우선 사용하고 없으면 원본 `url`로 fallback 합니다.
- 게시글에 이미지가 없으면 `thumbnailUrl`은 `null`입니다.

#### GET /v1/posts/{postId}

- 조회 시 `viewCount`를 서버에서 +1 동기화한다.

### 5.3 게시글 작성/수정/삭제

#### POST /v1/posts

```json
{
  "title": "게시글 제목",
  "content": "게시글 내용",
  "category": "GENERAL",
  "isAnonymous": false,
  "images": [
    {
      "url": "https://...",
      "thumbUrl": "https://...",
      "width": 800,
      "height": 600,
      "size": 245123,
      "mime": "image/jpeg"
    }
  ]
}
```

- `images[]`의 `url`, `thumbUrl`, `width`, `height`, `size`, `mime`는 `POST /v1/images`의 `POST_IMAGE` 응답을 그대로 사용할 수 있습니다.
- `images[]`의 각 원소는 `null`일 수 없습니다. `{"images":[null]}` 같은 payload는 `422 VALIDATION_ERROR`를 반환합니다.

#### PATCH /v1/posts/{postId}

```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "category": "QUESTION",
  "isAnonymous": true,
  "images": [
    {
      "url": "https://...",
      "thumbUrl": "https://...",
      "width": 800,
      "height": 600,
      "size": 245123,
      "mime": "image/jpeg"
    }
  ]
}
```

- 수정 가능 필드: `title`, `content`, `category`, `isAnonymous`, `images`
- `isAnonymous`를 전달하면 게시글 익명 상태를 변경하고, 생략하거나 `null`이면 기존 값을 유지한다.
- `images[]`는 `POST /v1/posts`와 동일한 구조를 사용한다.
- `images` 필드를 전달하면 전체 이미지 목록을 전달한 순서대로 교체한다.
- `images: []`는 첨부 이미지를 모두 제거한다.
- `images`를 생략하거나 `null`로 보내면 기존 이미지를 유지한다.
- `images[]`의 각 원소는 `null`일 수 없다. `{"images":[null]}` 같은 payload는 `422 VALIDATION_ERROR`를 반환한다.

#### DELETE /v1/posts/{postId}

- `posts.is_deleted=true`로 soft delete 처리한다.
- 삭제된 게시글은 목록/상세/북마크 조회에서 제외한다.
- `HIDDEN` moderation 게시글도 public 목록/상세/내 게시글/북마크 조회에서 제외한다.

### 5.4 상호작용(좋아요/북마크)

- 단일 테이블 `post_interactions`(`user_id`,`post_id`)에서 `isLiked`, `isBookmarked`를 함께 관리한다.
- 카운트(`likeCount`, `bookmarkCount`)는 같은 트랜잭션에서 동기화한다.

#### POST /v1/posts/{postId}/like
#### DELETE /v1/posts/{postId}/like
#### POST /v1/posts/{postId}/bookmark
#### DELETE /v1/posts/{postId}/bookmark

### 5.5 댓글 정책

- 댓글은 `parentId` self-reference 기반으로 무제한 대댓글을 허용한다.
- 익명 규칙:
  - `anonId`는 `{postId}:{userId}` 기반 SHA-256 짧은 안정 식별자(`ac:` prefix 포함 최대 35자)다.
  - 게시글 단위로 같은 사용자의 기존 익명 댓글이 있으면 기존 `anonymousOrder` 재사용
  - 없으면 `max(anonymousOrder)+1` 부여
  - 삭제 후에도 순번 재계산 없음

#### GET /v1/posts/{postId}/comments

**부모 삭제 정책(B)**

- 부모 댓글 삭제 시 하드 삭제하지 않고 `isDeleted=true`, `content="삭제된 댓글입니다"`로 placeholder 처리
- 자식 댓글은 유지한다.
- 관리자 `HIDDEN` moderation 댓글도 thread 구조 유지를 위해 public 응답에서는 placeholder로 마스킹한다.
- 조회 응답은 flat list를 반환한다.
- 각 댓글은 최소 `id`, `parentId`, `depth`, `likeCount`, `isLiked`, `createdAt`, `updatedAt`, `isDeleted`를 포함한다.
- `likeCount`는 전체 댓글 좋아요 수다.
- `isLiked`는 현재 로그인 사용자 기준 댓글 좋아요 여부다.
- 서버는 thread 순서를 보장한 flat list를 반환하고, 클라이언트가 트리 UI를 조립한다.

#### POST /v1/posts/{postId}/comments

```json
{
  "content": "댓글 내용",
  "isAnonymous": false,
  "parentId": null
}
```

```json
{
  "content": "대댓글 내용",
  "isAnonymous": true,
  "parentId": "parent_comment_uuid"
}
```

**댓글 좋아요 응답 필드:**
- 댓글 생성/수정/목록 응답은 모두 `likeCount`, `isLiked`를 포함한다.
- 좋아요 등록/취소는 idempotent 하며, 이미 좋아요된 상태에서 다시 `POST`해도 현재 상태를 반환한다.
- 좋아요하지 않은 상태에서 `DELETE`해도 현재 상태를 반환한다.

#### PATCH /v1/comments/{commentId}

```json
{
  "content": "수정된 댓글 내용",
  "isAnonymous": true
}
```

- `isAnonymous`를 생략하면 기존 값을 유지한다.
- `false -> true`
  - 같은 게시글 안에서 해당 사용자에게 이미 부여된 익명 번호가 있으면 재사용한다.
  - 없으면 `max(anonymousOrder)+1`을 새로 부여한다.
- `true -> false`
  - 실명 댓글로 전환하며 `anonId`, `anonymousOrder`를 정리한다.
- `true -> true`, `false -> false`
  - 기존 익명 메타데이터를 유지한 채 본문만 수정한다.

```json
{
  "success": true,
  "data": {
    "id": "comment_uuid",
    "parentId": "root_comment_uuid",
    "depth": 2,
    "content": "수정된 댓글 내용",
    "authorId": null,
    "authorName": "익명1",
    "authorProfileImage": null,
    "isAnonymous": true,
    "anonymousOrder": 1,
    "isAuthor": true,
    "isPostAuthor": false,
    "likeCount": 3,
    "isLiked": true,
    "isDeleted": false,
    "createdAt": "2026-02-03T12:00:00",
    "updatedAt": "2026-02-03T12:30:00"
  }
}
```

#### DELETE /v1/comments/{commentId}
#### POST /v1/comments/{commentId}/like
#### DELETE /v1/comments/{commentId}/like

```json
{
  "success": true,
  "data": {
    "commentId": "comment_uuid",
    "isLiked": true,
    "likeCount": 3
  }
}
```

```json
{
  "success": true,
  "data": {
    "commentId": "comment_uuid",
    "isLiked": false,
    "likeCount": 2
  }
}
```

### 5.6 내 게시글/북마크

#### GET /v1/members/me/posts

- 내 작성글 페이징 조회.
- 응답 아이템은 `GET /v1/posts`와 같은 summary 스키마를 사용하며 `isLiked`, `isBookmarked`, `isCommentedByMe`, `thumbnailUrl`을 포함한다.

#### GET /v1/members/me/bookmarks

- 내 북마크 페이징 조회.
- 응답 아이템은 `GET /v1/posts`와 같은 summary 스키마를 사용하며 `isLiked`, `isBookmarked`, `isCommentedByMe`, `thumbnailUrl`을 포함한다.

### 5.7 관리자 moderation API

#### moderation 상태

- `VISIBLE`
  - `isHidden=false`, `isDeleted=false`
- `HIDDEN`
  - `isHidden=true`, `isDeleted=false`
- `DELETED`
  - 기존 soft delete 재사용 (`Post.isDeleted=true`, `Comment`는 placeholder soft delete)
- `DELETED`는 복구하지 않는다.
- 허용 전이:
  - 게시글: `VISIBLE -> HIDDEN`, `HIDDEN -> VISIBLE`, `VISIBLE/HIDDEN -> DELETED`
  - 댓글: `VISIBLE -> HIDDEN`, `HIDDEN -> VISIBLE`, `VISIBLE/HIDDEN -> DELETED`
- 금지 전이:
  - 동일 상태 재요청
  - `DELETED -> VISIBLE`
  - `DELETED -> HIDDEN`
  - `DELETED -> DELETED`
- 댓글 `commentCount`는 public active comment 기준이므로 `VISIBLE -> HIDDEN/DELETED` 시 감소하고 `HIDDEN -> VISIBLE` 시 증가한다.

#### GET /v1/admin/posts

관리자용 게시글 목록/검색/필터/페이지네이션 조회

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `page` | number | 기본 0 |
| `size` | number | 기본 20 (1~100) |
| `query` | string | 제목/본문/작성자 검색 |
| `category` | string | `GENERAL`, `QUESTION`, `REVIEW`, `ANNOUNCEMENT` |
| `moderationStatus` | string | `VISIBLE`, `HIDDEN`, `DELETED` |
| `authorId` | string | 특정 작성자 필터 |

기본 정렬:

- `createdAt DESC`

**Response**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "post_uuid",
        "category": "GENERAL",
        "title": "관리 대상 게시글",
        "authorId": "member-1",
        "authorNickname": "스쿠리유저",
        "authorRealname": "홍길동",
        "isAnonymous": false,
        "commentCount": 5,
        "likeCount": 10,
        "createdAt": "2026-03-29T12:00:00",
        "updatedAt": "2026-03-29T12:30:00",
        "moderationStatus": "VISIBLE",
        "thumbnailUrl": "https://cdn.skuri.app/posts/post-1/image-1-thumb.jpg"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

#### GET /v1/admin/posts/{postId}

관리자용 게시글 상세 조회

```json
{
  "success": true,
  "data": {
    "id": "post_uuid",
    "category": "GENERAL",
    "title": "관리 대상 게시글",
    "content": "관리자 상세에서 확인하는 본문 전체 내용",
    "authorId": "member-1",
    "authorNickname": "스쿠리유저",
    "authorRealname": "홍길동",
    "isAnonymous": false,
    "viewCount": 42,
    "likeCount": 10,
    "commentCount": 5,
    "bookmarkCount": 3,
    "createdAt": "2026-03-29T12:00:00",
    "updatedAt": "2026-03-29T12:30:00",
    "moderationStatus": "HIDDEN",
    "thumbnailUrl": "https://cdn.skuri.app/posts/post-1/image-1-thumb.jpg",
    "images": [
      {
        "url": "https://cdn.skuri.app/posts/post-1/image-1.jpg",
        "thumbUrl": "https://cdn.skuri.app/posts/post-1/image-1-thumb.jpg",
        "width": 800,
        "height": 600,
        "size": 245123,
        "mime": "image/jpeg"
      }
    ]
  }
}
```

#### PATCH /v1/admin/posts/{postId}/moderation

```json
{
  "status": "HIDDEN"
}
```

```json
{
  "success": true,
  "data": {
    "id": "post_uuid",
    "moderationStatus": "HIDDEN"
  }
}
```

#### GET /v1/admin/comments

관리자용 댓글 목록/검색/필터/페이지네이션 조회

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `page` | number | 기본 0 |
| `size` | number | 기본 20 (1~100) |
| `postId` | string | 게시글 필터 |
| `query` | string | 댓글/게시글/작성자 검색 |
| `moderationStatus` | string | `VISIBLE`, `HIDDEN`, `DELETED` |
| `authorId` | string | 특정 작성자 필터 |

기본 정렬:

- `createdAt DESC`

**Response**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "comment_uuid",
        "postId": "post_uuid",
        "postTitle": "관리 대상 게시글",
        "authorId": "member-2",
        "authorNickname": "댓글유저",
        "authorRealname": "김철수",
        "contentPreview": "문제되는 댓글 내용 일부...",
        "parentCommentId": null,
        "createdAt": "2026-03-29T13:00:00",
        "moderationStatus": "VISIBLE"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

#### PATCH /v1/admin/comments/{commentId}/moderation

```json
{
  "status": "DELETED"
}
```

```json
{
  "success": true,
  "data": {
    "id": "comment_uuid",
    "moderationStatus": "DELETED"
  }
}
```

### 5.8 에러 코드

| 에러 코드 | HTTP | 설명 |
|---|---|---|
| `POST_NOT_FOUND` | 404 | 게시글 없음 |
| `COMMENT_NOT_FOUND` | 404 | 댓글 없음 |
| `NOT_POST_AUTHOR` | 403 | 게시글 작성자만 수정/삭제 가능 |
| `NOT_COMMENT_AUTHOR` | 403 | 댓글 작성자만 수정/삭제 가능 |
| `COMMENT_ALREADY_DELETED` | 409 | 이미 삭제된 댓글 수정/삭제 시도 |
| `INVALID_POST_MODERATION_STATUS_TRANSITION` | 409 | 허용되지 않는 게시글 moderation 상태 전이 |
| `INVALID_COMMENT_MODERATION_STATUS_TRANSITION` | 409 | 허용되지 않는 댓글 moderation 상태 전이 |

---

## 6. Notice API

### 6.1 학교 공지

#### GET /v1/notices
공지사항 목록

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `category` | string | 카테고리 (새소식, 학사, 학생 등) |
| `search` | string | 기존 검색어 의미 유지 (`title`, `rssPreview`, `summary`, 내부 `bodyText` 포함) |
| `page` | number | 페이지 번호 (기본 0) |
| `size` | number | 페이지 크기 (기본 20, 최대 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "notice_id",
        "title": "2026학년도 1학기 수강신청 안내",
        "rssPreview": "수강신청 일정, 대상 학년, 유의사항을 안내합니다.",
        "category": "학사",
        "department": "성결대학교",
        "author": "교무처",
        "postedAt": "2026-02-01T00:00:00",
        "viewCount": 500,
        "likeCount": 10,
        "commentCount": 10,
        "bookmarkCount": 3,
        "isRead": true,
        "isLiked": false,
        "isBookmarked": true,
        "isCommentedByMe": true,
        "thumbnailUrl": "https://www.sungkyul.ac.kr/upload/notice-thumb.jpg"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1000,
    "totalPages": 50,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**검증 규칙:**
- `category`는 14개 공지 카테고리만 허용한다.
- `page < 0` 또는 `size < 1 || size > 100`이면 `422 VALIDATION_ERROR`
- `rssPreview`는 RSS의 `description/content/contentSnippet` fallback으로 수집한 미리보기 텍스트다.
- `rssPreview`는 RSS 길이 제한 때문에 잘린 텍스트일 수 있으며, AI 요약이 아니다.
- `bookmarkCount`는 공지 누적 북마크 수이고, `isBookmarked`는 현재 인증 사용자의 북마크 여부다.
- `isLiked`는 현재 인증 사용자의 공지 좋아요 여부다.
- `isCommentedByMe`는 현재 사용자가 삭제되지 않은 공지 댓글 또는 대댓글을 1개 이상 작성한 경우에만 `true`다.
- `thumbnailUrl`은 sync/backfill 시 서버가 `TEXT` 타입 `thumbnail_url` 컬럼에 저장한 목록용 첫 이미지 URL이며, 이미지가 없거나 `data:` / `blob:` / 과도하게 긴 `src`는 `null`이다.
- 목록 조회는 전용 projection으로 필요한 컬럼만 select 하며, 응답 생성 시 `bodyHtml/bodyText/attachments`를 읽거나 파싱하지 않는다.

#### GET /v1/notices/{noticeId}
공지사항 상세

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notice_id",
    "title": "2026학년도 1학기 수강신청 안내",
    "rssPreview": "RSS 미리보기",
    "bodyHtml": "<html>...</html>",
    "link": "https://www.sungkyul.ac.kr/...",
    "category": "학사",
    "department": "성결대학교",
    "author": "교무처",
    "source": "RSS",
    "postedAt": "2026-02-01T00:00:00",
    "viewCount": 501,
    "likeCount": 11,
    "commentCount": 10,
    "bookmarkCount": 4,
    "attachments": [
      {
        "name": "수강신청 안내.pdf",
        "downloadUrl": "https://...",
        "previewUrl": "https://..."
      }
    ],
    "isRead": true,
    "isLiked": true,
    "isBookmarked": true
  }
}
```

**정책:**
- `rssPreview`는 RSS에서 받은 미리보기 텍스트이며, 일부 공지는 원문 2~3줄 수준에서 잘려 들어올 수 있다.
- `bodyHtml`은 상세 페이지에서 크롤링한 HTML 원문이며, 클라이언트가 공지 웹 구조(`h*`, `table`, `br` 등)를 최대한 유지해서 렌더링할 수 있도록 그대로 저장한다.
- `bodyText`는 `bodyHtml`에서 태그를 제거해 정규화한 내부 저장용 텍스트이며, 검색/AI 요약/RAG 용도로 사용한다. 현재 공개 API에는 노출하지 않는다.
- `thumbnail_url`은 상세 refresh 성공 시 `bodyHtml`의 첫 번째 `img[src]`를 추출해 저장하며, 기존 row는 DB `bodyHtml`만 읽는 backfill로 보정한다.
- 저장 규칙은 sync/backfill 공통으로 적용하며, `data:` / `blob:` / 과도하게 긴 `img[src]`는 저장하지 않고 `null`로 정리한다.
- `summary` 컬럼은 추후 AI 생성 공지 요약을 저장하기 위한 예약 필드이며, 현재 공개 API에는 노출하지 않는다.
- 상세 조회는 조회수만 증가시키며, 읽음 상태를 저장하지 않는다.
- 읽음 상태 저장은 `POST /v1/notices/{noticeId}/read`로만 처리한다.

#### POST /v1/notices/{noticeId}/read
읽음 표시

**Response:**
```json
{
  "success": true,
  "data": {
    "noticeId": "notice_id",
    "isRead": true,
    "readAt": "2026-02-01T12:34:56"
  }
}
```

#### POST /v1/notices/{noticeId}/like
공지 좋아요 등록

**Response:**
```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likeCount": 11
  }
}
```

#### DELETE /v1/notices/{noticeId}/like
공지 좋아요 취소

**Response:**
```json
{
  "success": true,
  "data": {
    "isLiked": false,
    "likeCount": 10
  }
}
```

#### POST /v1/notices/{noticeId}/bookmark
공지 북마크 등록

**Response:**
```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmarkCount": 4
  }
}
```

- `NoticeLike`와 분리된 `notice_bookmarks` 저장 모델을 사용한다.
- 이미 북마크한 공지에 다시 요청해도 `200 OK`와 `isBookmarked=true`를 반환한다.

#### DELETE /v1/notices/{noticeId}/bookmark
공지 북마크 취소

**Response:**
```json
{
  "success": true,
  "data": {
    "isBookmarked": false,
    "bookmarkCount": 3
  }
}
```

- 북마크가 없는 공지에 요청해도 `200 OK`와 `isBookmarked=false`를 반환한다.

### 6.2 공지 댓글

#### GET /v1/notices/{noticeId}/comments
공지 댓글 목록

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notice_comment_uuid",
      "parentId": null,
      "depth": 0,
      "content": "댓글 내용",
      "authorId": "user_uuid",
      "authorName": "홍길동",
      "isAnonymous": false,
      "anonymousOrder": null,
      "isAuthor": true,
      "likeCount": 5,
      "isLiked": true,
      "isDeleted": false,
      "createdAt": "2026-02-03T12:00:00",
      "updatedAt": "2026-02-03T12:00:00"
    },
    {
      "id": "notice_reply_uuid",
      "parentId": "notice_comment_uuid",
      "depth": 1,
      "content": "대댓글 내용",
      "authorId": null,
      "authorName": "익명2",
      "isAnonymous": true,
      "anonymousOrder": 2,
      "isAuthor": false,
      "likeCount": 0,
      "isLiked": false,
      "isDeleted": false,
      "createdAt": "2026-02-03T12:10:00",
      "updatedAt": "2026-02-03T12:10:00"
    }
  ]
}
```

#### POST /v1/notices/{noticeId}/comments
공지 댓글 작성

**Request:**
```json
{
  "content": "댓글 내용",
  "isAnonymous": false,
  "parentId": null
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "notice_comment_uuid",
    "parentId": null,
    "depth": 0,
    "content": "댓글 내용",
    "authorId": "user_uuid",
    "authorName": "홍길동",
    "isAnonymous": false,
    "anonymousOrder": null,
    "isAuthor": true,
    "likeCount": 5,
    "isLiked": true,
    "isDeleted": false,
    "createdAt": "2026-02-03T12:00:00",
    "updatedAt": "2026-02-03T12:00:00"
  }
}
```

**댓글 정책:**
- 댓글은 `parentId` self-reference 기반으로 무제한 대댓글을 허용한다.
- 익명 규칙:
  - `anonId`는 `{noticeId}:{userId}` 기반 SHA-256 짧은 안정 식별자(`ac:` prefix 포함 최대 35자)다.
  - 공지 단위로 같은 사용자의 기존 익명 댓글이 있으면 기존 `anonymousOrder` 재사용
  - 없으면 `max(anonymousOrder)+1` 부여
  - 삭제 후에도 순번 재계산 없음
- 부모 댓글 삭제 시 하드 삭제하지 않고 `isDeleted=true`, `content="삭제된 댓글입니다"` placeholder 처리하며 자식은 유지한다.
- 조회 응답은 flat list를 반환한다.
- 각 댓글은 최소 `id`, `parentId`, `depth`, `likeCount`, `isLiked`, `createdAt`, `updatedAt`, `isDeleted`를 포함한다.
- `likeCount`는 전체 댓글 좋아요 수다.
- `isLiked`는 현재 로그인 사용자 기준 댓글 좋아요 여부다.
- 서버는 thread 순서를 보장한 flat list를 반환하고, 클라이언트가 트리 UI를 조립한다.

#### PATCH /v1/notice-comments/{commentId}
공지 댓글 수정

**Request:**
```json
{
  "content": "수정된 댓글 내용",
  "isAnonymous": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "notice_comment_uuid",
    "parentId": null,
    "depth": 0,
    "content": "수정된 댓글 내용",
    "authorId": null,
    "authorName": "익명1",
    "isAnonymous": true,
    "anonymousOrder": 1,
    "isAuthor": true,
    "likeCount": 5,
    "isLiked": true,
    "isDeleted": false,
    "createdAt": "2026-02-03T12:00:00",
    "updatedAt": "2026-02-03T12:30:00"
  }
}
```

**수정 정책:**
- 댓글 작성자만 본문을 수정할 수 있다.
- `isAnonymous`를 생략하면 기존 값을 유지한다.
- `false -> true`
  - 같은 공지 안에서 해당 사용자에게 이미 부여된 익명 번호가 있으면 재사용한다.
  - 없으면 `max(anonymousOrder)+1`을 새로 부여한다.
- `true -> false`
  - 실명 댓글로 전환하며 `anonId`, `anonymousOrder`를 정리한다.
- `true -> true`, `false -> false`
  - 기존 익명 메타데이터를 유지한 채 본문만 수정한다.
- 이미 삭제된 댓글은 `409 COMMENT_ALREADY_DELETED`를 반환한다.

#### DELETE /v1/notice-comments/{commentId}
공지 댓글 삭제

#### POST /v1/notice-comments/{commentId}/like
공지 댓글 좋아요

```json
{
  "success": true,
  "data": {
    "commentId": "notice_comment_uuid",
    "isLiked": true,
    "likeCount": 5
  }
}
```

#### DELETE /v1/notice-comments/{commentId}/like
공지 댓글 좋아요 취소

```json
{
  "success": true,
  "data": {
    "commentId": "notice_comment_uuid",
    "isLiked": false,
    "likeCount": 4
  }
}
```

### 6.3 내 공지 북마크

#### GET /v1/members/me/notice-bookmarks

- 내 북마크 공지 페이징 조회.
- `page < 0` 또는 `size < 1 || size > 100`이면 `422 VALIDATION_ERROR`
- 목록 item은 기존 Notice 공개 계약과 화면 필드 naming을 맞추기 위해 `rssPreview`, `postedAt`를 그대로 사용한다.
- `summary`, `createdAt` 같은 새 이름은 도입하지 않는다.
- 정렬은 `postedAt DESC, createdAt DESC` 기준이다.

**Response**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "notice_id",
        "title": "2026학년도 1학기 수강신청 안내",
        "rssPreview": "수강신청 일정, 대상 학년, 유의사항을 안내합니다.",
        "category": "학사",
        "postedAt": "2026-02-01T00:00:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### 6.4 앱 공지

#### GET /v1/app-notices
앱 공지 목록 **(Public API — 인증 불필요)**

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "app_notice_uuid",
      "title": "앱 업데이트 안내",
      "content": "새로운 기능이 추가되었습니다.",
      "category": "UPDATE",
      "priority": "NORMAL",
      "imageUrls": ["https://..."],
      "actionUrl": "https://...",
      "publishedAt": "2026-02-01T00:00:00Z",
      "createdAt": "2026-01-31T18:00:00Z",
      "updatedAt": "2026-01-31T18:00:00Z"
    }
  ]
}
```

#### GET /v1/app-notices/{appNoticeId}
앱 공지 상세

**정책:**
- `GET /v1/app-notices`
- `GET /v1/app-notices/{appNoticeId}`
위 두 API는 모두 Public API이며 인증이 필요 없다.
- Public 조회는 `publishedAt <= now()`인 앱 공지만 노출한다.
- 앱 공지 unread count와 읽음 처리는 일반 알림(`GET /v1/notifications/unread-count`)과 별도 source of truth를 사용한다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "app_notice_uuid",
    "title": "서버 점검 안내",
    "content": "2월 20일 새벽 2시~4시 서버 점검이 있습니다.",
    "category": "MAINTENANCE",
    "priority": "HIGH",
    "imageUrls": [],
    "actionUrl": null,
    "publishedAt": "2026-02-20T00:00:00Z",
    "createdAt": "2026-02-19T12:00:00Z",
    "updatedAt": "2026-02-19T12:00:00Z"
  }
}
```

#### GET /v1/members/me/app-notices/unread-count
읽지 않은 앱 공지 수

**정책:**
- 인증이 필요하다.
- `publishedAt <= now()`인 앱 공지 중 아직 읽지 않은 공지 개수만 집계한다.
- 일반 알림 unread count에는 영향을 주지 않는다.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 2
  }
}
```

#### POST /v1/members/me/app-notices/{appNoticeId}/read
앱 공지 읽음 처리

**정책:**
- 인증이 필요하다.
- `publishedAt <= now()`인 앱 공지만 읽음 처리할 수 있다.
- 이미 읽은 공지를 다시 읽음 처리해도 성공 응답을 반환하며, 최초 `readAt`을 유지한다.

**Response:**
```json
{
  "success": true,
  "data": {
    "appNoticeId": "app_notice_uuid",
    "isRead": true,
    "readAt": "2026-03-26T14:30:00"
  }
}
```

### 6.5 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `NOTICE_NOT_FOUND` | 404 | 존재하지 않는 학교 공지 |
| `APP_NOTICE_NOT_FOUND` | 404 | 존재하지 않는 앱 공지 |
| `NOTICE_COMMENT_NOT_FOUND` | 404 | 존재하지 않는 공지 댓글 |
| `NOT_NOTICE_COMMENT_AUTHOR` | 403 | 댓글 작성자가 아닌데 수정/삭제 시도 |
| `COMMENT_ALREADY_DELETED` | 409 | 이미 삭제된 댓글 수정/재삭제 시도 |
| `RESOURCE_CONCURRENT_MODIFICATION` | 409 | 공지 동기화가 이미 진행 중임 |

---

## 7. Academic API

### 7.1 강의

#### GET /v1/courses
강의 목록

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `semester` | string | 학기 (예: `2026-1`, 미지정 시 전체 학기 검색) |
| `department` | string | 학과 |
| `professor` | string | 교수명 |
| `search` | string | 강의명/과목코드/카테고리/교수/강의실/비고 키워드 검색 |
| `dayOfWeek` | int | 요일 (1-6, 월-토) |
| `grade` | int | 학년 |
| `page` | int | 페이지 번호 (기본: 0) |
| `size` | int | 페이지 크기 (기본: 20, 최대: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "course_uuid",
        "semester": "2026-1",
        "code": "01255",
        "division": "001",
        "name": "민법총칙",
        "credits": 3,
        "isOnline": false,
        "professor": "문상혁",
        "department": "법학과",
        "grade": 2,
        "category": "전공선택",
        "location": "영401",
        "note": null,
        "schedule": [
          {
            "dayOfWeek": 1,
            "startPeriod": 3,
            "endPeriod": 4
          },
          {
            "dayOfWeek": 3,
            "startPeriod": 3,
            "endPeriod": 4
          }
        ]
      },
      {
        "id": "course_online_uuid",
        "semester": "2026-1",
        "code": "20797",
        "division": "001",
        "name": "사랑의인문학(KCU온라인강좌)",
        "credits": 3,
        "isOnline": true,
        "professor": null,
        "department": "교양",
        "grade": 1,
        "category": "교양선택",
        "location": null,
        "note": null,
        "schedule": []
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

- 공식 강의도 `isOnline`을 가질 수 있다.
- 공식 온라인 강의는 `schedule=[]`, `location=null`로 응답될 수 있다.
- 공식 강의와 직접 입력 강의는 저장 모델은 분리하지만, 온라인 의미와 시간표 노출 규칙은 동일하게 맞춘다.

### 7.2 시간표

#### GET /v1/timetables/my/semesters
내 시간표 학기 목록 조회

강의 카탈로그 학기와 사용자가 이미 가진 시간표 학기의 합집합을 최신 학기 우선으로 반환한다.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "2026-1", "label": "2026-1학기" },
    { "id": "2025-2", "label": "2025-2학기" },
    { "id": "2025-1", "label": "2025-1학기" }
  ]
}
```

#### GET /v1/timetables/my
내 시간표 조회

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `semester` | string | 학기 (기본: 현재 학기) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "timetable_uuid",
    "semester": "2026-1",
    "courseCount": 2,
    "totalCredits": 6,
    "courses": [
      {
        "id": "course_uuid",
        "code": "01255",
        "division": "001",
        "name": "민법총칙",
        "professor": "문상혁",
        "location": "영401",
        "category": "전공선택",
        "credits": 3,
        "isOnline": false,
        "schedule": [
          { "dayOfWeek": 1, "startPeriod": 3, "endPeriod": 4 }
        ]
      },
      {
        "id": "course_online_uuid",
        "code": "20797",
        "division": "001",
        "name": "사랑의인문학(KCU온라인강좌)",
        "professor": null,
        "location": null,
        "category": "교양선택",
        "credits": 3,
        "isOnline": true,
        "schedule": []
      }
    ],
    "slots": [
      {
        "courseId": "course_uuid",
        "courseName": "민법총칙",
        "code": "01255",
        "dayOfWeek": 1,
        "startPeriod": 3,
        "endPeriod": 4,
        "professor": "문상혁",
        "location": "영401"
      }
    ]
  }
}
```

시간표가 아직 생성되지 않은 경우에도 `200 OK`를 반환하며, `id`는 `null`, `courses`/`slots`는 빈 배열로 내려간다.
- 공식 온라인 강의와 직접 입력 온라인 강의는 모두 `courses[]`에는 포함되지만 `slots[]`에는 포함되지 않는다.
- 공식 온라인 강의는 직접 입력 온라인 강의와 동일하게 시간 충돌 검사 대상에서도 제외된다.
`semester`를 생략하면 서버는 현재 날짜 기준 `2~7월 -> yyyy-1`, `8~12월 -> yyyy-2`, `1월 -> 전년도 yyyy-2` 규칙으로 학기를 계산한다.
성결대학교 실제 학기 시작은 3월/9월이지만, 스쿠리는 수강신청과 시간표 준비 수요를 반영해 한 달 앞선 2월/8월부터 새 학기를 사용한다.

#### POST /v1/timetables/my/courses
시간표에 강의 추가

**Request:**
```json
{
  "courseId": "course_uuid",
  "semester": "2026-1"
}
```

**Response (200 OK):**

`GET /v1/timetables/my`와 동일한 형태의 최신 시간표를 반환한다.

#### POST /v1/timetables/my/manual-courses
시간표에 직접 입력 강의 추가

오프라인 직접 입력 강의 예시:
```json
{
  "semester": "2026-1",
  "name": "캡스톤세미나",
  "professor": "정태현",
  "credits": 3,
  "isOnline": false,
  "locationLabel": "공학관 502",
  "dayOfWeek": 2,
  "startPeriod": 9,
  "endPeriod": 11
}
```

온라인 직접 입력 강의 예시:
```json
{
  "semester": "2026-1",
  "name": "플랫폼세미나",
  "professor": "",
  "credits": 2,
  "isOnline": true,
  "locationLabel": null,
  "dayOfWeek": null,
  "startPeriod": null,
  "endPeriod": null
}
```

검증 규칙:
- `isOnline = true`면 `locationLabel`, `dayOfWeek`, `startPeriod`, `endPeriod`는 모두 선택값이다.
- `isOnline = false`면 `locationLabel`, `dayOfWeek`, `startPeriod`, `endPeriod`가 모두 필요하다.
- `dayOfWeek`는 `1-6 (월-토)` 범위를 사용한다.
- 온라인 강의는 시간 충돌 검사 대상이 아니며 `slots[]`에 포함되지 않는다.

**Response (200 OK):**

`GET /v1/timetables/my`와 동일한 형태의 최신 시간표를 반환한다.

#### DELETE /v1/timetables/my/courses/{courseId}
시간표에서 강의 삭제

일반 강의 ID와 직접 입력 강의 ID를 모두 사용할 수 있다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `semester` | string | 학기 (필수) |

**Response (200 OK):**

`GET /v1/timetables/my`와 동일한 형태의 최신 시간표를 반환한다.

### 7.3 학사 일정

#### GET /v1/academic-schedules
학사 일정 목록

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `startDate` | date | 시작일 이후 |
| `endDate` | date | 종료일 이전 |
| `primary` | boolean | 주요 일정만 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule_uuid",
      "title": "1학기 개강",
      "startDate": "2026-03-02",
      "endDate": "2026-03-02",
      "type": "SINGLE",
      "isPrimary": true,
      "description": "2026학년도 1학기 개강일"
    },
    {
      "id": "schedule_uuid_2",
      "title": "중간고사",
      "startDate": "2026-04-15",
      "endDate": "2026-04-21",
      "type": "MULTI",
      "isPrimary": true
    }
  ]
}
```

**구현 예정 알림 정책 (Phase 8):**
- 기본 리마인더 기준일은 `startDate`
- 기본 발송 시각은 당일 오전 `09:00`
- 기본 대상은 중요 일정(`isPrimary = true`)
- 사용자 옵션으로 전날 오전 `09:00` 추가와 모든 일정 대상 확장을 허용

### 7.4 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `COURSE_NOT_FOUND` | 404 | 존재하지 않는 강의 |
| `ACADEMIC_SCHEDULE_NOT_FOUND` | 404 | 존재하지 않는 학사 일정 |
| `TIMETABLE_CONFLICT` | 409 | 시간표 추가 시 기존 강의와 시간 충돌 |
| `COURSE_ALREADY_IN_TIMETABLE` | 409 | 이미 시간표에 추가된 강의 중복 추가 |
| `CONFLICT` | 409 | 관리자 강의 bulk 처리 중 동시 저장 충돌 |

---

## 8. Support API

### 8.1 문의

#### POST /v1/inquiries
문의 등록

**Request:**
```json
{
  "type": "BUG",
  "subject": "앱 오류 문의",
  "content": "채팅 화면에서 오류가 발생합니다.",
  "attachments": [
    {
      "url": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0.jpg",
      "thumbUrl": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0_thumb.jpg",
      "width": 800,
      "height": 600,
      "size": 245123,
      "mime": "image/jpeg"
    }
  ]
}
```

- `attachments`는 optional 필드입니다.
- 요청에서 `attachments`를 생략하거나 `null`로 보내면 서버는 빈 배열로 정규화합니다.
- `attachments`는 최대 3개까지 허용합니다.
- 각 첨부 항목은 `url`, `thumbUrl`, `width`, `height`, `size`, `mime` 전체 메타데이터를 저장합니다.
- 허용 MIME은 `image/jpeg`, `image/png`, `image/webp`입니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inquiry_uuid",
    "status": "PENDING",
    "createdAt": "2026-02-03T12:00:00Z"
  }
}
```

#### GET /v1/inquiries/my
내 문의 목록

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inquiry_uuid",
      "type": "BUG",
      "subject": "앱 오류 문의",
      "content": "채팅 화면에서 오류가 발생합니다.",
      "status": "PENDING",
      "attachments": [
        {
          "url": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0.jpg",
          "thumbUrl": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0_thumb.jpg",
          "width": 800,
          "height": 600,
          "size": 245123,
          "mime": "image/jpeg"
        }
      ],
      "createdAt": "2026-02-03T12:00:00Z",
      "updatedAt": "2026-02-03T12:00:00Z"
    }
  ]
}
```

### 8.2 신고

#### POST /v1/reports
신고 등록

**targetType:** `POST` | `COMMENT` | `MEMBER` | `CHAT_MESSAGE` | `CHAT_ROOM` | `TAXI_PARTY`

- `CHAT_MESSAGE`: `targetId = messageId`, `targetAuthorId = message.senderId`
- `CHAT_ROOM`: `targetId = chatRoomId`, 파티 채팅방(`type=PARTY`)은 대상에서 제외하며 일반 채팅방만 허용
- `CHAT_ROOM`의 seed/public 방처럼 `createdBy`가 없으면 신고는 허용하고 `targetAuthorId = null`로 저장
- `TAXI_PARTY`: `targetId = partyId`, `targetAuthorId = party.leaderId`
- `404` 대상 없음은 `POST_NOT_FOUND`, `COMMENT_NOT_FOUND`, `MEMBER_NOT_FOUND`, `CHAT_MESSAGE_NOT_FOUND`, `CHAT_ROOM_NOT_FOUND`, `PARTY_NOT_FOUND` 중 하나를 반환합니다.

**Request Example - CHAT_MESSAGE:**
```json
{
  "targetType": "CHAT_MESSAGE",
  "targetId": "message_uuid",
  "category": "SPAM",
  "reason": "광고성 메시지입니다."
}
```

**Request Example - CHAT_ROOM:**
```json
{
  "targetType": "CHAT_ROOM",
  "targetId": "chat_room_uuid",
  "category": "ABUSE",
  "reason": "부적절한 목적의 채팅방입니다."
}
```

**Request Example - TAXI_PARTY:**
```json
{
  "targetType": "TAXI_PARTY",
  "targetId": "party_uuid",
  "category": "FRAUD",
  "reason": "운행/정산 방식이 부적절합니다."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report_uuid",
    "status": "PENDING",
    "createdAt": "2026-03-05T12:10:00Z"
  }
}
```

### 8.3 앱 버전

#### GET /v1/app-versions/{platform}
앱 버전 정보 (Public API)

- 저장된 버전 정보가 없으면 기본 응답으로 `minimumVersion=1.0.0`, `forceUpdate=false`, `showButton=false`를 반환합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "ios",
    "minimumVersion": "1.5.0",
    "forceUpdate": false,
    "message": "새로운 기능이 추가되었습니다.",
    "title": "업데이트 안내",
    "showButton": true,
    "buttonText": "업데이트",
    "buttonUrl": "https://apps.apple.com/..."
  }
}
```

### 8.4 법적 문서

#### GET /v1/legal-documents/{documentKey}
설정 화면 법적 문서 조회 (Public API)

- `documentKey`: `termsOfUse` | `privacyPolicy`
- `isActive=true`인 문서만 조회되며, 비활성 또는 미존재 문서는 `404 LEGAL_DOCUMENT_NOT_FOUND`를 반환합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "termsOfUse",
    "title": "이용약관",
    "banner": {
      "iconKey": "document",
      "lines": [
        {
          "text": "시행일: 2025년 3월 1일 · 최종 수정: 2025년 3월 1일",
          "tone": "primary"
        }
      ],
      "title": "SKURI 이용약관",
      "tone": "green"
    },
    "sections": [
      {
        "id": "article-01",
        "title": "제1조(목적)",
        "paragraphs": [
          "이 약관은 스쿠리 (이하 '회사' 라고 합니다)가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다."
        ]
      }
    ],
    "footerLines": [
      "본 약관에 대한 문의는",
      "앱 내 문의하기를 이용해 주세요."
    ]
  }
}
```

### 8.5 학식 메뉴

#### GET /v1/cafeteria-menus
학식 메뉴

`menus`는 기존 호환용 원본 메뉴 문자열 배열이고, `categories`/`menuEntries`는 학식 상세 화면과 Campus home preview용 구조화 필드다.
이번 계약에는 가격이 포함되지 않으며, `badges`는 관리자 입력 메타데이터, `likeCount`/`dislikeCount`는 실제 사용자 반응 집계다.
`menuEntries[*][*][*].id`는 `weekId + category + title` 기준의 stable weekly identifier이고, `myReaction`은 현재 인증 사용자의 반응 상태다.
클라이언트는 이 `id`를 opaque 값으로 취급하고 파싱하지 말아야 한다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `date` | date | 조회 날짜 (기본: 오늘, Asia/Seoul 기준) |

**Response:**
```json
{
  "success": true,
  "data": {
    "weekId": "2026-W06",
    "weekStart": "2026-02-03",
    "weekEnd": "2026-02-07",
    "menus": {
      "2026-02-03": {
        "rollNoodles": ["우동", "김밥"],
        "theBab": ["돈까스", "된장찌개"],
        "fryRice": ["볶음밥", "짜장면"]
      }
    },
    "categories": [
      {
        "code": "rollNoodles",
        "label": "Roll & Noodles"
      },
      {
        "code": "theBab",
        "label": "The bab"
      },
      {
        "code": "fryRice",
        "label": "Fry & Rice"
      }
    ],
    "menuEntries": {
      "2026-02-03": {
        "rollNoodles": [
          {
            "id": "2026-W06.rollNoodles.8851f2731beef1f0",
            "title": "우동",
            "badges": [],
            "likeCount": 12,
            "dislikeCount": 1,
            "myReaction": null
          },
          {
            "id": "2026-W06.rollNoodles.881b3d074ed4535d",
            "title": "김밥",
            "badges": [
              {
                "code": "TAKEOUT",
                "label": "테이크아웃"
              }
            ],
            "likeCount": 31,
            "dislikeCount": 2,
            "myReaction": "LIKE"
          }
        ],
        "theBab": [
          {
            "id": "2026-W06.theBab.1f529546f2bf7ff3",
            "title": "돈까스",
            "badges": [],
            "likeCount": 18,
            "dislikeCount": 4,
            "myReaction": "DISLIKE"
          }
        ],
        "fryRice": []
      }
    }
  }
}
```

#### GET /v1/cafeteria-menus/{weekId}
특정 주차 학식 메뉴

응답 계약은 `GET /v1/cafeteria-menus`와 동일하다.

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `weekId` | string | 조회할 주차 ID (예: `2026-W06`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "weekId": "2026-W06",
    "weekStart": "2026-02-03",
    "weekEnd": "2026-02-07",
    "menus": {
      "2026-02-03": {
        "rollNoodles": ["우동", "김밥"],
        "theBab": ["돈까스", "된장찌개"],
        "fryRice": ["볶음밥", "짜장면"]
      }
    },
    "categories": [
      {
        "code": "rollNoodles",
        "label": "Roll & Noodles"
      },
      {
        "code": "theBab",
        "label": "The bab"
      },
      {
        "code": "fryRice",
        "label": "Fry & Rice"
      }
    ],
    "menuEntries": {
      "2026-02-03": {
        "rollNoodles": [
          {
            "id": "2026-W06.rollNoodles.8851f2731beef1f0",
            "title": "우동",
            "badges": [],
            "likeCount": 12,
            "dislikeCount": 1,
            "myReaction": null
          },
          {
            "id": "2026-W06.rollNoodles.881b3d074ed4535d",
            "title": "김밥",
            "badges": [
              {
                "code": "TAKEOUT",
                "label": "테이크아웃"
              }
            ],
            "likeCount": 31,
            "dislikeCount": 2,
            "myReaction": "LIKE"
          }
        ],
        "theBab": [
          {
            "id": "2026-W06.theBab.1f529546f2bf7ff3",
            "title": "돈까스",
            "badges": [],
            "likeCount": 18,
            "dislikeCount": 4,
            "myReaction": "DISLIKE"
          }
        ],
        "fryRice": []
      }
    }
  }
}
```

#### PUT /v1/cafeteria-menu-reactions/{menuId}
학식 메뉴 반응 저장

한 사용자당 한 주간 메뉴에 하나의 반응만 저장할 수 있다.
- `LIKE` 저장: 좋아요 등록
- `DISLIKE` 저장: 싫어요 등록
- 반대 반응 저장: 기존 반응에서 전환
- `null` 저장: 기존 반응 취소

`menuId`는 날짜 기반이 아니라 주간 기준 stable weekly identifier다.
응답에서 받은 값을 그대로 다시 보내는 opaque identifier로 사용하고, 구조를 파싱하지 않는다.
같은 요청 재시도나 더블탭 상황에서도 주차 단위 직렬화로 500 없이 처리되도록 구현한다.

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `menuId` | string | 주간 기준 메뉴 ID (예: `2026-W08.rollNoodles.c4973864db4f8815`) |

**Request:**
```json
{
  "reaction": "LIKE"
}
```

취소 요청 예시:
```json
{
  "reaction": null
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "menuId": "2026-W08.rollNoodles.c4973864db4f8815",
    "myReaction": "LIKE",
    "likeCount": 13,
    "dislikeCount": 2
  }
}
```

취소 응답 예시:
```json
{
  "success": true,
  "data": {
    "menuId": "2026-W08.rollNoodles.c4973864db4f8815",
    "myReaction": null,
    "likeCount": 12,
    "dislikeCount": 2
  }
}
```

가능한 에러:
- `400 INVALID_REQUEST`: `menuId` 형식이 잘못됨
- `401 UNAUTHORIZED`: 인증 필요
- `404 CAFETERIA_MENU_NOT_FOUND`: 해당 주차 메뉴 없음
- `404 CAFETERIA_MENU_ENTRY_NOT_FOUND`: 해당 주차에 menuId와 일치하는 메뉴 항목이 없음

### 8.5 캠퍼스 홈 배너

#### GET /v1/campus-banners
캠퍼스 홈 배너 목록 **(Public API — 인증 불필요)**

**노출 규칙:**
- `isActive = true`
- `displayStartAt <= now()` 또는 `displayStartAt is null`
- `displayEndAt > now()` 또는 `displayEndAt is null`
- 정렬: `displayOrder ASC`, 동률이면 `createdAt DESC`

**액션 규칙:**
- `actionType = IN_APP`
  - `actionTarget` 필수
  - `actionUrl`은 `null`
  - `actionParams`는 nullable JSON object
- `actionType = EXTERNAL_URL`
  - `actionUrl` 필수
  - `actionTarget`은 `null`
  - `actionParams`는 `null`

**Enum:**
- `paletteKey`: `GREEN` | `BLUE` | `PURPLE` | `RED` | `YELLOW`
- `actionType`: `IN_APP` | `EXTERNAL_URL`
- `actionTarget`: `TAXI_MAIN` | `NOTICE_MAIN` | `TIMETABLE_DETAIL` | `CAFETERIA_DETAIL` | `ACADEMIC_CALENDAR_DETAIL`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "campus_banner_uuid_1",
      "badgeLabel": "택시 파티",
      "titleLabel": "택시 동승 매칭",
      "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
      "buttonLabel": "파티 찾기",
      "paletteKey": "GREEN",
      "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
      "actionType": "IN_APP",
      "actionTarget": "TAXI_MAIN",
      "actionParams": null,
      "actionUrl": null
    },
    {
      "id": "campus_banner_uuid_2",
      "badgeLabel": "공지사항",
      "titleLabel": "학교 공지사항",
      "descriptionLabel": "중요한 학교 소식을 놓치지 말고 확인하세요",
      "buttonLabel": "공지 보기",
      "paletteKey": "BLUE",
      "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-2.jpg",
      "actionType": "IN_APP",
      "actionTarget": "NOTICE_MAIN",
      "actionParams": null,
      "actionUrl": null
    },
    {
      "id": "campus_banner_uuid_3",
      "badgeLabel": "시간표",
      "titleLabel": "나의 시간표",
      "descriptionLabel": "오늘 수업 일정을 한눈에 확인하세요",
      "buttonLabel": "시간표 보기",
      "paletteKey": "PURPLE",
      "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-3.jpg",
      "actionType": "IN_APP",
      "actionTarget": "TIMETABLE_DETAIL",
      "actionParams": {
        "initialView": "all"
      },
      "actionUrl": null
    }
  ]
}
```

### 8.6 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `INQUIRY_NOT_FOUND` | 404 | 존재하지 않는 문의 |
| `CAFETERIA_MENU_NOT_FOUND` | 404 | 존재하지 않는 학식 메뉴 |
| `CAFETERIA_MENU_ALREADY_EXISTS` | 409 | 이미 등록된 주차의 학식 메뉴 |
| `REPORT_NOT_FOUND` | 404 | 존재하지 않는 신고 |
| `REPORT_ALREADY_SUBMITTED` | 409 | 동일 대상에 대한 중복 신고 |
| `INVALID_INQUIRY_STATUS_TRANSITION` | 409 | 허용되지 않는 문의 상태 전이 |
| `INVALID_REPORT_STATUS_TRANSITION` | 409 | 허용되지 않는 신고 상태 전이 |
| `CANNOT_REPORT_YOURSELF` | 400 | 자기 자신을 신고 시도 |

---

## 9. Notification API

### 9.1 알림 조회

#### GET /v1/notifications
알림 목록

**정책:**
- 목록 `content`는 기존 인박스 알림을 그대로 반환하며 `APP_NOTICE` 타입도 포함될 수 있다.
- 다만 응답의 `unreadCount`는 일반 알림 unread 집계값으로, `APP_NOTICE`를 제외한다.

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `page` | int | 0 | 0부터 시작하는 페이지 번호 |
| `size` | int | 20 | 페이지 크기 (`1~100`, 100 초과 시 100으로 clamp) |
| `unreadOnly` | boolean | false | `true`면 읽지 않은 알림만 조회 |

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "notification_uuid",
        "type": "PARTY_JOIN_ACCEPTED",
        "title": "동승 요청이 승인되었어요",
        "message": "파티에 합류하세요!",
        "data": {
          "partyId": "party_uuid",
          "requestId": "join_request_uuid"
        },
        "isRead": false,
        "createdAt": "2026-02-03T12:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false,
    "unreadCount": 5
  }
}
```

#### GET /v1/notifications/unread-count
읽지 않은 알림 수

**정책:**
- 이 값은 일반 알림 unread 집계이며 `APP_NOTICE`는 제외한다.
- 앱 공지 unread count는 `GET /v1/members/me/app-notices/unread-count`로 별도 조회한다.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### 9.2 알림 관리

#### POST /v1/notifications/{notificationId}/read
알림 읽음 처리

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notification_uuid",
    "type": "PARTY_JOIN_ACCEPTED",
    "title": "동승 요청이 승인되었어요",
    "message": "파티에 합류하세요!",
    "data": {
      "partyId": "party_uuid",
      "requestId": "join_request_uuid"
    },
    "isRead": true,
    "createdAt": "2026-02-03T12:00:00Z"
  }
}
```

#### POST /v1/notifications/read-all
모든 알림 읽음 처리

**Response:**
```json
{
  "success": true,
  "data": {
    "updatedCount": 3,
    "unreadCount": 0
  }
}
```

#### DELETE /v1/notifications/{notificationId}
알림 삭제

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### 9.3 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `NOTIFICATION_NOT_FOUND` | 404 | 존재하지 않는 알림 |
| `NOT_NOTIFICATION_OWNER` | 403 | 다른 사람의 알림 접근 시도 |

### 9.4 알림 정책 및 저장 모델

> Phase 8 Spring Notification 인프라는 `references/index.ts`의 Cloud Functions 운영 정책을 기준으로 parity를 맞추되,
> 런타임 계약의 canonical enum/DTO는 Spring API 기준으로 정렬합니다.

- 저장 모델:
  - 인앱 인박스: `user_notifications`
  - FCM 토큰: `fcm_tokens`
  - 레퍼런스의 Firestore(`users/{uid}.fcmTokens[]`, `userNotifications/...`)는 운영 정책 비교용 참고 자료입니다.
- 이벤트 발행 시점:
  - 상태 변경 성공 후 `after-commit`으로 `ApplicationEventPublisher`에 전달합니다.
  - 알림 저장/푸시 실패는 핵심 트랜잭션을 롤백시키지 않습니다.

| 알림 타입 | 기준 트리거 | 수신 대상 | 설정 반영 | 인앱 인박스 |
|----------|-------------|-----------|-----------|-------------|
| `PARTY_CREATED` | 새 파티 생성 | 생성자 제외 전체 사용자 | `allNotifications` + `partyNotifications` | X |
| `PARTY_JOIN_REQUEST` | 동승 요청 생성 | 파티 리더 | `allNotifications` + `partyNotifications` | O |
| `PARTY_JOIN_ACCEPTED` / `PARTY_JOIN_DECLINED` | 요청 상태 변경 | 요청자 | `allNotifications` + `partyNotifications` | O |
| `PARTY_CLOSED` / `PARTY_REOPENED` / `PARTY_ARRIVED` | 파티 상태 변경 | 리더 제외 파티 멤버 | `allNotifications` + `partyNotifications` | `PARTY_CLOSED`: X / `PARTY_REOPENED`: X / `PARTY_ARRIVED`: O |
| `SETTLEMENT_COMPLETED` | 마지막 정산 완료 | 파티 전체 멤버 | `allNotifications` + `partyNotifications` | O |
| `MEMBER_KICKED` | 강퇴 감지 | 강퇴된 멤버 | `allNotifications` + `partyNotifications` | O |
| `PARTY_ENDED` | 파티 해체 | 리더 제외 파티 멤버 | `allNotifications` + `partyNotifications` | O |
| `CHAT_MESSAGE` (공개 채팅) | 공개 채팅방 메시지 | 채팅방 멤버(송신자 제외) | `allNotifications` + 채팅방 mute. 멤버 입장/퇴장 `SYSTEM` 메시지는 push 제외 | X |
| `CHAT_MESSAGE` (파티 채팅) | 파티 채팅 메시지 (`TEXT`, `IMAGE`, `ACCOUNT`, 일반 `SYSTEM`) | 파티 멤버(송신자 제외) | 파티 채팅 mute 대상 제외, `data`는 `chatRoomId` canonical 사용. 멤버 입장/퇴장 `SYSTEM` 메시지와 `모집 마감`/`모집 재개`/`도착`/`종료`는 `CHAT_MESSAGE` push 제외 | X |
| `POST_LIKED` | 게시글 좋아요 | 게시글 작성자 | `allNotifications` + `boardLikeNotifications` | O |
| `COMMENT_CREATED` (게시글) | 댓글/답글 생성 | 게시글 작성자, 부모 댓글 작성자, 게시글 북마크 사용자 | `allNotifications` + `commentNotifications` + `bookmarkedPostCommentNotifications` (중복 수신자는 1회 dedupe) | O |
| `COMMENT_CREATED` (공지) | 공지 댓글 답글 생성 | 부모 댓글 작성자 | `allNotifications` + `commentNotifications` | O |
| `NOTICE` | 새 학교 공지 | 공지 허용 사용자 | `allNotifications` + `noticeNotifications` + `noticeNotificationsDetail` | O |
| `APP_NOTICE` | 앱 공지 생성 | 일반: 시스템 알림 허용 사용자 / `HIGH`: 전체 사용자 | 일반: `allNotifications` + `systemNotifications`, `HIGH`는 설정 무시 | O |
| `ACADEMIC_SCHEDULE` | 학사 일정 리마인더 | 학사 일정 알림 허용 사용자 | `allNotifications` + `academicScheduleNotifications` | O |

- 공지 댓글은 현재 `Notice.author`가 회원 식별자가 아닌 문자열이므로, 루트 댓글 작성자(공지 작성자) 알림은 런타임에서 보장하지 않습니다. 현재 구현은 부모 댓글 작성자 대상 답글 알림만 발송합니다.
- 학사 일정 리마인더는 `AcademicScheduleReminder` 도메인 이벤트 기반으로 처리합니다.
- 기본 정책:
  - 기준일: `AcademicSchedule.startDate`
  - 시각: 오전 `09:00 Asia/Seoul`
  - 대상: 중요 일정(`isPrimary = true`)
  - 멀티데이 일정은 `startDate`를 기준으로 계산
- 사용자 옵션:
  - 일정 전날 오전 `09:00` 추가
  - 중요 일정만이 아니라 모든 일정 대상으로 확장
- 사용자 설정 필드:
  - `academicScheduleNotifications`
  - `academicScheduleDayBeforeEnabled`
  - `academicScheduleAllEventsEnabled`

---

## 10. SSE (Server-Sent Events)

> `role-definition.md` §8.2 기준:
> 파티 목록/상태, 알림, 게시물 목록/조회수는 SSE를 통해 실시간 업데이트를 제공한다.
> 채팅 실시간 통신은 SSE 대상이 아니며, §4.5 WebSocket(STOMP) 경로를 사용한다.

### 10.1 개요

| 항목 | 내용 |
|------|------|
| 프로토콜 | HTTP/1.1 SSE (`text/event-stream`) |
| 방향 | 단방향 (서버 → 클라이언트) |
| 인증 | 연결 시작 시 Firebase ID Token을 `Authorization` 헤더로 전달 |
| 재연결 | 클라이언트가 `retry` 필드 기준으로 자동 재연결 (기본 3,000ms) |
| 연결 유지 | 30초마다 서버에서 heartbeat 이벤트 전송 |

### 10.2 SSE 이벤트 포맷

모든 SSE 이벤트는 다음 형식을 따릅니다.

```
id: <이벤트 고유 ID>
event: <이벤트 타입>
data: <JSON 문자열>
retry: 3000
```

**예시:**
```
id: 1706922000000
event: PARTY_CREATED
data: {"id":"uuid","leaderId":"uuid","leaderName":"홍길동","leaderPhotoUrl":null,"departure":{"name":"성결대학교","lat":37.382742,"lng":126.928031},"destination":{"name":"안양역","lat":37.401234,"lng":126.922345},"departureTime":"2026-02-03T14:00:00","maxMembers":4,"currentMembers":1,"tags":["빠른출발"],"detail":"정문 앞에서 출발","status":"OPEN","createdAt":"2026-02-03T12:00:00"}
retry: 3000
```

**OpenAPI/Scalar 예시 표기 전략**

- SSE `200` 응답은 `stream_full`(연속 이벤트 흐름) 1개와 이벤트별 단건 예시를 함께 제공한다.
- 이벤트별 단건 예시는 `event` 이름 단위로 분리한다. (`SNAPSHOT`, `HEARTBEAT`, 도메인 이벤트)
- 각 예시의 `data` 구조는 런타임 발행 payload와 동일해야 한다.

### 10.3 파티 실시간 구독

#### GET /v1/sse/parties
파티 목록 및 상태 변경을 실시간으로 구독합니다.

**인증:** Firebase ID Token 필수

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**구독 이벤트 목록:**

| 이벤트 타입 | 발생 시점 | 수신 대상 |
|-----------|---------|---------|
| `SNAPSHOT` | 연결 직후/재연결 직후 현재 상태 스냅샷 전송 | 연결 사용자 |
| `PARTY_CREATED` | 새 파티 생성됨 | 전체 연결 사용자 |
| `PARTY_UPDATED` | 파티 정보 수정됨 | 전체 연결 사용자 |
| `PARTY_STATUS_CHANGED` | 파티 상태 변경됨 | 전체 연결 사용자 |
| `PARTY_DELETED` | 파티 삭제/취소됨 | 전체 연결 사용자 |
| `PARTY_MEMBER_JOINED` | 멤버 합류 | 해당 파티 멤버 |
| `PARTY_MEMBER_LEFT` | 멤버 나감/강퇴 | 해당 파티 멤버 |
| `HEARTBEAT` | 30초 주기 연결 유지 | 전체 연결 사용자 |

**RN 파싱 기준 DTO (strict)**

```ts
type PartyLocationPayload = {
  name: string;
  lat: number;
  lng: number;
};

type PartySummaryPayload = {
  id: string;
  leaderId: string;
  leaderName: string | null;
  leaderPhotoUrl: string | null;
  participantSummaries: {
    id: string;
    photoUrl: string | null;
    nickname: string | null;
    isLeader: boolean;
  }[];
  departure: PartyLocationPayload;
  destination: PartyLocationPayload;
  departureTime: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss" (KST 기준)
  maxMembers: number;
  currentMembers: number;
  tags: string[] | null;
  detail: string | null;
  status: "OPEN" | "CLOSED" | "ARRIVED" | "ENDED";
  createdAt: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};

type PartyStatusChangedPayload = {
  id: string;
  status: "OPEN" | "CLOSED" | "ARRIVED" | "ENDED";
  currentMembers: number;
  endReason?: "ARRIVED" | "FORCE_ENDED" | "CANCELLED" | "TIMEOUT" | "WITHDRAWED";
};

type PartyMemberJoinedPayload = {
  partyId: string;
  memberId: string;
  memberName: string | null;
  currentMembers: number;
};

type PartyMemberLeftPayload = {
  partyId: string;
  memberId: string;
  reason: "LEFT" | "KICKED";
  currentMembers: number;
};

type SnapshotPayload = {
  parties: PartySummaryPayload[];
};

type HeartbeatPayload = {
  timestamp: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};
```

> `PARTY_CREATED`, `PARTY_UPDATED`, `SNAPSHOT.parties[*]`는 동일한 `PartySummaryPayload` 스키마를 사용합니다.

**이벤트 데이터 형식:**

```
// SNAPSHOT
event: SNAPSHOT
data: {
  "parties": [
    {
      "id": "party_uuid",
      "leaderId": "user_uuid",
      "leaderName": "홍길동",
      "leaderPhotoUrl": null,
      "participantSummaries": [
        {
          "id": "user_uuid",
          "photoUrl": null,
          "nickname": "홍길동",
          "isLeader": true
        }
      ],
      "departure": {
        "name": "성결대학교",
        "lat": 37.382742,
        "lng": 126.928031
      },
      "destination": {
        "name": "안양역",
        "lat": 37.401234,
        "lng": 126.922345
      },
      "departureTime": "2026-02-03T14:00:00",
      "maxMembers": 4,
      "currentMembers": 1,
      "tags": ["빠른출발"],
      "detail": null,
      "status": "OPEN",
      "createdAt": "2026-02-03T12:00:00"
    }
  ]
}

// PARTY_CREATED
event: PARTY_CREATED
data: {
  "id": "party_uuid",
  "leaderId": "user_uuid",
  "leaderName": "홍길동",
  "leaderPhotoUrl": "https://example.com/profile.jpg",
  "participantSummaries": [
    {
      "id": "user_uuid",
      "photoUrl": "https://example.com/profile.jpg",
      "nickname": "홍길동",
      "isLeader": true
    }
  ],
  "departure": {
    "name": "성결대학교",
    "lat": 37.382742,
    "lng": 126.928031
  },
  "destination": {
    "name": "안양역",
    "lat": 37.401234,
    "lng": 126.922345
  },
  "departureTime": "2026-02-03T14:00:00",
  "maxMembers": 4,
  "currentMembers": 1,
  "tags": ["빠른출발"],
  "detail": "정문 앞에서 출발",
  "status": "OPEN",
  "createdAt": "2026-02-03T12:00:00"
}

// PARTY_UPDATED
event: PARTY_UPDATED
data: {
  "id": "party_uuid",
  "leaderId": "user_uuid",
  "leaderName": "홍길동",
  "leaderPhotoUrl": "https://example.com/profile.jpg",
  "participantSummaries": [
    {
      "id": "user_uuid",
      "photoUrl": "https://example.com/profile.jpg",
      "nickname": "홍길동",
      "isLeader": true
    },
    {
      "id": "member_uuid_1",
      "photoUrl": null,
      "nickname": "김민수",
      "isLeader": false
    }
  ],
  "departure": {
    "name": "성결대학교",
    "lat": 37.382742,
    "lng": 126.928031
  },
  "destination": {
    "name": "안양역",
    "lat": 37.401234,
    "lng": 126.922345
  },
  "departureTime": "2026-02-03T14:30:00",
  "maxMembers": 4,
  "currentMembers": 2,
  "tags": ["빠른출발"],
  "detail": "10분 후 출발",
  "status": "OPEN",
  "createdAt": "2026-02-03T12:00:00"
}

// PARTY_STATUS_CHANGED
event: PARTY_STATUS_CHANGED
data: {
  "id": "party_uuid",
  "status": "CLOSED",
  "currentMembers": 3
}

// PARTY_STATUS_CHANGED (종료 시)
event: PARTY_STATUS_CHANGED
data: {
  "id": "party_uuid",
  "status": "ENDED",
  "currentMembers": 3,
  "endReason": "TIMEOUT"
}

// PARTY_DELETED
event: PARTY_DELETED
data: {
  "id": "party_uuid"
}

// PARTY_MEMBER_JOINED
event: PARTY_MEMBER_JOINED
data: {
  "partyId": "party_uuid",
  "memberId": "user_uuid",
  "memberName": "김철수",
  "currentMembers": 2
}

// PARTY_MEMBER_LEFT
event: PARTY_MEMBER_LEFT
data: {
  "partyId": "party_uuid",
  "memberId": "user_uuid",
  "reason": "KICKED",
  "currentMembers": 1
}

// HEARTBEAT
event: HEARTBEAT
data: {"timestamp": "2026-02-03T12:00:30"}
```

#### GET /v1/sse/parties/{partyId}/join-requests
특정 파티의 동승 요청 목록/상태를 실시간으로 구독합니다.

> 도입 목적: 파티 리더 화면에서 동승 요청 목록 UI를 자동 갱신

**인증:** Firebase ID Token 필수 (파티 리더만 구독 가능)

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**구독 이벤트 목록:**

| 이벤트 타입 | 발생 시점 | 수신 대상 |
|-----------|---------|---------|
| `SNAPSHOT` | 연결 직후/재연결 직후 현재 요청 목록 스냅샷 전송 | 연결 사용자(리더) |
| `JOIN_REQUEST_CREATED` | 해당 파티에 신규 동승 요청 생성 | 해당 파티 리더 |
| `JOIN_REQUEST_UPDATED` | 동승 요청 상태 변경 (ACCEPTED/DECLINED/CANCELED) | 해당 파티 리더 |
| `HEARTBEAT` | 30초 주기 연결 유지 | 연결 사용자(리더) |

**권한/예외:**

| errorCode | HTTP | 설명 |
|----------|------|------|
| `NOT_PARTY_LEADER` | 403 | 파티 리더가 아닌 사용자의 구독 요청 |
| `PARTY_NOT_FOUND` | 404 | 존재하지 않는 파티 |

**RN 파싱 기준 DTO (strict)**

```ts
type JoinRequestSsePayload = {
  id: string;
  partyId: string;
  requesterId: string;
  requesterName: string | null;
  requesterPhotoUrl: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  createdAt: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};

type PartyJoinRequestSnapshotPayload = {
  partyId: string;
  requests: JoinRequestSsePayload[];
};
```

**이벤트 데이터 형식:**

```
// SNAPSHOT
event: SNAPSHOT
data: {
  "partyId": "party_uuid",
  "requests": [
    {
      "id": "request_uuid",
      "partyId": "party_uuid",
      "requesterId": "user_uuid",
      "requesterName": "김철수",
      "requesterPhotoUrl": null,
      "status": "PENDING",
      "createdAt": "2026-02-03T12:00:00"
    }
  ]
}

// JOIN_REQUEST_CREATED
event: JOIN_REQUEST_CREATED
data: {
  "id": "request_uuid",
  "partyId": "party_uuid",
  "requesterId": "user_uuid",
  "requesterName": "김철수",
  "requesterPhotoUrl": null,
  "status": "PENDING",
  "createdAt": "2026-02-03T12:00:00"
}

// JOIN_REQUEST_UPDATED
event: JOIN_REQUEST_UPDATED
data: {
  "id": "request_uuid",
  "partyId": "party_uuid",
  "requesterId": "user_uuid",
  "requesterName": "김철수",
  "requesterPhotoUrl": null,
  "status": "ACCEPTED",
  "createdAt": "2026-02-03T12:00:00"
}
```

#### GET /v1/sse/members/me/join-requests
내 동승 요청 목록/상태를 실시간으로 구독합니다.

> 도입 목적: 요청자 화면에서 수락/거절/취소 상태를 자동 갱신

**인증:** Firebase ID Token 필수 (본인 요청만 수신)

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 필터 (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED`) |

> `status` 필터는 `SNAPSHOT`에 즉시 적용됩니다.  
> `MY_JOIN_REQUEST_UPDATED`는 상태 전이 전/후 중 하나라도 필터와 일치하면 전송됩니다(목록 제거/추가 동기화 목적).

**구독 이벤트 목록:**

| 이벤트 타입 | 발생 시점 |
|-----------|---------|
| `SNAPSHOT` | 연결 직후/재연결 직후 현재 요청 목록 스냅샷 전송 |
| `MY_JOIN_REQUEST_CREATED` | 내 신규 동승 요청 생성 |
| `MY_JOIN_REQUEST_UPDATED` | 내 동승 요청 상태 변경 |
| `HEARTBEAT` | 30초 주기 연결 유지 |

**RN 파싱 기준 DTO (strict)**

```ts
type MyJoinRequestSsePayload = {
  id: string;
  partyId: string;
  requesterId: string;
  requesterName: string | null;
  requesterPhotoUrl: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  createdAt: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};

type MyJoinRequestSnapshotPayload = {
  requests: MyJoinRequestSsePayload[];
};
```

**이벤트 데이터 형식:**

```
// SNAPSHOT
event: SNAPSHOT
data: {
  "requests": [
    {
      "id": "request_uuid",
      "partyId": "party_uuid",
      "requesterId": "user_uuid",
      "requesterName": "김철수",
      "requesterPhotoUrl": null,
      "status": "PENDING",
      "createdAt": "2026-02-03T12:00:00"
    }
  ]
}

// MY_JOIN_REQUEST_UPDATED
event: MY_JOIN_REQUEST_UPDATED
data: {
  "id": "request_uuid",
  "partyId": "party_uuid",
  "requesterId": "user_uuid",
  "requesterName": "김철수",
  "requesterPhotoUrl": null,
  "status": "DECLINED",
  "createdAt": "2026-02-03T12:00:00"
}
```

### 10.4 알림 실시간 구독

#### GET /v1/sse/notifications
사용자 알림을 실시간으로 구독합니다.

**인증:** Firebase ID Token 필수 (본인 알림만 수신)

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**구독 이벤트 목록:**

| 이벤트 타입 | 발생 시점 |
|-----------|---------|
| `SNAPSHOT` | 연결 직후/재연결 직후 현재 상태 스냅샷 전송 |
| `NOTIFICATION` | 새 알림 도착 (모든 알림 타입 공통) |
| `UNREAD_COUNT_CHANGED` | 읽지 않은 일반 알림 수 변경 (`APP_NOTICE` 제외) |
| `HEARTBEAT` | 30초 주기 연결 유지 |

- `SNAPSHOT.unreadCount`와 `UNREAD_COUNT_CHANGED.count`는 모두 일반 알림 unread 집계이며 `APP_NOTICE`를 제외합니다.
- 앱 공지 unread count는 `GET /v1/members/me/app-notices/unread-count`로 별도 조회합니다.

**RN 파싱 기준 DTO (strict)**

```ts
type NotificationDataPayload = {
  partyId?: string;
  requestId?: string;
  chatRoomId?: string;
  postId?: string;
  commentId?: string;
  noticeId?: string;
  appNoticeId?: string;
  academicScheduleId?: string;
};

type NotificationPayload = {
  id: string;
  type:
    | "PARTY_CREATED"
    | "PARTY_JOIN_REQUEST"
    | "PARTY_JOIN_ACCEPTED"
    | "PARTY_JOIN_DECLINED"
    | "PARTY_CLOSED"
    | "PARTY_ARRIVED"
    | "PARTY_ENDED"
    | "MEMBER_KICKED"
    | "SETTLEMENT_COMPLETED"
    | "CHAT_MESSAGE"
    | "POST_LIKED"
    | "COMMENT_CREATED"
    | "NOTICE"
    | "APP_NOTICE"
    | "ACADEMIC_SCHEDULE";
  title: string;
  message: string;
  data: NotificationDataPayload;
  isRead: boolean;
  createdAt: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};

type UnreadCountChangedPayload = {
  count: number;
};

type NotificationSnapshotPayload = {
  unreadCount: number;
};

type NotificationHeartbeatPayload = {
  timestamp: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};
```

**이벤트 데이터 형식:**

```
// SNAPSHOT
event: SNAPSHOT
data: {
  "unreadCount": 3
}

// NOTIFICATION
event: NOTIFICATION
data: {
  "id": "notification_uuid",
  "type": "PARTY_JOIN_ACCEPTED",
  "title": "동승 요청이 승인되었어요",
  "message": "파티에 합류하세요!",
  "data": {
    "partyId": "party_uuid"
  },
  "isRead": false,
  "createdAt": "2026-02-03T12:00:00"
}

// NOTIFICATION (학사 일정)
event: NOTIFICATION
data: {
  "id": "notification_uuid",
  "type": "ACADEMIC_SCHEDULE",
  "title": "학사 일정 리마인더",
  "message": "수강신청 일정이 오늘 시작돼요.",
  "data": {
    "academicScheduleId": "academic_schedule_uuid"
  },
  "isRead": false,
  "createdAt": "2026-03-08T09:00:00"
}

// UNREAD_COUNT_CHANGED
event: UNREAD_COUNT_CHANGED
data: {
  "count": 3
}

// HEARTBEAT
event: HEARTBEAT
data: {
  "timestamp": "2026-02-03T12:00:30"
}
```

**알림 타입 → 이동 경로:**

| 알림 타입 | data 필드 | 이동 경로 |
|---------|---------|---------|
| `PARTY_CREATED` | `partyId` | 파티 목록 |
| `PARTY_JOIN_REQUEST` | `partyId`, `requestId` | 동승 요청 목록 |
| `PARTY_JOIN_ACCEPTED` | `partyId`, `requestId` | 파티 상세 |
| `PARTY_JOIN_DECLINED` | `partyId`, `requestId` | 파티 목록 |
| `PARTY_CLOSED` | `partyId` | 파티 상세 |
| `PARTY_ARRIVED` | `partyId` | 파티 상세 (정산) |
| `PARTY_ENDED` | `partyId` | 파티 상세 |
| `MEMBER_KICKED` | `partyId` | 파티 목록 |
| `SETTLEMENT_COMPLETED` | `partyId` | 파티 상세 |
| `CHAT_MESSAGE` | `chatRoomId` | 채팅방 |
| `POST_LIKED` | `postId` | 게시글 상세 |
| `COMMENT_CREATED` (게시글) | `postId`, `commentId` | 게시글 상세 |
| `COMMENT_CREATED` (공지) | `noticeId`, `commentId` | 공지 상세 |
| `NOTICE` | `noticeId` | 공지 상세 |
| `APP_NOTICE` | `appNoticeId` | 앱 공지 상세 |
| `ACADEMIC_SCHEDULE` | `academicScheduleId` | 학사 일정 상세 |

### 10.5 게시물 실시간 구독

#### GET /v1/sse/posts
게시물 목록 변경 및 조회수를 실시간으로 구독합니다.

**인증:** Firebase ID Token 필수

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `category` | string | 특정 카테고리만 구독 (생략 시 전체) |
| `postId` | string | 특정 게시글 조회수만 구독 |

**구독 이벤트 목록:**

| 이벤트 타입 | 발생 시점 |
|-----------|---------|
| `SNAPSHOT` | 연결 직후/재연결 직후 현재 상태 스냅샷 전송 |
| `POST_CREATED` | 새 게시글 작성됨 |
| `POST_UPDATED` | 게시글 수정됨 |
| `POST_DELETED` | 게시글 삭제됨 |
| `POST_VIEW_COUNT_UPDATED` | 조회수 변경됨 (5 단위 배치 업데이트) |
| `HEARTBEAT` | 30초 주기 연결 유지 |

**RN 파싱 기준 DTO (strict)**

```ts
type PostSummaryPayload = {
  id: string;
  title: string;
  authorName: string | null;
  isAnonymous: boolean;
  category: "GENERAL" | "QUESTION" | "REVIEW" | "ANNOUNCEMENT";
  createdAt: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};

type PostDeletedPayload = {
  id: string;
};

type PostViewCountUpdatedPayload = {
  id: string;
  viewCount: number;
};

type PostSnapshotPayload = {
  posts: PostSummaryPayload[];
};

type PostHeartbeatPayload = {
  timestamp: string; // LocalDateTime, "yyyy-MM-dd'T'HH:mm:ss"
};
```

**이벤트 데이터 형식:**

```
// SNAPSHOT
event: SNAPSHOT
data: {
  "posts": [
    {
      "id": "post_uuid",
      "title": "게시글 제목",
      "authorName": "홍길동",
      "isAnonymous": false,
      "category": "GENERAL",
      "createdAt": "2026-02-03T12:00:00"
    }
  ]
}

// POST_CREATED
event: POST_CREATED
data: {
  "id": "post_uuid",
  "title": "게시글 제목",
  "authorName": "홍길동",
  "isAnonymous": false,
  "category": "GENERAL",
  "createdAt": "2026-02-03T12:00:00"
}

// POST_UPDATED
event: POST_UPDATED
data: {
  "id": "post_uuid",
  "title": "수정된 게시글 제목",
  "authorName": "홍길동",
  "isAnonymous": false,
  "category": "GENERAL",
  "createdAt": "2026-02-03T12:00:00"
}

// POST_DELETED
event: POST_DELETED
data: {
  "id": "post_uuid"
}

// POST_VIEW_COUNT_UPDATED
event: POST_VIEW_COUNT_UPDATED
data: {
  "id": "post_uuid",
  "viewCount": 105
}

// HEARTBEAT
event: HEARTBEAT
data: {
  "timestamp": "2026-02-03T12:00:30"
}
```

### 10.6 SSE 연결 관리

#### 연결 시작

React Native 클라이언트에서 SSE 연결은 `EventSource` 또는 `fetch` 스트리밍을 사용합니다.

```
// 연결 예시
GET /v1/sse/parties
Authorization: Bearer <firebase_id_token>
Accept: text/event-stream
```

#### 연결 끊김 / 재연결

- 서버는 `retry: 3000` 필드를 통해 클라이언트에게 재연결 간격(ms)을 지시합니다.
- 클라이언트가 재연결하면 서버는 **현재 상태 스냅샷을 `SNAPSHOT` 이벤트로 즉시 전송**합니다.
- 누락 이벤트 버퍼링은 하지 않습니다. 재연결 시점의 최신 상태가 곧 정답입니다.

**스냅샷 이벤트 형식 (재연결 직후 서버 전송):**

```
// 파티 목록 SSE (/v1/sse/parties) 재연결 시
event: SNAPSHOT
data: {
  "parties": [ /* 현재 파티 목록 전체 */ ]
}

// 알림 SSE (/v1/sse/notifications) 재연결 시
event: SNAPSHOT
data: {
  "unreadCount": 3
}

// 게시물 SSE (/v1/sse/posts) 재연결 시
event: SNAPSHOT
data: {
  "posts": [
    {
      "id": "post_uuid",
      "title": "게시글 제목",
      "authorName": "홍길동",
      "isAnonymous": false,
      "category": "GENERAL",
      "createdAt": "2026-02-03T12:00:00"
    }
  ]
}
```

> **Firebase onSnapshot과의 차이:**
> Firebase SDK는 연결 끊김 동안의 변경사항을 SDK 레벨에서 자동으로 동기화해줬습니다.
> Spring SSE는 SDK가 없으므로, 재연결 시 서버가 현재 상태를 다시 전송하는 방식으로 대체합니다.

```http
GET /v1/sse/parties
Authorization: Bearer <firebase_id_token>
```

#### 연결 종료 코드

| HTTP 상태 | 의미 | 클라이언트 동작 |
|----------|------|--------------|
| `200` | 연결 성공, 스트리밍 중 | 이벤트 수신 대기 |
| `401` | 인증 실패 (토큰 만료 등) | Firebase ID Token 갱신 후 재연결 |
| `403` | 권한 없음 | 재연결 금지 |

### 10.7 에러 이벤트

SSE 연결 중 서버 오류 발생 시 `ERROR` 이벤트를 전송 후 연결을 종료합니다.

```
event: ERROR
data: {
  "errorCode": "INTERNAL_ERROR",
  "message": "서버 오류가 발생했습니다."
}
```

---

## 11. Image API

이미지 업로드는 **클라이언트 → Spring 서버(multipart) → StorageRepository 구현체** 순으로 처리됩니다.
현재 기본 runtime provider는 **LOCAL 파일시스템**이며, `FIREBASE` provider도 선택할 수 있습니다.

### 11.1 이미지 업로드

#### POST /v1/images
이미지 파일을 서버를 통해 업로드하고, 원본/썸네일 URL과 메타데이터를 반환합니다.

**인증:** Firebase ID Token 필수

**Request:** `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | File | O | 이미지 파일 (JPEG, PNG, WebP) |
| `context` | string | O | 업로드 컨텍스트 (`POST_IMAGE` \| `CHAT_IMAGE` \| `APP_NOTICE_IMAGE` \| `CAMPUS_BANNER_IMAGE` \| `PROFILE_IMAGE` \| `INQUIRY_IMAGE`) |

**context 권한 정책**

| context | 권한 | 주 사용처 |
|---------|------|-----------|
| `POST_IMAGE` | 인증 사용자 | Board `images[]` |
| `CHAT_IMAGE` | 인증 사용자 | Chat `imageUrl` |
| `PROFILE_IMAGE` | 인증 사용자 | Member profile `photoUrl` |
| `INQUIRY_IMAGE` | 인증 사용자 | Inquiry `attachments[]` |
| `APP_NOTICE_IMAGE` | 관리자만 허용 | AppNotice `imageUrls[]` |
| `CAMPUS_BANNER_IMAGE` | 관리자만 허용 | CampusBanner `imageUrl` |

**제약 조건**
- 최대 파일 크기: 10MB
- 허용 형식: JPEG, PNG, WebP
- 최대 해상도: 가로 5000px, 세로 5000px, 총 픽셀 수 20,000,000 이하
- 응답 필드: `url`, `thumbUrl`, `width`, `height`, `size`, `mime`
- LOCAL provider에서는 업로드 결과 URL이 `GET {media.storage.url-prefix}/**`로 공개 제공되며, Authorization 헤더가 있어도 공개 조회를 우선한다.
- FIREBASE provider에서는 Firebase Storage download URL을 그대로 반환한다.

**썸네일 생성 규칙**
- 서버가 업로드 시점에 원본 이미지를 리사이징해 썸네일을 함께 생성합니다.
- 최대 너비는 300px이며, 높이는 원본 비율을 유지합니다.
- 썸네일 파일명은 원본 파일명에 `_thumb` 접미사를 붙입니다.
- alpha 채널이 없는 이미지는 JPEG 썸네일, alpha 채널이 있는 이미지는 PNG 썸네일을 기본으로 사용합니다.

**저장 경로 규칙**
- `POST_IMAGE` → `posts/YYYY/MM/DD/{uuid}.{ext}`
- `CHAT_IMAGE` → `chat/YYYY/MM/DD/{uuid}.{ext}`
- `PROFILE_IMAGE` → `profiles/{memberId}/YYYY/MM/DD/{uuid}.{ext}`
- `INQUIRY_IMAGE` → `inquiries/YYYY/MM/DD/{uuid}.{ext}`
- `APP_NOTICE_IMAGE` → `app-notices/YYYY/MM/DD/{uuid}.{ext}`
- `CAMPUS_BANNER_IMAGE` → `campus-banners/YYYY/MM/DD/{uuid}.{ext}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "url": "https://api.skuri.example/uploads/posts/2026/03/10/4f3ec1a0.jpg",
    "thumbUrl": "https://api.skuri.example/uploads/posts/2026/03/10/4f3ec1a0_thumb.jpg",
    "width": 800,
    "height": 600,
    "size": 245123,
    "mime": "image/jpeg"
  }
}
```

**에러 코드**

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `INVALID_REQUEST` | 400 | multipart 파라미터 누락, 빈 `file`, 또는 잘못된 `context` |
| `ADMIN_REQUIRED` | 403 | `APP_NOTICE_IMAGE`를 일반 사용자가 업로드 |
| `IMAGE_DIMENSIONS_EXCEEDED` | 422 | 허용 해상도 또는 총 픽셀 수 초과 |
| `IMAGE_TOO_LARGE` | 413 | 파일 크기 초과 (10MB 초과) |
| `IMAGE_INVALID_FORMAT` | 415 | 지원하지 않는 이미지 형식 |
| `IMAGE_UPLOAD_FAILED` | 500 | 스토리지 저장 또는 썸네일 생성 실패 |

---

### 11.2 이미지 업로드 플로우

#### 게시글 이미지

```
클라이언트
    │
    ├─ 1. POST /v1/images (multipart, context=POST_IMAGE)
    │      └─ Response: { url, thumbUrl, width, height, size, mime }
    │
    └─ 2. POST /v1/posts
           {
             "title": "...",
             "content": "...",
             "images": [{ "url": "...", "thumbUrl": "...", "width": 800, "height": 600, "size": 245123, "mime": "image/jpeg" }]
           }
```

#### 채팅 이미지

```
클라이언트
    │
    ├─ 1. POST /v1/images (multipart, context=CHAT_IMAGE)
    │      └─ Response: { url, ... }
    │
    └─ 2. SEND /app/chat/{chatRoomId}
           { "type": "IMAGE", "imageUrl": "https://..." }
```

#### 앱 공지 이미지

```
클라이언트(관리자)
    │
    ├─ 1. POST /v1/images (multipart, context=APP_NOTICE_IMAGE)
    │      └─ Response: { url, ... }
    │
    └─ 2. POST /v1/admin/app-notices
           { "imageUrls": ["https://..."], ... }
```

#### 캠퍼스 홈 배너 이미지

```
클라이언트(관리자)
    │
    ├─ 1. POST /v1/images (multipart, context=CAMPUS_BANNER_IMAGE)
    │      └─ Response: { url, ... }
    │
    └─ 2. POST /v1/admin/campus-banners
           { "imageUrl": "https://...", ... }
```

#### 프로필 이미지

```
클라이언트
    │
    ├─ 1. POST /v1/images (multipart, context=PROFILE_IMAGE)
    │      └─ Response: { url, ... }
    │
    └─ 2. PATCH /v1/members/me
           { "photoUrl": "https://cdn.skuri.app/uploads/profiles/{memberId}/YYYY/MM/DD/{uuid}.{ext}" }
```

프로필 사진을 제거할 때는 아래 흐름을 사용합니다.

```
클라이언트
    │
    └─ DELETE /v1/members/me/photo
           └─ Response: { "success": true, "data": null }
```

#### 문의 첨부 이미지

```
클라이언트
    │
    ├─ 1. POST /v1/images (multipart, context=INQUIRY_IMAGE)
    │      └─ Response: { url, thumbUrl, width, height, size, mime }
    │
    └─ 2. POST /v1/inquiries
           { "attachments": [{ "url": "https://...", "thumbUrl": "https://...", "width": 800, "height": 600, "size": 245123, "mime": "image/jpeg" }], ... }
```

---

### 11.3 Storage 추상화 설계

Spring 서버는 `StorageRepository` 인터페이스로 storage provider를 추상화합니다.

```java
interface StorageRepository {
    StoredObject store(String relativePath, byte[] data, String contentType);
    void delete(String relativePath);
    Optional<String> resolveRelativePath(String publicUrl);

    record StoredObject(String relativePath, String publicUrl) {}
}
```

현재 provider는 LOCAL 파일시스템과 FIREBASE를 지원한다. LOCAL은 공개 URL prefix/base URL을 설정값으로 관리하고, FIREBASE는 bucket 업로드 후 tokenized download URL을 반환한다.

| 현재 기본 provider | 후속 교체 대상 |
|--------------------|----------------|
| LOCAL 파일시스템, FIREBASE | AWS S3, OCI Object Storage, MinIO 등 |

---

## 12. Admin API

관리자(`isAdmin: true`)만 접근 가능한 API입니다.
모든 Admin API는 Firebase ID Token 인증 후 `isAdmin` 여부를 추가로 검증합니다.

```
인증 실패 시: 401 UNAUTHORIZED
isAdmin == false 시: 403 FORBIDDEN (ADMIN_REQUIRED)
```

**운영 공통 규약**
- 공통 인가: Admin Controller는 공통 메타 어노테이션(`@AdminApiAccess`) 기준으로 보호하며, `/v1/admin/**` 접근 거부는 `403 ADMIN_REQUIRED`로 표준화한다.
- 감사 로그: 상태 변경 Admin API(`POST`, `PUT`, `PATCH`, `DELETE`)는 `admin_audit_logs`에 `actor_id(uid)`, `action`, `target_type`, `target_id`, `diff_before`, `diff_after`, `timestamp`를 저장한다. `actor_id`는 `members.id`의 논리적 참조이며 물리 FK는 두지 않는다. `target_id`는 raw 입력이 아니라 서비스와 동일한 canonical 키(`semester=2026-1`, `platform=ios`)를 저장한다. `GET` 조회는 고빈도 운영 조회 로그와 개인정보 중복 적재를 피하기 위해 감사 로그 대상에서 제외한다.
- 목록 조회 규약: 문의/신고 Admin 목록은 `PageResponse`를 사용하고 `page=0`, `size=20`, `size<=100`, 고정 정렬 `createdAt,DESC`를 따른다. 회원 Admin 목록은 `query(email/nickname/realname/studentId 부분 검색)`, `status`, `isAdmin`, `department` 필터와 `joinedAt,DESC` 고정 정렬을 사용한다. 자유 검색/가변 정렬/CSV export는 현 Phase 런타임 API 범위에서 제외한다.
- 운영 데이터 노출: Inquiry의 구조화 개인정보(`userEmail`, `userName`, `userRealname`, `userStudentId`)는 관리자 응답에서만 노출하며, 회원 탈퇴 후에는 탈퇴 마스킹 정책이 적용된 값만 조회된다. 자유서술 `content`는 별도 자동 마스킹하지 않는다.

> **기존 방식과의 차이:**
> 마이그레이션 전에는 `scripts/manage-app-notices.js` 등 Node.js 스크립트가
> Firebase Admin SDK를 통해 Firestore에 직접 write했습니다.
> 마이그레이션 후에는 해당 스크립트들이 이 Admin API를 호출하는 방식으로 교체됩니다.

---

### 12.1 관리자 회원 관리

#### GET /v1/admin/members
회원 목록 조회

- 목적: `/users` 화면의 목록/검색/필터/페이지네이션/컬럼 정렬
- `sortBy`, `sortDirection`을 생략하면 기본 정렬은 `joinedAt DESC`다.
- 허용 정렬 필드는 `id`, `realname`, `email`, `nickname`, `department`, `studentId`, `joinedAt`, `lastLogin`, `lastLoginOs`, `currentAppVersion`이다.
- 정렬 시 `null` 값은 항상 마지막에 배치한다.
- `id`는 Firebase UID이므로 프론트의 UID 컬럼으로 그대로 사용한다.
- 이름 컬럼은 `members.realname`을 사용한다.
- `lastLoginOs`, `currentAppVersion`은 최근 활성 FCM 토큰(`fcm_tokens`)의 대표 토큰(`coalesce(last_used_at, created_at)` 최신) 기준으로 함께 계산한다.
- `currentAppVersion`의 source는 대표 토큰의 `fcm_tokens.app_version`이며, 모바일이 아직 보내지 않은 경우 `null`일 수 있다.
- `query`는 `email`, `nickname`, `realname`, `studentId` 부분 검색에 사용한다.
- `status`는 현재 `MemberStatus`(`ACTIVE`, `WITHDRAWN`)만 허용한다.
- `department`는 회원 프로필 수정과 동일한 학과 카탈로그를 사용한다. legacy alias(예: `소프트웨어학과`)는 canonical 값으로 정규화하고, 지원하지 않는 값은 `422 VALIDATION_ERROR`를 반환한다.
- 지원하지 않는 `sortBy`, `sortDirection`은 `422 VALIDATION_ERROR`를 반환한다.

**Query Parameters:**

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | int | `0` | 페이지 번호 |
| `size` | int | `20` | 페이지 크기 (`1..100`) |
| `query` | string | `null` | `email/nickname/realname/studentId` 부분 검색 |
| `status` | enum | `null` | `ACTIVE`, `WITHDRAWN` |
| `isAdmin` | boolean | `null` | 관리자 여부 필터 |
| `department` | string | `null` | canonical 학과명 필터 |
| `sortBy` | string | `joinedAt` | `id`, `realname`, `email`, `nickname`, `department`, `studentId`, `joinedAt`, `lastLogin`, `lastLoginOs`, `currentAppVersion` |
| `sortDirection` | string | `DESC` | `ASC`, `DESC` |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "member-1",
        "email": "admin@sungkyul.ac.kr",
        "nickname": "스쿠리 운영자",
        "realname": "김관리",
        "studentId": "20190001",
        "department": "컴퓨터공학과",
        "isAdmin": true,
        "joinedAt": "2024-03-01T09:00:00",
        "lastLogin": "2026-03-29T11:20:00",
        "lastLoginOs": "android",
        "currentAppVersion": "1.4.2",
        "status": "ACTIVE"
      },
      {
        "id": "member-2",
        "email": "user@sungkyul.ac.kr",
        "nickname": "스쿠리 유저",
        "realname": "홍길동",
        "studentId": "2023112233",
        "department": "경영학과",
        "isAdmin": false,
        "joinedAt": "2025-09-01T08:30:00",
        "lastLogin": "2026-03-28T18:00:00",
        "lastLoginOs": null,
        "currentAppVersion": null,
        "status": "ACTIVE"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 48,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### GET /v1/admin/members/{memberId}
회원 상세 조회

- 목적: 관리자용 회원 상세 사이드패널/상세 화면
- 활성 회원과 탈퇴 회원 모두 조회할 수 있다.
- 운영 화면 요구사항에 맞춰 `bankAccount`, `notificationSetting`, `withdrawnAt`를 함께 제공한다.
- `bankAccount`는 관리자 상세 응답 계약에 포함되며, admin-role 변경 감사 로그 최소 snapshot 정책과 별개로 유지한다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "member-2",
    "email": "user@sungkyul.ac.kr",
    "nickname": "스쿠리 유저",
    "realname": "홍길동",
    "studentId": "2023112233",
    "department": "컴퓨터공학과",
    "photoUrl": "https://cdn.skuri.app/profiles/user-2.png",
    "isAdmin": false,
    "status": "ACTIVE",
    "joinedAt": "2025-03-01T09:00:00",
    "lastLogin": "2026-03-29T10:05:00",
    "withdrawnAt": null,
    "bankAccount": {
      "bankName": "신한은행",
      "accountNumber": "110-123-456789",
      "accountHolder": "홍길동",
      "hideName": false
    },
    "notificationSetting": {
      "allNotifications": true,
      "partyNotifications": true,
      "noticeNotifications": true,
      "boardLikeNotifications": true,
      "commentNotifications": true,
      "bookmarkedPostCommentNotifications": true,
      "systemNotifications": true,
      "academicScheduleNotifications": true,
      "academicScheduleDayBeforeEnabled": true,
      "academicScheduleAllEventsEnabled": false,
      "noticeNotificationsDetail": {
        "academic": true,
        "event": false
      }
    }
  }
}
```

#### GET /v1/admin/members/{memberId}/activity
회원 활동 요약 조회

- 목적: `/users` 상세 패널 하단의 count card + 최근 활동 섹션
- ACTIVE 회원만 조회할 수 있다. 회원이 없으면 `404 MEMBER_NOT_FOUND`, 탈퇴 회원(`WITHDRAWN`)이면 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`을 반환한다.
- 활동 요약은 현재 DB에 남아 있는 데이터만 기준으로 계산한다. 삭제/익명화된 과거 활동을 복원하지 않는다.
- count 정의:
  - `posts`: 현재 저장된 active post 중 `authorId = memberId`
  - `comments`: 현재 저장된 active comment 중 `authorId = memberId`이면서 부모 post도 삭제되지 않은 경우
  - `partiesCreated`: `leaderId = memberId`
  - `partiesJoined`: party membership 기준 참여 파티 수에서 leader role 제외
  - `inquiries`: `userId = memberId`
  - `reportsSubmitted`: `reporterId = memberId`
- recent list는 도메인별 최신순 최대 5건이며, `recentComments`도 삭제되지 않은 부모 post 기준으로만 포함된다. `recentParties`는 `LEADER`/`JOINED` role을 함께 내려준다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "memberId": "dw9rPtuticbjnaYPkeiF3RGPpqk1",
    "generatedAt": "2026-03-29T16:00:00",
    "counts": {
      "posts": 12,
      "comments": 34,
      "partiesCreated": 3,
      "partiesJoined": 7,
      "inquiries": 2,
      "reportsSubmitted": 1
    },
    "recentPosts": [
      {
        "id": "post-1",
        "title": "택시 파티 구해요",
        "category": "GENERAL",
        "createdAt": "2026-03-28T14:00:00"
      }
    ],
    "recentComments": [
      {
        "id": "comment-1",
        "postId": "post-1",
        "postTitle": "택시 파티 구해요",
        "contentPreview": "저도 참여하고 싶어요",
        "createdAt": "2026-03-28T14:10:00"
      }
    ],
    "recentParties": [
      {
        "id": "party-1",
        "role": "LEADER",
        "status": "OPEN",
        "routeSummary": "성결대 정문 → 안양역",
        "departureTime": "2026-03-30T18:00:00",
        "createdAt": "2026-03-29T09:00:00"
      },
      {
        "id": "party-2",
        "role": "JOINED",
        "status": "CLOSED",
        "routeSummary": "성결대 정문 → 범계역",
        "departureTime": "2026-03-29T18:30:00",
        "createdAt": "2026-03-28T20:00:00"
      }
    ],
    "recentInquiries": [
      {
        "id": "inquiry-1",
        "type": "ACCOUNT",
        "subject": "계정 문의",
        "status": "PENDING",
        "createdAt": "2026-03-28T11:00:00"
      }
    ],
    "recentReports": [
      {
        "id": "report-1",
        "targetType": "POST",
        "targetId": "post-9",
        "category": "SPAM",
        "status": "REVIEWING",
        "createdAt": "2026-03-27T20:00:00"
      }
    ]
  }
}
```

**Response (409 Conflict - withdrawn member):**
```json
{
  "success": false,
  "message": "탈퇴한 회원의 활동 요약은 조회할 수 없습니다.",
  "errorCode": "MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN",
  "timestamp": "2026-03-29T12:00:00"
}
```

#### PATCH /v1/admin/members/{memberId}/admin-role
관리자 권한 부여/회수

- 목적: 회원의 `isAdmin` boolean 변경
- 요청은 관리자 권한 부여(`true`) 또는 회수(`false`)만 다룬다.
- 자기 자신의 계정(`actorId == memberId`)에 대한 관리자 권한 변경은 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`로 거부한다.
- 탈퇴 회원(`WITHDRAWN`)은 접근 차단 대상이며, 관리자 권한 변경 요청에는 `409 CONFLICT`를 반환한다.
- self role change guard만으로 admin console orphaning을 방지하고, 마지막 관리자 수 계산 같은 추가 정책은 이번 Phase 범위에서 제외한다.
- admin-role 변경 감사 로그는 최소 snapshot(`id`, `email`, `nickname`, `isAdmin`, `status`)만 저장하며 `bankAccount`, `notificationSetting`는 적재하지 않는다.

**Request:**
```json
{
  "isAdmin": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "member-2",
    "email": "user@sungkyul.ac.kr",
    "nickname": "스쿠리 유저",
    "realname": "홍길동",
    "studentId": "2023112233",
    "department": "컴퓨터공학과",
    "photoUrl": "https://cdn.skuri.app/profiles/user-2.png",
    "isAdmin": true,
    "status": "ACTIVE",
    "joinedAt": "2025-03-01T09:00:00",
    "lastLogin": "2026-03-29T10:05:00",
    "withdrawnAt": null,
    "bankAccount": {
      "bankName": "신한은행",
      "accountNumber": "110-123-456789",
      "accountHolder": "홍길동",
      "hideName": false
    },
    "notificationSetting": {
      "allNotifications": true,
      "partyNotifications": true,
      "noticeNotifications": true,
      "boardLikeNotifications": true,
      "commentNotifications": true,
      "bookmarkedPostCommentNotifications": true,
      "systemNotifications": true,
      "academicScheduleNotifications": true,
      "academicScheduleDayBeforeEnabled": true,
      "academicScheduleAllEventsEnabled": false,
      "noticeNotificationsDetail": {
        "academic": true,
        "event": false
      }
    }
  }
}
```

**Response (400 Bad Request - self role change):**
```json
{
  "success": false,
  "message": "자기 자신의 관리자 권한은 변경할 수 없습니다.",
  "errorCode": "SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED",
  "timestamp": "2026-03-29T12:00:00"
}
```

**Response (409 Conflict - 탈퇴 회원):**
```json
{
  "success": false,
  "message": "탈퇴한 회원의 관리자 권한은 변경할 수 없습니다.",
  "errorCode": "CONFLICT",
  "timestamp": "2026-03-29T12:00:00"
}
```

### 12.2 캠퍼스 홈 배너 관리

#### GET /v1/admin/campus-banners
캠퍼스 홈 배너 목록 조회

- 정렬: `displayOrder ASC`, 동률이면 `createdAt DESC`
- 비활성/예약/종료 배너도 모두 조회한다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "campus_banner_uuid_1",
      "badgeLabel": "택시 파티",
      "titleLabel": "택시 동승 매칭",
      "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
      "buttonLabel": "파티 찾기",
      "paletteKey": "GREEN",
      "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
      "actionType": "IN_APP",
      "actionTarget": "TAXI_MAIN",
      "actionParams": null,
      "actionUrl": null,
      "isActive": true,
      "displayStartAt": "2026-03-25T00:00:00",
      "displayEndAt": null,
      "displayOrder": 1,
      "createdAt": "2026-03-25T10:00:00",
      "updatedAt": "2026-03-25T10:00:00"
    }
  ]
}
```

#### GET /v1/admin/campus-banners/{bannerId}
캠퍼스 홈 배너 상세 조회

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "campus_banner_uuid_1",
    "badgeLabel": "택시 파티",
    "titleLabel": "택시 동승 매칭",
    "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
    "buttonLabel": "파티 찾기",
    "paletteKey": "GREEN",
    "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
    "actionType": "IN_APP",
    "actionTarget": "TAXI_MAIN",
    "actionParams": null,
    "actionUrl": null,
    "isActive": true,
    "displayStartAt": "2026-03-25T00:00:00",
    "displayEndAt": null,
    "displayOrder": 1,
    "createdAt": "2026-03-25T10:00:00",
    "updatedAt": "2026-03-25T10:00:00"
  }
}
```

#### POST /v1/admin/campus-banners
캠퍼스 홈 배너 생성

- `imageUrl`에는 `POST /v1/images`의 `CAMPUS_BANNER_IMAGE` 업로드 결과 URL을 넣을 수 있습니다.
- 생성 시 `displayOrder`는 항상 현재 마지막 순서 뒤로 append 합니다.

**Request:**
```json
{
  "badgeLabel": "택시 파티",
  "titleLabel": "택시 동승 매칭",
  "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
  "buttonLabel": "파티 찾기",
  "paletteKey": "GREEN",
  "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
  "actionType": "IN_APP",
  "actionTarget": "TAXI_MAIN",
  "actionParams": null,
  "actionUrl": null,
  "isActive": true,
  "displayStartAt": "2026-03-25T00:00:00",
  "displayEndAt": null
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "campus_banner_uuid_1",
    "badgeLabel": "택시 파티",
    "titleLabel": "택시 동승 매칭",
    "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
    "buttonLabel": "파티 찾기",
    "paletteKey": "GREEN",
    "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
    "actionType": "IN_APP",
    "actionTarget": "TAXI_MAIN",
    "actionParams": null,
    "actionUrl": null,
    "isActive": true,
    "displayStartAt": "2026-03-25T00:00:00",
    "displayEndAt": null,
    "displayOrder": 1,
    "createdAt": "2026-03-25T10:00:00",
    "updatedAt": "2026-03-25T10:00:00"
  }
}
```

#### PATCH /v1/admin/campus-banners/{bannerId}
캠퍼스 홈 배너 부분 수정

- 전달한 필드만 반영한다.
- 캠퍼스 배너 PATCH는 `null`도 명시적 값으로 처리한다.
- `actionType`을 변경할 때는 반대편 필드를 함께 정리해야 한다.
  - `IN_APP`로 바꾸면 `actionUrl: null`
  - `EXTERNAL_URL`로 바꾸면 `actionTarget: null`, `actionParams: null`

**Request:**
```json
{
  "buttonLabel": "공지 보기",
  "paletteKey": "BLUE",
  "actionType": "IN_APP",
  "actionTarget": "NOTICE_MAIN",
  "actionParams": null,
  "actionUrl": null,
  "isActive": true,
  "displayEndAt": "2026-04-30T23:59:59"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "campus_banner_uuid_1",
    "badgeLabel": "택시 파티",
    "titleLabel": "택시 동승 매칭",
    "descriptionLabel": "같은 방향 가는 학생과 택시비를 함께 나눠요",
    "buttonLabel": "공지 보기",
    "paletteKey": "BLUE",
    "imageUrl": "https://cdn.skuri.app/uploads/campus-banners/2026/03/25/banner-1.jpg",
    "actionType": "IN_APP",
    "actionTarget": "NOTICE_MAIN",
    "actionParams": null,
    "actionUrl": null,
    "isActive": true,
    "displayStartAt": "2026-03-25T00:00:00",
    "displayEndAt": "2026-04-30T23:59:59",
    "displayOrder": 1,
    "createdAt": "2026-03-25T10:00:00",
    "updatedAt": "2026-03-25T10:30:00"
  }
}
```

#### DELETE /v1/admin/campus-banners/{bannerId}
캠퍼스 홈 배너 삭제

- 삭제 후에도 `displayOrder`는 1부터 시작하는 연속값으로 normalize 합니다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

#### PUT /v1/admin/campus-banners/order
캠퍼스 홈 배너 순서 변경

- `bannerIds`에는 현재 존재하는 전체 캠퍼스 배너 ID를 중복 없이 모두 전달해야 한다.
- 순서 변경 후 `displayOrder`는 1부터 시작하는 연속값으로 다시 부여한다.

**Request:**
```json
{
  "bannerIds": [
    "campus_banner_uuid_2",
    "campus_banner_uuid_1",
    "campus_banner_uuid_3"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "campus_banner_uuid_2",
      "displayOrder": 1
    },
    {
      "id": "campus_banner_uuid_1",
      "displayOrder": 2
    },
    {
      "id": "campus_banner_uuid_3",
      "displayOrder": 3
    }
  ]
}
```

**검증 규칙:**
- 문자열 필드는 trim 후 저장하며, trim 결과가 비어 있으면 `422 VALIDATION_ERROR`
- `imageUrl`, `actionUrl` 최대 길이는 500자
- `displayEndAt < displayStartAt` 금지
- `actionParams`는 JSON object만 허용

### 12.3 앱 공지 관리

#### POST /v1/admin/app-notices
앱 공지 생성

- `imageUrls[]`에는 `POST /v1/images`의 `APP_NOTICE_IMAGE` 업로드 결과 URL을 넣을 수 있습니다.

**Request:**
```json
{
  "title": "서버 점검 안내",
  "content": "2월 20일 새벽 2시~4시 서버 점검이 있습니다.",
  "category": "MAINTENANCE",
  "priority": "HIGH",
  "imageUrls": [],
  "actionUrl": null,
  "publishedAt": "2026-02-20T00:00:00Z"
}
```

**category:** `UPDATE` | `MAINTENANCE` | `EVENT` | `GENERAL`
**priority:** `HIGH` | `NORMAL` | `LOW`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "app_notice_uuid",
    "title": "서버 점검 안내",
    "createdAt": "2026-02-19T12:00:00Z"
  }
}
```

#### PATCH /v1/admin/app-notices/{appNoticeId}
앱 공지 부분 수정

- 전달한 필드만 반영한다.
- 누락된 필드와 `null` 필드는 변경하지 않는다.
- 모든 수정 가능 필드를 보내면 전체 수정처럼 사용할 수 있다.

**Request:**
```json
{
  "title": "서버 점검 안내 (수정)",
  "content": "점검 시간이 변경되었습니다.",
  "priority": "HIGH"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "app_notice_uuid",
    "title": "서버 점검 안내 (수정)",
    "content": "점검 시간이 변경되었습니다.",
    "category": "MAINTENANCE",
    "priority": "HIGH",
    "imageUrls": [],
    "actionUrl": null,
    "publishedAt": "2026-02-20T00:00:00Z",
    "createdAt": "2026-02-19T12:00:00Z",
    "updatedAt": "2026-02-19T12:30:00Z"
  }
}
```

#### DELETE /v1/admin/app-notices/{appNoticeId}
앱 공지 삭제

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

### 12.4 앱 버전 관리

#### PUT /v1/admin/app-versions/{platform}
앱 버전 정보 업데이트

**platform:** `ios` | `android`

**Request:**
```json
{
  "minimumVersion": "1.6.0",
  "forceUpdate": true,
  "title": "필수 업데이트 안내",
  "message": "안정성 개선을 위한 필수 업데이트입니다.",
  "showButton": true,
  "buttonText": "업데이트",
  "buttonUrl": "https://apps.apple.com/..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "platform": "ios",
    "minimumVersion": "1.6.0",
    "forceUpdate": true,
    "updatedAt": "2026-02-19T12:00:00Z"
  }
}
```

---

### 12.5 법적 문서 관리

#### GET /v1/admin/legal-documents
법적 문서 목록 요약 조회

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "privacyPolicy",
      "title": "개인정보 처리방침",
      "isActive": true,
      "updatedAt": "2026-03-28T10:00:00Z"
    },
    {
      "id": "termsOfUse",
      "title": "이용약관",
      "isActive": true,
      "updatedAt": "2026-03-28T10:00:00Z"
    }
  ]
}
```

#### GET /v1/admin/legal-documents/{documentKey}
법적 문서 상세 조회

**documentKey:** `termsOfUse` | `privacyPolicy`

#### PUT /v1/admin/legal-documents/{documentKey}
법적 문서 생성/전체 수정

**Request:**
```json
{
  "title": "이용약관",
  "banner": {
    "iconKey": "document",
    "lines": [
      {
        "text": "시행일: 2025년 3월 1일 · 최종 수정: 2025년 3월 1일",
        "tone": "primary"
      }
    ],
    "title": "SKURI 이용약관",
    "tone": "green"
  },
  "sections": [
    {
      "id": "article-01",
      "title": "제1조(목적)",
      "paragraphs": [
        "이 약관은 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다."
      ]
    }
  ],
  "footerLines": [
    "본 약관에 대한 문의는",
    "앱 내 문의하기를 이용해 주세요."
  ],
  "isActive": true
}
```

#### DELETE /v1/admin/legal-documents/{documentKey}
법적 문서 삭제

---

### 12.6 공개 채팅방 관리

공개 채팅방(UNIVERSITY, DEPARTMENT 등)은 사용자가 직접 생성할 수 없으며, 관리자만 생성/삭제합니다.
파티 채팅방은 파티 생성 시 서버 내부에서 자동으로 생성됩니다.

관리자 조회 API 정책:

- `GET /v1/admin/chat-rooms*`는 현재 관리자 계정의 join 여부와 무관하게 `isPublic=true && type!=PARTY` 공개 채팅방만 조회합니다.
- `DEPARTMENT` 타입도 관리자에게는 학과 제한 없이 모두 노출합니다.
- 기존 사용자 DTO를 재사용하므로 관리자 응답의 개인 상태 필드는 아래 고정값을 사용합니다.
  - summary/detail: `joined=false`, `unreadCount=0`, `isMuted=false`
  - detail: `lastReadAt=null`
- 관리자 조회(`GET`) API는 read-only 운영 API이며 `admin_audit_logs` 적재 대상에 포함하지 않습니다.

#### GET /v1/admin/chat-rooms
관리자 공개 채팅방 목록 조회

운영 화면 `/chat-rooms`의 전체 공개방 목록/필터용 API다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `type` | string | optional. `UNIVERSITY`, `DEPARTMENT`, `GAME`, `CUSTOM`, `PARTY` |

정책 메모:

- 반환 대상은 항상 `isPublic=true && type!=PARTY`다.
- `type=PARTY`를 요청해도 빈 목록을 반환한다.
- `joined` 필터는 관리자 API에서 제공하지 않는다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "public:university",
      "type": "UNIVERSITY",
      "name": "성결대학교 전체 채팅방",
      "description": "성결대학교 학생 전체 공개 채팅방",
      "isPublic": true,
      "memberCount": 153,
      "joined": false,
      "unreadCount": 0,
      "lastMessage": {
        "type": "TEXT",
        "text": "안녕하세요!",
        "senderName": "홍길동",
        "createdAt": "2026-04-06T18:20:00"
      },
      "lastMessageAt": "2026-04-06T18:20:00",
      "isMuted": false
    },
    {
      "id": "public:department:computer",
      "type": "DEPARTMENT",
      "name": "컴퓨터공학과 채팅방",
      "description": "학과 공지와 잡담을 나누는 공간",
      "isPublic": true,
      "memberCount": 41,
      "joined": false,
      "unreadCount": 0,
      "lastMessage": null,
      "lastMessageAt": null,
      "isMuted": false
    }
  ]
}
```

#### GET /v1/admin/chat-rooms/{chatRoomId}
관리자 공개 채팅방 상세 조회

운영 화면 `/chat-rooms`의 상세 패널/모달 조회용 API다.

정책 메모:

- `isPublic=true && type!=PARTY` 방만 조회할 수 있다.
- `PARTY` 타입, 비공개 방, 존재하지 않는 방은 모두 `404 CHAT_ROOM_NOT_FOUND`로 숨긴다.
- 개인 상태 필드는 관리자 의미가 없으므로 `joined=false`, `unreadCount=0`, `isMuted=false`, `lastReadAt=null`을 사용한다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "public:department:computer",
    "type": "DEPARTMENT",
    "name": "컴퓨터공학과 채팅방",
    "description": "학과 공지와 잡담을 나누는 공간",
    "isPublic": true,
    "memberCount": 41,
    "joined": false,
    "unreadCount": 0,
    "lastMessage": {
      "type": "TEXT",
      "text": "스터디 인원 구합니다.",
      "senderName": "김성결",
      "createdAt": "2026-04-06T17:40:00"
    },
    "lastMessageAt": "2026-04-06T17:40:00",
    "isMuted": false,
    "lastReadAt": null
  }
}
```

#### POST /v1/admin/chat-rooms
공개 채팅방 생성

**Request:**
```json
{
  "name": "성결대 전체 채팅방",
  "type": "UNIVERSITY",
  "description": "성결대학교 학생들의 소통 공간",
  "isPublic": true
}
```

**type:** `UNIVERSITY` | `DEPARTMENT` | `GAME` | `CUSTOM` | `PARTY`

**검증 규칙:**
- `type=PARTY`는 허용되지 않습니다. (`400 INVALID_REQUEST`)
- `isPublic=true`만 허용됩니다. (`400 INVALID_REQUEST`)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "room_uuid",
    "name": "성결대 전체 채팅방",
    "type": "UNIVERSITY"
  }
}
```

#### DELETE /v1/admin/chat-rooms/{chatRoomId}
공개 채팅방 삭제

**검증 규칙:**
- 존재하지 않는 채팅방: `404 CHAT_ROOM_NOT_FOUND`
- `PARTY` 타입 삭제 시도: `400 INVALID_REQUEST`
- 비공개 채팅방 삭제 시도: `400 INVALID_REQUEST`

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

#### GET /v1/admin/chat-rooms/{chatRoomId}/messages
관리자 공개 채팅방 메시지 조회

관리자가 공개 채팅방 메시지 이력을 멤버십 없이 조회하는 API다.

정책 메모:

- 대상은 `isPublic=true && type!=PARTY` 공개 채팅방만 허용한다.
- 사용자용 `GET /v1/chat-rooms/{chatRoomId}/messages`와 달리 join 여부를 요구하지 않는다.
- `PARTY` 타입, 비공개 방, 존재하지 않는 방은 모두 `404 CHAT_ROOM_NOT_FOUND`다.
- 응답 shape와 커서 규칙은 사용자용 메시지 조회와 동일하다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `cursorCreatedAt` | datetime | 다음 페이지 시작 기준 createdAt (nullable, `cursorId`와 쌍) |
| `cursorId` | string | 다음 페이지 시작 기준 messageId (nullable, `cursorCreatedAt`와 쌍) |
| `size` | int | 페이지 크기 (기본 50, 최대 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "chat-message-2",
        "chatRoomId": "public:department:computer",
        "senderId": "member-2",
        "senderName": "김성결",
        "senderPhotoUrl": null,
        "type": "TEXT",
        "text": "스터디 인원 구합니다.",
        "createdAt": "2026-04-06T17:40:00"
      },
      {
        "id": "chat-message-1",
        "chatRoomId": "public:department:computer",
        "senderId": "member-3",
        "senderName": "박스쿠리",
        "senderPhotoUrl": "https://cdn.skuri.app/profiles/member-3.png",
        "type": "TEXT",
        "text": "오늘 저녁에 모집할게요.",
        "createdAt": "2026-04-06T17:20:00"
      }
    ],
    "nextCursor": {
      "cursorCreatedAt": "2026-04-06T17:20:00",
      "cursorId": "chat-message-1"
    },
    "hasNext": true
  }
}
```

---

### 12.7 학교 공지 동기화

기존 `scripts/upload-notices.js`의 역할을 대체합니다.
학교 공지 크롤링 후 DB에 동기화합니다.

#### POST /v1/admin/notices/sync
학교 공지 동기화 실행

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "created": 15,
    "updated": 3,
    "skipped": 42,
    "failed": 2,
    "syncedAt": "2026-02-19T12:00:00"
  }
}
```

**예외:**
- 동기화가 이미 진행 중이면 `409 RESOURCE_CONCURRENT_MODIFICATION`

**운영 정책:**
- 개별 공지 저장 실패는 전체 동기화를 중단하지 않고 `failed`로 집계한 뒤 다음 공지 처리를 계속합니다.

---

### 12.8 학식 메뉴 관리

#### POST /v1/admin/cafeteria-menus
학식 메뉴 등록

`menus` 또는 `menuEntries` 중 하나는 반드시 전달해야 한다.
둘 다 전달하면 각 날짜/카테고리별 메뉴 제목 배열이 정확히 일치해야 하며, 불일치 시 `400 INVALID_REQUEST`를 반환한다.
단, `menus`에서 비어 있는 카테고리를 생략한 경우는 `menuEntries`의 빈 배열과 동일하게 취급한다.
카테고리 코드는 학식 메뉴 ID 안정성을 위해 영문, 숫자, 밑줄(`_`), 하이픈(`-`)만 허용하며 점(`.`)은 허용하지 않는다.
`menuEntries.badges`는 자유 입력 라벨과 optional code를 받으며, code를 생략하면 서버가 label 기반으로 자동 생성한다.
`menuEntries.likeCount`/`dislikeCount`는 deprecated 입력값으로 남아 있지만 저장 시 무시된다.
실제 응답 `likeCount`/`dislikeCount`는 사용자 반응 집계가 source of truth다.
같은 주 안에서 동일한 `category + title`이 여러 날짜에 반복되면 `badges`, `likeCount`, `dislikeCount`는 모두 동일해야 한다. badge 순서도 동일성 비교에 포함된다.

**Request:**
```json
{
  "weekId": "2026-W08",
  "weekStart": "2026-02-16",
  "weekEnd": "2026-02-20",
  "menuEntries": {
    "2026-02-16": {
      "rollNoodles": [
        {
          "title": "존슨부대찌개",
          "badges": [
            {
              "code": "TAKEOUT",
              "label": "테이크아웃"
            }
          ]
        }
      ],
      "theBab": [
        {
          "title": "돈까스",
          "badges": []
        }
      ],
      "fryRice": []
    }
  }
}
```

기존 하위호환 요청 예시:
```json
{
  "weekId": "2026-W08",
  "weekStart": "2026-02-16",
  "weekEnd": "2026-02-20",
  "menus": {
    "2026-02-16": {
      "rollNoodles": ["우동", "김밥"],
      "theBab": ["돈까스", "된장찌개"],
      "fryRice": ["볶음밥", "짜장면"]
    }
  }
}
```

주간 동일성 검증 실패 예시:
```json
{
  "success": false,
  "message": "같은 주차에서 동일 카테고리의 동일 메뉴는 날짜별 메타데이터가 동일해야 합니다. category=rollNoodles, title=존슨부대찌개, firstDate=2026-02-16, date=2026-02-17",
  "errorCode": "INVALID_REQUEST",
  "timestamp": "2026-03-29T12:00:00"
}
```

카테고리 코드 형식 검증 실패 예시:
```json
{
  "success": false,
  "message": "menuEntries.category는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2026-03-29T12:00:00"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "weekId": "2026-W08",
    "weekStart": "2026-02-16",
    "weekEnd": "2026-02-20",
    "menus": {
      "2026-02-16": {
        "rollNoodles": ["존슨부대찌개"],
        "theBab": ["돈까스"],
        "fryRice": []
      }
    },
    "categories": [
      {
        "code": "rollNoodles",
        "label": "Roll & Noodles"
      },
      {
        "code": "theBab",
        "label": "The bab"
      },
      {
        "code": "fryRice",
        "label": "Fry & Rice"
      }
    ],
    "menuEntries": {
      "2026-02-16": {
        "rollNoodles": [
          {
            "id": "2026-W08.rollNoodles.c4973864db4f8815",
            "title": "존슨부대찌개",
            "badges": [
              {
                "code": "TAKEOUT",
                "label": "테이크아웃"
              }
            ],
            "likeCount": 0,
            "dislikeCount": 0,
            "myReaction": null
          }
        ],
        "theBab": [
          {
            "id": "2026-W08.theBab.1f529546f2bf7ff3",
            "title": "돈까스",
            "badges": [],
            "likeCount": 0,
            "dislikeCount": 0,
            "myReaction": null
          }
        ],
        "fryRice": []
      }
    }
  }
}
```

#### PUT /v1/admin/cafeteria-menus/{weekId}
학식 메뉴 수정

`POST /v1/admin/cafeteria-menus`와 동일한 요청/응답 계약을 사용한다.
주차 내 메뉴 집합이 바뀌면 더 이상 존재하지 않는 메뉴의 기존 반응 row는 서버가 정리한다.

#### DELETE /v1/admin/cafeteria-menus/{weekId}
학식 메뉴 삭제

주차 학식 메뉴를 삭제하면 해당 주차의 사용자 반응 row도 함께 삭제한다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

### 12.9 학사 일정 관리

#### POST /v1/admin/academic-schedules
학사 일정 추가

**Request:**
```json
{
  "title": "중간고사",
  "startDate": "2026-04-15",
  "endDate": "2026-04-21",
  "type": "MULTI",
  "isPrimary": true,
  "description": "2026학년도 1학기 중간고사"
}
```

**type:** `SINGLE` (단일 날짜) | `MULTI` (기간)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "schedule_uuid",
    "title": "중간고사",
    "startDate": "2026-04-15",
    "endDate": "2026-04-21",
    "type": "MULTI",
    "isPrimary": true,
    "description": "2026학년도 1학기 중간고사"
  }
}
```

#### PUT /v1/admin/academic-schedules/{scheduleId}
학사 일정 수정

**Request / Response:** `POST /v1/admin/academic-schedules`와 동일한 필드를 사용하며, 성공 시 `200 OK`로 전체 학사 일정 객체를 반환한다.

#### PUT /v1/admin/academic-schedules/bulk
학사 일정 bulk sync

연간 JSON 업로드 같은 관리자 일괄 동기화용 API다.

- `scopeStartDate ~ scopeEndDate` 범위 **안에 완전히 포함되는 기존 일정만** sync 대상이다.
- 자연키는 `title + startDate + endDate + type` 이다.
- 같은 자연키가 있으면 같은 일정으로 보고 `description`, `isPrimary`만 변경 필드로 간주한다.
- 요청에 없는 scope 내부 기존 일정은 삭제한다.
- scope 밖 일정(`startDate < scopeStartDate` 또는 `endDate > scopeEndDate`)은 유지한다.
- bulk API에 한해 legacy 스크립트 호환을 위해 `type: single | multi | SINGLE | MULTI`를 모두 허용한다.
- 같은 payload를 다시 호출하면 changed-only update 규칙으로 `created/updated/deleted`가 모두 `0`일 수 있다.

**Request:**
```json
{
  "scopeStartDate": "2026-03-01",
  "scopeEndDate": "2027-02-28",
  "schedules": [
    {
      "title": "입학식 / 개강",
      "startDate": "2026-03-03",
      "endDate": "2026-03-03",
      "type": "single",
      "description": "정상수업",
      "isPrimary": true
    },
    {
      "title": "수강신청 변경기간",
      "startDate": "2026-03-04",
      "endDate": "2026-03-09",
      "type": "MULTI",
      "description": null,
      "isPrimary": true
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "scopeStartDate": "2026-03-01",
    "scopeEndDate": "2027-02-28",
    "created": 12,
    "updated": 37,
    "deleted": 5
  }
}
```

**Validation rules:**

- `scopeStartDate`, `scopeEndDate`는 필수이며 `scopeStartDate <= scopeEndDate`
- 각 일정은 scope 범위 안에 완전히 포함되어야 함
- 각 일정은 `title`, `startDate`, `endDate`, `type`, `isPrimary` 필수
- `startDate <= endDate`
- `type == SINGLE`이면 `startDate == endDate`
- 요청 내부에서 같은 `title + startDate + endDate + type` 중복 금지
- `schedules`는 최소 1개 이상

#### DELETE /v1/admin/academic-schedules/{scheduleId}
학사 일정 삭제

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

### 12.10 강의 관리

#### POST /v1/admin/courses/bulk
학기 강의 일괄 등록 (매 학기 강의 데이터 업로드)

`semester + code + division` 조합을 기준으로 업서트하며, 같은 학기에 기존에 존재하지만 이번 요청에 없는 강의는 삭제한다.
동시 업로드 등으로 유니크 충돌이 발생하면 `409 CONFLICT`를 반환한다.

**Request:**
```json
{
  "semester": "2026-1",
  "courses": [
    {
      "grade": 1,
      "category": "교양선택",
      "code": "20797",
      "division": "001",
      "name": "사랑의인문학(KCU온라인강좌)",
      "credits": 3,
      "professor": null,
      "location": null,
      "department": "교양",
      "note": null,
      "isOnline": true,
      "schedule": []
    }
  ]
}
```

- `isOnline`은 nullable Boolean이며, 값이 없으면 `false`로 처리한다.
- `isOnline = false`면 `schedule`이 최소 1개 이상 필요하다.
- `isOnline = true`면 `schedule`은 비어 있어야 하며, 현재 직접 입력 온라인 강의와 같은 의미로 취급한다.
- `isOnline = true`일 때 `location`은 입력돼도 서버에서 의미상 사용하지 않고 `null`로 정규화할 수 있다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "semester": "2026-1",
    "created": 120,
    "updated": 5,
    "deleted": 3
  }
}
```

#### DELETE /v1/admin/courses
학기 강의 전체 삭제

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `semester` | string | 삭제할 학기 (필수, 예: `2026-1`) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "semester": "2026-1",
    "created": 0,
    "updated": 0,
    "deleted": 125
  }
}
```

---

### 12.11 운영 문의/신고 관리

**운영 목록 공통 규약**
- 두 목록 API 모두 `PageResponse`(`content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`)를 동일하게 반환한다.
- 정렬은 서버 고정 `createdAt,DESC`이며 별도 `sort` 파라미터를 받지 않는다.
- 문의 목록은 `status`만, 신고 목록은 `status`, `targetType`만 필터로 지원한다.
- CSV export와 상세 전용 API는 현재 계약에 포함하지 않는다.

#### GET /v1/admin/inquiries
문의 전체 목록 조회 (관리자)

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 문의 상태 필터 (`PENDING`, `IN_PROGRESS`, `RESOLVED`) |
| `page` | int | 페이지 번호 (기본 0, 0 이상) |
| `size` | int | 페이지 크기 (기본 20, 1~100) |

- `page < 0` 또는 `size < 1 || size > 100`이면 `422 VALIDATION_ERROR`
- `status`가 enum 범위를 벗어나면 `400 INVALID_REQUEST`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "inquiry_uuid",
        "memberId": "user_uuid",
        "type": "BUG",
        "subject": "채팅 화면 오류",
        "content": "채팅 진입 시 앱이 종료됩니다.",
        "status": "PENDING",
        "attachments": [
          {
            "url": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0.jpg",
            "thumbUrl": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0_thumb.jpg",
            "width": 800,
            "height": 600,
            "size": 245123,
            "mime": "image/jpeg"
          }
        ],
        "memo": null,
        "userEmail": "user@sungkyul.ac.kr",
        "userName": "스쿠리유저",
        "userRealname": "홍길동",
        "userStudentId": "20201234",
        "createdAt": "2026-03-05T12:00:00Z",
        "updatedAt": "2026-03-05T12:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 53,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### PATCH /v1/admin/inquiries/{inquiryId}/status
문의 상태 처리 (관리자)

**Request:**
```json
{
  "status": "RESOLVED",
  "memo": "재현 후 수정 배포 완료"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "inquiry_uuid",
    "memberId": "user_uuid",
    "type": "BUG",
    "subject": "채팅 화면 오류",
    "content": "채팅 진입 시 앱이 종료됩니다.",
    "status": "RESOLVED",
    "attachments": [
      {
        "url": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0.jpg",
        "thumbUrl": "https://cdn.skuri.app/uploads/inquiries/2026/03/28/4f3ec1a0_thumb.jpg",
        "width": 800,
        "height": 600,
        "size": 245123,
        "mime": "image/jpeg"
      }
    ],
    "memo": "재현 후 수정 배포 완료",
    "userEmail": "user@sungkyul.ac.kr",
    "userName": "스쿠리유저",
    "userRealname": "홍길동",
    "userStudentId": "20201234",
    "createdAt": "2026-03-05T12:00:00Z",
    "updatedAt": "2026-03-05T12:30:00Z"
  }
}
```

#### GET /v1/admin/reports
신고 전체 목록 조회 (관리자)

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `status` | string | 신고 상태 필터 (`PENDING`, `REVIEWING`, `ACTIONED`, `REJECTED`) |
| `targetType` | string | 신고 대상 필터 (`POST`, `COMMENT`, `MEMBER`, `CHAT_MESSAGE`, `CHAT_ROOM`, `TAXI_PARTY`) |
| `page` | int | 페이지 번호 (기본 0, 0 이상) |
| `size` | int | 페이지 크기 (기본 20, 1~100) |

- `page < 0` 또는 `size < 1 || size > 100`이면 `422 VALIDATION_ERROR`
- `status`, `targetType`이 enum 범위를 벗어나면 `400 INVALID_REQUEST`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "report_uuid",
        "reporterId": "user_uuid",
        "targetType": "CHAT_MESSAGE",
        "targetId": "message_uuid",
        "targetAuthorId": "target_user_uuid",
        "category": "SPAM",
        "reason": "광고성 메시지입니다.",
        "status": "PENDING",
        "action": null,
        "memo": null,
        "createdAt": "2026-03-29T12:10:00Z",
        "updatedAt": "2026-03-29T12:10:00Z"
      },
      {
        "id": "report_uuid_2",
        "reporterId": "user_uuid",
        "targetType": "CHAT_ROOM",
        "targetId": "chat_room_uuid",
        "targetAuthorId": "room_owner_uuid",
        "category": "ABUSE",
        "reason": "부적절한 목적의 채팅방입니다.",
        "status": "PENDING",
        "action": null,
        "memo": null,
        "createdAt": "2026-03-29T12:20:00Z",
        "updatedAt": "2026-03-29T12:20:00Z"
      },
      {
        "id": "report_uuid_3",
        "reporterId": "user_uuid",
        "targetType": "TAXI_PARTY",
        "targetId": "party_uuid",
        "targetAuthorId": "party_host_uuid",
        "category": "FRAUD",
        "reason": "운행/정산 방식이 부적절합니다.",
        "status": "PENDING",
        "action": null,
        "memo": null,
        "createdAt": "2026-03-29T12:30:00Z",
        "updatedAt": "2026-03-29T12:30:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

#### PATCH /v1/admin/reports/{reportId}/status
신고 상태 처리 (관리자)

**Request:**
```json
{
  "status": "ACTIONED",
  "action": "DELETE_POST",
  "memo": "광고성 게시물 삭제 및 사용자 경고"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "report_uuid",
    "reporterId": "user_uuid",
    "targetType": "POST",
    "targetId": "post_uuid",
    "targetAuthorId": "target_user_uuid",
    "category": "SPAM",
    "reason": "광고성 게시글입니다.",
    "status": "ACTIONED",
    "action": "DELETE_POST",
    "memo": "광고성 게시물 삭제 및 사용자 경고",
    "createdAt": "2026-03-05T12:10:00Z",
    "updatedAt": "2026-03-05T12:20:00Z"
  }
}
```

---

### 12.12 택시 파티 운영 관리

#### GET /v1/admin/parties
택시 파티 운영 목록 조회 (관리자)

운영 화면 `/parties`의 목록/필터/검색/페이지네이션용 API다.

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | int | `0` | 페이지 번호 |
| `size` | int | `20` | 페이지 크기 |
| `status` | string | - | `OPEN`, `CLOSED`, `ARRIVED`, `ENDED` |
| `departureDate` | string (`yyyy-MM-dd`) | - | 출발일 필터 |
| `query` | string | - | 출발지/도착지/leader uid/leader nickname 검색 |

정렬 규칙:

- 기본 정렬은 `departureTime DESC`, tie-breaker는 `createdAt DESC`
- 별도 `sort` 파라미터는 이번 범위에 제공하지 않는다.

운영 응답 메모:

- 목록 최소 필드는 `id`, `status`, `leaderId`, `leaderNickname`, `routeSummary`, `departureTime`, `currentMembers`, `maxMembers`, `createdAt`
- 현재 TaxiParty 도메인에는 `gender`가 persisted field로 존재하지 않으므로 목록 응답에 포함하지 않는다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "party-20260304-001",
        "status": "OPEN",
        "leaderId": "dw9rPtuticbjnaYPkeiF3RGPpqk1",
        "leaderNickname": "스쿠리 유저",
        "routeSummary": "성결대학교 -> 안양역",
        "departureTime": "2026-03-04T21:00:00",
        "currentMembers": 2,
        "maxMembers": 4,
        "createdAt": "2026-03-04T19:00:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

#### GET /v1/admin/parties/{partyId}
택시 파티 운영 상세 조회 (관리자)

운영 화면 `/parties`의 상세 패널/모달 조회용 API다.

운영 응답 메모:

- 상세는 목록 필드 외에 `leader`, `members`, `pendingJoinRequestCount`, `settlementStatus`, `settlement`, `chatRoomId`, `createdAt`, `updatedAt`, `endedAt`를 포함한다.
- `chatRoomId`는 실제 연결된 파티 채팅방이 있을 때만 반환한다.
- 현재 도메인에 `lastStatusChangedAt`가 없으므로 별도 운영 메타로 만들지 않는다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "party-20260304-001",
    "status": "ARRIVED",
    "leaderId": "dw9rPtuticbjnaYPkeiF3RGPpqk1",
    "leaderNickname": "스쿠리 유저",
    "leader": {
      "id": "dw9rPtuticbjnaYPkeiF3RGPpqk1",
      "nickname": "스쿠리 유저",
      "photoUrl": "https://cdn.skuri.app/profiles/user-1.png"
    },
    "routeSummary": "성결대학교 -> 안양역",
    "departure": {
      "name": "성결대학교",
      "lat": 37.382742,
      "lng": 126.928031
    },
    "destination": {
      "name": "안양역",
      "lat": 37.401,
      "lng": 126.922
    },
    "departureTime": "2026-03-04T21:00:00",
    "currentMembers": 3,
    "maxMembers": 4,
    "members": [
      {
        "id": "dw9rPtuticbjnaYPkeiF3RGPpqk1",
        "nickname": "스쿠리 유저",
        "photoUrl": "https://cdn.skuri.app/profiles/user-1.png",
        "isLeader": true,
        "joinedAt": "2026-03-04T19:00:00"
      },
      {
        "id": "member-2",
        "nickname": "김철수",
        "photoUrl": null,
        "isLeader": false,
        "joinedAt": "2026-03-04T19:10:00"
      }
    ],
    "tags": ["빠른출발", "정문"],
    "detail": "정문 앞 택시승강장 집합",
    "pendingJoinRequestCount": 2,
    "settlementStatus": "PENDING",
    "settlement": {
      "status": "PENDING",
      "taxiFare": 15000,
      "splitMemberCount": 3,
      "perPersonAmount": 5000,
      "settlementTargetMemberIds": ["member-2", "member-3"],
      "account": {
        "bankName": "카카오뱅크",
        "accountNumber": "3333-01-1234567",
        "accountHolder": "홍*동",
        "hideName": true
      },
      "memberSettlements": [
        {
          "memberId": "member-2",
          "displayName": "김철수",
          "settled": false,
          "settledAt": null,
          "leftParty": false,
          "leftAt": null
        }
      ]
    },
    "chatRoomId": "party:party-20260304-001",
    "createdAt": "2026-03-04T19:00:00",
    "updatedAt": "2026-03-04T21:10:00"
  }
}
```

#### GET /v1/admin/parties/{partyId}/messages
택시 파티 채팅 메시지 조회 (관리자)

운영 화면 `/parties` 상세에서 해당 파티 채팅 이력을 조회하는 API다.

정책 메모:

- `partyId`가 존재해야 하며, 없으면 `404 PARTY_NOT_FOUND`다.
- 메시지 조회 대상 chat room은 canonical id `party:{partyId}`를 사용한다.
- 관리자 계정이 파티 멤버가 아니어도 조회할 수 있다.
- 파티는 존재하지만 연결된 채팅방이 없으면 `404 CHAT_ROOM_NOT_FOUND`다.
- 응답 shape와 커서 규칙은 `GET /v1/chat-rooms/{chatRoomId}/messages`와 동일하다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `cursorCreatedAt` | datetime | 다음 페이지 시작 기준 createdAt (nullable, `cursorId`와 쌍) |
| `cursorId` | string | 다음 페이지 시작 기준 messageId (nullable, `cursorCreatedAt`와 쌍) |
| `size` | int | 페이지 크기 (기본 50, 최대 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "party-message-3",
        "chatRoomId": "party:party-20260304-001",
        "senderId": "member-2",
        "senderName": "김철수",
        "senderPhotoUrl": null,
        "type": "TEXT",
        "text": "정문 앞 도착했습니다.",
        "createdAt": "2026-03-04T20:55:00"
      },
      {
        "id": "party-message-2",
        "chatRoomId": "party:party-20260304-001",
        "senderId": "system",
        "senderName": "시스템",
        "senderPhotoUrl": null,
        "type": "SYSTEM",
        "text": "김철수님이 입장했어요.",
        "createdAt": "2026-03-04T20:50:00"
      }
    ],
    "nextCursor": {
      "cursorCreatedAt": "2026-03-04T20:50:00",
      "cursorId": "party-message-2"
    },
    "hasNext": true
  }
}
```

#### PATCH /v1/admin/parties/{partyId}/status
택시 파티 상태 변경 (관리자)

관리자가 리더 권한 없이 운영 액션을 수행할 수 있는 상태 변경 API다.
단, **기존 TaxiParty 상태 머신을 우회하지 않고 동일 전이 규칙만 재사용**한다.

**Request:**
```json
{
  "action": "CLOSE"
}
```

`action` enum:

| 값 | 의미 | 허용 전이 |
|---|---|---|
| `CLOSE` | 모집 마감 | `OPEN -> CLOSED` |
| `REOPEN` | 모집 재개 | `CLOSED -> OPEN` |
| `CANCEL` | 파티 취소 | `OPEN/CLOSED -> ENDED(CANCELLED)` |
| `END` | 파티 강제 종료 | `ARRIVED -> ENDED(FORCE_ENDED)` |

정책 메모:

- 관리자라도 `END`는 `ARRIVED` 상태에서만 가능하다.
- 관리자라도 `CANCEL`은 `OPEN`, `CLOSED`에서만 가능하다.
- 임의 상태 점프(예: `OPEN -> ENDED(FORCE_ENDED)`)는 허용하지 않는다.
- 감사 로그는 최소 snapshot(`id`, `status`, `endReason`, `settlementStatus`, `endedAt`)만 저장한다.

**Response (200 OK, CLOSE 예시):**
```json
{
  "success": true,
  "data": {
    "id": "party-20260304-001",
    "status": "CLOSED"
  }
}
```

**Response (200 OK, END 예시):**
```json
{
  "success": true,
  "data": {
    "id": "party-20260304-001",
    "status": "ENDED",
    "endReason": "FORCE_ENDED"
  }
}
```

**Response (409 Conflict, 허용되지 않은 전이 예시):**
```json
{
  "success": false,
  "message": "ARRIVED 상태에서만 강제 종료할 수 있습니다.",
  "errorCode": "INVALID_PARTY_STATE_TRANSITION",
  "timestamp": "2026-03-29T12:00:00"
}
```

#### DELETE /v1/admin/parties/{partyId}/members/{memberId}
택시 파티 멤버 제거 (관리자)

관리자가 특정 파티에서 일반 참여자를 강제로 제거하는 API다.

정책 메모:

- leader는 이 API로 제거할 수 없다. (`PARTY_LEADER_REMOVAL_NOT_ALLOWED`)
- `ARRIVED`, `ENDED` 상태에서는 멤버 제거를 허용하지 않는다.
- 부수효과는 기존 public 강퇴 로직과 동일하게 처리한다.
  - `Party.removeMember(...)`
  - party chat room membership sync
  - leave 시스템 메시지 생성
  - SSE `KICKED` 이벤트
  - `PartyMemberKicked` notification event

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

**Response (409 Conflict, leader 제거 시도 예시):**
```json
{
  "success": false,
  "message": "리더는 관리자 멤버 제거 API로 제거할 수 없습니다.",
  "errorCode": "PARTY_LEADER_REMOVAL_NOT_ALLOWED",
  "timestamp": "2026-03-29T12:10:00"
}
```

#### POST /v1/admin/parties/{partyId}/messages/system
택시 파티 시스템 메시지 전송 (관리자)

관리자가 특정 파티 채팅방에 운영 안내 메시지를 보내는 API다.

**Request:**
```json
{
  "message": "관리자 안내 메시지"
}
```

정책 메모:

- `message`는 공백만 허용하지 않으며 최대 500자다.
- party chat room이 있어야 하며, 없으면 `CHAT_ROOM_NOT_FOUND`를 반환한다.
- 메시지는 party member/leader를 사칭하지 않는다.
  - 서버 내부 저장은 `SYSTEM` 타입 + `ADMIN_SYSTEM` source를 사용한다.
  - 응답/표시 기준 `senderName`은 `관리자`, `senderPhotoUrl`은 `null`이다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "chat-message-1",
    "chatRoomId": "party:party-20260304-001",
    "senderId": "admin-uid-1",
    "senderName": "관리자",
    "senderPhotoUrl": null,
    "type": "SYSTEM",
    "text": "관리자 안내 메시지",
    "createdAt": "2026-03-29T12:15:00"
  }
}
```

**Response (422 Unprocessable Content, 공백 메시지 예시):**
```json
{
  "success": false,
  "message": "message: message는 필수입니다.",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2026-03-29T12:16:00"
}
```

#### GET /v1/admin/parties/{partyId}/join-requests
택시 파티 pending join request 목록 조회 (관리자)

관리자가 특정 파티의 현재 대기 중인 동승 요청을 조회하는 API다.

정렬 규칙:

- 현재 `PENDING` 상태만 반환한다.
- 기본 정렬은 `requestedAt(createdAt) DESC`다.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "requestId": "join-request-2",
      "memberId": "member-3",
      "nickname": "김철수",
      "realname": "김철수",
      "photoUrl": "https://cdn.skuri.app/profiles/user-3.png",
      "department": "컴퓨터공학과",
      "studentId": "20201234",
      "requestedAt": "2026-03-29T12:20:00"
    },
    {
      "requestId": "join-request-1",
      "memberId": "member-2",
      "nickname": "이영희",
      "realname": "이영희",
      "photoUrl": null,
      "department": "미디어소프트웨어학과",
      "studentId": "20211234",
      "requestedAt": "2026-03-29T12:10:00"
    }
  ]
}
```

### 12.13 관리자 대시보드

#### GET /v1/admin/dashboard/summary
대시보드 KPI 요약 조회

- 목적: `/dashboard` 상단 KPI 카드 일괄 조회
- read-only 관리자 조회 API이며, 상태 변경이나 보정 로직을 포함하지 않는다.
- 모든 집계와 `generatedAt`은 `Asia/Seoul` 기준으로 계산한다.
- 집계 정의:
  - `newMembersToday`: `members.joinedAt` 기준 오늘 `00:00`부터 응답 생성 시각까지 가입 회원 수
  - `totalMembers`: `members` 전체 row 수 (`ACTIVE`, `WITHDRAWN` tombstone row 포함)
  - `adminCount`: `members.isAdmin = true` 회원 수
  - `openPartyCount`: 현재 `PartyStatus.OPEN` 파티 수
  - `pendingInquiryCount`: 현재 `InquiryStatus.PENDING` 문의 수
  - `pendingReportCount`: 현재 `ReportStatus.PENDING` 신고 수

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "newMembersToday": 12,
    "totalMembers": 4831,
    "adminCount": 4,
    "openPartyCount": 17,
    "pendingInquiryCount": 9,
    "pendingReportCount": 3,
    "generatedAt": "2026-03-29T18:00:00"
  }
}
```

#### GET /v1/admin/dashboard/activity
대시보드 활동 추이 조회

- 목적: `/dashboard` 최근 활동 그래프용 read model 조회
- `days`는 `7`, `30`만 허용하며 기본값은 `7`이다. 다른 값은 `422 VALIDATION_ERROR`를 반환한다.
- 일자 버킷은 `Asia/Seoul` 기준이며, 응답 `series`는 오래된 날짜부터 오늘까지 오름차순으로 정렬한다.
- 오늘 버킷은 `00:00 ~ 응답 생성 시각`, 과거 날짜 버킷은 각 일자의 `00:00 ~ 24:00` 전체 구간을 사용한다.
- 지표 정의:
  - `newMembers`: `members.joinedAt` 기준 해당 일 가입 회원 수
  - `inquiriesCreated`: `inquiries.createdAt` 기준 해당 일 생성 문의 수
  - `reportsCreated`: `reports.createdAt` 기준 해당 일 생성 신고 수
  - `partiesCreated`: `parties.createdAt` 기준 해당 일 생성 파티 수

**Query Parameters:**

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `days` | int | `7` | 조회 일수 (`7`, `30`만 허용) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "days": 7,
    "timezone": "Asia/Seoul",
    "series": [
      {
        "date": "2026-03-23",
        "newMembers": 4,
        "inquiriesCreated": 2,
        "reportsCreated": 1,
        "partiesCreated": 6
      },
      {
        "date": "2026-03-24",
        "newMembers": 7,
        "inquiriesCreated": 1,
        "reportsCreated": 0,
        "partiesCreated": 3
      }
    ]
  }
}
```

**Response (422 Unprocessable Entity - invalid days):**
```json
{
  "success": false,
  "message": "days는 7 또는 30만 허용합니다.",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2026-03-29T18:00:00"
}
```

#### GET /v1/admin/dashboard/recent-items
대시보드 최근 운영 항목 조회

- 목적: `/dashboard` 하단 최근 운영 항목 통합 피드 조회
- `limit` 기본값은 `10`, 허용 범위는 `1..30`이다. 범위를 벗어나면 `422 VALIDATION_ERROR`를 반환한다.
- source는 `Inquiry`, `Report`, `AppNotice`, `Party` 현재 저장 데이터만 사용한다.
- `AppNotice`는 `publishedAt <= 응답 생성 시각`인 게시 공지만 포함한다. 학교 공지 sync 이력/academic notice 운영 이력은 이번 계약에 포함하지 않는다.
- 각 source에서 최신 항목을 읽은 뒤 `createdAt DESC`로 다시 병합 정렬하고 최종 `limit`을 적용한다.
- 아이템 구성 규칙:
  - `INQUIRY`: `title = subject`, `subtitle = "{status} · {userId}"`
  - `REPORT`: `title = targetType 라벨(게시글/댓글/회원/채팅 메시지/채팅방/택시 파티 신고)`, `subtitle = "{status} · {targetType}"`
  - `APP_NOTICE`: `title = title`, `subtitle = priority`, `status = "PUBLISHED"`
  - `PARTY`: `title = "{departure.name} -> {destination.name}"`, `subtitle = "{status} · {leaderId}"`

**Query Parameters:**

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `limit` | int | `10` | 통합 피드 최대 항목 수 (`1..30`) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "type": "INQUIRY",
      "id": "inquiry-1",
      "title": "계정 문의",
      "subtitle": "PENDING · member-1",
      "status": "PENDING",
      "createdAt": "2026-03-29T17:00:00"
    },
    {
      "type": "REPORT",
      "id": "report-1",
      "title": "게시글 신고",
      "subtitle": "PENDING · POST",
      "status": "PENDING",
      "createdAt": "2026-03-29T16:50:00"
    },
    {
      "type": "APP_NOTICE",
      "id": "notice-1",
      "title": "긴급 점검 안내",
      "subtitle": "HIGH",
      "status": "PUBLISHED",
      "createdAt": "2026-03-29T16:30:00"
    },
    {
      "type": "PARTY",
      "id": "party-1",
      "title": "성결대학교 -> 안양역",
      "subtitle": "OPEN · leader-1",
      "status": "OPEN",
      "createdAt": "2026-03-29T16:10:00"
    }
  ]
}
```

**Response (422 Unprocessable Entity - invalid limit):**
```json
{
  "success": false,
  "message": "limit는 1 이상 30 이하여야 합니다.",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2026-03-29T18:00:00"
}
```

### 12.14 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `ADMIN_REQUIRED` | 403 | 관리자 권한 필요 |
| `CAMPUS_BANNER_NOT_FOUND` | 404 | 존재하지 않는 캠퍼스 홈 배너 |
| `PARTY_NOT_FOUND` | 404 | 존재하지 않는 파티 |
| `PARTY_MEMBER_NOT_FOUND` | 404 | 해당 파티의 멤버가 아님 |
| `CHAT_ROOM_NOT_FOUND` | 404 | 연결된 채팅방을 찾을 수 없음 |
| `INVALID_PARTY_STATE_TRANSITION` | 409 | 허용되지 않은 파티 상태 전이 |
| `PARTY_NOT_CANCELABLE` | 409 | 현재 상태에서는 파티 취소 불가 |
| `PARTY_ENDED` | 409 | 이미 종료된 파티 |
| `CANNOT_KICK_IN_ARRIVED` | 409 | `ARRIVED` 상태에서는 멤버 제거 불가 |
| `PARTY_LEADER_REMOVAL_NOT_ALLOWED` | 409 | leader 제거 금지 |
| `PARTY_CONCURRENT_MODIFICATION` | 409 | 파티 상태 변경 중 동시성 충돌 |

---

## 13. Minecraft API

> 구현 계획/이력 문서: 백엔드 레포 `docs/minecraft-spring-migration-plan.md`
>
> 본 섹션은 "마인크래프트 RTDB 연동을 Spring 도메인으로 이관"하기 위한 목표 계약이다. 실제 구현 PR에서는 `/v3/api-docs`를 최종 기준으로 동기화한다.

### 13.1 핵심 원칙

- 마인크래프트 채팅방 canonical room id는 `public:game:minecraft`다.
- 앱의 마인크래프트 채팅은 기존 Chat API + STOMP를 그대로 사용한다.
- 마인크래프트 상세 정보(서버 상태/플레이어 목록/계정 등록)는 별도 `Minecraft API`로 제공한다.
- 플러그인은 `/internal/minecraft/**`로 접속하며 `X-Skuri-Minecraft-Secret` 헤더 인증이 필요하다.
- 마인크래프트 origin 메시지의 `senderPhotoUrl`은 Minotar URL을 사용한다.
- 마인크래프트방 `SYSTEM` 메시지는 GAME room 예외 정책으로 push/inbox 대상에 포함한다.

### 13.2 Public API

#### `GET /v1/minecraft/overview`

서버 상태 카드와 마인크래프트 채팅방 진입 정보를 조회한다.

**인증:** 필요

**Response:**

```json
{
  "success": true,
  "data": {
    "chatRoomId": "public:game:minecraft",
    "online": true,
    "currentPlayers": 12,
    "maxPlayers": 50,
    "version": "1.21.1",
    "serverAddress": "mc.skuri.app",
    "mapUrl": "https://map.skuri.app",
    "lastHeartbeatAt": "2026-03-30T13:20:00Z"
  }
}
```

#### `GET /v1/minecraft/players`

화이트리스트 플레이어 목록과 현재 온라인 상태를 조회한다.

**인증:** 필요

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "accountId": "account-uuid",
      "ownerMemberId": "member-1",
      "accountRole": "SELF",
      "edition": "JAVA",
      "gameName": "skuriPlayer",
      "avatarUuid": "8667ba71b85a4004af54457a9734eed7",
      "online": true,
      "lastSeenAt": "2026-03-30T13:18:00Z"
    }
  ]
}
```

#### `GET /v1/members/me/minecraft-accounts`

내가 등록한 본인/친구 마인크래프트 계정 목록을 조회한다.

**인증:** 필요

#### `POST /v1/members/me/minecraft-accounts`

마인크래프트 계정을 등록한다.

**인증:** 필요

**Request:**

```json
{
  "edition": "JAVA",
  "accountRole": "SELF",
  "gameName": "skuriPlayer"
}
```

**정책:**

- 회원당 총 4개까지만 등록 가능
- 본인 계정은 1개만 허용
- 친구 계정은 최대 3개
- Java는 Mojang lookup 기반 UUID 검증
- Bedrock은 기존 이름 정규화 규칙을 유지

#### `DELETE /v1/members/me/minecraft-accounts/{accountId}`

마인크래프트 계정을 삭제한다.

**인증:** 필요

**정책:**

- friend 계정이 달린 parent 자기 계정은 삭제할 수 없다.
- 삭제 성공 시 whitelist remove event를 발행한다.

### 13.3 Public SSE

#### `GET /v1/sse/minecraft`

마인크래프트 상세 화면용 실시간 상태 스트림.

**인증:** 필요

**Content-Type:** `text/event-stream`

이벤트 종류:

- `SERVER_STATE_SNAPSHOT`
- `SERVER_STATE_UPDATED`
- `PLAYERS_SNAPSHOT`
- `PLAYER_UPSERT`
- `PLAYER_REMOVE`
- `HEARTBEAT`

**예시 (`SERVER_STATE_UPDATED`):**

```text
event: SERVER_STATE_UPDATED
data: {"online":true,"currentPlayers":12,"maxPlayers":50,"version":"1.21.1","lastHeartbeatAt":"2026-03-30T13:20:00Z"}
```

### 13.4 Internal Plugin API

#### 공통 인증

모든 `/internal/minecraft/**` 요청은 아래 헤더가 필요하다.

```http
X-Skuri-Minecraft-Secret: <shared-secret>
```

이 값은 플러그인과 Spring 서버만 아는 공유 비밀값이며, 사용자 인증 토큰과 별도다.

#### `POST /internal/minecraft/chat/messages`

플러그인이 마인크래프트 채팅/시스템 메시지를 서버로 전달한다.

**Request:**

```json
{
  "eventId": "9fa37c63-2c5a-4d1d-8a28-55b72750e79d",
  "eventType": "CHAT",
  "systemType": null,
  "senderName": "skuriPlayer",
  "minecraftUuid": "8667ba71b85a4004af54457a9734eed7",
  "edition": "JAVA",
  "text": "안녕하세요!",
  "occurredAt": "2026-03-30T13:20:00Z"
}
```

`eventType`:

- `CHAT`
- `SYSTEM`

`systemType`:

- `JOIN`
- `LEAVE`
- `DEATH`
- `SPECIAL`
- `STARTUP`
- `SHUTDOWN`

#### `PUT /internal/minecraft/server-state`

플러그인이 서버 heartbeat와 상태 정보를 upsert한다.

#### `PUT /internal/minecraft/online-players`

플러그인이 현재 온라인 플레이어 스냅샷을 upsert한다.

#### `GET /internal/minecraft/stream`

플러그인용 outbound SSE.

**추가 헤더:**

```http
Last-Event-ID: <optional>
```

이벤트 종류:

- `CHAT_FROM_APP`
- `WHITELIST_SNAPSHOT`
- `WHITELIST_UPSERT`
- `WHITELIST_REMOVE`
- `HEARTBEAT`

**예시 (`CHAT_FROM_APP`):**

```text
event: CHAT_FROM_APP
id: 8c6a60c5-cc35-4e52-9afc-1a6d1fbcdb0d
data: {"messageId":"dfd5b4b1-54ea-4fa1-92d9-b61a931d0d56","chatRoomId":"public:game:minecraft","senderName":"홍길동","type":"IMAGE","text":"홍길동님이 사진을 보냈습니다."}
```

### 13.5 Minecraft 전용 에러 코드 초안

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `MINECRAFT_ACCOUNT_LIMIT_EXCEEDED` | 409 | 등록 가능한 마인크래프트 계정 개수 초과 |
| `MINECRAFT_SELF_ACCOUNT_ALREADY_EXISTS` | 409 | 본인 계정은 1개만 등록 가능 |
| `MINECRAFT_FRIEND_ACCOUNT_LIMIT_EXCEEDED` | 409 | 친구 계정은 최대 3개까지만 등록 가능 |
| `MINECRAFT_PARENT_ACCOUNT_REQUIRED` | 409 | friend 계정 등록에는 parent 자기 계정이 필요 |
| `MINECRAFT_PARENT_ACCOUNT_DELETE_NOT_ALLOWED` | 409 | friend 계정이 연결된 parent 계정은 삭제 불가 |
| `MINECRAFT_ACCOUNT_DUPLICATED` | 409 | 이미 등록된 마인크래프트 계정 |
| `MINECRAFT_SECRET_INVALID` | 403 | 플러그인 shared secret 불일치 |
| `MINECRAFT_SERVER_UNAVAILABLE` | 503 | 마인크래프트 서버 상태 미수신 또는 연결 불가 |

---

> 변경 이력
> - 2026-03-30: Minecraft API 초안 추가 — `GET /v1/minecraft/overview`, `GET /v1/minecraft/players`, `GET/POST/DELETE /v1/members/me/minecraft-accounts*`, `GET /v1/sse/minecraft`, `/internal/minecraft/**` 및 shared secret 정책을 문서화
> - 2026-03-29: Admin Dashboard API 계약 추가
>   - `GET /v1/admin/dashboard/summary`, `GET /v1/admin/dashboard/activity`, `GET /v1/admin/dashboard/recent-items`를 추가
>   - `Asia/Seoul` 일자 버킷, `totalMembers` 전체 row 기준, 게시된 앱 공지 source만 recent feed에 포함하는 규칙을 명시
> - 2026-03-29: TaxiParty Admin P1 계약 추가
>   - `GET /v1/admin/parties`, `GET /v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`를 추가
>   - 관리자 상태 변경 액션을 `CLOSE | REOPEN | CANCEL | END`로 고정하고, 기존 state machine만 재사용하도록 명시
>   - Admin Party 응답에서 현재 도메인에 없는 `gender`, `lastStatusChangedAt`는 제외한다고 명시
> - 2026-03-29: TaxiParty Admin follow-up 계약 추가
>   - `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests`를 추가
>   - leader 제거 금지, 관리자 시스템 메시지의 `senderName=관리자`/`senderPhotoUrl=null`, pending join request 최신순 조회를 문서화
>   - 관련 운영 에러코드(`PARTY_MEMBER_NOT_FOUND`, `CHAT_ROOM_NOT_FOUND`, `CANNOT_KICK_IN_ARRIVED`, `PARTY_LEADER_REMOVAL_NOT_ALLOWED`)를 동기화
> - 2026-03-29: Support 신고 대상 확장
>   - `Report.targetType`에 `CHAT_MESSAGE`, `CHAT_ROOM`, `TAXI_PARTY` 추가
>   - `POST /v1/reports`를 채팅 메시지/일반 채팅방/택시파티 신고까지 확장
>   - Admin 신고 목록 필터/응답 예시에 신규 target type 반영
> - 2026-03-25: Campus Banner API 계약 추가
>   - `GET /v1/campus-banners` 공개 조회 추가
>   - `GET /v1/admin/campus-banners`, `GET /v1/admin/campus-banners/{bannerId}`, `POST/PATCH/DELETE /v1/admin/campus-banners/{bannerId}`, `PUT /v1/admin/campus-banners/order` 계약 추가
>   - 이미지 업로드 컨텍스트 `CAMPUS_BANNER_IMAGE` 및 `campus-banners/YYYY/MM/DD` 저장 경로 추가
> - 2026-03-07: Support API 계약 동기화
>   - `Report.targetType`를 `POST | COMMENT | MEMBER`로 통일
>   - `Report.status`를 `PENDING | REVIEWING | ACTIONED | REJECTED`로 통일
>   - Admin 문의/신고 목록 응답을 `PageResponse` 전체 필드(`totalPages`, `hasNext`, `hasPrevious`)와 일치하도록 보정
>   - 앱 버전/학식 메뉴 관리자 응답 예시 보강

---

## 참고

- [도메인 분석](./domain-analysis.md)
- [역할 정의](./role-definition.md)
- [ERD](./erd.md)
- 마인크래프트 상세 설계/이력: 백엔드 레포 `docs/minecraft-spring-migration-plan.md`
- 레거시 Firestore 데이터 구조: 프론트 레포 `docs/references/legacy/firestore-data-structure.md`

---

> **문서 이력**
> - 2026-02-03: 초안 작성
> - 2026-02-03: SSE 명세 추가 (§10)
> - 2026-02-19: Image API 추가 (§11, 방식 A - 서버 경유 업로드)
> - 2026-02-19: 채팅 메시지 전송 경로 WebSocket으로 통일 (§4.3~4.5), Public API 목록 명확화 (§1.2)
> - 2026-02-19: Admin API 추가 (§12 — 앱 공지/버전 관리, 학교 공지 동기화, 학식/학사일정/강의 관리)
> - 2026-04-06: Member profile photo ownership 검증 반영 — `PROFILE_IMAGE` 업로드 경로를 `profiles/{memberId}/...`로 고정하고, `PATCH /v1/members/me`의 내부 `photoUrl`은 본인 소유 member-scoped URL만 허용하며, `DELETE /v1/members/me/photo` cleanup도 본인 소유로 검증된 파일에만 수행하도록 동기화
> - 2026-03-05: Phase 3 구현 반영 — 채팅 커서 페이지네이션(`cursorCreatedAt`,`cursorId`) 명시, `lastReadAt` 단조 증가/미읽음 경계(`createdAt > lastReadAt`) 확정, STOMP 경로를 `/app/chat/{chatRoomId}`·`/topic/chat/{chatRoomId}`로 동기화
> - 2026-04-06: Admin Chat read API 반영 — `GET /v1/admin/chat-rooms`, `GET /v1/admin/chat-rooms/{chatRoomId}`, `GET /v1/admin/chat-rooms/{chatRoomId}/messages`, `GET /v1/admin/parties/{partyId}/messages` 계약과 관리자 고정 필드/멤버십 우회 정책을 문서화
> - 2026-03-05: Chat 계약 동기화 — `lastMessage.createdAt`/`accountData` 필드로 통일, 비공개 채팅방 접근 정책(REST/WS) 및 STOMP 에러 포맷(`/user/queue/errors`) 명시
> - 2026-03-05: Chat 명세 보완 — 채팅방 요약 `lastMessage.senderName` 예시 추가, STOMP 메시지 `NON_NULL` 직렬화 정책 명시
> - 2026-03-28: Chat 메시지 계약 확장 — 일반/파티 채팅 REST + STOMP payload에 `senderPhotoUrl` 추가, 기본 source of truth를 `members.photo_url`로 두고 `null` 직렬화 정책을 명시
> - 2026-03-29: Admin Dashboard API 추가 — 관리자 대시보드 KPI/활동 추이/최근 운영 항목 read-model 계약과 `Asia/Seoul` 일자 버킷, 게시 공지 source, `totalMembers` 전체 row 집계 기준을 `/v3/api-docs` 기준으로 동기화
> - 2026-03-29: Admin Member Activity API 추가 — `GET /v1/admin/members/{memberId}/activity`를 ACTIVE 회원 + 현재 저장 데이터 기준 read model로 추가하고, 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`으로 비제공 처리
> - 2026-03-29: Admin Member API review fix — `PATCH /v1/admin/members/{memberId}/admin-role`에 self role change 금지(`400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`)를 추가하고, admin-role 감사 로그 snapshot을 최소 필드만 저장하도록 조정. 관리자 상세 응답의 `bankAccount`/`notificationSetting` 계약은 유지
> - 2026-03-29: Admin Member List contract 확장 — `GET /v1/admin/members`에 `sortBy/sortDirection` 기반 컬럼 정렬과 `lastLoginOs`(`fcm_tokens.platform`)를 추가하고, 이름 컬럼은 `realname` 기준으로 고정
> - 2026-03-29: FCM token app version 반영 — `POST /v1/members/me/fcm-tokens`에 optional `appVersion`을 추가하고, `GET /v1/admin/members`의 `currentAppVersion`을 최근 활성 FCM 토큰의 `app_version` 기준으로 제공
> - 2026-03-29: TaxiParty Admin P1 구현 반영 — 관리자 파티 목록/상세/상태 변경 계약과 관련 404/409 에러코드를 `/v3/api-docs` 기준으로 동기화
> - 2026-03-05: Support API 보완 — `GET /v1/cafeteria-menus/{weekId}` 명시 추가
> - 2026-03-29: Support Cafeteria reaction 계약 반영 — 학식 메뉴 응답의 `stable weekly id`, 실제 사용자 반응 집계(`likeCount`/`dislikeCount`), `myReaction`, `PUT /v1/cafeteria-menu-reactions/{menuId}` 및 관리자 count 입력 deprecate 정책을 `/v3/api-docs` 기준으로 동기화
> - 2026-03-29: Support Cafeteria review fix — 관리자 category key를 identifier-safe 문자셋으로 제한하고, reaction upsert의 주차 단위 직렬화/opaque `menuId` 사용 규칙을 반영
> - 2026-03-05: Admin Support API 추가 — 문의/신고 운영 조회·처리 (`GET/PATCH /v1/admin/inquiries*`, `GET/PATCH /v1/admin/reports*`)
> - 2026-03-05: Admin 권한 정책 반영 — `ROLE_ADMIN + @PreAuthorize` 기반 접근 제어와 `ADMIN_REQUIRED` 에러코드 명시, 공개 채팅방 Admin API 검증 규칙 보강
> - 2026-03-05: Board 계약 동기화 — 댓글 depth 1 제한, 부모 삭제 정책(B: placeholder soft delete), `/v1/members/me/posts|bookmarks` 및 Board 에러코드(`COMMENT_DEPTH_EXCEEDED`, `COMMENT_ALREADY_DELETED`) 반영
> - 2026-03-07: Board/Notice 공통 Comment 정책 구현 반영 — 무제한 depth, flat list 응답, `commentNotifications` / `bookmarkedPostCommentNotifications` 계약 반영
> - 2026-03-08: Phase 8 Notification 계약 반영 — `PARTY_*` canonical enum 정렬, Notification API pagination/FCM token/SSE strict DTO(`ACADEMIC_SCHEDULE`, `academicScheduleId`) 동기화, 학사 일정 알림 설정 필드 추가
> - 2026-03-10: Phase 11 Admin 공통 인프라 반영 — `@AdminApiAccess` 공통화, `admin_audit_logs` 저장 규약, Support Admin 목록 고정 정렬/페이지 정책, CSV 보류 및 운영 데이터 노출 정책 문서화
> - 2026-03-10: Image 계약 구현 반영 — `/v1/images`를 런타임 계약으로 승격하고, context enum(`POST/CHAT/APP_NOTICE/PROFILE`), LOCAL storage 기본 전략, Board/Chat/AppNotice/Profile 재사용 플로우를 `/v3/api-docs` 기준으로 동기화
> - 2026-03-25: Notice 북마크 계약 추가 — `GET /v1/members/me/notice-bookmarks`, `POST/DELETE /v1/notices/{noticeId}/bookmark`와 `rssPreview`/`postedAt` 기반 목록 naming을 `/v3/api-docs` 기준으로 동기화
