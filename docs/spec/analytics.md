# 유입·사전예약 측정 기준

## 핵심 지표

| 지표 | 정의 | 용도 |
| --- | --- | --- |
| 방문 세션 | 브라우저 탭/세션별 landing 진입 | 캠페인 유입량 |
| 순 방문자 | `visitor_id` 쿠키 기준 중복 제거한 사람 | 사람 기준 모수 |
| 사전예약 완료 | 유효성 검증과 개인정보 동의를 통과해 저장된 예약 | 수요 |
| 방문자 전환율 | `사전예약 완료 순 방문자 / 순 방문자 * 100` | 기본 수요 전환율 |
| 세션 전환율 | `사전예약 완료 수 / 방문 세션 수 * 100` | 랜딩 효율 비교 |

대시보드의 기본 수치는 **방문자 전환율**로 표시합니다. 같은 쿠키에서 여러 번 예약해도 예약자는 1명으로 계산하며, 이메일은 소문자 정규화 후 중복을 막습니다.

## 식별 방식과 한계

- 첫 진입 시 API가 `visitor_id`(UUID)를 `HttpOnly`, `Secure`, `SameSite=Lax`, 180일 쿠키로 발급합니다.
- 프론트는 탭 단위 `session_id`를 `sessionStorage`에 보관하여 새 탭/브라우저 재시작의 세션을 구분합니다.
- 쿠키 삭제, 시크릿 모드, 다른 기기에서는 같은 사람을 합칠 수 없습니다. 따라서 이 지표는 로그인 사용자 수가 아니라 **쿠키 기반 추정 순 방문자**입니다.
- 분석/광고 쿠키 동의 정책이 필요한 지역·채널이라면 동의 후에만 비필수 이벤트를 전송합니다. 사전예약 제출에 필요한 최소 기록과 개인정보 처리방침은 별도로 검토합니다.

## 이벤트 흐름

```text
광고/공유 링크
  → POST /api/v1/visitors/bootstrap (visitor_id 쿠키 발급)
  → POST /api/v1/events { eventName: page_view, visitorId, sessionId, path }
  → POST /api/v1/reservations { reservationType, name, email, privacyConsent, jobFamily, applicantType, primaryRole }
  → Supabase Postgres
  → GET /api/v1/admin/metrics
```

`page_view`는 같은 `visitor_id + session_id + path` 조합에서 1회만 저장합니다. 이 규칙은 새로고침으로 유입을 부풀리지 않기 위함입니다.

## 콘텐츠·CTA 측정

- `section_view`: 섹션이 화면에 50% 이상 최초 노출될 때 세션당 한 번 기록합니다. `properties.sectionId`는 `hero`, `lead`, `profile`, `how`, `why`, `reserve` 중 하나입니다.
- `cta_clicked`: CTA를 누를 때 기록합니다. `properties.ctaId`는 `header_reserve`, `lead_reserve`처럼 위치와 목적이 드러나는 값이며, `properties.sectionId`를 함께 기록합니다.

`section_view`는 콘텐츠를 본 집단을 나누기 위한 관찰 지표입니다. 이 이벤트만으로 특정 섹션이 전환을 *유발했다*고 해석하지 않으며, 카피·배치 변경 전후 또는 A/B 테스트와 함께 판단합니다.

## 예약 유형

- `QUICK_AI_INTERVIEW`: 간편 AI 면접 체험
- `REVERSE_MATCHING`: 역매칭 준비 체험

유형별 예약 수와 유형별 전환율도 동일한 방문자 모수로 제공해 어떤 데모 수요가 더 큰지 비교합니다.

## 2단 설문 이벤트 (v1 목표 계약)

