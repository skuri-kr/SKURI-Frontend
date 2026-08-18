# SKURI 친구 기능 모바일 구현 계획

> 문서 상태: Friend 관계 Core 모바일 구현 완료, PR 생성 준비 중
> 기준일: 2026-08-18
> 정책 기준: SKURI-Backend docs/features/friends.md
> 구현 게이트: 관계 Core는 사용자 승인 완료. 후속 도메인 협력 기능은 각각 별도 승인한다.

백엔드 기준 문서:

- GitHub: https://github.com/skuri-kr/SKURI-Backend/blob/main/docs/features/friends.md
- 로컬 작업 경로: /Users/jisung/skuri-backend/docs/features/friends.md

---

## 1.1 관계 Core 모바일 전달 범위 (2026-08-18 확정)

백엔드 PR #80의 Friend Foundation·관계 Core가 `main`에 병합됐다. 이 모바일 작업은 병합된 런타임 계약 중 친구 관계를 직접 사용할 수 있는 범위만 구현한다.

이번 모바일 PR에 포함:

- 친구 목록·상세, 즐겨찾기, 친구 끊기, 차단·차단 해제
- 친구 코드 preview·내 코드 표시/복사/공유/재발급, 닉네임 검색과 명시적 요청 발송
- 받은·보낸 PENDING 친구 요청의 목록, 수락·거절·취소
- 마이페이지 친구 진입점과 서버 `totalActionCount` badge
- 닉네임 검색 허용과 차단 목록을 제공하는 관계 Core 범위의 FriendSettings
- `FriendHub`의 `친구 | 요청` 두 탭

### 1.2 구현 확정 UI 경계 (2026-08-18)

관계 Core 구현에서는 아래처럼 범위를 더 구체화했다. 이 절은 문서의 후속 버전 설계와 충돌할 경우 현재 PR의 실제 동작을 우선한다.

- 마이페이지의 `친구` 행이 FriendHub로 이동하고, 서버 `totalActionCount`가 1~99+ badge로 표시된다. 배지 조회 실패는 마이페이지 자체를 막지 않는다.
- FriendHub 헤더의 `+`는 FriendAdd로 바로 이동한다. FriendAdd 한 화면 상단에 `내 친구 코드`의 복사·공유·재발급을 두고, 아래에 친구 코드 확인과 닉네임 검색을 둔다. QR을 제공할 때 별도 action sheet 또는 화면 분리는 그 PR에서 다시 결정한다.
- FriendHub에는 친구 목록 및 받은·보낸 PENDING 요청만 보여준다. 목록 정렬은 즐겨찾기 우선·가나다순이며, 요청·검색의 opaque cursor 다음 페이지는 `더 보기`로 이어 붙인다.
- FriendHub는 pull-to-refresh를 제공한다. 수락·거절·취소·즐겨찾기 변경 직후에는 화면 상태를 먼저 반영하고, 이전에 시작된 새로고침 응답은 최신 상태를 덮어쓰지 않도록 무시한다.
- 닉네임 검색의 빈 결과는 현재 입력값으로 성공한 검색 뒤에만 표시하며, 다른 친구에게 보내는 요청은 각각 완료될 때까지 독립적으로 진행 상태를 유지한다.
- 친구 상세는 프로필 요약, 즐겨찾기, 친구 끊기, 차단만 제공한다. 시간표, Minecraft, 택시파티 및 채팅방 초대는 안내 문구를 제외하고 노출하지 않는다.
- FriendSettings에는 닉네임 검색 공개 toggle과 차단 목록/차단 해제만 둔다. 두 정보는 독립적으로 불러오므로 한 조회가 실패해도 다른 정보와 개별 재시도를 제공한다.
- QR 생성·스캔, 카메라 권한과 native 의존성은 추가하지 않았다. FriendAdd의 QR 안내는 후속 기능 예정 상태를 알리는 비상호작용 안내다.
- 실제 사용자 노출은 백엔드 배포와 기존 ACTIVE 회원 FriendProfile provisioning 검증 이후에만 진행한다.

이번 모바일 PR에서 의도적으로 제외:

- 초대 탭, 택시파티·공개방 친구 초대, 초대 수락/거절, 친구·초대 알림 이동
- 친구 시간표·공유 설정·공통 공강, Minecraft 친구 계정 projection, 친구 신고
- QR 생성/스캔과 Android·iOS 카메라 권한 변경

제외 항목은 정책 폐기가 아니다. 해당 백엔드 API와 도메인 협력이 구현된 뒤 별도 PR에서 추가한다. 특히 FriendHub의 초대 탭은 서버의 초대 목록·mutation API가 준비되기 전에는 빈 상태로도 노출하지 않는다.

백엔드 계약은 `main`에 존재하지만 배포·기존 ACTIVE 회원 FriendProfile provisioning 완료 여부는 아직 이 작업에서 확인하지 않았다. 모바일 코드는 구현할 수 있으나, 실제 사용자에게 친구 진입점을 노출하는 릴리스는 백엔드 배포와 provisioning 검증 이후에만 진행한다.

---

## 1. 문서 역할

이 문서는 승인된 친구 정책을 모바일 화면, 상태, navigation, 컴포넌트와 구현 순서로 옮기는 실행 계획이다.

- 정책, 권한, 상태 전이의 단일 기준은 백엔드 친구 명세다.
- 이 문서는 정책을 새로 만들지 않고 모바일에서 어떻게 표현하고 검증할지 정의한다.
- 현재 앱에 없는 API와 화면을 이미 구현된 것으로 설명하지 않는다.
- 코드 구현 중 새로운 정책·UI 선택이 필요하면 작업을 멈추고 사용자 승인을 받는다.
- 기존 디자인 시스템과 공통 컴포넌트를 먼저 사용한다.
- 새 UI가 기능 전용이면 feature 내부에 두고, 세 기능 이상에서 의미 있게 재사용될 때만 shared로 승격한다.

---

## 2. 현재 코드 기준선

문서 작성 시점에 확인한 현재 구조:

| 영역 | 현재 기준 |
| --- | --- |
| 시간표 상세 | src/features/timetable/screens/TimetableDetailScreen.tsx의 단일 ScrollView와 오늘·전체 SegmentedControl |
| 전체 시간표 | TimetableAllViewCard 내부에 야간 수업 펼치기·접기 |
| 택시 채팅 메뉴 | src/features/taxi/components/TaxiChatHeaderMenu.tsx |
| 공개 채팅 메뉴 | src/shared/ui/chat/ChatPopupMenu.tsx |
| 마인크래프트 계층 | MinecraftDetailScreen의 SELF 부모 + FRIEND 자식 accordion |
| 알림 | FCM, 알림 인박스, notification SSE, navigation intent 구조 존재 |
| 딥링크 | iOS·Android skuri custom scheme 등록은 있으나 NavigationContainer linking 계약은 없음 |
| QR | QR 생성·스캔 의존성 없음 |
| 디자인 | shared/design-system의 토큰, SegmentedControl, StateCard, ToneBadge, DefaultProfileAvatar 등 사용 |

