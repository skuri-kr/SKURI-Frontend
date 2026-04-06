# Spring 백엔드 ERD (Entity Relationship Diagram)

> 최종 수정일: 2026-03-30
> 관련 문서: [도메인 분석](./domain-analysis.md) | [Member 탈퇴 정책](./member-withdrawal-policy.md)

---

## 목차

1. [전체 ERD 다이어그램](#1-전체-erd-다이어그램)
2. [도메인별 테이블 상세](#2-도메인별-테이블-상세)
3. [테이블 관계 요약](#3-테이블-관계-요약)
4. [인덱스 설계](#4-인덱스-설계)

---

## 1. 전체 ERD 다이어그램

### 1.1 Core 도메인 (Member, TaxiParty, Chat)

```mermaid
erDiagram
    %% ===== MEMBER 도메인 =====
    members {
        varchar(36) id PK "UUID or Firebase UID"
        varchar(255) email UK "NOT NULL"
        varchar(50) nickname
        varchar(20) student_id
        varchar(50) department
        varchar(500) photo_url "nullable, 가입 시 null"
        varchar(50) realname
        boolean is_admin "DEFAULT false"
        enum status "ACTIVE,WITHDRAWN"
        varchar(20) bank_name
        varchar(30) account_number
        varchar(50) account_holder
        boolean hide_name "DEFAULT false"
        boolean all_notifications "DEFAULT true"
        boolean party_notifications "DEFAULT true"
        boolean notice_notifications "DEFAULT true"
        boolean board_like_notifications "DEFAULT true"
        boolean comment_notifications "DEFAULT true"
        boolean bookmarked_post_comment_notifications "DEFAULT true"
        boolean system_notifications "DEFAULT true"
        boolean academic_schedule_notifications "DEFAULT true"
        boolean academic_schedule_day_before_enabled "DEFAULT true"
        boolean academic_schedule_all_events_enabled "DEFAULT false"
        json notice_notifications_detail
        datetime joined_at
        datetime last_login
        datetime withdrawn_at
        datetime created_at
        datetime updated_at
    }

    linked_accounts {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) member_id FK
        varchar(20) provider "GOOGLE/PASSWORD/UNKNOWN"
        varchar(255) provider_id
        varchar(255) email
        varchar(50) provider_display_name
        varchar(500) photo_url
        datetime created_at
        datetime updated_at
    }

    members ||--o{ linked_accounts : "has"

    %% ===== TAXI PARTY 도메인 =====
    parties {
        varchar(36) id PK "UUID"
        varchar(36) leader_id FK "NOT NULL"
        varchar(100) departure_name "NOT NULL"
        decimal departure_lat "precision 10,7"
        decimal departure_lng "precision 10,7"
        varchar(100) destination_name "NOT NULL"
        decimal destination_lat "precision 10,7"
        decimal destination_lng "precision 10,7"
        datetime departure_time "NOT NULL"
        int max_members "DEFAULT 4"
        int current_members "DEFAULT 0"
        varchar(500) detail
        enum status "OPEN,CLOSED,ARRIVED,ENDED"
        enum end_reason "ARRIVED,FORCE_ENDED,CANCELLED,TIMEOUT,WITHDRAWED"
        datetime ended_at
        enum settlement_status "PENDING,COMPLETED"
        int taxi_fare
        int per_person_amount
        varchar(20) settlement_bank_name
        varchar(30) settlement_account_number
        varchar(50) settlement_account_holder
        boolean settlement_hide_name
        bigint version "Optimistic Lock"
        datetime created_at
        datetime updated_at
    }

    party_members {
        varchar(36) party_id PK,FK
        varchar(36) member_id PK,FK
        datetime joined_at
    }

    party_tags {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) party_id FK
        varchar(50) tag
    }

    member_settlements {
        varchar(36) party_id PK,FK
        varchar(36) member_id PK,FK
        boolean settled "DEFAULT false"
        datetime settled_at
        varchar(50) display_name
        boolean left_party "DEFAULT false"
        datetime left_at
    }

    join_requests {
        varchar(36) id PK "UUID"
        varchar(36) party_id FK "NOT NULL"
        varchar(36) leader_id FK "NOT NULL"
        varchar(36) requester_id FK "NOT NULL"
        enum status "PENDING,ACCEPTED,DECLINED,CANCELED"
        datetime created_at
        datetime updated_at
    }

    parties ||--o{ party_members : "has"
    parties ||--o{ party_tags : "has"
    parties ||--o{ member_settlements : "has"
    parties ||--o{ join_requests : "receives"
    members ||--o{ party_members : "joins"
    members ||--o{ join_requests : "sends"

    %% ===== CHAT 도메인 =====
    chat_rooms {
        varchar(100) id PK "UUID or party:partyId"
        varchar(100) name
        enum type "UNIVERSITY,DEPARTMENT,GAME,CUSTOM,PARTY"
        varchar(50) department
        varchar(500) description
        varchar(36) created_by FK
        boolean is_public "DEFAULT true"
        int max_members
        int member_count "DEFAULT 0"
        int message_count "DEFAULT 0"
        varchar(500) last_message_text
        varchar(36) last_message_sender_id "member id or synthetic mc sender key"
        varchar(50) last_message_sender_name
        enum last_message_type "TEXT,IMAGE,SYSTEM,ACCOUNT,ARRIVED,END"
        datetime last_message_timestamp
        datetime created_at
        datetime updated_at
    }

    chat_room_members {
        varchar(100) chat_room_id PK,FK
        varchar(36) member_id PK,FK
        datetime last_read_at
        boolean muted "DEFAULT false"
        datetime joined_at
    }

    chat_messages {
        varchar(36) id PK "UUID"
        varchar(100) chat_room_id FK "NOT NULL"
        varchar(36) sender_id "NOT NULL, member id or synthetic mc sender key"
        varchar(50) sender_name
        text text
        enum type "TEXT,IMAGE,SYSTEM,ACCOUNT,ARRIVED,END"
        json account_data "nullable, 파티 채팅용"
        json arrival_data "nullable, 파티 채팅용"
        enum direction "MC_TO_APP,APP_TO_MC,SYSTEM"
        varchar(20) source "minecraft,app"
        varchar(50) minecraft_uuid
        varchar(36) source_event_id UK "nullable, MC inbound dedupe key"
        datetime created_at
    }

    chat_rooms ||--o{ chat_room_members : "has"
    chat_rooms ||--o{ chat_messages : "contains"
    members ||--o{ chat_room_members : "joins"
    members ||--o{ chat_messages : "sends"

    %% ===== MINECRAFT 도메인 =====
    minecraft_accounts {
        varchar(36) id PK "UUID"
        varchar(36) owner_member_id FK "NOT NULL"
        varchar(36) parent_account_id FK "nullable"
        enum account_role "SELF,FRIEND"
        enum edition "JAVA,BEDROCK"
        varchar(50) game_name "NOT NULL"
        varchar(100) normalized_key UK "uuid or be:{normalized_name}"
        varchar(32) avatar_uuid "NOT NULL"
        datetime last_seen_at
        datetime created_at
        datetime updated_at
    }

    minecraft_server_state {
        varchar(20) server_key PK "skuri"
        boolean online
        int current_players
        int max_players
        varchar(50) version
        varchar(255) server_address
        varchar(500) map_url
        datetime last_heartbeat_at
        datetime updated_at
    }

    minecraft_online_players {
        bigint id PK "AUTO_INCREMENT"
        varchar(20) server_key FK "NOT NULL"
        varchar(100) normalized_key "NOT NULL"
        enum edition "JAVA,BEDROCK"
        varchar(50) player_name "NOT NULL"
        varchar(32) avatar_uuid "NOT NULL"
        varchar(36) minecraft_account_id FK "nullable"
        boolean verified "DEFAULT false"
        datetime joined_at
        datetime updated_at
    }

    minecraft_bridge_events {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) event_id UK "SSE replay id"
        varchar(50) event_type
        json payload
        datetime expires_at
        datetime created_at
    }

    minecraft_inbound_events {
        varchar(36) event_id PK "플러그인 inbound event id"
        varchar(36) chat_message_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    members ||--o{ minecraft_accounts : "owns"
    minecraft_accounts ||--o{ minecraft_accounts : "parent-child"
    minecraft_accounts ||--o{ minecraft_online_players : "matches"
    minecraft_server_state ||--o{ minecraft_online_players : "contains"
    minecraft_inbound_events ||--o| chat_messages : "maps"
```

### 1.2 Supporting 도메인 (Board, Notice, Campus)

```mermaid
erDiagram
    %% ===== BOARD 도메인 =====
    posts {
        varchar(36) id PK "UUID"
        varchar(200) title "NOT NULL"
        text content "NOT NULL"
        varchar(36) author_id FK "NOT NULL"
        varchar(50) author_name
        varchar(500) author_profile_image
        boolean is_anonymous "DEFAULT false"
        varchar(36) anon_id "익명 식별자"
        enum category "GENERAL,QUESTION,REVIEW,ANNOUNCEMENT"
        int view_count "DEFAULT 0"
        int like_count "DEFAULT 0"
        int comment_count "DEFAULT 0"
        int bookmark_count "DEFAULT 0"
        boolean is_pinned "DEFAULT false"
        boolean is_hidden "DEFAULT false"
        boolean is_deleted "DEFAULT false"
        datetime last_comment_at
        datetime created_at
        datetime updated_at
    }

    post_images {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) post_id FK
        varchar(500) url "NOT NULL"
        varchar(500) thumb_url
        int width
        int height
        int size
        varchar(50) mime
        int sort_order
    }

    comments {
        varchar(36) id PK "UUID"
        varchar(36) post_id FK "NOT NULL"
        text content "NOT NULL"
        varchar(36) author_id FK "NOT NULL"
        varchar(50) author_name
        varchar(500) author_profile_image
        boolean is_anonymous "DEFAULT false"
        varchar(36) anon_id
        int anonymous_order "익명1, 익명2..."
        varchar(36) parent_id FK "무제한 self-reference"
        int like_count "DEFAULT 0"
        boolean is_hidden "DEFAULT false"
        boolean is_deleted "DEFAULT false"
        datetime created_at
        datetime updated_at
    }

    comment_likes {
        varchar(36) user_id PK "회원 ID"
        varchar(36) comment_id PK,FK
    }

    post_interactions {
        varchar(36) user_id PK,FK
        varchar(36) post_id PK,FK
        boolean is_liked "DEFAULT false"
        boolean is_bookmarked "DEFAULT false"
        datetime created_at
        datetime updated_at
    }

    posts ||--o{ post_images : "has"
    posts ||--o{ comments : "has"
    comments ||--o{ comment_likes : "has"
    posts ||--o{ post_interactions : "has"
    comments ||--o{ comments : "parent-child"

    %% ===== NOTICE 도메인 =====
    notices {
        varchar(120) id PK "Base64(link).replace(/=+$/,'').slice(0,120)"
        varchar(500) title "NOT NULL"
        text rss_preview "RSS 미리보기 텍스트"
        text summary "AI 요약 텍스트 (nullable)"
        varchar(500) link "NOT NULL"
        datetime posted_at
        varchar(50) category
        varchar(50) department
        varchar(100) author
        varchar(20) source "RSS"
        varchar(40) rss_fingerprint "legacy SHA1(title|link|rawDate)"
        varchar(40) detail_hash "HTML + attachments SHA1"
        varchar(40) content_hash "SHA1"
        datetime detail_checked_at
        longtext body_text "HTML 정규화 plain text"
        longtext body_html "크롤링된 HTML"
        text thumbnail_url "bodyHtml 첫 이미지 URL cache, nullable"
        json attachments "첨부파일 목록"
        int view_count "DEFAULT 0"
        int like_count "DEFAULT 0"
        int comment_count "DEFAULT 0"
        int bookmark_count "DEFAULT 0"
        datetime created_at
        datetime updated_at
    }

    notice_read_status {
        varchar(36) user_id PK,FK
        varchar(120) notice_id PK,FK
        boolean is_read "DEFAULT false"
        datetime read_at
    }

    notice_comments {
        varchar(36) id PK "UUID"
        varchar(120) notice_id FK "NOT NULL"
        varchar(36) user_id FK "NOT NULL"
        varchar(50) user_display_name
        text content "NOT NULL"
        boolean is_anonymous "DEFAULT false"
        varchar(36) anon_id
        int anonymous_order "익명1, 익명2..."
        varchar(36) parent_id FK
        int like_count "DEFAULT 0"
        boolean is_deleted "DEFAULT false"
        datetime created_at
        datetime updated_at
    }

    notice_comment_likes {
        varchar(36) user_id PK "회원 ID"
        varchar(36) comment_id PK,FK
    }

    notice_likes {
        varchar(36) user_id PK "회원 ID"
        varchar(120) notice_id PK,FK
    }

    notice_bookmarks {
        varchar(36) user_id PK "회원 ID"
        varchar(120) notice_id PK,FK
    }

    app_notices {
        varchar(36) id PK "UUID"
        varchar(200) title "NOT NULL"
        text content
        enum category "UPDATE,MAINTENANCE,EVENT,GENERAL"
        enum priority "HIGH,NORMAL,LOW"
        json image_urls "string[]"
        varchar(500) action_url
        datetime published_at
        datetime created_at
        datetime updated_at
    }

    app_notice_read_status {
        varchar(36) user_id PK
        varchar(36) app_notice_id PK,FK
        datetime read_at "NOT NULL"
    }

    campus_banners {
        varchar(36) id PK "UUID"
        varchar(50) badge_label "NOT NULL"
        varchar(100) title_label "NOT NULL"
        varchar(200) description_label "NOT NULL"
        varchar(50) button_label "NOT NULL"
        enum palette_key "GREEN,BLUE,PURPLE,RED,YELLOW"
        varchar(500) image_url "NOT NULL"
        enum action_type "IN_APP,EXTERNAL_URL"
        enum action_target "TAXI_MAIN,NOTICE_MAIN,TIMETABLE_DETAIL,CAFETERIA_DETAIL,ACADEMIC_CALENDAR_DETAIL"
        json action_params "nullable, object only"
        varchar(500) action_url
        boolean is_active "NOT NULL"
        datetime display_start_at
        datetime display_end_at
        int display_order "1부터 시작하는 연속값"
        datetime created_at
        datetime updated_at
    }

    notices ||--o{ notice_read_status : "has"
    notices ||--o{ notice_comments : "has"
    notice_comments ||--o{ notice_comment_likes : "has"
    notices ||--o{ notice_likes : "has"
    notices ||--o{ notice_bookmarks : "has"
    app_notices ||--o{ app_notice_read_status : "has"
    notice_comments ||--o{ notice_comments : "parent-child"
```

### 1.3 Generic 도메인 (Academic, Support)

```mermaid
erDiagram
    %% ===== ACADEMIC 도메인 =====
    courses {
        varchar(36) id PK "UUID"
        int grade "1,2,3,4"
        varchar(50) category "이수구분"
        varchar(20) code "과목코드"
        varchar(10) division "분반"
        varchar(100) name "NOT NULL"
        int credits
        varchar(50) professor
        varchar(100) location
        varchar(500) note
        boolean is_online "NOT NULL DEFAULT false"
        varchar(10) semester "2024-2"
        varchar(50) department
        datetime created_at
        datetime updated_at
    }

    course_schedules {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) course_id FK
        int day_of_week "1-6 (월-토)"
        int start_period "1-15"
        int end_period "1-15"
    }

    user_timetables {
        varchar(36) id PK "UUID"
        varchar(36) user_id FK "NOT NULL"
        varchar(10) semester "NOT NULL"
        datetime created_at
        datetime updated_at
    }

    user_timetable_courses {
        varchar(36) timetable_id PK,FK
        varchar(36) course_id PK,FK
    }

    user_timetable_manual_courses {
        varchar(36) id PK "UUID"
        varchar(36) timetable_id FK "NOT NULL"
        varchar(100) name "NOT NULL"
        varchar(50) professor
        int credits "NOT NULL"
        boolean is_online "NOT NULL"
        varchar(100) location
        int day_of_week "1-6 (월-토), nullable"
        int start_period "1-15, nullable"
        int end_period "1-15, nullable"
    }

    academic_schedules {
        varchar(36) id PK "UUID"
        varchar(200) title "NOT NULL"
        date start_date "NOT NULL"
        date end_date "NOT NULL"
        enum type "SINGLE,MULTI"
        boolean is_primary "DEFAULT false"
        varchar(500) description
        datetime created_at
        datetime updated_at
    }

    courses ||--o{ course_schedules : "has"
    user_timetables ||--o{ user_timetable_courses : "contains"
    user_timetables ||--o{ user_timetable_manual_courses : "contains"
    courses ||--o{ user_timetable_courses : "included in"

    %% runtime contract note:
    %% 강의 일괄 등록 계약은 credits + 강의 단위 location을 사용하며,
    %% 개별 course_schedules에는 강의실 컬럼을 두지 않는다.
    %% 공식 온라인 강의는 courses.is_online=true 이고 course_schedules row 없이 운영한다.

    %% ===== SUPPORT 도메인 =====
    inquiries {
        varchar(36) id PK "UUID"
        enum type "FEATURE,BUG,ACCOUNT,SERVICE,OTHER"
        varchar(200) subject "NOT NULL"
        text content "NOT NULL"
        json attachments "문의 첨부 이미지 메타데이터 목록"
        varchar(36) user_id FK
        varchar(255) user_email
        varchar(50) user_name
        varchar(50) user_realname
        varchar(20) user_student_id
        enum status "PENDING,IN_PROGRESS,RESOLVED"
        varchar(500) admin_memo
        datetime created_at
        datetime updated_at
    }

    reports {
        varchar(36) id PK "UUID"
        enum target_type "POST,COMMENT,MEMBER,CHAT_MESSAGE,CHAT_ROOM,TAXI_PARTY"
        varchar(100) target_id "NOT NULL"
        varchar(36) target_author_id
        varchar(50) category
        text reason "NOT NULL"
        varchar(36) reporter_id FK "NOT NULL, UK(reporter_id,target_type,target_id)"
        enum status "PENDING,REVIEWING,ACTIONED,REJECTED"
        varchar(100) action
        varchar(500) admin_memo
        datetime created_at
        datetime updated_at
    }

    app_versions {
        varchar(10) platform PK "ios,android"
        varchar(20) minimum_version "NOT NULL"
        boolean force_update "DEFAULT false"
        varchar(500) message
        varchar(100) title
        boolean show_button "DEFAULT false"
        varchar(100) button_text
        varchar(500) button_url
        datetime updated_at
    }

    legal_documents {
        varchar(40) document_key PK "termsOfUse,privacyPolicy"
        varchar(100) title "NOT NULL"
        enum banner_icon_key "DOCUMENT,SHIELD"
        varchar(200) banner_title "NOT NULL"
        enum banner_tone "GREEN,BLUE"
        json banner_lines "LegalDocumentBannerLine[]"
        json sections "LegalDocumentSection[]"
        json footer_lines "string[]"
        boolean is_active "NOT NULL"
        datetime created_at
        datetime updated_at
    }

    cafeteria_menus {
        varchar(20) week_id PK "2024-W01"
        date week_start "NOT NULL"
        date week_end "NOT NULL"
        json menus "Map<date, Map<restaurant, items[]>>"
        json menu_entries "Map<date, Map<category, entry[]>>"
        datetime created_at
        datetime updated_at
    }

    cafeteria_menu_reactions {
        varchar(36) member_id PK "회원 ID"
        varchar(255) menu_id PK "stable weekly menu ID"
        varchar(20) week_id "NOT NULL"
        varchar(100) category "NOT NULL"
        varchar(255) title "NOT NULL"
        enum reaction "LIKE,DISLIKE"
        datetime created_at
        datetime updated_at
    }

```

### 1.4 Infra (Notification)

```mermaid
erDiagram
    %% ===== NOTIFICATION 인프라 =====
    user_notifications {
        varchar(36) id PK "UUID"
        varchar(36) user_id FK "NOT NULL"
        enum type "PARTY_CREATED,PARTY_JOIN_REQUEST,PARTY_JOIN_ACCEPTED,PARTY_JOIN_DECLINED,PARTY_CLOSED,PARTY_ARRIVED,PARTY_ENDED,MEMBER_KICKED,SETTLEMENT_COMPLETED,CHAT_MESSAGE,POST_LIKED,COMMENT_CREATED,NOTICE,APP_NOTICE,ACADEMIC_SCHEDULE"
        varchar(200) title "NOT NULL"
        varchar(500) message
        json data "추가 데이터"
        boolean is_read "DEFAULT false"
        datetime read_at
        datetime created_at
    }

    fcm_tokens {
        bigint id PK "AUTO_INCREMENT"
        varchar(36) user_id FK "NOT NULL"
        varchar(500) token UK "NOT NULL"
        varchar(10) platform "ios,android"
        varchar(32) app_version "nullable"
        datetime created_at
        datetime last_used_at
    }

    admin_audit_logs {
        varchar(36) id PK "UUID"
        varchar(36) actor_id "관리자 UID(논리적 참조)"
        varchar(50) action "NOT NULL"
        varchar(36) target_id
        varchar(50) target_type
        json diff_before
        json diff_after
        datetime timestamp
    }

    seed_migrations {
        varchar(120) migration_key PK
        datetime applied_at "NOT NULL"
    }
```

---

## 2. 도메인별 테이블 상세

### 2.1 Member 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `members` | 회원 기본 정보 | ~5,000 |
| `linked_accounts` | 연결된 소셜 계정 | ~5,000 |

**members 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | Firebase UID 또는 UUID |
| email | VARCHAR(255) | UK, NOT NULL | 이메일 (로그인 식별자) |
| nickname | VARCHAR(50) | | 앱 내 닉네임 |
| student_id | VARCHAR(20) | | 학번 |
| department | VARCHAR(50) | | 학과 |
| photo_url | VARCHAR(500) | | 프로필 이미지 URL (가입 시 기본 null) |
| realname | VARCHAR(50) | | 실명 (계좌 예금주) |
| is_admin | BOOLEAN | DEFAULT false | 관리자 여부 |
| status | ENUM | NOT NULL | 회원 상태 (`ACTIVE`, `WITHDRAWN`) |
| bank_name | VARCHAR(20) | | 은행명 |
| account_number | VARCHAR(30) | | 계좌번호 |
| account_holder | VARCHAR(50) | | 예금주 |
| hide_name | BOOLEAN | DEFAULT false | 예금주명 숨김 |
| all_notifications | BOOLEAN | DEFAULT true | 전체 알림 |
| party_notifications | BOOLEAN | DEFAULT true | 파티 알림 |
| notice_notifications | BOOLEAN | DEFAULT true | 공지 알림 |
| board_like_notifications | BOOLEAN | DEFAULT true | 좋아요 알림 |
| comment_notifications | BOOLEAN | DEFAULT true | Board/Notice 공통 댓글 알림 |
| bookmarked_post_comment_notifications | BOOLEAN | DEFAULT true | 북마크한 게시글의 새 댓글 알림 |
| system_notifications | BOOLEAN | DEFAULT true | 시스템 알림 |
| academic_schedule_notifications | BOOLEAN | DEFAULT true | 학사 일정 알림 마스터 |
| academic_schedule_day_before_enabled | BOOLEAN | DEFAULT true | 학사 일정 전날 리마인더 허용 |
| academic_schedule_all_events_enabled | BOOLEAN | DEFAULT false | 중요 일정 외 일반 일정 알림 허용 |
| notice_notifications_detail | JSON | | 공지 카테고리별 설정 |
| joined_at | DATETIME | | 가입일 |
| last_login | DATETIME | | 마지막 로그인 |
| withdrawn_at | DATETIME | | 탈퇴 시각 (soft delete tombstone) |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

> Phase 8부터 학사 일정 알림용 `academic_schedule_notifications`, `academic_schedule_day_before_enabled`, `academic_schedule_all_events_enabled` 컬럼을 사용한다.

> Phase 10부터 회원 탈퇴는 hard delete 대신 `status`, `withdrawn_at` 기반 soft delete tombstone으로 관리한다.

**linked_accounts 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 연결 계정 식별자 |
| member_id | VARCHAR(36) | FK, NOT NULL | 회원 ID (`members.id`) |
| provider | VARCHAR(20) | NOT NULL | 로그인 제공자 (`GOOGLE`, `PASSWORD`, `UNKNOWN`) |
| provider_id | VARCHAR(255) | | provider 계정 고유 ID (예: `firebase.identities[sign_in_provider][0]`, 비소셜 로그인은 `NULL`) |
| email | VARCHAR(255) | | provider 이메일 (비소셜 로그인은 `NULL`) |
| provider_display_name | VARCHAR(50) | | provider 프로필 이름 (비소셜 로그인은 `NULL`) |
| photo_url | VARCHAR(500) | | provider 프로필 이미지 URL (`picture`, 비소셜 로그인은 `NULL`) |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

### 2.2 TaxiParty 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `parties` | 택시 파티 | ~50,000/년 |
| `party_members` | 파티 멤버 (N:M) | ~150,000/년 |
| `party_tags` | 파티 태그 | ~100,000/년 |
| `member_settlements` | 멤버별 정산 상태 | ~150,000/년 |
| `join_requests` | 동승 요청 | ~100,000/년 |

**parties 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | UUID |
| leader_id | VARCHAR(36) | FK, NOT NULL | 파티장 ID |
| departure_name | VARCHAR(100) | NOT NULL | 출발지명 |
| departure_lat | DECIMAL(10,7) | | 출발지 위도 |
| departure_lng | DECIMAL(10,7) | | 출발지 경도 |
| destination_name | VARCHAR(100) | NOT NULL | 목적지명 |
| destination_lat | DECIMAL(10,7) | | 목적지 위도 |
| destination_lng | DECIMAL(10,7) | | 목적지 경도 |
| departure_time | DATETIME | NOT NULL | 출발 시간 |
| max_members | INT | DEFAULT 4 | 최대 인원 |
| detail | VARCHAR(500) | | 상세 설명 |
| status | ENUM | NOT NULL | OPEN, CLOSED, ARRIVED, ENDED |
| end_reason | ENUM | | ARRIVED, FORCE_ENDED, CANCELLED, TIMEOUT, WITHDRAWED |
| ended_at | DATETIME | | 종료 시간 |
| settlement_status | ENUM | | PENDING, COMPLETED |
| taxi_fare | INT | | 총 택시비 snapshot |
| per_person_amount | INT | | 1인당 요금 |
| settlement_bank_name | VARCHAR(20) | | 정산 계좌 은행명 snapshot |
| settlement_account_number | VARCHAR(30) | | 정산 계좌번호 snapshot |
| settlement_account_holder | VARCHAR(50) | | 정산 예금주 snapshot |
| settlement_hide_name | BOOLEAN | | 정산 예금주 마스킹 여부 |
| version | BIGINT | NOT NULL | Optimistic Lock 버전 |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

Taxi history 계약 메모:
- `/v1/members/me/taxi-history`는 추가 테이블 없이 `parties` + `party_members`만으로 계산한다.
- `dateTime`은 `departure_time`, `passengerCount`는 `current_members`를 사용한다.
- `paymentAmount`는 `per_person_amount`, `completedRideCount/savedFareAmount` 판정은 `status`, `end_reason`, `settlement_status`, `taxi_fare`, `per_person_amount` 조합으로 계산한다.
- `ended_at`은 history 노출 시각의 source of truth로 쓰지 않고 종료 이력 보존용으로 유지한다.

**member_settlements 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| party_id | VARCHAR(36) | PK, FK | 파티 ID |
| member_id | VARCHAR(36) | PK, FK | 정산 대상 멤버 ID |
| settled | BOOLEAN | DEFAULT false | 정산 완료 여부 |
| settled_at | DATETIME | | 정산 완료 시각 |
| display_name | VARCHAR(50) | | ARRIVED 시점 표시 이름 snapshot |
| left_party | BOOLEAN | DEFAULT false | ARRIVED 이후 파티 이탈 여부 |
| left_at | DATETIME | | ARRIVED 이후 파티 이탈 시각 |

**join_requests 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | UUID |
| party_id | VARCHAR(36) | FK, NOT NULL | 파티 ID |
| leader_id | VARCHAR(36) | FK, NOT NULL | 파티장 ID |
| requester_id | VARCHAR(36) | FK, NOT NULL | 요청자 ID |
| status | ENUM | NOT NULL | PENDING, ACCEPTED, DECLINED, CANCELED |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

### 2.3 Chat 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `chat_rooms` | 채팅방 | ~100 (공개) + 파티당 1개 |
| `chat_room_members` | 채팅방 멤버 | ~100,000 |
| `chat_messages` | 채팅 메시지 | ~1,000,000/년 |

**chat_messages 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | UUID |
| chat_room_id | VARCHAR(100) | FK, NOT NULL | 채팅방 ID |
| sender_id | VARCHAR(36) | NOT NULL | member id 또는 synthetic mc sender key |
| sender_name | VARCHAR(50) | | 발신자 이름 |
| text | TEXT | | 메시지 내용 |
| type | ENUM | NOT NULL | TEXT, IMAGE, SYSTEM, ACCOUNT, ARRIVED, END |
| account_data | JSON | | 계좌 정보 (파티 채팅) |
| arrival_data | JSON | | 도착 정보 (파티 채팅) |
| direction | ENUM | | MC_TO_APP, APP_TO_MC, SYSTEM |
| source | VARCHAR(20) | | minecraft, app |
| minecraft_uuid | VARCHAR(50) | | MC UUID |
| source_event_id | VARCHAR(36) | UK, NULL | 마인크래프트 inbound dedupe/event mapping key |
| created_at | DATETIME | NOT NULL | 생성일 |

### 2.4 Minecraft 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `minecraft_accounts` | 앱 사용자의 마인크래프트 계정/화이트리스트 source of truth | ~50,000 |
| `minecraft_server_state` | 서버 상태 단일 read model | 1 |
| `minecraft_online_players` | 현재 접속자 스냅샷 | ~100 |
| `minecraft_bridge_events` | 플러그인 SSE replay용 outbox | ~10,000/일 |
| `minecraft_inbound_events` | 플러그인 inbound message idempotency registry | ~10,000/일 |

**minecraft_accounts 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | UUID |
| owner_member_id | VARCHAR(36) | FK, NOT NULL | 소유 회원 ID |
| parent_account_id | VARCHAR(36) | FK | friend 계정의 parent 자기 계정 |
| account_role | ENUM | NOT NULL | SELF, FRIEND |
| edition | ENUM | NOT NULL | JAVA, BEDROCK |
| game_name | VARCHAR(50) | NOT NULL | 사용자 표시용 닉네임 |
| normalized_key | VARCHAR(100) | UK, NOT NULL | Java UUID 또는 `be:{normalized_name}` |
| avatar_uuid | VARCHAR(32) | NOT NULL | Minotar avatar용 UUID |
| last_seen_at | DATETIME | | 마지막 접속 시각 |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

**minecraft_server_state 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| server_key | VARCHAR(20) | PK | 고정값 `skuri` |
| online | BOOLEAN | NOT NULL | 현재 온라인 여부 |
| current_players | INT | NOT NULL | 현재 접속 인원 |
| max_players | INT | NOT NULL | 최대 인원 |
| version | VARCHAR(50) | | 서버 버전 |
| server_address | VARCHAR(255) | | 접속 주소 |
| map_url | VARCHAR(500) | | Dynmap/웹맵 URL |
| last_heartbeat_at | DATETIME | | 플러그인 마지막 heartbeat 수신 시각 |
| updated_at | DATETIME | NOT NULL | 수정일 |

**minecraft_bridge_events 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | BIGINT | PK, AUTO_INCREMENT | replay 정렬 tie-breaker |
| event_id | VARCHAR(36) | UK, NOT NULL | SSE `id` |
| event_type | VARCHAR(50) | NOT NULL | `CHAT_FROM_APP`, `WHITELIST_*`, `HEARTBEAT` |
| payload | JSON | NOT NULL | 플러그인 전달 payload |
| expires_at | DATETIME | | replay 보존 만료 시각 |
| created_at | DATETIME | NOT NULL | 생성일 |

**minecraft_inbound_events 테이블 상세:**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| event_id | VARCHAR(36) | PK, NOT NULL | 플러그인 inbound `eventId` |
| chat_message_id | VARCHAR(36) | FK, NULL | 실제 저장된 `chat_messages.id` |
| created_at | DATETIME | NOT NULL | 생성일 |
| updated_at | DATETIME | NOT NULL | 수정일 |

### 2.5 Board 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `posts` | 게시글 | ~10,000/년 |
| `post_images` | 게시글 이미지 | ~30,000/년 |
| `comments` | 댓글 | ~50,000/년 |
| `post_interactions` | 좋아요/북마크 | ~100,000/년 |

### 2.6 Notice 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `notices` | 학교 공지 | ~10,000 |
| `notice_read_status` | 읽음 상태 | ~500,000 |
| `notice_comments` | 공지 댓글 | ~5,000/년 |
| `notice_likes` | 공지 좋아요 | ~200,000 |
| `notice_bookmarks` | 공지 북마크 | ~100,000 |
| `app_notices` | 앱 공지 | ~100 |
| `app_notice_read_status` | 앱 공지 읽음 상태 | ~500,000 |
| `legal_documents` | 이용약관/개인정보 처리방침 | ~2 |

### 2.7 Campus 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `campus_banners` | 캠퍼스 홈 배너 | ~20 |

**campus_banners 주요 컬럼**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | 배너 ID |
| badge_label | VARCHAR(50) | NOT NULL | 상단 배지 라벨 |
| title_label | VARCHAR(100) | NOT NULL | 배너 제목 |
| description_label | VARCHAR(200) | NOT NULL | 배너 설명 |
| button_label | VARCHAR(50) | NOT NULL | CTA 버튼 라벨 |
| palette_key | VARCHAR(20) | NOT NULL | 프론트 팔레트 키 (`GREEN`, `BLUE`, `PURPLE`, `RED`, `YELLOW`) |
| image_url | VARCHAR(500) | NOT NULL | 캠퍼스 배너 이미지 URL |
| action_type | VARCHAR(20) | NOT NULL | 액션 타입 (`IN_APP`, `EXTERNAL_URL`) |
| action_target | VARCHAR(40) | | 인앱 이동 대상 (`TAXI_MAIN`, `NOTICE_MAIN`, `TIMETABLE_DETAIL`, `CAFETERIA_DETAIL`, `ACADEMIC_CALENDAR_DETAIL`) |
| action_params | JSON | | 인앱 이동용 추가 파라미터. JSON object만 허용 |
| action_url | VARCHAR(500) | | 외부 이동 URL |
| is_active | BOOLEAN | NOT NULL | 운영 활성 여부 |
| display_start_at | DATETIME | | 노출 시작 시각 |
| display_end_at | DATETIME | | 노출 종료 시각 (`display_end_at < display_start_at` 금지) |
| display_order | INT | NOT NULL | 1부터 시작하는 연속 표시 순서 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

### 2.8 Academic 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `courses` | 강의 | ~5,000/학기 |
| `course_schedules` | 강의 시간 | ~10,000/학기 |
| `user_timetables` | 사용자 시간표 | ~5,000/학기 |
| `user_timetable_courses` | 시간표-강의 매핑 | ~25,000/학기 |
| `user_timetable_manual_courses` | 시간표 직접 입력 강의 | ~5,000/학기 |
| `academic_schedules` | 학사 일정 | ~100/년 |

### 2.9 Support 도메인

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `inquiries` | 문의 | ~500/년 |
| `reports` | 신고 | ~200/년 |
| `app_versions` | 앱 버전 | 2 (ios, android) |
| `legal_documents` | 법적 문서 | ~2 |
| `cafeteria_menus` | 학식 메뉴 | ~52/년 |
| `cafeteria_menu_reactions` | 학식 메뉴 사용자 반응 | ~50,000/년 |

### 2.10 Notification 인프라

| 테이블 | 설명 | 예상 레코드 수 |
|--------|------|---------------|
| `user_notifications` | 알림 인박스 | ~500,000/년 |
| `fcm_tokens` | FCM 토큰 | ~10,000 |
| `admin_audit_logs` | 감사 로그 | ~10,000/년 |
| `seed_migrations` | 1회성 seed 적용 이력 | ~10 |

**user_notifications 주요 컬럼**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | 알림 ID |
| user_id | VARCHAR(36) | FK, NOT NULL | 수신 회원 ID |
| type | VARCHAR(40) | NOT NULL | 알림 타입 (`PARTY_*`, `CHAT_MESSAGE`, `ACADEMIC_SCHEDULE` 등 canonical enum) |
| title | VARCHAR(200) | NOT NULL | 알림 제목 |
| message | VARCHAR(500) | NOT NULL | 알림 메시지 |
| data | JSON | | 이동/연결용 payload (`partyId`, `requestId`, `chatRoomId`, `postId`, `commentId`, `noticeId`, `appNoticeId`, `academicScheduleId`) |
| is_read | BOOLEAN | DEFAULT false | 읽음 여부 |
| read_at | DATETIME | | 읽음 시각 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

**fcm_tokens 주요 컬럼**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 토큰 식별자 |
| user_id | VARCHAR(36) | FK, NOT NULL | 소유 회원 ID |
| token | VARCHAR(500) | UK, NOT NULL | FCM 디바이스 토큰 |
| platform | VARCHAR(10) | NOT NULL | `ios` 또는 `android` |
| app_version | VARCHAR(32) | | 토큰이 대표하는 앱 버전 (`null` 허용) |
| created_at | DATETIME | NOT NULL | 최초 등록 시각 |
| last_used_at | DATETIME | | 마지막 성공 사용 시각 |

- `app_version`은 디바이스/토큰 메타데이터로 저장하며, 신규 토큰 등록 시 미전송하면 `null`을 허용한다.
- 같은 토큰 재등록 시 `appVersion`이 `null` 또는 빈 문자열이면 기존 `app_version`을 유지한다.
- 관리자 회원 목록의 `lastLoginOs`, `currentAppVersion`은 동일한 대표 토큰(`coalesce(last_used_at, created_at)` 최신) 기준으로 계산한다.

**admin_audit_logs 주요 컬럼**

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | VARCHAR(36) | PK | 감사 로그 ID |
| actor_id | VARCHAR(36) | NOT NULL | 호출 관리자 UID (members.id에 대한 논리적 참조, 물리 FK 미적용) |
| action | VARCHAR(50) | NOT NULL | 감사 액션 코드 (`INQUIRY_STATUS_UPDATED`, `ACADEMIC_SCHEDULE_CREATED` 등) |
| target_id | VARCHAR(36) | | 대상 엔티티 ID 또는 canonical 운영 키(semester/platform/weekId) |
| target_type | VARCHAR(50) | | 대상 타입 (`INQUIRY`, `REPORT`, `APP_VERSION` 등) |
| diff_before | JSON | | 변경 전 스냅샷 |
| diff_after | JSON | | 변경 후 스냅샷 |
| timestamp | DATETIME | NOT NULL | 감사 로그 기록 시각 |

- Phase 11 기준 `admin_audit_logs`는 상태 변경 Admin API(`POST`, `PUT`, `PATCH`, `DELETE`)만 저장하고 `GET` 조회는 저장하지 않는다.
- `target_id`는 raw 입력이 아니라 서비스와 동일한 canonical 키를 저장한다. 예: `semester=2026-1`, `platform=ios`

---

## 3. 테이블 관계 요약

### 3.1 관계 유형

| 관계 | 테이블 A | 테이블 B | 유형 | 설명 |
|------|---------|---------|------|------|
| 회원-연결계정 | members | linked_accounts | 1:N | 회원은 여러 소셜 계정 연결 가능 |
| 파티-멤버 | parties | party_members | 1:N | 파티에 여러 멤버 참여 |
| 파티-태그 | parties | party_tags | 1:N | 파티에 여러 태그 |
| 파티-정산 | parties | member_settlements | 1:N | 파티 멤버별 정산 상태 |
| 파티-요청 | parties | join_requests | 1:N | 파티에 여러 동승 요청 |
| 채팅방-멤버 | chat_rooms | chat_room_members | 1:N | 채팅방에 여러 멤버 |
| 채팅방-메시지 | chat_rooms | chat_messages | 1:N | 채팅방에 여러 메시지 |
| 게시글-이미지 | posts | post_images | 1:N | 게시글에 여러 이미지 |
| 게시글-댓글 | posts | comments | 1:N | 게시글에 여러 댓글 |
| 댓글-대댓글 | comments | comments | 1:N (self) | 무제한 self-reference + placeholder soft delete |
| 댓글-좋아요 | comments | comment_likes | 1:N | 댓글별 좋아요 |
| 게시글-상호작용 | posts | post_interactions | 1:N | 게시글에 여러 좋아요/북마크 |
| 공지-읽음 | notices | notice_read_status | 1:N | 공지별 읽음 상태 |
| 공지-댓글 | notices | notice_comments | 1:N | 공지에 여러 댓글 |
| 공지 댓글-좋아요 | notice_comments | notice_comment_likes | 1:N | 공지 댓글별 좋아요 |
| 공지-좋아요 | notices | notice_likes | 1:N | 공지별 좋아요 |
| 공지-북마크 | notices | notice_bookmarks | 1:N | 공지별 북마크 |
| 앱 공지-읽음 | app_notices | app_notice_read_status | 1:N | 앱 공지별 읽음 상태 |
| 캠퍼스 배너 | campus_banners | (없음) | 독립 테이블 | 홈 배너 콘텐츠/노출 기간/정렬 관리 |
| 강의-시간 | courses | course_schedules | 1:N | 강의에 여러 시간 슬롯 |
| 시간표-강의 | user_timetables | user_timetable_courses | 1:N | 시간표에 여러 강의 |
| 시간표-직접입력강의 | user_timetables | user_timetable_manual_courses | 1:N | 시간표에 여러 직접 입력 강의 |
| 회원-알림 | members | user_notifications | 1:N | 회원에게 여러 알림 |
| 회원-FCM | members | fcm_tokens | 1:N | 회원의 여러 디바이스 토큰 |

### 3.2 FK 제약조건

```sql
-- Member 도메인
ALTER TABLE linked_accounts
  ADD CONSTRAINT fk_linked_accounts_member
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

-- TaxiParty 도메인
ALTER TABLE parties
  ADD CONSTRAINT fk_parties_leader
  FOREIGN KEY (leader_id) REFERENCES members(id);

ALTER TABLE party_members
  ADD CONSTRAINT fk_party_members_party
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE;

ALTER TABLE party_members
  ADD CONSTRAINT fk_party_members_member
  FOREIGN KEY (member_id) REFERENCES members(id);

ALTER TABLE join_requests
  ADD CONSTRAINT fk_join_requests_party
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE;

ALTER TABLE join_requests
  ADD CONSTRAINT fk_join_requests_requester
  FOREIGN KEY (requester_id) REFERENCES members(id);

-- Chat 도메인
ALTER TABLE chat_room_members
  ADD CONSTRAINT fk_chat_room_members_room
  FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;

ALTER TABLE chat_messages
  ADD CONSTRAINT fk_chat_messages_room
  FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;

-- Board 도메인
ALTER TABLE comments
  ADD CONSTRAINT fk_comments_post
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE comments
  ADD CONSTRAINT fk_comments_parent
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL;

ALTER TABLE post_interactions
  ADD CONSTRAINT fk_post_interactions_post
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Notice 도메인
ALTER TABLE notice_read_status
  ADD CONSTRAINT fk_notice_read_status_notice
  FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE;

ALTER TABLE app_notice_read_status
  ADD CONSTRAINT fk_app_notice_read_status_notice
  FOREIGN KEY (app_notice_id) REFERENCES app_notices(id) ON DELETE CASCADE;

ALTER TABLE notice_comments
  ADD CONSTRAINT fk_notice_comments_notice
  FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE;

ALTER TABLE notice_comments
  ADD CONSTRAINT fk_notice_comments_parent
  FOREIGN KEY (parent_id) REFERENCES notice_comments(id) ON DELETE SET NULL;

ALTER TABLE notice_likes
  ADD CONSTRAINT fk_notice_likes_notice
  FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE;

ALTER TABLE notice_bookmarks
  ADD CONSTRAINT fk_notice_bookmarks_notice
  FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE;
```

---

## 4. 인덱스 설계

### 4.1 Member 도메인

```sql
-- members
CREATE UNIQUE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_student_id ON members(student_id);
CREATE INDEX idx_members_department ON members(department);

-- linked_accounts
CREATE UNIQUE INDEX uk_linked_account_member_provider ON linked_accounts(member_id, provider);
CREATE INDEX idx_linked_accounts_member ON linked_accounts(member_id);
CREATE INDEX idx_linked_accounts_provider ON linked_accounts(provider, provider_id);
```

### 4.2 TaxiParty 도메인

```sql
-- parties
CREATE INDEX idx_parties_leader ON parties(leader_id);
CREATE INDEX idx_parties_status ON parties(status);
CREATE INDEX idx_parties_departure_time ON parties(departure_time);
CREATE INDEX idx_parties_status_departure ON parties(status, departure_time);
CREATE INDEX idx_parties_created_at ON parties(created_at);

-- party_members
CREATE INDEX idx_party_members_member ON party_members(member_id);

-- join_requests
CREATE INDEX idx_join_requests_party ON join_requests(party_id);
CREATE INDEX idx_join_requests_requester ON join_requests(requester_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);
CREATE INDEX idx_join_requests_party_status ON join_requests(party_id, status);
```

### 4.3 Chat 도메인

```sql
-- chat_rooms
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_department ON chat_rooms(department);

-- chat_room_members
CREATE INDEX idx_chat_room_members_member ON chat_room_members(member_id);

-- chat_messages (중요: 대용량 테이블)
CREATE INDEX idx_chat_messages_room ON chat_messages(chat_room_id);
CREATE INDEX idx_chat_messages_room_created ON chat_messages(chat_room_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
```

### 4.4 Minecraft 도메인

```sql
-- minecraft_accounts
CREATE INDEX idx_minecraft_accounts_owner ON minecraft_accounts(owner_member_id);
CREATE INDEX idx_minecraft_accounts_parent ON minecraft_accounts(parent_account_id);
CREATE UNIQUE INDEX uk_minecraft_accounts_normalized_key ON minecraft_accounts(normalized_key);

-- minecraft_online_players
CREATE INDEX idx_minecraft_online_players_server ON minecraft_online_players(server_key);
CREATE INDEX idx_minecraft_online_players_normalized_key ON minecraft_online_players(normalized_key);
CREATE INDEX idx_minecraft_online_players_verified ON minecraft_online_players(verified);

-- minecraft_bridge_events
CREATE UNIQUE INDEX uk_minecraft_bridge_events_event_id ON minecraft_bridge_events(event_id);
CREATE INDEX idx_minecraft_bridge_events_replay ON minecraft_bridge_events(created_at, id);
CREATE INDEX idx_minecraft_bridge_events_expires ON minecraft_bridge_events(expires_at);

-- minecraft_inbound_events
CREATE INDEX idx_minecraft_inbound_events_chat_message ON minecraft_inbound_events(chat_message_id);
```

### 4.5 Board 도메인

```sql
-- posts
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_category_created ON posts(category, created_at DESC);
CREATE INDEX idx_posts_pinned_created ON posts(is_pinned DESC, created_at DESC);

-- comments
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);

-- comment_likes
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);

-- post_interactions
CREATE INDEX idx_post_interactions_user ON post_interactions(user_id);
CREATE INDEX idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX idx_post_interactions_user_liked ON post_interactions(user_id, is_liked);
CREATE INDEX idx_post_interactions_user_bookmarked ON post_interactions(user_id, is_bookmarked);
```

### 4.6 Notice 도메인

```sql
-- notices
CREATE INDEX idx_notices_category ON notices(category);
CREATE INDEX idx_notices_posted_created ON notices(posted_at DESC, created_at DESC);
CREATE INDEX idx_notices_category_posted_created ON notices(category, posted_at DESC, created_at DESC);
CREATE INDEX idx_notices_content_hash ON notices(content_hash);

-- notice_read_status
CREATE INDEX idx_notice_read_user ON notice_read_status(user_id);

-- app_notice_read_status
CREATE INDEX idx_app_notice_read_app_notice ON app_notice_read_status(app_notice_id);

-- notice_comments
CREATE INDEX idx_notice_comments_notice ON notice_comments(notice_id);
CREATE INDEX idx_notice_comments_parent ON notice_comments(parent_id);

-- notice_comment_likes
CREATE INDEX idx_notice_comment_likes_comment ON notice_comment_likes(comment_id);

-- notice_likes
CREATE INDEX idx_notice_likes_user ON notice_likes(user_id);

-- notice_bookmarks
CREATE INDEX idx_notice_bookmarks_user ON notice_bookmarks(user_id);
```

### 4.7 Campus 도메인

```sql
-- campus_banners
CREATE INDEX idx_campus_banners_display_order ON campus_banners(display_order);
CREATE INDEX idx_campus_banners_active_display ON campus_banners(is_active, display_order);
CREATE INDEX idx_campus_banners_display_window ON campus_banners(display_start_at, display_end_at);
```

### 4.8 Academic 도메인

```sql
-- courses
CREATE INDEX idx_courses_semester ON courses(semester);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_professor ON courses(professor);
CREATE INDEX idx_courses_code ON courses(code);
CREATE UNIQUE INDEX uk_courses_semester_code_division ON courses(semester, code, division);

-- user_timetables
CREATE INDEX idx_user_timetables_user ON user_timetables(user_id);
CREATE INDEX idx_user_timetables_semester ON user_timetables(semester);
CREATE UNIQUE INDEX idx_user_timetables_user_semester ON user_timetables(user_id, semester);

-- user_timetable_manual_courses
CREATE INDEX idx_user_timetable_manual_courses_timetable ON user_timetable_manual_courses(timetable_id);

-- academic_schedules
CREATE INDEX idx_academic_schedules_date ON academic_schedules(start_date, end_date);
CREATE INDEX idx_academic_schedules_primary ON academic_schedules(is_primary);
```

### 4.9 Support 도메인

```sql
-- reports
CREATE UNIQUE INDEX uk_reports_reporter_target ON reports(reporter_id, target_type, target_id);
```

### 4.10 Notification 인프라

```sql
-- user_notifications
CREATE INDEX idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_user_read ON user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_user_created ON user_notifications(user_id, created_at DESC);

-- fcm_tokens
CREATE INDEX idx_fcm_tokens_user ON fcm_tokens(user_id);
CREATE UNIQUE INDEX idx_fcm_tokens_token ON fcm_tokens(token);

-- admin_audit_logs
CREATE INDEX idx_audit_logs_actor ON admin_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_timestamp ON admin_audit_logs(timestamp DESC);
```

---

## 참고

- [도메인 분석](./domain-analysis.md)
- 마인크래프트 상세 설계/이력: 백엔드 레포 `docs/minecraft-spring-migration-plan.md`
- 레거시 Firestore 데이터 구조: 프론트 레포 `docs/references/legacy/firestore-data-structure.md`

---

> **문서 이력**
> - 2026-03-30: Minecraft 도메인 테이블 추가 — `minecraft_accounts`, `minecraft_server_state`, `minecraft_online_players`, `minecraft_bridge_events`와 관련 인덱스, chat sender key/Minotar 전제를 반영
> - 2026-02-03: 초안 작성
> - 2026-03-05: Board 댓글 정책 동기화 — `comments.parent_id` 관계를 부모 보존 정책(B)에 맞게 정정(`ON DELETE SET NULL`), depth 1 제약/placeholder soft delete 설명 반영
> - 2026-03-07: Board/Notice 댓글 정책 구현 반영 — 무제한 self-reference, 댓글 알림 설정 컬럼(`comment_notifications`, `bookmarked_post_comment_notifications`) 반영
> - 2026-03-08: Phase 8 Notification 인프라 반영 — members 학사 일정 알림 컬럼, `user_notifications`/`fcm_tokens` 상세, notification type canonical enum 동기화
> - 2026-03-25: Campus Banner 테이블 추가 — `campus_banners` 컬럼/인덱스/독립 도메인 분류 반영
> - 2026-03-10: Phase 11 Admin 공통 인프라 반영 — `admin_audit_logs` 상세 컬럼(`diff_before`, `diff_after`, `timestamp`)과 운영 식별자/저장 범위 정책을 문서화
> - 2026-03-25: Notice 북마크 테이블 추가 — `notice_bookmarks` 관계/FK/인덱스 및 Notice 도메인 예상 레코드 수 반영
