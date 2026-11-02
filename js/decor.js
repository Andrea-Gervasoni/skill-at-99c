// Margin objects: the things of the story, in 3D, living in the open bands between sections.
// $1 notes fly across as the page moves, a strapped bundle and a rolled note turn beside the
// titles, coins of Trajan rain past, and dice tumble for luck. One transparent layer over the
// page; every object is pinned to a section, so it moves with the reading. Wide screens only.
// Nothing here carries information, and nothing rests on a chart or a paragraph.
import * as THREE from './vendor/three.module.min.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
const BILL_H = 446 / 1024;

// side: where across (0 left … 1 right); at: how far from the section top, in screen heights
// (negative = above it, in the gap with the previous section); size in px at 1440 wide
const PLACES = [
  { id: 'short', kind: 'bundle', side: 0.1, at: 0.14, size: 270, tilt: 0.3 },
  { id: 'short', kind: 'rain', side: 0.9, at: 0.05, size: 120 },
  { id: 'short', kind: 'flight', at: 0.88, size: 330, dir: 1 },
  { id: 'basics', kind: 'stack', side: 0.88, at: 0.06, size: 200, tilt: 0.2 },
  { id: 'basics', kind: 'die2', side: 0.12, at: 0.2, size: 120, tilt: 0.3 },
  { id: 'method', kind: 'roll', side: 0.86, at: -0.02, size: 280, tilt: -0.5 },
  { id: 'method', kind: 'coin', side: 0.12, at: 0.22, size: 170, tilt: 0.4 },
  { id: 'method', kind: 'flight', at: -0.16, size: 300, dir: -1 },
  { id: 'why', kind: 'coin', side: 0.9, at: -0.04, size: 160, tilt: -0.4 },
  { id: 'why', kind: 'bundle', side: 0.78, at: 0.13, size: 230, tilt: -0.3 },
  { id: 'sensitivity', kind: 'die2', side: 0.88, at: -0.04, size: 130, tilt: -0.2 },
  { id: 'sensitivity', kind: 'stack', side: 0.1, at: 0.06, size: 190, tilt: -0.2 },
  { id: 'table1', kind: 'flight', at: -0.12, size: 320, dir: 1 },
  { id: 'table1', kind: 'coin', side: 0.86, at: 0.08, size: 180, tilt: -0.3 },
  { id: 'results', kind: 'roll', side: 0.12, at: -0.04, size: 260, tilt: 0.5 },
  { id: 'results', kind: 'stack', side: 0.88, at: 0.05, size: 180, tilt: 0.1 },
  { id: 'claims', kind: 'bundle', side: 0.86, at: 0.04, size: 240, tilt: 0.2 },
  { id: 'claims', kind: 'die2', side: 0.12, at: 0.2, size: 120, tilt: 0.4 },
  { id: 'next', kind: 'flight', at: -0.14, size: 320, dir: -1 },
  { id: 'next', kind: 'stack', side: 0.86, at: 0.08, size: 210, tilt: 0.3 }
];

