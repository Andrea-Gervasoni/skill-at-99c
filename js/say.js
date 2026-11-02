// The important sentences, lit one word at a time as they cross the screen.

const clamp01 = v => Math.min(1, Math.max(0, v));

// split a block into words, keeping inline pieces (a number, a link) whole
function words(el) {
  const out = [];
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span'); w.className = 'w'; w.textContent = part;
        frag.append(w); out.push(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) { n.classList.add('w'); out.push(n); }
  });
  return out;
}


export function initSay({ gsap, reduced }) {
  const blocks = [...document.querySelectorAll('[data-say], .sec__dek, .verdict__title')].map(el => {
    el.setAttribute('data-say', '');
    return { el, ws: words(el), lit: -1 };
  });
  if (!reduced) {
    gsap.ticker.add(() => {
      const vh = innerHeight;
      for (const b of blocks) {
        const r = b.el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        // lit from when the block enters the lower part of the screen until it is past the middle
        const p = clamp01((vh * 0.92 - r.top) / (vh * 0.5 + r.height * 0.6));
        const n = Math.round(p * b.ws.length);
        if (n === b.lit) continue;
        b.lit = n;
        b.ws.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      }
    });
  }

}
