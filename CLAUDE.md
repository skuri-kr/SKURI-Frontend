# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Git 브랜치, PR, 리뷰, 병합 규칙은 [AGENTS.md](AGENTS.md)를 우선으로 따른다.

## Project Overview

SKURI Taxi는 성결대학교 학생을 위한 택시 동승 + 캠퍼스 라이프 통합 React Native 모바일 앱이다.

**Stack:** React Native 0.85.3 · React 19.2.3 · TypeScript 5.8.3 · Spring Boot 4.0.3 백엔드 · Firebase (Auth/Messaging/Analytics/Crashlytics)

**핵심 기능:** 택시 동승(파티 생성/참여/채팅/정산), 학교 공지, 커뮤니티 게시판, 공개 채팅, 캠퍼스 생활정보(시간표/학식/학사일정)

## Common Commands

```bash
# Development
npm start               # Metro bundler
npm run android         # Build and run Android
npm run ios             # Build and run iOS simulator

# Quality
npm run lint            # ESLint check (required before PR)
npm test                # Jest tests
npm test -- path/to/test.test.ts   # Run single test file
npm test -- --testNamePattern="test name"  # Run specific test by name

# Patches
npm run postinstall     # Apply patch-package patches (runs automatically after npm install)
```

## Architecture

### Feature-Based Structure

```
src/
  app/          # App-level: bootstrap, navigation, providers, guards, data-freshness
  features/     # Domain features (auth, taxi, notice, board, chat, campus, user, settings, timetable, minecraft, member, community, report)
  shared/       # Common API client, hooks, design system, realtime clients, types
  di/           # Dependency injection: RepositoryProvider, RepositoryContext, useRepository
  types/        # Global TypeScript types
```

### Path Aliases

`@/` → `src/` (configured in tsconfig.json, babel.config.js, jest.config.js)

```typescript
import { something } from '@/app/...';
import { something } from '@/shared/...';
import { something } from '@/features/...';
```

### Data Layer (Repository Pattern with DI)

앱의 데이터는 다음 계층형 흐름을 따른다:

```
Spring REST / SSE / STOMP
  → Transport / API layer (src/shared/api/, src/shared/realtime/)
    → DTO Mapper (features/*/data/mappers/)
      → Domain Repository (features/*/data/repositories/)
        → Query / Assembler (features/*/data/composition/ 또는 application/)
          → Hook (features/*/hooks/)
            → Screen (features/*/screens/)
```

- **Repository 인터페이스**: `I*Repository.ts` → 구현체: `Spring*Repository.ts`
- **DI 진입점**: `src/di/RepositoryProvider.tsx`에서 모든 repository 일괄 등록
- **Hook에서 접근**: `useRepository()` 또는 feature 단위 래퍼 훅 사용
- 도메인 데이터의 진실 공급원은 Spring 서버다. Firebase는 Auth, Messaging, Analytics, Crashlytics 용도로 유지한다.

### Feature Module Convention

각 feature는 필요한 디렉터리만 선택적으로 사용하며, 일반적으로 다음 구조를 따른다:

```
features/<feature>/
  screens/        # Screen components
  components/     # Feature-specific UI
  hooks/          # Feature hooks
  services/       # Business logic
  model/          # Domain models, types, constants, navigation params
  data/
    api/          # API endpoint definitions
    dto/          # Data transfer objects (server response types)
    mappers/      # DTO → Domain model mappers
    repositories/ # Interface (I*Repository) + Implementation (Spring*Repository)
  providers/      # Context providers (if needed)
  index.ts        # Public exports
```

### Navigation Structure

```
RootNavigator (auth state routing via useAuthEntryGuard)
├── AuthNavigator (Login, AccountGuide)
├── CompleteProfile / PermissionOnboarding
└── MainNavigator (bottom tabs)
    ├── CampusTab (home, settings, profile, campus info screens)
    ├── TaxiTab (party list, recruit, chat, location picker)
    ├── NoticeTab (notice list, detail, search)
    └── CommunityTab (board + public chat)
```

- Tab bar auto-hides on nested screens (`HIDDEN_BOTTOM_TAB_SCREENS` in `mainTabs.ts`)
- Custom animated tab bar: `AnimatedTabBar.tsx`
- Navigation ref for programmatic navigation: `navigationRef.ts`

### Real-time Communication

- **채팅**: STOMP WebSocket — 연결 옵션은 `src/shared/realtime/chatSocketClient.ts`, native transport는 `minimalStompClient.ts`
- **알림**: SSE — `src/shared/realtime/sseClient.ts`
- **API**: Axios HTTP client — `src/shared/api/httpClient.ts` (Firebase ID token as Authorization header)

### Global Context Providers

`AppProviders.tsx`에서 래핑 순서: `RepositoryProvider` → `AuthProvider` → `MyPartyProvider`

### Data Freshness / Cache Invalidation

- `src/app/data-freshness/dataInvalidation.ts` — 화면 복귀 시 route 기반 캐시 무효화
- `invalidationKeys.ts` — route별 재조회 대상 정의

## Development Guidelines

1. **Architecture decisions**: `docs/spring-migration/frontend-architecture-guideline.md` 참고 — Repository vs Query/Assembler 구분, DI 정책, 레이어별 책임이 정의됨
2. **Firestore schema changes**: `docs/references/legacy/firestore-data-structure.md` 참고 (legacy 참조용)
3. **API contract**: `docs/spring-migration/api-specification.md` 참고
4. **Lint check**: 기능 수정/추가/삭제 후 `npm run lint` 실행 필수 — warning도 무시하지 말 것
5. **Ambiguous requirements**: 임의 결정 대신 확인 질문 리스트를 우선순위와 Best Practice 추천안과 함께 제시
6. **New data access code**: Repository(도메인 CRUD) vs Query/Assembler(화면 조합) vs Hook(UI 상태) 구분하여 작성
7. **서버 DTO를 hook/screen으로 직접 올리지 않는다** — 반드시 mapper를 거쳐 도메인 모델로 변환

## Testing

- Jest + `@testing-library/react-native`
- Firebase/RN 모듈 mock: `jest.setup.js`
- Coverage threshold: global 60% (`jest.config.js`의 현재 설정을 기준으로 확인)
- Test 위치: feature 내부 `__tests__/` 디렉토리 (colocated)

## Key Documentation

- `docs/project/project-overview.md` — 프로젝트 종합 문서
- `docs/spring-migration/frontend-architecture-guideline.md` — 프론트엔드 아키텍처 가이드 (필독)
- `docs/spring-migration/api-specification.md` — REST API 명세
- `docs/spring-migration/frontend-migration-status.md` — Spring 마이그레이션 현황
- `docs/spring-migration/frontend-api-coverage.md` — API 커버리지

## Firebase Configuration

- Android: `android/app/google-services.json`
- iOS: `ios/SKTaxi/GoogleService-Info.plist`
- Firebase는 Auth(로그인·토큰 발급) + FCM(푸시) + Analytics + Crashlytics 용도로만 사용

## 복잡한 질문이나 작업은 sequential-thinking mcp를 사용해서 step by step으로 문제를 해결해줘.
## 설계, 개발, 리팩토링 시 Context7 mcp를 사용하여 현재 날짜 기준 최신의 개발 문서를 검색하여 최신의 검증된 코드를 작성해줘.
