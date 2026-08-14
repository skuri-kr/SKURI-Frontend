# 의존성 패치 관리

이 디렉터리의 패치는 `npm install` 뒤 `patch-package --error-on-fail`로 자동 적용된다.
패치 적용에 실패하면 설치도 실패하므로, 실패를 무시하거나 `postinstall`을 우회하지 말고 아래 기준에 따라 패치를 재검토한다.

## `@gorhom/bottom-sheet` 5.2.14

### 적용 이유

- React Native 0.85.3, Reanimated 4.3.1, Worklets 0.8.3 조합에서 바텀시트 마운트 위치를 계산하는 animated reaction이 실행되지 않을 수 있다.
- `@gorhom/bottom-sheet` 5.2.14에서는 아직 표시하지 않은 `BottomSheetModal`에 `dismiss()`를 호출하면 상태가 `DISMISSING`으로 남는다. 이후 `present()`를 호출해도 Portal 렌더링이 차단된다. 5.1.x에는 초기 닫힘 상태를 무시하는 방어 로직이 있었지만 5.2.x 상태 관리 리팩터링에서 사라졌다.
- SKTaxi의 제어형 패널은 최초 `visible=false` 상태에서 `dismiss()`를 호출하므로 공지 알림 설정과 시간표 수업 추가 등 앱의 공용 모달 바텀시트가 모두 영향을 받는다.
- 5.1.8로 내렸을 때도 실기기 Release 빌드에서 해결되지 않았고 시간표 수업 추가 시 앱 종료가 확인됐다.
- `patches/@gorhom+bottom-sheet+5.2.14.patch`는 다음 두 수정을 포함한다.
  - upstream PR [#2720](https://github.com/gorhom/react-native-bottom-sheet/pull/2720)의 변경을 head commit `0a3c51d9017bd57bae5ba447cd8c0a05b3cb7776` 기준으로 적용한다. 관련 upstream 이슈는 [#2721](https://github.com/gorhom/react-native-bottom-sheet/issues/2721)이다.
  - 아직 한 번도 표시하지 않은 모달의 `dismiss()`를 무시해 5.1.x의 초기 상태 방어 동작을 복원한다.
- npm 패키지는 원본 `src`와 빌드 산출물인 `lib/module`, `lib/commonjs`를 함께 배포하므로 세 경로에 같은 런타임 수정을 적용한다.

### 버전 고정

패치가 적용되는 동안 아래 라이브러리는 `package.json`에서 정확한 버전으로 고정한다.

- `@gorhom/bottom-sheet`: 5.2.14
- `react-native-reanimated`: 4.3.1
- `react-native-worklets`: 0.8.3
- `react-native-gesture-handler`: 2.31.2

버전 범위를 사용하면 새 버전이 설치됐는데도 기존 패치를 계속 신뢰하는 상태가 될 수 있으므로 임의로 `^`를 다시 붙이지 않는다.

### 제거 조건

다음 조건을 모두 만족할 때만 이 패치를 제거한다.

1. `@gorhom/bottom-sheet`의 새 정식 배포 버전에 다음 두 문제가 모두 해결됐음을 릴리스 노트와 배포된 npm 패키지 코드에서 확인한다. PR 병합만으로는 충분하지 않다.
   - PR #2720 또는 같은 animated reaction 마운트 문제
   - 표시 전 `dismiss()` 호출 후 `present()`가 Portal에 정상 마운트되지 않는 초기 상태 문제
2. React Native, Reanimated, Worklets, Gesture Handler의 공식 호환성 표에서 함께 사용할 버전 조합을 확인한다.
3. 패치를 제거한 상태로 아래 자동 검사와 실기기 검증을 모두 통과한다.

### 업데이트 및 제거 절차

1. upstream PR #2720, 이슈 #2721, `@gorhom/bottom-sheet` 릴리스 노트를 확인하고 위 두 수정이 모두 배포됐는지 확인한다.
2. 새 버전에 수정이 실제 포함됐다면 `patches/@gorhom+bottom-sheet+5.2.14.patch`를 삭제한다.
3. `package.json`의 관련 라이브러리 버전을 공식 호환 조합으로 함께 갱신하고 `npm install`을 실행한다.
4. 다른 패치가 하나도 없다면 `postinstall` 스크립트와 `patch-package` 개발 의존성도 제거한다. 다른 패치가 남아 있으면 둘 다 유지한다.
5. `npm test -- --runInBand`, `npm run lint -- --quiet`, `npx tsc --noEmit`, Android Debug 빌드, iOS Simulator Debug 빌드를 실행한다.
6. Android와 iOS 실기기 Release 빌드에서 다음 흐름을 각각 여러 번 열고 닫아 확인한다.
   - 공지 화면의 `공지 알림 설정 열기`
   - 시간표 화면의 `수업 추가`
   - 바텀시트 내부 입력, 키보드, 배경 터치 닫기, 닫은 뒤 다시 열기
7. 앱 종료, 화면 밖 렌더링, 열림 지연, 입력 또는 키보드 이상이 없을 때만 업데이트를 완료한다.

새 버전에 공식 수정이 포함되지 않았다면 버전 업데이트를 중단하거나, upstream 변경에 맞춰 패치를 새로 생성하고 이 문서의 버전·커밋·검증 기록을 함께 갱신한다.
