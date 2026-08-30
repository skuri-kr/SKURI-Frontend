# SKURI Taxi

> 성결대학교 학생을 위한 택시 동승, 공지, 커뮤니티, 채팅, 캠퍼스 생활 정보 통합 모바일 앱

![React Native](https://img.shields.io/badge/React_Native-0.85.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript&logoColor=white)
![Spring API](https://img.shields.io/badge/Backend-Spring%20Boot-6DB33F?logo=spring&logoColor=white)
![Firebase Auth](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)
![Version](https://img.shields.io/badge/version-2.0.1-blue)

<p>
  <a href="https://apps.apple.com/kr/app/스쿠리-skuri/id6754636203">
    <img src="https://img.shields.io/badge/App_Store-Download-0D96F6?logo=app-store&logoColor=white" alt="App Store" />
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.jisung.sktaxi">
    <img src="https://img.shields.io/badge/Google_Play-Download-414141?logo=google-play&logoColor=white" alt="Google Play" />
  </a>
</p>

---

## 프로젝트 소개

SKURI Taxi는 성결대학교 학생을 위한 캠퍼스 라이프 앱이다.

- 택시 동승: 파티 생성/참여, 실시간 상태 동기화, 파티 채팅, 정산
- 학교 공지: 공지 목록/상세, 읽음/좋아요/댓글
- 커뮤니티: 게시글, 댓글, 좋아요, 북마크, 이미지 첨부
- 채팅: 공개 채팅방, 파티 채팅, 마인크래프트 공개방 연동
- 캠퍼스 정보: 시간표, 학사 일정, 학식, 캠퍼스 배너, 마인크래프트 서버 정보

대상 사용자는 `@sungkyul.ac.kr` 계정을 가진 성결대학교 학생이다.

## 현재 아키텍처

이 저장소는 React Native 앱 저장소다. 핵심 도메인 데이터의 런타임 source of truth는 Spring 백엔드(`/Users/jisung/skuri-backend`)이며, 프론트는 REST + SSE + STOMP 조합으로 서버 상태를 반영한다.

Firebase는 완전히 제거된 것이 아니라 다음 용도로 계속 사용한다.

- Firebase Auth: 로그인 및 Firebase ID Token 발급
- Firebase Messaging: 디바이스 권한/토큰 관리
- Firebase Analytics / Crashlytics: 앱 분석과 오류 수집

즉, 현재 구조는 "Firebase 직접 CRUD 앱"이 아니라 "Firebase 인증을 유지한 React Native + Spring API 앱"이다.

## 기술 스택

### 프론트엔드

- React Native `0.85.3`
- React `19.2.3`
- TypeScript `5.8.3`
- React Navigation v7
- Axios 기반 HTTP client
- SSE(`xhrSseStream`) + native WebSocket 기반 STOMP(`MinimalStompClient`) 실시간 통신
- Reanimated, Gesture Handler, Gorhom Bottom Sheet
- react-native-maps, react-native-webview, react-native-image-picker

### 백엔드 연동

- 기본 REST base URL: `https://api.skuri.kr`
- WebSocket endpoint: `/ws` + RN native `/ws-native`
- 인증: `Authorization: Bearer <firebase_id_token>`
- 자세한 서버 구현/운영 문서: `/Users/jisung/skuri-backend/README.md`

## 저장소 구조

```text
src/
├── app/              앱 bootstrap, guards, navigation, providers
├── di/               Repository DI 경계
├── features/         auth, taxi, chat, board, notice, campus, minecraft, user 등
├── shared/           공용 API, realtime, hooks, UI, design system, firebase wrapper
└── ...

docs/
├── admob-store-privacy-submission-checklist.md AdMob 앱 버전 제출 전 스토어 개인정보 공개 체크리스트
├── project/          프로젝트 개요 문서
├── spring-migration/ Spring 전환/계약/운영 문서
├── references/legacy 레거시 Firebase 구조/운영 스크립트 참고자료
└── 법적문서/         약관/개인정보처리방침 등
```

현재 기본 repository wiring은 대부분 Spring 구현을 사용한다. 예외는 인증(`FirebaseAuthRepository`)과 일부 feature-local composition helper뿐이다.

## 개발 환경

### 사전 요건

- Node.js `^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0` (`package.json` 기준)
- npm (`package-lock.json` 사용)
- Java 21
- Android Studio / Android SDK
- Xcode, CocoaPods, Bundler
- 실행 중인 백엔드(로컬 또는 운영)
