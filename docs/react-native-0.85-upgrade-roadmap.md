# React Native 0.85 Upgrade Migration Runbook

작성일: 2026-05-19
대상: `react-native@0.79.2`에서 `react-native@0.85.3`로 업그레이드
용도: AI가 마이그레이션을 수행할 때 참고할 실행 지침

## 목표

이 문서는 개념 설명용 문서가 아니다. RN 0.85 업그레이드를 수행하는 AI는 아래 결정사항, 작업 순서, 검증 기준을 그대로 따른다.

현재 기준선:

- `react-native`: `0.79.2`
- `react`: `19.0.0`
- `Node`: `v22.20.0` 확인됨. RN 0.85 npm engine 조건 충족.
- `Xcode`: `26.5` 확인됨.
- `android/gradle.properties`: `newArchEnabled=true`, `hermesEnabled=true`
- 패키지 매니저: npm, `package-lock.json` 사용

핵심 방향:

- RN 0.82부터 New Architecture가 유일한 런타임이다. `newArchEnabled=true`는 유지한다.
- RN 0.85 템플릿 차이는 Upgrade Helper 기준으로 반영하되, 프로젝트 커스텀 설정은 보존한다.
- 네이티브 의존성 변경은 빌드 가능성을 우선한다. 이 문서에서 명시한 네이티브 의존성은 이번 작업에 포함하고, 그 외 major 업데이트는 꼭 필요한 경우만 포함한다.
- `react-native-bootsplash` 7.x major 업데이트는 이번 RN 업그레이드에서 제외하고 후속 작업으로 분리한다.

## 확정 결정사항

| 항목 | 결정 | 실행 지침 |
| --- | --- | --- |
| `react-native-linear-gradient` | 유지 후 검증 | RN 0.85에서 먼저 빌드/렌더 QA를 한다. 선제적으로 `expo-linear-gradient`로 바꾸지 않는다. |
| `react-native-immersive-mode` | 제거 | 코드베이스 사용처는 `src/app/bootstrap/useAppBootstrap.ts`의 `ImmersiveMode.setBarMode('Normal')` 한 곳뿐이다. 업그레이드 중 의존성, import, 호출을 제거한다. |
| `react-native-tracking-transparency` | `react-native-permissions`로 교체 | iOS ATT 권한 요청은 `PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY`로 구현한다. 기존 상태값과 새 상태값 매핑을 명시적으로 둔다. |
| `react-native-bootsplash` | 6.x 유지 | RN 업그레이드 중 7.x로 올리지 않는다. 현재 설정과 asset이 계속 동작하는지만 확인한다. |
| `react-native-maps` patch | 제거 목표 | RN 0.85 및 `react-native-maps` 1.26.1+ 조건 충족 후 `patches/react-native-maps+1.26.18.patch` 제거를 우선 시도한다. 제거 후 남는 패치가 없으면 `patch-package`도 제거한다. |

## 사전 조사 결과

### `react-native-immersive-mode`

검색 범위:

- JS/TS: `src`
- Android native: `android`
- iOS native: `ios`
- 설정: `package.json`, `package-lock.json`, `app.json`
- 제외: `node_modules`, `ios/Pods`, `android/.gradle`

확인된 실제 사용처:

- `src/app/bootstrap/useAppBootstrap.ts`
  - `import ImmersiveMode from 'react-native-immersive-mode';`
  - Android에서 `ImmersiveMode.setBarMode('Normal');`

판단:

- 앱 기능 구현에 쓰이는 몰입 모드, 전체화면 모드, 네비게이션 바 숨김 로직은 확인되지 않았다.
- `setBarMode('Normal')`은 시스템 바를 일반 모드로 되돌리는 호출이라 제거 리스크는 낮다.
- 제거 후 Android에서 splash 이후 상태바/네비게이션 바가 정상 표시되는지 QA한다.

제거 작업:

- `package.json`에서 `react-native-immersive-mode` 제거
- `package-lock.json` 갱신
- `src/app/bootstrap/useAppBootstrap.ts`에서 import와 Android 분기 제거
- `npm install` 후 autolinking 결과 확인

### `react-native-tracking-transparency`

현재 사용처:

