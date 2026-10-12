# 사전예약 직무별 설문 설계

2026-10-12 · Issue [#7](https://github.com/TEAM-WEIVER/weiver-landing/issues/7)

프론트엔드·백엔드·AI/ML 세 직군의 사전예약 설문을 하나의 골격과 작성 규칙으로 정규화한다. AI/ML 원안의 구조(관심 직무 분기 → 심화 → 서비스 경험 → 프로젝트 분기)를 기준으로 삼고, 원안에서 누락·중복된 부분은 함께 보완한다.

이 문서는 설문 **설계**까지만 다룬다. 랜딩 폼·API·DB 연동은 [후속 작업](#9-후속-작업)에서 다룬다.

---

## 1. 목적

- 직군과 관계없이 **같은 축**(지원 유형, 관심 직무, 공통 역량, 경험 분야, 심화 기술, 실서비스 경험, 프로젝트)으로 응답을 비교한다.
- 응답자는 **자신이 관심 있는 세부 직무의 심화 질문만** 본다.
- 문항 ID를 고정해 이후 폼·DB 스키마에 그대로 매핑할 수 있게 한다.

## 2. User Story

> **US-S1** 사전예약하는 개발 직군 지원자로서,  
> 내 관심 직무에 맞는 질문에만 답하고 싶다.  
> 그래야 3분 안에 설문을 끝낼 수 있다.

> **US-S2** weiver 운영팀으로서,  
> 직군이 달라도 같은 구조로 응답을 받고 싶다.  
> 그래야 지원 유형·세부 직무·기술 스택별 수요를 직군 간에 비교할 수 있다.

### Acceptance Criteria

- **AC-S-1** 세 설문 모두 [§3.1 공통 골격](#31-공통-골격)의 7개 섹션을 같은 순서로 가진다.
- **AC-S-2** 모든 문항에 유형(단일 / 복수 / 단답 / 장문)과 필수 여부가 표기되어 있다.
- **AC-S-3** 관심 직무(`x-2.1`)는 단일 선택이며, 모든 선택지에 이동할 심화 섹션이 매핑되어 있다.
- **AC-S-4** 모든 복수 선택 문항은 `기타`, `경험 없음` 순서로 끝난다.
- **AC-S-5** 프로젝트 경험이 `없음`이면 프로젝트 상세(`x-7.2`, `x-7.3`)를 보지 않고 제출된다.
- **AC-S-6** 어떤 분기를 타든 응답자에게 보이는 문항은 12개 이하다.
- **AC-S-7** 원안의 모든 문항이 [§8 원안 대비 변경 내역](#8-원안-대비-변경-내역)에서 정규화본의 문항 ID로 추적된다.

---

## 3. 정규화 규칙

### 3.1 공통 골격

```
[섹션 1] 기본 정보            x-1.1 지원 유형
[섹션 2] 관심 직무            x-2.1 관심 세부 직무 ── 분기 기준
[섹션 3] 공통 역량            x-3.n 언어 / 프레임워크 / (직군 특화)
[섹션 4] 경험 분야            x-4.1 경험 분야 (복수)
                                   ↓ x-2.1 기준 분기
[섹션 5-A ~ 5-n] 직무별 심화   x-5X.1 (분기된 섹션 1개만 노출)
                                   ↓ 모든 분기 합류
[섹션 6] 서비스·운영 경험      x-6.n
[섹션 7] 프로젝트 경험         x-7.1 여부 ── 없음 → 제출
                              x-7.2 대표 프로젝트
                              x-7.3 담당 역할
```

### 3.2 문항 ID

`{직군}-{섹션}{분기}.{번호}` 형식이다. 직군 코드는 `FE`, `BE`, `AI`다.

- 예: `BE-1.1`(백엔드 지원 유형), `FE-5C.1`(프론트 디자인 시스템 심화 1번), `AI-6.2`(AI Serving 경험)
- 섹션 번호는 세 직군이 같다. 같은 섹션 번호는 같은 의미의 질문이다.

### 3.3 작성 규칙

| # | 규칙 | 근거 |
| --- | --- | --- |
| R1 | 관심 직무(`x-2.1`)는 **단일 선택**이고, 경험 분야(`x-4.1`)는 **복수 선택**이다. | 분기에는 하나의 값이 필요하다. 반면 실제 경험은 여러 영역에 걸친다. |
| R2 | 분기 문항에는 `아직 구체적으로 정하지 못함`과 `기타`가 있고, 둘 다 General 심화로 간다. | 어떤 응답자도 심화 섹션 없이 지나가지 않게 한다. |
| R3 | 복수 선택 문항은 `기타`, `경험 없음` 순서로 끝난다. | 무응답과 "해당 없음"을 구분한다. |
| R4 | `경험 없음`은 다른 선택지와 함께 고를 수 없다. | Google Forms에서는 강제할 수 없다. 응답 정제 단계에서 `경험 없음`을 지우고, 폼 구현 시에는 UI에서 막는다. |
| R5 | 기술명은 **상위 개념 + 괄호 안 대표 도구**로 쓴다. 예: `메시지 큐 (Kafka, RabbitMQ)` | 도구 트렌드가 바뀌어도 문항 구조를 유지한다. (AI/ML 원안 설계 핵심 6번) |
| R6 | 공통 섹션(3, 6)은 **사용 여부**를 묻고, 심화 섹션(5)은 **깊이**를 묻는다. | 섹션 6과 심화 섹션의 선택지가 일부 겹쳐도 질문의 의도는 다르다. |
| R7 | 단답형·장문형에는 작성 예시를 단다. | 응답 길이와 서술 수준을 맞춘다. |
| R8 | 지원 유형(`x-1.1`) 선택지는 세 직군이 같다. | 직군 간 수요를 비교하는 축이다. |

### 3.4 공통 문항

세 직군에서 선택지가 같은 문항이다. 직군별 문서에서는 ID만 표기한다.

#### x-1.1 현재 지원 유형

**단일 선택 · 필수**

- 대학생
- 신입 취업 준비
- 경력직 / 이직 준비
- 현직자 (이직 계획 없음)
- 기타

> 원안의 `현직자`는 `경력직 / 이직 준비`와 겹친다. 그래서 "이직 계획 없음"을 붙여 둘을 구분했다.

#### x-7.1 {직군} 관련 프로젝트 경험이 있나요?

**단일 선택 · 필수 · 분기**

- 있음 → `x-7.2`
- 없음 → 제출

#### x-7.2 가장 대표적인 프로젝트를 간단히 작성해주세요.

**단답형 · 필수** · 예시는 직군별 문서에 있다.

#### x-7.3 해당 프로젝트에서 담당한 역할을 간단히 작성해주세요.

**장문형 · 필수** · 예시는 직군별 문서에 있다.

---

## 4. 프론트엔드 (FE)

### 섹션 1 · 기본 정보

- **FE-1.1** 현재 지원 유형 → [§3.4](#x-11-현재-지원-유형)

### 섹션 2 · 관심 직무

#### FE-2.1 가장 관심 있거나 지원하고 있는 프론트엔드 직무는 무엇인가요?

**단일 선택 · 필수 · 분기**

| 선택지 | 이동할 심화 섹션 |
| --- | --- |
| 웹 프론트엔드 (서비스·제품 UI) | 5-A 웹 서비스 |
| 모바일 / 크로스플랫폼 (React Native, Flutter) | 5-B 모바일 |
| 디자인 시스템 / UI 엔지니어링 | 5-C 디자인 시스템 |
| 웹 성능 / 프론트엔드 플랫폼 (SSR, 빌드, 인프라) | 5-D 성능·플랫폼 |
| 인터랙티브 / 그래픽스 / 데이터 시각화 | 5-E 인터랙티브 |
| 아직 구체적으로 정하지 못함 | 5-F General |
| 기타 | 5-F General |

### 섹션 3 · 공통 역량

#### FE-3.1 주로 사용하는 언어를 선택해주세요.

**복수 선택 · 필수**

- JavaScript
- TypeScript
- HTML / CSS
- Dart
- Swift / Kotlin (네이티브 앱)
- 기타
- 경험 없음

#### FE-3.2 주로 사용하는 프레임워크·라이브러리를 선택해주세요.

**복수 선택 · 필수**

- React
- Next.js
- Vue
- Nuxt
- Angular
- Svelte / SvelteKit
- React Native
- Flutter
- 기타
- 경험 없음

### 섹션 4 · 경험 분야

#### FE-4.1 경험해본 프론트엔드 분야를 모두 선택해주세요.

**복수 선택 · 필수**

- 웹 서비스 UI 개발
- 어드민 / 대시보드 개발
- 모바일 앱 개발
- 디자인 시스템 / 컴포넌트 라이브러리
- 웹 성능 최적화
- 인터랙션 / 애니메이션 / 데이터 시각화
- 기타
- 경험 없음

### 섹션 5 · 직무별 심화

`FE-2.1`의 응답에 따라 아래 섹션 중 **하나만** 보여준다.

#### 5-A 웹 서비스 · FE-5A.1 경험한 웹 프론트엔드 기술을 선택해주세요.

**복수 선택 · 필수**

- 클라이언트 상태 관리 (Redux, Zustand, Recoil)
- 서버 상태 관리 (TanStack Query, SWR)
- 라우팅 / 페이지 구조 설계
- 폼 처리 / 유효성 검증
- REST / GraphQL API 연동
- 인증·인가 처리 (토큰, 세션)
- 실시간 통신 (WebSocket, SSE)
- 웹 접근성 (a11y)
- 반응형 웹
- 국제화 (i18n)
- 테스트 (Jest, Testing Library, Playwright)
- 기타
- 경험 없음

#### 5-B 모바일 · FE-5B.1 경험한 모바일 / 크로스플랫폼 기술을 선택해주세요.

**복수 선택 · 필수**

- 네이티브 모듈 / 브릿지 연동
- 앱 상태 관리
- 내비게이션 / 딥링크
- 푸시 알림
- 오프라인 저장소 / 로컬 DB
- 웹뷰 기반 하이브리드 앱
- 앱 스토어 배포 (App Store, Play Store)
- OTA 업데이트 (CodePush, EAS Update)
- 앱 성능 최적화
- 기타
- 경험 없음

#### 5-C 디자인 시스템 · FE-5C.1 경험한 디자인 시스템 / UI 엔지니어링 기술을 선택해주세요.

**복수 선택 · 필수**

- 컴포넌트 라이브러리 구축
- 컴포넌트 문서화 (Storybook)
- 디자인 토큰
- CSS-in-JS (styled-components, Emotion)
- Utility-first CSS (Tailwind CSS)
- 테마 / 다크 모드
- Figma 협업 / 디자인 핸드오프
- 접근성 가이드라인 적용
- 시각적 회귀 테스트 (Chromatic)
- 패키지 배포 / 버전 관리
- 기타
- 경험 없음

#### 5-D 성능·플랫폼 · FE-5D.1 경험한 웹 성능 / 프론트엔드 플랫폼 기술을 선택해주세요.

**복수 선택 · 필수**

- Core Web Vitals 개선
- 번들 최적화 (Code Splitting, Tree Shaking)
- SSR / SSG / ISR
- 렌더링 최적화 (메모이제이션, 가상화)
- 이미지 / 리소스 최적화
- 빌드 도구 구성 (Vite, Webpack, Turbopack)
- 모노레포 (Turborepo, Nx, pnpm workspace)
- 캐싱 전략 (CDN, Service Worker)
- 성능 모니터링 (Lighthouse, RUM)
- 마이크로 프론트엔드
- 기타
- 경험 없음

#### 5-E 인터랙티브 · FE-5E.1 경험한 인터랙티브 / 시각화 기술을 선택해주세요.

**복수 선택 · 필수**

- CSS 애니메이션 / 트랜지션
- 스크롤 기반 인터랙션
- 모션 라이브러리 (Framer Motion, GSAP)
- SVG
- Canvas 2D
- WebGL / 3D (Three.js)
- 데이터 시각화 (D3, Chart.js, ECharts)
- Lottie
- 애니메이션 성능 최적화 (60fps)
- 기타
- 경험 없음

#### 5-F General · FE-5F.1 경험한 프론트엔드 개발 기술을 선택해주세요.

**복수 선택 · 필수**

- 퍼블리싱 (HTML / CSS 마크업)
- 반응형 레이아웃
- 컴포넌트 설계
- 상태 관리
- API 연동
- 폼 처리
- 라우팅
- 스타일링 라이브러리
- 테스트 코드 작성
- Git 협업 / 코드 리뷰
- 기타
- 경험 없음

### 섹션 6 · 서비스·운영 경험

#### FE-6.1 프론트엔드 서비스를 배포·운영하며 사용해본 기술을 선택해주세요.

**복수 선택 · 필수**

- 호스팅 플랫폼 배포 (Vercel, Netlify)
- 클라우드 / CDN 배포 (AWS S3·CloudFront 등)
- CI/CD (GitHub Actions 등)
- Docker
- 에러 모니터링 (Sentry 등)
- 사용자 행동 분석 (GA, Amplitude)
- A/B 테스트 / Feature Flag
- 실사용자 대상 서비스 출시·운영
- 기타
- 경험 없음

### 섹션 7 · 프로젝트 경험

- **FE-7.1** 프로젝트 경험 여부 → [§3.4](#x-71-직군-관련-프로젝트-경험이-있나요)
- **FE-7.2** 대표 프로젝트 · 예시: `AI 채용 서비스 웹 프론트엔드 개발`
- **FE-7.3** 담당 역할 · 예시: `Next.js 기반 지원서 작성 폼과 기업 대시보드 차트 구현, SSR 적용으로 초기 로딩 개선`

---

## 5. 백엔드 (BE)

### 섹션 1 · 기본 정보

- **BE-1.1** 현재 지원 유형 → [§3.4](#x-11-현재-지원-유형)

### 섹션 2 · 관심 직무

#### BE-2.1 가장 관심 있거나 지원하고 있는 백엔드 직무는 무엇인가요?

**단일 선택 · 필수 · 분기**

| 선택지 | 이동할 심화 섹션 |
| --- | --- |
| 서버 / API 백엔드 | 5-A 서버·API |
| 대규모 트래픽 / 분산 시스템 | 5-B 분산 시스템 |
| 데이터 엔지니어 | 5-C 데이터 |
| DevOps / 인프라 / SRE | 5-D 인프라 |
| 아직 구체적으로 정하지 못함 | 5-E General |
| 기타 | 5-E General |

### 섹션 3 · 공통 역량

#### BE-3.1 주로 사용하는 언어를 선택해주세요.

**복수 선택 · 필수**

- Java
- Kotlin
- Python
- JavaScript / TypeScript
- Go
- C#
- 기타
- 경험 없음

#### BE-3.2 주로 사용하는 프레임워크를 선택해주세요.

**복수 선택 · 필수**

- Spring Boot
- Django
- FastAPI
- Flask
- NestJS
- Express
- Gin / Echo (Go)
- 기타
- 경험 없음

#### BE-3.3 사용 경험이 있는 데이터베이스를 선택해주세요.

**복수 선택 · 필수**

- MySQL / MariaDB
- PostgreSQL
- Oracle
- MongoDB
- Redis
- 기타
- 경험 없음

### 섹션 4 · 경험 분야

#### BE-4.1 경험해본 백엔드 분야를 모두 선택해주세요.

**복수 선택 · 필수**

- 서버 / API 개발
- 대규모 트래픽 처리 / 분산 시스템
- 데이터 파이프라인 / 데이터 엔지니어링
- 인프라 / DevOps
- 인증 / 보안
- 기타
- 경험 없음

### 섹션 5 · 직무별 심화

`BE-2.1`의 응답에 따라 아래 섹션 중 **하나만** 보여준다.

#### 5-A 서버·API · BE-5A.1 경험한 서버 / API 기술을 선택해주세요.

**복수 선택 · 필수**

- REST API 설계
- GraphQL / gRPC
- ORM (JPA, Hibernate, Prisma 등)
- 인증·인가 (JWT, OAuth, 세션)
- 메시지 큐 (Kafka, RabbitMQ)
- 캐시 (Redis, 로컬 캐시)
- 비동기 / 이벤트 기반 처리
- 트랜잭션 / 동시성 제어
- 검색 엔진 (Elasticsearch, OpenSearch)
- 실시간 통신 (WebSocket, SSE)
- 테스트 코드 (단위·통합 테스트)
- 기타
- 경험 없음

#### 5-B 분산 시스템 · BE-5B.1 경험한 대규모 트래픽 / 분산 시스템 기술을 선택해주세요.

**복수 선택 · 필수**

- MSA 설계 / 서비스 분리
- 이벤트 기반 아키텍처
- 분산 트랜잭션 (Saga, Outbox)
- DB 레플리케이션 / 샤딩
- 쿼리 튜닝 / 인덱스 최적화
- 분산 락
- Rate Limiting
- 장애 격리 (Circuit Breaker, Retry)
- 부하 테스트 (nGrinder, k6, JMeter)
- 대용량 트래픽 처리 경험
- 기타
- 경험 없음

#### 5-C 데이터 · BE-5C.1 경험한 데이터 엔지니어링 기술을 선택해주세요.

**복수 선택 · 필수**

- ETL / ELT 파이프라인
- 배치 처리 (Spark 등)
- 스트림 처리 (Kafka Streams, Flink)
- Workflow Orchestration (Airflow 등)
- 데이터 웨어하우스 (BigQuery, Redshift, Snowflake)
- 데이터 레이크 / 레이크하우스
- 데이터 모델링
- CDC (Debezium 등)
- 로그 수집 파이프라인
- 데이터 품질 관리
- 기타
- 경험 없음

#### 5-D 인프라 · BE-5D.1 경험한 DevOps / 인프라 / SRE 기술을 선택해주세요.

**복수 선택 · 필수**

- IaC (Terraform 등)
- 컨테이너 오케스트레이션 (Kubernetes)
- CI/CD 파이프라인 구축
- 메트릭 모니터링 (Prometheus, Grafana)
- 로그 수집·분석 (ELK, Loki)
- 분산 트레이싱
- 오토스케일링
- 네트워크 / 로드밸런싱
- 장애 대응 / 온콜
- 클라우드 비용 최적화
- 기타
- 경험 없음

#### 5-E General · BE-5E.1 경험한 백엔드 개발 기술을 선택해주세요.

**복수 선택 · 필수**

- CRUD API 개발
- DB 설계 (ERD)
- 로그인 / 회원 기능 구현
- 파일 업로드 / 스토리지 연동
- 외부 API 연동
- API 문서화 (Swagger 등)
- 테스트 코드 작성
- 서버 배포
- Git 협업 / 코드 리뷰
- 기타
- 경험 없음

### 섹션 6 · 서비스·운영 경험

#### BE-6.1 백엔드 서비스를 개발·운영하며 사용해본 기술을 선택해주세요.

**복수 선택 · 필수**

- Docker
- Kubernetes
- AWS / GCP / Azure
- CI/CD
- 모니터링 / 로깅
- 실사용자 대상 서비스 배포·운영
- 장애 대응
- 부하 테스트
- 기타
- 경험 없음

### 섹션 7 · 프로젝트 경험

- **BE-7.1** 프로젝트 경험 여부 → [§3.4](#x-71-직군-관련-프로젝트-경험이-있나요)
- **BE-7.2** 대표 프로젝트 · 예시: `AI 채용 서비스 백엔드 개발`
- **BE-7.3** 담당 역할 · 예시: `인증·알림 API 개발, RabbitMQ 기반 비동기 처리`

---

## 6. AI/ML (AI)

원안의 구조를 유지하고, 누락·중복된 부분만 보완했다. 바뀐 점은 [§8.3](#83-aiml)에 정리했다.

### 섹션 1 · 기본 정보

- **AI-1.1** 현재 지원 유형 → [§3.4](#x-11-현재-지원-유형)

### 섹션 2 · 관심 직무

#### AI-2.1 가장 관심 있거나 지원하고 있는 AI 직무는 무엇인가요?

**단일 선택 · 필수 · 분기**

| 선택지 | 이동할 심화 섹션 |
| --- | --- |
| LLM / Generative AI Engineer | 5-A LLM / Generative AI |
| Computer Vision / Multimodal Engineer | 5-B CV / Multimodal |
| NLP / Speech AI Engineer | 5-C NLP / Speech |
| 추천 / 검색 ML Engineer | 5-D 추천 / 검색 |
| MLOps / ML Platform Engineer | 5-E MLOps |
| Robotics / Physical AI / Edge AI | 5-F Robotics / Edge |
| AI / ML Engineer | 5-G General |
| AI Research Engineer | 5-G General |
| 아직 구체적으로 정하지 못함 | 5-G General |
| 기타 | 5-G General |

### 섹션 3 · 공통 역량

#### AI-3.1 주로 사용하는 언어를 선택해주세요. *(신규)*

**복수 선택 · 필수**

- Python
- C / C++
- Java / Kotlin
- JavaScript / TypeScript
- R
- 기타
- 경험 없음

#### AI-3.2 사용 경험이 있는 ML/DL 프레임워크 및 라이브러리를 선택해주세요.

**복수 선택 · 필수**

- PyTorch
- TensorFlow / Keras
- Hugging Face
- Scikit-learn
- XGBoost / LightGBM
- 기타
- 경험 없음

### 섹션 4 · 경험 분야

#### AI-4.1 경험해본 AI 분야를 모두 선택해주세요. *(원안 누락분 보완)*

**복수 선택 · 필수**

- LLM / Generative AI
- NLP (텍스트)
- Speech / Audio
- Computer Vision
- Multimodal
- 추천 / 검색
- MLOps / ML Platform
- Robotics / Edge AI
- 정형 데이터 / 전통 ML
- 기타
- 경험 없음

### 섹션 5 · 직무별 심화

`AI-2.1`의 응답에 따라 아래 섹션 중 **하나만** 보여준다. 선택지는 원안과 같고, 마지막 두 항목만 R3에 맞춰 `기타`, `경험 없음`으로 통일했다.

#### 5-A LLM / Generative AI · AI-5A.1 경험한 LLM / Generative AI 기술을 선택해주세요.

- Prompt Engineering
- Embedding
- Vector DB / Vector Search
- RAG
- Reranking
- Fine-tuning / SFT
- LoRA / QLoRA
- AI Agent
- Tool / Function Calling
- MCP
- Agent 프레임워크 (LangChain, LangGraph, LlamaIndex)
- LLM Evaluation
- Guardrail / Safety
- 기타
- 경험 없음

#### 5-B CV / Multimodal · AI-5B.1 경험한 CV / Multimodal 기술을 선택해주세요.

- Image Classification
- Object Detection
- Segmentation
- Object Tracking
- OCR
- Pose Estimation
- Image Generation
- Vision-Language Model (VLM)
- Multimodal Model
- Video Analysis
- 기타
- 경험 없음

#### 5-C NLP / Speech · AI-5C.1 경험한 NLP / Speech 기술을 선택해주세요.

- Text Classification
- Information Extraction
- Semantic Search
- STT / ASR
- TTS
- Speech Emotion Recognition
- Speaker Recognition
- Audio Classification
- Audio Feature Extraction
- Voice Conversion
- 기타
- 경험 없음

#### 5-D 추천 / 검색 · AI-5D.1 경험한 추천·검색 기술을 선택해주세요.

- Collaborative Filtering
- Content-based Recommendation
- Embedding-based Recommendation
- Learning to Rank
- CTR / CVR Prediction
- Search / Information Retrieval
- Reranking
- Personalization
- Cold Start 대응
- A/B Test
- 기타
- 경험 없음

#### 5-E MLOps · AI-5E.1 경험한 MLOps / ML Platform 기술을 선택해주세요.

- Experiment Tracking
- Model Registry
- Training Pipeline
- Model Serving
- Feature Pipeline / Feature Store
- ML CI/CD
- Model Monitoring
- Data / Model Drift Monitoring
- GPU Infrastructure
- Distributed Training
- Workflow Orchestration
- 기타
- 경험 없음

#### 5-F Robotics / Edge · AI-5F.1 경험한 Robotics / Edge AI 기술을 선택해주세요.

- Robot Perception
- Object Detection / Tracking
- Sensor Fusion
- VLM / VLA
- SLAM
- ROS / ROS2
- Edge Inference
- ONNX
- TensorRT
- Quantization
- Pruning / Model Compression
- Real-time Inference Optimization
- 기타
- 경험 없음

#### 5-G General · AI-5G.1 경험한 모델 개발 기술을 선택해주세요.

- 데이터 수집
- 데이터 전처리
- Feature Engineering
- 모델 학습
- Fine-tuning
- Hyperparameter Tuning
- 모델 평가
- 데이터 증강
- 데이터 라벨링 / Dataset 구축
- 분산 학습
- 모델 경량화 / Quantization
- 추론 최적화
- 기타
- 경험 없음

### 섹션 6 · 서비스·운영 경험

#### AI-6.1 AI 모델 또는 서비스를 개발·운영하면서 사용해본 기술을 선택해주세요.

**복수 선택 · 필수**

- 모델 API 서비스 배포 (도구는 AI-6.2에서 선택)
- Docker
- Kubernetes
- AWS / GCP / Azure
- 실험 관리 (MLflow, Weights & Biases)
- Workflow Orchestration (Airflow, Kubeflow)
- CI/CD
- Model Monitoring
- GPU Server 운영
- 기타
- 경험 없음

#### AI-6.2 모델 Serving / Inference 관련 사용 경험이 있는 기술을 선택해주세요.

**복수 선택 · 필수**

- FastAPI / Flask
- Triton Inference Server
- KServe / BentoML
- vLLM
- SGLang
- ONNX Runtime
- TensorRT / TensorRT-LLM
- 직접 Serving 환경 구축
- 기타
- 경험 없음

> 응답 시간이 길어지면 AI-6.1과 AI-6.2를 하나로 합쳐도 된다(원안 유지). 합치면 AI 문항 수는 FE와 같은 10개가 된다.

### 섹션 7 · 프로젝트 경험

- **AI-7.1** 프로젝트 경험 여부 → [§3.4](#x-71-직군-관련-프로젝트-경험이-있나요)
- **AI-7.2** 대표 프로젝트 · 예시: `RAG 기반 사내 문서 검색 AI 서비스`
- **AI-7.3** 담당 역할 · 예시: `임베딩 검색 및 Reranking 파이프라인을 구축하고 FastAPI 기반 모델 Serving을 담당`

---

## 7. 직군 간 비교

### 7.1 노출 문항 수 (최대, 프로젝트 `있음` 기준)

| 섹션 | FE | BE | AI |
| --- | --- | --- | --- |
| 1 기본 정보 | 1 | 1 | 1 |
| 2 관심 직무 | 1 | 1 | 1 |
| 3 공통 역량 | 2 | 3 | 2 |
| 4 경험 분야 | 1 | 1 | 1 |
| 5 직무별 심화 | 1 | 1 | 1 |
| 6 서비스·운영 | 1 | 1 | 2 |
| 7 프로젝트 | 3 | 3 | 3 |
| **합계** | **10** | **11** | **11** |

세 직군 모두 AC-S-6(12개 이하)을 만족한다.

### 7.2 분석 축 매핑

| 분석 축 | FE | BE | AI |
| --- | --- | --- | --- |
| 지원 유형별 수요 | FE-1.1 | BE-1.1 | AI-1.1 |
| 세부 직무 관심도 | FE-2.1 | BE-2.1 | AI-2.1 |
| 관심 vs 실제 경험 차이 | FE-2.1 × FE-4.1 | BE-2.1 × BE-4.1 | AI-2.1 × AI-4.1 |
| 주력 스택 | FE-3.1, FE-3.2 | BE-3.1 ~ BE-3.3 | AI-3.1, AI-3.2 |
| 심화 숙련도 (선택 개수) | FE-5X.1 | BE-5X.1 | AI-5X.1 |
| 실서비스 경험 여부 | FE-6.1 | BE-6.1 | AI-6.1, AI-6.2 |
| 프로젝트 보유율 | FE-7.1 | BE-7.1 | AI-7.1 |

---

## 8. 원안 대비 변경 내역

### 8.1 프론트엔드

| 원안 문항 | 정규화 후 | 변경 |
| --- | --- | --- |
| 지원 유형 (신입/이직/대학생) | FE-1.1 | 선택지를 공통 5개로 확장 |
| — | FE-2.1 | **신규** 관심 직무 (분기 기준) |
| 주 사용 언어 | FE-3.1 | 선택지 정의 |
| 주 사용 프레임워크 | FE-3.2 | 선택지 정의 |
| — | FE-4.1 | **신규** 경험 분야 |
| 경험한 기술 | FE-5A.1 ~ FE-5F.1 | 직무별 심화로 분리하고 선택지 정의 |
| — | FE-6.1 | **신규** 서비스·운영 경험 |
| 프로젝트 경험 여부 | FE-7.1 | 분기 추가 (없음 → 제출) |
| 대표 프로젝트 | FE-7.2 | 예시 추가 |
| 프로젝트에서 담당한 역할 | FE-7.3 | 예시 추가, 장문형으로 변경 |

### 8.2 백엔드

| 원안 문항 | 정규화 후 | 변경 |
| --- | --- | --- |
| 지원 유형 (신입/이직/대학생) | BE-1.1 | 선택지를 공통 5개로 확장 |
| — | BE-2.1 | **신규** 관심 직무 (분기 기준) |
| 주 사용 언어 | BE-3.1 | `C#`, `경험 없음` 추가 |
| 주 사용 프레임워크 | BE-3.2 | `Flask`, `Gin / Echo`, `경험 없음` 추가 |
| 사용 경험 있는 DB | BE-3.3 | `MySQL`을 `MySQL / MariaDB`로 변경, `경험 없음` 추가 |
| — | BE-4.1 | **신규** 경험 분야 |
| 경험한 기술 · JPA·ORM, 메시지 큐, 캐시 | BE-5A.1 | 서버·API 심화로 이동 |
| 경험한 기술 · Docker, AWS·Cloud, CI/CD, Kubernetes | BE-6.1 | 서비스·운영 공통 섹션으로 이동 |
| 프로젝트 경험 여부 | BE-7.1 | 분기 추가 (없음 → 제출) |
| 대표 프로젝트 | BE-7.2 | 원안 예시 유지 |
| 프로젝트에서 담당한 역할 | BE-7.3 | 원안 예시 유지, 장문형으로 변경 |

### 8.3 AI/ML

| 원안 | 정규화 후 | 변경 |
| --- | --- | --- |
| Q1 지원 유형 | AI-1.1 | `현직자`를 `현직자 (이직 계획 없음)`으로 변경 |
| Q2 관심 AI 직무 | AI-2.1 | 표 순서를 심화 섹션 순서에 맞춤. 분기 대상은 같음 |
| — | AI-3.1 | **신규** 주 사용 언어 (세 직군의 공통 역량을 맞추기 위해) |
| Q3 프레임워크 | AI-3.2 | 그대로 |
| 흐름도의 "4. 경험 분야" (본문 누락) | AI-4.1 | **누락분 보완** |
| 심화 A `LLM / NLP` | AI-5A.1 | 섹션명을 `LLM / Generative AI`로 변경 (5-C와 NLP 중복 해소) |
| 심화 A `LangChain / LangGraph / LlamaIndex` | AI-5A.1 | `Agent 프레임워크 (…)`로 변경 (R5) |
| 심화 A~G | AI-5A.1 ~ AI-5G.1 | 선택지는 그대로 |
| Q5 `FastAPI / Flask 등 API Serving` | AI-6.1 | `모델 API 서비스 배포`로 변경 (AI-6.2와 중복 해소) |
| Q5 `MLflow / W&B`, `Airflow / Kubeflow` | AI-6.1 | 상위 개념명 붙임 (R5) |
| Q6 `ONNX` | AI-6.2 | `ONNX Runtime`으로 변경 (5-F의 ONNX 변환과 구분) |
| Q7 ~ Q9 | AI-7.1 ~ AI-7.3 | 번호 정리 (원안은 섹션 4 다음이 6) |

---

## 9. 후속 작업

이 문서 범위 밖이다. 진행할 때 이슈를 따로 만든다.

1. **설문 수집 방식 결정** — [§10](#10-미결정-사항) 1번이 정해져야 시작할 수 있다.
2. **랜딩 사전예약 폼 연동** (`apps/web/src/components/DemoSection.jsx`)
   - 직군 선택 → 분기형 설문 UI
   - R4(`경험 없음` 배타 선택)를 UI에서 강제
3. **API / DB**
   - `POST /api/v1/reservations` 요청에 설문 응답 추가, 또는 별도 엔드포인트 신설
   - 저장 방식: 문항 ID를 키로 하는 `jsonb` 한 컬럼 vs 정규화 테이블(`survey_answers`)
   - 문항 ID와 선택지 코드를 `docs/spec/`에 계약으로 고정

## 10. 미결정 사항

| # | 항목 | 선택지 | 제안 |
| --- | --- | --- | --- |
| 1 | 수집 수단 | (a) Google Forms (b) 랜딩 폼 자체 구현 | 데모 모집 일정이 급하면 (a)로 먼저 받고, 전환 지표 연결이 필요하면 (b) |
| 2 | 폼 분리 | (a) 단일 폼 + 첫 문항에서 직군 분기 (b) 직군별 3개 폼 | (a). 사전예약 진입점이 하나이고, 직군별 유입 비율도 함께 볼 수 있다 |
| 3 | 직군 선택 문항 | 프론트엔드 / 백엔드 / AI·ML 외에 `기타 개발 직군`을 둘지 | 둔다. 다만 심화 없이 섹션 1, 7만 노출 |
| 4 | AI-6.1 / AI-6.2 병합 | 유지 vs 병합 | 첫 배포는 유지하고, 이탈률을 보고 판단 |
| 5 | 필수 여부 | 전 문항 필수 vs 섹션 5·6 선택 | 전 문항 필수. `경험 없음`이 있어서 필수로 해도 응답 부담이 없다 |
