# RN Notification Migration Reference

> 목적: `/Users/jisung/SKTaxi` React Native 앱이 Firebase Firestore/Cloud Functions 기반 알림 구조에서,
> 현재 Spring Notification 인프라 기준 계약으로 안전하게 이행할 수 있도록 참고 기준을 제공한다.
>
> 대상 독자:
> - RN 구현 에이전트
> - RN 검증/코드리뷰 에이전트
> - 수동 구현자

---

## 1. 핵심 원칙

1. 서버 push payload는 **RN legacy contract에 맞추지 않는다**.
2. 클라이언트는 `docs/api-specification.md`의 canonical push contract를 기준으로 구현한다.
3. `data.type`은 legacy lowercase 문자열이 아니라 **Spring canonical enum**을 그대로 사용한다.
4. 서버는 route/screen 이름을 payload에 넣지 않는다.
5. 클라이언트는 `type + data`를 해석해 이동 화면을 결정한다.
6. 알림 인박스/미읽음 수/FCM 토큰 저장은 더 이상 Firestore를 진실 공급원으로 사용하지 않는다.
7. Android `channelId`, iOS `aps.sound`는 플랫폼 전달 계약으로 유지한다.

---

## 2. 서버 런타임 기준 문서

아래 문서와 코드를 **source of truth**로 본다.

- API/Push/SSE 계약: `docs/api-specification.md`
- 정책/책임: `docs/domain-analysis.md`
- 제품/운영 관점: 프론트 레포 `docs/project/project-overview.md`, 백엔드 레포 `docs/project-overview.md`
- 구현 근거:
  - `src/main/java/com/skuri/skuri_backend/infra/notification/FirebasePushPayloadMapper.java`
  - `src/main/java/com/skuri/skuri_backend/domain/notification/model/PushPresentationProfile.java`
  - `src/main/java/com/skuri/skuri_backend/domain/notification/service/NotificationDispatchRequest.java`
  - `src/main/java/com/skuri/skuri_backend/infra/notification/FirebaseMessagingPushSender.java`

---

## 3. 가장 중요한 변화 요약

### 3.1 Push `type`

기존 RN은 다음 legacy type을 기준으로 동작 중이다.

- `join_request`
- `party_join_accepted`
- `party_join_rejected`
- `party_deleted`
- `notice`
- `app_notice`
- `chat_message`
- `chat_room_message`
- `board_post_like`
- `board_post_comment`
- `board_comment_reply`
- `notice_post_comment`
- `notice_comment_reply`

Spring canonical type은 다음과 같다.

- `PARTY_CREATED`
- `PARTY_JOIN_REQUEST`
- `PARTY_JOIN_ACCEPTED`
- `PARTY_JOIN_DECLINED`
- `PARTY_CLOSED`
- `PARTY_ARRIVED`
- `PARTY_ENDED`
- `MEMBER_KICKED`
- `SETTLEMENT_COMPLETED`
- `CHAT_MESSAGE`
- `POST_LIKED`
- `COMMENT_CREATED`
- `NOTICE`
- `APP_NOTICE`
- `ACADEMIC_SCHEDULE`

### 3.2 의미가 합쳐진 타입

다음은 “이름만 바꾸면 끝”이 아니다.

#### `COMMENT_CREATED`

이전 RN:
- `board_post_comment`
- `board_comment_reply`
- `notice_post_comment`
- `notice_comment_reply`

현재 서버:
- `COMMENT_CREATED` 하나로 통일
- 문맥은 `data.postId`, `data.noticeId`, `data.appNoticeId`로 판단

즉, 클라이언트는 `type === 'COMMENT_CREATED'`일 때
- `postId`가 있으면 게시글 댓글 알림
- `noticeId`가 있으면 공지 댓글 알림
- `appNoticeId`가 있으면 앱 공지 댓글 알림
으로 처리해야 한다.

#### `CHAT_MESSAGE`

이전 RN:
- `chat_message`
- `chat_room_message`

현재 서버:
- `CHAT_MESSAGE` 하나로 통일
- 문맥은 `data.chatRoomId` 기준

즉, 클라이언트는 `type === 'CHAT_MESSAGE'`일 때 `chatRoomId`로 진입 대상을 결정해야 한다.

---

## 4. 현재 서버 push payload 계약

공통 형태:

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

### 4.1 공통 data 키

- `contractVersion`
- `type`
- `partyId`
- `requestId`
- `chatRoomId`
- `postId`
- `commentId`
- `noticeId`
- `appNoticeId`
- `academicScheduleId`

### 4.2 Sound / Channel 계약

