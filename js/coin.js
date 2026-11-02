// The sign flip, as an object: a real coin of Trajan. Heads keeps an event's profit (+1), tails flips it (−1).
// The test gives every event's profit one of these, at random, a thousand times over. Scrolling
// through the step flips it; between flips it settles on a face and the readout says which.
import * as THREE from './vendor/three.module.min.js';

const clamp01 = v => Math.min(1, Math.max(0, v));

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

  // the coin: the same photographed coin of Trajan as the cards (CNG, CC BY-SA 2.5): heads keeps the sign, tails flips it
  const loader = new THREE.TextureLoader();
  const tex = (url, rot, color) => { const t = loader.load(url); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(0.5, 0.5); t.rotation = rot; return t; };
  const side = (name, rot) => new THREE.MeshStandardMaterial({ map: tex(`assets/coin-${name}.webp`, rot, true), bumpMap: tex(`assets/coin-${name}-bump.webp`, rot), bumpScale: 2.5, metalness: 0.6, roughness: 0.4 });
  const reeds = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 1024; i += 8) { g.fillStyle = '#fff'; g.fillRect(i, 0, 4, 8); g.fillStyle = '#000'; g.fillRect(i + 4, 0, 4, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
  const edge = new THREE.MeshStandardMaterial({ color: 0xbcbcbc, metalness: 0.9, roughness: 0.4, bumpMap: reeds, bumpScale: 2 });
  const R = 1.25, T = 0.16;
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 128, 1), [edge, side('obverse', Math.PI / 2), side('reverse', -Math.PI / 2)]);
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