구현·배포 상태와 전환 기간은 [survey-contract.md §7](survey-contract.md#7-기존-예약배포-순서와-동의)을 따른다. `reservation_completed`는 **예약 저장 성공** 기준을 그대로 유지하며 설문 상태와 무관하다. 클라이언트는 예약 201 확인 후 기존 방식으로 기록한다. 설문 저장 실패/이탈/건너뛰기는 예약 완료를 취소하지 않는다.

| 이벤트 | 발생 시점 | 발생하지 않는 경우 | 중복 제거 |
| --- | --- | --- | --- |
| survey_started | 최초 draft 성공으로 started_at이 설정될 때. draft 없이 complete 성공 시 started_at 설정과 함께 발생 | 화면 노출, GET, 브라우저 내부 편집, 실패한 저장, 최초 시작 후 재개 | reservationId + eventName당 1회 |
| survey_skipped | not_started / in_progress에서 최초 skipped 전이가 저장되어 skipped_at이 설정될 때 | 실패, skipped에서 반복 skip, 재개 후 두 번째 skip | reservationId + eventName당 1회 |
| survey_completed | 필수 응답 검증 후 completed 전이가 커밋될 때 | 실패한 제출, 완료 후 409, 동시 제출 패자 | reservationId + eventName당 1회 |

직접 complete하면 started/completed 두 이벤트가 같은 커밋 뒤 발생한다. 직접 skip은 started를 발생시키지 않는다. skipped 이후 재개는 새 started 이벤트를 만들지 않으며, 아직 started_at이 NULL인 경우 최초 성공 draft/complete에서 started를 기록한다. `survey_skipped`는 최초 건너뛰기 사실을 뜻하므로 나중에 완료한 예약과 겹칠 수 있다. 현재 상태별 집계와 구분한다.

설문 이벤트는 **서버가 커밋된 상태 전이로만** 생성한다. 클라이언트가 `/api/v1/events`로 survey_* 이벤트를 전송하면 `400 INVALID_REQUEST`다. OpenAPI `TrackEventRequest.eventName`은 클라이언트 허용 이름만 나열한다. DB의 이벤트 이름 CHECK는 survey_*를 추가해야 한다.

설문 이벤트 속성은 문자열 `reservationId`, `surveyVersion`만 허용한다. 토큰, 이름, 이메일, answers, 프로젝트 텍스트를 포함하지 않는다. visitor_id/session_id는 예약에 저장된 값을 연결한다(재방문 탭 ID와 달라도 예약 코호트 귀속 유지). path는 예약 당시 landing_sessions.landing_path를 사용하고 occurred_at은 해당 started_at/skipped_at/completed_at으로 고정한다. DB에 survey_* 전용 `(properties->>'reservationId', event_name)` 부분 UNIQUE 인덱스를 두어 재시도도 중복 저장하지 않는다.

트래킹 저장은 커밋 후 best-effort이며 실패가 예약/설문 성공 응답을 막지 않는다. 이벤트 저장 누락 가능성이 있으므로 완료/시작/건너뛰기 집계의 원본은 reservations와 survey_responses의 저장된 상태·시각이다. 이벤트 로그는 흐름 분석용이며 응답률의 원본으로 삼지 않는다. 자동 재시도는 동일한 키·원본 시각을 사용한다.

## 설문 모수와 배포 전후 비교

- 1단 `job_family`, `applicant_type`, `primary_role`는 신규 유효 예약 전체를 모수로 본다. 기존 NULL 예약은 `legacy_unclassified` 집단으로 표시하고 기타/미정과 합치지 않는다.
- 2단 응답률은 같은 예약 생성 코호트의 `completed 예약 수 ÷ 유효 1단 예약 수`다. 전환 기간의 필드 누락 예약은 분모에서 제외하고 제외 수를 함께 표시한다. 전체 예약 대비 응답률도 별도 표시할 수 있으나 모수를 명시한다.
- 2단 기술/경험 분포는 해당 직군의 completed 응답자 기준으로만 보고한다. not_started/in_progress/skipped 초안은 기술 분포에 합치지 않는다. 직군 간 기술 선택 개수를 숙련도로 해석하지 않는다.
- 응답자/비응답자의 1단 분포 차이와 응답률을 함께 표시한다. 이는 관측된 변수의 자기선택 편향 진단이며 편향 보정이 아니다.
- 1단 도입 전후 전환율 비교는 같은 UTM/예약 유형/기간 조건을 사용하고 strict 활성화 시점을 기록한다. 전환 기간의 legacy 예약을 별도 표시한다.
- 1단 문항별 진입·이탈 측정은 후속 UI 지표 작업으로 분리한다. 이번 계약에서 없는 이벤트를 새로 발송하지 않는다.

기존 admin metrics 응답은 유지하며 설문 집계 엔드포인트/대시보드는 이번 범위에 포함하지 않는다.