- `package.json`
- `ios/Podfile.lock`
- `src/shared/lib/permissions/att.ts`
- `src/features/auth/screens/PermissionOnboardingScreen.tsx`
- `ios/SKTaxi/Info.plist`의 `NSUserTrackingUsageDescription`

교체 방침:

- `react-native-tracking-transparency` 제거
- `react-native-permissions` 추가
- iOS Podfile에 `node_require('react-native-permissions/scripts/setup.rb')`를 추가하고 `setup_permissions(['AppTrackingTransparency'])`를 호출
- `NSUserTrackingUsageDescription`은 유지
- ATT 온보딩 화면 흐름은 유지

Podfile 설정 규칙:

- 현재 Podfile 상단의 `react_native_pods.rb` require를 공식 README 형태의 `node_require(script)` helper로 바꾼다.
- 같은 helper로 `react-native/scripts/react_native_pods.rb`와 `react-native-permissions/scripts/setup.rb`를 모두 require한다.
- `prepare_react_native_project!` 이후, target 블록 전에 `setup_permissions(['AppTrackingTransparency'])`를 호출한다.

상태값 매핑 지침:

기존 내부 타입은 유지할 수 있다.

```ts
type TrackingStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'not-determined'
  | 'unavailable';
```

`react-native-permissions` 결과 매핑:

| `react-native-permissions` 결과 | 기존 `TrackingStatus` | 처리 |
| --- | --- | --- |
| `RESULTS.GRANTED` | `authorized` | 추적 허용 |
| `RESULTS.UNAVAILABLE` | `unavailable` | API/기기/플랫폼 미지원 |
| `RESULTS.BLOCKED` | `denied` | 재요청 불가 상태. UI에서는 설정 이동이 필요한 상태로 취급 |
| `RESULTS.DENIED` before request | `not-determined` | 아직 요청 가능하다고 보고 `request` 호출 |
| `RESULTS.DENIED` after request | `denied` | 사용자가 거부한 상태로 취급 |
| `RESULTS.LIMITED` | `unavailable` | ATT에는 일반적으로 해당하지 않는다. 허용으로 처리하지 않는다 |

구현 규칙:

- `getATTPermissionStatus()`는 `check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY)`만 호출한다.
- `requestATTPermission()`은 먼저 `check`를 호출하고, `DENIED`일 때만 `request`를 호출한다.
- Android는 기존처럼 `unavailable`을 반환한다.
- 온보딩은 권한 결과와 무관하게 다음 단계로 이동하는 현재 UX를 유지한다.
- `react-native-permissions`만으로는 기존 `restricted` 상태를 안정적으로 구분하지 못한다. 별도 네이티브 wrapper를 만들지 않는 한 `restricted`는 반환하지 않는다.

### `react-native-bootsplash`

현재 실제 사용처:

- JS: `src/app/navigation/AppNavigation.tsx`
- Android: `android/app/src/main/java/com/jisung/sktaxi/MainActivity.kt`, `android/app/src/main/res/values/styles.xml`
- iOS: `ios/SKTaxi/AppDelegate.swift`, `ios/SKTaxi/BootSplash.storyboard`, `ios/SKTaxi/Info.plist`

방침:

- 이번 RN 업그레이드에서는 `react-native-bootsplash@6.3.12`를 유지한다.
- RN 0.85 빌드에 실패하지 않는 한 7.x 변경, asset 재생성, splash 리디자인을 하지 않는다.
- 7.x 업데이트는 별도 major dependency 작업으로 분리한다.

### `react-native-maps`

현재 상태:

- `react-native-maps@1.26.18`
- `patches/react-native-maps+1.26.18.patch` 존재
- 앱 사용처는 택시 지도 화면 중심이다.

방침:

- `react-native-maps`는 RN 0.85와 호환되는 최신 안정 버전으로 올린다.
- 기존 patch-package 패치는 제거를 우선한다.
- 패치 파일에 `android/bin`, `.class`, generated JNI/C++ 산출물이 포함되어 있으므로 새 버전에 가져가지 않는다.
- `android/gradle.properties`의 `newArchEnabled=true`는 유지한다. 일부 라이브러리 Gradle 스크립트가 이 값을 직접 읽는다.
- 현재 `patches/`에는 `react-native-maps+1.26.18.patch`만 있다. 이 패치를 제거한 뒤 새 패치가 생기지 않으면 `package.json`의 `postinstall: patch-package`와 `devDependencies.patch-package`도 제거한다.

