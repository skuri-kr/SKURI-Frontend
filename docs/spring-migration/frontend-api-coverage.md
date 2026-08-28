# RN Spring API 커버리지와 로깅 가이드

> 최종 수정일: 2026-08-28
> 관련 문서: [RN Spring 연동 진행 현황](./frontend-migration-status.md) | [RN Spring 연동 로드맵](./frontend-integration-roadmap.md) | [RN Spring 연동 아키텍처 가이드](./frontend-architecture-guideline.md) | [API 명세](./api-specification.md)

---

## 1. 문서 목적

이 문서는 현재 React Native 앱이 실제로 어떤 Spring API를 호출하고 있는지,
어떤 영역은 부분 연결 상태인지,
그리고 개발 중 API 로깅을 어떤 원칙으로 붙여야 하는지 정리한다.

이 문서의 기준은 다음과 같다.

- 실제 앱 코드에서 호출 중인 endpoint를 우선 기록한다.
- “완료/부분 연결/미연결”은 backend 전체가 아니라 **앱 사용자 기능 기준**으로 판단한다.
- 실서버 연동 디버깅을 위해 로깅은 허용하되, 인증 정보와 민감 데이터는 반드시 마스킹한다.
- 참고: 관리자 웹 `/users` 상세용 `GET /v1/admin/members/{memberId}/activity`와 목록용 `GET /v1/admin/members` 확장 계약(`realname`, `lastLoginOs`, `currentAppVersion`, `sortBy/sortDirection`)은 2026-03-29 기준 backend에 존재하지만, 현재 RN 앱 커버리지 범위에는 포함되지 않는다. `currentAppVersion`은 최근 활성 FCM 토큰의 `app_version` 기준으로 제공된다.
- 참고: 관리자 웹 `/dashboard`용 `GET /v1/admin/dashboard/summary`, `GET /v1/admin/dashboard/activity`, `GET /v1/admin/dashboard/recent-items`도 2026-03-29 기준 backend에 존재하지만, 현재 RN 앱 커버리지 범위에는 포함되지 않는다. 일자 버킷은 `Asia/Seoul`, `totalMembers`는 `members` 전체 row 기준이다.
- 참고: 관리자 웹 `/parties`용 `GET /v1/admin/parties`, `GET /v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`, `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests`도 2026-03-29 기준 backend에 존재하지만, 현재 RN 앱 커버리지 범위에는 포함되지 않는다.
- 참고: 관리자 웹 `/boards`용 `GET /v1/admin/posts`, `GET /v1/admin/posts/{postId}`, `PATCH /v1/admin/posts/{postId}/moderation`, `GET /v1/admin/comments`, `PATCH /v1/admin/comments/{commentId}/moderation`도 2026-03-29 기준 backend에 존재하지만, 현재 RN 앱 커버리지 범위에는 포함되지 않는다.

---

## 2. 현재 요약

현재 앱은 다음 범위까지 Spring REST를 사용한다.

- 완료
  - Member bootstrap / profile / FCM token
  - App Notice 공개 조회
  - Notification Center REST + unread count + SSE 실시간 동기화
  - Taxi Home 조회/동승 요청 생성/취소/수락 대기 조회/실제 파티 채팅 진입
  - Taxi Party의 my party / join request count / leader 승인·거절 / recruit(create, 직접 입력 + 지도 선택 포함) / 수정 / 취소 + 주요 SSE subscription
  - Taxi Chat detail의 close/reopen/arrive/end/kick/leave/settlement confirm + ACCOUNT payload 전송 + 서버 생성 SYSTEM/ARRIVED/END 렌더링 chain
  - Board / Community board의 list/detail/comments/like/bookmark/write/edit
  - Notice 본체의 home/detail/read/like/comments
  - Campus academic / cafeteria 본체
  - 공지·게시물 짧은 공유 링크 발급/해석
  - Minecraft overview / players / 내 계정 CRUD / public SSE
- 부분 연결
  - Taxi Party domain 전체
  - Chat domain 전체
- 아직 미연결
  - Chat 이미지 메시지 실사용 연결

즉, endpoint 단위로는 꽤 연결됐지만,
도메인 단위로 보면 Taxi / Chat은 아직 다음 phase 작업이 남아 있고,
Board / Notice / Campus는 Phase H follow-up까지 포함해 현재 사용자 기능 기준으로 닫혔다.

---

## 3. 연결 완료 API

아래 endpoint는 **현재 프론트에서 실제로 호출 중인 Spring REST API**다.

### 3.1 Member / Auth bootstrap

상태:

- 연결 완료

endpoint:

- `POST /v1/members`
- `GET /v1/members/me`
- `PATCH /v1/members/me`
- `POST /v1/members/me/fcm-tokens`
- `DELETE /v1/members/me/fcm-tokens`

현재 사용처:

- 로그인 직후 Spring member bootstrap
- `CompleteProfileScreen` 저장
- 앱 시작/refresh/logout 시 FCM token 등록/삭제

