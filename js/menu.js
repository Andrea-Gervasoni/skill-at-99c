// The index: a liquid-glass capsule with the mark, the section you are in and how far through
// it you are. It opens into a glass panel with every section of the paper.
// Refraction (an SVG displacement map behind the glass) runs in Chromium only, and drops to
// plain frosted glass when frames get slow; elsewhere the glass is frosted from the start.

import { t } from './i18n.js';

const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands.some(b => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand)));

export const SECTIONS = [
  { id: 'top', n: '00', label: 'Opening', note: 'Risk 99¢ to make 1¢' },
  { id: 'signature', n: '01', label: 'Signature', note: '1,000 sign-flipped histories' },
  { id: 'method', n: '02', label: 'Method', note: 'read, check, data, test' },
  { id: 'finding', n: '03', label: 'Finding', note: '613 of 702 at ≥ 99¢' },
  { id: 'why', n: '04', label: 'Mechanism', note: 'why a favourite looks skilled' },
  { id: 'sensitivity', n: '05', label: 'Price cap', note: 'the cap decides the side' },
  { id: 'table1', n: '06', label: 'Table 1', note: 'paper against replication' },
  { id: 'results', n: '07', label: 'Results', note: 'compared four ways' },
  { id: 'verdict', n: '08', label: 'Verdict', note: 'what the test measures' },
  { id: 'claims', n: '09', label: 'Claims', note: 'supported, not, limits' },
  { id: 'next', n: '10', label: 'Next test', note: 'a fair-price null' }
];

// a displacement map for a rounded rectangle: the rim bends what is behind it, the centre stays still
function rimMap(w, h, radius, bevel) {
  const k = 0.5;
  const W = Math.max(2, Math.round(w * k)), H = Math.max(2, Math.round(h * k));
  const r = Math.min(radius * k, W / 2, H / 2), b = Math.max(1, bevel * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'), img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5 - W / 2, py = y + 0.5 - H / 2;
    const qx = Math.abs(px) - (W / 2 - r), qy = Math.abs(py) - (H / 2 - r);
    const d = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
    let nx = 0, ny = 0, s = 0;
    if (d >= 0 && d < b) {
      const t = 1 - d / b; s = t * t;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py); }
      else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
    }
    const i = (y * W + x) * 4;
    img.data[i] = 128 + nx * s * 127; img.data[i + 1] = 128 + ny * s * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function spring(v0, k = 140, c = 20) {
  let x = v0, v = 0, t = v0;
  return {
    get value() { return x; }, set(n) { t = n; }, jump(n) { x = t = n; v = 0; },
    step(dt) { const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; for (let i = 0; i < n; i++) { v += (-k * (x - t) - c * v) * h; x += v * h; } return x; }
  };
}

