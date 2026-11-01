// The stage: real $1 bills as thin paper sheets.
// First view: seven bills float over the paper. Signature: 1,000 sign-flipped
// histories rain down and stack by outcome; the real record lands last.
// Everything is a pure function of (t0, p, exit) plus a time-based state tween,
// so scrolling back rewinds it exactly.

import * as THREE from './vendor/three.module.min.js';
import { heroSim, B } from './sim.js';

export const BILL_W = 1;
export const BILL_L = 6.14 / 2.61;
export const SHEET = 0.03;
const N_BINS = 21;
const PITCH = 1.14;
const HALF = (N_BINS / 2) * PITCH;
const HERO = 11;              // instances 0..10 float in the first view; 0 is the real record
const COUNT = B + 1;
const DOMAIN = { fav99: 0.21, fav99loss: 1.26, fair50: 10.5 };
const STEP = { fav99: 0.02, fav99loss: 0.02, fair50: 1 }; // spacing of the possible totals
const RAIN_START = 0.04, RAIN_SPAN = 0.56, FALL = 0.12;
const REAL_LAND = [0.66, 0.84];
const TWEEN_MS = 1400;
const TALL = 180;             // histories in the tallest pile at full sheet thickness
const Z_FRONT = BILL_L / 2 + 0.45;
const Z_BACK = -(BILL_L / 2 + 0.35);
const LEVELS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
const TICK_BINS = [0, 5, 10, 15, 20];

const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
const clamp01 = v => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth01 = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const colX = b => (b - (N_BINS - 1) / 2) * PITCH;

// First view, seen from the front on a dark stage: x, y, depth z, fall speed, phase, scale.
// Speed 0 hovers (the real record, in the beam). The others fall slowly and loop above the frame.
const HERO_DESK = [
  [ 7.2, 5.6,  3.0, 0.00, 0.3, 1.25],
  [ 4.5, 9.0, -2.0, 0.55, 1.1, 1.15],
  [ 8.5, 1.5, -1.0, 0.70, 2.0, 1.15],
  [ 6.0, 8.5,  6.0, 0.45, 2.7, 1.10],
  [ 8.0, 0.5,  5.0, 0.50, 3.3, 1.05],
  [11.0, 6.5, -6.0, 0.80, 4.0, 1.15],
  [ 9.5, 12.0, -5.0, 0.75, 4.6, 1.15],
  [ 7.6, 5.0, 13.0, 0.35, 5.2, 1.00],
  [ 5.6, 9.4, 12.5, 0.32, 5.9, 1.00],
  [ 2.5, 11.0, -9.0, 0.90, 0.7, 1.15],
  [ 5.0, -1.0, -8.0, 0.85, 1.6, 1.15]
];
const HERO_PHONE = [
  [ 0.4, 5.6,  2.0, 0.00, 0.3, 1.05],
  [-1.6, 9.5, -2.0, 0.55, 1.1, 1.00],
  [ 2.2, 2.0, -1.0, 0.70, 2.0, 1.00],
  [ 1.6, 8.5,  6.0, 0.45, 2.7, 0.95],
  [-1.2, 1.0,  5.0, 0.50, 3.3, 0.95],
  [ 2.8, 6.5, -6.0, 0.80, 4.0, 1.00],
  [-2.8, 12.0, -5.0, 0.75, 4.6, 1.00],
  [ 2.0, 5.0, 13.0, 0.35, 5.2, 0.90],
  [-1.8, 7.2, 12.5, 0.32, 5.9, 0.90],
  [ 0.8, 11.0, -9.0, 0.90, 0.7, 1.00],
  [-0.6, -1.0, -8.0, 0.85, 1.6, 1.00]
];
const RAIN = 90;              // instances HERO..HERO+RAIN also fall behind them in the first view
const Y_TOP = 17, Y_RANGE = 27;
const loopY = (y0, speed, t) => Y_TOP - ((((Y_TOP - y0) + t * speed) % Y_RANGE) + Y_RANGE) % Y_RANGE;