| 그룹 | canonical type | Android | iOS |
|---|---|---|---|
| Party | `PARTY_CREATED`, `PARTY_JOIN_*`, `PARTY_CLOSED`, `PARTY_ARRIVED`, `PARTY_ENDED`, `MEMBER_KICKED`, `SETTLEMENT_COMPLETED` | `channelId=party_channel`, `sound=new_taxi_party` | `aps.sound=new_taxi_party.wav` |
| Chat | `CHAT_MESSAGE` | `channelId=chat_channel`, `sound=new_chat_notification` | `aps.sound=new_chat_notification.wav` |
| Notice | `NOTICE`, `APP_NOTICE`, `ACADEMIC_SCHEDULE` | `channelId=notice_channel`, `sound=new_notice` | `aps.sound=new_notice.wav` |
| Default | `POST_LIKED`, `COMMENT_CREATED` | 별도 channel override 없음 | `aps.sound=default` |

### 4.3 이동 결정 규칙

서버는 route 이름을 주지 않는다. RN이 다음처럼 결정해야 한다.

| `type` | 필수 data | 논리적 이동 대상 |
|---|---|---|
| `PARTY_CREATED` | `partyId` | 파티 상세 또는 택시 탭 |
| `PARTY_JOIN_REQUEST` | `partyId`, `requestId` | 동승 요청 처리 화면 |
| `PARTY_JOIN_ACCEPTED`, `PARTY_JOIN_DECLINED` | `partyId`, `requestId` | 파티 상세/결과 화면 |
| `PARTY_CLOSED`, `PARTY_ARRIVED`, `PARTY_ENDED`, `MEMBER_KICKED`, `SETTLEMENT_COMPLETED` | `partyId` | 파티 상세 또는 파티 채팅 |
| `CHAT_MESSAGE` | `chatRoomId` | 채팅방 상세 |
| `POST_LIKED` | `postId` | 게시글 상세 |
| `COMMENT_CREATED` + `postId` | `postId`, `commentId` | 게시글 상세 |
| `COMMENT_CREATED` + `noticeId` | `noticeId`, `commentId` | 공지 상세 |
| `COMMENT_CREATED` + `appNoticeId` | `appNoticeId`, `commentId` | 앱 공지 상세 |
| `NOTICE` | `noticeId` | 학교 공지 상세 |
| `APP_NOTICE` | `appNoticeId` | 앱 공지 상세 |
| `ACADEMIC_SCHEDULE` | `academicScheduleId` | 학사 일정 상세 |

---

## 5. RN에서 반드시 바꿔야 하는 파일

### 5.1 푸시 수신 메인 진입점

#### `src/lib/notifications.ts`

현재 문제:
- legacy lowercase `data.type` 기준으로 분기
- `chat_message` / `chat_room_message` 이원 분기
- `board_post_comment` / `notice_comment_reply` 등 legacy 알림 타입 사용

수정 방향:
- switch 분기를 canonical enum 기준으로 교체
- `COMMENT_CREATED`는 `postId` / `noticeId` / `appNoticeId`로 문맥 분기
- `CHAT_MESSAGE`는 `chatRoomId` 기준 처리
- `PARTY_ENDED`, `ACADEMIC_SCHEDULE` 추가
- 백그라운드/앱 재오픈/앱 종료 후 알림 클릭 핸들링도 동일 계약으로 통일

권장:
- 이 파일에 switch를 직접 계속 늘리지 말고,
- `src/lib/push/notificationContract.ts` 같은 공통 helper를 만들어 파싱/이동결정 로직을 분리한다.

### 5.2 포그라운드 배너

#### `src/navigations/hooks/useForegroundNotification.ts`

현재 문제:
- 내부 타입이 `board_notification`, `notice_notification`, `chat_room_message` 등 legacy 의미에 묶여 있음

수정 방향:
- foreground banner 상태도 canonical source 기준으로 정리
- `ACADEMIC_SCHEDULE` 추가
- `COMMENT_CREATED`는 `postId`/`noticeId`/`appNoticeId` 문맥으로 나누기
- `CHAT_MESSAGE`는 `chatRoomId` 기준으로 이동

주의:
- 파티 채팅과 공개 채팅 라우트가 다르면, `chatRoomId`로 room metadata를 조회해서 어느 화면으로 갈지 결정해야 한다.

### 5.3 알림 인박스 화면

#### `src/screens/HomeTab/NotificationScreen.tsx`

현재 문제:
- 알림 타입 icon map이 legacy type 기준
- 클릭 이동도 legacy type 기준

수정 방향:
- icon map을 canonical enum 기준으로 변경
- `PARTY_ENDED`, `ACADEMIC_SCHEDULE`, `POST_LIKED` 추가
- `COMMENT_CREATED`는 `postId`, `noticeId`, `appNoticeId` 기준으로 이동
- `CHAT_MESSAGE`는 `chatRoomId` 기준 이동

### 5.4 알림 훅

