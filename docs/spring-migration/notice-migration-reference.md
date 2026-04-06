# Notice 마이그레이션 레퍼런스 (Firebase Functions -> Spring)

> 목적: 기존 Firebase Cloud Functions의 공지 수집/크롤링 동작을 Spring Phase 5 구현 시 참고하기 위한 기준 문서  
> 레퍼런스 소스: `/skuri-backend/references/index.ts`  
> 기준 시점: 2026-03-06 확인

## 1. 참고 범위

이 문서는 아래 기존 로직을 추출한 요약이다.

- 공지 카테고리별 RSS 수집
- 스케줄 실행 정책
- 공지 ID/중복 판정 규칙
- 공지 상세 본문/첨부 크롤링 규칙
- 저장(upsert) 및 실패 처리 정책

주의:
- 이 문서는 "동작 참고" 기준이다.
- Spring API 계약의 최종 기준은 `docs/api-specification.md` 및 현재 도메인 설계 문서다.

## 2. 기존 Firebase 동작 요약

### 2-1. 카테고리/소스

- RSS base URL: `https://www.sungkyul.ac.kr/bbs/skukr`
- 사이트 base URL: `https://www.sungkyul.ac.kr`
- 카테고리 -> categoryId 매핑:
  - 새소식 97
  - 학사 96
  - 학생 116
  - 장학/등록/학자금 95
  - 입학 94
  - 취업/진로개발/창업 93
  - 공모/행사 90
  - 교육/글로벌 89
  - 일반 87
  - 입찰구매정보 86
  - 사회봉사센터 84
  - 장애학생지원센터 83
  - 생활관 82
  - 비교과 80

### 2-2. 스케줄 정책

- 함수: `scheduledRSSFetch`
- 레거시 cron: `*/10 8-20 * * 1-5`
- Phase 5 적용 정책: 평일 `08:00~19:50`, 10분 주기, `Asia/Seoul`
- timezone: `Asia/Seoul`
- timeout: `540s`
- 카테고리별 순차 처리 + 카테고리별 `row=10` 수집

### 2-3. RSS 파싱/정규화 정책

- 링크:
  - 상대경로면 `https://www.sungkyul.ac.kr`를 붙여 절대경로화
- RSS 요약:
  - `description` -> `content` -> `contentSnippet` 순 fallback
- 작성시각:
  - `isoDate`는 무시
  - `pubDate`를 KST(+09:00) 기준으로 파싱
  - 실패 시 서버 시간 fallback

### 2-4. 안정 ID / 중복 판단 규칙

- 안정 ID(`id`):
  - `Base64(fullLink 또는 "${categoryId}:${title}")`
  - `=` 제거 후 앞 120자 사용
- 변경 감지 해시(`contentHash`):
  - SHA1(`title|fullLink|rawDate`)

주의:
- 기존 구현의 `contentHash`는 본문 상세 HTML/첨부파일을 포함하지 않는다.

### 2-5. 저장(upsert) 정책

- 컬렉션: `notices`
- 신규 문서:
  - 상세 크롤링(`crawlNoticeContent`) 수행 후 저장
  - 기존 Firebase 구현은 `bodyHtml`, `attachments`, `createdAt`, `updatedAt`를 저장
  - 현재 Spring 구현은 `rssPreview`(RSS 미리보기), `bodyText`(정규화 text), `bodyHtml`, `thumbnailUrl`, `attachments`를 함께 저장한다.
- 기존 문서:
  - `existing.contentHash != incoming.contentHash`일 때만 `merge set`
  - `updatedAt` 갱신
- 배치 커밋:
  - 임계치 `450`건마다 커밋 후 새 배치 생성

주의:
- 기존 구현은 "기존 문서 업데이트 경로"에서 상세 크롤링을 재실행하지 않는다.
  - 링크/본문 구조가 바뀐 경우 상세 데이터 최신성이 떨어질 수 있다.

### 2-6. 상세 페이지 크롤링 규칙

- 함수: `crawlNoticeContent(noticeUrl)`
- 요청:
  - `axios.get`
  - `User-Agent: Mozilla/5.0`
  - `httpsAgent.rejectUnauthorized=false`
- 본문 HTML 선택자:
  - `.view-con`
- 이미지 URL 보정:
  - `<img src="/...">`면 절대경로(`BASE_URL + src`)로 변환