const DEFORM_GLSL = /* glsl */`
attribute vec4 aDef;
attribute float aPhase;
attribute float aFace;
attribute float aTint;
uniform float uTime;
uniform vec2 uSize;
varying vec2 vBillUv;
varying float vFace;
varying float vSheetY;
varying vec3 vWear;
varying float vTint;
float defH; float defDx; float defDz;
void deformSheet(vec3 p) {
  float zz = p.z, xx = p.x;
  float a1 = uTime * 1.6 + aPhase;
  float a2 = uTime * 1.1 + aPhase * 1.7;
  float amp = aDef.w * (0.35 + abs(zz) / uSize.y);
  defH  = aDef.x * zz * zz + aDef.y * xx * xx + aDef.z * xx * zz + 0.5 * amp * sin(zz * 2.4 + a1) + 0.15 * aDef.w * sin(xx * 3.1 + a2);
  defDx = 2.0 * aDef.y * xx + aDef.z * zz + 0.465 * aDef.w * cos(xx * 3.1 + a2);
  defDz = 2.0 * aDef.x * zz + aDef.z * xx + 1.2 * amp * cos(zz * 2.4 + a1);
}
`;

export function sheetGeometry() {
  const g = new THREE.BoxGeometry(BILL_W, SHEET, BILL_L, 6, 1, 18);
  const face = new Float32Array(g.attributes.position.count);
  const idx = g.index.array;
  g.groups.forEach((grp, gi) => {
    const v = gi === 2 ? 1 : gi === 3 ? -1 : 0;
    for (let i = grp.start; i < grp.start + grp.count; i++) face[idx[i]] = v;
  });
  g.setAttribute('aFace', new THREE.BufferAttribute(face, 1));
  return g;
}

export function billMaterial(map, normalMap, uniforms) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.74, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, {
      uNormalMap: { value: normalMap },
      uPaper: { value: new THREE.Color('#EDEBE3') },
      uEdge: { value: new THREE.Color('#E4E1D6') },
      uNormalScale: { value: 0.55 }
    });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + DEFORM_GLSL + '\nvarying vec3 vT; varying vec3 vBt;')
      .replace('#include <beginnormal_vertex>', `
        deformSheet(position);
        vec3 objectNormal = vec3(normal);
        if (aFace > 0.5) objectNormal = normalize(vec3(-defDx, 1.0, -defDz));
        else if (aFace < -0.5) objectNormal = normalize(vec3(defDx, -1.0, defDz));
      `)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.y += defH;
        vBillUv = vec2(position.z / uSize.y + 0.5, position.x / uSize.x + 0.5);
        vFace = aFace;
        vTint = aTint;
        vSheetY = position.y / ${(SHEET / 2).toFixed(4)};
        // circulated notes: a little darker or warmer, never the same twice
        float w1 = fract(aPhase * 3.17), w2 = fract(aPhase * 7.31);
        vWear = mix(vec3(1.0), vec3(1.0, 0.965, 0.9), w2 * 0.8) * (0.9 + 0.1 * w1);
        mat3 im3 = mat3(instanceMatrix);
        vT = normalize(normalMatrix * (im3 * vec3(0.0, 0.0, 1.0)));
        vBt = normalize(normalMatrix * (im3 * vec3(1.0, 0.0, 0.0)));
      `);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vBillUv; varying float vFace; varying float vSheetY; varying vec3 vT; varying vec3 vBt; varying vec3 vWear; varying float vTint;
        uniform sampler2D uNormalMap; uniform vec3 uPaper; uniform vec3 uEdge; uniform float uNormalScale;`)
      .replace('#include <map_fragment>', `
        if (vFace > 0.5) {
          diffuseColor.rgb *= texture2D(map, vBillUv).rgb;
        } else if (vFace < -0.5) {
          vec3 through = texture2D(map, vec2(1.0 - vBillUv.x, vBillUv.y)).rgb;
          diffuseColor.rgb *= mix(uPaper, through, 0.08);
        } else {
          // edge colour carries data in the small figures: 1 = skilled (green), 2 = anti-skilled (grey)
          vec3 edge = vTint < 0.5 ? uEdge : vTint < 1.5 ? vec3(0.052, 0.155, 0.062) : vec3(0.26, 0.255, 0.235);
          diffuseColor.rgb *= edge * mix(1.0, 0.7, smoothstep(0.4, 1.0, abs(vSheetY)));
        }
        diffuseColor.rgb *= vWear;
      `)
      .replace('#include <normal_fragment_maps>', `
        if (vFace > 0.5) {
          vec3 nm = texture2D(uNormalMap, vBillUv).xyz * 2.0 - 1.0;
          nm.xy *= uNormalScale;
          normal = normalize(normalize(vT) * nm.x + normalize(vBt) * nm.y + normal * nm.z);
        }
      `);
  };
  m.customProgramCacheKey = () => 'bill-sheet';
  return m;
}

