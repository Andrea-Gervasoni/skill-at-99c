// Page director: loader, Lenis + ScrollTrigger, scroll progress, signature controls.
import * as THREE from './vendor/three.module.min.js';
import { createStage } from './scene.js';
import { B } from './sim.js';
import { initSections } from './sections.js';
import { createMenu } from './menu.js';
import { createHero } from './hero.js';
import { lang, t, tr, translatePage, setLang } from './i18n.js';
translatePage();
{ const tg = document.querySelector('[data-lang-toggle]'); tg.textContent = lang === 'it' ? 'EN' : 'IT'; tg.addEventListener('click', () => setLang(lang === 'it' ? 'en' : 'it')); }
document.querySelectorAll('[data-lang]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); b.addEventListener('click', () => { if (b.dataset.lang !== lang) setLang(b.dataset.lang); }); });

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = v => Math.min(1, Math.max(0, v));
const phone = matchMedia('(hover: none) and (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;
const fmtInt = n => n.toLocaleString('en-US');

const money = (v, digits) => {
  const s = Math.abs(v).toFixed(digits);
  return (v > 0 ? '+$' : v < 0 ? '−$' : '$') + s;
};

// ---------- loader ----------
const countEl = $('[data-loader-count]');
const barEl = $('[data-loader-bar]');
let shown = 0, target = 0;
function loaderTick() {
  shown += (target - shown) * 0.12;
  countEl.textContent = String(Math.round(shown * 1000)).padStart(4, '0');
  barEl.style.transform = `scaleX(${shown})`;
}
gsap.ticker.add(loaderTick);

const loader = new THREE.TextureLoader();
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const t0Load = performance.now();
let done = 0;
const step = p => p.then(r => { done++; target = done / 3; return r; });
const [billTex, normalTex, , data] = await Promise.all([
  step(load(phone ? 'assets/bill-front-1024.webp' : 'assets/bill-front-2048.webp')),
  step(load('assets/bill-normal-1024.webp')),
  step(document.fonts.ready),
  fetch('data/site_data.json').then(r => r.json())
]);

// ---------- stage ----------
const canvas = $('.stage');
const stage = createStage(canvas, { billTex, normalTex, phone });

function probe(h) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:0;height:${h};width:0;visibility:hidden;pointer-events:none`;
  document.body.appendChild(el);
  return el;
}
const svhProbe = probe('100svh'), lvhProbe = probe('100lvh');

const sig = $('.sig'), pin = $('.sig__pin'), chartEl = $('[data-chart]');
let layout = {};
let stageKey = '';
// Safari's bars change innerHeight while scrolling; svh and lvh do not, so the stage
// is rebuilt only when the width, the small/large viewport or the chart box change.
const heroEl = $('.hero');
function measure() {
  const svh = svhProbe.offsetHeight, lvh = lvhProbe.offsetHeight;
  const w = document.documentElement.clientWidth;
  const pr = pin.getBoundingClientRect(), cr = chartEl.getBoundingClientRect();
  const rect = { x: cr.left, y: cr.top - pr.top, w: cr.width, h: cr.height };
  layout = { svh, w, sigTop: sig.offsetTop, sigRun: sig.offsetHeight - pin.offsetHeight, heroRun: heroEl.offsetHeight - svh };
  const key = [w, svh, lvh, Math.round(rect.x), Math.round(rect.y), Math.round(rect.w), Math.round(rect.h)].join('|');
  if (key !== stageKey) {
    stageKey = key;
    stage.resize(w, lvh, svh, rect);
  }
}
measure();
let lastW = layout.w;
new ResizeObserver(() => { measure(); ScrollTrigger.refresh(); }).observe(document.body);
window.addEventListener('resize', () => {
  const w = document.documentElement.clientWidth;
  if (w !== lastW) { lastW = w; measure(); }
});

// ---------- scroll ----------
const lenis = reduced ? null : new Lenis({ lerp: 0.07, wheelMultiplier: 0.8, smoothWheel: true });
if (lenis) {
  lenis.on('scroll', e => { ScrollTrigger.update(); stage.gust(e.velocity); });
  gsap.ticker.add(t => lenis.raf(t * 1000));
}
gsap.ticker.lagSmoothing(0);
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

// ---------- signature controls ----------
const outs = Object.fromEntries($$('[data-out]').map(el => [el.dataset.out, el]));
for (const [k, sim] of Object.entries(stage.sims)) {
  $(`[data-wl="${k}"]`).textContent = lang === 'it' ? `${sim.wins} V · ${20 - sim.wins} P` : `${sim.wins} W · ${20 - sim.wins} L`;
}
$('[data-hint]').textContent = t(phone ? 'Touch a pile to read it.' : 'Hover a pile to read it.');

function renderReadout(k) {
  const sim = stage.sims[k];
  outs.obs.textContent = money(sim.observed, 2);
  outs.p95.textContent = money(sim.p95, 2);
  outs.at.textContent = `${fmtInt(sim.greater)} · ${fmtInt(sim.ties)}`;
  outs.formula.textContent = `p = (${fmtInt(sim.greater)} + ½·${fmtInt(sim.ties)}) / ${fmtInt(B)}`;
  outs.p.textContent = sim.p.toFixed(3);
  outs.verdict.textContent = t(sim.verdict);
  const skilled = sim.verdict === 'skilled';
  outs.mark.classList.toggle('is-skilled', skilled);
  outs.verdict.className = skilled ? 'is-skilled-text' : 'is-none-text';
  $('[data-lab="real"]').classList.toggle('is-skilled', skilled);
  $('[data-lab-val="real"]').textContent = money(sim.observed, 2);
}
renderReadout('fav99');
function pick(btn) {
  $$('.state').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
  stage.setState(btn.dataset.state, performance.now());
  renderReadout(btn.dataset.state);
}
$$('.state').forEach(btn => btn.addEventListener('click', () => pick(btn)));
$('.states').addEventListener('keydown', e => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const all = $$('.state');
  const i = all.indexOf(document.activeElement);
  const n = all[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
  n.focus(); pick(n); e.preventDefault();
});

const toStage = e => stage.pointer((e.clientX / layout.w) * 2 - 1, (e.clientY / layout.svh) * 2 - 1);
window.addEventListener('pointermove', toStage, { passive: true });
window.addEventListener('pointerdown', toStage, { passive: true });
document.documentElement.addEventListener('pointerleave', () => stage.pointerOut());
window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') stage.pointerOut(); });

// ---------- projected labels ----------
const labelsEl = $('.labels');
const lab = Object.fromEntries($$('[data-lab]').map(el => [el.dataset.lab, el]));
const gridLabs = Array.from({ length: 10 }, () => {
  const el = document.createElement('span');
  el.className = 'lab lab--grid num';
  labelsEl.insertBefore(el, labelsEl.firstChild);
  return el;
});
const gutter = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 16;
let gut = gutter();
window.addEventListener('resize', () => { gut = gutter(); });
const last = new Map();
let labelDy = 0;
function put(el, x, y, o, anchor = 'center') {
  y += labelDy;
  const w = el.offsetWidth;
  const ax = anchor === 'center' ? -w / 2 : anchor === 'right' ? -w : 0;
  const left = Math.round(Math.min(layout.w - gut - w, Math.max(gut, x + ax)));
  const key = `${left}|${Math.round(y)}|${o.toFixed(2)}`;
  if (last.get(el) === key) return;
  last.set(el, key);
  el.style.transform = `translate3d(${left}px, ${Math.round(y)}px, 0)`;
  el.style.opacity = o;
}
const chartTop = () => chartEl.getBoundingClientRect().top - pin.getBoundingClientRect().top;
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function valueText(v, D) {
  return D > 5 ? money(Math.round(v), 0) : money(Math.abs(v) < 1e-9 ? 0 : v, 2);
}
function updateLabels(p) {
  const L = stage.labels();
  const axisO = clamp01((p - 0.02) / 0.06);
  L.ticks.forEach((tk, i) => {
    const el = lab[`t${i}`];
    setText(el, valueText(tk.v, L.D));
    put(el, tk.x, tk.y + 6, axisO);
  });
  put(lab.axis, L.axis.x, L.axis.y + 24, axisO, 'left');
  L.grid.forEach((g, i) => {
    setText(gridLabs[i], fmtInt(g.c));
    put(gridLabs[i], g.x - 8, g.y - 7, g.o, 'right');
  });
  put(lab.yaxis, L.gridTop.x - 8, L.gridTop.y - 7, axisO, 'right');
  const pw0 = lab.p95.offsetWidth;
  const p95Left = L.p95.x + 6 + pw0 > layout.w - gut ? L.p95.x - 6 - pw0 : L.p95.x + 6; // flip to the left of the rule near the edge
  put(lab.p95, p95Left, L.p95.y - 4, clamp01((p - 0.8) / 0.08), 'left');
  const real = clamp01((p - 0.84) / 0.06);
  // Real-record label: above the bill if there is room, else beside it; never on the 95th label.
  const w = lab.real.offsetWidth, h = lab.real.offsetHeight;
  const pw = lab.p95.offsetWidth;
  const p95Box = { l: p95Left, r: p95Left + pw, t: L.p95.y - 4, b: L.p95.y + 12 };
  const top = chartTop() + 4;
  const above = L.real.y - 48 - h; // leaves room for the leader down to the bill
  const cands = [
    { side: false, l: Math.min(layout.w - gut - w, Math.max(gut, L.real.x - w / 2)), t: above },
    { side: false, l: layout.w - gut - w, t: above },
    { side: true, l: L.real.x + 40, t: L.real.y - 8 },
    { side: true, l: L.real.x - 40 - w, t: L.real.y - 8 },
    { side: true, l: L.real.x - w / 2, t: L.real.y - 34 }
  ];
  const fits = c => c.t > top && c.l >= gut - 0.5 && c.l + w <= layout.w - gut + 0.5 &&
    (c.l > p95Box.r + 6 || c.l + w < p95Box.l - 6 || c.t > p95Box.b + 4 || c.t + h < p95Box.t - 4) &&
    (c.l > L.p95.x + 6 || c.l + w < L.p95.x - 6 || c.t > L.axis.y || c.t + h < L.p95.y); // nor across the 95th rule
  const best = cands.find(fits) || cands[1];
  lab.real.classList.toggle('is-side', best.side);
  lab.real.style.setProperty('--lead', `${Math.round(L.real.x - best.l)}px`); // leader points at the bill
  put(lab.real, best.l, best.t, real, 'left');
  return L.guide;
}

// ---------- crosshair: read any pile; shows itself once, then follows the pointer ----------
const xh = $('[data-xh]'), xhLine = $('.xh__line'), xhTip = $('[data-xh-tip]');
let hoverX = null, demoStart = null, demoDone = false, touched = false;
function pointerOverChart(e) {
  const r = chartEl.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  hoverX = inside ? e.clientX : null;
  if (inside) touched = true;
}
window.addEventListener('pointermove', pointerOverChart, { passive: true });
window.addEventListener('pointerdown', pointerOverChart, { passive: true });
document.addEventListener('pointerleave', () => { hoverX = null; });
let lastXh = '';
function hideXh() { if (lastXh !== 'off') { xh.style.opacity = 0; lastXh = 'off'; } }
function updateCrosshair(t, guide) {
  if (guide < 1) { demoStart = null; hideXh(); return; }
  const cols = stage.columns();
  let x = hoverX;
  if (x == null && !demoDone && !touched && !reduced) {
    if (demoStart == null) demoStart = t + 0.4;
    const k = clamp01((t - demoStart) / 2.8);
    const first = cols[0].x, lastC = cols[cols.length - 1].x;
    x = first + (lastC - first) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    if (k >= 1) demoDone = true;
  }
  if (x == null) { hideXh(); return; }
  let best = cols[0];
  for (const c of cols) if (Math.abs(c.x - x) < Math.abs(best.x - x)) best = c;
  const D = stage.labels().D;
  const range = best.hi == null || Math.abs(best.hi - best.lo) < 1e-9 ? valueText(best.lo, D) : `${valueText(best.lo, D)} to ${valueText(best.hi, D)}`;
  const tip = tr(`${range} · ${fmtInt(best.n)} ${best.n === 1 ? 'history' : 'histories'} · ${(best.n / B * 100).toFixed(1)}%`);
  const top = Math.min(best.top, best.base - 4) - 10;
  const key = `${Math.round(best.x)}|${Math.round(top)}|${tip}`;
  if (key === lastXh) return;
  lastXh = key;
  setText(xhTip, tip);
  xh.style.opacity = 1;
  xh.style.transform = `translate3d(${Math.round(best.x)}px, ${Math.round(top)}px, 0)`;
  xhLine.style.height = `${Math.max(0, Math.round(best.base - top))}px`;
  // keep the tip inside the gutters
  const w = xhTip.offsetWidth;
  const cl = chartEl.getBoundingClientRect().left; // the tip stays over the chart, never over the copy beside it
  const shift = Math.min(layout.w - gut - (best.x + w / 2), Math.max(Math.max(gut, cl) - (best.x - w / 2), 0));
  xhTip.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`;
}

// ---------- first view: a bundle of notes on black, and the headline in 3D above it ----------
const typeData = await fetch('assets/type3d.json').then(r => r.json()).catch(() => null);
const hero = createHero({ host: $('[data-hero]'), billTex, normalTex, phone, reduced, type: typeData ? typeData.lines[lang] : null });
let heroState = '', introDone = 0;
function updateHero(y, t) {
  if (y > layout.heroRun + layout.svh) return; // scrolled past: nothing to draw
  const h = clamp01(y / Math.max(1, layout.heroRun));
  hero.frame(h, t);
  // the drawing is up while the bundle sits on its turntable, and lifts away as the camera comes in
  hero.draw(introDone ? (1 - clamp01((h - 0.03) / 0.14)) * clamp01((now() - introDone) / 0.9) : 0);
  const st = h > 0.02 ? 'moving' : 'rest';
  if (st !== heroState) { heroState = st; heroEl.classList.toggle('is-moving', st === 'moving'); }
}

// ---------- the index (liquid glass) and the tone of the room ----------
const pageTop = id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY() : 0; };
const menu = createMenu({ lenis, reduced, sectionTop: pageTop, sigEnd: () => layout.sigTop + layout.sigRun * 0.995 });
// the stretches of page that are dark: the first view, the dark bands and the closing panel
let darkZones = [];
function measureTone() {
  menu.measure();
  const y0 = scrollY();
  darkZones = [[0, layout.heroRun + layout.svh]].concat($$('.sec--band, .sec--close .grid').map(el => { const r = el.getBoundingClientRect(); return [r.top + y0, r.bottom + y0]; }));
}
const navY = 37; // the middle of the capsule
const onDark = y => darkZones.some(([a, b]) => y + navY > a && y + navY < b);