#### `src/hooks/common/useNotifications.ts`

현재 문제:
- Firestore snapshot 기반 구독 전제
- unread count를 `notifications.filter(!isRead)`로 직접 계산

수정 방향:
- REST + SSE 기반으로 전환
- unread count는 서버에서 내려준 값을 상태로 유지
- 목록과 count를 분리해서 다룬다

---

## 6. Firestore 알림 저장소를 REST/SSE로 교체

### 6.1 현재 문제 파일

- `src/repositories/interfaces/INotificationRepository.ts`
- `src/repositories/firestore/FirestoreNotificationRepository.ts`
- `src/di/RepositoryProvider.tsx`

현재 구현은 다음 Firestore 경로를 사용한다.

- `userNotifications/{uid}/notifications`

하지만 Spring 기준 진실 공급원은 다음이다.

- `GET /v1/notifications`
- `GET /v1/notifications/unread-count`
- `POST /v1/notifications/{id}/read`
- `POST /v1/notifications/read-all`
- `DELETE /v1/notifications/{id}`
- `GET /v1/sse/notifications`

### 6.2 권장 새 구현

새 파일 추가 권장:

- `src/repositories/api/ApiNotificationRepository.ts`

권장 역할:
- 초기 알림 목록 조회
- 읽음/전체읽음/삭제 API 호출
- SSE 구독(`SNAPSHOT`, `NOTIFICATION`, `UNREAD_COUNT_CHANGED`, `HEARTBEAT`) 처리

### 6.3 권장 상태 모델

`useNotifications()`가 최소 아래 상태를 분리해 가져가는 것이 좋다.

- `notifications: Notification[]`
- `unreadCount: number`
- `page`
- `hasNext`
- `initialized`
- `loading`
- `error`

### 6.4 SSE 이벤트 처리 권장

- `SNAPSHOT`
  - 현재 unread count 초기화
- `NOTIFICATION`
  - 새 알림 prepend
- `UNREAD_COUNT_CHANGED`
  - unread count 갱신
- `HEARTBEAT`
  - UI 반영 없음

권장:
- 앱 foreground 진입/재연결 시 `GET /v1/notifications`로 1회 동기화
- SSE는 실시간 힌트 + 신규 데이터 주입 용도로 사용

---

## 7. FCM 토큰 저장을 Firestore에서 API로 교체

### 7.1 현재 문제 파일

- `src/lib/fcm.ts`
- `src/repositories/interfaces/IFcmRepository.ts`
- `src/repositories/firestore/FirestoreFcmRepository.ts`
- `src/hooks/auth/useAuth.ts`
- `src/navigations/hooks/useFcmSetup.ts`

현재 RN은 Firestore `users/{uid}.fcmTokens[]`를 직접 갱신한다.

Spring 서버는 이 계약이 아니다.

서버 API:
- `POST /v1/members/me/fcm-tokens`
- `DELETE /v1/members/me/fcm-tokens`

### 7.2 권장 새 구현

새 파일 추가 권장:

- `src/repositories/api/ApiFcmRepository.ts`

요청 형태:

등록:
```json
{
  "token": "fcm_device_token",
  "platform": "ios"
}
```

삭제:
```json
{
  "token": "fcm_device_token"
}
```

### 7.3 중요한 정책 차이

현재 RN 주석은 “단일기기 정책”을 가정한다.

하지만 Spring 서버는:
- 멀티 디바이스 지원
- 토큰 unique
- 현재 디바이스 토큰만 등록/해제

즉 RN은:
- 로그인 후 현재 디바이스 token 1개를 등록
- token refresh 시 새 token 등록
- 로그아웃 시 현재 디바이스 token만 해제

`userId` 기준 전체 토큰 삭제를 가정하면 안 된다.

---

## 8. 동승 요청 액션 저장소도 정리 필요

### 현재 문제 파일

- `src/repositories/firestore/FirestoreNotificationActionRepository.ts`

현재 문제:
- join request 승인/거절을 Firestore 직접 수정
- `party_join_request` 타입 Firestore 알림 문서를 직접 삭제

Spring 기준으로는:
- join request 승인/거절은 서버 API가 담당
- 관련 알림 cleanup도 서버 책임이 더 적절

권장:
- 이 저장소도 API 기반으로 교체
- 클라이언트가 Firestore 알림 문서를 직접 지우는 흐름 제거

---

## 9. Android / iOS 네이티브 점검

### Android

#### `android/app/src/main/java/com/jisung/sktaxi/MainApplication.kt`

현재 이미 존재:
- `chat_channel`
- `party_channel`
- `notice_channel`

현재 Spring 서버 계약과 호환된다.

즉시 필요한 수정:
- 없음

선택적 후속:
- `POST_LIKED`, `COMMENT_CREATED`에 명시적 기본 채널이 필요하면 `default_channel` 추가 고려