이 기준선은 실제 구현 시작 직전에 최신 main에서 다시 확인한다.

---

## 3. 정보 구조와 진입점

### 3.1 주 진입점

- 마이페이지 메뉴에 친구 항목을 추가한다.
- 받은 요청 또는 초대가 있으면 행 우측에 통합 badge를 표시한다.
- 친구 항목을 누르면 FriendHub 화면으로 이동한다.
- FriendHub 헤더 우측에는 친구 설정과 `+` action을 각각 제공한다.
- 관계 Core의 `+` action은 FriendAdd로 이동한다. FriendAdd 상단의 내 친구 코드 영역에서 코드 표시·복사·공유·재발급을 제공한다.

### 3.2 보조 진입점

- 시간표 상세 상단의 친구 시간표 버튼
- 친구 시간표 section의 친구 행
- 친구 시간표 section 제목 우측의 공유 설정
- 친구 상세의 택시파티 초대·공개 채팅방 초대
- 택시파티 채팅방 우측 상단 메뉴
- 공개 채팅방 우측 상단 메뉴
- FRIEND_REQUEST, FRIEND_ACCEPTED, PARTY_INVITATION, CHAT_ROOM_INVITATION 알림

### 3.3 예정 navigation

CampusStackParamList에 다음 화면을 추가하고 기존 TimetableDetail params를 확장할 계획이다.

| Route | Params | 설명 |
| --- | --- | --- |
| FriendHub | 없음 | 관계 Core 친구·요청 허브 |
| FriendAdd | 없음 | 내 코드, 코드 확인, 닉네임 검색 |
| FriendDetail | friendId | 관계 Core 친구 상세 |
| FriendSettings | 없음 | 닉네임 검색 허용과 차단 목록 |
| TimetableDetail | 기존 initialView?, mode? + targetFriendPublicId? | 대상 친구 accordion 자동 이동·전개 |

알림 payload는 app/notifications에서 파싱하고 app/navigation/services에서 목적지를 결정한다. feature가 root navigation state를 직접 해석하지 않는다.

- PARTY_INVITATION과 CHAT_ROOM_INVITATION은 `initialTab=invitations`와 서버 payload의 `invitationType`, `invitationId`를 FriendHub params로 전달한다.
- FriendHub는 초대 query 로딩 후 type과 ID가 일치하는 카드를 찾아 스크롤하고 잠시 강조한다.
- 대상이 첫 응답에 없으면 한 번 새로고침하고, 그래도 없으면 처리 완료·만료 안내를 표시한 뒤 target을 소비한다.
- route params는 문자열 enum과 불투명 ID만 사용해 React Navigation state를 직렬화 가능하게 유지한다.

---

## 4. FriendHub 화면

### 4.1 전체 구조

~~~text
┌──────────────────────────────┐
│ ‹  친구               ⚙  ＋   │
│                              │
│ [ 친구 12 ] [ 요청 2 ]            │
├──────────────────────────────┤
│ [ 친구 이름 검색             ] │
│                              │
│ ★ [사진] 김민수              │
│     컴퓨터공학과              │
│     Steve 외 2개              │
│                              │
│ ☆ [사진] 박서연              │
│     정보통신공학과            │
│     Minecraft 계정 없음       │
└──────────────────────────────┘
~~~

### 4.2 친구 탭

- 즐겨찾기 우선, 이후 가나다순으로 표시한다.
- 행 전체를 누르면 FriendDetail로 이동한다.
- 우측 별 버튼은 행 navigation과 이벤트를 분리한다.
- 마인크래프트 계정이 있으면 대표 SELF 게임명 외 N개를 표시한다.
- 계정이 없으면 빈 보조 문구를 과도하게 강조하지 않는다.
- 친구 목록 새로고침은 pull-to-refresh를 제공한다.
- 초기 목록은 가벼운 요약 DTO만 사용한다.

헤더 `+` action:

- 관계 Core에서는 FriendAdd로 바로 이동한다.
- FriendAdd 상단에서 현재 코드 표시·복사·공유·재발급을 제공한다.
- 코드 재발급은 기존 코드가 즉시 무효화된다는 확인 후 실행하고 성공 시 현재 코드만 갱신한다. QR은 후속 QR PR에서 함께 갱신한다.

빈 상태:

- 제목: 아직 친구가 없어요
- 설명: 친구 코드 또는 닉네임으로 친구를 추가해보세요.
- CTA: 친구 추가

오류 상태:

- StateCard와 다시 시도를 사용한다.
- 기존 캐시가 있으면 목록을 유지하고 비차단 오류 안내를 사용한다.

### 4.3 요청 탭

받은 요청:

- 프로필, 닉네임, 학과, 만료까지 남은 기간
- 수락, 거절
- 수락 중에는 양쪽 버튼 중복 입력 방지

보낸 요청:

- 프로필, 닉네임, 상태, 만료 시각
- PENDING 요청 취소
- 거절·만료 후 즉시 다시 요청할 수 있다.

목록 계약:

- 받은·보낸 탭은 각각 서버의 `direction=RECEIVED|SENT`를 사용하며 현재 PENDING 요청만 표시한다.
- 한 페이지는 20건이고 서버의 opaque cursor를 사용한다. `createdAt DESC`, `requestId DESC` 순서로 이어 붙인다.
- 수락·거절·취소 결과는 mutation 직후 짧게 표시한 뒤 현재 PENDING 목록에서 제거하고 query를 재조회한다.
- 거절·취소·만료 terminal 이력 조회는 V1에서 제공하지 않고 후속 TODO로 남긴다.

거절 동작:

- 확인 팝업 없이 한 번의 명시적 버튼으로 처리한다.
- 상대에게 거절 푸시는 보내지 않는다.
- 처리 후 요청 목록에서 완료 상태를 짧게 보여준 뒤 제거 또는 완료 section으로 이동한다.

### 4.4 초대 탭

초대 탭은 택시파티·공개방 초대 API가 구현된 후의 후속 범위다. 관계 Core 모바일 PR에서는 이 탭과 관련 badge·알림 이동을 렌더링하지 않는다.