코드:

- `src/features/member/data/api/memberApiClient.ts`
- `src/features/member/data/repositories/SpringMemberRepository.ts`
- `src/features/auth/hooks/useAuthSession.ts`
- `src/features/member/services/memberFcmTokenService.ts`

### 3.2 App Notice

상태:

- 연결 완료

endpoint:

- `GET /v1/app-notices`
- `GET /v1/app-notices/{appNoticeId}`

현재 사용처:

- 앱 공지 목록 화면
- 앱 공지 상세 화면
- Notification Hub의 App Notice 탭

코드:

- `src/features/settings/data/api/appNoticeApiClient.ts`
- `src/features/settings/data/repositories/SpringAppNoticeRepository.ts`
- `src/features/settings/hooks/useAppNoticeFeedData.ts`
- `src/features/settings/hooks/useAppNoticeDetailData.ts`

### 3.3 Notification Center + realtime

상태:

- 연결 완료

endpoint:

- `GET /v1/notifications`
- `GET /v1/notifications/unread-count`
- `GET /v1/sse/notifications`
- `POST /v1/notifications/{notificationId}/read`
- `POST /v1/notifications/read-all`
- `DELETE /v1/notifications/{notificationId}`

현재 사용처:

- 알림함 목록 조회
- unread count 기준 동기화
- SSE 실시간 신규 알림 반영
- 단건 읽음 처리
- 전체 읽음 처리
- 단건 삭제

코드:

- `src/features/user/data/api/notificationApiClient.ts`
- `src/features/user/data/repositories/SpringNotificationRepository.ts`
- `src/features/user/hooks/useNotificationCenterData.ts`

### 3.4 Taxi Home / My Party / Join Request / Leader Flow

상태:

- 연결 완료

endpoint:

- `POST /v1/parties`
- `PATCH /v1/parties/{partyId}`
- `POST /v1/parties/{partyId}/cancel`
- `GET /v1/parties`
- `GET /v1/parties/{partyId}`
- `GET /v1/parties/{partyId}/join-requests`
- `GET /v1/members/me/parties`
- `GET /v1/members/me/join-requests`
- `GET /v1/sse/parties`
- `GET /v1/sse/parties/{partyId}/join-requests`
- `GET /v1/sse/members/me/join-requests`
- `POST /v1/parties/{partyId}/join-requests`
- `PATCH /v1/join-requests/{id}/accept`
- `PATCH /v1/join-requests/{id}/decline`
- `PATCH /v1/join-requests/{id}/cancel`
- `GET /v1/notifications`
- `DELETE /v1/notifications/{notificationId}`

현재 사용처:

- Taxi Home 파티 목록 조회
- Taxi Home `OPEN + CLOSED` 파티 목록 merge 조회
- 내 활성 파티 여부 반영
- 내 pending join request 상태 반영
- Main tab의 `My Party` / `JoinRequestCount`
- leader join request modal의 승인/거절
- leader join request notification 정리
- `useMyParty` / `usePendingJoinRequest` / `useJoinRequestStatus` / `useParty` / `subscribeToJoinRequests`의 SSE signal subscription
- 동승 요청 생성
- AcceptancePending 화면 조회/취소
- RecruitScreen 파티 생성
- RecruitScreen 직접 입력 위치의 지도 선택 기반 좌표 확정
- ChatScreen 리더 전용 파티 수정 / 파티 취소
- 실제 Taxi Chat route 진입

코드:

- `src/features/taxi/data/api/taxiHomeApiClient.ts`
- `src/features/taxi/data/mappers/taxiPartyMapper.ts`
- `src/features/taxi/data/repositories/SpringPartyRepository.ts`
- `src/features/taxi/data/repositories/SpringNotificationActionRepository.ts`
- `src/features/taxi/application/taxiHomeQuery.ts`
- `src/features/taxi/application/taxiAcceptancePendingQuery.ts`
- `src/features/taxi/hooks/useTaxiHomeData.ts`
- `src/features/taxi/hooks/useTaxiAcceptancePendingData.ts`
- `src/features/taxi/hooks/useTaxiRecruitForm.ts`
- `src/features/taxi/hooks/useJoinRequestModal.ts`
- `src/features/taxi/hooks/useMyParty.ts`
- `src/features/taxi/hooks/useJoinRequestStatus.ts`
- `src/features/taxi/providers/JoinRequestProvider.tsx`
- `src/di/RepositoryProvider.tsx`

runtime note:

