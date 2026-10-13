# 1단 예약 설문 배포·검증 절차

Issue #14 · 브랜치 `feat/survey-stage1` · 목표 계약: [survey-contract.md](survey-contract.md)

이 변경은 1단 폼·예약 API·초기 설문 행과 토큰 생성까지 구현한다. 2단 GET/draft/complete/skip과 상세 설문 화면은 제공하지 않고 survey_* 이벤트도 발행하지 않는다. 운영 DB 적용과 strict 활성화는 구현 PR 병합과 별도 작업이다.

## 변경되는 배포 조건

기존 `.github/workflows/deploy.yml`은 main push마다 API와 React 앱을 배포한다. 이번 API는 신규 컬럼과 survey_responses가 필요하므로 **repository variable `SURVEY_STAGE1_DB_READY=true`**와 HTTPS 주소의 **`LANDING_API_URL`**이 설정된 경우에만 API 배포를 실행한다. 웹 배포는 API 배포와 health 확인이 성공한 뒤 실행한다. DB 준비 변수가 없거나 false, 또는 API 주소가 HTTPS가 아니면 배포를 건너뛴다. 이 변수들은 비밀값이 아니며 DB 준비 확인을 마친 배포 담당자가 설정한다. 마이그레이션을 workflow에서 자동 실행하지 않는다.

`SURVEY_STAGE1_STRICT`는 API 런타임 환경 변수이며 기본값 `false`다. repository variable과 다르다. strict=false는 세 필드 전체 생략만 legacy 요청으로 허용한다. 일부 생략/명시적 null/잘못된 조합은 어느 모드에서도 400이다. strict=true는 1단 세 필드를 모두 요구한다.

## 배포 순서

1. DB 담당자가 운영 환경의 현재 migration 이력과 백업을 확인한다. `202610120001_add_stage1_survey.sql`을 Supabase migration pipeline 또는 `supabase db push`로 먼저 적용한다. 브라우저 역할에 테이블 권한을 추가하지 않는다.
2. 다음 읽기 쿼리로 신규 컬럼·초기 테이블·제약을 확인한다. 기존 예약의 세 신규 필드는 NULL이고 설문 행이 없어야 한다. 이 단계까지 `SURVEY_STAGE1_DB_READY`는 false/미설정으로 둔다.
3. API 서버 `apps/api/docker-compose.yml`의 `.env` 등 서버 secret 설정에 `SURVEY_STAGE1_STRICT=false`를 명시한다. 기존 DB 연결·관리자 토큰은 유지한다.
4. API의 TLS/리버스 프록시가 준비된 것을 확인하고 repository variable `LANDING_API_URL`에 실제 HTTPS API origin을 설정한다. 기존 workflow의 HTTP IP 주소로 접근 토큰을 전송하지 않는다. DB 준비 확인 후 `SURVEY_STAGE1_DB_READY=true`를 설정한다. 구현 PR을 병합하거나 병합 후 main의 Deploy workflow를 재실행한다. API부터 배포하고 health가 성공하면 React 웹을 배포한다. 미리 빌드된 latest 이미지를 DB 적용 전에 pull하지 않는다.
5. 신규 클라이언트에서 FE/BE/AI 예약을 검증하고 기존 클라이언트의 세 필드 전체 생략 요청도 허용되는지 확인한다. 신규 응답은 id/token/survey와 no-store, legacy 응답은 id만 반환한다. 운영 점검에는 승인된 테스트 이메일을 사용한다.
6. 실제 트래픽·캐시·외부 진입 경로를 확인해 legacy 제출 클라이언트가 종료되었는지 확인한다. API의 `SURVEY_STAGE1_STRICT=true`로 바꾸고 `docker compose up -d --force-recreate api`로 환경 변수를 반영한다. 신규 폼은 성공, 세 필드 누락은 400인지 확인한다. 활성화 시점을 기록한다.

```sql
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'reservations'
  and column_name in ('job_family', 'applicant_type', 'primary_role');

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('public.reservations'::regclass, 'public.survey_responses'::regclass);

select count(*) as unclassified_reservations
from public.reservations
where job_family is null and applicant_type is null and primary_role is null;
```

GitHub에서 건너뛴 workflow를 재실행할 때는 Deploy run의 전체 재실행을 사용한다(API와 웹의 순서 유지). 변수 false 상태에서는 새 API뿐 아니라 웹도 배포하지 않으므로 DB 준비 확인 전 병합하는 경우 현재 서비스를 그대로 유지한다.