- 택시파티 초대와 공개방 초대를 시간순으로 한 목록에 표시한다.
- 각 카드에 초대한 친구, 대상 이름, 만료 또는 파티 상태를 보여준다.
- 수락과 거절 버튼을 제공한다.
- 택시 초대에는 좌석을 예약하지 않는다는 안내를 표시한다.
- 수락 실패 시 최신 서버 상태에 맞춰 정원 마감, 파티 종료, 입장 자격 변경을 구체적으로 안내한다.
- 정원 제한 공개방이 가득 차면 초대를 EXPIRED로 표시하고 badge에서 제외하며, 자리가 생겨도 기존 초대를 다시 활성화하지 않는다.
- EXPIRED 카드의 `expiryReason`은 서버가 제공한 안전 enum만 사용자 문구로 매핑하며 클라이언트가 현재 상태로 과거 사유를 재계산하지 않는다. 알 수 없는 enum은 일반 `초대가 만료되었어요`로 fallback한다.

### 4.5 badge

- 요청 탭 badge는 내가 받은 유효 PENDING 요청인 incomingRequestCount만 표시하며 보낸 PENDING 요청은 제외한다.
- 초대 탭 badge는 내가 받은 유효 PENDING partyInvitationCount와 chatRoomInvitationCount의 합계만 표시한다.
- 마이페이지 친구 행은 서버 totalActionCount를 표시하며, 이는 받은 요청과 받은 두 종류 초대 count의 합계다.
- 알림 인박스 unread badge와 친구 PENDING badge는 다른 의미이므로 합치지 않는다.
- 소셜 알림 수신 시 관련 query를 무효화해 화면 진입 전 badge를 갱신한다.

### 4.6 설정 진입점

- 헤더 우측 설정 아이콘은 FriendSettings로 이동한다.
- 접근성 label은 `친구 설정`으로 지정하고 친구 추가 action과 독립된 hit target을 사용한다.
- 관계 Core에서는 닉네임 검색 허용과 차단 목록만 관리한다. 시간표 기본 공유와 친구별 예외는 시간표 공유 API가 준비되는 후속 PR에서 추가한다.

---

## 5. 친구 추가

### 5.1 화면 구조

~~~text
┌──────────────────────────────┐
│ ‹  친구 추가                  │
│                              │
│ [ 친구 코드 ] [ QR ] [ 닉네임 ] │
├──────────────────────────────┤
│ 선택한 방식의 입력·스캔 UI    │
└──────────────────────────────┘
~~~

기존 SegmentedControl을 우선 사용한다.

### 5.2 친구 코드

- 내 코드는 FriendHub `+` action sheet의 `내 친구 코드`에서 표시하고 같은 값을 QR로 만든다.
- 코드와 QR은 복사·공유할 수 있으며 공유 payload는 V1에서 URL이 아닌 코드 문자열과 `skuri-friend:v1:{friendCode}` QR이다.
- 입력은 대소문자와 하이픈 유무를 허용하고 정규화한다.
- 입력 완료 시 `POST /v1/friend-codes/preview`로 대상 공개 프로필을 확인하며 이 호출만으로 친구 요청을 생성하지 않는다.
- 자기 코드는 별도 메시지로 안내한다.
- 잘못되거나 폐기된 코드와 양방향 차단 관계는 같은 `대상을 찾을 수 없어요` 상태로 처리해 차단 여부를 노출하지 않는다.
- 코드 재발급은 기존 코드가 즉시 무효화됨을 확인 팝업으로 안내한다.

### 5.3 QR

- payload는 skuri-friend:v1:{friendCode}만 인식한다.
- 스캔 성공 후 카메라를 닫고 같은 친구 코드 preview API를 호출한 뒤 대상 프로필 확인 카드로 이동한다.
- 대상 확인 전 요청을 자동 발송하지 않는다.
- 카메라 권한 최초 요청, 거절, 다시 요청 불가, 설정 이동을 각각 처리한다.
- 현재 NSCameraUsageDescription은 이미지 업로드 용도만 설명하므로 QR 스캔 목적을 추가해야 한다.
- Android 카메라 permission과 런타임 권한도 실제 라이브러리 요구사항에 맞춰 확인한다.

QR 구현 전 기술 확인:

- 현재 React Native·New Architecture 호환
- iOS·Android 공식 설치 절차
- 카메라 권한 동작
- 유지보수 상태
- react-native-svg와의 QR 생성 호환
- patches/README.md 영향

라이브러리는 코드 구현 승인 후 공식 문서를 다시 확인해 선정한다.

### 5.4 닉네임 검색

- 검색 허용을 켠 ACTIVE 회원만 표시한다.
- 2글자 미만에는 검색하지 않는다.
- 입력 debounce를 적용한다.
- 한 페이지는 최대 20명이며 서버의 opaque cursor, hasNext, nextCursor로 다음 결과를 이어서 조회한다.
- 결과는 닉네임 가나다순, friendPublicId 오름차순으로 안정 정렬하고 같은 검색어의 다음 cursor에만 이어 붙인다.
- 검색어가 바뀌면 기존 결과와 cursor를 폐기하며 하단 더보기 또는 무한 스크롤로 다음 페이지를 요청한다.
- 결과에는 닉네임, 학과, 프로필 사진만 노출한다.
- 같은 닉네임이 여러 명일 수 있음을 문구와 결과 구분으로 표현한다.
- 결과와 navigation에는 Firebase UID나 내부 members.id가 아닌 친구 기능 전용 friendPublicId만 사용한다.
- 이미 친구, PENDING, 차단 관계는 서버 응답 상태에 맞춰 버튼을 숨긴다.

### 5.5 대상 확인

~~~text
[프로필 사진]
김민수
컴퓨터공학과

[ 친구 요청 보내기 ]
~~~

- 이메일, 실명, 학번은 표시하지 않는다.
- preview·닉네임 검색 결과의 friendPublicId로만 명시적 친구 요청 생성 API를 호출한다.
- 발송 성공 후 중복 탭을 막고 요청 탭으로 이동할 수 있게 한다.

---

## 6. FriendDetail 화면

### 6.1 구조

~~~text
┌──────────────────────────────┐
│ ‹  친구 상세             ★   │
│                              │
│ [사진] 김민수                 │
│        컴퓨터공학과            │
│                              │
│ [ 택시파티 초대 ] [ 공개방 초대 ] │
│                              │
│ 시간표 공유                   │
│ 상세 시간표를 공유 중          │
│ [ 친구 시간표 보기 ]           │
│                              │
│ 마인크래프트 계정              │
│ Steve          대표 계정 · JAVA │
│   ├ Alex       친구 계정 · BE   │
│   └ Jisung_MC  친구 계정 · JAVA │
│                              │
│ 신고                          │
│ 친구 끊기                     │
│ 차단                          │
└──────────────────────────────┘
~~~