export function createMenu({ lenis, reduced, sectionTop, sigEnd }) {
  const nav = document.querySelector('[data-nav]');
  const cap = nav.querySelector('.nav__cap'), panel = nav.querySelector('.nav__panel');
  const btn = nav.querySelector('[data-nav-now]'), idxEl = nav.querySelector('[data-nav-idx]'), labEl = nav.querySelector('[data-nav-lab]');
  const barEl = nav.querySelector('[data-nav-bar]');
  const list = nav.querySelector('[data-nav-list]');
  list.innerHTML = SECTIONS.map(s => `<li><a href="#${s.id}" data-go="${s.id}"><span class="num nav__n">${s.n}</span><span class="nav__l">${t(s.label)}</span><span class="nav__d num">${t(s.note)}</span><i class="nav__p" aria-hidden="true"><b></b></i></a></li>`).join('');
  const links = [...list.querySelectorAll('a')];
  const pbars = links.map(a => a.querySelector('.nav__p b'));

  // ---- refraction behind the glass (Chromium). The capsule is small, so it gets the full
  // treatment: a thick bevel and one displacement per colour channel, so its rim splits light.
  // The panel is large and shown briefly: one displacement, no split. Maps are made once per size.
  const NS = 'http://www.w3.org/2000/svg';
  const defs = document.getElementById('lg-defs');
  const glass = [];
  const el = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  function refract(target, radius, { bevel = 16, strength = 46, chroma = false, blur = 10 } = {}) {
    if (!chromium || reduced || !defs) return;
    let g = glass.find(x => x.el === target);
    if (!g) {
      const id = `lg-${glass.length}`;
      const f = el('filter', { id, x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
      const img = el('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'map' });
      f.append(img);
      const dms = [];
      if (chroma) {
        const keep = ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'];
        keep.forEach((m, i) => {
          const dm = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: `d${i}` });
          f.append(dm, el('feColorMatrix', { in: `d${i}`, type: 'matrix', values: m, result: `c${i}` }));
          dms.push(dm);
        });
        f.append(el('feBlend', { in: 'c0', in2: 'c1', mode: 'screen', result: 'rg' }), el('feBlend', { in: 'rg', in2: 'c2', mode: 'screen' }));
      } else {
        const dm = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G' });
        f.append(dm); dms.push(dm);
      }
      defs.append(f);
      g = { el: target, id, img, dms, w: 0, h: 0 };
      glass.push(g);
    }
    const w = Math.round(target.offsetWidth), h = Math.round(target.offsetHeight);
    if (w < 4 || h < 4 || (w === g.w && h === g.h)) return;
    g.w = w; g.h = h;
    g.img.setAttribute('width', w); g.img.setAttribute('height', h);
    g.img.setAttribute('href', rimMap(w, h, Math.min(radius, h / 2), bevel));
    g.dms.forEach((dm, i) => dm.setAttribute('scale', String(-strength * (1 + i * 0.09))));
    g.css = `url(#${g.id}) blur(${blur}px) saturate(1.8) brightness(1.06)`;
    if (!lite) target.style.backdropFilter = g.css;
  }
  let lite = false;
  function setLite(v) { if (v === lite) return; lite = v; glass.forEach(g => { g.el.style.backdropFilter = v ? '' : g.css || ''; }); }
  const capGlass = () => refract(cap, 999, { bevel: 18, strength: 64, chroma: true, blur: 6 });

  // ---- open / close: the panel grows out of the capsule like a drop ----
  let open = false;
  function setOpen(v) {
    open = v;
    btn.setAttribute('aria-expanded', String(v));
    nav.classList.toggle('is-open', v);
    nav.style.setProperty('--cw', `${cap.offsetWidth}px`);
    if (v) { panel.hidden = false; requestAnimationFrame(() => { panel.classList.add('is-in'); refract(panel, 26, { bevel: 22, strength: 40, blur: 16 }); }); }
    else { panel.classList.remove('is-in'); setTimeout(() => { if (!open) panel.hidden = true; }, 560); }
    squash.v.set(v ? 0.94 : 1.03);
    setTimeout(() => squash.v.set(1), 120);
  }
  btn.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); } });
  document.addEventListener('pointerdown', e => { if (open && !nav.contains(e.target)) setOpen(false); });

  // ---- going somewhere: the signature is entered at its finished state ----
  function go(id) {
    const y = id === 'top' ? 0 : id === 'signature' ? sigEnd() : sectionTop(id);
    if (lenis && !reduced) lenis.scrollTo(y, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), lerp: 0 });
    else window.scrollTo(0, y);
  }
  nav.addEventListener('click', e => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault(); go(a.dataset.go); setOpen(false);
  });
  nav.querySelector('.nav__brand').addEventListener('click', e => { e.preventDefault(); go('top'); setOpen(false); });

  // ---- the liquid part, all on springs: the rim light turns to the pointer, a highlight slides
  // inside the glass, the capsule stretches with the speed of the scroll, squashes when pressed,
  // and its label slot changes width like a drop finding its shape ----
  const rim = spring(200, 90, 18), hx = spring(30, 120, 18), hy = spring(-20, 120, 18);
  const squash = { x: spring(1, 220, 16), y: spring(1, 220, 16), v: spring(1, 380, 18) };
  const labW = spring(80, 170, 19);
  let px = innerWidth * 0.3, py = -300, awake = 0, labTarget = 80;
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; awake = performance.now(); }, { passive: true });
  cap.addEventListener('pointerdown', () => { squash.v.set(0.95); awake = performance.now(); });
  addEventListener('pointerup', () => squash.v.set(1));
  const measureCtx = document.createElement('canvas').getContext('2d');
  function labelWidth(text) {
    const cs = getComputedStyle(labEl); // the font shorthand carries a line height, which canvas rejects
    measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return Math.ceil(measureCtx.measureText(text).width) + 2;
  }

  // ---- the frame: which section, how far, which tone ----
  let cur = -1, lastT = performance.now(), slow = 0, lastBar = -1, lastTone = '';
  const last = {};
  const put = (k, val, fn) => { if (last[k] !== val) { last[k] = val; fn(val); } };
  const tops = () => SECTIONS.map(s => (s.id === 'top' ? 0 : sectionTop(s.id)));
  let T = tops();
  function measure() { T = tops(); if (cur >= 0) { labTarget = labelWidth(t(SECTIONS[cur].label)); labW.jump(labTarget); labEl.style.width = `${labTarget}px`; } capGlass(); if (open) refract(panel, 26, { bevel: 22, strength: 40, blur: 16 }); }
  function update(y, vh, dark, vel = 0) {
    const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    // governor: a second of slow frames, then plain frosted glass
    slow = dt > 0.022 ? slow + 1 : Math.max(0, slow - 0.5);
    if (slow > 30) setLite(true);
    const probe = y + vh * 0.38;
    let i = 0;
    for (let k = 0; k < T.length; k++) if (T[k] <= probe) i = k;
    if (i !== cur) {
      cur = i;
      idxEl.textContent = SECTIONS[i].n; labEl.textContent = t(SECTIONS[i].label);
      links.forEach((a, k) => a.classList.toggle('is-on', k === i));
      labTarget = labelWidth(t(SECTIONS[i].label));
      if (labW.value === 80) labW.jump(labTarget); else labW.set(labTarget);
      awake = now;
    }
    const end = i + 1 < T.length ? T[i + 1] : document.documentElement.scrollHeight - vh;
    const f = Math.min(1, Math.max(0, (probe - T[i]) / Math.max(1, end - T[i])));
    const fb = Math.round(f * 200) / 200;
    if (fb !== lastBar) {
      lastBar = fb;
      barEl.style.transform = `scaleX(${fb})`;
      pbars.forEach((b, k) => { b.style.transform = `scaleX(${k < i ? 1 : k === i ? fb : 0})`; });
    }
    const tone = dark ? 'dark' : 'light';
    if (tone !== lastTone) { lastTone = tone; nav.classList.toggle('is-dark', dark); }
    if (reduced) return;
    // scroll speed stretches the capsule a little, along the scroll
    const sp = Math.min(1, Math.abs(vel) / 60);
    squash.x.set(1 - sp * 0.035); squash.y.set(1 + sp * 0.07);
    if (sp > 0.02) awake = now;
    if (now - awake > 1600) return;
    const r = cap.getBoundingClientRect();
    let ang = (Math.atan2(py - (r.top + r.height / 2), px - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    while (ang - rim.value > 180) ang -= 360;
    while (ang - rim.value < -180) ang += 360;
    rim.set(ang); hx.set(Math.min(105, Math.max(-5, ((px - r.left) / r.width) * 100))); hy.set(Math.min(120, Math.max(-40, ((py - r.top) / r.height) * 100)));
    rim.step(dt); hx.step(dt); hy.step(dt); labW.step(dt);
    const sx = squash.x.step(dt) * squash.v.step(dt), sy = squash.y.step(dt) * squash.v.value;
    put('rim', `${Math.round(rim.value)}deg`, v => nav.style.setProperty('--rim', v));
    put('hl', `${Math.round(hx.value)}% ${Math.round(hy.value)}%`, v => nav.style.setProperty('--hl', v));
    put('lw', `${Math.round(labW.value)}px`, v => labEl.style.width = v);
    put('sq', `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, v => cap.style.transform = v);
  }
  return { update, measure, close: () => setOpen(false) };
}
