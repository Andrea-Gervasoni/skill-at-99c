// Start here: a deck of rounded cards turned by the scroll, next to one 3D object that
// rearranges itself for each card. Card 5 lets the reader flip the coins by hand.
import { t, lang } from './i18n.js';
import { createDeck3D, REAL } from './deck3d.js';

const REAL_TOT = REAL.reduce((a, b) => a + b, 0);
const cents = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '¢';
const fmtInt = n => n.toLocaleString('en-US');
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

export function initBasics({ gsap, phone, reduced }) {
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const pin = deck.querySelector('.deck__pin');
  const cards = [...deck.querySelectorAll('.card')];
  const bar = deck.querySelector('[data-deck-bar]');
  const n = cards.length;

  let world = null;
  try {
    world = createDeck3D({ canvas: deck.querySelector('[data-deck-gl]'), labsEl: deck.querySelector('[data-deck-labs]'), box: deck.querySelector('[data-deck-box]'), phone, reduced });
  } catch (e) { deck.classList.add('is-flat'); } // no WebGL: the cards still read on their own
  const resize = () => world && world.resize();
  new ResizeObserver(resize).observe(pin);
  resize();

  // ---------- the coin, by hand ----------
  const fig = deck.querySelector('[data-flip]');
  const totEl = fig.querySelector('[data-flip-tot]'), tally = fig.querySelector('[data-flip-tally]');
  fig.querySelector('[data-flip-realtot]').textContent = cents(REAL_TOT);
  let made = 0, asGood = 0;
  const draw = () => REAL.map(() => (Math.random() < 0.5 ? 1 : -1));
  const sum = s => s.reduce((a, x, i) => a + x * REAL[i], 0);
  const say = () => {
    const share = made ? ((asGood / made) * 100).toFixed(1) : '0.0';
    tally.textContent = lang === 'it'
      ? `Storie fatte: ${fmtInt(made)} · arrivano a ${cents(REAL_TOT)} o più: ${fmtInt(asGood)} (${share}%)`
      : `Histories so far: ${fmtInt(made)} · reach ${cents(REAL_TOT)} or more: ${fmtInt(asGood)} (${share}%)`;
  };
  const show = s => {
    const tot = sum(s);
    totEl.textContent = cents(tot);
    if (world) {
      world.flip(s, performance.now() / 1000);
      world.setLabel('tot', `${t('this history:')} ${cents(tot)}`);
      // each coin's value changes once it has landed
      s.forEach((x, i) => setTimeout(() => { const v = x * REAL[i]; world.setLabel('e' + i, cents(v), v > 0 ? 'is-pos' : 'is-neg'); }, reduced ? 0 : 700 + i * 70));
    }
  };
  fig.querySelector('[data-flip-one]').addEventListener('click', () => {
    const s = draw(); show(s);
    made++; if (sum(s) >= REAL_TOT) asGood++;
    say();
  });
  fig.querySelector('[data-flip-all]').addEventListener('click', () => {
    let s;
    for (let i = 0; i < 1000; i++) { s = draw(); made++; if (sum(s) >= REAL_TOT) asGood++; }
    show(s); say();
  });
  fig.querySelector('[data-flip-one]').textContent = t('Flip the coins');
  fig.querySelector('[data-flip-all]').textContent = t('Make 1,000');

  // ---------- the deck, turned by the scroll ----------
  // each card holds still for the first half of its stretch of scroll, then flies off
  let onScreen = false, lastKey = '';
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(deck);
  function place() {
    const r = deck.getBoundingClientRect(), run = Math.max(1, r.height - pin.offsetHeight);
    const raw = clamp01(-r.top / run) * (n - 0.6);
    const k = Math.floor(raw), f = raw - k;
    const p = Math.min(n - 1, k + (reduced ? (f > 0.55 ? 1 : 0) : smooth((f - 0.45) / 0.5)));
    const key = p.toFixed(4);
    if (key !== lastKey) {
      lastKey = key;
      cards.forEach((c, i) => {
        const d = p - i;
        if (d >= 0) {
          const e = Math.min(d, 1);
          c.style.transform = `translate3d(${-e * 14}%, ${-e * 150}%, 0) rotate(${-e * 9}deg)`;
          c.style.opacity = String(1 - smooth(e / 0.75));
          c.style.setProperty('--vis', '1');
        } else {
          const e = Math.min(-d, 3);
          c.style.transform = `translate3d(0, ${e * 16}px, 0) scale(${1 - e * 0.045})`;
          c.style.opacity = String(-d < 2.6 ? 1 : clamp01(3.6 + d));
          c.style.setProperty('--vis', String(1 - smooth(-d * 1.4)));
        }
        c.style.zIndex = String(n - i); // the card in front paints over the ones waiting behind it
        const front = Math.abs(d) < 0.5;
        c.style.pointerEvents = front ? 'auto' : 'none';
        c.classList.toggle('is-front', front);
      });
      bar.style.transform = `scaleX(${(p + 1) / n})`;
    }
    const at = Math.min(n - 1, Math.round(p));
    if (world) world.setScene(cards[at].dataset.scene, performance.now() / 1000);
  }
  gsap.ticker.add(() => {
    if (!onScreen) return;
    place();
    if (world) world.render(performance.now() / 1000);
  });
  place();
}
