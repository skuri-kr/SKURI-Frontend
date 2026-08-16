# AI 작업 및 Git 전달 규칙

이 문서는 이 저장소에서 작업하는 모든 AI 에이전트의 Git·PR·리뷰 절차에 대한 기준이다. `CLAUDE.md` 등 다른 AI 안내 문서와 충돌하면 이 문서의 절차를 우선한다.

## SKURI 프로젝트 구성

SKURI는 서로 독립된 3개의 Git 저장소로 구성된다.

| 영역 | 로컬 경로 | 역할 |
| --- | --- | --- |
| 프론트엔드(모바일 앱) | `/Users/jisung/SKTaxi` | React Native 기반 사용자 앱 |
| 백엔드 | `/Users/jisung/skuri-backend` | Spring Boot 기반 REST API, 인증·권한, 비즈니스 규칙, DB, 실시간 통신 |
| 관리자 페이지 | `/Users/jisung/skuri-admin` | Next.js 기반 운영·관리 화면 |

- 세 디렉터리는 각각 독립된 Git 저장소다.
- 다른 저장소를 조사하거나 수정하기 전 해당 저장소의 `AGENTS.md`와 작업 트리 상태를 먼저 확인한다.
- 브랜치, commit, push, PR, 검증은 저장소별로 분리한다.
- 이 문서의 Git·PR 규칙은 `/Users/jisung/SKTaxi`에만 적용한다. 백엔드와 관리자 페이지에서는 각 저장소의 `AGENTS.md`가 우선한다.
- 핵심 도메인 데이터, 권한, 상태 전이, API 응답 계약의 런타임 source of truth는 백엔드다. 모바일 앱과 관리자 페이지는 백엔드 계약을 소비한다.

## 소스 탐색 가이드

### 프론트엔드(현재 저장소)

- 앱 초기화·Provider·Guard: `src/app/`
- 화면 이동·탭·스택: `src/app/navigation/`
- 기능별 화면·컴포넌트·상태·서비스: `src/features/<feature>/`
- 기능별 API·DTO·Mapper·Repository: `src/features/<feature>/data/`
- Repository 등록과 DI: `src/di/`
- 공통 HTTP·인증 토큰 처리: `src/shared/api/`
- SSE·WebSocket: `src/shared/realtime/`
- 공통 UI·디자인 토큰: `src/shared/ui/`, `src/shared/design-system/`
- Android/iOS 네이티브 설정: `android/`, `ios/`

기능은 일반적으로 `Screen → Component/Hook → Service/Application → Repository → API client/DTO/Mapper` 순서로 추적한다. 모든 feature가 같은 하위 디렉터리를 갖는다고 가정하지 말고 실제 구조를 확인한다.

### 백엔드

기능별 기준 경로는 `/Users/jisung/skuri-backend/src/main/java/com/skuri/skuri_backend/domain/<domain>/`이다.

- HTTP 진입점: `controller/`
- 요청·응답 계약: `dto/request/`, `dto/response/`
- 비즈니스 규칙: `service/`
- DB 모델과 상태 전이: `entity/`
- DB 접근: `repository/`
- 공통 응답·예외·설정: `/Users/jisung/skuri-backend/src/main/java/com/skuri/skuri_backend/common/`
- 인증·권한: `/Users/jisung/skuri-backend/src/main/java/com/skuri/skuri_backend/infra/auth/`
- OpenAPI 예시·스키마: `/Users/jisung/skuri-backend/src/main/java/com/skuri/skuri_backend/infra/openapi/`
- 환경 설정: `/Users/jisung/skuri-backend/src/main/resources/application*.yaml`
- 테스트: `/Users/jisung/skuri-backend/src/test/java/`
- 문서화된 API 계약: `/Users/jisung/skuri-backend/docs/api-specification.md`

### 관리자 페이지