### 6.2 동작

- 즐겨찾기 변경은 낙관적 UI 후 실패 시 원복한다.
- 현재 사용자가 OPEN 택시파티에 참여 중일 때만 택시파티 초대 버튼을 표시한다.
- 사용자가 참여 중인 초대 가능한 공개방이 있을 때만 공개방 초대 버튼을 표시한다.
- 여러 공개방이 있으면 방 선택 sheet를 먼저 연다.
- 택시파티·공개방 대상이 정해지면 `FriendInviteSheet`에 현재 `friendPublicId`를 `initialFriendPublicId`로 전달한다.
- 친구 시간표 보기는 `TimetableDetail`에 `targetFriendPublicId=friendPublicId`를 전달한다.
- TimetableDetail은 자신의 시간표와 친구 요약 목록이 준비되면 친구 section으로 스크롤하고 해당 친구 accordion을 펼친다.
- 대상 적용 후 `targetFriendPublicId`를 한 번 소비해 rerender·학기 변경·화면 복귀 시 자동 이동을 반복하지 않는다.
- 친구 해제·차단으로 대상이 목록에 없으면 `더 이상 친구 시간표를 볼 수 없어요` 안내 후 친구 section의 기본 상태를 유지한다.
- 신고는 기존 ReportReasonModal의 카테고리·사유 입력 UX를 재사용하고 `POST /v1/friends/{friendPublicId}/report`를 호출한다.
- 신고 접수는 친구 관계를 자동으로 끊거나 차단하지 않으며, 완료 후 사용자가 별도로 차단할 수 있다.
- 친구 끊기와 차단은 destructive confirmation을 사용한다.
- 차단 설명에는 친구 관계와 소셜 공유가 함께 해제되며 공개 콘텐츠는 유지된다고 명시한다.

### 6.3 마인크래프트 계층

- SELF를 부모 row로 표시한다.
- 해당 SELF의 FRIEND 계정을 한 단계 들여쓰기한다.
- 대표 계정과 친구 계정 ToneBadge를 사용한다.
- 게임명, avatar, edition만 표시한다.
- lastSeenAt, 온라인 상태, 등록자 내부 정보는 표시하지 않는다.
- FRIEND가 없는 SELF는 불필요한 펼침 버튼을 표시하지 않는다.
- 계층이 길어질 때는 MinecraftDetailScreen의 accordion motion과 접근성 상태를 참고한다.

의미가 마인크래프트에 종속되므로 계층 컴포넌트는 우선 features/minecraft/components에 둔다. 기존 MinecraftDetailScreen과 친구 상세에서 동일 표현을 안전하게 재사용할 수 있을 때 추출하며, 기존 화면 동작을 바꾸는 리팩터링은 별도 검토한다.

---

## 7. 시간표 상세의 친구 시간표

### 7.1 상단 toolbar

~~~text
[ 오늘 시간표 | 전체 시간표 ] [ 친구 시간표 ]   총 18학점
~~~

- 오늘·전체는 기존 SegmentedControl을 유지한다.
- 친구 시간표는 세 번째 mode가 아닌 작은 outline anchor 버튼이다.
- 일반 화면 폭에서는 한 줄을 사용한다.
- 좁은 화면이나 큰 글씨에서는 학점을 다음 줄 우측에 배치한다.
- 친구 시간표 버튼에는 사람 아이콘을 사용할 수 있으나 텍스트를 생략하지 않는다.

### 7.2 scroll 이동

- 기존 ScrollView에 ref를 연결한다.
- 친구 section의 content y를 onLayout으로 저장한다.
- 버튼을 누르면 scrollTo animated로 이동한다.
- 친구 데이터가 아직 로딩 중이면 section shell까지 이동하고 로딩 상태를 표시한다.
- 친구가 없어도 빈 상태 section으로 이동한다.
- 스크린리더 사용 시 이동 후 친구 시간표 section 제목을 안내한다.

### 7.3 section 위치

친구 section은 자신의 시간표 관련 콘텐츠가 모두 끝난 다음 배치한다.

1. 오늘 또는 전체 시간표 card
2. 야간 수업 펼치기·접기
3. 온라인 수업
4. 토요일 수업
5. 구분선
6. 친구 시간표

오늘 보기에서도 같은 최하단 친구 section을 제공한다.

### 7.4 친구 accordion

~~~text
──────────────────────────────
친구 시간표              [공유 설정]  12명

[사진] 김민수  컴퓨터공학과   상세 공유  ☆ 〉

[사진] 박서연  정보통신공학과 바쁜 시간  ★ ⌄
  [읽기 전용 전체 주간 시간표]
  공통 공강 3개

[사진] 이지훈  경영학과        비공개    ☆ 〉
~~~

- 즐겨찾기 우선, 이후 가나다순이다.
- row 우측에 공유 범위 badge, 별, chevron을 둔다.
- 별 버튼은 accordion toggle과 별도 hit target이다.
- 한 번에 한 친구만 펼친다.
- 펼칠 때 화면 상단 학기 선택기의 `selectedSemester`를 필수 query parameter로 전달해 해당 친구의 같은 학기 시간표를 지연 조회한다.
- query key는 `friendPublicId + selectedSemester`로 구성하고, 학기 변경 시 열린 친구를 같은 학기로 재조회한다.
- 이미 조회한 데이터는 query cache를 사용하되 pull-to-refresh 시 갱신한다.
- 친구가 선택 학기에 시간표가 없으면 현재 학기 데이터로 대체하지 않고 `이 학기에 등록된 시간표가 없어요` 빈 상태를 표시한다.
- 펼친 친구가 친구 해제·차단되면 즉시 닫고 목록에서 제거한다.
- 전체 주간 시간표를 읽기 전용으로 표시하며 오늘·전체 toggle을 내부에 중복 제공하지 않는다.
- 친구 시간표에는 수정, 과목 상세 편집, 외부 공유 버튼을 제공하지 않는다.

PRIVATE:

- row는 목록에 남긴다.
- 비공개 badge를 표시한다.
- 펼치면 시간표를 공유하지 않았어요 안내만 보여준다.

BUSY_ONLY:

- 점유 block은 중립색으로 표시한다.
- 과목명, 교수명, 강의실, 학점은 표시하지 않는다.
- 공통 공강은 계산한다.
- 같이 듣는 수업은 표시하지 않는다.

DETAILS:

- 과목명과 허용 상세를 표시한다.
- 같은 courseId의 공식 강의를 같이 듣는 수업으로 표시한다.
- 직접 입력 수업은 같은 이름이어도 같이 듣는 수업으로 판단하지 않는다.