- `SpringPartyRepository`는 `GET /v1/sse/parties`, `GET /v1/sse/parties/{partyId}/join-requests`, `GET /v1/sse/members/me/join-requests`를 signal transport로 사용하고, 실제 domain state는 REST snapshot으로 다시 읽는다.
- Taxi Home 목록은 `GET /v1/parties?status=OPEN`과 `GET /v1/parties?status=CLOSED`를 각각 호출한 뒤 프론트에서 merge한다.
- 따라서 `useMyParty`, `JoinRequestProvider`, `usePendingJoinRequest`, `useJoinRequestStatus`, `useParty`, `subscribeToJoinRequests()`는 `SSE signal -> REST refresh` 기준으로 동기화된다.
- leader action 이후 화면 반영 기준은 optimistic mutation이 아니라 `REST mutation -> repository refresh + SSE follow-up signal`이다.
- `PARTY_JOIN_REQUEST` 알림 정리는 `notification.data.requestId` 기준으로 삭제해, 같은 party의 다른 pending 요청 알림을 같이 지우지 않는다.
- push runtime은 backend FCM enum(`PARTY_JOIN_REQUEST`, `PARTY_JOIN_ACCEPTED`, `PARTY_JOIN_DECLINED`)을 기존 frontend navigation type으로 정규화한다.
- backend에는 client-authored system message write contract가 없고 `SYSTEM` 메시지 전송은 거부되므로, create/accept 후 조용히 성공하던 frontend no-op는 제거했다.
- `RecruitScreen`은 프리셋 위치 또는 지도에서 선택된 자유 입력 위치만 제출 가능하게 해 `POST /v1/parties`에 항상 `departure/destination.name + lat + lng`를 보낸다.

### 3.5 Taxi Chat detail

상태:

- 해당 screen chain 연결 완료

endpoint / realtime contract:

- `GET /v1/parties/{partyId}`
- `GET /v1/chat-rooms/party:{partyId}`
- `GET /v1/chat-rooms/party:{partyId}/messages`
- `PATCH /v1/parties/{id}/close`
- `PATCH /v1/parties/{id}/reopen`
- `PATCH /v1/parties/{id}/arrive`
- `PATCH /v1/parties/{id}/end`
- `DELETE /v1/parties/{id}/members/{memberId}`
- `DELETE /v1/parties/{id}/members/me`
- `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm`
- `PATCH /v1/chat-rooms/party:{partyId}/settings`
- `PATCH /v1/chat-rooms/party:{partyId}/read`
- STOMP endpoint:
  - SockJS/web: `/ws`
  - RN native WebSocket: `/ws-native`
- publish: `/app/chat/party:{partyId}`
- subscribe: `/topic/chat/party:{partyId}`
- error queue: `/user/queue/errors`
- client publish type: `TEXT`, `ACCOUNT`
- server-generated subscribe type: `SYSTEM`, `ARRIVED`, `END`

현재 사용처:

- Taxi Chat 상세 화면 초기 상태 로드
- Taxi Chat 과거 메시지 조회
- Taxi Chat 실시간 메시지 수신/전송
- Taxi Chat 음소거 토글
- Taxi Chat 방 열람 중 읽음 처리
- Taxi Chat 화면에서 모집 마감/재개, 도착 처리, 강제 종료, 멤버 내보내기, 직접 나가기, 정산 확인
- Taxi Chat 리더/멤버 header menu 분기와 파티 수정/취소
- Taxi Chat `+` 액션 트레이, 택시 호출 딥링크, 계좌 전송, 정산 현황 상단 공지/관리 modal
- Taxi Chat `ACCOUNT` payload 전송과 `SYSTEM` / `ARRIVED` / `END` 서버 생성 메시지 렌더링

코드:

- `src/features/taxi/data/api/taxiChatApiClient.ts`
- `src/features/taxi/data/api/taxiHomeApiClient.ts`
- `src/features/taxi/data/repositories/SpringPartyRepository.ts`
- `src/features/taxi/data/repositories/SpringTaxiChatRepository.ts`
- `src/features/taxi/application/taxiChatDetailAssembler.ts`
- `src/features/taxi/components/TaxiChatSummaryCard.tsx`
- `src/features/taxi/hooks/useTaxiChatDetailData.ts`
- `src/features/taxi/screens/ChatScreen.tsx`
- `src/di/RepositoryProvider.tsx`

runtime note:

- `SpringTaxiChatRepository`는 subscriber가 0명이 되거나 auth session uid가 바뀌면 STOMP client를 deactivate하고 party state를 정리한다.
- 따라서 로그아웃 후 다른 계정 로그인 시 이전 CONNECT Authorization 세션을 재사용하지 않는다.
- Taxi Chat detail은 `partyRepository.subscribeToParty()`의 SSE signal을 받아 `taxiChatRepository.getPartyChat()` REST snapshot을 다시 읽으므로, party status/member/settlement 변화도 chat summary에서 Spring source 기준으로 다시 반영된다.
- `SpringTaxiChatRepository`는 `ACCOUNT` publish 이후 같은 room topic에서 실제 `ACCOUNT` message를 수신할 때까지 대기한다.
- 실기기 보강으로 ACCOUNT pending은 duplicate topic frame과 REST snapshot fallback으로도 해제한다. dev 환경에서는 publish/topic/error-queue/pending-clear 시점 로그를 남긴다.
- leader 승인 후 `SYSTEM`, arrive 후 `ARRIVED`, cancel/end 후 `END`는 backend가 직접 생성하고 프론트는 해당 snapshot/message를 렌더링만 한다.
- `ACCOUNT`는 `bankName`, `accountNumber`, `accountHolder`, `hideName`, `remember` payload를 그대로 전송한다.
- `/arrive`는 `taxiFare`, `settlementTargetMemberIds`, `account { bankName, accountNumber, accountHolder, hideName }` payload를 전송한다.
- 멤버 `DELETE /v1/parties/{id}/members/me` 성공 후에는 leave guard로 stale refresh/SSE callback을 무시하고 chat session을 정리한다.

