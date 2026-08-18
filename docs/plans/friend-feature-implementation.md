# SKURI 친구 기능 모바일 구현 계획

> 문서 상태: UX 및 구현 계획 승인 완료, 실제 코드 미구현
> 기준일: 2026-08-18
> 정책 기준: SKURI-Backend docs/features/friends.md
> 구현 게이트: 문서 검토가 끝난 뒤 사용자의 별도 코드 구현 승인을 받아야 한다.

백엔드 기준 문서:

- GitHub: https://github.com/skuri-kr/SKURI-Backend/blob/main/docs/features/friends.md
- 로컬 작업 경로: /Users/jisung/skuri-backend/docs/features/friends.md

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

### 3.2 보조 진입점

- 시간표 상세 상단의 친구 시간표 버튼
- 친구 시간표 section의 친구 행
- 친구 상세의 택시파티 초대·공개 채팅방 초대
- 택시파티 채팅방 우측 상단 메뉴
- 공개 채팅방 우측 상단 메뉴
- FRIEND_REQUEST, FRIEND_ACCEPTED, PARTY_INVITATION, CHAT_ROOM_INVITATION 알림

### 3.3 예정 navigation

CampusStackParamList에 다음 화면을 추가할 계획이다.

| Route | Params | 설명 |
| --- | --- | --- |
| FriendHub | initialTab optional | 친구, 요청, 초대 허브 |
| FriendAdd | initialMethod optional | 코드, QR, 닉네임 추가 |
| FriendDetail | friendPublicId | 친구 상세 |
| FriendSettings | 없음 | 검색 허용과 시간표 기본 공유 |

알림 payload는 app/notifications에서 파싱하고 app/navigation/services에서 목적지를 결정한다. feature가 root navigation state를 직접 해석하지 않는다.

---

## 4. FriendHub 화면

### 4.1 전체 구조

~~~text
┌──────────────────────────────┐
│ ‹  친구                  ＋   │
│                              │
│ [ 친구 12 ] [ 요청 2 ] [ 초대 1 ] │
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

빈 상태:

- 제목: 아직 친구가 없어요
- 설명: 친구 코드, QR 또는 닉네임으로 친구를 추가해보세요.
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

거절 동작:

- 확인 팝업 없이 한 번의 명시적 버튼으로 처리한다.
- 상대에게 거절 푸시는 보내지 않는다.
- 처리 후 요청 목록에서 완료 상태를 짧게 보여준 뒤 제거 또는 완료 section으로 이동한다.

### 4.4 초대 탭

- 택시파티 초대와 공개방 초대를 시간순으로 한 목록에 표시한다.
- 각 카드에 초대한 친구, 대상 이름, 만료 또는 파티 상태를 보여준다.
- 수락과 거절 버튼을 제공한다.
- 택시 초대에는 좌석을 예약하지 않는다는 안내를 표시한다.
- 수락 실패 시 최신 서버 상태에 맞춰 정원 마감, 파티 종료, 입장 자격 변경을 구체적으로 안내한다.

### 4.5 badge

- FriendHub 탭 badge: 요청 PENDING 수와 초대 PENDING 수를 각각 표시한다.
- 마이페이지 친구 행: 두 수의 합계를 표시한다.
- 알림 인박스 unread badge와 친구 PENDING badge는 다른 의미이므로 합치지 않는다.
- 소셜 알림 수신 시 관련 query를 무효화해 화면 진입 전 badge를 갱신한다.

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

- 내 코드는 FriendHub 추가 메뉴에서 표시·복사·QR 공유할 수 있다.
- 입력은 대소문자와 하이픈 유무를 허용하고 정규화한다.
- 인식 실패, 만료된 코드, 자기 코드, 차단 관계를 별도 메시지로 구분한다.
- 코드 재발급은 기존 코드가 즉시 무효화됨을 확인 팝업으로 안내한다.

### 5.3 QR

- payload는 skuri-friend:v1:{friendCode}만 인식한다.
- 스캔 성공 후 카메라를 닫고 대상 프로필 확인 카드로 이동한다.
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
- 최대 20명을 표시한다.
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
│ 친구 끊기                     │
│ 차단                          │
└──────────────────────────────┘
~~~

### 6.2 동작

- 즐겨찾기 변경은 낙관적 UI 후 실패 시 원복한다.
- 현재 사용자가 OPEN 택시파티에 참여 중일 때만 택시파티 초대 버튼을 표시한다.
- 사용자가 참여 중인 초대 가능한 공개방이 있을 때만 공개방 초대 버튼을 표시한다.
- 여러 공개방이 있으면 방 선택 sheet를 먼저 연다.
- 친구 시간표 보기는 TimetableDetail의 해당 친구 section으로 이동하거나 펼침 대상 friendPublicId를 전달한다.
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
친구 시간표                         12명

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
- 펼칠 때 해당 친구의 현재 학기 시간표를 지연 조회한다.
- 이미 조회한 데이터는 query cache를 사용하되 pull-to-refresh 시 갱신한다.
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

- 월~금 1~12교시의 양쪽 빈 구간을 계산한다.
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