### 7.5 공통 공강

- 월~금 1~15교시의 양쪽 빈 구간을 계산한다.
- 야간 수업 펼침·접기는 표시 상태만 바꾸며 13~15교시 공강 계산에는 영향을 주지 않는다.
- 내 시간표와 친구 시간표가 모두 화면의 selectedSemester에 해당할 때만 계산한다.
- 시간이 있는 직접 입력 수업은 busy로 포함한다.
- 시간이 없는 온라인 수업은 제외한다.
- 펼친 시간표 아래에 요약 chip을 표시한다.
- chip을 누르면 당일·요일별 공통 공강 목록 sheet를 연다.
- 여러 친구를 동시에 비교하지 않는다.

### 7.6 목록 성능

- 친구 요약 목록과 시간표 상세 query를 분리한다.
- 모든 친구 시간표를 최초 진입 시 한꺼번에 요청하지 않는다.
- 한 번에 하나만 펼치고 accordion 내부 animation container 하나에만 motion을 적용한다.
- 친구 수가 많을 때는 처음 20명과 더보기 방식으로 확장할 수 있도록 UI model을 분리한다.
- 현재 ScrollView 안에 별도 세로 FlatList를 중첩하지 않는다.

---

## 8. 시간표 공유 설정

FriendSettings에서 다음을 제공한다. FriendHub 헤더 설정 아이콘과 시간표 친구 section 제목 우측의 `공유 설정`이 같은 화면으로 이동한다.

### 8.1 닉네임 검색 허용

- 화면 진입 시 `GET /v1/friends/me/privacy`로 서버의 현재 `nicknameSearchable`을 조회한다.
- 조회 완료 전에는 로컬 기본값을 추측하지 않고 toggle을 loading·disabled 상태로 표시한다.
- 사용자가 변경하면 `PATCH /v1/friends/me/privacy`의 필수 Boolean으로 전송하고 응답의 최종 `nicknameSearchable`을 화면 상태로 사용한다.
- 저장 실패 시 서버에서 마지막으로 확인한 값으로 원복하고 다시 시도 안내를 표시한다.

### 8.2 기본 공개 범위

- 비공개
- 바쁜 시간만
- 상세 시간표

기본값은 비공개다.

### 8.3 친구별 예외

- 친구 목록에서 각 친구의 effective scope를 표시한다.
- 기본값 사용 또는 PRIVATE, BUSY_ONLY, DETAILS override를 선택한다.
- override 제거 시 최신 기본값을 즉시 적용한다.
- 변경 전 각 공개 범위가 노출하는 필드를 설명한다.

### 8.4 재공유

- 자신의 시간표에만 기존 공유 버튼을 제공한다.
- 친구 시간표 projection에는 Share action을 연결하지 않는다.
- 화면 캡처까지 기술적으로 막는 정책은 적용하지 않는다.

---

## 9. 공통 친구 초대 sheet

### 9.1 재사용 범위

FriendInviteSheet는 다음 진입점에서 같은 컴포넌트를 사용한다.

- FriendDetail의 택시파티 초대
- 택시파티 ChatScreen 우측 상단 메뉴
- FriendDetail의 공개 채팅방 초대
- 공개 ChatDetailScreen 우측 상단 메뉴

`context`는 party 또는 publicChatRoom으로 전달한다. FriendDetail 진입은 선택적 `initialFriendPublicId`도 전달하고, 채팅방 메뉴 진입은 전달하지 않는다.

### 9.2 UI

~~~text
친구 초대
컴퓨터공학과 3호차 파티

[ 친구 이름 검색 ]

★ [사진] 김민수                 ✓
★ [사진] 박서연
  [사진] 이지훈                 ✓

초대할 수 없는 친구 3명

[ 2명 초대하기 ]
~~~

- BottomSheetModal 패턴을 재사용한다.
- 즐겨찾기 우선, 이후 가나다순이다.
- 여러 명 선택을 지원한다.
- 서버의 eligible 목록만 기본 목록에 표시한다.
- eligible 조회가 끝난 뒤 `initialFriendPublicId`가 목록에 있으면 해당 친구를 최초 한 번 자동 선택하고 행으로 스크롤·강조한다. 사용자는 다른 친구를 추가 선택하거나 초기 선택을 해제할 수 있다.
- `initialFriendPublicId`가 eligible 목록에 없으면 `지금은 이 친구를 초대할 수 없어요`라는 일반 안내만 표시하고 민감한 사유를 추측하지 않는다. sheet는 닫지 않고 다른 eligible 친구를 선택할 수 있게 유지한다.
- 이미 참여, 중복 초대, 차단, 자격 불충족 인원은 초대할 수 없는 친구 count로 안내한다.
- count를 누르면 개인정보를 노출하지 않는 범위에서 사유별 개수만 보여준다.
- footer 버튼은 선택 수를 포함하고 keyboard와 safe area를 고려해 고정한다.
- 요청 중 재탭을 막고 일부 실패 시 친구별 실패 사유를 표시한다.
- batch 응답은 요청 순서대로 SENT, ALREADY_PENDING, ALREADY_MEMBER, NOT_ELIGIBLE을 반환한다. `invitationId`는 SENT와 현재 사용자가 발송한 기존 ALREADY_PENDING에만 존재할 수 있으므로 nullable로 처리한다.
- SENT, ALREADY_PENDING, ALREADY_MEMBER, NOT_ELIGIBLE처럼 서버가 결과를 확정한 친구는 선택 상태에서 제거하고 eligible 목록을 다시 조회한다. 일부 성공이면 outcome별 결과를 함께 안내한다.
- timeout·연결 끊김처럼 서버 처리 여부를 알 수 없는 transport 오류에서만 해당 선택을 임시 유지한다. 재조회 결과 더 이상 eligible하지 않은 친구는 자동 해제하고, 계속 eligible한 친구만 사용자가 다시 시도할 수 있다.
- 차단·관계 상실처럼 민감한 사유는 NOT_ELIGIBLE로 통합해 구체적인 차단 상태를 표시하지 않는다.

### 9.3 택시 context

- OPEN 파티에서만 메뉴 item을 표시한다.
- 리더 여부와 관계없이 현재 참가자면 표시한다.
- sheet 상단에 남은 좌석과 좌석 미예약 안내를 표시한다.
- 남은 자리보다 많은 친구를 선택할 수 있다.
- 수신자가 먼저 수락해 정원에 들어가야 참여가 확정됨을 안내한다.

### 9.4 공개 채팅 context

