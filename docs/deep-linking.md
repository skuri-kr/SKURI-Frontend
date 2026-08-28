# 앱 링크 운영 계약

SKURI는 공지, 이번 주 학식, 커뮤니티 게시글을 iOS Universal Links와 Android App Links로 연다.

## 도메인 역할

- `link.skuri.kr`: 사용자가 공유하는 공개 URL이다. 메모, 메시지 등 OS가 Universal Link/App Link를 전달하는 곳에서는 앱을 직접 연다.
- `open.skuri.kr`: `link.skuri.kr` 웹 fallback에서 사용자가 `스쿠리 앱에서 열기`를 눌렀을 때 사용하는 HTTPS handoff URL이다. Safari의 동일 도메인 탐색 규칙을 피하기 위해 공개 URL과 분리한다.
- `skuri://open`: 인앱 브라우저가 HTTPS 앱 링크를 전달하지 않을 때를 위한 보조 custom scheme이다. 공개 공유 URL로 사용하지 않는다.

두 HTTPS 도메인은 같은 경로 계약을 사용한다.

| 경로 | 앱 화면 |
| --- | --- |
| `/notice/{code}` | 학교 공지 상세 |
| `/cafeteria` | 이번 주 학식 |
| `/board/{code}` | 커뮤니티 게시글 상세 |

`code`는 백엔드 `POST /v1/share-links`가 발급하는 혼동 문자를 제외한 Base58 8자리다. 같은 원본은 같은 비만료 코드를 재사용한다. 기존 Base64/원본 ID 기반 긴 링크는 지원하지 않는다.

## 플랫폼 검증

- iOS 앱 entitlements에는 `applinks:link.skuri.kr`, `applinks:open.skuri.kr`을 모두 선언한다.
- 두 도메인은 각각 `/.well-known/apple-app-site-association`을 리다이렉트 없이 JSON으로 제공한다.
- Android manifest에는 두 호스트와 지원 경로를 모두 `android:autoVerify="true"`로 선언한다.
- 두 도메인은 각각 `/.well-known/assetlinks.json`을 제공한다.

## 앱 처리 순서

1. 앱이 실행 중이면 React Native `Linking`의 `url` 이벤트로 URL을 받는다.
2. 앱이 종료된 상태라면 `Linking.getInitialURL()`로 초기 URL을 받는다.
3. 로그인, 프로필, 온보딩이 완료되지 않았으면 대상 이동을 보류한다.
4. 메인 화면 진입이 가능해지면 공지·게시물 코드를 보호된 `GET /v1/share-links/{resourceType}/{code}/resolve`로 원본 ID에 해석한다. 학식은 해석 없이 이번 주 화면을 사용한다.
5. 해석이 끝난 시점에도 같은 요청이 최신이고 메인 화면이 준비된 경우에만 상세 화면으로 이동한다. 처리 중 새 링크가 들어오면 이전 결과와 오류 알림은 버린다.

React Native 내장 `URL` 구현은 custom scheme의 hostname 처리가 제한적이므로 `skuri://open`은 허용된 URL 형식을 직접 검증하고 query만 파싱한다.

## 확장 방법

새 공유 화면을 추가할 때 다음을 한 배포 단위로 변경한다.

1. 앱 URL intent 타입, 파서, 내비게이션
2. 백엔드 Share registry와 공개 preview projection
3. iOS AASA의 허용 경로
4. Android manifest와 asset links 대상 경로
5. 링크 웹의 경로 파서, 화면 문구, handoff URL
6. cold start, warm start, 로그인 대기, 미설치 fallback 테스트

앱이 새 경로를 처리하는 버전이 준비되기 전에 웹 검증 파일과 공유 버튼만 먼저 배포하지 않는다.

## 실기기 QA

- 메모 앱에서 `link.skuri.kr` 링크를 눌렀을 때 앱과 대상 화면이 직접 열린다.
- Safari 주소창으로 `link.skuri.kr`을 연 뒤 웹 버튼을 누르면 `open.skuri.kr`을 통해 대상 화면이 열린다.
- 앱이 종료된 상태와 백그라운드 상태를 각각 확인한다.
- 앱 미설치 상태에서는 웹 fallback과 스토어 이동을 확인한다.
- iOS에서 `open.skuri.kr`까지 웹으로 열린 경우 custom scheme을 다시 호출하지 않고 App Store 안내가 표시되는지 확인한다.
- Android에서 앱 열기 실패 시 intent의 Play Store fallback이 동작하는지 확인한다.
- 제3자 인앱 브라우저가 외부 앱 실행을 차단하면 링크 복사와 외부 브라우저 안내가 표시되는지 확인한다.

앱을 설치한 뒤 원래 콘텐츠를 자동 복원하는 deferred deep link는 제공하지 않는다.