export function depthMaterial(uniforms) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + DEFORM_GLSL)
      .replace('#include <begin_vertex>', 'deformSheet(position); vec3 transformed = vec3(position); transformed.y += defH;');
  };
  m.customProgramCacheKey = () => 'bill-depth';
  return m;
}

// Soft rectangle used as a contact shadow under each pile.
function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.filter = 'blur(9px)';
  g.fillStyle = '#fff';
  g.fillRect(16, 18, 32, 92);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Where every bill rests for one state of the simulation.
function buildSlots(sim, key, baseLayer) {
  const D = DOMAIN[key];
  const w = (2 * D) / N_BINS;
  const binOf = v => Math.min(N_BINS - 1, Math.max(0, Math.floor((v + D) / w + 1e-9)));
  const bins = new Int32Array(COUNT);
  const counts = new Int32Array(N_BINS);
  for (let i = 1; i < COUNT; i++) counts[(bins[i] = binOf(sim.totals[i - 1] / 100))]++;
  const maxCount = Math.max(...counts);
  // The tallest pile always has the same height; sheets get thinner when one column takes most histories.
  const layer = Math.min(baseLayer, (baseLayer * TALL) / maxCount);
  const fill = new Int32Array(N_BINS);
  const pos = new Float32Array(COUNT * 3);
  const yaw = new Float32Array(COUNT);
  const curl = new Float32Array(COUNT);
  for (let i = 1; i < COUNT; i++) {
    const b = bins[i];
    const l = fill[b]++;
    pos[i * 3] = colX(b) + (hash(i, 1) - .5) * 0.1;
    pos[i * 3 + 1] = SHEET / 2 + l * layer;
    pos[i * 3 + 2] = (hash(i, 2) - .5) * 0.16;
    yaw[i] = (hash(i, 3) - .5) * 0.14;
    const top = l === counts[b] - 1;
    curl[i] = top ? 0.05 + hash(i, 12) * 0.05 : hash(i, 13) < 0.12 ? 0.02 : 0;
  }
  const rb = binOf(sim.observed);
  const top = Math.max(counts[Math.max(0, rb - 1)], counts[rb], counts[Math.min(N_BINS - 1, rb + 1)]);
  pos[0] = colX(rb);
  pos[1] = top * layer + SHEET + 0.03;
  pos[2] = 0.15;
  yaw[0] = Math.PI / 2 - 0.05;
  curl[0] = 0.05;
  const b95 = binOf(sim.p95);
  const step = maxCount > 300 ? 100 : 50;
  const single = w <= STEP[key] * 1.01;
  return {
    pos, yaw, curl, counts, maxCount, layer, step,
    maxH: maxCount * layer,
    x95: colX(b95) + PITCH / 2,
    realBin: rb,
    cols: Array.from(counts, (n, b) => {
      const lo = -D + b * w, hi = lo + w;
      // Bin edges sit between possible totals, so the first and last totals inside are exact.
      const first = Math.ceil(lo / STEP[key] - 1e-9) * STEP[key];
      const last = Math.floor(hi / STEP[key] - 1e-9) * STEP[key];
      return { n, lo: single ? -D + (b + .5) * w : first, hi: single ? null : last };
    }),
    ticks: TICK_BINS.map(b => ({ x: colX(b), v: -D + (b + .5) * w })),
    D
  };
}

