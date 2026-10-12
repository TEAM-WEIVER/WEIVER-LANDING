# 2단 사전예약 설문 계약 v1

2026-10-12 · Issue [#12](https://github.com/TEAM-WEIVER/weiver-landing/issues/12) · 기준: [설계 PR #8](https://github.com/TEAM-WEIVER/weiver-landing/pull/8)

이 문서는 후속 구현의 목표 계약이다. 이번 변경은 문서만 포함하며 예약 폼, API, DB 마이그레이션은 구현하지 않는다. [OpenAPI](openapi.yaml)는 엄격 검증 활성화 이후의 명세다. 전환 기간 예외는 §7에만 적용한다. 1단 구현은 이 계약 PR의 리뷰·병합 후 `feat/survey-stage1`에서 시작한다. 2단 UI/API 구현은 별도 후속 작업이며 1단 배포에서 설문 행과 토큰을 미리 생성한다.

## 1. 저장 구조와 필드명

| 설계 ID / 의미 | API (camelCase) | DB (snake_case) | 타입·규칙 |
| --- | --- | --- | --- |
| S-0.1 | jobFamily | reservations.job_family | text, FE / BE / AI |
| x-1.1 | applicantType | reservations.applicant_type | text, student / entry_level / experienced / employed_no_change / other |
| x-2.1 | primaryRole | reservations.primary_role | text, §2의 직군별 코드만 허용 |
| 설문 버전 | surveyVersion | survey_responses.survey_version | text, v1 |
| 예약 연결 | reservationId | survey_responses.reservation_id | uuid, PK이자 reservations.id FK, ON DELETE CASCADE |
| 2단 상태 | status | survey_responses.status | text, not_started / in_progress / completed / skipped |
| 2단 응답 | answers | survey_responses.answers | jsonb, NOT NULL DEFAULT '{}', JSON object만 허용 |
| 소유권 증명 | surveyAccessToken (최초 예약 응답만) | survey_responses.access_token_hash | text, SHA-256 hex 64자, UNIQUE, 원문 토큰 저장 금지 |
| 시각 | startedAt / completedAt / skippedAt / updatedAt | started_at / completed_at / skipped_at / updated_at | timestamptz, 서버 UTC 시각 |

1단 세 필드는 신규 예약에 모두 필수다. `null`, 빈 문자열, 알 수 없는 코드 및 다른 직군의 직무 조합은 `400 INVALID_REQUEST`다. 필드들은 저장 후 변경하지 않으며 설문 API로도 수정할 수 없다. 직군 변경 시 UI는 직무 선택을 초기화한다. DB에도 코드 CHECK와 직군별 직무 조합 CHECK를 둔다. `other`와 `undecided`는 유효 응답이며 누락값을 대신하지 않는다.

예약 저장 트랜잭션에서 예약, `status=not_started`, `answers={}`, `survey_version=v1`인 설문 행 및 토큰 해시를 함께 생성한다. `reservation_id` PK로 예약당 응답 1개를 보장한다. 이 중 하나라도 실패하면 전체를 롤백하고 예약 성공 응답/이벤트를 내보내지 않는다. GET은 행을 생성하지 않는다. 초기 `started_at`, `completed_at`, `skipped_at`은 NULL, `updated_at`은 생성 시각이다. 브라우저에 DB 권한을 주지 않는다.

버전은 생성 시 고정하고 모든 조회 응답에 반환한다. 쓰기 요청은 정확히 같은 `surveyVersion`을 보내야 한다. 불일치는 `409 SURVEY_VERSION_MISMATCH`이며 자동 변환/덮어쓰기를 하지 않는다. v1의 문항 ID·코드·필수 여부·분기를 바꾸면 v2를 만들고 기존 v1 응답은 v1 규칙으로 이어쓴다. 문구만 고치는 경우 버전은 유지한다. v1의 AI-6.1과 AI-6.2는 별개로 유지한다.

## 2. 직군별 허용 직무·심화 분기

아래 표 밖의 조합은 예약 단계에서 `400 INVALID_REQUEST`다. 2단의 직군과 심화 분기는 저장된 1단 값으로만 결정한다. 요청 본문으로 분기를 바꾸지 않는다.

| 직군 / 문항 ID | 표시 문구 | primary_role 코드 | 2단 심화 문항 |
| --- | --- | --- | --- |
| FE / FE-2.1 | 웹 프론트엔드 (서비스·제품 UI) | `web_frontend` | `FE-5A.1` |
| FE / FE-2.1 | 모바일 / 크로스플랫폼 (React Native, Flutter) | `mobile_cross_platform` | `FE-5B.1` |
| FE / FE-2.1 | 디자인 시스템 / UI 엔지니어링 | `design_system` | `FE-5C.1` |
| FE / FE-2.1 | 웹 성능 / 프론트엔드 플랫폼 (SSR, 빌드, 인프라) | `performance_platform` | `FE-5D.1` |
| FE / FE-2.1 | 인터랙티브 / 그래픽스 / 데이터 시각화 | `interactive_graphics` | `FE-5E.1` |
| FE / FE-2.1 | 아직 구체적으로 정하지 못함 | `undecided` | `FE-5F.1` |
| FE / FE-2.1 | 기타 | `other` | `FE-5F.1` |
| BE / BE-2.1 | 서버 / API 백엔드 | `server_api` | `BE-5A.1` |
| BE / BE-2.1 | 대규모 트래픽 / 분산 시스템 | `distributed_systems` | `BE-5B.1` |
| BE / BE-2.1 | 데이터 엔지니어 | `data_engineering` | `BE-5C.1` |
| BE / BE-2.1 | DevOps / 인프라 / SRE | `devops_sre` | `BE-5D.1` |
| BE / BE-2.1 | 아직 구체적으로 정하지 못함 | `undecided` | `BE-5E.1` |
| BE / BE-2.1 | 기타 | `other` | `BE-5E.1` |
| AI / AI-2.1 | LLM / Generative AI Engineer | `llm_genai` | `AI-5A.1` |
| AI / AI-2.1 | Computer Vision / Multimodal Engineer | `cv_multimodal` | `AI-5B.1` |
| AI / AI-2.1 | NLP / Speech AI Engineer | `nlp_speech` | `AI-5C.1` |
| AI / AI-2.1 | 추천 / 검색 ML Engineer | `recommendation_search` | `AI-5D.1` |
| AI / AI-2.1 | MLOps / ML Platform Engineer | `mlops_platform` | `AI-5E.1` |
| AI / AI-2.1 | Robotics / Physical AI / Edge AI | `robotics_edge` | `AI-5F.1` |
| AI / AI-2.1 | AI / ML Engineer | `ml_engineer` | `AI-5G.1` |
| AI / AI-2.1 | AI Research Engineer | `research_engineer` | `AI-5G.1` |
| AI / AI-2.1 | 아직 구체적으로 정하지 못함 | `undecided` | `AI-5G.1` |
| AI / AI-2.1 | 기타 | `other` | `AI-5G.1` |

## 3. 소유자 확인과 같은 브라우저 이어쓰기

예약 성공 시 CSPRNG로 생성한 32바이트 토큰을 padding 없는 base64url(43자)로 `surveyAccessToken`에 한 번 반환한다. 서버는 SHA-256 해시만 보관한다. 모든 설문 API는 `Authorization: Bearer <surveyAccessToken>`을 검증하고 그 토큰에 연결된 `reservation_id`가 URL과 일치해야 한다. `visitor_id`, `sessionId`, 이메일, 예약 UUID만으로 접근을 허용하지 않는다. 현재 방문자 UUID 쿠키는 분석 식별용이며 설문 인증 수단으로 재사용하지 않는다.

클라이언트는 같은 origin의 localStorage에 예약 ID와 토큰을 `weiver.survey.v1.<reservationId>` 키로 보관하고 재방문 시 GET으로 서버 응답을 복구한다. 세션 ID가 바뀌거나 새 탭을 열어도 이어쓸 수 있다. 저장 실패 시 예약은 성공으로 유지하고 현재 화면 메모리로 설문을 진행하되 재방문 복구는 보장하지 않는다. 완료 확인 후 로컬 토큰을 지우고, skipped일 때는 재개를 위해 보관한다. 토큰 만료는 예약 데이터 보존 기간과 같으며 예약 삭제 시 폐기한다. 다른 브라우저/기기, localStorage 삭제, 토큰 분실 시 이번 범위에서는 복구·재발급하지 않는다. 중복 이메일 409 응답에 토큰을 재발급하지 않는다.

예약·설문 응답은 `Cache-Control: no-store`로 반환한다. 토큰을 URL/분석 이벤트/로그에 넣지 않고 HTTPS로만 전송한다. 설문 요청은 Bearer 인증만 사용하고 쿠키만으로 권한을 부여하지 않는다. API의 CORS는 지정된 웹 origin만 허용한다. 브라우저 저장소의 토큰은 스크립트에 노출되므로 클라이언트는 텍스트를 HTML로 삽입하지 않고 XSS를 방지해야 한다.

- 누락/형식 오류/유효하지 않은 토큰: `401 {"error":"UNAUTHORIZED"}`.
- 유효한 토큰으로 다른 예약을 요청하거나 예약이 없음: `404 {"error":"NOT_FOUND"}`. 존재 여부를 구분해 노출하지 않는다.
- 토큰을 검증한 후 설문 미대상 예약 확인: `409 {"error":"SURVEY_NOT_AVAILABLE"}`. v1 이전 예약에는 토큰을 발급하지 않으므로 공개 API로 이 상태를 조회·복구할 수 없다.

## 4. API와 상태 전이

모든 경로의 prefix는 `/api/v1/reservations/{reservationId}/survey`다. 쓰기는 POST를 사용해 현재 CORS의 GET/POST 허용 범위에 맞춘다. 모든 성공 응답은 `200`과 아래의 동일한 설문 스냅샷이며 예약 생성만 `201`이다. JSON 외의 임의 필드는 `400 INVALID_REQUEST`다.

| Method / suffix | 요청 | 동작 |
| --- | --- | --- |
| GET / (suffix 없음) | body 없음, Bearer 필수 | 서버에 저장된 분기·상태·응답 조회. 상태 변경 없음 |
| POST /draft | surveyVersion, answers | 부분 응답 허용. 기존 answers **전체 교체**. 첫 성공 저장으로 시작/재개 |
| POST /complete | surveyVersion, answers | 전체 응답 검증 후 answers 전체 교체와 완료를 한 트랜잭션으로 처리 |
| POST /skip | surveyVersion | 초안 유지, 건너뛰기. answers는 받지 않음 |

```json
{
  "reservationId": "770e8400-e29b-41d4-a716-446655440002",
  "surveyVersion": "v1",
  "jobFamily": "FE",
  "applicantType": "entry_level",
  "primaryRole": "web_frontend",
  "status": "in_progress",
  "answers": {"FE-3.1": ["typescript"]},
  "startedAt": "2026-10-12T12:00:00Z",
  "completedAt": null,
  "skippedAt": null,
  "updatedAt": "2026-10-12T12:00:00Z"
}
```

| 출발 상태 | GET | draft 성공 | complete 성공 | skip 성공 |
| --- | --- | --- | --- | --- |
| not_started | 유지 | in_progress | completed | skipped |
| in_progress | 유지 | in_progress | completed | skipped |
| skipped | 유지 | in_progress (재개) | completed (재개 후 완료) | skipped (200, 변경 없음) |
| completed | 유지 | 409 SURVEY_COMPLETED | 409 SURVEY_COMPLETED | 409 SURVEY_COMPLETED |

`completed`에서는 응답·상태·시각을 바꿀 수 없다. `skipped`는 재개 가능하다. 중간 이탈은 쓰기가 아니므로 상태가 유지된다. draft의 `{}`도 명시적 시작/재개 요청으로 허용한다. GET, 화면 노출, 브라우저 내부 편집만으로 시작 처리하지 않는다. 검증 실패는 기존 응답/상태/시각을 유지한다.

첫 draft 또는 바로 complete 성공 시 `started_at`을 설정하며 이후 재개에도 최초 값을 유지한다. direct skip이면 `started_at`은 NULL이다. `skipped_at`은 최초 건너뛰기 시각을 유지하고 재개에도 삭제하지 않는다. `completed_at`은 완료 시각, `updated_at`은 실제 상태/응답 쓰기가 성공한 시각이다. skipped에서 skip을 반복하면 시각도 유지한다.

모든 쓰기는 같은 설문 행을 잠그거나 동일한 효과의 원자적 조건부 갱신으로 직렬화한다. 트랜잭션 내부에서 최신 상태·버전을 읽고 검증한 뒤 응답과 상태를 함께 쓴다. 두 complete가 동시에 와도 한 요청만 200, 나머지는 `409 SURVEY_COMPLETED`다. complete가 먼저 커밋된 뒤 대기 중인 draft/skip도 409다. draft가 먼저면 complete는 자신의 전체 answers를 검증하여 완료한다. 동시 draft는 마지막 성공 쓰기를 채택한다(필드 단위 merge 없음). 자동 저장 요청은 클라이언트에서 순서대로 보내고 완료 요청 전 대기 중인 저장을 끝낸다.

오류 우선순위는 인증/대상 확인 → 본문 파싱·기본 형식 → 잠금 후 completed 확인 → 버전 확인 → 문항 검증이다. 문법적으로 유효한 completed 재제출은 내용과 무관하게 409다. 잘못된 JSON/본문 형식은 400이다. 오류 응답은 기존 `{ "error": "CODE" }` 형식을 유지한다.

## 5. 응답 형식과 검증

`answers`는 2단 문항 ID만 키로 하는 객체다. `S-0.1`, `x-1.1`, `x-2.1`은 reservations 컬럼에만 저장하고 answers에는 넣지 않는다.

- 복수 선택: 1개 이상의 고유 코드 문자열 배열. 중복 코드, 빈 배열, 문자열 대신 배열 누락, `null`은 400. `none`과 다른 코드의 동시 선택은 항상 **400**이며 자동 정제하지 않는다.
- 프로젝트 경험 `x-7.1`: 단일 문자열 `yes` 또는 `no`. boolean/배열은 400.
- `x-7.2`, `x-7.3`: 선택 문자열. trim 후 각각 1~200 / 1~2,000 Unicode 문자(코드 포인트, UTF-16 코드 유닛 아님). 빈 값은 클라이언트가 키를 생략한다. `null`/빈 문자열/길이 초과는 400.
- 알 수 없는 문항·코드, 다른 직군, 같은 직군의 다른 심화 문항, 1단 문항, 임의 추가 필드는 모두 400. `other`에 부가 텍스트 필드를 붙이지 않는다.
- `x-7.2` 또는 `x-7.3`을 보내려면 같은 요청 answers의 `x-7.1=yes`가 필요하다. `no`이거나 누락이면 400. yes→no로 바꿀 때 UI는 상세 키를 제거하고 전체 객체를 저장한다.

설문 행의 reservation_id, survey_version, status, answers, access_token_hash, updated_at은 NOT NULL이다. started_at/skipped_at/completed_at은 해당 사실이 발생하기 전에는 NULL이다.

임시 저장은 필수 문항의 **누락만** 허용한다. 입력된 값의 타입·코드·분기·배타 규칙은 완료와 똑같이 검증한다. 완료는 아래 필수 ID를 전부 요구한다. 프로젝트 상세 2개는 yes여도 선택이며 no이면 보내지 않는다.

| 직군 | 완료 필수 문항 (공통) | 완료 필수 심화 |
| --- | --- | --- |
| FE | FE-3.1, FE-3.2, FE-4.1, FE-6.1, FE-7.1 | §2에서 결정한 FE-5A.1~FE-5F.1 중 정확히 1개 |
| BE | BE-3.1, BE-3.2, BE-3.3, BE-4.1, BE-6.1, BE-7.1 | §2에서 결정한 BE-5A.1~BE-5E.1 중 정확히 1개 |
| AI | AI-3.1, AI-3.2, AI-4.1, AI-6.1, AI-6.2, AI-7.1 | §2에서 결정한 AI-5A.1~AI-5G.1 중 정확히 1개 |

OpenAPI 3.0의 `SurveyAnswers`는 문항별 타입/enum을 기술한다. 저장된 예약과의 조합, 분기별 필수 문항, `none` 배타, 프로젝트 조건은 이 표와 규칙에 따른 서버의 추가 검증이다. OpenAPI 스키마만 통과했다고 완료 가능한 것은 아니다.

## 6. 요청·오류 예시

FE / web_frontend 예약 기준이다. 모든 쓰기에는 Bearer 헤더가 필요하다.

```json
// POST .../draft → 200 in_progress (부분 응답)
{"surveyVersion":"v1","answers":{"FE-3.1":["typescript"]}}
```

```json
// POST .../complete → 200 completed (프로젝트 없음)
{
  "surveyVersion":"v1",
  "answers": {
    "FE-3.1":["typescript"],
    "FE-3.2":["react"],
    "FE-4.1":["web_ui"],
    "FE-5A.1":["form_validation","api_integration"],
    "FE-6.1":["none"],
    "FE-7.1":"no"
  }
}
```

| 요청 / 상황 | 응답 | 이유 |
| --- | --- | --- |
| complete에 FE-3.1만 전송 | 400 INVALID_REQUEST | 필수 문항 누락. 동일 payload의 draft는 200 |
| draft에 FE-3.1=["none","typescript"] | 400 INVALID_REQUEST | 경험 없음 배타 위반 |
| draft에 FE-3.1=["typescript","typescript"] | 400 INVALID_REQUEST | 중복 선택 |
| draft에 FE-3.1="typescript" | 400 INVALID_REQUEST | 복수 선택 타입 오류 |
| draft에 FE-3.1=["unknown"] 또는 UNKNOWN-1.1 키 | 400 INVALID_REQUEST | 알 수 없는 코드/문항 |
| draft에 BE-3.1 또는 FE-5B.1 | 400 INVALID_REQUEST | 다른 직군/직무 심화 |
| draft에 FE-7.1="no", FE-7.2="프로젝트" | 400 INVALID_REQUEST | 프로젝트 상세 분기 위반 |
| 1단에 jobFamily=FE, primaryRole=server_api | 400 INVALID_REQUEST | 직군·직무 조합 오류 |
| v1 행에 surveyVersion=v2 | 409 SURVEY_VERSION_MISMATCH | 버전 불일치 |
| 완료 후 유효한 complete/draft/skip | 409 SURVEY_COMPLETED | 완료 불변 |
| 동시 complete 2건 | 200 1건, 409 SURVEY_COMPLETED 1건 | 원자적 상태 전이 |
| POST .../skip {"surveyVersion":"v1"} | 200 skipped | 초안 보존. 같은 요청 반복도 200 |

위 코드 블록의 주석은 설명이며 실제 요청에서는 제거한다.

## 7. 기존 예약·배포 순서와 동의

기존 예약에는 신규 세 필드를 **모두 NULL**로 유지한다. 추정값/other/undecided로 채우지 않고 `legacy_unclassified` 분석 집단으로만 구분한다(저장 코드 아님). 기존 예약에는 survey_responses 행/토큰을 만들지 않는다. 새 필드 NULL 세 개 또는 완전한 유효 조합만 DB에서 허용하고 일부 NULL 조합은 막는다. 전역 NOT NULL은 적용하지 않는다.

1. **DB 먼저**: nullable 예약 컬럼, 코드/조합 CHECK, 설문 테이블/권한/인덱스 및 설문 이벤트 이름·중복 방지 제약을 추가한다. 기존 예약 행은 보존한다. 실제 마이그레이션은 후속 구현이다.
2. **API 다음**: 과도기에는 기존 클라이언트의 세 필드 전체 생략만 허용(legacy 저장, 기존 `{id}` 응답). 일부 필드만 전송/명시적 null/잘못된 조합은 400. 완전한 신규 요청에는 예약·초기 설문·토큰을 함께 저장하고 확장 201 응답을 반환한다. GET/draft/complete/skip은 2단 구현 배포 때 활성화한다. 서버는 새 enum/필드에 대한 오류를 이메일 중복으로 오인해 409 DUPLICATE_EMAIL로 반환하지 않는다.
3. **클라이언트 다음**: 1단 필수 폼, 코드 전송, 예약 ID/토큰 보관을 배포한다. 2단 API/UI 배포 전에는 설문 시작/건너뛰기 이벤트를 발생시키지 않는다. 2단 배포 후 GET과 선택 흐름을 연결한다. 서버 계약이 준비되기 전 신규 필드를 전송하지 않는다.
4. **엄격 검증 활성화**: 기존 정적 index.html 등 실제 사용 중인 모든 예약 제출 경로를 확인하고 구버전 캐시/클라이언트 종료를 검증한 뒤 플래그로 세 필드 필수를 켠다. 이후 누락 요청은 400이며 이번 OpenAPI와 일치한다. 기능 롤백 시 클라이언트보다 먼저 API의 strict 플래그를 끈다. DB 컬럼·기존 응답을 삭제하지 않는다. 신규 클라이언트가 활성화된 동안 구 API로 롤백하지 않는다.

현재 main의 `DemoSection.jsx`에는 required 개인정보 동의 체크박스가 있고, `api.js`는 `privacyConsent` boolean을 전송한다. `CreateReservationRequest`의 `@NotNull @AssertTrue`가 누락/false를 거부하며 `ReservationRepository`는 `CURRENT_TIMESTAMP`로 `privacy_consent_at`을 기록한다. 클라이언트 시각은 전송하지 않는다. 이 동작을 재사용하며 추가 동의 UI나 `privacyConsentAt` 요청 필드는 만들지 않는다. 기존 예약의 동의 증빙을 소급 변경하지 않는다.

예약 저장 성공이 `reservation_completed`의 기준이다. 설문을 시작하지 않거나 건너뛰어도 예약은 유지한다. 설문 상태 전이 이벤트의 발생·중복 제거·모수는 [analytics.md](analytics.md)에 따른다.

## 8. 문항 ID·표시 문구·저장 코드 전체 매핑

표시 문구는 설계 PR #8 기준이며 저장에는 코드만 사용한다. 코드는 문항 ID 안에서 해석한다. `other`는 기타 선택 자체만 저장하며 추가 자유 입력은 없다. `none`은 경험 없음이며 배열 안에서 단독으로만 허용한다. 표시 문구 변경은 코드를 바꾸지 않는다. 아래와 OpenAPI `SurveyAnswers`의 enum은 같은 집합이다.

### 1단 공통

| 문항 ID | 저장 필드 | 표시 문구 | 저장 코드 |
| --- | --- | --- | --- |
| S-0.1 | job_family | 프론트엔드 | `FE` |
| S-0.1 | job_family | 백엔드 | `BE` |
| S-0.1 | job_family | AI / ML | `AI` |
| FE-1.1 / BE-1.1 / AI-1.1 | applicant_type | 대학생 | `student` |
| FE-1.1 / BE-1.1 / AI-1.1 | applicant_type | 신입 취업 준비 | `entry_level` |
| FE-1.1 / BE-1.1 / AI-1.1 | applicant_type | 경력직 / 이직 준비 | `experienced` |
| FE-1.1 / BE-1.1 / AI-1.1 | applicant_type | 현직자 (이직 계획 없음) | `employed_no_change` |
| FE-1.1 / BE-1.1 / AI-1.1 | applicant_type | 기타 | `other` |

`FE-2.1`, `BE-2.1`, `AI-2.1`의 전체 매핑은 §2의 직군별 허용 직무·심화 표에 있다.

### FE 2단

#### FE-3.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| JavaScript | `javascript` |
| TypeScript | `typescript` |
| HTML / CSS | `html_css` |
| Dart | `dart` |
| Swift / Kotlin (네이티브 앱) | `swift_kotlin` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-3.2 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| React | `react` |
| Next.js | `nextjs` |
| Vue | `vue` |
| Nuxt | `nuxt` |
| Angular | `angular` |
| Svelte / SvelteKit | `svelte` |
| React Native | `react_native` |
| Flutter | `flutter` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-4.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 웹 서비스 UI 개발 | `web_ui` |
| 어드민 / 대시보드 개발 | `admin_dashboard` |
| 모바일 앱 개발 | `mobile_app` |
| 디자인 시스템 / 컴포넌트 라이브러리 | `design_system` |
| 웹 성능 최적화 | `web_performance` |
| 인터랙션 / 애니메이션 / 데이터 시각화 | `interaction_visualization` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5A.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 클라이언트 상태 관리 (Redux, Zustand, Recoil) | `client_state` |
| 서버 상태 관리 (TanStack Query, SWR) | `server_state` |
| 라우팅 / 페이지 구조 설계 | `routing` |
| 폼 처리 / 유효성 검증 | `form_validation` |
| REST / GraphQL API 연동 | `api_integration` |
| 인증·인가 처리 (토큰, 세션) | `authentication` |
| 실시간 통신 (WebSocket, SSE) | `realtime` |
| 웹 접근성 (a11y) | `accessibility` |
| 반응형 웹 | `responsive_web` |
| 국제화 (i18n) | `i18n` |
| 테스트 (Jest, Testing Library, Playwright) | `testing` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5B.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 네이티브 모듈 / 브릿지 연동 | `native_bridge` |
| 앱 상태 관리 | `app_state` |
| 내비게이션 / 딥링크 | `navigation_deeplink` |
| 푸시 알림 | `push_notification` |
| 오프라인 저장소 / 로컬 DB | `local_storage` |
| 웹뷰 기반 하이브리드 앱 | `hybrid_webview` |
| 앱 스토어 배포 (App Store, Play Store) | `app_store` |
| OTA 업데이트 (CodePush, EAS Update) | `ota_update` |
| 앱 성능 최적화 | `app_performance` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5C.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 컴포넌트 라이브러리 구축 | `component_library` |
| 컴포넌트 문서화 (Storybook) | `storybook` |
| 디자인 토큰 | `design_token` |
| CSS-in-JS (styled-components, Emotion) | `css_in_js` |
| Utility-first CSS (Tailwind CSS) | `utility_css` |
| 테마 / 다크 모드 | `theme` |
| Figma 협업 / 디자인 핸드오프 | `figma` |
| 접근성 가이드라인 적용 | `accessibility` |
| 시각적 회귀 테스트 (Chromatic) | `visual_regression` |
| 패키지 배포 / 버전 관리 | `package_versioning` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5D.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Core Web Vitals 개선 | `core_web_vitals` |
| 번들 최적화 (Code Splitting, Tree Shaking) | `bundle_optimization` |
| SSR / SSG / ISR | `ssr_ssg_isr` |
| 렌더링 최적화 (메모이제이션, 가상화) | `rendering_optimization` |
| 이미지 / 리소스 최적화 | `resource_optimization` |
| 빌드 도구 구성 (Vite, Webpack, Turbopack) | `build_tool` |
| 모노레포 (Turborepo, Nx, pnpm workspace) | `monorepo` |
| 캐싱 전략 (CDN, Service Worker) | `caching` |
| 성능 모니터링 (Lighthouse, RUM) | `performance_monitoring` |
| 마이크로 프론트엔드 | `micro_frontend` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5E.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| CSS 애니메이션 / 트랜지션 | `css_animation` |
| 스크롤 기반 인터랙션 | `scroll_interaction` |
| 모션 라이브러리 (Framer Motion, GSAP) | `motion_library` |
| SVG | `svg` |
| Canvas 2D | `canvas_2d` |
| WebGL / 3D (Three.js) | `webgl_3d` |
| 데이터 시각화 (D3, Chart.js, ECharts) | `data_visualization` |
| Lottie | `lottie` |
| 애니메이션 성능 최적화 (60fps) | `animation_performance` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-5F.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 퍼블리싱 (HTML / CSS 마크업) | `publishing` |
| 반응형 레이아웃 | `responsive_layout` |
| 컴포넌트 설계 | `component_design` |
| 상태 관리 | `state_management` |
| API 연동 | `api_integration` |
| 폼 처리 | `form` |
| 라우팅 | `routing` |
| 스타일링 라이브러리 | `styling_library` |
| 테스트 코드 작성 | `testing` |
| Git 협업 / 코드 리뷰 | `git_review` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-6.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 호스팅 플랫폼 배포 (Vercel, Netlify) | `hosting` |
| 클라우드 / CDN 배포 (AWS S3·CloudFront 등) | `cloud_cdn` |
| CI/CD (GitHub Actions 등) | `ci_cd` |
| Docker | `docker` |
| 에러 모니터링 (Sentry 등) | `error_monitoring` |
| 사용자 행동 분석 (GA, Amplitude) | `analytics` |
| A/B 테스트 / Feature Flag | `ab_test_feature_flag` |
| 실사용자 대상 서비스 출시·운영 | `production_service` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### FE-7.1 / FE-7.2 / FE-7.3

| 문항 ID | 유형 | 완료 시 필수 | 표시 문구 또는 입력 | 저장 값 |
| --- | --- | --- | --- | --- |
| FE-7.1 | 단일 선택 | 예 | 있음 | `"yes"` |
| FE-7.1 | 단일 선택 | 예 | 없음 | `"no"` |
| FE-7.2 | 단답형 | 아니오 | 가장 대표적인 프로젝트 (최대 200자) | 문자열 |
| FE-7.3 | 장문형 | 아니오 | 담당 역할 (최대 2,000자) | 문자열 |

### BE 2단

#### BE-3.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Java | `java` |
| Kotlin | `kotlin` |
| Python | `python` |
| JavaScript / TypeScript | `javascript_typescript` |
| Go | `go` |
| C# | `csharp` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-3.2 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Spring Boot | `spring_boot` |
| Django | `django` |
| FastAPI | `fastapi` |
| Flask | `flask` |
| NestJS | `nestjs` |
| Express | `express` |
| Gin / Echo (Go) | `gin_echo` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-3.3 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| MySQL / MariaDB | `mysql_mariadb` |
| PostgreSQL | `postgresql` |
| Oracle | `oracle` |
| MongoDB | `mongodb` |
| Redis | `redis` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-4.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 서버 / API 개발 | `server_api` |
| 대규모 트래픽 처리 / 분산 시스템 | `distributed_system` |
| 데이터 파이프라인 / 데이터 엔지니어링 | `data_pipeline` |
| 인프라 / DevOps | `infrastructure_devops` |
| 인증 / 보안 | `authentication_security` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-5A.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| REST API 설계 | `rest_api` |
| GraphQL / gRPC | `graphql_grpc` |
| ORM (JPA, Hibernate, Prisma 등) | `orm` |
| 인증·인가 (JWT, OAuth, 세션) | `authentication` |
| 메시지 큐 (Kafka, RabbitMQ) | `message_queue` |
| 캐시 (Redis, 로컬 캐시) | `cache` |
| 비동기 / 이벤트 기반 처리 | `async_event` |
| 트랜잭션 / 동시성 제어 | `transaction_concurrency` |
| 검색 엔진 (Elasticsearch, OpenSearch) | `search_engine` |
| 실시간 통신 (WebSocket, SSE) | `realtime` |
| 테스트 코드 (단위·통합 테스트) | `testing` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-5B.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| MSA 설계 / 서비스 분리 | `msa` |
| 이벤트 기반 아키텍처 | `event_architecture` |
| 분산 트랜잭션 (Saga, Outbox) | `distributed_transaction` |
| DB 레플리케이션 / 샤딩 | `replication_sharding` |
| 쿼리 튜닝 / 인덱스 최적화 | `query_index` |
| 분산 락 | `distributed_lock` |
| Rate Limiting | `rate_limiting` |
| 장애 격리 (Circuit Breaker, Retry) | `fault_isolation` |
| 부하 테스트 (nGrinder, k6, JMeter) | `load_testing` |
| 대용량 트래픽 처리 경험 | `high_traffic` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-5C.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| ETL / ELT 파이프라인 | `etl_elt` |
| 배치 처리 (Spark 등) | `batch` |
| 스트림 처리 (Kafka Streams, Flink) | `stream` |
| Workflow Orchestration (Airflow 등) | `workflow` |
| 데이터 웨어하우스 (BigQuery, Redshift, Snowflake) | `warehouse` |
| 데이터 레이크 / 레이크하우스 | `lake` |
| 데이터 모델링 | `modeling` |
| CDC (Debezium 등) | `cdc` |
| 로그 수집 파이프라인 | `log_pipeline` |
| 데이터 품질 관리 | `data_quality` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-5D.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| IaC (Terraform 등) | `iac` |
| 컨테이너 오케스트레이션 (Kubernetes) | `kubernetes` |
| CI/CD 파이프라인 구축 | `ci_cd` |
| 메트릭 모니터링 (Prometheus, Grafana) | `metrics` |
| 로그 수집·분석 (ELK, Loki) | `logs` |
| 분산 트레이싱 | `tracing` |
| 오토스케일링 | `autoscaling` |
| 네트워크 / 로드밸런싱 | `network_load_balancing` |
| 장애 대응 / 온콜 | `incident_oncall` |
| 클라우드 비용 최적화 | `cloud_cost` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-5E.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| CRUD API 개발 | `crud_api` |
| DB 설계 (ERD) | `db_design` |
| 로그인 / 회원 기능 구현 | `authentication` |
| 파일 업로드 / 스토리지 연동 | `file_storage` |
| 외부 API 연동 | `external_api` |
| API 문서화 (Swagger 등) | `api_documentation` |
| 테스트 코드 작성 | `testing` |
| 서버 배포 | `deployment` |
| Git 협업 / 코드 리뷰 | `git_review` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-6.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Docker | `docker` |
| Kubernetes | `kubernetes` |
| AWS / GCP / Azure | `cloud` |
| CI/CD | `ci_cd` |
| 모니터링 / 로깅 | `monitoring_logging` |
| 실사용자 대상 서비스 배포·운영 | `production_service` |
| 장애 대응 | `incident_response` |
| 부하 테스트 | `load_testing` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### BE-7.1 / BE-7.2 / BE-7.3

| 문항 ID | 유형 | 완료 시 필수 | 표시 문구 또는 입력 | 저장 값 |
| --- | --- | --- | --- | --- |
| BE-7.1 | 단일 선택 | 예 | 있음 | `"yes"` |
| BE-7.1 | 단일 선택 | 예 | 없음 | `"no"` |
| BE-7.2 | 단답형 | 아니오 | 가장 대표적인 프로젝트 (최대 200자) | 문자열 |
| BE-7.3 | 장문형 | 아니오 | 담당 역할 (최대 2,000자) | 문자열 |

### AI 2단

#### AI-3.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Python | `python` |
| C / C++ | `c_cpp` |
| Java / Kotlin | `java_kotlin` |
| JavaScript / TypeScript | `javascript_typescript` |
| R | `r` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-3.2 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| PyTorch | `pytorch` |
| TensorFlow / Keras | `tensorflow_keras` |
| Hugging Face | `hugging_face` |
| Scikit-learn | `scikit_learn` |
| XGBoost / LightGBM | `xgboost_lightgbm` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-4.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| LLM / Generative AI | `llm_genai` |
| NLP (텍스트) | `nlp` |
| Speech / Audio | `speech_audio` |
| Computer Vision | `computer_vision` |
| Multimodal | `multimodal` |
| 추천 / 검색 | `recommendation_search` |
| MLOps / ML Platform | `mlops` |
| Robotics / Edge AI | `robotics_edge` |
| 정형 데이터 / 전통 ML | `tabular_ml` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5A.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Prompt Engineering | `prompt` |
| Embedding | `embedding` |
| Vector DB / Vector Search | `vector_search` |
| RAG | `rag` |
| Reranking | `reranking` |
| Fine-tuning / SFT | `fine_tuning_sft` |
| LoRA / QLoRA | `lora_qlora` |
| AI Agent | `agent` |
| Tool / Function Calling | `tool_calling` |
| MCP | `mcp` |
| Agent 프레임워크 (LangChain, LangGraph, LlamaIndex) | `agent_framework` |
| LLM Evaluation | `evaluation` |
| Guardrail / Safety | `guardrail` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5B.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Image Classification | `classification` |
| Object Detection | `detection` |
| Segmentation | `segmentation` |
| Object Tracking | `tracking` |
| OCR | `ocr` |
| Pose Estimation | `pose` |
| Image Generation | `generation` |
| Vision-Language Model (VLM) | `vlm` |
| Multimodal Model | `multimodal` |
| Video Analysis | `video` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5C.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Text Classification | `classification` |
| Information Extraction | `extraction` |
| Semantic Search | `semantic_search` |
| STT / ASR | `stt_asr` |
| TTS | `tts` |
| Speech Emotion Recognition | `speech_emotion` |
| Speaker Recognition | `speaker_recognition` |
| Audio Classification | `audio_classification` |
| Audio Feature Extraction | `audio_feature` |
| Voice Conversion | `voice_conversion` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5D.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Collaborative Filtering | `collaborative_filtering` |
| Content-based Recommendation | `content_based` |
| Embedding-based Recommendation | `embedding_based` |
| Learning to Rank | `learning_to_rank` |
| CTR / CVR Prediction | `ctr_cvr` |
| Search / Information Retrieval | `search` |
| Reranking | `reranking` |
| Personalization | `personalization` |
| Cold Start 대응 | `cold_start` |
| A/B Test | `ab_test` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5E.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Experiment Tracking | `experiment_tracking` |
| Model Registry | `model_registry` |
| Training Pipeline | `training_pipeline` |
| Model Serving | `serving` |
| Feature Pipeline / Feature Store | `feature_store` |
| ML CI/CD | `ci_cd` |
| Model Monitoring | `monitoring` |
| Data / Model Drift Monitoring | `drift` |
| GPU Infrastructure | `gpu` |
| Distributed Training | `distributed_training` |
| Workflow Orchestration | `workflow` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5F.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| Robot Perception | `perception` |
| Object Detection / Tracking | `detection_tracking` |
| Sensor Fusion | `sensor_fusion` |
| VLM / VLA | `vlm_vla` |
| SLAM | `slam` |
| ROS / ROS2 | `ros` |
| Edge Inference | `edge_inference` |
| ONNX | `onnx` |
| TensorRT | `tensorrt` |
| Quantization | `quantization` |
| Pruning / Model Compression | `pruning` |
| Real-time Inference Optimization | `realtime_optimization` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-5G.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 데이터 수집 | `data_collection` |
| 데이터 전처리 | `preprocessing` |
| Feature Engineering | `feature_engineering` |
| 모델 학습 | `training` |
| Fine-tuning | `fine_tuning` |
| Hyperparameter Tuning | `hyperparameter` |
| 모델 평가 | `evaluation` |
| 데이터 증강 | `augmentation` |
| 데이터 라벨링 / Dataset 구축 | `labeling` |
| 분산 학습 | `distributed_training` |
| 모델 경량화 / Quantization | `quantization` |
| 추론 최적화 | `inference_optimization` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-6.1 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| 모델 API 서비스 배포 (도구는 AI-6.2에서 선택) | `api_deployment` |
| Docker | `docker` |
| Kubernetes | `kubernetes` |
| AWS / GCP / Azure | `cloud` |
| 실험 관리 (MLflow, Weights & Biases) | `experiment_tracking` |
| Workflow Orchestration (Airflow, Kubeflow) | `workflow` |
| CI/CD | `ci_cd` |
| Model Monitoring | `monitoring` |
| GPU Server 운영 | `gpu_server` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-6.2 — 복수 선택 · 완료 시 해당 분기 필수

| 표시 문구 | 저장 코드 |
| --- | --- |
| FastAPI / Flask | `fastapi_flask` |
| Triton Inference Server | `triton` |
| KServe / BentoML | `kserve_bentoml` |
| vLLM | `vllm` |
| SGLang | `sglang` |
| ONNX Runtime | `onnx_runtime` |
| TensorRT / TensorRT-LLM | `tensorrt` |
| 직접 Serving 환경 구축 | `custom_serving` |
| 기타 | `other` |
| 경험 없음 | `none` |

#### AI-7.1 / AI-7.2 / AI-7.3

| 문항 ID | 유형 | 완료 시 필수 | 표시 문구 또는 입력 | 저장 값 |
| --- | --- | --- | --- | --- |
| AI-7.1 | 단일 선택 | 예 | 있음 | `"yes"` |
| AI-7.1 | 단일 선택 | 예 | 없음 | `"no"` |
| AI-7.2 | 단답형 | 아니오 | 가장 대표적인 프로젝트 (최대 200자) | 문자열 |
| AI-7.3 | 장문형 | 아니오 | 담당 역할 (최대 2,000자) | 문자열 |
