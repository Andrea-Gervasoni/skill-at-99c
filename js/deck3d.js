// Start here, in 3D: one set of chips and coins that rearranges itself for every card.
// Chips are counters (a price, a bet, a share of accounts); coins are a real coin of Trajan,
// photographed: the portrait is heads, which keeps a result, and the reverse is tails, which
// flips its sign. Each card names a scene; switching scene
// sends every piece to its new place along a short arc, so the cards read as one object.
import * as THREE from './vendor/three.module.min.js';
import { t } from './i18n.js';

// tints over the silver photo: green patina for skilled/YES, bright silver for anti-skilled/NO, dark for the loss
const GREEN = 0x6f9f78, INK = 0x4a4a48, GREY = 0xf2f2f2, GREEN_SOFT = 0xb9d0bc, GREY_SOFT = 0xfafafa;
const N_CHIPS = 100, N_COINS = 21;
const CHIP_R = 0.42, CHIP_T = 0.06, COIN_R = 0.5, COIN_T = 0.09;

const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
const cents = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '¢';

// the five results of the coin card, and every way their signs can land
export const REAL = [3, -1, 2, 4, -1];
const REAL_TOT = REAL.reduce((a, b) => a + b, 0);
const ALL = Array.from({ length: 32 }, (_, m) => REAL.reduce((s, v, i) => s + (m >> i & 1 ? -v : v), 0));