필수 QA:

- `TaxiScreen`
- `TaxiLocationPickerScreen`
- `MapView`
- `Marker`
- `fitToCoordinates`
- 현재 위치 표시와 지도 자동 줌

## 버전 업데이트 지침

실제 작업 직전 `npm view`로 최신 안정 버전을 다시 확인한다. 아래 버전은 2026-05-19 조사 기준이다.

### RN 코어

| 패키지 | 목표 |
| --- | --- |
| `react-native` | `0.85.3` |
| `react` | `19.2.3` |
| `react-test-renderer` | `19.2.3` |
| `@types/react` | RN package peer 최소 `^19.1.1`, RN 0.85.3 템플릿 기준 `^19.2.0` |
| `@types/react-test-renderer` | RN 0.85.3 템플릿 기준 `^19.1.0` |
| `typescript` | RN 0.85.3 템플릿 기준 `^5.8.3` |
| `@react-native/babel-preset` | `0.85.3` |
| `@react-native/eslint-config` | `0.85.3` |
| `@react-native/metro-config` | `0.85.3` |
| `@react-native/typescript-config` | `0.85.3` |
| `@react-native/jest-preset` | `0.85.3` |
| `@react-native-community/cli` | RN 0.85.3 템플릿 기준 `20.1.0` |
| `@react-native-community/cli-platform-android` | RN 0.85.3 템플릿 기준 `20.1.0` |
| `@react-native-community/cli-platform-ios` | RN 0.85.3 템플릿 기준 `20.1.0` |

### 필수 네이티브 의존성

아래 패키지는 표의 적용 Phase에서 실제로 업데이트한다.

| 패키지 | 목표 | 적용 Phase | 지침 |
| --- | --- | --- | --- |
| `react-native-reanimated` | `4.3.x` | Phase 2.5 | RN 0.85 호환 조합. `react-native-worklets`도 추가 |
| `react-native-worklets` | `0.8.x` | Phase 2.5 | Reanimated 4 요구사항. 설치 후 `babel.config.js` 마지막 plugin을 `react-native-worklets/plugin`으로 교체 |
| `react-native-gesture-handler` | 최신 안정 | Phase 2.5 | BottomSheet/Reanimated와 함께 검증 |
| `react-native-screens` | 최신 안정 | Phase 2.5 | Navigation stack QA |
| `react-native-safe-area-context` | 최신 안정 | Phase 2.5 | Android edge-to-edge QA |
| `@gorhom/bottom-sheet` | 최신 안정 | Phase 2.5 | Reanimated 4 조합 QA |
| `react-native-maps` | 최신 안정 | Phase 2.5 | 기존 patch 제거 후 업데이트, 지도 QA |
| `react-native-permissions` | 최신 안정 | Phase 2 | ATT 교체용 신규 의존성 |
| `@react-native-clipboard/clipboard` | 최신 안정 | Phase 3 | core `Clipboard` 제거 대응 |

### 업데이트하되 별도 리스크를 기록할 의존성

아래 패키지도 이번 RN 0.85 작업에 포함하고 Phase 2.5에서 업데이트한다. 단, 각 패키지는 빌드/QA 실패 시 원인 추적이 가능하도록 실패 기록에 개별 패키지명을 남긴다.

| 패키지 | 지침 |
| --- | --- |
| `@react-native-firebase/*` | 모든 Firebase 패키지를 같은 버전으로 통일 |
| `@react-native-google-signin/google-signin` | 최신 안정으로 업데이트 후 로그인 QA |
| `@react-native-async-storage/async-storage` | 최신 안정으로 업데이트 |
| `react-native-device-info` | 최신 안정으로 업데이트 후 `getVersion()` QA |
| `react-native-svg` | 최신 안정으로 업데이트 후 SVG 렌더 QA |
| `react-native-vector-icons` | 최신 안정으로 업데이트 후 아이콘/폰트 QA |
| `react-native-webview` | 최신 안정으로 업데이트 후 공지/WebView QA |

### 유지 또는 제거

| 패키지 | 처리 |
| --- | --- |
| `react-native-linear-gradient` | 유지. RN 0.85에서 빌드/렌더 실패 시에만 대체 검토 |
| `react-native-bootsplash` | 6.x 유지. 7.x는 후속 작업 |
| `react-native-immersive-mode` | 제거 |
| `react-native-tracking-transparency` | 제거하고 `react-native-permissions`로 교체 |