### 3.6 General Chat list/detail + summary realtime

상태:

- 완료

endpoint / realtime contract:

- `GET /v1/chat-rooms`
- `GET /v1/chat-rooms?type=UNIVERSITY|DEPARTMENT|GAME|CUSTOM`
- `GET /v1/chat-rooms/{chatRoomId}`
- `POST /v1/chat-rooms`
- `POST /v1/chat-rooms/{chatRoomId}/join`
- `DELETE /v1/chat-rooms/{chatRoomId}/members/me`
- `GET /v1/chat-rooms/{chatRoomId}/messages`
- `PATCH /v1/chat-rooms/{chatRoomId}/settings`
- `PATCH /v1/chat-rooms/{chatRoomId}/read`
- STOMP endpoint:
  - SockJS/web: `/ws`
  - RN native WebSocket: `/ws-native`
- publish: `/app/chat/{chatRoomId}`
- subscribe room: `/topic/chat/{chatRoomId}`
- subscribe room summary: `/user/queue/chat-rooms`
- subscribe error: `/user/queue/errors`

현재 사용처:

- Community chat room list
- Community chat room detail
- 일반 공개 채팅방 preview detail / join / leave
- 일반 Chat 메시지 이력 조회
- 일반 Chat 실시간 메시지 수신/전송
- 일반 Chat 음소거 토글
- 일반 Chat 방 열람 중 읽음 처리
- Community tab unread badge
- room summary / room unread / last message 동기화
- create API repository surface

코드:

- `src/features/chat/data/api/chatApiClient.ts`
- `src/features/chat/data/dto/chatDto.ts`
- `src/features/chat/data/mappers/chatMapper.ts`
- `src/features/chat/data/repositories/SpringChatRepository.ts`
- `src/features/chat/hooks/useChatRooms.ts`
- `src/features/chat/hooks/useChatRoom.ts`
- `src/features/chat/hooks/useChatMessages.ts`
- `src/features/chat/hooks/useChatDetailData.ts`
- `src/features/chat/hooks/useCommunityTabUnreadIndicator.ts`
- `src/features/community/hooks/useCommunityChatData.ts`
- `src/di/RepositoryProvider.tsx`

runtime note:

- 일반 Chat도 중앙 DI `chatRepository`를 source of truth로 사용한다.
- 목록/상세/읽음 상태/알림 상태는 `SpringChatRepository` 내부 room cache 하나를 기준으로 맞춘다.
- `GET /v1/chat-rooms` 응답은 public discover room + joined room을 함께 포함하고, 프론트는 joined/not joined 상태와 정렬 정책을 query layer에서 조합한다.
- 미참여 public room은 detail preview만 허용하고, join 성공 후에만 messages/STOMP/read/mute 흐름을 시작한다.
- `/user/queue/chat-rooms` event는 joined room summary 기준 채널이므로 unread/tab badge는 joined room만 계산한다.
- `CHAT_ROOM_REMOVED`를 받으면 joined-room summary에서는 제거하되, public room detail/list cache는 not joined state로 정리한다.
- backend는 `PATCH /read`, `PATCH /settings` 후 summary event를 보내지 않으므로 프론트가 성공 응답을 cache에 patch해 unread/mute/summary 일관성을 유지한다.
- `PATCH /read` 요청 본문은 여전히 `{ lastReadAt: ISO8601 UTC }`이지만, 실기기 시계 차이로 unread가 되살아나는 문제를 막기 위해 프론트는 room의 최신 visible server timestamp(`lastMessage.createdAt`/`updatedAt`)와 현재 시각 중 더 뒤 값을 보정해서 보낸다.
- 일반 Chat `채팅방 나가기` 성공 후에는 same-room preview에 머무르지 않고 커뮤니티 탭 채팅 세그먼트로 즉시 복귀한다.
- `GET /messages`, `SEND /app/chat/{chatRoomId}`, `SUBSCRIBE /topic/chat/{chatRoomId}`는 모두 backend에서 `ChatRoomMember`를 요구한다.
- create API는 repository/API layer까지 연결됐고, UI는 아직 노출하지 않는다.
- 일반 Chat의 client SYSTEM 전송 dead path는 제거했다.

### 3.7 Board / Community board

상태:

- 연결 완료

endpoint:

