// Local-only comparison server. Run after `npm run build:web`.
// The production bundle and application sources are not rewritten.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = resolve(root, 'apps/web/dist');
const port = Number(process.env.SCROLL_LAB_PORT || 4175);
const modes = {
  original: { label: 'A · 원본 clip-x', css: '.content{overflow-x:clip!important;overflow-y:visible!important}' },
  visible: { label: 'B · 부모 clip 제거', css: '.content{overflow:visible!important}' },
  both: { label: 'C · 양축 clip', css: '.content{overflow:clip!important}' },
};

function installLab() {
  const state = window.scrollLab = { frozen: false, blockedEvents: 0, recording: false, samples: [] };
  const add = window.addEventListener;
  const remove = window.removeEventListener;
  const wrappers = new WeakMap();
  function key(type, options) { return `${type}:${Boolean(typeof options === 'boolean' ? options : options?.capture)}`; }
  window.addEventListener = function(type, listener, options) {
    if (!listener || !['scroll', 'resize'].includes(type)) return add.call(this, type, listener, options);
    let entries = wrappers.get(listener);
    if (!entries) wrappers.set(listener, entries = new Map());
    const id = key(type, options);
    if (!entries.has(id)) entries.set(id, function(event) {
      if (state.frozen) { state.blockedEvents++; return; }
      if (typeof listener === 'function') listener.call(this, event);
      else listener.handleEvent(event);
    });
    return add.call(this, type, entries.get(id), options);
  };
  window.removeEventListener = function(type, listener, options) {
    return remove.call(this, type, wrappers.get(listener)?.get(key(type, options)) || listener, options);
  };
  add.call(window, 'DOMContentLoaded', () => {
    const panel = document.createElement('div');
    panel.id = 'scroll-lab-panel';
    panel.innerHTML = '<a href="/">비교 메뉴</a><span></span><button id="lab-freeze">갱신 멈춤</button><button id="lab-record">좌표 기록</button><button id="lab-save">JSON 저장</button>';
    panel.querySelector('span').textContent = document.documentElement.dataset.scrollLab;
    document.body.appendChild(panel);
    document.getElementById('lab-freeze').onclick = event => {
      state.frozen = !state.frozen;
      event.target.textContent = state.frozen ? '갱신 재개' : '갱신 멈춤';
      event.target.setAttribute('aria-pressed', String(state.frozen));
      if (!state.frozen) window.dispatchEvent(new Event('scroll'));
    };
    let raf;
    let timer;
    function stop() {
      state.recording = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      document.getElementById('lab-record').textContent = `기록 ${state.samples.length}개`;
    }
    document.getElementById('lab-record').onclick = () => {
      if (state.recording) return stop();
      state.samples = [];
      state.recording = true;
      state.metadata = { url: location.href, ua: navigator.userAgent, dpr: devicePixelRatio, started: new Date().toISOString() };
      const targets = [...document.querySelectorAll('.sticky,.fit-sticky,.j-sticky')];
      document.getElementById('lab-record').textContent = '기록 중지';
      function sample(time) {
        state.samples.push({ time, scrollY, innerHeight, viewportHeight: visualViewport?.height,
          viewportTop: visualViewport?.offsetTop, frozen: state.frozen,
          targets: targets.map(el => {
            const r = el.getBoundingClientRect();
            const parent = el.parentElement.getBoundingClientRect();
            return { name: el.parentElement.id || el.className, top: r.top, height: r.height,
              parentTop: parent.top, parentBottom: parent.bottom };
          }) });
        if (state.recording) raf = requestAnimationFrame(sample);
      }
      raf = requestAnimationFrame(sample);
      timer = setTimeout(stop, 15000);
    };
    document.getElementById('lab-save').onclick = () => {
      stop();
      const blob = new Blob([JSON.stringify({ metadata: state.metadata, blockedEvents: state.blockedEvents,
        note: 'DOM geometry only; recording forces geometry reads and may affect timing. Compare visual shake with recording off first.', samples: state.samples }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'weiver-sticky-coordinates.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    };
  }, { once: true });
}

const panelCSS = '#scroll-lab-panel{position:fixed;z-index:99999;bottom:calc(8px + env(safe-area-inset-bottom));left:8px;right:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;background:#fff;color:#111;font:12px system-ui;border:1px solid #aaa;border-radius:8px}#scroll-lab-panel button,#scroll-lab-panel a{padding:6px;background:#eee;color:#111;border:1px solid #aaa;border-radius:4px;font:inherit}';
const menu = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>스크롤 고정 비교</title><style>body{max-width:720px;margin:40px auto;padding:0 20px;font:17px/1.7 system-ui;color:#172033}a{display:block;padding:12px;margin:10px 0;background:#edf4ff;border-radius:8px}code{font-size:14px}</style><h1>고정 장면 떨림 비교</h1><p>A와 B를 같은 장면에서 번갈아 스크롤하세요. B에서만 떨림이 사라지면 부모 클리핑과 sticky의 조합이 유력합니다. C는 가로 넘침을 막으면서 한쪽 축만 클리핑하는 조건을 제거한 후보입니다.</p>${Object.entries(modes).map(([key, mode]) => `<a href="/landing-assets/?mode=${key}">${mode.label}</a>`).join('')}<p>장면에 도착한 뒤 <b>갱신 멈춤</b>을 누르면 window의 scroll·resize 콜백을 차단합니다. 터치 스크롤과 CSS sticky는 계속 작동합니다. 타이머·CSS 애니메이션 전체를 정지하는 기능은 아닙니다.</p><p>먼저 좌표 기록 없이 육안으로 비교하세요. <b>좌표 기록</b>은 최대 15초간 DOM 위치를 읽습니다. <b>JSON 저장</b>으로 결과를 받을 수 있습니다. 계측의 위치 읽기 자체가 렌더링에 영향을 줄 수 있습니다.</p><h2>JS 없는 최소 비교</h2><p>아래 페이지는 긴 컨테이너와 고정 제목만 있습니다. 장면 갱신 코드가 없어도 떨리는지 확인합니다.</p>${Object.entries(modes).map(([key, mode]) => `<a href="/minimal?mode=${key}">최소 페이지 ${mode.label}</a>`).join('')}<p>이 서버는 진단용이며 프로덕션 번들을 그대로 읽고 응답 HTML에만 비교 설정을 추가합니다.</p></html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const mode = modes[url.searchParams.get('mode')] || modes.original;
    let body;
    let type = 'text/html; charset=utf-8';
    if (url.pathname === '/') body = menu;
    else if (url.pathname === '/minimal') {
      body = `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Minimal sticky ${mode.label}</title><style>*{box-sizing:border-box}body{margin:0;background:#101114;color:white;font:20px system-ui}header{position:fixed;top:0;z-index:10;padding:calc(14px + env(safe-area-inset-top)) 20px 14px;background:#101114}a{color:#6ee7c7}.content{position:relative;overflow-x:clip;border-radius:28px 28px 0 0;margin-top:100svh;height:1200svh}.sticky{position:sticky;top:0;height:100svh;padding:calc(90px + env(safe-area-inset-top)) 20px;background:#101114}.card{margin-top:160px;padding:40px;background:white;color:#111;border-radius:20px}${mode.css}</style><header>고정 기준선 · ${mode.label} <a href="/">메뉴</a></header><div class="content"><div class="sticky"><h2>이 제목은 고정되어야 합니다.</h2><p>장면 갱신 JavaScript 없음</p><div class="card">제목과 함께 움직이는지 확인</div></div></div></html>`;
    } else {
      if (!url.pathname.startsWith('/landing-assets/')) { res.writeHead(404); res.end(); return; }
      const relative = decodeURIComponent(url.pathname.slice('/landing-assets/'.length)) || 'index.html';
      const file = resolve(dist, relative);
      if (!file.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
      body = await readFile(file);
      const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      type = mime[extname(file)] || type;
      if (file === resolve(dist, 'index.html')) {
        const injection = `<style>${mode.css}${panelCSS}</style><script>document.documentElement.dataset.scrollLab=${JSON.stringify(mode.label)};(${installLab.toString()})();</script>`;
        body = body.toString().replace('<head>', `<head>${injection}`);
      }
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('Unable to serve local comparison. Run npm run build:web first.');
  }
});
server.listen({ port, host: '::', ipv6Only: false }, () => console.log(`Scroll lab: http://localhost:${port}/ (IPv4 + IPv6)`));