- public이고 PARTY가 아닌 방에서만 메뉴 item을 표시한다.
- 현재 방 참여자만 초대할 수 있다.
- 학과방 자격 등은 서버 eligible 응답을 따른다.
- 초대가 7일 후 만료된다는 안내를 표시한다.

---

## 10. 알림과 이동

| 알림 타입 | foreground | background·종료 | 이동 목적지 |
| --- | --- | --- | --- |
| FRIEND_REQUEST | 앱 배너 + badge 갱신 | FCM | FriendHub 요청 탭 |
| FRIEND_ACCEPTED | 앱 배너 + 친구 목록 갱신 | FCM | FriendDetail(friendPublicId) |
| PARTY_INVITATION | 앱 배너 + badge 갱신 | FCM | FriendHub 초대 탭의 해당 카드 |
| CHAT_ROOM_INVITATION | 앱 배너 + badge 갱신 | FCM | FriendHub 초대 탭의 해당 카드 |

- 기존 notification payload parser와 router에 canonical type을 추가한다.
- 저장 알림은 API 응답이 parser에 바로 전달되지 않으므로 NotificationDataDto, NotificationData와 notificationMapper의 명시적 allowlist에도 friendPublicId, invitationType, invitationId를 함께 추가한다.
- API 응답에서 mapper를 거쳐 parseStoredNotificationPayload와 navigation intent까지 도달하는 통합 경계를 검증해 저장 인박스에서 식별자가 유실되지 않게 한다.
- FRIEND_ACCEPTED payload의 `friendPublicId`를 검증해 `{type: 'FRIEND_ACCEPTED', friendPublicId}` navigation intent로 변환한다.
- foreground banner, 저장된 알림 인박스, background·cold start가 모두 같은 intent와 FriendDetail route를 사용한다.
- FRIEND_ACCEPTED에 friendPublicId가 없거나 유효하지 않으면 FriendHub 친구 탭으로 안전 fallback한다.
- 초대 payload의 `invitationType`과 `invitationId`를 검증해 FriendHub target params로 변환한다.
- FriendHub는 target 카드 로딩 후 스크롤·강조하고, 이미 처리·만료되어 찾을 수 없으면 상태 안내 후 초대 목록을 유지한다.
- unknown type은 기존 안전 fallback을 유지한다.
- 거절, 취소, 친구 끊기, 차단은 푸시하지 않는다.
- `friendAndInvitationNotifications` 단일 toggle을 NotificationSettingsScreen에 추가하고 신규·기존 회원의 유효 기본값은 true로 표시한다.
- 유효 수신 조건은 `allNotifications && friendAndInvitationNotifications`이며 partyNotifications는 최초 파티 초대를 제어하지 않는다.
- toggle off면 일반 알림 인박스·알림 SSE·FCM은 받지 않지만 FriendHub PENDING 상태와 badge는 API에서 계속 조회한다.

---

## 11. 차단과 친구 끊기 UX

친구 끊기 확인:

~~~text
김민수님과 친구를 끊을까요?
서로의 친구 목록과 공유 시간표를 더 이상 볼 수 없습니다.

[취소] [친구 끊기]
~~~

차단 확인:

~~~text
김민수님을 차단할까요?
친구 관계와 처리 중인 요청·초대가 해제됩니다.
공개 게시판과 공개 채팅의 기존 콘텐츠는 계속 보일 수 있습니다.

[취소] [차단]
~~~

- 성공 후 FriendHub로 돌아간다.
- 이미 다른 기기에서 관계가 해제된 경우 멱등 성공처럼 최신 상태로 이동한다.
- 차단 목록과 차단 해제는 FriendSettings에서 제공한다.
- 차단 해제는 친구 관계를 복원하지 않는다는 문구를 표시한다.

---

## 12. 컴포넌트 재사용 계획

### 12.1 그대로 사용할 우선 대상

- StackHeader
- SegmentedControl
- StateCard
- ToneBadge
- DefaultProfileAvatar
- PopupMenu
- SettingsRow와 SettingsSection
- 공통 BottomSheetModal 패턴
- COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY
- design-system motion과 ReduceMotion.System

### 12.2 friend feature 내부 신규 컴포넌트

- FriendAddActionSheet
- MyFriendCodePanel
- FriendTabBar 또는 기존 SegmentedControl wrapper
- FriendRow
- FriendFavoriteButton
- FriendRequestCard
- FriendInvitationCard
- FriendInviteSheet
- FriendSearchResultCard
- FriendTimetableSection
- FriendTimetableAccordionItem
- FriendTimetablePrivacyBadge
- FriendMinecraftSummary

### 12.3 shared 승격 조건

- AnimatedDisclosureChevron: friend·Minecraft·문의 등 세 화면에서 동일 접근성·motion을 사용할 때
- SelectablePersonRow: 친구 초대 외 다른 사람 선택 기능이 실제로 생길 때
- ExpandableCard: 도메인별 표현이 아니라 완전히 동일한 disclosure 계약이 확인될 때

공통화를 이유로 기존 화면을 광범위하게 리팩터링하지 않는다.

---

## 13. 예정 feature 구조

~~~text
src/features/friend/
├── application/
├── components/
├── data/
│   ├── api/
│   ├── dto/
│   ├── mappers/
│   └── repositories/
├── hooks/
├── model/
├── screens/
├── services/
└── index.ts
~~~

예상 화면:

- FriendHubScreen
- FriendAddScreen
- FriendDetailScreen
- FriendSettingsScreen

영향을 받는 기존 영역:

- src/app/navigation/types.ts
- src/app/navigation/navigators/CampusStackNavigator.tsx
- src/app/notifications
- src/app/navigation/services
- src/features/user의 마이페이지·알림·알림 설정
- src/features/timetable
- src/features/taxi
- src/features/chat
- src/features/minecraft
- src/di
- android와 ios의 QR 카메라 설정

실제 파일명은 구현 시작 시 현재 구조를 다시 확인한 뒤 확정한다.

---

## 14. Repository와 화면 데이터 흐름

~~~text
Screen
  ↓
Hook / Application assembler
  ↓
Friend service
  ↓
IFriendRepository
  ↓
SpringFriendRepository
  ↓
API client / DTO / Mapper
~~~

- Screen은 DTO를 직접 해석하지 않는다.
- API enum을 화면 문자열로 직접 노출하지 않는다.
- PRIVATE, BUSY_ONLY, DETAILS는 mapper에서 view data로 변환한다.
- 초대 가능 여부는 클라이언트가 추측하지 않고 eligible API를 사용한다.
- 서버 오류코드는 사용자 행동 가능한 메시지로 매핑한다.

---

