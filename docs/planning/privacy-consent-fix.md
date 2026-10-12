# 개인정보 수집·이용 동의 결함 수정 브리핑

2026-10-12 · Issue [#10](https://github.com/TEAM-WEIVER/weiver-landing/issues/10)

## 목적

사용자가 실제로 동의하지 않았는데도 브라우저가 동의 시각을 자동 전송하는 결함을 제거한다. 예약과 이후 설문 수집의 법적·운영적 선행조건이다.

## 범위

- `POST /api/v1/reservations`의 요청 계약을 `privacyConsent: boolean`으로 변경한다.
- `privacyConsent`가 없거나 `false`이면 서버가 `400 INVALID_REQUEST`를 반환한다.
- 동의 시각은 클라이언트가 보내지 않고, 예약 INSERT 시 데이터베이스 서버 시각으로 기록한다.
- 예약 폼에 필수 동의 체크박스를 추가하고, 체크 상태를 API에 전달한다.
- `docs/spec/api-contract.md`와 `docs/spec/openapi.yaml`을 같은 계약으로 맞춘다.

## 비범위

- 개인정보 처리방침의 전문·보관 기간·철회 절차 제정
- 설문 1·2단 문항 및 저장 구조 변경

## User Story

사전예약자로서 개인정보 수집·이용에 명시적으로 동의한 뒤에만 예약하고 싶다. 그래야 내 동의 의사와 기록이 일치한다.

## Acceptance Criteria

- **AC-PC-1** `privacyConsent`가 없거나 `false`인 예약 요청은 `400 INVALID_REQUEST`이고 예약 서비스가 호출되지 않는다.
- **AC-PC-2** `privacyConsent: true`인 유효한 요청만 `201 Created`를 반환한다.
- **AC-PC-3** `privacy_consent_at`에는 클라이언트 입력값이 아니라 INSERT 시점의 데이터베이스 서버 시각이 저장된다.
- **AC-PC-4** 폼의 동의 체크박스는 필수이며, `reserve` 요청은 체크된 경우에만 `privacyConsent: true`를 보낸다.
- **AC-PC-5** API 계약 문서와 OpenAPI의 필수 필드·타입·설명이 일치하고 `privacyConsentAt`을 노출하지 않는다.