## 활성 제출 경로 확인

- 새 운영 주소는 `https://weiverai.com/`, 랜딩 API는 `https://landing-api.weiverai.com`이다. React 빌드의 JS/CSS/이미지·favicon은 `/landing-assets/` 경로를 사용한다. `landing-origin.weiverai.com` Nginx는 해당 접두사를 제거해 `/var/www/weiver` 파일을 제공한다. 본품 Vercel에서 `/`와 `/landing-assets/*`만 이 원본으로 rewrite해야 하며 `/login`, `/_next/*`, `/api/auth/*`는 본품에 남긴다.
- GitHub `LANDING_API_URL=https://landing-api.weiverai.com`과 Oracle `WEB_ALLOWED_ORIGIN=https://weiverai.com`을 함께 설정한다. 런타임 `.env` 변경 후 API 컨테이너를 재생성하고 새 origin의 preflight를 확인한다. 원본 도메인의 화면 접근 확인은 공개 도메인의 CORS·예약 검증을 대체하지 않는다.
- 기존 IP 주소에서 저장한 이어쓰기 토큰은 브라우저 origin이 달라 새 도메인에서 자동 복구되지 않는다. 저장소 데이터를 새 도메인으로 자동 복사하거나 URL에 토큰을 붙이지 않는다.

- OCI main push 배포는 `npm run build:web`의 `apps/web/dist`를 `/var/www/weiver`로 복사한다. 따라서 실제 API 제출 경로는 React의 `DemoSection.jsx` → `api.js`다.
- 루트 `index.html`은 Vercel 정적 진입 경로다. 현재 폼은 저장 API를 호출하지 않고 “입력 정보는 저장되지 않습니다” 안내를 표시하는 미리보기다. 예약 완료 이벤트도 발행하지 않는다. strict 검증을 활성화해도 이 폼의 예약 요청은 없으며, 실제 수집 채널로 사용할 경우 React 앱으로 연결/전환한 후 활성화해야 한다.
- `archive/`의 과거 랜딩은 배포 제출 경로로 사용하지 않는다. 별도 배포·외부 복사본·캐시가 있다면 운영 담당자가 추가 확인한다.

## 롤백

1. 신규 예약의 기존 저장과 설문 데이터를 보존한다. 테이블·컬럼·토큰 해시를 삭제하지 않는다.
2. 폼을 구버전으로 되돌리기 **전에** API `SURVEY_STAGE1_STRICT=false`를 설정하고 API 컨테이너를 재생성한다. 구 요청은 legacy 예약으로 계속 저장할 수 있다.
3. 새 클라이언트가 활성화된 동안 구 API 이미지로 되돌리지 않는다. 안전한 API 롤백은 신규 필드/응답을 처리하는 호환 버전으로만 한다. 1단 UI 롤백이 필요하면 먼저 strict를 해제하고 캐시 종료까지 호환 API를 유지한다.
4. `SURVEY_STAGE1_DB_READY=false`는 이후 자동 배포를 멈추는 장치이며 이미 실행 중인 서비스나 strict 값을 바꾸지는 않는다.

## 재현 가능한 검증

```sh
cd apps/api
./gradlew test --no-daemon
```

Java 24와 실행 중인 Docker가 필요하다. Testcontainers는 `postgres:17-alpine`을 사용해 전체 마이그레이션을 적용한다. 기존 예약 보존, NULL 조합·직무 제약, 초기 설문 1개, SHA-256 저장, 실제 설문 INSERT 실패 시 예약 롤백, 이메일 중복과 다른 DB 오류 구분, 브라우저 DB 권한을 검증한다. Docker가 없으면 통합 검증이 실패하며 조용히 생략하지 않는다.

```sh
npm ci
npx playwright install chromium
npm run build:web
npm run test:e2e --workspace=@weiver/web
```

브라우저 테스트는 로컬 API 응답을 모의하여 데스크톱/390px 모바일에서 필수 3문항·동의, 직군 변경 초기화, 코드 payload, 성공·중복·저장소 실패, 재방문 토큰 보관과 이벤트 비식별성을 확인한다. 실제 DB 효과는 Java 통합 테스트에서 별도로 검증한다. `.github/workflows/test.yml`은 PR과 main에서 같은 검증을 실행한다.