- 첨부파일 파싱:
  - 영역: `.view-file li a`
  - `download.do` 링크 -> `downloadUrl`
  - `synapView.do` 링크 -> `previewUrl`
  - 결과 구조: `{ name, downloadUrl, previewUrl }[]`
- 실패 시:
  - `{ html: "", attachments: [] }` 반환

### 2-7. 썸네일 저장 / backfill 규칙

- `thumbnailUrl`은 `TEXT` 타입 `thumbnail_url` 컬럼에 저장하는 목록용 캐시다.
- 신규/상세 refresh 성공 시점에만 `thumbnailUrl`을 갱신한다.
  - 이미지가 없으면 `null`
  - `img[src]`가 비어 있거나 `data:` / `blob:` / 과도하게 긴 값이면 `null`
  - 상세 refresh를 하지 않았거나 크롤링에 실패하면 기존 값을 유지
- 기존 적재 데이터는 `migration.plan=NOTICE_THUMBNAILS` backfill로 보정한다.
  - 네트워크 재크롤링 금지
  - DB `body_html`만 읽는다.
  - keyset(`id > lastId`) batch 처리와 dry-run/apply를 지원한다.
  - 저장 부적절한 `src`는 update 실패 대신 `null`로 정리한다.

## 3. Phase 5로 가져갈 때 권장 기준

### 3-1. 그대로 가져갈 항목

- 카테고리 매핑(category -> source id)
- 스케줄 시간대(평일 08~20시, 10분 간격)
- 안정 ID 생성 규칙
- 링크 절대경로 보정 규칙
- 본문/첨부 선택자 기준(`.view-con`, `.view-file`)

### 3-2. Spring에서 보완 권장 항목

1. 동시 실행 방지
- 스케줄 실행과 관리자 수동 sync 동시 실행 시 중복 처리 방지락 필요

2. 상세 변경 감지 강화
- 필요 시 `contentHash`에 상세 본문/첨부도 반영하거나
- 업데이트 경로에서도 상세 크롤링 재수행 정책 검토

3. 네트워크 안정성
- 타임아웃/재시도/서킷브레이커 정책 명시

4. 저장형 썸네일 유지
- 목록 응답 생성 시 `bodyHtml` 파싱을 재수행하지 않고 저장된 `thumbnailUrl`만 사용
- 기존 row 보정은 backfill plan으로 별도 수행
- 저장 규칙은 sync/backfill 모두 동일하게 적용하고, `data:` / `blob:` / 과도하게 긴 `src`는 `null` 처리
- 성결대학교 사이트 TLS 체인 이슈가 해결되기 전까지는 Spring 구현도 공지 수집 경로에 한해 인증서 검증 비활성화를 허용
- 사이트 full chain이 정상화되면 `rejectUnauthorized=false`/trust-all SSL 설정은 제거 권장
- Spring Notice 스키마는 Firebase와 달리 `summary`를 미래 AI 요약 저장용 예약 필드로 유지한다.

4. 관측성
- 실행 결과 로그를 구조화(`fetched/created/updated/skipped/failed/durationMs`)

5. 테스트 전략
- 실제 외부 RSS 호출 대신 fixture/Mock 기반 테스트
- 최소: 신규 수집, dedup, 부분 실패, 상세 크롤링 파싱 테스트

## 4. Phase 5 범위/비범위 정리 참고

- 범위(Phase 5): Notice/AppNotice 도메인, RSS 수집/동기화, 댓글/읽음 처리
- 비범위(후속): 새 공지/댓글 기반 푸시 알림 고도화(기존 Firebase의 `onNoticeCreated`, `onNoticeCommentCreated` 류)
  - 알림 인프라 중심 구현은 Phase 8과 정렬 권장

## 5. 확인 체크리스트 (구현 PR용)

- [ ] 카테고리 매핑이 기존 서비스와 일치하는가
- [ ] 스케줄 정책(주기/시간대/평일)이 일치하는가
- [ ] 안정 ID/contentHash 규칙을 문서와 코드에 동시에 반영했는가
- [ ] 상세 본문/첨부 크롤링 선택자 및 URL 보정이 동작하는가
- [ ] 중복 저장/동시 실행/부분 실패 처리를 테스트로 검증했는가
- [ ] `docs/api-specification.md`, `docs/domain-analysis.md`, `docs/erd.md`를 동기화했는가