### iOS

#### `ios/SKTaxi.xcodeproj/project.pbxproj`

현재 `.wav` 리소스 포함 확인:
- `new_chat_notification.wav`
- `new_notice.wav`
- `new_taxi_party.wav`

즉시 필요한 수정:
- 없음

---

## 10. 추천 구현 순서

1. `src/lib/push/notificationContract.ts` 신설
2. `src/lib/notifications.ts` canonical payload 파싱으로 전환
3. `src/navigations/hooks/useForegroundNotification.ts` 정리
4. `src/screens/HomeTab/NotificationScreen.tsx` canonical type 반영
5. `ApiNotificationRepository` 추가
6. `useNotifications()`를 REST + SSE 기준으로 전환
7. `ApiFcmRepository` 추가
8. `src/lib/fcm.ts`, `useAuth.ts`, `useFcmSetup.ts`를 API 기반으로 전환
9. FirestoreNotificationActionRepository 제거 또는 API 기반으로 교체

---

## 11. 구현 시 금지/주의 사항

### 금지

- 서버 canonical type을 다시 legacy lowercase로 변환하는 임시 계층 추가
- Firestore `userNotifications/...`를 계속 진실 공급원으로 유지
- Firestore `users/{uid}.fcmTokens[]`를 계속 갱신
- route 이름을 서버 payload에 다시 넣도록 요구

### 주의

- `COMMENT_CREATED`는 `postId` / `noticeId` / `appNoticeId` 문맥 분기 필수
- `CHAT_MESSAGE`는 `chatRoomId` 기준 처리
- `PARTY_ENDED`는 예전 `party_deleted`에 대응하지만 이름이 다르다
- `APP_NOTICE`와 `NOTICE`는 이동 대상이 다르다
- `ACADEMIC_SCHEDULE`는 신규 타입이라 기존 RN에 핸들러가 없다
- unread count는 로컬 리스트 길이가 아니라 서버값 기준으로 유지해야 한다

---

## 12. AI 구현/검증 에이전트 체크리스트

### 구현 체크리스트

- [ ] push 수신 switch가 canonical enum만 사용한다
- [ ] `COMMENT_CREATED` 문맥 분기가 `postId` / `noticeId` / `appNoticeId` 기준으로 구현되었다
- [ ] `CHAT_MESSAGE`가 `chatRoomId` 기준으로 처리된다
- [ ] `ACADEMIC_SCHEDULE` 핸들러가 존재한다
- [ ] Notification inbox가 Firestore가 아니라 Spring API를 사용한다
- [ ] unread count가 SSE/REST 서버값 기준으로 유지된다
- [ ] FCM token 등록/삭제가 Spring API를 사용한다
- [ ] 로그아웃 시 현재 디바이스 token만 삭제한다
- [ ] Android 채널 ID 이름이 서버 계약과 일치한다
- [ ] iOS sound 파일명이 서버 계약과 일치한다

### 검증 체크리스트

- [ ] foreground push 수신 시 올바른 배너가 뜬다
- [ ] background push 탭 시 올바른 화면으로 이동한다
- [ ] quit state push 탭 시 올바른 화면으로 이동한다
- [ ] 인앱 알림함 목록/읽음/삭제가 Spring API와 동작한다
- [ ] unread count가 SSE 이벤트와 동기화된다
- [ ] `NOTICE` / `APP_NOTICE` / `ACADEMIC_SCHEDULE` 이동이 각각 맞다
- [ ] `COMMENT_CREATED`가 게시글/학교 공지/앱 공지에서 각각 올바르게 이동한다
- [ ] `CHAT_MESSAGE`가 공개 채팅/파티 채팅 문맥에서 올바르게 처리된다
- [ ] token refresh 시 중복 없이 서버에 등록된다
- [ ] 로그아웃 후 재로그인 시 push 수신이 정상 복구된다

---

## 13. 권장 후속 산출물

RN 구현 작업을 시작할 때 아래 문서를 함께 만들면 좋다.

1. `RN canonical notification contract.ts`
2. `ApiNotificationRepository` 설계 문서
3. `ApiFcmRepository` 설계 문서
4. foreground/background/quit-state 시나리오 테스트 체크리스트

---

## 14. 요약

이번 RN 마이그레이션의 본질은 “푸시 type 문자열 몇 개 바꾸기”가 아니다.

실제 해야 하는 일은 세 가지다.

1. push 수신을 canonical `type + data` 기반으로 재구성
2. 알림 인박스/미읽음 수를 Firestore에서 Spring REST + SSE로 전환
3. FCM 토큰 저장을 Firestore에서 Spring API로 전환

이 세 축을 같이 옮겨야 런타임 계약이 일관되게 맞는다.