- `GET /v1/posts`
- `GET /v1/posts/{postId}`
- `POST /v1/posts`
- `PATCH /v1/posts/{postId}`
- `DELETE /v1/posts/{postId}`
- `POST /v1/posts/{postId}/like`
- `DELETE /v1/posts/{postId}/like`
- `POST /v1/posts/{postId}/bookmark`
- `DELETE /v1/posts/{postId}/bookmark`
- `GET /v1/posts/{postId}/comments`
- `POST /v1/posts/{postId}/comments`
- `PATCH /v1/comments/{commentId}`
- `DELETE /v1/comments/{commentId}`
- `POST /v1/images?context=POST_IMAGE`

현재 사용처:

- Board 목록
- Board 상세
- Board 좋아요 / 북마크 / 댓글 작성 / 게시글 삭제
- Board 글쓰기 / 수정
- Community board 탭 목록 / featured post 조합

코드:

- `src/features/board/data/api/boardApiClient.ts`
- `src/features/board/data/dto/boardDto.ts`
- `src/features/board/data/mappers/boardMapper.ts`
- `src/features/board/data/repositories/SpringBoardRepository.ts`
- `src/features/board/hooks/useBoardWrite.ts`
- `src/features/board/hooks/useBoardEdit.ts`
- `src/features/board/hooks/useBoardDetailData.ts`
- `src/features/community/application/communityBoardQuery.ts`
- `src/features/community/hooks/useCommunityBoardData.ts`
- `src/di/RepositoryProvider.tsx`

runtime note:

- Board 이미지 업로드는 더 이상 shared mock storage path를 사용하지 않고 `POST /v1/images?context=POST_IMAGE`를 먼저 호출한 뒤 `POST /v1/posts` payload에 포함한다.
- Community board도 중앙 DI `boardRepository`를 그대로 사용하므로 mock board source와 분기되지 않는다.
- `GET /v1/posts` summary contract에 `bookmarkCount`가 추가되어 Board list / Community featured popularity를 서버 누적 수치로 계산할 수 있다.
- `PATCH /v1/posts/{postId}`는 `title/content/category/isAnonymous/images`를 지원한다. `images`를 보내면 전체 목록 교체, `[]`면 전체 제거, 생략/null이면 기존 유지 semantics를 따른다.
- 관리자 moderation으로 `HIDDEN` 처리된 게시글은 public `GET /v1/posts`, `GET /v1/posts/{postId}`, `GET /v1/members/me/posts`, `GET /v1/members/me/bookmarks`에서 제외된다.
- 관리자 moderation으로 `HIDDEN` 처리된 댓글은 public `GET /v1/posts/{postId}/comments`에서 thread 구조 유지를 위해 placeholder 댓글처럼 마스킹된다.

### 3.8 Notice 본체

상태:

- 연결 완료

endpoint:

- `GET /v1/notices`
- `GET /v1/notices/{noticeId}`
- `POST /v1/notices/{noticeId}/read`
- `POST /v1/notices/{noticeId}/like`
- `DELETE /v1/notices/{noticeId}/like`
- `GET /v1/notices/{noticeId}/comments`
- `POST /v1/notices/{noticeId}/comments`
- `PATCH /v1/notice-comments/{commentId}`
- `DELETE /v1/notice-comments/{commentId}`

현재 사용처:

- Notice home 목록
- Notice detail
- 읽음 처리
- 좋아요
- 댓글 조회 / 작성 / 수정 / 삭제

코드:

- `src/features/notice/data/api/noticeApiClient.ts`
- `src/features/notice/data/dto/noticeDto.ts`
- `src/features/notice/data/mappers/noticeMapper.ts`
- `src/features/notice/data/repositories/SpringNoticeRepository.ts`
- `src/features/notice/hooks/useNotices.ts`
- `src/features/notice/hooks/useNoticeDetailData.ts`
- `src/features/notice/hooks/useNoticeReadState.ts`
- `src/features/notice/screens/NoticeDetailScreen.tsx`
- `src/di/RepositoryProvider.tsx`

runtime note:

- Notice detail screen은 placeholder bookmark reaction을 제거하고 실제 backend contract가 있는 like/comments만 노출한다.
- detail 진입 시 `POST /v1/notices/{noticeId}/read`를 호출해 read state를 server source에 맞춘다.
- `PATCH /v1/notice-comments/{commentId}`가 추가되어 프론트 `updateComment()`를 backend contract로 연결할 수 있다.
- Notice comment 수정은 `content`만 허용하며 `isAnonymous`는 생성 시점 값을 유지한다.

### 3.9 Campus academic / cafeteria

상태:

- 연결 완료

endpoint:

- `GET /v1/academic-schedules`
- `GET /v1/cafeteria-menus`
- `GET /v1/cafeteria-menus/{weekId}`

현재 사용처:

- Campus academic calendar detail
- Campus home academic preview
- Cafeteria detail
- Campus home cafeteria preview

코드:

- `src/features/campus/data/api/campusApiClient.ts`
- `src/features/campus/data/dto/campusDto.ts`
- `src/features/campus/data/mappers/campusMapper.ts`
- `src/features/campus/data/repositories/SpringAcademicRepository.ts`
- `src/features/campus/data/repositories/SpringCafeteriaRepository.ts`
- `src/features/campus/application/campusHomeQuery.ts`
- `src/features/campus/hooks/useAcademicCalendarDetailData.ts`
- `src/features/campus/hooks/useCafeteriaDetailData.ts`
- `src/features/campus/hooks/useCampusHomeViewData.ts`
- `src/di/RepositoryProvider.tsx`

runtime note:

- Campus home은 academic / cafeteria를 query layer에서 조합하고, central mock repository를 더 이상 기본값으로 사용하지 않는다.
- 2026-03-29 기준 backend 학식 계약은 기존 `menus`를 유지하면서 `categories`와 `menuEntries`(title, badges, likeCount, dislikeCount)를 함께 제공한다.
- 2026-03-29 기준 backend는 같은 주 안에서 동일한 `category + title`의 `badges`, `likeCount`, `dislikeCount`가 날짜마다 달라지지 않도록 저장 단계에서 검증한다.
- Cafeteria detail / campus home preview는 더 이상 `오늘 제공`, `오늘`, `주간 n회` 같은 frequency badge를 source of truth로 쓰지 않고, Figma 구현 시 `menuEntries` 메타데이터를 직접 사용해야 한다.
- 현재 campus domain에서 Spring source of truth로 남지 않은 것은 course/timetable/user preview 조합용 기존 mock repository뿐이며, 이번 Phase H 범위 밖이다.

### 3.10 Minecraft overview / whitelist realtime

상태:

- 연결 완료

endpoint / realtime contract:

- `GET /v1/minecraft/overview`
- `GET /v1/minecraft/players`
- `GET /v1/members/me/minecraft-accounts`
- `POST /v1/members/me/minecraft-accounts`
- `DELETE /v1/members/me/minecraft-accounts/{accountId}`
- `GET /v1/sse/minecraft`

현재 사용처:

- Campus 메인 마인크래프트 섹션
- 마인크래프트 상세 화면
- 마인크래프트 계정 등록/삭제 화면
- Community 채팅의 마인크래프트 가이드/서버 주소 표시

코드:

- `src/features/minecraft/data/api/minecraftApiClient.ts`
- `src/features/minecraft/data/repositories/SpringMinecraftRepository.ts`
- `src/features/minecraft/services/minecraftRealtimeService.ts`
- `src/features/minecraft/hooks/useMinecraftServerOverview.ts`
- `src/features/minecraft/hooks/useMinecraftWhitelistPlayers.ts`
- `src/features/minecraft/hooks/useMinecraftAccounts.ts`
- `src/features/minecraft/components/MinecraftSection.tsx`
- `src/features/minecraft/screens/MinecraftDetailScreen.tsx`
- `src/features/minecraft/screens/MinecraftAccountScreen.tsx`
- `src/features/chat/screens/ChatDetailScreen.tsx`

runtime note:

- Minecraft feature는 아직 `RepositoryProvider`가 아니라 feature-local `minecraftRuntime` composition을 통해 Spring repository를 사용한다.
- server overview / players는 `GET` 초기 로드 후 `GET /v1/sse/minecraft` signal/payload로 동기화한다.
- whitelist players는 `PLAYERS_SNAPSHOT`, `PLAYER_UPSERT`, `PLAYER_REMOVE` 이벤트를 직접 반영한다.
- 계정 등록/삭제는 REST mutation 성공 후 `getMyAccounts()`를 다시 호출해 화면 상태를 맞춘다.

### 3.11 Share Link

상태:

- 연결 완료

endpoint:

- `POST /v1/share-links`
- `GET /v1/share-links/{resourceType}/{code}/resolve`

현재 사용처:

- 학교 공지 상세 공유: 원본 공지 ID로 8자리 코드 발급 후 URL 공유
- 커뮤니티 게시물 상세 공유: 삭제·숨김되지 않은 원본 ID로 코드 발급 후 URL 공유
- cold/warm 앱 링크: 로그인·온보딩 완료 뒤 코드를 원본 ID로 해석하고 기존 상세 화면 이동
- 학식 공유는 날짜 없이 `https://link.skuri.kr/cafeteria`를 유지하며 서버 해석을 호출하지 않음

코드:

- `src/app/linking/shareLinkClient.ts`
- `src/app/linking/AppLinkRuntime.tsx`
- `src/features/notice/screens/NoticeDetailScreen.tsx`
- `src/features/board/screens/BoardDetailScreen.tsx`

runtime note:

- 앱은 8자리 Base58 코드만 수용하고 기존 Base64/원본 ID 긴 링크는 거부한다.
- resolve는 인증 토큰이 준비된 메인 진입 이후 수행한다. 새 링크 또는 route 전환이 발생하면 이전 비동기 결과와 오류 알림을 무시한다.
- 공개 웹 preview API는 웹의 책임이며 RN 앱은 호출하지 않는다. deferred deep link도 제공하지 않는다.

