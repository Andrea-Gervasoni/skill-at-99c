// Small 3D figures for sections 3, 4 and the close: stacks of the same $1 sheet, with the
// edge colour of each sheet carrying the data (green = skilled, grey = anti-skilled).
import * as THREE from './vendor/three.module.min.js';
import { tr } from './i18n.js';
import { sheetGeometry, billMaterial, depthMaterial, BILL_W, BILL_L, SHEET } from './scene.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

// One renderer, scene, lights and an instanced stack of sheets.
function makeMini(host, { billTex, normalTex, phone, count, fov = 28 }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'mini__canvas';
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.5, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e5d9, 0.95));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.6);
  key.position.set(-6, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 2, far: 60 });
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 10; key.shadow.blurSamples = 12;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf2f4ff, 0.45);
  fill.position.set(10, 6, 6);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x1b1a16, opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const uniforms = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(BILL_W, BILL_L) } };
  const geo = sheetGeometry();
  const aDef = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aPhase = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const aTint = new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < count; i++) aPhase.array[i] = hash(i, 31) * 6.283;
  geo.setAttribute('aDef', aDef); geo.setAttribute('aPhase', aPhase); geo.setAttribute('aTint', aTint);
  const mesh = new THREE.InstancedMesh(geo, billMaterial(billTex, normalTex, uniforms), count);
  mesh.customDepthMaterial = depthMaterial(uniforms);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  let W = 1, H = 1;
  function resize() {
    W = host.clientWidth; H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), s = new THREE.Vector3();
  const proj = new THREE.Vector3();
  return {
    renderer, scene, camera, mesh, aDef, aTint, uniforms,
    get W() { return W; }, get H() { return H; },
    place(i, x, y, z, yaw, sy = 1, rx = 0, rz = 0) {
      e.set(rx, yaw, rz); q.setFromEuler(e); v.set(x, y, z); s.set(1, sy, 1);
      m4.compose(v, q, s); mesh.setMatrixAt(i, m4);
    },
    toScreen(x, y, z) { proj.set(x, y, z).project(camera); return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H }; },
    render() { mesh.instanceMatrix.needsUpdate = true; aTint.needsUpdate = true; aDef.needsUpdate = true; renderer.render(scene, camera); },
    // fit a box of half-width hw and height hh around target into the canvas
    frame(target, az, el, hw, hh, fill = 0.86) {
      const vf = THREE.MathUtils.degToRad(camera.fov);
      const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      const d = Math.max(hw / (Math.tan(hf / 2) * fill), (hh / 2) / (Math.tan(vf / 2) * fill)) + 2;
      camera.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d);
      camera.lookAt(target);
    }
  };
}