## 15. 구현 PR 분리 계획

관계 Core 모바일은 사용자 구현 승인을 받아 이 브랜치에서 시작한다. 이후 각 PR은 대응 백엔드 API·도메인 협력 준비와 별도 사용자 승인을 전제로 한다.

### PR 1: 친구 핵심 모바일

- navigation
- FriendHub 친구·요청 두 탭
- 친구 코드·닉네임 요청
- 내 친구 코드 action sheet와 cursor 검색
- 즐겨찾기, 요청 수락·거절·취소
- 친구 상세, 끊기, 차단
- badge

초대 탭·초대 badge, 친구 신고, 시간표·Minecraft projection, 알림 이동, QR은 포함하지 않는다. 서버의 `partyInvitationCount`와 `chatRoomInvitationCount`는 관계 Core에서 0이지만, 이를 근거로 미구현 초대 UI를 미리 노출하지 않는다.

### PR 2: QR

- QR 생성
- 인앱 scanner
- 네이티브 권한·설명
- 실제 기기 검증

네이티브 의존성 변경과 친구 핵심 UI를 한 커밋에 섞지 않는다.

### PR 3: 시간표 공유

- 상단 anchor
- 하단 accordion
- share scope
- 공통 공강과 같이 듣는 수업
- 친구별 공유 설정

### PR 4: Minecraft 친구 계정

- 친구용 account mapper
- 목록 요약
- 상세 SELF·FRIEND 계층

### PR 5: 택시파티 초대

- TaxiChatHeaderMenu
- 공통 FriendInviteSheet party context
- 알림·수락 flow

### PR 6: 공개방 초대

- ChatPopupMenu
- FriendInviteSheet publicChat context
- 알림·수락 flow

기능·테스트·문서·의존성 변경은 리뷰 가능한 작은 Conventional Commit으로 분리한다.

---

## 16. 검증 계획

### 16.1 자동 검증

- repository DTO mapper
- 닉네임 검색 cursor 이어붙이기, 검색어 변경 초기화와 안정 정렬
- 친구 정렬: 즐겨찾기, 한글, 같은 닉네임 tie-breaker
- 요청 상태별 버튼과 중복 탭 방지
- 요청 탭의 PENDING 전용 20건 opaque cursor, createdAt DESC·requestId DESC 이어붙이기와 terminal mutation 후 제거
- 받은 PENDING 요청·초대만의 badge count와 보낸 요청 제외
- notification payload parsing과 navigation intent
- API 저장 알림 응답 → NotificationDataDto·mapper → stored parser → navigation intent 통합 경계에서 FRIEND_ACCEPTED의 friendPublicId와 두 초대 타입의 invitationType·invitationId 보존
- FRIEND_ACCEPTED friendPublicId route와 누락 payload fallback
- 초대 notification target 카드 scroll·강조와 처리 완료 fallback
- 시간표 PRIVATE·BUSY_ONLY·DETAILS 필드 미노출
- 선택 학기별 친구 시간표 query key와 과거 학기 빈 상태
- targetFriendPublicId의 친구 section scroll·단일 소비·대상 없음 fallback
- 공통 공강 1~15교시 계산과 야간 section 접힘 상태 독립성
- 공식 courseId 기준 같이 듣는 수업
- accordion 단일 open과 favorite hit target 분리
- party·public chat context별 menu 표시
- FriendInviteSheet initialFriendPublicId 자동 선택·스크롤, 대상 부적격 일반 안내와 채팅 메뉴 무초기값 진입
- FriendInviteSheet 수신자별 SENT·ALREADY_PENDING·ALREADY_MEMBER·NOT_ELIGIBLE 부분 성공, outcome별 nullable invitationId와 확정 결과 선택 해제
- FriendInviteSheet transport 오류 선택 유지와 eligible 재조회 후 자동 해제
- FriendSettings privacy GET loading·disabled 상태, PATCH 최종값 반영과 실패 원복
- 내 친구 코드 action sheet의 표시·복사·공유·재발급 확인과 FriendAdd 이동
- friendPublicId 기반 친구 신고 접수와 신고 후 관계 유지
- Minecraft SELF·FRIEND grouping
- 차단·친구 해제 후 화면 이탈
- accessibility label과 expanded state

실행 기준:

- npm test의 관련 focused suite
- npx tsc --noEmit
- npm run lint
- git diff --check
- iOS·Android native 설정 정적 검사

### 16.2 실제 기기 QA

최소 세 회원과 두 실제 기기를 사용한다.

- 코드 입력, QR 표시, QR 스캔
- FriendHub `+`에서 내 코드 확인·복사·공유·재발급과 친구 추가 진입
- 카메라 권한 허용·거절·설정 복귀
- 요청, 수락, 거절, 즉시 재요청, 30일 만료 fixture
- 즐겨찾기 정렬과 여러 화면의 정렬 일치
- PRIVATE, BUSY_ONLY, DETAILS
- 13~15교시 수업을 포함한 공통 공강
- 상단 친구 시간표 버튼의 정확한 scroll 위치
- 긴 친구 목록과 accordion 전환
- 큰 글씨와 좁은 화면 toolbar
- VoiceOver·TalkBack의 expanded·favorite label
- 택시 마지막 좌석 동시 수락
- 참가자와 리더 각각의 택시 초대
- 공개방 유형별 초대와 7일 만료
- FriendDetail에서 택시·공개방 초대 시 대상 친구 자동 선택과 부적격 일반 안내
- 일부 확정 outcome 선택 해제, timeout 후 eligible 재조회와 선택 정리
- foreground, background, 종료 상태 알림 이동
- 네트워크 실패, 재연결, 다른 기기에서 관계 변경

Debug·Metro 체감과 Release 성능을 구분한다. 실제 기기 QA를 수행하지 않았다면 자동 검증과 명확히 분리해 PR에 기록한다.

---

## 17. 배포 순서와 호환성

1. 백엔드 additive API 배포
2. 기존 ACTIVE 회원 FriendProfile provisioning 누락 0건, ACTIVE 코드 registry 연결과 API·알림 payload 호환 확인
3. 모바일 배포
4. 실제 사용자 노출 확인

- 구버전 모바일이 신규 알림 타입을 안전하게 무시하는지 확인한다.
- 백엔드가 배포되지 않은 상태에서 새 친구 진입점을 노출하지 않는다.
- 별도 feature flag를 도입하지 않는다면 백엔드 배포 완료 후 모바일 릴리스 순서를 지킨다.
- 기존 시간표, 택시 채팅, 공개 채팅, Minecraft 화면 회귀 검증을 포함한다.

---

## 18. TODO

이번 구현에서 제외:

