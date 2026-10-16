// Run with: ego-browser nodejs < scripts/performance/cpu/measure-mobile-scroll.mjs
// Uses the existing investigation TaskSpace; change SPACE_ID to resume another space.
const SPACE_ID = 3;
const ROOT = '/Users/minchae/orca/workspaces/weiver-landing/모바일-렌더링-문제파악과-개선';
const fs = await import('node:fs/promises');
const task = await taskSpace(SPACE_ID);
const page = task.page('p1');
// Adjust these parameters for each comparison; historical runs store their own settings.
const config = { region: 'hero', variant: 'no-terrain', rate: 4, repetitions: 3 };
const { region = 'hero', variant = 'baseline', rate = 4, repetitions = 3 } = config;
const regions = { hero: [0, 1600], chapter1: [2600, 1600], chapter2: [4900, 1600], fit: [11000, 1600], journey: [15400, 1600] };
const [start, distance] = regions[region];
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await page.cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await page.cdp('Emulation.setCPUThrottlingRate', { rate });
await page.cdp('Performance.enable');
const probe = function () {
  const originalRAF = window.requestAnimationFrame.bind(window);
  const probe = window.__scrollProbe = { active: false, frames: [], callbacks: {}, longTasks: [], loaf: [] };
  window.requestAnimationFrame = function (cb) {
    const source = cb.toString();
    return originalRAF(function (ts) {
      if (probe.pauseTerrain && source.includes('.rafId=requestAnimationFrame(') && source.includes('.clock') && source.includes('.last')) {
        if (probe.active) probe.skippedTerrain = (probe.skippedTerrain || 0) + 1;
        return window.requestAnimationFrame(cb);
      }
      if (!probe.active) return cb(ts);
      const begin = performance.now();
      try { return cb(ts); } finally {
        const row = probe.callbacks[source] ||= { count: 0, total: 0, max: 0 };
        const duration = performance.now() - begin;
        row.count++; row.total += duration; row.max = Math.max(row.max, duration);
      }
    });
  };
  function monitor(ts) {
    if (probe.active) probe.frames.push({ ts, y: scrollY });
    originalRAF(monitor);
  }
  originalRAF(monitor);
  for (const type of ['longtask', 'long-animation-frame']) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    new PerformanceObserver(list => {
      if (!probe.active) return;
      for (const entry of list.getEntries()) {
        if (type === 'longtask') probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
        else probe.loaf.push({ start: entry.startTime, duration: entry.duration, blocking: entry.blockingDuration, scripts: entry.scripts.map(s => ({ duration: s.duration, forcedLayout: s.forcedStyleAndLayoutDuration, source: s.sourceURL, position: s.sourceCharPosition, invoker: s.invoker })) });
      }
    }).observe({ type, buffered: false });
  }
};
const injection = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${probe.toString()})();` });
const runs = [];
try {
  for (let iteration = 0; iteration < repetitions; iteration++) {
    await page.goto(variant === 'control' ? 'about:blank' : 'https://weiverai.com');
    if (variant !== 'control') {
      await page.waitForFunction(() => document.querySelector('#ch1 .qc') && document.querySelector('.terrain')?.width > 0);
      await page.evaluate(async () => { await document.fonts.ready; });
    }
    if (variant === 'control') await page.evaluate(() => {
      document.body.innerHTML = '<div style="height:26000px;background:linear-gradient(#fff,#ddd)"></div>';
    });
    if (variant === 'paused') await page.click('button[aria-label="영상 일시정지"]');
    if (variant === 'no-terrain') await page.evaluate(() => { __scrollProbe.pauseTerrain = true; });
    if (variant === 'no-filters') await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '.film,.cal,.objw{filter:none!important;backdrop-filter:none!important}';
      document.head.appendChild(style);
    });
    if (variant === 'no-fit-svg') await page.evaluate(() => {
      const original = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (this.closest('.fit') && ['points', 'stroke-dashoffset'].includes(name)) return;
        return original.call(this, name, value);
      };
    });
    if (variant === 'no-calendar-text') await page.evaluate(() => {
      const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      Object.defineProperty(Node.prototype, 'textContent', { ...desc, set(value) {
        if (this.id === 'calc') return;
        return desc.set.call(this, value);
      } });
    });
    if (variant === 'dedupe-calendar-text') await page.evaluate(() => {
      const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      Object.defineProperty(Node.prototype, 'textContent', { ...desc, set(value) {
        if (this.id === 'calc' && this.textContent === String(value)) return;
        return desc.set.call(this, value);
      } });
    });
    if (variant === 'dedupe-fit-svg') await page.evaluate(() => {
      const original = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (this.closest('.fit') && ['points', 'stroke-dashoffset'].includes(name) && this.getAttribute(name) === String(value)) return;
        return original.call(this, name, value);
      };
    });
    await page.evaluate(y => scrollTo(0, y), start);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await page.cdp('Performance.getMetrics');
    const environment = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, ua: navigator.userAgent, url: location.href, scripts: [...document.scripts].map(s => s.src) }));
    await page.evaluate(() => { __scrollProbe.active = true; __scrollProbe.started = performance.now(); });
    await page.cdp('Input.synthesizeScrollGesture', { x: 180, y: 650, yDistance: -distance, speed: 500, gestureSourceType: 'touch' });
    const samples = await page.evaluate(() => { __scrollProbe.active = false; return { ...__scrollProbe, ended: performance.now(), endY: scrollY }; });
    const after = await page.cdp('Performance.getMetrics');
    const metrics = {};
    for (const { name, value } of after.metrics) {
      if (['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'].includes(name)) metrics[name] = value - (before.metrics.find(m => m.name === name)?.value || 0);
    }
    const gaps = samples.frames.slice(1).map((f, i) => f.ts - samples.frames[i].ts);
    const sorted = gaps.toSorted((a,b) => a-b);
    const summary = { elapsedMs: samples.ended-samples.started, startY: start, endY: samples.endY, frames: samples.frames.length, meanGapMs: gaps.reduce((a,b)=>a+b,0)/gaps.length, p95GapMs: sorted[Math.floor(sorted.length*.95)], maxGapMs: Math.max(...gaps), gapsOver25Ms: gaps.filter(x=>x>25).length, gapsOver50Ms: gaps.filter(x=>x>50).length, missedVsyncEstimate: gaps.reduce((n,x)=>n+Math.max(0,Math.round(x/(1000/60))-1),0), longTaskCount: samples.longTasks.length, longTaskTotalMs: samples.longTasks.reduce((a,b)=>a+b.duration,0), forcedLayoutLoafMs: samples.loaf.flatMap(x=>x.scripts).reduce((a,b)=>a+b.forcedLayout,0), metrics };
    runs.push({ iteration, environment, summary, samples });
    console.log(JSON.stringify({ region, variant, rate, iteration, ...summary }));
  }
} finally {
  await page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
  await page.cdp('Emulation.setCPUThrottlingRate', { rate: 1 });
}
const output = `${ROOT}/docs/performance/cpu/${region}-${variant}-cpu${rate}.json`;
await fs.writeFile(output, JSON.stringify({ date: new Date().toISOString(), region, variant, rate, distance, speed: 500, runs }, null, 2));
console.log(output);