export function createDeck3D({ canvas, labsEl, box, phone, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 80);

  // a soft paper studio for the sheen on the chips
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xd9d5cb);
  const soft = (w, h, c, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p); };
  soft(8, 3, 0xffffff, -3, 6, 4); soft(3, 7, 0xfff6e6, 6, 1, 3); soft(8, 3, 0xc9d3c6, 0, -4, 4);
  scene.environment = pmrem.fromScene(studio, 0.03).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d3c6, 0.55));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.1);
  key.position.set(-3.5, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.radius = 4; key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf0f2ff, 0.5); fill.position.set(5, 3, 4); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // ---------- coins: one photographed coin of Trajan (CNG, CC BY-SA 2.5), heads and tails ----------
  const loader = new THREE.TextureLoader();
  const tex = (url, rot, color) => {
    const tx = loader.load(url);
    if (color) tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8; tx.center.set(0.5, 0.5); tx.rotation = rot; // the caps' UVs run a quarter turn from the screen
    return tx;
  };
  const side = (name, rot) => new THREE.MeshStandardMaterial({ map: tex(`assets/coin-${name}.webp`, rot, true), bumpMap: tex(`assets/coin-${name}-bump.webp`, rot), bumpScale: 2, metalness: 0.55, roughness: 0.42 });
  const heads = side('obverse', Math.PI / 2), tails = side('reverse', -Math.PI / 2);
  const reeds = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 512; i += 6) { g.fillStyle = '#fff'; g.fillRect(i, 0, 3, 8); g.fillStyle = '#000'; g.fillRect(i + 3, 0, 3, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xbcbcbc, metalness: 0.9, roughness: 0.4, bumpMap: reeds, bumpScale: 1.5 });
  // ---------- chips: one instanced set, each with a tween from where it is to where it goes ----------
  const chips = new THREE.InstancedMesh(new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_T, 48), [edgeMat, heads, tails], N_CHIPS);
  chips.castShadow = true;
  chips.frustumCulled = false; // the set moves everywhere; its first bounds say nothing about later scenes
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pose = () => ({ p: [0, 0, 0], r: [0, 0, 0], s: [0, 0, 0], c: new THREE.Color(GREY) });
  const C = Array.from({ length: N_CHIPS }, () => ({ from: pose(), to: pose(), now: pose(), t0: -9, d: 1, lift: 0 }));
  for (let i = 0; i < N_CHIPS; i++) chips.setColorAt(i, C[i].now.c);
  scene.add(chips);

  const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_T, 64);
  const K = Array.from({ length: N_COINS }, () => {
    const mesh = new THREE.Mesh(coinGeo, [edgeMat, heads, tails]);
    mesh.rotation.x = Math.PI / 2; // caps face the lens
    mesh.castShadow = true;
    const spin = new THREE.Group(); spin.add(mesh);
    const hold = new THREE.Group(); hold.add(spin); hold.scale.setScalar(0.0001);
    scene.add(hold);
    return { hold, spin, from: { p: [0, 0, 0], s: 0 }, to: { p: [0, 0, 0], s: 0 }, now: { p: [0, 0, 0], s: 0 }, t0: -9, d: 1,
      a: 0, a0: 0, a1: 0, ta: -9, tad: 0.8 };
  });

  // the rule that marks the real total in the verdict scene
  const rule = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.6, 0.025), new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6 }));
  rule.position.set(1.8, 0.8, 0); rule.scale.y = 0.0001; scene.add(rule);
  let ruleOn = 0, ruleNow = 0;

  // ---------- scenes ----------
  const stack = (out, x, z, n, step, ty, col, from = 0) => {
    for (let j = 0; j < Math.ceil(n - 1e-6); j++) {
      const part = Math.min(1, n - j);
      out.push({ p: [x + (hash(j + from, 1) - 0.5) * 0.03, step * j + (step * part) / 2, z + (hash(j + from, 2) - 0.5) * 0.03], r: [0, hash(j, 3) * 6, 0], s: [1, ty * part, 1], c: col });
    }
    return out;
  };
  const S = {
    market() {
      const ch = []; stack(ch, -1.15, 0, 70, 0.046, 0.72, GREEN); stack(ch, 1.15, 0, 30, 0.046, 0.72, GREY, 70);
      return { chips: ch, frame: { c: [0, 1.75, 0], w: 5.2, h: 4.4 },
        labels: [['yes', t('YES share · 70¢'), [-1.15, 70 * 0.046 + 0.35, 0]], ['no', t('NO share · 30¢'), [1.15, 30 * 0.046 + 0.35, 0]], ['pay', t('The right side pays $1. The wrong side pays nothing.'), [0, 0, 1.5]]] };
    },
    price() {
      const ch = []; stack(ch, -1.15, 0, 99, 0.046, 0.72, GREEN); stack(ch, 1.15, 0, 1, 0.046, 0.72, GREY, 99);
      return { chips: ch, frame: { c: [0, 2.2, 0], w: 5.2, h: 5.2 },
        labels: [['yes', t('YES · 99¢ · the favourite'), [-1.15, 99 * 0.046 + 0.35, 0]], ['no', t('NO · 1¢'), [1.15, 0.4, 0]], ['pay', t('99¢ means about a 99% chance'), [0, 0, 1.5]]] };
    },
    hundred() {
      const ch = [];
      for (let i = 0; i < 100; i++) {
        const r = Math.floor(i / 10), c = i % 10, loss = i === 63;
        ch.push({ p: [(c - 4.5) * 0.58, loss ? 1.15 : CHIP_T / 2, (r - 4.5) * 0.58], r: [loss ? 1.0 : 0, 0, 0], s: [0.62, 1, 0.62], c: loss ? INK : GREEN, wob: loss });
      }
      return { chips: ch, frame: { c: [0, 0.5, 0], w: 7.4, h: 5 },
        labels: [['win', t('99 wins of +1¢'), [-1.5, 0, 3.4]], ['loss', t('1 loss of −99¢'), [(3 - 4.5) * 0.58, 1.8, (6 - 4.5) * 0.58]], ['sum', t('Together: 0¢'), [1.8, 0, 3.4]]] };
    },
    heads() {
      const co = [];
      for (let i = 0; i < 10; i++) co.push({ p: [(i - 4.5) * 0.84, 0.36, 0], s: 0.72 });
      return { coins: co, frame: { c: [0, 0.55, 0], w: 8.8, h: 2.6 },
        labels: [['h', t('Ten heads in a row: 1 chance in 1,024'), [0, 1.2, 0]]] };
    },
    flip() {
      const co = REAL.map((v, i) => ({ p: [(i - 2) * 1.35, COIN_R, 0], s: 1 }));
      return { coins: co, flipKeep: true, frame: { c: [0, 0.55, 0], w: 7.2, h: 2.9 },
        labels: REAL.map((v, i) => ['e' + i, cents(v), [(i - 2) * 1.35, 1.32, 0], v > 0 ? 'is-pos' : 'is-neg']).concat([['tot', t('one coin per event: heads keep the result, tails reverse it'), [0, -0.05, 1.05]]]) };
    },
    verdict() {
      const ch = [], h = {};
      ALL.map((v, m) => [v, m]).sort((a, b) => a[0] - b[0]).forEach(([v]) => {
        const j = h[v] = (h[v] || 0) + 1;
        ch.push({ p: [v * 0.3, 0.1 + (j - 1) * 0.24, 0], r: [0, hash(j, v + 20) * 6, 0], s: [0.62, 3.3, 0.62], c: v >= REAL_TOT ? GREEN : GREY });
      });
      return { chips: ch, rule: 1, frame: { c: [0, 0.75, 0], w: 7.6, h: 2.9 },
        labels: [['lo', '−11¢', [-3.3, 0, 0.75]], ['hi', '+11¢', [3.3, 0, 0.75]], ['real', t('real total: +7¢'), [1.8, 1.85, 0]],
          ['share', t('5 of 32 reach it, about 16%: no label'), [1.2, 0, 2.0]], ['each', t('one coin = one way the five coins can land'), [-1.5, 1.4, 0]]] };
    },
    paper() {
      const ch = []; stack(ch, -0.75, 0, 8.63, 0.1, 1.45, GREEN); stack(ch, 0.75, 0, 16.84, 0.1, 1.45, GREY, 20);
      return { chips: ch, frame: { c: [0, 1.0, 0], w: 5.2, h: 3.4 },
        labels: [['s', t('skilled 8.63%'), [-0.75, 1.2, 0]], ['a', t('anti-skilled 16.84%'), [0.75, 2.05, 0]], ['who', t('The paper, 2023–2025'), [0, 0, 1.25]]] };
    },
    mine() {
      const ch = [];
      stack(ch, -2.35, 0, 8.63, 0.1, 1.45, GREEN_SOFT); stack(ch, -1.35, 0, 16.84, 0.1, 1.45, GREY_SOFT, 20);
      stack(ch, 1.15, 0, 26.89, 0.1, 1.45, GREEN, 40); stack(ch, 2.15, 0, 11.05, 0.1, 1.45, GREY, 70);
      return { chips: ch, frame: { c: [0, 1.4, 0], w: 6.6, h: 4.1 },
        labels: [['ps', '8.63%', [-2.35, 1.2, 0]], ['pa', '16.84%', [-1.35, 2.05, 0]], ['ms', '26.89%', [1.15, 3.05, 0]], ['ma', '11.05%', [2.15, 1.45, 0]],
          ['w1', t('The paper'), [-1.85, 0, 1.25]], ['w2', t('My replication'), [1.65, 0, 1.25]], ['key', t('green: skilled · grey: anti-skilled'), [0, 3.75, -0.4]]] };
    },
    bridge() {
      const co = [];
      for (let i = 0; i < 20; i++) co.push({ p: [((i % 10) - 4.5) * 0.66, 0.3, i < 10 ? 0.8 : -1.1], s: 0.6 });
      co.push({ p: [0, 2.0, -1.0], s: 1.05 });
      return { coins: co, frame: { c: [0, 1.0, -0.2], w: 7.2, h: 3.8 },
        labels: [['loss', t('−99¢: the real loss. The coin never makes it.'), [0, 2.82, -1.0]], ['wins', t('20 wins of +1¢: heads +1¢, tails −1¢'), [0, 0, 1.7]]] };
    }
  };

  // ---------- labels: projected spans, one set per scene ----------
  const labs = new Map();
  let shown = [];
  function showLabels(name, list) {
    shown.forEach(l => l.el.classList.remove('is-on'));
    shown = list.map(([id, text, at, cls]) => {
      const k = name + ':' + id;
      let l = labs.get(k);
      if (!l) { const el = document.createElement('span'); el.className = 'dlab'; labsEl.appendChild(el); l = { el, at: new THREE.Vector3() }; labs.set(k, l); }
      if (text) l.el.textContent = text;
      l.el.className = 'dlab' + (cls ? ' ' + cls : '');
      l.at.set(...at);
      l.el.classList.add('is-on');
      return l;
    });
  }

  // ---------- switching scene ----------
  let cur = '', frame = { c: new THREE.Vector3(0, 1, 0), w: 6, h: 4 }, camC = new THREE.Vector3(0, 1, 0), camD = 14;
  let wob = -1, hover = -1, wave = false, clock = 0;
  function setScene(name, now) {
    if (name === cur || !S[name]) return;
    const first = !cur;
    cur = name;
    const sc = S[name]();
    const list = sc.chips || [];
    wob = list.findIndex(c => c.wob); hover = list.findIndex(c => c.hover);
    for (let i = 0; i < N_CHIPS; i++) {
      const c = C[i], tg = list[i];
      copyPose(c.from, c.now);
      if (tg) { c.to.p = tg.p.slice(); c.to.r = tg.r.slice(); c.to.s = tg.s.slice(); c.to.c.set(tg.c); }
      else { c.to.p = c.now.p.slice(); c.to.r = c.now.r.slice(); c.to.s = [0, 0, 0]; c.to.c.copy(c.now.c); }
      const dist = Math.hypot(c.to.p[0] - c.from.p[0], c.to.p[1] - c.from.p[1], c.to.p[2] - c.from.p[2]);
      c.lift = first ? 0 : Math.min(1.2, dist * 0.35);
      c.t0 = now + (first || reduced ? 0 : (i % 50) * 0.008 + hash(i, 7) * 0.12);
      c.d = reduced ? 0.001 : 0.9;
      if (first) { c.from.p = c.to.p.slice(); c.from.p[1] += 2.5; c.from.r = c.to.r.slice(); c.from.s = c.to.s.slice(); c.from.c.copy(c.to.c); }
    }
    const co = sc.coins || [];
    K.forEach((k, i) => {
      const tg = co[i];
      k.from = { p: k.now.p.slice(), s: k.now.s };
      k.to = tg ? { p: tg.p.slice(), s: tg.s } : { p: k.now.p.slice(), s: 0 };
      k.t0 = now + (reduced ? 0 : 0.1 + i * 0.025);
      k.d = reduced ? 0.001 : 0.85;
      if (!sc.flipKeep) turn(k, 0, now, 0);
    });
    wave = name === 'bridge';
    ruleOn = sc.rule || 0;
    frame = { c: new THREE.Vector3(...sc.frame.c), w: sc.frame.w, h: sc.frame.h };
    if (first) { camC.copy(frame.c); camD = fitD(); }
    showLabels(name, sc.labels || []);
  }
  const copyPose = (a, b) => { a.p = b.p.slice(); a.r = b.r.slice(); a.s = b.s.slice(); a.c.copy(b.c); };

  // turn a coin to a face: 0 heads (the real result), 1 tails (reversed); extra full turns for a toss
  function turn(k, face, now, extra = 1) {
    const base = Math.round(k.a / Math.PI);
    const target = (base + (((base % 2) + 2) % 2 !== face ? 1 : 0) + extra * 2) * Math.PI;
    k.a0 = k.a; k.a1 = target; k.ta = now; k.tad = reduced ? 0.001 : 0.75 + extra * 0.15;
  }
  function flip(signs, now) {
    signs.forEach((s, i) => { const k = K[i]; turn(k, s < 0 ? 1 : 0, now + (reduced ? 0 : i * 0.07), 1); });
  }
  function setLabel(id, text, cls) { const l = labs.get(cur + ':' + id); if (!l) return; l.el.textContent = text; if (cls != null) l.el.className = 'dlab is-on ' + cls; }

  // ---------- size and framing ----------
  let W = 1, H = 1, bx = 0.5, by = 0.5, bw = 1, bh = 1;
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const fitD = () => Math.max((frame.h * H) / (2 * tanH * bh), (frame.w * H) / (2 * tanH * bw)) * 1.04;
  function resize() {
    const r = canvas.getBoundingClientRect(), b = box.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    bw = Math.max(40, b.width); bh = Math.max(40, b.height);
    bx = b.left - r.left + bw / 2; by = b.top - r.top + bh / 2;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);
    camera.updateProjectionMatrix();
  }

  // ---------- frame ----------
  const dummy = new THREE.Object3D();
  const v = new THREE.Vector3();
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let last = 0;
  function render(now) {
    const dt = Math.min(0.05, last ? now - last : 0.016); last = now; clock += dt;
    // camera eases toward the scene's frame, seen from a little above and to the left
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    camC.lerp(frame.c, k); camD += (fitD() - camD) * k;
    look.x += (look.tx - look.x) * 0.05; look.y += (look.ty - look.y) * 0.05;
    const az = -0.2 + look.x * 0.08, el = 0.36 + look.y * 0.04;
    camera.position.set(camC.x + Math.sin(az) * Math.cos(el) * camD, camC.y + Math.sin(el) * camD, camC.z + Math.cos(az) * Math.cos(el) * camD);
    camera.lookAt(camC);

    for (let i = 0; i < N_CHIPS; i++) {
      const c = C[i], e = ease(clamp01((now - c.t0) / c.d)), n = c.now;
      for (let j = 0; j < 3; j++) { n.p[j] = c.from.p[j] + (c.to.p[j] - c.from.p[j]) * e; n.r[j] = c.from.r[j] + (c.to.r[j] - c.from.r[j]) * e; n.s[j] = c.from.s[j] + (c.to.s[j] - c.from.s[j]) * e; }
      n.c.copy(c.from.c).lerp(c.to.c, e);
      dummy.position.set(n.p[0], n.p[1] + Math.sin(Math.PI * e) * c.lift, n.p[2]);
      dummy.rotation.set(n.r[0], n.r[1], n.r[2]);
      if ((i === wob || i === hover) && !reduced) { dummy.rotation.y += clock * 0.8; dummy.position.y += Math.sin(clock * 1.6) * 0.06; }
      dummy.scale.set(Math.max(1e-4, n.s[0]), Math.max(1e-4, n.s[1]), Math.max(1e-4, n.s[2]));
      if (n.s[0] < 0.01) dummy.position.y = -50; // a hidden chip leaves no speck or shadow behind
      dummy.updateMatrix();
      chips.setMatrixAt(i, dummy.matrix);
      chips.setColorAt(i, n.c);
    }
    chips.instanceMatrix.needsUpdate = true; chips.instanceColor.needsUpdate = true;

    K.forEach((k, i) => {
      const e = ease(clamp01((now - k.t0) / k.d));
      const s = k.from.s + (k.to.s - k.from.s) * e;
      for (let j = 0; j < 3; j++) k.now.p[j] = k.from.p[j] + (k.to.p[j] - k.from.p[j]) * e;
      k.now.s = s;
      const te = clamp01((now - k.ta) / k.tad), ae = 1 - Math.pow(1 - te, 3);
      k.a = k.a0 + (k.a1 - k.a0) * ae;
      let a = k.a;
      if (wave && !reduced && i < 20) { const ph = ((clock / 4.5 - (i % 10) * 0.045 - (i < 10 ? 0 : 0.12)) % 1 + 1) % 1; a += Math.PI * smooth(0.08, 0.26, ph) * (1 - smooth(0.5, 0.68, ph)); }
      const hop = te > 0 && te < 1 ? Math.sin(Math.PI * te) * 0.55 * (Math.abs(k.a1 - k.a0) > Math.PI * 1.5 ? 1 : 0.3) : 0;
      k.hold.position.set(k.now.p[0], k.now.p[1] + hop + (wave && i === 20 && !reduced ? Math.sin(clock * 1.4) * 0.06 : 0), k.now.p[2]);
      k.hold.scale.setScalar(Math.max(1e-4, s));
      k.hold.visible = s > 0.01;
      k.hold.rotation.x = -0.18; // lean back a little toward the lens
      k.spin.rotation.x = a;
    });

    ruleNow += (ruleOn - ruleNow) * (reduced ? 1 : 1 - Math.exp(-dt * 4));
    rule.scale.y = Math.max(1e-4, ruleNow); rule.position.y = 0.8 * ruleNow;

    renderer.render(scene, camera);

    for (const l of shown) {
      v.copy(l.at).project(camera);
      // a label never leaves the canvas, whatever the width
      const w = l.el.offsetWidth, gut = 12;
      const x = Math.min(W - gut - w / 2, Math.max(gut + w / 2, (v.x + 1) / 2 * W)), y = (1 - v.y) / 2 * H;
      l.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`;
    }
  }

  window.addEventListener('pointermove', e => { look.tx = (e.clientX / innerWidth - 0.5) * 2; look.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  return { setScene, flip, setLabel, resize, render, get scene() { return cur; } };
}