---

## 4. 부분 연결 API

이 섹션은 “endpoint 몇 개는 이미 연결됐지만, 도메인 전체 전환은 끝나지 않은 영역”을 정리한다.

### 4.1 Taxi Party domain

상태:

- 부분 연결

이미 연결된 endpoint:

- `POST /v1/parties`
- `PATCH /v1/parties/{id}`
- `POST /v1/parties/{partyId}/cancel`
- `GET /v1/parties/{partyId}/join-requests`
- `PATCH /v1/join-requests/{id}/accept`
- `PATCH /v1/join-requests/{id}/decline`
- `GET /v1/parties`
- `GET /v1/parties/{partyId}`
- `GET /v1/members/me/parties`
- `GET /v1/members/me/join-requests`
- `GET /v1/sse/parties`
- `GET /v1/sse/parties/{partyId}/join-requests`
- `GET /v1/sse/members/me/join-requests`
- `POST /v1/parties/{partyId}/join-requests`
- `PATCH /v1/join-requests/{id}/cancel`
- `PATCH /v1/parties/{id}/close`
- `PATCH /v1/parties/{id}/reopen`
- `PATCH /v1/parties/{id}/arrive`
- `PATCH /v1/parties/{id}/end`
- `DELETE /v1/parties/{id}/members/{memberId}`
- `DELETE /v1/parties/{partyId}/members/me`
- `PATCH /v1/parties/{id}/settlement/members/{memberId}/confirm`

아직 남은 것:

- signal-only SSE + REST snapshot 구조의 재조회 비용
- Taxi Party domain 외부의 일반 Chat / legacy 경로 수렴

의미:

- Taxi Home, AcceptancePending, Main tab의 my party/join request badge, leader 승인/거절, recruit(create), 파티 수정/취소와 주요 subscription은 Spring REST/SSE 기준으로 동작한다.
- Taxi Party의 Phase E 사용자 기능 범위는 정리됐지만, domain 전체 관점에서는 signal-only SSE 구조와 legacy 경로가 일부 남아 있다.

### 4.2 Chat domain

상태:

- 부분 연결

이미 연결된 것:

- Taxi Home / AcceptancePending에서 실제 `Chat` route 진입
- Taxi Chat detail의 `GET /v1/chat-rooms/{chatRoomId}`
- Taxi Chat detail의 `GET /v1/chat-rooms/{chatRoomId}/messages`
- Taxi Chat detail의 `PATCH /v1/chat-rooms/{chatRoomId}/settings`
- Taxi Chat detail의 `PATCH /v1/chat-rooms/{chatRoomId}/read`
- Taxi Chat detail의 `/app/chat/{chatRoomId}`
- Taxi Chat detail의 `/topic/chat/{chatRoomId}`
- Taxi Chat detail의 `/user/queue/errors`
- Taxi Chat detail의 `ACCOUNT` payload write/read
- Taxi Chat detail의 server-generated `SYSTEM` / `ARRIVED` / `END` message read/render
- 일반 Chat의 `GET /v1/chat-rooms`
- 일반 Chat의 `GET /v1/chat-rooms/{chatRoomId}`
- 일반 Chat의 `POST /v1/chat-rooms`
- 일반 Chat의 `POST /v1/chat-rooms/{chatRoomId}/join`
- 일반 Chat의 `DELETE /v1/chat-rooms/{chatRoomId}/members/me`
- 일반 Chat의 `GET /v1/chat-rooms/{chatRoomId}/messages`
- 일반 Chat의 `PATCH /v1/chat-rooms/{chatRoomId}/settings`
- 일반 Chat의 `PATCH /v1/chat-rooms/{chatRoomId}/read`
- 일반 Chat의 `/app/chat/{chatRoomId}`
- 일반 Chat의 `/topic/chat/{chatRoomId}`
- 일반 Chat의 `/user/queue/chat-rooms`
- 일반 Chat의 `/user/queue/errors`

아직 남은 것:

- 이미지 메시지 전송의 실사용 연결

의미:

- Taxi Chat detail과 일반 공개 Chat은 모두 REST/STOMP 기준으로 동작하고, 일반 Chat의 room summary/unread/tab indicator도 `/user/queue/chat-rooms` 기준으로 맞춰진다.
- Chat domain 전체로 보면 남은 일은 이미지 메시지 실사용 연결과 이후 legacy 정리다.

---

## 5. 아직 미연결 API

이 섹션은 “현재 앱에서 아직 Spring으로 붙지 않은 대표 사용자 기능 API”를 정리한다.

### 5.1 Chat

- 이미지 메시지 전송의 실사용 연결

### 5.2 Board / Notice / Campus

Board / Notice / Campus는 Phase H follow-up까지 반영되어 현재 사용자 기능 기준의 Spring source of truth 전환이 닫혔다.

