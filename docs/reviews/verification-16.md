# shadcn/ui 로컬 검증 — 이슈 #16

2026-10-13 · 작업 브랜치 `codex/16-shadcn-landing-ui`

예약 폼과 CTA·카드·배지·프로필·상태 안내에 공통 UI 12종을 적용했다. 공식 JavaScript/Radix 컴포넌트 소스를 사용하고 cn은 로컬 clsx/tailwind-merge 유틸리티로 통일했다. Card의 presentation/asChild와 RadioGroupItem의 children 지원으로 기존 연출 DOM과 카드 선택 레이아웃을 유지한다. Tailwind preflight를 가져오지 않고 기존 reset·색상·폰트·dark 테마를 재사용한다.

랜딩 수집 범위는 직군·지원 유형·세부 직무·이름·이메일과 동의다. 상세 설문과 프로젝트 입력은 추가하지 않았다. 기존 초기 토큰 보관은 유지하며 이어쓰기 안내는 제거했다. 요청 문구는 “기업이 먼저 컨택합니다.”로 반영했다.

## 검증

- `npm run build:web`: 성공.
- `npm run test:e2e --workspace=@weiver/web`: 20개 통과, desktop 1280×900 / mobile 390×844.
- 예약 필수/동의·직군 변경 초기화·코드 payload·완료 이벤트·토큰 비노출/보관·저장소 실패·중복 이메일 회귀 확인.
- RadioGroup 방향키 및 Checkbox Space, 동의 오류 안내, 제출 중 비활성화, 서버 오류 후 입력 유지/재시도 확인.
- Hero 재생/정지와 CTA 이동, reduced motion, dark 모드, 모바일 가로 넘침 및 정적 이미지/favicon/로고 경로 확인.
- test-results의 라이트·다크 예약 화면 캡처를 시각 검토했다. 이미지는 테스트 출력이며 저장소에 커밋하지 않는다.
- `git diff --check`: 통과. source-map-js 패치 후 npm audit 취약점 0.

초기 테스트는 이전 5173 개발 서버의 오래된 alias 설정을 재사용해 실패했다. 독립 5199 테스트 서버를 사용해 해결했다. RadioGroup 키보드 테스트는 사용자 키 입력 시간을 반영했고, 모바일 CTA 검증은 제출 버튼이 아니라 실제 이동 대상인 예약 섹션 제목을 기준으로 한다.

## 로컬 확인 및 한계

`npm run dev:web`의 기본 포트는 3000이며 CLI 옵션도 전달된다. 현재 서버는 `http://127.0.0.1:3000/landing-assets/`에서 실행 중이다. `/` 요청은 Vite의 에셋 base 경로로 이동한다. 테스트 서버 5199는 매 실행마다 별도 실행/종료하여 기존 개발 서버를 재사용하지 않는다.

브라우저 검증의 API 응답은 모의 처리했다. 로컬 API 기본값은 `http://localhost:8080`이며 이번 작업에서 API 서버는 실행하지 않았다. 이번 UI의 운영 배포·공개 경로 인수는 아직 미완료다. API/DB 변경이 없어 백엔드 테스트는 재실행하지 않았다. 도메인 PR #18을 기반으로 한 작업이므로 정식 병합 순서에서 의존 관계를 확인해야 한다.

## 커스텀 Select 후속 — 2026-10-13

예약의 세 선택 필드를 NativeSelect에서 shadcn Select로 교체했다. 폼 값 선택용 컴포넌트이며 동작 메뉴용 DropdownMenu는 도입하지 않는다. 필수 선택 검증은 상태값 기반으로 명시적으로 수행하고 FieldError/aria-invalid/오류 포커스를 연결한다. 선택 코드와 직군 변경 시 세부 직무 초기화는 유지한다. 포털 목록의 테마·충돌 처리·긴 문구 줄바꿈을 적용했다.

변경 후 빌드 및 기존 20개 회귀 테스트가 통과했다. 추가 `--grep 'custom dropdown'` 테스트 2개도 통과해 총 22개 사례를 확인했다. 키보드 선택/Home/Enter, Escape/포커스 복귀, 필수 누락 검증, 모바일 긴 항목 및 열린 목록 캡처를 확인했다. 목록 캡처는 열림 애니메이션 종료를 기다린 뒤 시각 검토했다. 운영 배포는 여전히 미완료다.