- 라우트와 화면: `/Users/jisung/skuri-admin/src/app/(admin)/<module>/page.tsx`
- 관리자 기능 컴포넌트: `/Users/jisung/skuri-admin/src/components/admin/`
- 공통 UI: `/Users/jisung/skuri-admin/src/components/ui/`
- 관리자 타입·모듈 정의: `/Users/jisung/skuri-admin/src/features/admin/`, `/Users/jisung/skuri-admin/src/lib/admin/`
- 인증 상태: `/Users/jisung/skuri-admin/src/features/auth/`
- 공통 API 인증 요청: `/Users/jisung/skuri-admin/src/lib/api/`
- Firebase 로그인: `/Users/jisung/skuri-admin/src/lib/firebase/`
- 환경 변수 접근: `/Users/jisung/skuri-admin/src/lib/env/`

관리자 페이지의 일부 API 호출과 화면 전용 타입은 현재 각 `page.tsx`에 함께 있으므로 공통 API 디렉터리에만 구현이 있을 것으로 가정하지 않는다.

## 저장소 간 변경 영향 확인

- API 요청·응답 필드 또는 오류 계약 변경: 백엔드 Controller/DTO/Service/OpenAPI/테스트와 모바일·관리자 소비 코드를 함께 확인한다.
- 권한·상태 전이·비즈니스 정책 변경: 백엔드를 기준으로 구현하고 모바일·관리자의 노출, 입력 제한, 오류 처리를 확인한다.
- 관리자 운영 기능 변경: 관리자 화면뿐 아니라 대응하는 `/v1/admin/**` 백엔드 API를 확인한다.
- 인증 변경: 모바일 Firebase 인증, 백엔드 토큰 검증, 관리자 로그인을 모두 확인한다.
- 실시간 기능 변경: 모바일 `src/shared/realtime/` 및 관련 feature와 백엔드 WebSocket/SSE 구현을 함께 확인한다.
- 네이티브 기능·권한·빌드 변경: TypeScript 코드뿐 아니라 `android/`, `ios/` 설정도 확인한다.
- 앱 의존성 변경: `package.json` 수정 전에 `patches/README.md`를 확인한다.

## 저장소별 도메인 이름 대응

같은 기능이라도 저장소별 디렉터리 이름이 다를 수 있다.

| 기능 | 모바일 앱 | 백엔드 | 관리자 페이지 |
| --- | --- | --- | --- |
| 택시 파티 | `features/taxi` | `domain/taxiparty` | `parties` |
| 사용자·인증 | `features/member`, `features/user`, `features/auth` | `domain/member`, `infra/auth` | `users`, `features/auth` |
| 문의 | `features/settings` | `domain/support` | `inquiries` |
| 신고 | `features/report` 및 기능별 report service | `domain/support` | `reports` |
| 학교 공지 | `features/notice` | `domain/notice` | `notices` |
| 앱 공지 | `features/settings` | `domain/app` | `app-notices` |
| 캠퍼스 정보 | `features/campus`, `features/timetable` | `domain/campus`, `domain/academic`, `domain/support` | `campus-banners`, `academic-schedules`, `cafeteria`, `courses` |

- 정확한 파일 위치를 추측하지 말고 기능명, API 경로, DTO명으로 `rg` 검색하여 호출 흐름을 추적한다.
- 일반 소스 탐색에서는 `node_modules/`, `.next/`, `build/`, `bin/`, `ios/Pods/`, `android/.gradle/`, `output/` 등 의존성·생성물을 제외한다.
- `.env`, Firebase 설정 파일, 서비스 계정 파일 등 비밀정보의 실제 값을 읽거나 문서·로그·커밋에 복사하지 않는다.
- 라이브러리·런타임·앱 버전은 문서의 고정 숫자를 신뢰하지 말고 `package.json`, lockfile, Gradle/Xcode 설정 등 현재 매니페스트에서 확인한다.

## 기본 작업 방식

- 읽기 전용 조사, 설명, 상태 보고처럼 저장소를 수정하지 않는 작업에는 브랜치가 필요 없다.
- 저장소를 수정하는 모든 일반 작업은 최신 `origin/main`에서 별도의 작업 브랜치로 시작한다.
- 작업 전에는 `git fetch origin --prune`으로 원격 상태를 갱신하고, 로컬 `main`을 최신 `origin/main`과 일치시킨다.
- 작업 트리가 혼합되어 있으면 관련 없는 변경을 건드리지 않는다. 분리할 수 없으면 사용자에게 범위를 확인한다.
- 작업 브랜치는 `agent/<작업-설명>` 형식으로 만든다. 사용자 요청 없이 `main`에서 코드를 수정하거나 commit/push하지 않는다.

