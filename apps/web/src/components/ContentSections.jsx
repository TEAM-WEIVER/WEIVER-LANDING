import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useEffect, useRef } from 'react';
import DemoSection from './DemoSection';
import { track } from '../api';

// 섹션별 IntersectionObserver — 50% 노출 시 세션당 1회 전송
function useSectionTracking() {
  useEffect(() => {
    const seen = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.sectionId;
          if (entry.isIntersecting && id && !seen.has(id)) {
            seen.add(id);
            track('section_view', { sectionId: id, threshold: '0.5' });
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll('[data-section-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function handleCtaClick(ctaId, sectionId) {
  track('cta_clicked', { ctaId, sectionId, target: 'reserve' });
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ===== 챕터 스크롤 =====
function useChaptersScroll() {
  useEffect(() => {
    const clamp = (v) => Math.min(Math.max(v, 0), 1);
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => t * t * (3 - 2 * t);
    const chapters = Array.from(document.querySelectorAll('.chapter'));

    // 단어별 opacity 애니메이션용 span 삽입
    chapters.forEach((ch) => {
      const q = ch.querySelector('.q');
      q.innerHTML = q.textContent
        .split(' ')
        .map((w) => `<span class="w">${w}</span>`)
        .join(' ');
      ch._words = q.querySelectorAll('.w');
      ch._ics = ch.querySelectorAll('.solcard .ic');
    });

    // ch1: 자소서 질문 카드
    const QS = [
      ['기업 A', '지원 동기를 작성해 주세요.'],
      ['기업 B', '우리 회사에 지원한 이유는 무엇인가요?'],
      ['기업 C', '입사 후 이루고 싶은 목표를 적어 주세요.'],
      ['기업 D', '본인의 강점을 경험을 바탕으로 서술하세요.'],
      ['기업 E', '지원 직무와 관련된 경험을 작성해 주세요.'],
      ['기업 F', '협업 중 갈등을 해결한 경험을 적어 주세요.'],
      ['기업 G', '당사를 선택한 이유와 포부를 작성하세요.'],
      ['기업 H', '가장 도전적이었던 경험은 무엇인가요?'],
      ['기업 I', '직무 역량을 키우기 위해 노력한 점은?'],
      ['기업 J', '실패를 극복한 경험을 서술해 주세요.'],
      ['기업 K', '입사 후 5년 뒤 나의 모습은?'],
      ['기업 L', '지원 분야에 관심을 갖게 된 계기는?'],
    ];
    const POS = [
      [-0.62, -0.66, -5], [0.55, -0.72, 4], [-0.08, -0.52, -2], [0.7, -0.22, 3],
      [-0.72, -0.18, 4], [0.1, -0.1, -3], [-0.5, 0.3, -4], [0.62, 0.28, 5],
      [0.05, 0.42, 2], [-0.66, 0.72, 3], [0.5, 0.72, -4], [0, 0.1, 1],
    ];
    const vis1 = document.getElementById('vis1');
    const cards1 = vis1
      ? QS.map((q) => {
          const d = document.createElement('div');
          d.className = 'qc';
          d.innerHTML = `<small>${q[0]} 자기소개서</small><b>${q[1]}</b><i></i>`;
          vis1.insertBefore(d, vis1.firstChild);
          return d;
        })
      : [];

    function draw1(a, b) {
      if (!vis1) return;
      const W = vis1.clientWidth, H = vis1.clientHeight, n = cards1.length;
      cards1.forEach((el, i) => {
        const ai = ease(clamp(a * (n + 2) - i * 1.05));
        const bi = ease(clamp(b * 1.7 - (n - 1 - i) * 0.05));
        const x = POS[i][0] * W * (W < 600 ? 0.3 : 0.44) * (1 - bi);
        const y = POS[i][1] * H * 0.46 * (1 - bi) + (1 - ai) * 24;
        const r = POS[i][2] * (1 - bi);
        el.style.opacity = (ai * (1 - bi)).toFixed(3);
        el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r}deg) scale(${((0.92 + 0.08 * ai) * (1 - 0.6 * bi)).toFixed(3)})`;
      });
    }

    // ch2: 채용 일정 캘린더
    const EV = [
      [2,'A사 인적성','t'], [4,'B사 1차 면접','i'], [7,'C사 코딩테스트','c'],
      [9,'D사 인적성','t'], [11,'A사 1차 면접','i'], [14,'E사 인적성','t'],
      [16,'F사 과제 전형','c'], [18,'B사 2차 면접','i'], [21,'G사 인적성','t'],
      [23,'H사 코딩테스트','c'], [25,'C사 1차 면접','i'], [28,'I사 인적성','t'],
      [30,'J사 1차 면접','i'],
    ];
    const calg = document.getElementById('calg');
    const calc = document.getElementById('calc');
    const evs = [];
    if (calg) {
      calg.innerHTML = '';
      for (let d = 0; d < 35; d++) {
        const cell = document.createElement('div');
        cell.textContent = d < 31 ? String(d + 1) : '';
        EV.forEach((e) => {
          if (e[0] === d) {
            const s = document.createElement('span');
            s.className = `ev ${e[2]}`;
            s.textContent = e[1];
            cell.appendChild(s);
            evs.push(s);
          }
        });
        calg.appendChild(cell);
      }
    }

    function draw2(a) {
      let shown = 0;
      const n = evs.length;
      evs.forEach((el, i) => {
        const t = ease(clamp(a * (n + 1) - i));
        if (t > 0.5) shown++;
        el.style.opacity = t;
        el.style.transform = `scale(${0.8 + 0.2 * t})`;
      });
      if (calc) calc.textContent = `${shown}건`;
    }

    // ch3: 결과 대기 → 받은 제안
    const waitRows = document.querySelectorAll('#vis3 .wait .irow');
    const offerRows = document.querySelectorAll('#vis3 .offers .irow');

    function draw3(a, b, c) {
      const n = waitRows.length;
      waitRows.forEach((el, i) => {
        const t = ease(clamp(a * (n + 1) - i));
        const out = ease(clamp(b * 1.6 - i * 0.12));
        el.style.opacity = (t * (1 - out)).toFixed(3);
        el.style.transform = `translateX(${(-(1 - t) * 16 - out * 40).toFixed(1)}px)`;
      });
      offerRows.forEach((el, i) => {
        const t = ease(clamp(c * (offerRows.length + 1) - i));
        el.style.opacity = t;
        el.style.transform = `translateX(${((1 - t) * 50).toFixed(1)}px)`;
      });
    }

    const draws = [draw1, draw2, draw3];

    function update() {
      const vh = window.innerHeight;
      chapters.forEach((ch, k) => {
        const r = ch.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 1.5) return;
        const p = clamp(-r.top / (ch.offsetHeight - vh));
        const a = seg(p, 0.02, 0.36);
        const b = seg(p, 0.44, 0.6);
        const c = seg(p, 0.58, 0.76);
        const n = ch._words.length;
        ch._words.forEach((w, i) => {
          w.style.opacity = (0.12 + 0.88 * clamp(a * (n + 1) - i)).toFixed(3);
        });
        ch.style.setProperty('--b', ease(b).toFixed(3));
        ch.style.setProperty('--c', ease(c).toFixed(3));
        ch.classList.toggle('solved', b > 0.5);
        ch._ics.forEach((ic, i) => {
          ic.style.setProperty('--s', ease(clamp(c * 4 - i - 0.5)).toFixed(3));
        });
        draws[k](a, b, c);
      });
    }

    let pending = false;
    function onScroll() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => { pending = false; update(); });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);
}

// ===== journey 스크롤 =====
function useJourneyScroll() {
  useEffect(() => {
    const j = document.querySelector('.journey');
    if (!j) return;

    const items = j.querySelectorAll('.j-item');
    const barsEl = document.getElementById('jbars');
    if (barsEl) {
      for (let k = 0; k < 18; k++) {
        const b = document.createElement('i');
        b.style.setProperty('--k', k);
        barsEl.appendChild(b);
      }
    }

    let cur = -1;
    function update() {
      const r = j.getBoundingClientRect();
      const total = j.offsetHeight - window.innerHeight;
      const p = Math.min(Math.max(-r.top / total, 0), 0.999);
      const step = Math.floor(p * 4);
      if (step === cur) return;
      cur = step;
      j.setAttribute('data-step', step);
      j.style.setProperty('--step', step);
      items.forEach((el, i) => el.classList.toggle('on', i === step));
    }

    function onScroll() { requestAnimationFrame(update); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);
}

// ===== fit 스크롤 =====
function useFitScroll() {
  useEffect(() => {
    const sec = document.querySelector('.fit');
    if (!sec) return;

    const clamp = (v) => Math.min(Math.max(v, 0), 1);
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => t * t * (3 - 2 * t);

    const AX = ['성장가능성', '일관성', '문제해결력', '논리성', '협업·팀워크', '대처능력'];
    const ME = [92, 81, 74, 96, 64, 54];
    const CO = [
      { k: 'A', s: 88, ideal: [95, 66, 88, 86, 60, 52], pr: [0, 2, 3] },
      { k: 'B', s: 74, ideal: [60, 76, 68, 58, 96, 90], pr: [4, 5, 1] },
      { k: 'C', s: 93, ideal: [90, 84, 72, 98, 60, 50], pr: [3, 0, 1] },
    ];

    const C = 150, R = 104;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.getElementById('radar2');
    if (!svg) return;

    function pt(i, r) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      return [C + r * Math.cos(a), C + r * Math.sin(a)];
    }
    function pts(vals, k) {
      return vals
        .map((v, i) => pt(i, (R * v) / 100 * k).map((n) => n.toFixed(1)).join(','))
        .join(' ');
    }
    function el(tag, attrs) {
      const e = document.createElementNS(NS, tag);
      for (const a in attrs) e.setAttribute(a, attrs[a]);
      svg.appendChild(e);
      return e;
    }

    [1, 0.75, 0.5, 0.25].forEach((k) => {
      el('polygon', { class: 'rg', points: pts([100, 100, 100, 100, 100, 100], k) });
    });

    const labels = AX.map((name, i) => {
      const p = pt(i, R);
      el('line', { class: 'rg', x1: C, y1: C, x2: p[0], y2: p[1] });
      const l = pt(i, R + 20);
      const t = el('text', {
        x: l[0],
        y: l[1] + 4,
        'text-anchor': Math.abs(l[0] - C) < 5 ? 'middle' : l[0] > C ? 'start' : 'end',
      });
      t.textContent = name;
      return t;
    });

    const ideal = el('polygon', { class: 'ideal', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
    const me = el('polygon', { class: 'me' });

    const caps = sec.querySelectorAll('.fit-cap');
    const fitCard = document.getElementById('fitCard');
    const fcBody = document.getElementById('fcBody');
    const prioEl = document.getElementById('fcPrio');
    const scoreEl = document.getElementById('fitScore');
    const arcEl = document.getElementById('fitArc');
    const lblEl = document.getElementById('fitLbl');
    const chipsEl = document.getElementById('fitChips');
    const chipEls = chipsEl ? chipsEl.querySelectorAll('span') : [];
    const legI = sec.querySelector('.li');
    const legM = sec.querySelector('.lm');

    let curCo = -1, curCap = -1;

    function setCompany(n) {
      if (n === curCo) return;
      const first = curCo === -1;
      curCo = n;
      const co = CO[n];

      function fill() {
        if (document.getElementById('fcCo')) document.getElementById('fcCo').textContent = co.k;
        if (document.getElementById('fcName')) document.getElementById('fcName').textContent = `기업 ${co.k}`;
        if (lblEl) lblEl.textContent = `기업 ${co.k} 기준 매칭률`;
        if (prioEl) {
          prioEl.innerHTML = co.pr
            .map((ax, r) => `<li><small>${r + 1}순위</small>${AX[ax]}<i style="width:${100 - r * 28}%"></i></li>`)
            .join('');
        }
        chipEls.forEach((c, i) => c.classList.toggle('on', i === n));
        labels.forEach((t, i) => t.classList.toggle('pri', co.pr.indexOf(i) >= 0));
        if (fcBody) fcBody.classList.remove('swap');
      }

      if (first) {
        fill();
      } else {
        if (fcBody) fcBody.classList.add('swap');
        setTimeout(fill, 180);
      }
    }

    setCompany(0);

    function update() {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 1.5) return;
      const p = clamp(-r.top / (sec.offsetHeight - vh));
      const a = ease(seg(p, 0.03, 0.2));
      const b = ease(seg(p, 0.27, 0.42));
      const c = ease(seg(p, 0.49, 0.63));

      ideal.setAttribute('points', pts(CO[0].ideal, 1));
      ideal.setAttribute('stroke-dashoffset', (1 - a).toFixed(3));
      ideal.style.fillOpacity = a;
      me.setAttribute('points', pts(ME, b));
      me.style.opacity = b > 0 ? 1 : 0;

      const sv = c * CO[0].s;
      if (scoreEl) {
        scoreEl.firstChild.nodeValue = Math.round(sv);
        arcEl.setAttribute('stroke-dashoffset', (100 - sv).toFixed(1));
      }

      if (fitCard) {
        fitCard.style.opacity = (0.25 + 0.75 * a).toFixed(3);
        fitCard.style.transform = `translateY(${((1 - a) * 16).toFixed(1)}px)`;
      }
      if (legI) legI.style.opacity = 0.3 + 0.7 * a;
      if (legM) legM.style.opacity = 0.3 + 0.7 * b;

      const cap = p < 0.24 ? 0 : p < 0.46 ? 1 : p < 0.67 ? 2 : 3;
      if (cap !== curCap) {
        curCap = cap;
        caps.forEach((el, k) => el.classList.toggle('on', k === cap));
      }
    }

    let pending = false;
    function onScroll() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => { pending = false; update(); });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);
}

export default function ContentSections() {
  useSectionTracking();
  useChaptersScroll();
  useJourneyScroll();
  useFitScroll();

  return (
    <div className="content">
      <div className="wrap">
        {/* lead */}
        <section className="lead" id="lead" data-section-id="lead">
          <p className="tagline">기업이 먼저 찾는 역매칭 구직 서비스</p>
          <h1>한 번 준비하고, 여러 기업에게 먼저 제안받으세요.</h1>
          <p className="desc">
            기업마다 반복하던 서류와 면접 준비는 이제 한 번으로. 나의 역량을 등록하면, 기업이 먼저 컨택합니다.
          </p>
          <div className="ctas">
            <Button asChild><a
              className="btn btn-lg btn-primary"
              href="#reserve"
              onClick={(e) => { e.preventDefault(); scrollTo('section.demo'); handleCtaClick('lead_reserve', 'lead'); }}
            >
              데모 사전예약하기
            </a></Button>
            <Button asChild><a
              className="btn btn-lg btn-ghost"
              href="#how"
              onClick={(e) => { e.preventDefault(); scrollTo('#how'); }}
            >서비스 알아보기</a></Button>
          </div>
        </section>
      </div>

      {/* 챕터 3개 */}
      <section className="chapters" aria-label="구직 과정의 문제와 weiver의 해결" data-section-id="chapters">
        <article className="chapter" id="ch1">
          <div className="sticky">
            <div>
              <p className="ch-label"><span>01 / 03</span></p>
              <h2 className="q">조금씩 다른 자소서 질문에 맞추어 수십 번의 지원, 괜찮으신가요?</h2>
              <div className="sol">
                <p className="sol-label">weiver라면</p>
                <p className="sol-text">서류는 한 번만 등록하세요. 하나의 역량 프로필로 여러 기업에 닿을 수 있어요.</p>
              </div>
            </div>
            <div className="ch-vis" id="vis1">
              <Card presentation className="card vcard solcard complete-s">
                <b className="ttl">프로필 완성도</b>
                <div className="tiles">
                  <div className="tile"><b>이력서</b><Badge asChild variant="secondary"><small className="st-done">작성완료</small></Badge><i className="ic ok"></i></div>
                  <div className="tile"><b>자기소개서</b><Badge asChild variant="secondary"><small className="st-done">작성완료</small></Badge><i className="ic ok"></i></div>
                  <div className="tile"><b>포트폴리오</b><Badge asChild variant="secondary"><small className="st-done">작성완료</small></Badge><i className="ic ok"></i></div>
                </div>
              </Card>
            </div>
          </div>
        </article>

        <article className="chapter" id="ch2">
          <div className="sticky">
            <div>
              <p className="ch-label"><span>02 / 03</span></p>
              <h2 className="q">기업마다 다시 보는 인적성, 매번 처음부터 준비하는 면접.</h2>
              <div className="sol">
                <p className="sol-label">weiver라면</p>
                <p className="sol-text">AI 면접 한 번이면 충분해요. 인적성과 직무 역량을 한 번에 검증해요.</p>
              </div>
            </div>
            <div className="ch-vis" id="vis2">
              <Card presentation className="cal vcard">
                <div className="cal-h"><b>이번 달 채용 일정</b><small>인적성 · 면접 · 과제</small></div>
                <div className="cal-g" id="calg"></div>
                <span className="cal-count" id="calc">0건</span>
              </Card>
              <Card presentation className="card vcard solcard flow-s">
                <b className="ttl">AI 채용 프로세스</b>
                <div className="tiles">
                  <div className="tile"><i className="ic ok"></i><div><b>AI 서류분석</b><Badge asChild variant="secondary"><small className="st-done">분석 완료</small></Badge></div></div>
                  <div className="tile focus"><i className="ic ok"></i><div><b>AI 면접</b><Badge asChild variant="secondary"><small className="st-done">1회로 완료</small></Badge></div></div>
                  <div className="tile"><i className="ic live"></i><div><b>기업 매칭</b><Badge asChild variant="secondary"><small className="st-live">진행중</small></Badge></div></div>
                </div>
              </Card>
            </div>
          </div>
        </article>

        <article className="chapter" id="ch3">
          <div className="sticky">
            <div>
              <p className="ch-label"><span>03 / 03</span></p>
              <h2 className="q">지원서를 보낸 뒤, 연락이 오기만 기다리고 있나요?</h2>
              <div className="sol">
                <p className="sol-label">weiver라면</p>
                <p className="sol-text">이제 기업이 먼저 연락해요. 역량 프로필을 확인한 기업이 먼저 제안을 보내요.</p>
              </div>
            </div>
            <div className="ch-vis" id="vis3">
              <Card presentation className="inbox vcard">
                <div className="inbox-h">
                  <span className="h1">지원 현황</span>
                  <span className="h2">받은 제안 3건</span>
                </div>
                <div className="lists">
                  <div className="wait">
                    <div className="irow"><span className="co">A</span><span className="tx">기업 A<small>서비스 기획 지원 완료</small></span><span className="st">결과 대기 · D+21</span></div>
                    <div className="irow"><span className="co">B</span><span className="tx">기업 B<small>PM 지원 완료</small></span><span className="st">결과 대기 · D+16</span></div>
                    <div className="irow"><span className="co">C</span><span className="tx">기업 C<small>사업 기획 지원 완료</small></span><span className="st">결과 대기 · D+12</span></div>
                    <div className="irow"><span className="co">D</span><span className="tx">기업 D<small>서비스 운영 지원 완료</small></span><span className="st">결과 대기 · D+9</span></div>
                    <div className="irow"><span className="co">E</span><span className="tx">기업 E<small>콘텐츠 기획 지원 완료</small></span><span className="st">결과 대기 · D+4</span></div>
                  </div>
                  <div className="offers">
                    <div className="irow"><span className="co">A</span><span className="tx">기업 A<small>역량 프로필을 확인했어요</small></span><span className="st">면접 제안</span></div>
                    <div className="irow"><span className="co">F</span><span className="tx">기업 F<small>직무 역량이 잘 맞아요</small></span><span className="st">관심 표시</span></div>
                    <div className="irow"><span className="co">G</span><span className="tx">기업 G<small>컬처핏이 잘 맞아요</small></span><span className="st">면접 제안</span></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </article>
      </section>

      {/* fit — 인재상 × 면접 결과 = 점수 */}
      <section className="fit" aria-labelledby="fith" data-section-id="fit">
        <div className="fit-sticky">
          <div>
            <h2 className="fit-h" id="fith">
              기업이 등록한 <em>인재상</em>으로,<br />
              내 면접이 <em>점수</em>가 됩니다.
            </h2>
            <div className="fit-caps">
              <div className="fit-cap on"><span>1</span><b>기업이 원하는 인재상을 먼저 등록해요.</b><p>어떤 역량을 가장 중요하게 보는지, 우선순위를 기업이 직접 정해요.</p></div>
              <div className="fit-cap"><span>2</span><b>나의 AI 면접 결과가 같은 기준 위에 놓여요.</b><p>답변 속에 드러난 역량을 AI가 항목별로 분석해요.</p></div>
              <div className="fit-cap"><span>3</span><b>인재상과 얼마나 맞는지 점수로 환산돼요.</b><p>기업이 중요하게 보는 역량일수록 점수에 크게 반영돼요.</p></div>
              <div className="fit-cap"><span>4</span><b>같은 면접이라도, 기업마다 점수가 달라요.</b><p>그래서 나와 가장 잘 맞는 기업이 먼저 연락해요.</p></div>
            </div>
          </div>
          <div className="fit-vis" aria-hidden="true">
            <div>
              <svg className="radar2" id="radar2" viewBox="0 0 300 300"></svg>
              <div className="legend">
                <span className="li"><i></i>기업 인재상</span>
                <span className="lm"><i></i>나의 면접 결과</span>
              </div>
            </div>
            <Card presentation className="card fit-card" id="fitCard">
              <div className="fc-body" id="fcBody">
                <div className="fc-h">
                  <span className="co" id="fcCo">A</span>
                  <div><b id="fcName">기업 A</b><small>등록한 인재상</small></div>
                </div>
                <ol className="prio" id="fcPrio"></ol>
              </div>
              <div className="score">
                <svg viewBox="0 0 64 64">
                  <circle className="bg" cx="32" cy="32" r="26" />
                  <circle className="arc" id="fitArc" cx="32" cy="32" r="26" pathLength="100" strokeDasharray="100" strokeDashoffset="100" />
                </svg>
                <div>
                  <small id="fitLbl">기업 A 기준 매칭률</small>
                  <strong id="fitScore">0<span>%</span></strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* journey — 한 번의 과정이 새로운 기회로 */}
      <section className="journey" id="how" aria-labelledby="jh" data-section-id="journey" data-step="0">
        <div className="j-sticky">
          <h2 className="j-h" id="jh">한 번의 과정이 <b>새로운 기회로 이어집니다.</b></h2>
          <div className="j-now" aria-hidden="true">
            <div className="j-num">
              <span className="roll"><i>01</i><i>02</i><i>03</i><i>04</i></span>
            </div>
            <div className="j-txt">
              <div className="j-item on"><h3>서류 등록</h3><p>나의 경험과 역량을 한 번에 등록해요.</p></div>
              <div className="j-item"><h3>AI 면접 진행</h3><p>인적성과 직무 역량을 한 번에 검증해요.</p></div>
              <div className="j-item"><h3>역량 프로필 완성</h3><p>서류와 면접 결과가 하나의 프로필이 돼요.</p></div>
              <div className="j-item"><h3>기업이 먼저 컨택</h3><p>기업이 역량을 확인하고 먼저 기회를 제안해요.</p></div>
            </div>
          </div>
          <ol className="sr-only">
            <li>서류 등록: 나의 경험과 역량을 한 번에 등록해요.</li>
            <li>AI 면접 진행: 인적성과 직무 역량을 한 번에 검증해요.</li>
            <li>역량 프로필 완성: 서류와 면접 결과가 하나의 프로필이 돼요.</li>
            <li>기업이 먼저 컨택: 기업이 역량을 확인하고 먼저 기회를 제안해요.</li>
          </ol>
          <div className="j-stage" aria-hidden="true">
            <div className="j-track"><i className="j-fill"></i></div>
            <span className="gh g0">
              <svg width="143" height="185"><rect x="0" y="0" width="143" height="185" rx="11" /></svg>
              <small>서류</small>
            </span>
            <span className="gh g1">
              <svg width="154" height="154"><circle cx="77" cy="77" r="77" /></svg>
              <small>AI 면접</small>
            </span>
            <span className="gh g2">
              <svg width="192" height="170"><polygon points="48,0 144,0 192,85 144,170 48,170 0,85" /></svg>
              <small>역량 프로필</small>
            </span>
            <div className="extra x1" style={{ '--d': '.75s' }}><span className="co">B</span>기업 B가 관심을 보냈어요</div>
            <div className="extra x2" style={{ '--d': '.95s' }}><span className="co">C</span>기업 C가 프로필을 확인했어요</div>
            <div className="objw">
              <div className="obj">
                <div className="face f0">
                  <b>나의 서류</b>
                  <span className="dr"><i className="ic ok"></i>이력서</span>
                  <span className="ln"></span>
                  <span className="ln" style={{ width: '70%' }}></span>
                  <span className="dr"><i className="ic ok"></i>자기소개서</span>
                  <span className="ln"></span>
                  <span className="ln" style={{ width: '55%' }}></span>
                  <span className="dr"><i className="ic ok"></i>포트폴리오</span>
                  <span className="ln" style={{ width: '80%' }}></span>
                </div>
                <div className="face f1">
                  <span className="bars" id="jbars"></span>
                </div>
                <div className="face f2">
                  <svg viewBox="0 0 100 100">
                    <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke="#99F6E4" />
                    <polygon points="50,10 85,30 80,69 50,88 22,66 20,37" fill="rgba(45,212,191,.25)" stroke="#2DD4BF" />
                  </svg>
                  <strong>88</strong>
                  <small>스킬핏 점수</small>
                </div>
                <div className="face f3">
                  <span className="co">A</span>기업 A가 면접을 제안했어요
                </div>
              </div>
            </div>
            <div className="j-dots"><i></i><i></i><i></i><i></i></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        {/* demo + reservation */}
        <DemoSection />

        {/* footer */}
        <Separator className="footer-separator" />
        <footer>
          <span className="logo" role="img" aria-label="weiver" style={{ height: '18px', color: 'var(--ink)', display: 'block', marginBottom: '10px' }} />
          한 번의 준비로, 더 많은 가능성을.
        </footer>
      </div>
    </div>
  );
}
