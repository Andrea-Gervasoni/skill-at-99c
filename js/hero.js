// The first view, shot like a product: a bundle of one hundred real $1 notes on black, lit by a
// studio, turning slowly over its own reflection. As you scroll the camera comes closer, the
// strap slips off, the notes fan out like a deck and fly up out of the frame, to come down as
// the 1,000 histories of the next section. Everything after the idle turn follows the scroll.
import * as THREE from './vendor/three.module.min.js';
import { sheetGeometry, billMaterial, BILL_W, BILL_L, SHEET } from './scene.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (h, a, b) => ease(clamp01((h - a) / (b - a)));
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

const N = 100, LAYER = 0.0062, THICK = 0.2; // a bundle as a bundle is: thin notes, a low brick

export function createHero({ host, billTex, normalTex, phone, reduced, type = null }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__gl';
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  // a dark studio with three soft boxes, baked into an environment: soft sheen on paper and edges
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x050505);
  const soft = (w, h, c, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m); };
  soft(6, 3, 0xffffff, -4, 6, 4); soft(4, 6, 0xd8dde6, 6, 2, -3); soft(4, 6, 0xf4efe4, -6, 2, -4);
  scene.environment = pmrem.fromScene(studio, 0.03).texture;
  scene.environmentIntensity = 0.9;

  const key = new THREE.DirectionalLight(0xfff4e2, 2.3); key.position.set(-3, 6, 4); scene.add(key);
  const rimA = new THREE.DirectionalLight(0xdfe7ff, 2.4); rimA.position.set(4, 2.5, -5); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xffffff, 1.6); rimB.position.set(-5, 1.5, -4); scene.add(rimB);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.18));

  // the notes, the same sheets as everywhere else on the page
  const uniforms = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(BILL_W, BILL_L) } };
  const geo = sheetGeometry();
  const aDef = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aPhase = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  const aTint = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  for (let i = 0; i < N; i++) aPhase.array[i] = hash(i, 4) * 6.283;
  geo.setAttribute('aDef', aDef); geo.setAttribute('aPhase', aPhase); geo.setAttribute('aTint', aTint);
  const notes = new THREE.InstancedMesh(geo, billMaterial(billTex, normalTex, uniforms), N);
  notes.frustumCulled = false;
  notes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const rig = new THREE.Group();
  rig.add(notes);
  scene.add(rig);

  // the floor is the page's own lit backdrop (CSS); the canvas adds a soft contact shadow under the bundle
  // (no tone mapping on either, so the edges match the CSS ink behind the canvas exactly)
  const radial = (stops) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => r.addColorStop(o, col));
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(BILL_L * 1.5, BILL_W * 1.9), new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(0,0,0,.85)'], [0.6, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, toneMapped: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.001;
  scene.add(contact);

  // the strap: a paper band printed in the mono face
  const st = document.createElement('canvas'); st.width = 512; st.height = 1024;
  const sg = st.getContext('2d');
  const paintStrap = () => {
    sg.fillStyle = '#EDEBE3'; sg.fillRect(0, 0, 512, 1024);
    sg.save(); sg.translate(256, 512); sg.rotate(-Math.PI / 2);
    sg.fillStyle = '#141412'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.font = '400 150px "Geist Mono", monospace'; sg.fillText('$100', 0, -40);
    sg.font = '400 56px "Geist Mono", monospace'; sg.fillText('100 × $1', 0, 90);
    sg.restore();
  };
  paintStrap();
  const strapTex = new THREE.CanvasTexture(st); strapTex.colorSpace = THREE.SRGBColorSpace; strapTex.anisotropy = 8;
  const strapPlain = new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.7, transparent: true });
  const strapTop = new THREE.MeshStandardMaterial({ map: strapTex, roughness: 0.7, transparent: true });
  const strap = new THREE.Mesh(new THREE.BoxGeometry(BILL_W + 0.035, 1, 0.42), [strapPlain, strapPlain, strapTop, strapPlain, strapPlain, strapPlain]);
  rig.add(strap);
  document.fonts.ready.then(() => { paintStrap(); strapTex.needsUpdate = true; });

  // ---- sizing: the bundle sits low in the frame; the headline has the top ----
  let W = 1, H = 1, portrait = false, dist0 = 8;
  function resize() {
    W = host.clientWidth; H = host.clientHeight;
    portrait = W / H < 0.9;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    dist0 = (BILL_L * (portrait ? 1.45 : 2.25)) / 2 / Math.tan(hf / 2);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // ---- the headline as an object: the real glyphs of the serif, extruded, bevelled and lit by the
  // same studio as the notes. It hangs in front of the camera, above the bundle, never behind it ----
  scene.add(camera);
  const typeG = new THREE.Group();
  camera.add(typeG);
  const typeMats = [];
  const lines3d = [];
  if (type) {
    const mats = [
      new THREE.MeshPhysicalMaterial({ color: 0xefece4, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.18, transparent: true }),
      new THREE.MeshPhysicalMaterial({ color: 0x74b483, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.22, transparent: true })
    ];
    type.forEach((ln, k) => {
      const sp = new THREE.ShapePath();
      for (const c of ln.c) {
        if (c[0] === 'M') sp.moveTo(c[1], c[2]);
        else if (c[0] === 'L') sp.lineTo(c[1], c[2]);
        else if (c[0] === 'Q') sp.quadraticCurveTo(c[1], c[2], c[3], c[4]);
        else if (c[0] === 'C') sp.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
      }
      // contours into shapes: the orientation of the biggest contour is the outside; every other
      // contour of the opposite turn is a hole in the smallest outside that holds it
      const subs = sp.subPaths.map(pth => { const pts = pth.getPoints(phone ? 5 : 8); return { pts, a: THREE.ShapeUtils.area(pts) }; }).filter(c => c.pts.length > 2);
      const outSign = Math.sign(subs.reduce((m, c) => (Math.abs(c.a) > Math.abs(m.a) ? c : m), subs[0]).a);
      const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a1 = poly[i], b1 = poly[j]; if ((a1.y > p.y) !== (b1.y > p.y) && p.x < ((b1.x - a1.x) * (p.y - a1.y)) / (b1.y - a1.y) + a1.x) c = !c; } return c; };
      const outs = subs.filter(c => Math.sign(c.a) === outSign).map(c => ({ c, shape: new THREE.Shape(c.pts) }));
      subs.filter(c => Math.sign(c.a) !== outSign).forEach(hole => {
        const host = outs.filter(o => inside(hole.pts[0], o.c.pts)).sort((x, y) => Math.abs(x.c.a) - Math.abs(y.c.a))[0];
        if (host) host.shape.holes.push(new THREE.Path(hole.pts));
      });
      const shapes = outs.map(o => o.shape);
      const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.008, bevelSegments: 3, curveSegments: phone ? 5 : 8 });
      g.computeBoundingBox();
      const bb = g.boundingBox;
      g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -0.05);
      const m = new THREE.Mesh(g, mats[k]);
      typeG.add(m);
      lines3d.push({ mesh: m, w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y });
    });
    typeMats.push(...mats);
  }
  const TZ = 6; // the headline's distance in front of the lens
  function layoutType() {
    if (!lines3d.length) return;
    const vh = 2 * TZ * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), vw = vh * camera.aspect;
    // the first line takes 80% of the width (wrapped to fit on a phone), the second is set smaller
    const k = Math.min((vw * (portrait ? 0.94 : 0.8)) / lines3d[0].w, (vh * (portrait ? 0.11 : 0.16)) / 1);
    lines3d[0].mesh.scale.setScalar(k);
    lines3d[1].mesh.scale.setScalar(k * 0.5);
    lines3d[0].mesh.position.y = vh * (portrait ? 0.33 : 0.31);
    lines3d[1].mesh.position.y = vh * (portrait ? 0.33 : 0.31) - k * 0.95;
    typeG.position.set(0, 0, -TZ);
  }
  let typeIn = null;
  new ResizeObserver(() => layoutType()).observe(host);
  layoutType();

  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!phone) addEventListener('pointermove', ev => { lean.tx = (ev.clientX / innerWidth - 0.5) * 2; lean.ty = (ev.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3(1, THICK, 1);
  const target = new THREE.Vector3();
  const H0 = N * LAYER, R = (BILL_L / 2) * 0.92;

  // h: progress through the pinned first view (0 to 1); t: seconds
  function frame(h, t) {
    if (reduced) t = 0;
    uniforms.uTime.value = t;
    lean.x += (lean.tx - lean.x) * 0.05; lean.y += (lean.ty - lean.y) * 0.05;
    const come = seg(h, 0, 0.42);      // the camera comes closer and a little higher
    const loose = seg(h, 0.16, 0.34);  // the strap slips off
    const fan = seg(h, 0.3, 0.62);     // the notes open like a deck
    const fly = clamp01((h - 0.58) / 0.42);

    // a slow turn on the turntable while you look, settling to a three-quarter view as you scroll
    rig.rotation.y = mix(Math.sin(t * 0.22) * 0.55 + lean.x * 0.15, -0.5, come);

    const el = mix(0.36, 0.62, come) + lean.y * 0.04;
    const d = dist0 * mix(1, 0.7, come) * (1 + fan * 0.35);
    target.set(0, mix(portrait ? 1.05 : 0.7, 0.35, come), 0);
    camera.position.set(0, target.y + Math.sin(el) * d, Math.cos(el) * d);
    camera.lookAt(target);

    // the headline: rises into place once, leans toward the hand, and lifts away as the camera comes in
    if (lines3d.length) {
      const r = typeIn == null ? 0 : reduced ? 1 : clamp01((t - typeIn) / 1.6);
      const out = seg(h, 0.04, 0.24);
      lines3d.forEach((L3, k) => {
        const rk = ease(clamp01(r * 1.25 - k * 0.25));
        L3.mesh.rotation.x = (1 - rk) * 1.1 - lean.y * 0.12 + Math.sin(t * 0.5 + k) * 0.02;
        L3.mesh.rotation.y = lean.x * 0.18 + Math.sin(t * 0.33 + k * 1.7) * 0.03;
        L3.mesh.position.z = (1 - rk) * -2.5;
        typeMats[k].opacity = rk * (1 - out);
        L3.mesh.visible = typeMats[k].opacity > 0.01;
      });
      typeG.position.y = out * 1.4;
    }

    for (let j = 0; j < N; j++) {
      // the fan: every note turns about the same end of the deck, the top ones furthest
      const a = (j / (N - 1) - 0.5) * 1.6 * fan;
      let x = -R + Math.cos(a) * R, z = Math.sin(a) * R + (hash(j, 2) - 0.5) * 0.02;
      let y = SHEET * THICK / 2 + j * LAYER * (1 + fan * 1.4);
      const yaw = Math.PI / 2 + (hash(j, 3) - 0.5) * 0.03 + a;
      // then they leave, the top of the deck first, tumbling up out of the light
      const k = clamp01((fly - (1 - j / N) * 0.45) / 0.55), kk = k * k;
      y += kk * 16;
      x += kk * (hash(j, 7) - 0.5) * 6;
      z += kk * (hash(j, 8) - 0.5) * 4;
      e.set(kk * (hash(j, 9) - 0.5) * 5, yaw, kk * (hash(j, 10) - 0.5) * 4);
      q.setFromEuler(e);
      v.set(x, y, z);
      m4.compose(v, q, s);
      notes.setMatrixAt(j, m4);
      // a breath of curl in the open deck and in the air
      aDef.array[j * 4] = (0.03 * fan + 0.12 * k) / THICK; aDef.array[j * 4 + 1] = 0; aDef.array[j * 4 + 2] = 0; aDef.array[j * 4 + 3] = (0.08 * k) / THICK;
    }
    notes.instanceMatrix.needsUpdate = true;
    aDef.needsUpdate = true;

    // the strap rises off the deck and fades
    const hb = H0 + 0.02;
    strap.scale.set(1, hb, 1);
    strap.rotation.set(0, Math.PI / 2, loose * 0.6);
    strap.position.set(loose * 0.9, hb / 2 + loose * 0.9, loose * 0.4);
    strapPlain.opacity = strapTop.opacity = 1 - seg(h, 0.18, 0.28);
    strap.visible = loose < 0.999;

    // the shadow follows the bundle round and goes as the notes leave the floor
    contact.rotation.z = rig.rotation.y; contact.material.opacity = 1 - seg(h, 0.55, 0.8);
    renderer.render(scene, camera);
  }
  // ---- the technical drawing: construction lines, handles and dimensions around the bundle ----
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hero__draw'); svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);
  const pr = new THREE.Vector3();
  const P = (x, y, z) => { pr.set(x, y, z).applyMatrix4(rig.matrixWorld).project(camera); return [(pr.x * 0.5 + 0.5) * W, (-pr.y * 0.5 + 0.5) * H]; };
  const f = n => n.toFixed(1);
  const ext = (a, b, k) => [a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k];
  const dimLine = (a, b, off, label, cls = '') => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * off, ny = dx / l * off;
    const A = [a[0] + nx, a[1] + ny], B = [b[0] + nx, b[1] + ny], m = [(A[0] + B[0]) / 2 + nx * 0.9, (A[1] + B[1]) / 2 + ny * 0.9];
    return `<line class="d-ext" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(A[0] + nx * 0.3)}" y2="${f(A[1] + ny * 0.3)}"/><line class="d-ext" x1="${f(b[0])}" y1="${f(b[1])}" x2="${f(B[0] + nx * 0.3)}" y2="${f(B[1] + ny * 0.3)}"/>` +
      `<line class="d-dim" x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}"/><circle class="d-end" cx="${f(A[0])}" cy="${f(A[1])}" r="2.2"/><circle class="d-end" cx="${f(B[0])}" cy="${f(B[1])}" r="2.2"/>` +
      `<text class="d-lab ${cls}" x="${f(Math.min(W - 44, Math.max(44, m[0])))}" y="${f(m[1] + 4)}" text-anchor="middle">${label}</text>`;
  };
  const hx = BILL_L / 2, hz = BILL_W / 2;
  function draw(o) {
    if (o <= 0.01) { if (svg.style.opacity !== '0') svg.style.opacity = '0'; return; }
    svg.style.opacity = String(o);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const top = N * LAYER;
    // the footprint and the top face, in the bundle's own frame
    const b0 = P(-hx, 0, hz), b1 = P(hx, 0, hz), b2 = P(hx, 0, -hz);
    const t0 = P(-hx, top, hz), t1 = P(hx, top, hz), t2 = P(hx, top, -hz), t3 = P(-hx, top, -hz);
    let out = '';
    // the turntable: a dashed ring on the floor, and a smaller one inside
    for (const [r, cls] of [[hx * 1.32, 'd-ring'], [hx * 0.62, 'd-ring d-ring--in']]) {
      let d = '';
      for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2; pr.set(Math.cos(a) * r, 0, Math.sin(a) * r).project(camera); d += `${k ? 'L' : 'M'}${f((pr.x * 0.5 + 0.5) * W)},${f((-pr.y * 0.5 + 0.5) * H)}`; }
      out += `<path class="${cls}" d="${d}"/>`;
    }
    // construction lines through the top face, run past the corners
    [[t0, t1], [t1, t2], [t2, t3], [t3, t0]].forEach(([a, b]) => { const A = ext(a, b, 0.35), B = ext(b, a, 0.35); out += `<line class="d-con" x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}"/>`; });
    // dimensions: length along the front, depth along the side, height of the stack
    out += dimLine(b0, b1, 26, '6.14 in');
    out += dimLine(b1, b2, 26, '2.61 in');
    out += dimLine(t0, b0, 26, '100 notes', 'd-lab--green');
    // handles at the corners and the midpoints of the top face
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    [t0, t1, t2, t3].forEach(p => { out += `<rect class="d-h" x="${f(p[0] - 4)}" y="${f(p[1] - 4)}" width="8" height="8"/>`; });
    [mid(t0, t1), mid(t1, t2), mid(t2, t3), mid(t3, t0)].forEach(p => { out += `<circle class="d-m" cx="${f(p[0])}" cy="${f(p[1])}" r="3"/>`; });
    svg.innerHTML = out;
  }
  return { frame, resize, draw, startType(t) { typeIn = t; } };
}