- Board summary `bookmarkCount`는 `GET /v1/posts` summary contract를 그대로 사용한다.
- Board 수정은 `PATCH /v1/posts/{postId}`의 `isAnonymous/images` semantics까지 연결됐다.
- Notice 댓글 수정은 `PATCH /v1/notice-comments/{commentId}`로 연결됐다.

구조 메모:

- Phase G cleanup으로 screen-level local chain과 dead Firebase path는 이미 제거됐다.
- 이번 Phase H에서 `RepositoryProvider`의 `boardRepository` / `noticeRepository` / `academicRepository` / `cafeteriaRepository` 기본 구현도 Spring concrete repository로 전환됐다.
- 따라서 현재 남은 구조 우선순위는 Chat 이미지 메시지 실사용 연결과 이후 legacy 정리다.

---

## 6. 개발용 API 로깅 가이드

### 6.1 결론

개발 중에는 API 요청/응답을 콘솔에 출력해도 된다.

하지만 아래 항목은 **그대로 출력하면 안 된다.**

- Firebase ID token
- Authorization header 원문
- FCM token
- password / auth code / refresh token 계열
- multipart binary payload
- 채팅/문의/신고처럼 민감한 본문 전체

즉, **“전부 raw dump”는 비권장**이고,
**“개발 전용 + 구조화된 로그 + 민감정보 마스킹”** 전략이 맞다.

### 6.2 권장 로깅 위치

우선순위는 다음 순서가 좋다.

1. `src/shared/api/httpClient.ts`
2. `src/shared/realtime/sseClient.ts`
3. `src/shared/realtime/chatSocketClient.ts`

이유:

- 모든 Spring REST 요청이 `httpClient`를 통과한다.
- 여기서 찍어야 feature별 중복 로깅이 안 생긴다.
- SSE/STOMP도 transport 레이어에서 찍어야 연결/재연결/구독 실패를 한 번에 볼 수 있다.

### 6.3 권장 로그 필드

request 로그:

- requestId
- method
- full URL
- params
- body summary
- sanitized headers
- startedAt

response 로그:

- requestId
- method
- full URL
- statusCode
- durationMs
- response summary

error 로그:

- requestId
- method
- full URL
- statusCode
- repository error code
- api error code
- message
- durationMs

### 6.4 반드시 마스킹할 값

header:

- `Authorization`
- `Cookie`
- `Set-Cookie`
- `X-Api-Key`

body / params key:

- `token`
- `idToken`
- `refreshToken`
- `fcmToken`
- `password`
- `authCode`

권장 출력 형식:

- `Authorization: Bearer <redacted>`
- `fcmToken: <redacted>`

### 6.5 body/response 로깅 원칙

body와 response는 무조건 전부 찍지 않는다.

권장 방식:

- 기본값은 key 목록 + 길이/개수만 출력
- 객체는 depth 2 정도까지만 출력
- 배열은 앞쪽 몇 개만 preview
- 문자열은 최대 길이 제한
- multipart/form-data는 파일 메타만 출력

예:

- 게시글 본문: 전문 출력 금지, 길이만 출력
- 채팅 메시지: 전문 출력 금지, 길이만 출력
- 파티 목록: `content.length`, `page`, `hasNext` 중심 출력

### 6.6 환경별 정책

권장 정책:

- `__DEV__ === true`일 때만 기본 활성화
- release build에서는 완전 비활성화
- 필요하면 별도 debug flag로 강제 on/off

예:

- `ENABLE_API_DEBUG_LOG=true`일 때만 상세 로그
- 기본 개발 모드에서는 summary 로그만

### 6.7 추천 전략

가장 안전한 전략은 아래 3단계다.

1. request/response/error 공통 logger를 `httpClient`에 1곳만 둔다.
2. 민감정보는 중앙 sanitizer 함수로 마스킹한다.
3. 기본은 summary 로그, 필요할 때만 endpoint whitelist 기반 상세 로그를 켠다.

즉, 지금 프로젝트에 가장 맞는 방식은:

- 중앙 로깅
- dev only
- redaction 필수
- large payload truncation
- requestId 기반 추적

### 6.8 지금 프로젝트에서의 권장 구현 순서

1. `src/shared/api/httpClient.ts`에 dev-only logger hook 추가
2. `src/shared/api/` 아래에 `apiLogger.ts`와 `apiLogSanitizer.ts` 추가
3. SSE / STOMP는 Phase D/F에서 transport별 event logger 추가

권장 추가 파일:

- `src/shared/api/apiLogger.ts`
- `src/shared/api/apiLogSanitizer.ts`

---

## 7. 다음 작업자 메모

- 실제 endpoint 계약은 `/v3/api-docs` 우선이다.
- 이 문서의 “연결 완료”는 사용자 기능 기준이며, backend 전체 완료를 뜻하지 않는다.
- Notification / Taxi / Chat은 domain 전체 기준으로는 아직 다음 phase 작업이 남아 있다.
- API 로깅을 붙일 때는 raw token/body를 그대로 출력하지 않는다.