export function createDecor({ billTex, phone, reduced }) {
  if (!matchMedia('(min-width: 1101px)').matches) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'decor'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  const FOV = 22;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xcfcbc1);
  const soft = (w, h, c, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p); };
  soft(8, 3, 0xffffff, -3, 6, 4); soft(3, 7, 0xfff4e2, 6, 1, 3); soft(8, 3, 0xb9c4b6, 0, -4, 4);
  scene.environment = pmrem.fromScene(studio, 0.03).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 0.6));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.3); key.position.set(-1, 2, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8f0ff, 0.8); rim.position.set(2, -1, -2); scene.add(rim);

  // ---------- materials ----------
  const loader = new THREE.TextureLoader();
  const tex = (url, rot, color) => { const t = loader.load(url); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(0.5, 0.5); t.rotation = rot; return t; };
  const side = (name, rot) => new THREE.MeshStandardMaterial({ map: tex(`assets/coin-${name}.webp`, rot, true), bumpMap: tex(`assets/coin-${name}-bump.webp`, rot), bumpScale: 2.5, metalness: 0.6, roughness: 0.4 });
  const reeds = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 512; i += 6) { g.fillStyle = '#fff'; g.fillRect(i, 0, 3, 8); g.fillStyle = '#000'; g.fillRect(i + 3, 0, 3, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
  const coinMats = [new THREE.MeshStandardMaterial({ color: 0xbcbcbc, metalness: 0.9, roughness: 0.4, bumpMap: reeds, bumpScale: 1.5 }), side('obverse', Math.PI / 2), side('reverse', -Math.PI / 2)];
  const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 72);
  const billMat = new THREE.MeshStandardMaterial({ map: billTex, side: THREE.DoubleSide, roughness: 0.85 });
  // paper edges: the side of a bundle is a hundred sheets, slightly uneven
  const edgeTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d'); for (let y = 0; y < 256; y += 2) { const v = 214 + Math.floor(Math.random() * 26); g.fillStyle = `rgb(${v},${v - 4},${v - 14})`; g.fillRect(0, y, 8, 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xebe7dc, roughness: 0.8 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x355E3B, roughness: 0.55 });

  // ---------- pieces ----------
  const coinMesh = () => { const m = new THREE.Mesh(coinGeo, coinMats); m.rotation.x = Math.PI / 2; return m; };
  const coin = () => { const g = new THREE.Group(); g.add(coinMesh()); return g; };
  const stack = () => {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(coinGeo, coinMats); m.position.set(Math.sin(i * 2.1) * 0.035, i * 0.085, Math.cos(i * 1.7) * 0.035); m.rotation.y = i * 0.9; g.add(m); }
    const lean = new THREE.Mesh(coinGeo, coinMats); lean.position.set(0.86, 0.3, 0.1); lean.rotation.set(0, 0, 0.62); g.add(lean); // one coin leaning against the pile, its rim on the table
    const flat = new THREE.Mesh(coinGeo, coinMats); flat.position.set(-0.62, 0, 0.55); flat.rotation.y = 2; g.add(flat);
    g.position.y = -0.4;
    const h = new THREE.Group(); h.add(g); return h;
  };
  // a strapped bundle of notes: printed faces, a hundred paper edges, a band round the middle
  const bundle = () => {
    const T = 0.16;
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, T, BILL_H), [edgeMat, edgeMat, billMat, billMat, edgeMat, edgeMat]);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.2, T + 0.012, BILL_H + 0.012), strapMat);
    const g = new THREE.Group(); g.add(box, strap);
    const h = new THREE.Group(); h.add(g); return h;
  };
  // a rolled note held by a green band, its loose end lifting
  const roll = () => {
    const g = new THREE.Group();
    const wrapTex = billTex.clone(); wrapTex.needsUpdate = true; wrapTex.wrapS = THREE.RepeatWrapping; wrapTex.repeat.set(0.45, 1);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, BILL_H, 48, 1, true), new THREE.MeshStandardMaterial({ map: wrapTex, side: THREE.DoubleSide, roughness: 0.85 }));
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, BILL_H * 0.998, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9d3c3, side: THREE.BackSide, roughness: 0.9 }));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.009, 12, 48), bandMat); band.rotation.x = Math.PI / 2;
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.22, BILL_H, 12, 1), billMat); flap.position.set(0.11, 0, 0.075);
    const fp = flap.geometry.attributes.position; for (let j = 0; j < fp.count; j++) { const x = fp.getX(j); fp.setZ(j, -x * x * 1.4); } flap.geometry.computeVertexNormals();
    g.add(body, inner, band, flap);
    g.rotation.z = Math.PI / 2; g.scale.setScalar(1.6);
    const h = new THREE.Group(); h.add(g); return h;
  };
  // a $1 note that curls as it flies
  const bill = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, BILL_H, 48, 6), billMat); m.userData.base = m.geometry.attributes.position.array.slice(); const g = new THREE.Group(); g.add(m); return g; };
  // dice with rounded corners and sunk pips; the one is green
  const dieGeo = (() => {
    const g = new THREE.BoxGeometry(1, 1, 1, 10, 10, 10), p = g.attributes.position, r = 0.14, h = 0.5 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z)));
      v.sub(c); if (v.lengthSq() > 0) v.setLength(r); v.add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  })();
  const pips = n => {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    g.fillStyle = '#EAE5D8'; g.fillRect(0, 0, S, S);
    const at = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] }[n];
    at.forEach(([x, y]) => { const gr = g.createRadialGradient(x * S - 4, y * S - 4, 2, x * S, y * S, S * 0.085); gr.addColorStop(0, '#3a3936'); gr.addColorStop(1, n === 1 ? '#355E3B' : '#141412'); g.fillStyle = gr; g.beginPath(); g.arc(x * S, y * S, S * (n === 1 ? 0.1 : 0.075), 0, Math.PI * 2); g.fill(); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const dieMats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: pips(n), roughness: 0.32 }));
  const die2 = () => {
    const g = new THREE.Group();
    const a = new THREE.Mesh(dieGeo, dieMats), b = new THREE.Mesh(dieGeo, dieMats);
    a.position.set(-0.62, 0.1, 0); b.position.set(0.62, -0.15, 0.2); b.scale.setScalar(0.92);
    g.add(a, b); return g;
  };
  const rain = () => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) g.add(coinMesh()); return g; };
  const MAKE = { coin, stack, bundle, roll, die2, rain, flight: bill };

  const items = PLACES.map((pl, i) => {
    const el = document.getElementById(pl.id);
    if (!el) return null;
    const obj = MAKE[pl.kind]();
    obj.visible = false;
    scene.add(obj);
    return { ...pl, el, obj, phase: i * 1.37 };
  }).filter(Boolean);

  let W = 1, H = 1, k = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    k = Math.min(1.15, Math.max(0.75, W / 1440)); // sizes follow the width
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))); // one unit is one px on z = 0
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const place = (o, x, y, z = 0) => o.position.set(x - W / 2, H / 2 - y, z);
  let drawn = true;
  function frame(time, scrollY) {
    let any = false;
    const t = reduced ? 0 : time;
    for (const it of items) {
      const top = it.el.getBoundingClientRect().top;
      const y0 = top + it.at * H;
      const size = it.size * k;
      // how far the anchor has travelled through the screen: 0 entering at the bottom, 1 leaving at the top
      const q = (H - y0) / (H + size);
      const on = q > -0.15 && q < 1.15;
      it.obj.visible = on;
      if (!on) continue;
      any = true;
      const spin = scrollY * 0.0018;
      const enter = reduced ? 1 : ease(q / 0.35);
      if (it.kind === 'flight') {
        // a note crossing the band between two sections, curling, turning, drifting down
        const p = clamp01(q * 1.15 - 0.05);
        const x = it.dir > 0 ? -0.15 * W + p * 1.3 * W : 1.15 * W - p * 1.3 * W;
        place(it.obj, x, y0 + Math.sin(p * Math.PI * 1.5) * 50 * k, 60);
        it.obj.scale.setScalar(size);
        it.obj.rotation.set(0.5 + Math.sin(p * 5 + it.phase) * 0.4, Math.sin(p * 3) * 0.7, it.dir * (p * 2.4 - 0.6));
        const m = it.obj.children[0], pos = m.geometry.attributes.position, b = m.userData.base;
        for (let j = 0; j < pos.count; j++) { const bx = b[j * 3], by = b[j * 3 + 1]; pos.setZ(j, Math.sin(bx * 4 + p * 9 + it.phase) * 0.07 + bx * bx * 0.3 * Math.sin(p * 4) + by * by * 0.4); }
        pos.needsUpdate = true; m.geometry.computeVertexNormals();
        continue;
      }
      const half = size * 0.6 + 16;
      const x = Math.min(W - half, Math.max(half, it.side * W));
      const bob = Math.sin(t * 0.7 + it.phase) * 8 * k;
      if (it.kind === 'rain') {
        // coins tumbling down the margin while the section goes by
        it.obj.children.forEach((c, j) => {
          const fall = ((q * 1.4 + j / 6 + it.phase * 0.1) % 1 + 1) % 1;
          c.position.set(Math.sin(j * 2.3 + it.phase) * 0.55, (0.5 - fall) * (H * 0.7) / size, Math.cos(j * 1.3) * 0.4);
          c.rotation.set(fall * 9 + j, fall * 5 + j * 2, fall * 3);
          c.scale.setScalar(0.75 + 0.25 * Math.sin(j * 1.7) ** 2);
        });
        place(it.obj, x, Math.max(H * 0.35, Math.min(H * 0.65, y0 + H * 0.3)));
        it.obj.scale.setScalar(size);
        continue;
      }
      place(it.obj, x, y0 + bob + (1 - enter) * 60);
      it.obj.scale.setScalar(size * (0.75 + 0.25 * enter));
      if (it.kind === 'coin') it.obj.rotation.set(it.tilt * 0.6 + Math.sin(t * 0.4) * 0.1, spin * 2.2 + it.phase + t * 0.25, it.tilt * 0.3);
      else if (it.kind === 'stack') it.obj.rotation.set(0.5, spin * 0.8 + it.phase + t * 0.12, it.tilt);
      else if (it.kind === 'bundle') it.obj.rotation.set(0.75 + it.tilt * 0.3, spin * 0.9 + it.phase + t * 0.1, 0.35 + it.tilt);
      else if (it.kind === 'roll') it.obj.rotation.set(0.4 + Math.sin(t * 0.5) * 0.1, spin * 1.1 + it.phase, it.tilt);
      else if (it.kind === 'die2') {
        it.obj.children[0].rotation.set(spin * 1.4 + it.phase, spin * 0.9, t * 0.2);
        it.obj.children[1].rotation.set(-spin * 1.1, spin * 1.6 + 1, it.phase - t * 0.15);
        it.obj.rotation.set(0, 0, it.tilt * 0.3);
      }
    }
    if (any || drawn) { renderer.render(scene, camera); drawn = any; }
  }
  return { frame };
}
