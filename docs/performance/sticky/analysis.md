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


## 양축 clip의 적용 범위와 대안 검증 — 2026-10-16

`.content`는 본문 전체를 감싸는 높이 자동 요소다. `overflow: clip`의 세로 경계는 화면 아래나 개별 sticky 장면 아래가 아니라 이 요소 전체의 경계다. 정상 흐름의 내용이 늘어나면 `.content`도 늘어난다. 반면 절대 위치·transform·그림자 등이 부모 바깥으로 넘치면 잘릴 수 있다. `clip`은 해당 요소를 스크롤 컨테이너로 만들지 않는다.

Chromium에서 402×874, 375×667, 874×402, 1440×900을 A/B/C 세 조건으로 비교했다. 각 조건에서 sticky 5개 구간의 5%, 50%, 95% 위치를 표본 측정했다. 원시 결과와 방법은 [overflow-boundaries.json](overflow-boundaries.json)에 있다.

- 각 화면 크기에서 A/B/C의 본문 높이와 문서 스크롤 높이가 같았고, 표본 위치에서 가로 스크롤 폭도 같았다.
- 402×874의 `.content` 높이는 약 23,791px였다. 화면 높이 874px에서 잘리는 구조가 아니다.
- 표본 측정에서 양의 크기와 표시 상태를 가진 후손의 bounding rect가 `.content` 상하 경계를 넘는 사례는 없었다. 그림자·outline·모든 애니메이션 시점·부모의 opacity까지 보장하는 검사는 아니다.
- 375×667에서는 `.fit-vis`가 sticky 아래로 약 21.6px 넘었다. 874×402에서는 매칭률 설명 약 102.7px, journey의 `.j-stage` 약 113.7px가 넘었다. 모두 A/B/C 공통이므로 양축 clip 도입으로 생긴 차이가 아니다.
- 375×667 스크린샷에서도 매칭률 카드 하단이 화면 아래로 나가는 것을 확인했다. 각 장면의 `height: 100svh` 안에 내용이 충분히 들어가지 않는 기존 반응형 문제다.
- Select 팝업은 코드상 Portal을 사용하므로 `.content` 내부의 일반 자식 팝업과는 clipping 조건이 다르다. 실제 키보드·확대·팝업 조작 검증은 별도로 필요하다.

현재 선택은 양축 clip 유지가 적절한 최소 수정이다. 사용자가 iOS에서 떨림 개선을 확인했고, 이번 레이아웃 표본에서 새 세로 손실은 확인되지 않았다. 단, 이것이 모든 화면·접근성 설정에서 최선임을 증명한 것은 아니다.

대안 비교:

- `overflow: visible`: 실기기에서 매끄럽고 표본에서 가로 넘침도 없었다. 다만 clip의 기존 의도를 제거하며 모든 장식·전환 상태의 넘침을 검증하지 않았으므로 반드시 더 좋은 선택은 아니다.
- 장식에만 clip: 본문 전체 clipping을 없앨 수 있지만 각 장식의 좌표·그림자·전환 영역을 따로 설계하고 iOS에서 다시 비교해야 한다. 현재 증거만으로 필요한 구조 변경은 아니다.
- 장면 내부 축소: 낮은 화면에서 여백과 장식 크기를 줄이는 별도 반응형 대안이다. 전체 transform scale이나 본문 글꼴 일괄 축소는 피하고, 그래도 내용이 넘치면 일반 문서 흐름 등 대안을 검토한다. 부모 clipping의 경계 문제를 무조건 축소로 덮지 않는다.

제품 CSS 변경 이후에도 A 대조군이 원본 조건을 유지하도록 진단 서버에서 `overflow-x: clip; overflow-y: visible`을 명시했다. 수정된 서버를 재시작해 실행 중 비교 메뉴에도 반영했다. 이 검증에 따른 변경은 커밋하지 않았다.

375×667에서 브라우저에만 `.radar2`의 max-width를 250px→210px로 임시 적용하자 `.fit-vis` 하단이 688.57px→648.57px로 바뀌어 667px 화면 아래 넘침이 21.57px→0px가 됐다. 제품 소스에는 반영하지 않았다. SVG 내부 라벨도 함께 축소되므로 가독성 검토가 필요하며 모든 장면·확대 조건의 해결을 의미하지 않는다.
