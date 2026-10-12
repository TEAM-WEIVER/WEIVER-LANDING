# 초기 API 계약

모든 요청은 HTTPS로 전송하며, 이벤트 기록 실패가 랜딩 사용을 막아서는 안 됩니다.

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/visitors/bootstrap` | `visitor_id` 쿠키 발급/갱신 |
| `POST` | `/api/v1/events` | `page_view`, `reserve_opened` 등 익명 이벤트 저장 |
| `POST` | `/api/v1/reservations` | 사전예약 저장 |
| `GET` | `/api/v1/admin/metrics` | 날짜/UTM/유형별 집계 (관리자 인증 필수) |

```json
POST /api/v1/reservations
{
  "sessionId": "uuid",
  "reservationType": "QUICK_AI_INTERVIEW",
  "name": "홍길동",
  "email": "hello@example.com",
  "privacyConsent": true,
  "utm": { "source": "instagram", "campaign": "waitlist" }
}
```

성공 시 `201 Created`와 `{ "id": "uuid" }`를 반환합니다. 같은 이메일의 재신청은 `409 Conflict`로 처리하거나, 제품 정책상 최신 유형으로 갱신할 경우에는 명시적으로 `200 OK`를 반환합니다. 초기에는 실수로 수요가 부풀지 않도록 **409**를 권장합니다.

`privacyConsent`는 반드시 `true`여야 하며, 누락하거나 `false`로 보내면 `400 INVALID_REQUEST`를 반환합니다. 동의 시각(`privacy_consent_at`)은 요청에 포함하지 않고 서버가 예약 저장 시점에 기록합니다.