- URL 딥링크 친구 추가
- 1:1 친구 채팅
- 비공개 친구 그룹 채팅
- 여러 친구 공통 공강
- 공강 기반 밥·스터디 제안
- Minecraft FRIEND 계정 소유권 이전
- 친구 그룹·카테고리
- 같은 수업·학과 추천
- 연락처 추천
- 상호 친구 이름·목록
- 온라인·최근 활동 상태
- 자동 추천과 추천 알림
- 친구 요청의 거절·취소·만료 이력 조회
- 공개 콘텐츠 전역 차단 필터
- 관리자 친구 관계망 관리

딥링크 후속 작업 시 현재 skuri custom scheme의 native 등록만 믿지 않고 NavigationContainer linking, cold start, universal/app link 도메인, QR 이전 버전 호환을 별도 설계한다.

---

## 19. 구현 중지선

이 PR에서 허용되는 변경:

- 관계 Core를 위한 `src/features/friend` 데이터·모델·화면·컴포넌트·hook
- 관계 Core navigation, DI, 마이페이지 친구 진입점·badge, 관련 테스트
- 이 구현 계획 문서

이 PR에서 허용되지 않는 변경:

- package.json과 lockfile, Android·iOS QR 카메라 설정
- 초대·시간표 공유·Minecraft projection·친구 신고·알림 이동을 위한 런타임 코드
- 기존 택시·공개방 메뉴 및 시간표·Minecraft 화면의 기능 변경

관계 Core 구현 중 새로운 정책이나 기존 공통 UI로 표현하기 어려운 UI 선택이 발견되면 작업을 멈추고 사용자 승인을 받는다.

---

## 20. 문서 검토 체크리스트

- [x] 백엔드 기준 문서와 V1 정책이 일치한다.
- [x] URL 딥링크와 1:1·비공개 채팅이 V1에서 제외되어 있다.
- [x] TaxiParty는 모든 참가자가 초대 가능하다.
- [x] 공개방만 채팅 초대를 지원한다.
- [x] Minecraft SELF와 모든 FRIEND 계정 계층이 포함되어 있다.
- [x] 시간표 anchor, 화면 하단 accordion, 즐겨찾기 정렬이 명시되어 있다.
- [x] PRIVATE, BUSY_ONLY, DETAILS와 재공유 금지가 명시되어 있다.
- [x] 공통 공강과 같이 듣는 수업 규칙이 명시되어 있다.
- [x] QR native dependency가 구현 전 확인 항목으로 분리되어 있다.
- [x] 기존 디자인 시스템과 feature-first 공통화 원칙이 명시되어 있다.
- [x] 자동 검증과 실제 기기 QA가 구분되어 있다.
- [x] Firebase UID 대신 friendPublicId를 사용하는 경계가 명시되어 있다.
- [x] FRIEND_ACCEPTED와 TimetableDetail target이 friendPublicId로 연결되어 있다.
- [x] badge가 받은 PENDING 요청·초대만 계산하고 보낸 요청을 제외한다.
- [x] FriendHub `+`에서 내 코드·QR과 친구 추가에 모두 도달할 수 있다.
- [x] 닉네임 검색은 페이지당 20건의 cursor 계약과 안정 정렬을 사용한다.
- [x] 공통 공강은 야간 수업을 포함한 1~15교시를 계산한다.
- [x] 저장 알림의 DTO·model·mapper 경계와 친구 신고 공개 식별자 흐름이 명시되어 있다.
- [x] FriendDetail 초대의 initialFriendPublicId와 부적격 fallback이 명시되어 있다.
- [x] 확정 batch outcome과 transport 오류의 선택 유지 정책이 구분되어 있다.
- [x] nicknameSearchable은 서버 GET 완료 후 표시하고 PATCH 최종값을 사용한다.
- [x] 요청 목록은 PENDING 전용 20건 opaque cursor 계약을 사용한다.
- [x] 실제 코드 구현 승인 gate가 명시되어 있다.

---

## 21. 결정 기록

| 날짜 | 결정 |
| --- | --- |
| 2026-08-18 | FriendHub 주 진입점은 마이페이지로 확정 |
| 2026-08-18 | 친구 시간표는 상단 보조 anchor와 화면 최하단 단일-open accordion으로 확정 |
| 2026-08-18 | 시간표 친구 목록에서도 즐겨찾기를 변경하며 모든 친구를 표시 |
| 2026-08-18 | 친구 목록은 Minecraft 요약, 친구 상세는 SELF·FRIEND 전체 계층 표시 |
| 2026-08-18 | 택시·공개방은 같은 FriendInviteSheet UX를 재사용 |
| 2026-08-18 | QR은 URL 딥링크 없이 versioned friend code payload와 인앱 scanner 사용 |
| 2026-08-18 | 친구 기능 외부 공개 식별자 field는 friendPublicId로 통일 |
| 2026-08-18 | FriendHub `+`는 내 친구 코드와 친구 추가를 고르는 action sheet를 열고 내 코드는 같은 sheet에서 관리 |
| 2026-08-18 | 닉네임 검색 20건은 전체 상한이 아니라 cursor 페이지 크기이며 닉네임·friendPublicId 순으로 안정 정렬 |
| 2026-08-18 | 공통 공강은 야간 수업을 포함한 월~금 1~15교시로 확정 |
| 2026-08-18 | 다중 초대는 수신자별 부분 성공 결과를 사용하고 차단 등 민감 사유는 NOT_ELIGIBLE로 통합 |
| 2026-08-18 | 친구 신고는 friendPublicId 전용 경로로 기존 신고 처리에 위임하고 저장 알림 식별자는 DTO·mapper 경계를 통과 |
| 2026-08-18 | FriendDetail의 친구 시간표 보기는 targetFriendPublicId로 해당 accordion을 한 번 자동 전개 |
| 2026-08-18 | action badge는 받은 PENDING 요청·초대만 합산하고 보낸 요청은 제외 |
| 2026-08-18 | FriendDetail 초대는 initialFriendPublicId를 자동 선택하고 부적격이면 민감 사유 없는 일반 안내를 표시 |
| 2026-08-18 | 확정된 batch outcome은 선택을 해제하며 transport 오류에서만 eligible 재조회 전까지 선택을 유지 |
| 2026-08-18 | FriendSettings는 서버의 nicknameSearchable 조회 완료 전 toggle 값을 추측하지 않음 |
| 2026-08-18 | 친구 요청 탭은 PENDING 전용 20건 opaque cursor 목록이며 terminal 이력은 후속 TODO |
| 2026-08-18 | 실제 코드 구현은 별도 승인 전까지 중지 |
