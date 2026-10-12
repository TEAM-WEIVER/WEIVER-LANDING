# 사전예약·설문 API 계약

[OpenAPI](openapi.yaml)는 v0.2.0 목표 계약이며, 구현·배포 전환의 예외는 [설문 계약 §7](survey-contract.md#7-기존-예약배포-순서와-동의)에 따른다. 이 PR은 문서만 확정한다. 1단 UI/API/마이그레이션은 계약 병합 후 `feat/survey-stage1`, 2단 UI/API는 별도 후속 구현이다. 문항·코드·분기·검증·DB 제약의 기준은 [survey-contract.md](survey-contract.md)다.

모든 요청은 HTTPS로 전송한다. 이벤트 기록 실패가 랜딩 사용을 막아서는 안 된다.

| Method | Path | 설명 / 인증 |
| --- | --- | --- |
| POST | /api/v1/visitors/bootstrap | visitor_id 쿠키 발급/갱신 (분석용) |
| POST | /api/v1/events | 클라이언트 행동 이벤트, fire-and-forget |
| POST | /api/v1/reservations | 1단 사전예약 저장, 동의 및 3문항 필수 |
| GET | /api/v1/reservations/{reservationId}/survey | 상세 설문 조회, 예약별 Bearer 토큰 |
| POST | /api/v1/reservations/{reservationId}/survey/draft | 부분 응답 전체 교체, 예약별 Bearer 토큰 |
| POST | /api/v1/reservations/{reservationId}/survey/complete | 필수 응답 검증 후 완료, 예약별 Bearer 토큰 |
| POST | /api/v1/reservations/{reservationId}/survey/skip | 초안 보존하고 건너뛰기, 예약별 Bearer 토큰 |
| GET | /api/v1/admin/metrics | 기존 일별 퍼널, 관리자 Bearer 토큰 |

```json
{
  "visitorId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "reservationType": "QUICK_AI_INTERVIEW",
  "name": "홍길동",
  "email": "hello@example.com",
  "privacyConsent": true,
  "jobFamily": "FE",
  "applicantType": "entry_level",
  "primaryRole": "web_frontend",
  "utm": { "source": "instagram", "campaign": "waitlist" }
}
```

`POST /api/v1/reservations` 성공은 `201 Created`다. `id`는 예약 UUID이며 새 응답에는 `surveyAccessToken`과 초기 `survey` 스냅샷도 포함한다. 토큰은 32바이트 난수의 padding 없는 base64url(43자), 최초 성공 시 한 번만 제공한다. 응답 헤더는 `Cache-Control: no-store`다.

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "surveyAccessToken": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "survey": {
    "reservationId": "770e8400-e29b-41d4-a716-446655440002",
    "surveyVersion": "v1",
    "jobFamily": "FE",
    "applicantType": "entry_level",
    "primaryRole": "web_frontend",
    "status": "not_started",
    "answers": {},
    "startedAt": null,
    "completedAt": null,
    "skippedAt": null,
    "updatedAt": "2026-10-12T12:00:00Z"
  }
}
```

토큰 예시는 형식을 보여주는 자리표시자이며 구현에서는 CSPRNG를 사용한다. 예약·1단 응답·초기 설문·토큰 해시는 한 트랜잭션으로 저장한다. DB 필드명은 `job_family`, `applicant_type`, `primary_role`이며 API는 camelCase를 사용한다. 1단은 answers에 중복 저장하지 않는다. 유효하지 않은 필드·코드·직군/직무 조합은 `400 INVALID_REQUEST`다.

이메일은 trim·소문자 정규화 후 중복을 검사하며 재신청은 **409 DUPLICATE_EMAIL**로 고정한다. 기존 예약 갱신/토큰 재발급은 하지 않는다. `privacyConsent`는 `true`만 허용하고 누락/false는 400이다. 동의 시각은 서버가 예약 저장 시점에 기록하며 클라이언트 `privacyConsentAt`은 받지 않는다.

설문 조회/쓰기는 예약 ID와 `Authorization: Bearer <surveyAccessToken>`을 함께 사용한다. 토큰이 없거나 유효하지 않으면 401, 유효 토큰의 다른 예약 접근은 404다. UUID·이메일·방문자 쿠키는 소유권 증명이 아니다. 같은 브라우저의 localStorage에 ID/토큰을 보관해 GET으로 이어쓴다. 자세한 저장소·분실 정책은 설문 계약 §3에 따른다.

설문 쓰기 예시, 상태 전이 및 검증은 설문 계약 §4~6에 있다. draft는 필수 문항 누락을 허용하고 입력된 값은 모두 검증한다. complete는 분기별 필수 문항을 모두 요구한다. 잘못된 문항/선택지/타입/분기/`none` 배타 위반은 400이다. 완료 후 변경과 재제출은 **409 SURVEY_COMPLETED**, 동시 완료도 한 요청만 성공한다. skipped 이후 재개는 허용한다.

`reservation_completed`는 예약 저장 성공 기준을 유지한다. 설문 시작·건너뛰기·완료의 발생 시점은 [analytics.md](analytics.md)에 정의하며, 설문 이벤트는 서버의 저장된 상태 전이로만 기록한다.