FriendSettings 또는 시간표 설정 진입점에서 다음을 제공한다.

### 8.1 기본 공개 범위

- 비공개
- 바쁜 시간만
- 상세 시간표

기본값은 비공개다.

### 8.2 친구별 예외

- 친구 목록에서 각 친구의 effective scope를 표시한다.
- 기본값 사용 또는 PRIVATE, BUSY_ONLY, DETAILS override를 선택한다.
- override 제거 시 최신 기본값을 즉시 적용한다.
- 변경 전 각 공개 범위가 노출하는 필드를 설명한다.

### 8.3 재공유

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

context만 party 또는 publicChatRoom으로 전달한다.

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
- 이미 참여, 중복 초대, 차단, 자격 불충족 인원은 초대할 수 없는 친구 count로 안내한다.
- count를 누르면 개인정보를 노출하지 않는 범위에서 사유별 개수만 보여준다.
- footer 버튼은 선택 수를 포함하고 keyboard와 safe area를 고려해 고정한다.
- 요청 중 재탭을 막고 일부 실패 시 친구별 실패 사유를 표시한다.

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
| FRIEND_ACCEPTED | 앱 배너 + 친구 목록 갱신 | FCM | FriendDetail |
| PARTY_INVITATION | 앱 배너 + badge 갱신 | FCM | FriendHub 초대 탭의 해당 카드 |
| CHAT_ROOM_INVITATION | 앱 배너 + badge 갱신 | FCM | FriendHub 초대 탭의 해당 카드 |

- 기존 notification payload parser와 router에 canonical type을 추가한다.
- unknown type은 기존 안전 fallback을 유지한다.
- 거절, 취소, 친구 끊기, 차단은 푸시하지 않는다.
- 친구 및 초대 알림 toggle을 NotificationSettingsScreen에 추가한다.
- toggle off여도 FriendHub PENDING 상태는 API에서 조회할 수 있다.

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

문서 PR 이후에도 실제 코드 구현 승인이 있어야 시작한다.

### PR 1: 친구 핵심 모바일

- navigation
- FriendHub
- 친구 코드·닉네임 요청
- 즐겨찾기, 요청 수락·거절·취소
- 친구 상세, 끊기, 차단
- badge

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
- 친구 정렬: 즐겨찾기, 한글, 같은 닉네임 tie-breaker
- 요청 상태별 버튼과 중복 탭 방지
- badge count
- notification payload parsing과 navigation intent
- 시간표 PRIVATE·BUSY_ONLY·DETAILS 필드 미노출
- 공통 공강 계산 경계
- 공식 courseId 기준 같이 듣는 수업
- accordion 단일 open과 favorite hit target 분리
- party·public chat context별 menu 표시
- FriendInviteSheet 일부 성공·실패
- Minecraft SELF·FRIEND grouping
- 차단·친구 해제 후 화면 이탈
- accessibility label과 expanded state

실행 기준:

- npm test의 관련 focused suite
- npm run typecheck
- npm run lint
- git diff --check
- iOS·Android native 설정 정적 검사

### 16.2 실제 기기 QA

최소 세 회원과 두 실제 기기를 사용한다.

- 코드 입력, QR 표시, QR 스캔
- 카메라 권한 허용·거절·설정 복귀
- 요청, 수락, 거절, 즉시 재요청, 30일 만료 fixture
- 즐겨찾기 정렬과 여러 화면의 정렬 일치
- PRIVATE, BUSY_ONLY, DETAILS
- 상단 친구 시간표 버튼의 정확한 scroll 위치
- 긴 친구 목록과 accordion 전환
- 큰 글씨와 좁은 화면 toolbar
- VoiceOver·TalkBack의 expanded·favorite label
- 택시 마지막 좌석 동시 수락
- 참가자와 리더 각각의 택시 초대
- 공개방 유형별 초대와 7일 만료
- foreground, background, 종료 상태 알림 이동
- 네트워크 실패, 재연결, 다른 기기에서 관계 변경

Debug·Metro 체감과 Release 성능을 구분한다. 실제 기기 QA를 수행하지 않았다면 자동 검증과 명확히 분리해 PR에 기록한다.

---

## 17. 배포 순서와 호환성

1. 백엔드 additive API 배포
2. API·알림 payload 호환 확인
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
- 공개 콘텐츠 전역 차단 필터
- 관리자 친구 관계망 관리

딥링크 후속 작업 시 현재 skuri custom scheme의 native 등록만 믿지 않고 NavigationContainer linking, cold start, universal/app link 도메인, QR 이전 버전 호환을 별도 설계한다.

---

## 19. 구현 중지선

이 PR에서 허용되는 변경:

- 이 구현 계획 문서

이 PR에서 허용되지 않는 변경:

- src 아래 런타임 코드
- package.json과 lockfile
- Android·iOS 설정
- API client, DTO, navigation
- 테스트 코드

실제 구현은 사용자의 별도 명시적 승인 전까지 시작하지 않는다.

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
| 2026-08-18 | 실제 코드 구현은 별도 승인 전까지 중지 |