## Upgrade Helper 적용 지침

공식 업그레이드 문서와 Upgrade Helper diff를 기준으로 `0.79.2 -> 0.85.3` 차이를 반영한다.

반영 우선 파일:

- `package.json`
- `android/build.gradle`
- `android/settings.gradle`
- `android/app/build.gradle`
- `android/app/src/main/java/com/jisung/sktaxi/MainApplication.kt`
- `android/app/src/main/java/com/jisung/sktaxi/MainActivity.kt`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/gradle.properties`
- `android/gradle/wrapper/gradle-wrapper.properties`
- `ios/Podfile`
- iOS AppDelegate 관련 파일
- `jest.config.js`
- `babel.config.js`
- `metro.config.js`
- `tsconfig.json`
- `Gemfile`
- `Gemfile.lock`

보존해야 하는 프로젝트 커스텀 설정:

- Firebase/Crashlytics/Google services Gradle 설정
- Android signing config
- `MainApplication.kt`의 알림 채널 생성 로직
- `ios/Podfile`의 `use_frameworks! :linkage => :static`
- path alias 설정: Babel, TypeScript, Jest
- BootSplash native 설정
- Google Maps API 설정
- 앱 아이콘, splash, Firebase plist/json, 권한 문구

주의:

- Upgrade Helper는 자동 마이그레이션 도구가 아니다. 템플릿 diff를 그대로 덮어쓰지 말고 현재 프로젝트 설정과 병합한다.
- `newArchEnabled=true`는 제거하지 않는다.

### Android entrypoint 병합 규칙

`MainApplication.kt`는 RN 0.85 템플릿 구조로 병합한다.

- `com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative`를 사용한다.
- `onCreate()`에서는 `super.onCreate()` 후 프로젝트의 `createNotificationChannels()`를 호출하고, 이어서 `loadReactNative(this)`를 호출한다.
- 기존 `DefaultNewArchitectureEntryPoint.load()`와 `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` 분기 기반 로딩은 RN 0.85 템플릿 구조로 대체한다.
- RN 0.85 템플릿의 `ReactHost`/`PackageList` 구조를 기준으로 하되, 프로젝트에 수동 추가 패키지가 생기면 `PackageList(this).packages.apply { ... }` 블록 안에 병합한다.

`MainActivity.kt`는 RN 0.85 템플릿과 병합하되 BootSplash 설정을 보존한다.

- `RNBootSplash.init(this, R.style.BootTheme)` 호출은 유지한다.
- `super.onCreate(null)` 호출은 유지한다.
- `DefaultReactActivityDelegate(..., fabricEnabled)` 구조는 RN 0.85 템플릿 기준으로 맞춘다.

## 마이그레이션 순서

### Phase 0. 기준선 기록

명령:

```sh
git status --short
node -v
npm -v
xcodebuild -version
pod --version
java -version
npx react-native doctor
```

가능하면 현재 상태 빌드 로그도 확보한다.

```sh
npx react-native run-ios --device "Louis iPhone"
cd android && ./gradlew assembleDebug
```

완료 기준:

- 현재 실패가 RN 0.79 + Xcode 26.5 조합의 실패인지, 업그레이드 후 새 실패인지 구분할 수 있는 로그가 있다.
- 작업 브랜치가 분리되어 있다.

### Phase 1. 템플릿과 코어 패키지 업데이트

작업:

- Upgrade Helper diff 반영
- RN 코어 패키지 업데이트
- `react`, `react-test-renderer`, `@types/react`, `@types/react-test-renderer`, `typescript`를 RN 0.85.3 템플릿 조합으로 갱신
- `@react-native-community/cli`, `@react-native-community/cli-platform-android`, `@react-native-community/cli-platform-ios`를 RN 0.85.3 템플릿 조합으로 갱신
- `@react-native/jest-preset` 추가
- `jest.config.js` preset 변경
- `tsconfig.json`의 `extends`를 `@react-native/typescript-config`로 변경
- TypeScript path alias, `baseUrl`, `paths`, Jest type 설정은 보존
- `package.json`의 `engines.node`를 RN 0.85.3 npm metadata 기준 `"^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0"`로 갱신

완료 기준:

- `npm install` 성공
- lockfile 갱신
- peer/dependency 충돌 없음
- `tsconfig.json`이 `@react-native/typescript-config/tsconfig.json` 서브패스를 직접 참조하지 않음
- `node -v`가 `engines.node` 범위를 만족함. 현재 확인된 `v22.20.0`은 조건을 만족한다

### Phase 2. 결정된 의존성 정리

작업:

- `react-native-immersive-mode` 제거
- `src/app/bootstrap/useAppBootstrap.ts`에서 `ImmersiveMode` import와 호출 제거
- `react-native-tracking-transparency` 제거
- `react-native-permissions` 추가
- `src/shared/lib/permissions/att.ts`를 `react-native-permissions` 기반으로 교체
- `ios/Podfile`에 `node_require('react-native-permissions/scripts/setup.rb')` 추가
- `setup_permissions(['AppTrackingTransparency'])` 추가
- npm 의존성 변경 후 `npm install` 실행

완료 기준:

- `package-lock.json` 갱신
- `rg "react-native-immersive-mode|ImmersiveMode|setBarMode" src android ios package.json` 결과가 문서 외 0건
- `rg "react-native-tracking-transparency" src package.json ios/Podfile` 결과가 문서 외 0건
- `rg "APP_TRACKING_TRANSPARENCY|react-native-permissions" src ios/Podfile package.json`에서 새 구현 확인

### Phase 2.5. 네이티브 의존성 호환 업데이트

작업 순서:

1. `react-native-maps` 업데이트 전 `patches/react-native-maps+1.26.18.patch`를 먼저 제거한다.
2. 패치 제거 후 `patches/`에 남는 패치 파일이 없으면 `package.json`의 `postinstall: patch-package`와 `devDependencies.patch-package`를 제거한다.
3. 작업 직전 `npm view`로 아래 패키지의 최신 안정 버전을 확인한다.
4. `package.json`에서 필수 네이티브 의존성을 갱신한다.
5. `package.json`에서 별도 리스크 기록 대상 의존성을 갱신한다.
6. `npm install`을 실행해 `package-lock.json`을 갱신한다.
7. Reanimated 4와 `react-native-worklets` 설치가 lockfile에 반영된 뒤 `babel.config.js`의 `react-native-reanimated/plugin`을 `react-native-worklets/plugin`으로 교체한다.
8. `react-native-worklets/plugin`은 Babel plugin 배열의 마지막 항목으로 둔다.

필수 네이티브 의존성:

- `react-native-reanimated@4.3.x`
- `react-native-worklets@0.8.x`
- `react-native-gesture-handler`
- `react-native-screens`
- `react-native-safe-area-context`
- `@gorhom/bottom-sheet`
- `react-native-maps`

이번 작업에 포함할 리스크 기록 대상 의존성:

- `@react-native-firebase/*`
- `@react-native-google-signin/google-signin`
- `@react-native-async-storage/async-storage`
- `react-native-device-info`
- `react-native-svg`
- `react-native-vector-icons`
- `react-native-webview`

완료 기준:

- `package-lock.json` 갱신
- `patches/react-native-maps+1.26.18.patch` 제거됨
- 남은 패치 파일이 없을 때 `rg "patch-package" package.json` 결과 0건
- `rg "react-native-reanimated/plugin" babel.config.js` 결과 0건
- `babel.config.js`의 마지막 plugin이 `react-native-worklets/plugin`
- `npm ls react-native-reanimated react-native-worklets react-native-maps`에서 설치 버전 확인

### Phase 3. RN 0.85 제거/변경 API 대응

작업:

- `StyleSheet.absoluteFillObject` 전부 교체
- `jest.config.js`의 `preset: 'react-native'`를 `preset: '@react-native/jest-preset'`으로 교체
- `@react-native-clipboard/clipboard` 추가
- core `Clipboard` import를 `@react-native-clipboard/clipboard` default import로 교체
- npm 의존성 변경 후 `npm install` 실행

현재 확인된 `StyleSheet.absoluteFillObject` 사용처:

- `src/shared/ui/ReportReasonModal.tsx`
- `src/shared/design-system/components/SelectionDropdown.tsx`
- `src/shared/ui/PopupMenu.tsx`
- `src/shared/design-system/components/SkeletonImage.tsx`
- `src/features/timetable/components/TimetableAllViewCard.tsx`
- `src/features/minecraft/components/MinecraftStackHeader.tsx`
- `src/features/taxi/screens/TaxiLocationPickerScreen.tsx`
- `src/features/taxi/screens/TaxiScreen.tsx`
- `src/features/taxi/components/TaxiAcceptancePendingStatus.tsx`

현재 확인된 core `Clipboard` 사용처:

- `src/features/taxi/components/TaxiChatMessageList.tsx`
- `src/features/taxi/screens/ChatScreen.tsx`
- `src/features/chat/screens/ChatDetailScreen.tsx`
- `src/features/minecraft/screens/MinecraftDetailScreen.tsx`

교체 규칙:

- 타입 문제가 없으면 `StyleSheet.absoluteFill` 사용
- spread 타입 문제가 있으면 명시 객체 사용

```ts
{
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}
```

완료 기준:

- `package-lock.json` 갱신
- `rg "StyleSheet.absoluteFillObject" src` 결과 0건
- `rg "preset: 'react-native'|preset: \"react-native\"" jest.config.js` 결과 0건
- `rg "Clipboard" src`에서 `from 'react-native'` 또는 `from \"react-native\"`와 함께 import되는 항목 0건

### Phase 4. iOS 정리와 빌드

작업:

- `Gemfile`에 RN 0.85.3 템플릿의 `gem 'nkf'` 반영
- `bundle install`
- `cd ios && bundle exec pod install`
- 필요 시 `Pods`, `Podfile.lock`, DerivedData 정리 순서로 점진 처리
- `react-native-permissions`의 `AppTrackingTransparency` pod 반영 확인
- `react-native-tracking-transparency` pod 제거 확인
- `react-native-maps` patch 제거 후 podspec/codegen 상태 확인
- BootSplash 6.x 설정 유지 확인

검증:

```sh
npx react-native run-ios --device "Louis iPhone"
```

실패 시 우선 확인:

- `fmt`, `folly`, `glog`, `hermes-engine`
- RN 0.84+ iOS precompiled binaries/Hermes V1 문제로 의심되면 진단용 fallback으로 `cd ios && RCT_USE_PREBUILT_RNCORE=0 bundle exec pod install` 실행 후 재시도
- `use_frameworks! :linkage => :static`
- RNFirebase 버전 불일치
- `react-native-permissions` Podfile setup 누락
- `react-native-maps` generated code/codegen 문제
- `react-native-linear-gradient` Fabric 렌더/빌드 문제

완료 기준:

- `Gemfile.lock` 갱신
- `ios/Podfile.lock` 갱신
- iOS 실기기 Debug 빌드 성공
- 앱 첫 실행, splash hide, 로그인 화면 진입 성공

### Phase 5. Android 정리와 빌드

작업:

- Gradle wrapper, AGP, Kotlin, RN Gradle Plugin을 RN 0.85.3 템플릿과 맞춤
- `android/gradle/wrapper/gradle-wrapper.properties`: Gradle `9.3.1`
- `android/build.gradle`: `buildToolsVersion = "36.0.0"`, `compileSdkVersion = 36`, `targetSdkVersion = 36`, `minSdkVersion = 24`, `ndkVersion = "27.1.12297006"`, `kotlinVersion = "2.1.20"`
- `android/gradle.properties`: `edgeToEdgeEnabled=false` 추가
- `newArchEnabled=true` 유지
- `hermesEnabled=true` 유지
- `MainApplication.kt`를 RN 0.85 entrypoint 구조로 병합하고 알림 채널 생성 로직 보존
- `MainActivity.kt`를 RN 0.85 템플릿과 병합하고 BootSplash 초기화 보존
- Phase 2.5에서 `react-native-maps+1.26.18.patch`와 불필요한 `patch-package`가 제거됐는지 확인
- `react-native-immersive-mode` autolinking 제거 확인

검증:

```sh
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
npx react-native run-android
```

완료 기준:

- Debug APK 빌드 성공
- Android 16/API 36 또는 최신 실기기에서 시스템 바, safe area, 지도 화면 확인
- `android/gradle.properties`에 `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=false`가 명시됨
- `MainApplication.kt`에 `ReactNativeApplicationEntryPoint.loadReactNative(this)` 구조가 반영됨

### Phase 6. 테스트와 타입 체크

명령:

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

프로젝트에 특정 명령이 없거나 실패가 기존 실패라면, 실패 원인과 기존 여부를 기록한다.

완료 기준:

- 테스트/타입/린트 중 실행 가능한 항목은 성공
- 실패 항목은 RN 업그레이드와 관련 있는지 분류됨

### Phase 7. 기능 QA

필수 QA:

- 앱 부팅, BootSplash hide, 강제 업데이트/점검 모달
- Google Sign-In, Firebase Auth 로그인/로그아웃/탈퇴
- Firebase Messaging 권한, FCM token 등록, foreground notification
- Crashlytics log
- Analytics event
- ATT 권한 팝업
- 현재 위치 권한, 위치 재시도
- 택시 지도, Marker, 지도 자동 줌, 위치 선택
- 택시 채팅 WebSocket/STOMP, 새 메시지 사운드, 햅틱
- 채팅/상세 화면 복사 버튼: `Clipboard.setString` 동작 확인
- 게시판 이미지 선택, 카메라, 이미지 업로드
- BottomSheet 입력창, 키보드, 스크롤
- DraggableFlatList 이미지 순서 변경
- WebView 공지 상세/계정 가이드
- Safe area: iPhone notch, Android navigation bar, Android edge-to-edge
- LinearGradient가 적용된 화면: 로그인, Skeleton, 캠퍼스 배너, 택시 화면
- SVG/Icon 렌더링
- release build 설치 및 첫 실행

## 커밋 분리 지침

권장 커밋 단위:

1. `chore: React Native 0.85 코어 의존성 갱신`
2. `chore: iOS Android RN 템플릿 갱신`
3. `fix: RN 0.85 제거 API 대응`
4. `fix: Clipboard community package 전환`
5. `fix: ATT 권한 처리를 react-native-permissions로 교체`
6. `chore: 사용하지 않는 immersive mode 의존성 제거`
7. `fix: New Architecture 네이티브 의존성 호환성 조정`
8. `test: RN 0.85 테스트 설정 갱신`
9. `docs: RN 0.85 마이그레이션 기록 갱신`

한 커밋에는 하나의 목적만 담는다. lockfile 변경은 해당 dependency 변경 커밋에 포함한다.

## 실패 기록 템플릿

업그레이드 중 실패가 발생하면 아래 형식으로 기록한다.

```md
### YYYY-MM-DD HH:mm - <platform>/<command>

- Command:
- Failure package:
- Error summary:
- First failing file:
- Suspected cause:
- Fix attempted:
- Result:
- Next action:
```

## 참고 자료

- React Native upgrade docs: https://reactnative.dev/docs/upgrading.html
- React Native 0.80 release: https://reactnative.dev/blog/2025/06/12/react-native-0.80
- React Native 0.81 release: https://reactnative.dev/blog/2025/08/12/react-native-0.81
- React Native 0.82 release: https://reactnative.dev/blog/2025/10/08/react-native-0.82
- React Native 0.83 release: https://reactnative.dev/blog/2025/12/10/react-native-0.83
- React Native 0.84 release: https://reactnative.dev/blog/2026/02/11/react-native-0.84
- React Native 0.85 release: https://reactnative.dev/blog/2026/04/07/react-native-0.85
- React Native Clipboard docs: https://reactnative.dev/docs/clipboard.html
- React Native 0.85.3 template package: https://www.npmjs.com/package/@react-native-community/template/v/0.85.3
- React Native Directory: https://reactnative.directory
- Reanimated compatibility table: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Reanimated 4 getting started: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- Reanimated Babel plugin: https://docs.swmansion.com/react-native-reanimated/docs/reanimated-babel-plugin/about/
- @react-native-clipboard/clipboard: https://github.com/react-native-clipboard/clipboard
- react-native-permissions: https://github.com/zoontek/react-native-permissions
- react-native-maps: https://github.com/react-native-maps/react-native-maps
- RNFirebase Analytics: https://rnfirebase.io/analytics/usage
- Apple App Tracking Transparency: https://developer.apple.com/documentation/AppTrackingTransparency
- `react-native-linear-gradient` Fabric issue: https://github.com/react-native-linear-gradient/react-native-linear-gradient/issues/622
