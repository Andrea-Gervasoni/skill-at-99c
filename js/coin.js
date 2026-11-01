// The sign flip, as an object: a heavy struck coin with +1 on one face and −1 on the other.
// The test gives every event's profit one of these, at random, a thousand times over. Scrolling
// through the step flips it; between flips it settles on a face and the readout says which.
import * as THREE from './vendor/three.module.min.js';

const clamp01 = v => Math.min(1, Math.max(0, v));

// a face: a struck rim, a fine ring of text and the sign in the middle, as colour and as relief
function face(sign, label, mirror = false) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), m = S / 2;
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  // raised rim and a sunk field
  g.beginPath(); g.arc(m, m, m * 0.98, 0, Math.PI * 2); g.fillStyle = '#d8d8d8'; g.fill();
  g.beginPath(); g.arc(m, m, m * 0.86, 0, Math.PI * 2); g.fillStyle = '#6a6a6a'; g.fill();
  g.beginPath(); g.arc(m, m, m * 0.84, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#bdbdbd'; g.stroke();
  // ring of dots and the legend
  for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; g.beginPath(); g.arc(m + Math.cos(a) * m * 0.79, m + Math.sin(a) * m * 0.79, 3.2, 0, Math.PI * 2); g.fillStyle = '#c8c8c8'; g.fill(); }
  g.save(); g.translate(m, m); g.fillStyle = '#e6e6e6'; g.font = '500 52px "Geist Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = label.split('');
  const span = 0.95 * Math.PI;
  txt.forEach((ch, i) => { const a = -Math.PI / 2 - span / 2 + (i + 0.5) * (span / txt.length); g.save(); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, -m * 0.68); g.restore(); });
  g.restore();
  // the sign, struck deep
  g.fillStyle = '#f2f2f2';
  const w = m * 0.62, t = m * 0.13;
  g.fillRect(m - w / 2, m - t / 2, w, t);
  if (sign > 0) g.fillRect(m - t / 2, m - w / 2, t, w);
  g.font = '400 120px "Geist Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e0e0e0';
  g.fillText('1', m, m + m * 0.5);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  // the underside cap is seen from behind: mirror it so its legend reads the right way
  // the caps' UVs run a quarter turn round from the screen: turn the print back upright
  tex.center.set(0.5, 0.5); tex.rotation = sign > 0 ? Math.PI / 2 : -Math.PI / 2; // the underside comes up the other way round
  if (mirror) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; }
  return tex;
}

export function createCoin({ host, phone, reduced, read }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'coin__gl';
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0.6, 11.5); // room for the rim as it turns toward the lens and for the toss
  camera.lookAt(0, -0.45, 0);

  // a bright studio for the metal to reflect
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xbdb8ac);
  const soft = (w, h, c, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p); };
  soft(7, 3, 0xffffff, -3, 5, 4); soft(3, 7, 0xfff3dc, 5, 0, 3); soft(8, 2, 0xb8c4b6, 0, -4, 3); soft(3, 6, 0xffffff, -5, 0, -3);
  scene.environment = pmrem.fromScene(studio, 0.02).texture;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 4); scene.add(key);
  const raking = new THREE.DirectionalLight(0xfff4e0, 1.6); raking.position.set(4, 0.5, 2); scene.add(raking); // low light across the face shows the relief

  // the coin: nickel silver, with a reeded edge
  const plus = face(1, 'PROFIT × +1 · SIGN FLIP'), minus = face(-1, 'PROFIT × −1 · SIGN FLIP');
  // the relief is in the bump; the field is polished and the raised parts satin, so the sign catches the light
  const metal = (bump) => new THREE.MeshStandardMaterial({ color: 0xf2ece0, map: bump, metalness: 0.92, roughness: 0.5, roughnessMap: bump, bumpMap: bump, bumpScale: 3.5 });
  const reeds = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 1024; i += 8) { g.fillStyle = '#fff'; g.fillRect(i, 0, 4, 8); g.fillStyle = '#000'; g.fillRect(i + 4, 0, 4, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
  const edge = new THREE.MeshStandardMaterial({ color: 0xcfc9bb, metalness: 1, roughness: 0.38, bumpMap: reeds, bumpScale: 2 });
  const R = 1.25, T = 0.16;
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 128, 1), [edge, metal(plus), metal(minus)]);
  // the cylinder's caps look along y; stand it up to face the camera
  const spin = new THREE.Group();
  coin.rotation.x = Math.PI / 2;
  spin.add(coin);
  scene.add(spin);
  // its shadow on the tile
  const sh = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }));
  shadow.position.set(0, -1.75, 0); shadow.rotation.x = -Math.PI / 2.4;
  scene.add(shadow);
  document.fonts.ready.then(() => {
    const [a, b] = [face(1, 'PROFIT × +1 · SIGN FLIP'), face(-1, 'PROFIT × −1 · SIGN FLIP')];
    coin.material[1].map = coin.material[1].bumpMap = coin.material[1].roughnessMap = a; coin.material[2].map = coin.material[2].bumpMap = coin.material[2].roughnessMap = b; coin.material[1].needsUpdate = coin.material[2].needsUpdate = true;
  });

  let W = 1, H = 1;
  function resize() { W = host.clientWidth; H = host.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host);
  resize();

  // visible only: the coin draws while its tile is on screen
  let onScreen = false;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(host);

  let q = 0, lastSign = 0;
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); lean.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; lean.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  host.addEventListener('pointerleave', () => { lean.tx = lean.ty = 0; });
  function frame(t) {
    if (!onScreen) return;
    if (reduced) t = 0;
    lean.x += (lean.tx - lean.x) * 0.08; lean.y += (lean.ty - lean.y) * 0.08;
    // five flips through the step; each settles on a face before the next one starts
    const flips = q * 5, k = Math.floor(flips), f = flips - k;
    const e = f < 0.55 ? (f / 0.55) * (f / 0.55) * (3 - 2 * (f / 0.55)) : 1;
    const turns = k + e;
    spin.rotation.x = turns * Math.PI + Math.sin(t * 0.8) * 0.05 + lean.y * 0.18;
    spin.rotation.y = Math.sin(t * 0.5) * 0.22 + lean.x * 0.35 - 0.28;
    spin.position.y = Math.sin(Math.min(1, f / 0.55) * Math.PI) * 0.4 * (q > 0 && q < 1 ? 1 : 0);
    shadow.material.opacity = 1 - spin.position.y * 0.9;
    renderer.render(scene, camera);
    const sign = Math.round(turns) % 2 ? -1 : 1;
    if (sign !== lastSign) { lastSign = sign; read && read(sign); }
  }
  return { frame, set q(v) { q = clamp01(v); } };
}