export function createStage(canvas, { billTex, normalTex, phone }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xe9e5d9, 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfffaf0, 2.7);
  key.position.set(-5, 22, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 2, far: 70 });
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = phone ? 8 : 12;
  key.shadow.blurSamples = phone ? 8 : 16;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf2f4ff, 0.45);
  fill.position.set(10, 6, 4);
  scene.add(fill);

  // first view: one beam on the dark stage, and the faint cone of light it draws in the air
  const beam = new THREE.SpotLight(0xfff4e2, 0, 0, 0.3, 0.75, 0);
  scene.add(beam, beam.target);
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.DoubleSide,
    uniforms: { uO: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec2 vUv;
      void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uO; varying vec3 vN; varying vec2 vUv;
      void main() {
        float face = pow(abs(vN.z), 1.6);
        float along = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
        float a = uO * face * along;
        gl_FragColor = vec4(vec3(0.93, 0.91, 0.86) * a, a); // premultiplied, so the canvas stays see-through
      }`
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(6.5, 34, 64, 1, true), coneMat);
  cone.frustumCulled = false;
  scene.add(cone);
  function aimBeam() {
    const src = portrait ? new THREE.Vector3(3, 26, 6) : new THREE.Vector3(11, 26, 8);
    const dst = portrait ? new THREE.Vector3(0.4, 4, 1) : new THREE.Vector3(7.4, 5, 2);
    beam.position.copy(src); beam.target.position.copy(dst); beam.target.updateMatrixWorld();
    // phone: the light falls off toward the headline at the bottom of the screen
    beam.distance = portrait ? 40 : 0; beam.decay = portrait ? 2 : 0;
    const dir = src.clone().sub(dst).normalize();
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    cone.position.copy(src).addScaledVector(dir, -17);
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: 0x1b1a16, opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  billTex.colorSpace = THREE.SRGBColorSpace;
  billTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  normalTex.colorSpace = THREE.NoColorSpace;

  const uniforms = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(BILL_W, BILL_L) } };
  const geo = sheetGeometry();
  const aDef = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aPhase = new THREE.InstancedBufferAttribute(new Float32Array(COUNT), 1);
  for (let i = 0; i < COUNT; i++) aPhase.array[i] = hash(i, 9) * 6.283;
  aPhase.array[0] = 0.5; // the real record is a clean note
  geo.setAttribute('aDef', aDef);
  geo.setAttribute('aPhase', aPhase);

  const bills = new THREE.InstancedMesh(geo, billMaterial(billTex, normalTex, uniforms), COUNT);
  bills.customDepthMaterial = depthMaterial(uniforms);
  bills.castShadow = true;
  bills.receiveShadow = true;
  bills.frustumCulled = false;
  bills.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // per-bill shade: bills that drift behind the headline go dark so the type stays readable
  bills.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
  scene.add(bills);

  // Contact shadows: the darkest band where a pile meets the paper.
  const blobs = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x1b1a16, alphaMap: blobTexture(), transparent: true, opacity: 0.34, depthWrite: false }),
    N_BINS
  );
  blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blobs.frustumCulled = false;
  blobs.renderOrder = -1;
  scene.add(blobs);

  // Chart furniture: axis, ticks, 95th percentile rule, count grid.
  const lineMat = new THREE.LineBasicMaterial({ color: 0x141412, transparent: true, opacity: 0 });
  const tickPts = [new THREE.Vector3(-HALF, 0, 0), new THREE.Vector3(HALF, 0, 0)];
  TICK_BINS.forEach(b => tickPts.push(new THREE.Vector3(colX(b), 0, 0), new THREE.Vector3(colX(b), 0, 0.32)));
  const axis = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), lineMat);
  axis.position.set(0, 0.002, Z_FRONT);
  scene.add(axis);
  const ruleMat = lineMat.clone();
  const rule = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]), ruleMat);
  rule.position.z = Z_FRONT;
  scene.add(rule);
  const gridGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-HALF, 0, 0), new THREE.Vector3(HALF, 0, 0)]);
  const grid = LEVELS.map(() => {
    const l = new THREE.Line(gridGeo, new THREE.LineBasicMaterial({ color: 0x141412, transparent: true, opacity: 0, depthWrite: false }));
    l.position.z = Z_BACK;
    scene.add(l);
    return l;
  });

  const sims = { fav99: heroSim('fav99'), fav99loss: heroSim('fav99loss'), fair50: heroSim('fair50') };

  let baseLayer = 0.05;
  let slots = {};
  let heroPoses = phone ? HERO_PHONE : HERO_DESK;
  let state = 'fav99', prevState = 'fav99', tweenStart = -1e9;
  let W = 1, H = 1, svh = 1, portrait = false;
  let chartRect = { x: 0, y: 0, w: 1, h: 1 };
  let lay = 0.05, twE = 1, guide = 0, gridO = 0;
  let x95 = 0, ruleH = 1;
  const gridVis = new Float32Array(LEVELS.length);
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, active: false };
  const push = new Float32Array(HERO * 4); // x/z offset and velocity per first-view bill
  let wind = 0, windV = 0;
  const ELEV = () => THREE.MathUtils.degToRad(portrait ? 22 : 17);

  function rebuildSlots() {
    slots = {};
    for (const k of Object.keys(sims)) slots[k] = buildSlots(sims[k], k, baseLayer);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  const tHero = new THREE.Vector3(), tTable = new THREE.Vector3();
  let table = { d: 30, offX: 0, offY: 0 };

  // Fit the table view inside the chart rectangle measured in the page (CSS px, svh space).
  // 56 px under the axis are kept for tick labels, 34 px above for the 95th label.
  function fitTable() {
    const r = chartRect;
    const chartW = 2 * HALF + 0.4;
    const usableH = Math.max(80, r.h - 56 - 34);
    const el = ELEV();
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (W / H));
    // piles as tall as the rectangle allows, within a believable range
    baseLayer = Math.min(portrait ? 0.08 : 0.06, Math.max(0.04, (chartW * (usableH / (r.w * 0.94)) * 0.82) / TALL));
    rebuildSlots();
    const chartH = Math.max(slots.fav99.maxH, slots.fav99loss.maxH, slots.fair50.maxH);
    const visH = chartH * Math.cos(el) + (Z_FRONT - Z_BACK) * Math.sin(el);
    const dW = (chartW / 2) / (Math.tan(hfov / 2) * ((r.w * 0.94) / W));
    const dH = (visH / 2) / (Math.tan(vfov / 2) * (usableH / H));
    const d = Math.max(dW, dH);
    tTable.set(0, chartH * 0.5 - 0.15, 0);
    table = { d, offX: W / 2 - (r.x + r.w / 2), offY: H / 2 - (r.y + 34 + usableH / 2) };
  }

  function resize(w, h, smallH, rect) {
    W = w; H = h; svh = smallH;
    portrait = w / smallH < 0.9;
    heroPoses = portrait ? HERO_PHONE : HERO_DESK;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (rect) chartRect = rect;
    aimBeam();
    fitTable();
  }

  function setState(next, now) {
    if (next === state) return;
    prevState = state; state = next; tweenStart = now;
  }

  // Camera: top-down over the floating bills, then a low view of the table.
  function frameCamera(t0, exit) {
    const k = easeInOut(clamp01(t0));
    const dHero = portrait ? 30 : 24;
    tHero.set(portrait ? 0 : 1.5, portrait ? 5.2 : 4.2, 0);
    const el = mix(THREE.MathUtils.degToRad(3), ELEV(), k);
    const d = mix(dHero, table.d, k);
    camTarget.lerpVectors(tHero, tTable, k);
    camPos.set(0, Math.sin(el) * d, Math.cos(el) * d).add(camTarget);
    camera.position.copy(camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(camTarget);
    // the hero is framed on the small viewport; the table leaves with the page on exit
    const heroOffY = (H - svh) / 2;
    camera.setViewOffset(W, H, mix(0, table.offX, k), mix(heroOffY, table.offY, k) + exit * svh, W, H);
    camera.updateProjectionMatrix();
  }

  // Phone: a bill dealt from the nearest side at table height, sliding over the shorter piles
  // into its slot. It never rises above the tallest pile, so it stays inside the chart box.
  const dealt = { px: 0, py: 0, pz: 0, yaw: 0, rx: 0, rz: 0, c0: 0, fl: 0 };
  function deal(i, f, sx, sy, sz, syaw, scurl, mh) {
    const side = sx < -0.3 ? -1 : sx > 0.3 ? 1 : hash(i, 14) < 0.5 ? -1 : 1;
    const e2 = 1 - Math.pow(1 - f, 2.2);
    const air = 1 - e2;
    const head = Math.max(0.35, mh * 1.04 - sy);
    const lift = Math.min(1.4 + hash(i, 15) * 2.2, head);
    const ph = hash(i, 6) * 6.283;
    dealt.px = sx + air * side * (HALF + 8 + hash(i, 7) * 5);
    dealt.py = sy + air * lift + Math.sin(Math.PI * f) * Math.min(0.6, head * 0.5);
    dealt.pz = sz + air * ((hash(i, 10) - .5) * 2.4 + 0.8);
    dealt.yaw = syaw + air * side * (1.4 + hash(i, 11) * 2.2);
    dealt.rx = air * Math.sin(f * 8 + ph) * 0.22;
    dealt.rz = air * side * 0.3;
    dealt.c0 = air * 0.16 + e2 * scurl;
    dealt.fl = air * 0.08;
    return dealt;
  }

  function frame({ time, t0, p, exit, reduced, keep }) {
    const now = time * 1000;
    uniforms.uTime.value = reduced ? 0 : time;

    pointer.vx += (pointer.x - pointer.sx) * 0.06; pointer.vx *= 0.82; pointer.sx += pointer.vx;
    pointer.vy += (pointer.y - pointer.sy) * 0.06; pointer.vy *= 0.82; pointer.sy += pointer.vy;
    windV += (wind - windV) * 0.08; wind *= 0.9;

    const tw = clamp01((now - tweenStart) / TWEEN_MS);
    twE = easeInOut(tw);
    const A = slots[prevState], Bs = slots[state];
    const intro = reduced ? 1 : clamp01(introT(now));
    lay = mix(A.layer, Bs.layer, twE);
    const mh = mix(A.maxH, Bs.maxH, twE);
    let shade = 1, shadeDirty = false;

    for (let i = 0; i < COUNT; i++) {
      const lift = Math.sin(Math.PI * twE) * (0.8 + hash(i, 4) * 1.6) * (tw < 1 ? 1 : 0);
      const sx = mix(A.pos[i * 3], Bs.pos[i * 3], twE);
      const sy = mix(A.pos[i * 3 + 1], Bs.pos[i * 3 + 1], twE) + lift;
      const sz = mix(A.pos[i * 3 + 2], Bs.pos[i * 3 + 2], twE);
      const syaw = mix(A.yaw[i], Bs.yaw[i], twE);
      const scurl = mix(A.curl[i], Bs.curl[i], twE);
      let px = 0, py = 0, pz = 0, yaw = 0, rx = 0, rz = 0, c0 = 0, c1 = 0, c2 = 0, fl = 0, sc = 1;

      // landing: from the air into the slot (rain from above on desktop, dealt from the side on phone)
      const isHero = i < HERO;
      const win = isHero ? (i === 0 ? REAL_LAND : [0.02 + i * 0.03, 0.2 + i * 0.03]) : null;
      const st = isHero ? win[0] : RAIN_START + RAIN_SPAN * (i / COUNT) + hash(i, 5) * 0.02;
      const f = clamp01((p - st) / (isHero ? win[1] - win[0] : FALL));
      let lk;
      if (portrait) {
        ({ px, py, pz, yaw, rx, rz, c0, fl } = deal(i, f, sx, sy, sz, syaw, scurl, mh));
        lk = 1 - Math.pow(1 - f, 2.2);
      } else {
        const fe = isHero ? easeInOut(f) : 1 - Math.pow(1 - f, 1.7);
        const ph = hash(i, 6) * 6.283;
        const air = 1 - fe;
        px = sx + air * ((hash(i, 7) - .5) * 5 + Math.sin(f * 6 + ph) * 0.7);
        py = sy + air * (46 + hash(i, 8) * 10); // starts above the camera in every pose
        pz = sz + air * ((hash(i, 10) - .5) * 4);
        yaw = syaw + air * (hash(i, 11) - .5) * 4;
        rx = air * Math.sin(f * 9 + ph) * 0.9;
        rz = air * Math.cos(f * 7 + ph) * 0.7;
        c0 = air * 0.22 + fe * scurl; c1 = air * 0.08;
        fl = air * 0.12;
        lk = fe;
      }

      // first view: slow rain on the dark stage. It rises out of frame as the camera moves to the
      // desk, and from t0 = 0.95 every bill waits in its (off-screen) air pose instead.
      if (t0 < 0.95 && i < HERO + (portrait ? 46 : RAIN)) {
        const tr = reduced ? 0 : Math.max(0, time - introStart / 1000);
        let hx, hy, hz, speed, ph, hs;
        if (isHero) {
          [hx, hy, hz, speed, ph, hs] = heroPoses[i];
        } else {
          // the rain falls where the beam is, away from the headline
          const spread = portrait ? 9 : 17;
          hx = (portrait ? 0 : 8.5) + (hash(i, 20) - .5) * spread;
          hz = -2 - hash(i, 21) * 14;
          hy = Y_TOP - hash(i, 22) * Y_RANGE;
          speed = 1.3 + hash(i, 23) * 1.4; ph = hash(i, 24) * 6.283; hs = 1;
        }
        const ie = easeOut(clamp01((intro - (isHero ? i * 0.035 : hash(i, 25) * 0.4)) / 0.6));
        let y = speed ? loopY(hy, speed, tr) : hy + Math.sin(tr * 0.5) * 0.25;
        // the rain lifts away as the camera comes down; on a phone it clears before the chart copy arrives
        y += (1 - ie) * 24 + (portrait ? Math.pow(clamp01(t0 / 0.55), 2) * 80 : Math.pow(t0 / 0.95, 2) * 56);
        // the pointer pushes the paper away, with a spring back
        if (isHero && !reduced) {
          let tx = 0, ty = 0;
          if (pointer.active && t0 < 0.3) {
            proj.set(hx + push[i * 4], y + push[i * 4 + 1], hz).project(camera);
            const dx = (proj.x - pointer.x) * W / 2, dy = (-proj.y - pointer.y) * svh / 2;
            const d = Math.hypot(dx, dy), R = portrait ? 150 : 240;
            if (d < R && d > 0.001) { const k = (1 - d / R) * (portrait ? 1.4 : 2.2); tx = (dx / d) * k; ty = -(dy / d) * k; }
          }
          push[i * 4 + 2] = (push[i * 4 + 2] + (tx - push[i * 4]) * 0.05) * 0.86;
          push[i * 4 + 3] = (push[i * 4 + 3] + (ty - push[i * 4 + 1]) * 0.05) * 0.86;
          push[i * 4] += push[i * 4 + 2]; push[i * 4 + 1] += push[i * 4 + 3];
        }
        const pu = isHero ? push[i * 4] : 0, pv = isHero ? push[i * 4 + 1] : 0;
        px = hx + pu + Math.sin(tr * 0.3 + ph) * 0.5;
        py = y + pv;
        pz = hz;
        // faces the camera, tumbling slowly
        yaw = Math.PI / 2 + Math.sin(tr * 0.32 + ph) * 0.35 + (speed ? tr * 0.06 * (hash(i, 26) < .5 ? 1 : -1) : 0) + (isHero ? pointer.sx * 0.06 + push[i * 4 + 2] * 0.5 : 0);
        // about the long axis: the printed face turns toward the camera
        rz = 1.12 + Math.sin(tr * 0.55 + ph) * 0.32 + (isHero ? pointer.sy * 0.1 : 0);
        rx = Math.sin(tr * 0.41 + ph * 1.3) * 0.38 - (isHero ? push[i * 4 + 2] * 0.3 : 0);
        c0 = 0.22 + Math.sin(tr * 0.7 + ph) * 0.08; c1 = 0.04; c2 = (i % 2 ? 0.14 : -0.14);
        fl = reduced ? 0 : 0.1 + windV * 0.4;
        sc = hs; lk = 0;
        if (keep) {
          proj.set(px, py, pz).project(camera);
          const bx = (proj.x * 0.5 + 0.5) * W, by = (-proj.y * 0.5 + 0.5) * H;
          const dx = Math.max(keep.l - bx, 0, bx - keep.r), dy = Math.max(keep.t - by, 0, by - keep.b);
          shade = mix(0.24, 1, smooth01(Math.hypot(dx, dy) / 110));
        }
      }
      if (i < HERO + RAIN) {
        const ca = bills.instanceColor.array;
        if (ca[i * 3] !== shade) { ca[i * 3] = ca[i * 3 + 1] = ca[i * 3 + 2] = shade; shadeDirty = true; }
        shade = 1;
      }

      e.set(rx, yaw, rz);
      q.setFromEuler(e);
      v.set(px, py, pz);
      const thick = i === 0 ? 1 : (lay * 0.9) / SHEET;
      s.set(sc, sc * mix(1, thick, lk), sc); // only landed sheets take the pile's thickness
      m4.compose(v, q, s);
      bills.setMatrixAt(i, m4);
      const inv = 1 / s.y;
      aDef.array[i * 4] = c0 * inv; aDef.array[i * 4 + 1] = c1 * inv;
      aDef.array[i * 4 + 2] = c2 * inv; aDef.array[i * 4 + 3] = fl * inv;
    }
    bills.instanceMatrix.needsUpdate = true;
    aDef.needsUpdate = true;
    if (shadeDirty) { bills.instanceColor.needsUpdate = true; shadeDirty = false; }

    // contact shadows grow with the share of the rain that has landed
    const landed = clamp01((p - RAIN_START) / (RAIN_SPAN + FALL));
    for (let b = 0; b < N_BINS; b++) {
      const n = mix(A.counts[b], Bs.counts[b], twE) * landed;
      const k = clamp01(n / 8);
      v.set(colX(b), 0.002, 0);
      s.set((BILL_W + 0.55) * k, 1, (BILL_L + 0.7) * k);
      m4.compose(v, q.identity(), s);
      blobs.setMatrixAt(b, m4);
    }
    blobs.instanceMatrix.needsUpdate = true;

    // guides
    x95 = mix(A.x95, Bs.x95, twE);
    ruleH = mix(A.maxH, Bs.maxH, twE) + 1.1;
    rule.position.x = x95;
    rule.scale.y = ruleH;
    guide = clamp01((p - 0.62) / 0.12);
    ruleMat.opacity = clamp01((p - 0.8) / 0.08) * 0.9;
    lineMat.opacity = clamp01((p - 0.02) / 0.06) * 0.85;
    gridO = clamp01((p - 0.02) / 0.06);
    LEVELS.forEach((c, j) => {
      const vis = st => (c % st.step === 0 && c <= st.maxCount + st.step * 0.4 ? 1 : 0);
      gridVis[j] = mix(vis(A), vis(Bs), twE);
      grid[j].position.y = c * lay;
      grid[j].material.opacity = gridVis[j] * gridO * 0.22;
    });

    // the stage light gives way to the desk light as the camera comes down
    const kL = easeInOut(clamp01(t0 / 0.6));
    hemi.intensity = mix(0.07, 0.95, kL);
    key.intensity = mix(0.1, 2.7, kL);
    fill.intensity = mix(0.03, 0.45, kL);
    beam.intensity = mix(portrait ? 2600 : 9, 0, kL);
    coneMat.uniforms.uO.value = (1 - kL) * 0.14;
    cone.visible = kL < 1;

    frameCamera(t0, exit);
    renderer.render(scene, camera);
  }

  let introStart = Infinity;
  const introT = now => (now - introStart) / 2600;
  function startIntro(now) { introStart = now; }

  // Screen positions for the DOM labels (CSS px from the top of the viewport).
  const proj = new THREE.Vector3();
  function toScreen(x, y, z) {
    proj.set(x, y, z).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H };
  }
  function labels() {
    const A = slots[prevState], Bs = slots[state];
    const real = { x: mix(A.pos[0], Bs.pos[0], twE), y: mix(A.pos[1], Bs.pos[1], twE) };
    return {
      ticks: Bs.ticks.map(t => ({ ...toScreen(t.x, 0, Z_FRONT + 0.32), v: t.v })),
      axis: toScreen(-HALF, 0, Z_FRONT + 0.32),
      p95: toScreen(x95, ruleH, Z_FRONT),
      real: toScreen(real.x, real.y + 0.1, 0.15),
      grid: LEVELS.map((c, j) => ({ ...toScreen(-HALF, c * lay, Z_BACK), c, o: gridVis[j] * gridO })),
      gridTop: toScreen(-HALF, (Bs.maxCount + Bs.step * 0.6) * lay, Z_BACK),
      guide,
      D: Bs.D
    };
  }
  // Columns of the current state for the crosshair readout.
  function columns() {
    const Bs = slots[state];
    return Bs.cols.map((c, b) => {
      const top = toScreen(colX(b), c.n * lay, BILL_L / 2);
      const base = toScreen(colX(b), 0, Z_FRONT);
      return { ...c, b, x: base.x, top: top.y, base: base.y, real: b === Bs.realBin };
    });
  }

  return {
    frame, resize, setState, startIntro, labels, columns, sims,
    get state() { return state; },
    pointer(x, y) { pointer.x = x; pointer.y = y; pointer.active = true; },
    pointerOut() { pointer.active = false; },
    gust(vel) { wind = Math.max(wind, Math.min(1, Math.abs(vel) / 40)); }
  };
}
