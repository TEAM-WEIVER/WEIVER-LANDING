# Sticky 떨림 원인 조사 — 2026-10-16

가장 유력한 원인 후보는 **본문 전체 부모의 `overflow-x: clip`과 하위 `position: sticky`의 조합**이다. 동일 기기의 Safari에서 사용자가 확인한 결과, A 원본은 떨리고 B(`overflow: visible`)와 C(`overflow: clip`)는 매끄러웠다. 이는 해당 CSS 조건의 관여를 뒷받침하지만 엔진 내부 원인이나 다른 환경에서의 재현 여부까지 확정하지는 않는다.

## 코드·영상·공식 이슈의 연결

1. [content.css 819행](../../../apps/web/src/styles/content.css#L819)은 `.content { overflow-x: clip; }`이다. `.content` 안에 세 chapter의 `.sticky`, 매칭률의 `.fit-sticky`, 서비스 단계의 `.j-sticky`가 모두 있다. [상단 SiteHeader](../../../apps/web/src/components/SiteHeader.jsx)는 `.content` 밖의 fixed 요소다.
2. [영상 분석](../video/analysis.md)에서 이 본문 제목들은 원본 영상 기준 7~9px 흔들리고 상단 로고의 정수 픽셀 위치는 변하지 않았다. 공통 부모 설정을 원인 후보로 보는 이유다.
3. WebKit의 [버그 247130](https://bugs.webkit.org/show_bug.cgi?id=247130)은 `overflow-x: clip` 컨테이너 안의 sticky 요소가 스크롤 중 1~2px 위아래로 움직이는 현상을 보고했다. 버그 담당자는 세로 방향이 매우 큰 clipping layer를 확인했고, [수정 PR 6417](https://github.com/WebKit/WebKit/pull/6417/files)은 장치 픽셀을 표현할 수 있도록 내부 clipping rect의 수치 범위를 줄였다. 이는 과거 해당 증상의 엔진 내부 원인이고, 현재 기기의 내부 상태를 측정한 결과는 아니다.
4. 이 이슈는 **2022년에 수정 완료**됐고 [Safari Technology Preview 160 릴리스 노트](https://webkit.org/blog/13639/release-notes-for-safari-technology-preview-160/)에도 반영됐다. 유사한 증상과 CSS 구조는 강한 단서지만, iOS 27에서 같은 버그가 재발했다고 단정할 근거는 아직 없다.
5. `git blame`과 `git log -S`에 따르면 이 CSS는 `977f964f` (`feat(ui): apply shadcn controls and update landing copy`, 2026-10-13 17:40 KST)에서 추가됐다. 영상은 그 다음 날의 로컬 빌드다. 추가 시점이 증상 보고에 앞서지만, 이전 버전의 실기기 대조 결과는 없다.

## 로컬 비교 페이지

[serve-scroll-lab.mjs](../../../scripts/performance/sticky/serve-scroll-lab.mjs)를 추가했다. 기존 빌드 산출물을 읽고 진단 서버의 응답 HTML에만 CSS와 계측기를 넣는다. 제품 소스의 스크롤 동작은 변경하지 않는다.

```sh
npm run build:web
node scripts/performance/sticky/serve-scroll-lab.mjs
```

주소: http://localhost:4175/

| 조건 | 본문 부모 설정 | 목적 |
| --- | --- | --- |
| A 원본 | x=clip, y=visible | 기존 증상 재현 |
| B 부모 clip 제거 | x=visible, y=visible | clipping 관여 여부 확인 |
| C 양축 clip | x=clip, y=clip | 가로 넘침을 막으면서 한쪽 축만 clipping하는 조건을 제거 |

각 페이지에서 장면에 도착한 뒤 **갱신 멈춤**을 누르면 window의 scroll·resize 콜백을 차단한다. 터치 스크롤과 sticky는 계속 작동한다. 이미 예약된 rAF가 한 번 실행될 수 있고, 타이머와 CSS 애니메이션 전체를 정지하지는 않는다. 상단 영상이 화면 밖에서 멈춘 다음 본문 장면에서 비교해야 한다.

**좌표 기록**은 최대 15초간 `scrollY`, `innerHeight`, `visualViewport.height/offsetTop`과 sticky·부모의 DOM rect를 기록한다. **JSON 저장**으로 결과를 받을 수 있다. 강제 geometry 읽기가 측정에 영향을 줄 수 있으므로 먼저 기록을 끈 상태에서 화면 녹화로 비교한다. 세 조건은 같은 진단 패널을 사용하지만 그 패널도 원래 페이지에는 없던 fixed layer이므로, A에서 기존 증상이 재현되는지를 먼저 확인한다.

별도로 `/minimal?mode=original|visible|both`는 JavaScript 없는 최소 sticky 페이지다. 컨테이너 높이·rounded corner·sticky 제목과 카드만 남겨 비교한다.

## 완료한 검증과 남은 판단

Chromium 모바일 402×874에서:

- A/B/C의 computed overflow가 각각 의도한 값인지 확인했다.
- 세 조건에서 본문 고정 구간의 sticky top=0, viewport=402, document scrollWidth=402였다. 검사한 위치에서는 clip 제거가 가로 viewport 확대를 만들지 않았다. 모든 애니메이션 단계의 overflow를 검증한 것은 아니다.
- 갱신 멈춤 후 스크롤은 5,400→6,500px 이동했지만 chapter CSS 진행률은 그대로였다. 재개 후 진행률이 갱신됐다. 차단 이벤트도 기록했다.
- 좌표 샘플에 각 고정 영역의 top·height와 부모 범위, viewport 값이 저장되는 것을 확인했다.
- 최소 페이지 세 가지 모두 script 요소 0개, sticky top=0을 확인했다.

이 검증은 비교 도구가 작동한다는 뜻이다. iOS 떨림이 해결됐다는 검증이 아니다.

## 실기기 사용자 확인 결과

- 환경: iPhone 17 Pro, Safari, iOS 27 개발자 베타(사용자 제공).
- A: 기존 떨림 발생. B: 매끄러움. C: 매끄러움.
- C에서 세로 전환 중 잘리는 영역은 크게 없다는 사용자 확인을 받았다.
- B/C의 개선은 사용자 육안 확인이며, 변경 후 영상을 통한 픽셀 변동량 재측정은 하지 않았다.
- 제품 수정 후보는 `.content`의 `overflow-x: clip`을 `overflow: clip`으로 변경하는 것이다. 전체 화면 폭·장면 경계 검증 및 제품 적용은 별도 작업이다.

추가 조사가 필요한 경우의 판단 기준:

1. A에서 기존 떨림 재현 → B에서 소멸: 부모 clipping과 sticky 조합이 직접적인 원인 후보로 강화된다.
2. C에서도 소멸: `overflow: clip`을 양축에 지정하는 수정 후보를 제품에 적용하고, 전체 구간의 세로 잘림·그림자·focus 표시·다른 화면 폭을 확인한다.
3. A에서 갱신 멈춤만으로 소멸: JS가 유발하는 스타일/레이아웃 갱신과 sticky 합성의 상호작용을 조사한다.
4. JS 없는 최소 A에서도 재현되고 B/C에서는 소멸: 사이트 애니메이션보다 브라우저의 clipping/scrolling 처리에 무게가 실린다.
5. DOM top은 일정하지만 영상에서만 이동: 합성/표시 경로를 우선 조사한다. DOM top도 움직이면 레이아웃·viewport·scroll 위치 변화부터 추적한다.

`overflow-x: hidden`으로 바꾸면 별도의 스크롤 컨테이너를 만들 수 있어 sticky 동작 자체가 바뀌므로 이 대조 실험에는 사용하지 않았다. 양축 clip은 실기기 비교에서 개선됐으나, 제품 적용 완료나 다른 브라우저 검증 완료를 뜻하지 않는다.