## 작은 변경의 예외 확인

AI가 작은 변경이라고 판단해도, 스스로 브랜치·PR 절차를 생략해서는 안 된다.

다음 질문으로 먼저 사용자 승인을 받는다.

> 작은 변경으로 판단했습니다. 별도 브랜치와 PR 없이 `main`에 직접 commit/push할까요?

- 사용자가 명시적으로 승인한 경우에만 `main` 직접 작업을 진행한다.
- 사용자가 처음부터 `별도 브랜치는 만들지 말고 main에 직접 commit/push해`처럼 직접 작업을 명시한 경우에도, 최신·깨끗한 `main`인지 확인한 뒤에만 진행한다.
- 승인하지 않았거나 변경 범위가 모호하면 기본 작업 브랜치·PR 절차를 따른다.
- `main` 직접 push가 보호 규칙으로 거절되면 우회하지 않는다. 사용자에게 알리고 작업 브랜치와 PR 절차로 전환한다.

## 커밋과 PR

- 변경은 검토 가능한 작은 단위로 나눈다. 한 커밋에는 한 가지 목적만 담는다.
- Conventional Commit을 사용한다. 타입은 영어(`feat`, `fix`, `refactor`, `test`, `docs`, `chore` 등)로, 나머지 메시지는 한국어로 작성한다.
- 관련 테스트·타입 검사·린트 등 적절한 검증을 수행하고, 실행하지 못한 수동 검증은 PR 본문에 분명히 남긴다.
- 작업 브랜치를 원격에 push하고 `main` 대상 PR을 **Ready for review** 상태로 만든다. 사용자가 초안 PR을 명시적으로 요청한 경우에만 Draft로 생성한다. PR 본문에는 변경 내용, 변경 이유 또는 원인, 사용자 영향, 검증 결과를 포함한다.
- 저장소에 PR 템플릿이 있으면 그 형식을 따른다. 적절한 PR 라벨도 적용한다.

## 의존성 패치 관리

- `package.json`의 의존성을 업데이트하기 전에 `patches/README.md`를 확인한다.
- 패치된 라이브러리는 upstream 정식 배포에 수정이 포함됐는지 확인하고, 문서의 제거 조건과 실기기 검증을 통과한 경우에만 패치를 제거한다.
- `postinstall` 패치 실패를 무시하거나 우회하지 않는다.

## PR 리뷰 반복 절차

- 사용자가 Codex AI 자동 리뷰를 포함한 PR 리뷰가 도착했다고 알리면, 먼저 각 리뷰가 타당한지 코드와 요구사항 기준으로 판단한다.
- 리뷰가 타당하든 타당하지 않든, 수정 필요 여부와 근거, 수정·재검증 계획을 사용자에게 먼저 보고하고 승인을 기다린다.
- 사용자 승인 전에는 리뷰 대응 코드 수정, commit, push를 하지 않는다.
- 승인 후에는 같은 작업 브랜치와 같은 PR에서 수정·검증·commit·push를 진행한다.
- 새 리뷰가 오면 이 절차를 반복한다.

## 병합 및 정리

- 리뷰가 없더라도 사용자의 명시적인 병합 승인 전에는 PR을 `main`에 병합하지 않는다.
- 병합 승인 후에는 PR 상태와 병합 가능 여부를 확인한 뒤 병합한다.
- 병합이 끝나면 해당 작업 브랜치만 로컬과 원격에서 삭제한다. 다른 작업 브랜치, worktree, stash는 사용자의 별도 명시 승인 없이는 삭제하지 않는다.
- 마지막으로 `git fetch origin --prune`을 실행하고, 로컬 `main`을 원격 `origin/main`과 일치시킨다.
- `HEAD == origin/main`, 작업 트리 상태, 로컬·원격 브랜치 목록을 확인해 최신 `main` 상태를 사용자에게 보고한다.