// A layer of DOM labels positioned from 3D points.
function labelLayer(host) {
  const layer = document.createElement('div');
  layer.className = 'mini__labels';
  layer.setAttribute('aria-hidden', 'true');
  host.appendChild(layer);
  const pool = [];
  return {
    set(i, text, x, y, o = 1, cls = '', anchor = 'center') {
      text = tr(text);
      let el = pool[i];
      if (!el) { el = document.createElement('span'); layer.appendChild(el); pool[i] = el; }
      const cl = `mini__lab num ${cls}`;
      if (el.textContent !== text || el.className !== cl) { el.textContent = text; el.className = cl; el._w = el.offsetWidth; }
      // anchored, then kept inside the figure so no label is ever cut
      const w = el._w, ax = anchor === 'center' ? w / 2 : anchor === 'right' ? w : 0;
      const left = Math.min(host.clientWidth - w - 6, Math.max(6, x - ax));
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(y)}px)`;
      el.style.opacity = o;
    }
  };
}

const fmtInt = n => n.toLocaleString('en-US');
// half-width of the 95% Wilson interval for a share of n, in points
const wilsonHalf = (pct, n, z = 1.96) => {
  const p = pct / 100, d = 1 + z * z / n;
  return (100 * z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
};
const cents = s => s.replace('c', '¢').replace('>=', '≥').replace('-', '–');

// ---------- section 3: six bundles of 100 sheets, one per price bucket ----------
export function bundles(host, opts, data, read) {
  const N = 6, PER = 100;
  const M = makeMini(host, { ...opts, count: N * PER, fov: 16 });
  const L = labelLayer(host);
  const labels = data.price_buckets_raw_only.buckets.map(cents);
  const bands = data.simulation.zero_edge_band_by_bucket_pct;
  const LAYER = 0.052, GAP = opts.phone ? 2.75 : 3.1;
  const X = i => (i - (N - 1) / 2) * GAP;
  // zero-edge range: a bracket beside each bundle
  const br = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x141412, transparent: true, opacity: 0 }));
  M.scene.add(br);
  const brPts = [];
  bands.forEach(([lo, hi], i) => {
    const x = X(i) + BILL_L / 2 + 0.28, z = BILL_W / 2, y0 = lo * LAYER, y1 = hi * LAYER;
    brPts.push(x, y0, z, x, y1, z, x - 0.18, y0, z, x, y0, z, x - 0.18, y1, z, x, y1, z);
  });
  br.geometry.setAttribute('position', new THREE.Float32BufferAttribute(brPts, 3));
  let win = 'novdec2025', hover = -1;
  const state = { q: 0 };

  function draw() {
    const rows = data.price_buckets_raw_only[win];
    const q = state.q;
    M.frame(new THREE.Vector3(0.35, 2.6, 0), opts.phone ? 0.0 : -0.14, opts.phone ? 0.42 : 0.3, (N / 2) * GAP + 0.2, PER * LAYER + 1.6, opts.phone ? 0.96 : 0.94);
    for (let b = 0; b < N; b++) {
      const r = rows[b];
      const g = easeOut(clamp01((q - b * 0.05) / 0.45));            // the bundle rises from a flat pad
      const t = easeInOut(clamp01((q - 0.38 - b * 0.04) / 0.4));     // then the colour climbs the edge
      const nS = Math.round(r.sp * t), nA = Math.round(r.ap * t);
      const sp = LAYER * (0.04 + 0.96 * g);
      for (let j = 0; j < PER; j++) {
        const i = b * PER + j;
        const jit = (hash(i, 1) - .5) * 0.06;
        M.place(i, X(b) + jit, SHEET / 2 + j * sp, (hash(i, 2) - .5) * 0.05, Math.PI / 2 + (hash(i, 3) - .5) * 0.05, Math.max(0.05, (sp * 0.92) / SHEET));
        M.aTint.array[i] = j < nS ? 1 : j >= PER - nA ? 2 : 0;
      }
      const base = M.toScreen(X(b), 0, BILL_W / 2 + 0.3);
      const topP = M.toScreen(X(b), PER * sp + 0.15, 0);
      const o = clamp01((q - 0.75) / 0.15);
      L.set(b * 4, M.W < 640 ? labels[b].replace('¢', '') : labels[b], base.x, base.y + 10, clamp01(q * 4), 'mini__x');
      L.set(b * 4 + 1, M.W < 640 ? fmtInt(r.n) : `n ${fmtInt(r.n)}`, base.x, base.y + 28, clamp01(q * 4), 'mini__n');
      // narrow: the interval goes on a second line so neighbouring labels never meet
      L.set(b * 4 + 2, M.W < 640 ? `${r.sp.toFixed(1)}\n±${wilsonHalf(r.sp, r.n).toFixed(1)}` : `${r.sp.toFixed(1)}% ±${wilsonHalf(r.sp, r.n).toFixed(1)}`, topP.x, topP.y - (M.W < 640 ? 40 : 40), o, 'mini__skill');
      L.set(b * 4 + 3, `${r.ap.toFixed(1)}% anti`, topP.x, topP.y - 18, M.W < 640 ? 0 : o * (r.a ? 1 : 0.55), 'mini__anti');
    }
    br.material.opacity = clamp01((q - 0.7) / 0.2) * 0.8;
    M.render();
    if (hover >= 0) {
      const r = rows[hover], [lo, hi] = bands[hover];
      read(`${labels[hover]} · n ${fmtInt(r.n)} · skilled ${fmtInt(r.s)} (${r.sp}%) · anti ${fmtInt(r.a)} (${r.ap}%) · zero-edge ${lo}–${hi}%`);
    } else read(`≥99¢ · ${fmtInt(rows[5].s)} of ${fmtInt(rows[5].n)} skilled · 0 anti`);
  }
  host.addEventListener('pointermove', ev => {
    const r = host.getBoundingClientRect(), x = ev.clientX - r.left;
    let best = 0, bd = Infinity;
    for (let b = 0; b < N; b++) { const p = M.toScreen(X(b), 1, 0); const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = b; } }
    hover = best; draw();
  });
  host.addEventListener('pointerleave', () => { hover = -1; draw(); });
  new ResizeObserver(() => draw()).observe(host);
  // where each bundle stands on screen at full height, for accounts flying in from the scatter
  function slots() {
    return Array.from({ length: N }, (_, b) => {
      const base = M.toScreen(X(b), 0, 0), top = M.toScreen(X(b), PER * LAYER, 0);
      const l = M.toScreen(X(b) - BILL_L * 0.4, PER * LAYER * 0.5, 0), r = M.toScreen(X(b) + BILL_L * 0.4, PER * LAYER * 0.5, 0);
      return { x: base.x, base: base.y, top: top.y, w: Math.abs(r.x - l.x) };
    });
  }
  return { set q(v) { state.q = v; draw(); }, setWindow(w) { win = w; draw(); }, draw, slots, host };
}

// ---------- results A: paper against replication, 100 accounts per bundle ----------
export function compare(host, opts, data, read) {
  const P = data.paper_table1_min10_events.raw, C = data.cap_sensitivity, L0 = C.caps.length - 1;
  const items = [
    { label: 'Paper, Table 1', short: 'Paper', sub: '≥ 10 events', s: P.skilled_pct, a: P.anti_pct, n: null },
    { label: 'Nov–Dec, no cap', short: 'N–D', s: C.novdec2025.raw_skilled[L0], a: C.novdec2025.raw_anti[L0], n: C.novdec2025.n[L0] },
    { label: 'Nov–Dec, < 80¢', short: 'N–D <80', s: C.novdec2025.raw_skilled[0], a: C.novdec2025.raw_anti[0], n: C.novdec2025.n[0] },
    { label: 'Dec, no cap', short: 'Dec', s: C.dec2025.raw_skilled[L0], a: C.dec2025.raw_anti[L0], n: C.dec2025.n[L0] },
    { label: 'Dec, < 80¢', short: 'Dec <80', s: C.dec2025.raw_skilled[0], a: C.dec2025.raw_anti[0], n: C.dec2025.n[0] }
  ];
  const N = items.length, PER = 100;
  const M = makeMini(host, { ...opts, count: N * PER, fov: 16 });
  const L = labelLayer(host);
  const LAYER = 0.05, GAP = opts.phone ? 2.75 : 3.3;
  // the paper stands a little apart from the four replications
  const X = i => (i - (N - 1) / 2) * GAP + (i === 0 ? -0.7 : 0.18);
  let hover = -1;
  const state = { q: 0 };
  const ratio = it => (it.s / it.a).toFixed(2);
  function draw() {
    const q = state.q, narrow = M.W < 640;
    M.frame(new THREE.Vector3(0, 2.5, 0), narrow ? 0 : -0.12, narrow ? 0.42 : 0.3, (N / 2) * GAP + 0.6, PER * LAYER + 1.4, narrow ? 0.98 : 0.94);
    items.forEach((it, b) => {
      const g = easeOut(clamp01((q - b * 0.06) / 0.45));
      const t = easeInOut(clamp01((q - 0.38 - b * 0.05) / 0.4));
      const nS = Math.round(it.s * t), nA = Math.round(it.a * t);
      const sp = LAYER * (0.04 + 0.96 * g);
      for (let j = 0; j < PER; j++) {
        const i = b * PER + j;
        M.place(i, X(b) + (hash(i, 1) - .5) * 0.06, SHEET / 2 + j * sp, (hash(i, 2) - .5) * 0.05, Math.PI / 2 + (hash(i, 3) - .5) * 0.05, Math.max(0.05, (sp * 0.92) / SHEET));
        M.aTint.array[i] = j < nS ? 1 : j >= PER - nA ? 2 : 0;
      }
      const base = M.toScreen(X(b), 0, BILL_W / 2 + 0.3);
      const top = M.toScreen(X(b), PER * sp + 0.15, 0);
      const o = clamp01((q - 0.75) / 0.15);
      const e = it.n ? ` ±${wilsonHalf(it.s, it.n).toFixed(1)}` : '';
      // narrow: short names, the skilled share on top, the anti share under it; the readout has the rest
      // wide: the name on two lines (window, cap), so neighbours never meet in either language
      L.set(b * 4, narrow ? it.short : it.label.replace(', ', ',\n'), base.x, base.y + 10, clamp01(q * 4), 'mini__x');
      L.set(b * 4 + 1, it.n ? `n ${fmtInt(it.n)}` : it.sub, base.x, base.y + 56, narrow ? 0 : clamp01(q * 4), 'mini__n');
      L.set(b * 4 + 2, narrow ? `${it.s.toFixed(1)}\n${it.a.toFixed(1)}` : `${it.s.toFixed(2)}%${e}`, top.x, top.y - (narrow ? 44 : 40), o, 'mini__skill');
      L.set(b * 4 + 3, `${it.a.toFixed(2)}% anti`, top.x, top.y - 20, narrow ? 0 : o, 'mini__anti');
    });
    M.render();
    if (hover >= 0) {
      const it = items[hover];
      read(`${it.label} · ${it.n ? `n ${fmtInt(it.n)}` : 'paper'} · skilled ${it.s.toFixed(2)}% · anti ${it.a.toFixed(2)}% · ${ratio(it)} skilled per anti`);
    } else read(`skilled per anti-skilled · paper ${ratio(items[0])} · no cap ${ratio(items[1])} · under 80¢ ${ratio(items[2])}`);
  }
  host.addEventListener('pointermove', ev => {
    const r = host.getBoundingClientRect(), x = ev.clientX - r.left;
    let best = 0, bd = Infinity;
    items.forEach((it, b) => { const p = M.toScreen(X(b), 1, 0); const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = b; } });
    hover = best; draw();
  });
  host.addEventListener('pointerleave', () => { hover = -1; draw(); });
  new ResizeObserver(() => draw()).observe(host);
  function slots() {
    return items.map((it, b) => {
      const base = M.toScreen(X(b), 0, 0), top = M.toScreen(X(b), PER * LAYER, 0);
      const l = M.toScreen(X(b) - BILL_L * 0.4, PER * LAYER * 0.5, 0), r = M.toScreen(X(b) + BILL_L * 0.4, PER * LAYER * 0.5, 0);
      return { x: base.x, base: base.y, top: top.y, w: Math.abs(r.x - l.x), s: it.s, a: it.a };
    });
  }
  return { set q(v) { state.q = v; draw(); }, draw, slots, host };
}

// ---------- section 4: a field of piles, price × number of events ----------
export function field(host, opts, data, read) {
  const sim = data.simulation, qs = sim.q, rows = ['40', '20', '10'];
  const heights = rows.map(k => sim.skilled_pct_by_events[k].map(v => Math.round(v)));
  const count = heights.flat().reduce((a, b) => a + b, 0);
  const M = makeMini(host, { ...opts, count });
  const L = labelLayer(host);
  const LAYER = 0.058, DX = 1.32, DZ = BILL_L + 0.7;
  const X = i => (i - (qs.length - 1) / 2) * DX, Z = r => (1 - r) * DZ; // 40 events in front, 10 at the back
  const plane = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(X(0) - 0.8, 0, Z(0) + 1.6), new THREE.Vector3(X(8) + 0.8, 0, Z(0) + 1.6),
    new THREE.Vector3(X(8) + 0.8, 0, Z(2) - 1.6), new THREE.Vector3(X(0) - 0.8, 0, Z(2) - 1.6)
  ]), new THREE.LineBasicMaterial({ color: 0x355E3B, transparent: true, opacity: 0 }));
  plane.position.y = 5 * LAYER;
  M.scene.add(plane);
  const sheetW = X(8) - X(0) + 1.6, sheetD = Z(0) - Z(2) + 3.2;
  const level = new THREE.Mesh(new THREE.PlaneGeometry(sheetW, sheetD), new THREE.MeshBasicMaterial({ color: 0x355E3B, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  level.rotation.x = -Math.PI / 2;
  level.position.set((X(0) + X(8)) / 2, 5 * LAYER + 0.002, (Z(0) + Z(2)) / 2);
  level.renderOrder = 2;
  M.scene.add(level);
  const i99 = qs.indexOf(0.99);
  let hover = null;
  const state = { q: 0 };
  function draw() {
    const q = state.q;
    const narrow = M.W < 640;
    const az = narrow ? mix(0.2, 0.1, q) : mix(0.42, 0.26, q), el = narrow ? 0.62 : 0.4;
    M.frame(new THREE.Vector3(narrow ? 0 : 0.6, narrow ? 2.6 : 2.1, 0), az, el, (qs.length / 2) * DX + (narrow ? 0.7 : 2.4), 100 * LAYER + (narrow ? 1 : 3), narrow ? 1 : 0.84);
    let i = 0;
    rows.forEach((k, r) => {
      heights[r].forEach((n, c) => {
        const g = easeOut(clamp01((q - c * 0.04 - r * 0.05) / 0.5));
        const sp = LAYER * (0.04 + 0.96 * g);
        const hot = k === '20' && c === i99;
        for (let j = 0; j < n; j++, i++) {
          M.place(i, X(c) + (hash(i, 1) - .5) * 0.05, SHEET / 2 + j * sp, Z(r) + (hash(i, 2) - .5) * 0.05, (hash(i, 3) - .5) * 0.06, Math.max(0.05, (sp * 0.92) / SHEET));
          M.aTint.array[i] = hot ? 1 : 0;
        }
      });
    });
    plane.material.opacity = clamp01((q - 0.6) / 0.2) * 0.9;
    level.material.opacity = plane.material.opacity * 0.16;
    const o = clamp01((q - 0.15) / 0.2);
    qs.forEach((p, c) => {
      const s = M.toScreen(X(c), 0, Z(0) + BILL_L / 2 + 0.4);
      L.set(c, `${+(p * 100).toFixed(1)}¢`, s.x, s.y + 6, narrow && ![0, 4, 7].includes(c) ? 0 : o, 'mini__x');
    });
    rows.forEach((k, r) => {
      const s = M.toScreen(X(0) - 1.1, 0, Z(r));
      L.set(20 + r, `${k} events`, s.x, s.y - 8, narrow ? 0 : o, 'mini__row', 'right');
    });
    // the 82.7% label clears every pile at the high-price end
    let topY = Infinity;
    for (let c = i99 - 1; c < qs.length; c++) rows.forEach((k, r) => { topY = Math.min(topY, M.toScreen(X(c), heights[r][c] * LAYER, Z(r) - BILL_L / 2).y); });
    const hp = M.toScreen(X(i99), heights[1][i99] * LAYER, Z(1));
    L.set(30, `${sim.skilled_pct_by_events['20'][i99]}% at 99¢, 20 events`, hp.x, topY - 34, clamp01((q - 0.7) / 0.2), 'mini__skill', 'right');
    const pp = M.toScreen(X(0) - 0.8, 5 * LAYER, Z(2) - 1.6);
    L.set(31, '5% plane: what a fair test flags', narrow ? 10 : pp.x, narrow ? 10 : pp.y - 26, plane.material.opacity, 'mini__skill', 'left');
    M.render();
    if (hover) {
      const [c] = hover, s = sim.skilled_pct_by_events;
      read(`${+(qs[c] * 100).toFixed(1)}¢ · 10 events ${s['10'][c]}% · 20 events ${s['20'][c]}% · 40 events ${s['40'][c]}%`);
    } else read(`99¢, 20 events · ${sim.skilled_pct_by_events['20'][i99]}% called skilled, simulated`);
  }
  host.addEventListener('pointermove', ev => {
    const r = host.getBoundingClientRect(), x = ev.clientX - r.left;
    let best = 0, bd = Infinity;
    qs.forEach((p, c) => { const s = M.toScreen(X(c), 2, Z(1)); const d = Math.abs(s.x - x); if (d < bd) { bd = d; best = c; } });
    hover = [best]; draw();
  });
  host.addEventListener('pointerleave', () => { hover = null; draw(); });
  new ResizeObserver(() => draw()).observe(host);
  return { set q(v) { state.q = v; draw(); }, draw };
}