// ---------- loop ----------
let lastSig = '';
gsap.ticker.add(() => {
  const t = now();
  const y = scrollY();
  const t0 = clamp01(y / Math.max(1, layout.sigTop));
  const p = clamp01((y - layout.sigTop) / Math.max(1, layout.sigRun));
  const exit = clamp01((y - (layout.sigTop + layout.sigRun)) / layout.svh);
  menu.update(y, layout.svh, onDark(y), lenis ? lenis.velocity : 0);
  updateHero(y, t);
  if (exit >= 1) {
    if (lastSig !== 'covered') canvas.style.visibility = 'hidden';
    lastSig = 'covered';
    return;
  }
  // the first view covers the stage until the signature comes up from below
  if (y < layout.sigTop - layout.svh * 1.05) {
    if (lastSig !== 'hero') canvas.style.visibility = 'hidden';
    lastSig = 'hero';
    return;
  }
  if (lastSig !== 'live') canvas.style.visibility = 'visible';
  lastSig = 'live';
  // the stage starts at the desk: its own first-view rain belongs to the old opening
  stage.frame({ time: t, t0: 1, p, exit, reduced, keep: null });
  // labels live in the pinned layer: they only make sense once it is stuck
  labelDy = exit * layout.svh; // the pinned layer is already leaving with the page
  const guide = updateLabels(t0 >= 0.999 ? p : 0);
  updateCrosshair(t, t0 >= 0.999 && exit === 0 ? guide : 0);
});

// ---------- reveal ----------
const minShow = 1100 - (performance.now() - t0Load);
setTimeout(() => {
  target = 1;
  setTimeout(() => {
    gsap.ticker.remove(loaderTick);
    document.body.classList.remove('is-loading');
    stage.startIntro(performance.now() + 250);
    hero.startType(now() + 0.2);
    introDone = now() + 1.6;
    if (lenis && location.hash) lenis.scrollTo(location.hash, { immediate: true });
  }, 420);
}, Math.max(0, minShow));

initSections({ gsap, ScrollTrigger, phone, reduced, data, billTex, normalTex }).then(minis => {
  lenis && lenis.resize();
  measureTone();
  ScrollTrigger.addEventListener('refresh', measureTone);
  window.__skill.minis = minis; // QA hook
});

// Test hooks for the QA scroll scan.
window.__skill = { stage, lenis, layout: () => layout, measure };
