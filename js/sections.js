// Sections 3–8: research charts built from data/site_data.json.
// Every entrance is a pure function of a ScrollTrigger progress, so it rewinds on the way up.
import { bundles, field, compare } from './minis.js';
import { createCoin } from './coin.js';
import { createHero } from './hero.js';
import { t, tr, trSvg, lang } from './i18n.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fmtInt = n => n.toLocaleString('en-US');
const pct = (v, d = 1) => `${v.toFixed(d)}%`;
// Wilson 95% interval for a share of n, in percent
export function wilson(sharePct, n, z = 1.96) {
  const p = sharePct / 100, d = 1 + z * z / n, c = p + z * z / (2 * n);
  const r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [100 * (c - r) / d, 100 * (c + r) / d];
}
const cents = s => s.replace('c', '¢').replace('>=', '≥').replace('-', '–');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nums = s => s.replace(/(\d[\d,.%¢–]*)/g, '<span class="num">$1</span>'); // every figure in the mono face

// Links for section 8. Empty href = not published yet: shown as plain text.
const LINKS = [
  { label: 'Code on GitHub', href: '' },
  { label: 'Video walkthrough (Loom)', href: '' },
  { label: 'Paper: Gómez-Cram, Guo, Jensen and Kung (2026)', href: '' },
  { label: 'Data: SII-WANGZJ/Polymarket_data', href: 'https://huggingface.co/datasets/SII-WANGZJ/Polymarket_data' }
];

const CLAIMS = [
  { group: 'Supported', items: [
    ['Price drives the signal.', 'The skilled share rises from 11.4% below 80¢ to 87.3% at 99¢ or more, while the anti-skilled share falls to zero.'],
    ['The mechanism holds in simulation.', 'A trader with no edge who pays 99¢ over 20 events is flagged skilled 82.7% of the time.'],
    ['Table 1 does not replicate.', 'Without a price cap, these data give more skilled than anti-skilled accounts, the opposite of the paper.']
  ] },
  { group: 'Not supported', items: [
    ['That the paper is wrong.', 'The test is applied as published. The problem appears when payoffs are this skewed.'],
    ['That no 99¢ buyer has skill.', 'Some buy when the outcome is already known. The test cannot separate that from skew.'],
    ['That the simulation is the market.', 'Real accounts mix prices and stakes; the simulation uses one price and a unit stake.']
  ] },
  { group: 'Limits', items: [
    ['Two months of data.', 'The 2023–2025 run failed in DuckDB for lack of memory, even at 12 GB.'],
    ['5,000 accounts per window.', 'Standard error is about 0.55 points at a 14% share.'],
    ['December sits inside Nov–Dec.', 'The two windows are not independent samples.'],
    ['218,781 duplicate rows kept.', 'They are 11.8% of the rows.'],
    ['232 market makers excluded.', 'Two judgment calls sit here: how "trades both sides" is read, and how neg-risk markets are handled.'],
    ['126 of 150 accounts with no buys flagged skilled.', 'Not traced yet.'],
    ['B = 1,000 sign flips.', 'A p-value can be 0, and Benjamini–Hochberg assumes weak dependence.'],
    ['Two runs differ by one account.', '536 against 537.']
  ] }
];

// ---------- a small SVG chart frame with a crosshair ----------
function makeChart(fig, render, { phone }) {
  const readEl = fig.querySelector('[data-read]');
  const plot = fig.querySelector('[data-plot]');
  plot.innerHTML = '<div class="fig__svg"></div><div class="fig__xh" aria-hidden="true"><i></i><span class="num"></span></div>';
  const host = plot.querySelector('.fig__svg');
  const xh = plot.querySelector('.fig__xh'), xhTip = xh.querySelector('span');
  const st = { q: 0, opts: {}, cats: [], w: 0, h: 0, hover: null };
  let lastKey = '';
  function draw(force) {
    const w = plot.clientWidth;
    const h = phone || w < 640 ? 360 : 480;
    const key = `${w}|${h}|${st.q.toFixed(3)}|${JSON.stringify(st.opts)}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    st.w = w; st.h = h;
    const out = render({ w, h, q: st.q, opts: st.opts, small: w < 640 });
    host.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(out.label)}">${trSvg(out.svg)}</svg>`;
    st.cats = out.cats.map(c => ({ ...c, tip: tr(c.tip) }));
    st.idle = tr(out.idle);
    plot.style.height = `${h}px`;
    showXh();
  }
  function showXh() {
    if (st.hover == null || st.q < 0.98 || !st.cats.length) {
      xh.style.opacity = 0;
      if (readEl && st.idle && readEl.textContent !== st.idle) readEl.textContent = st.idle;
      return;
    }
    let best = st.cats[0];
    for (const c of st.cats) if (Math.abs(c.x - st.hover) < Math.abs(best.x - st.hover)) best = c;
    if (readEl) readEl.textContent = best.tip;
    xhTip.textContent = best.tip;
    xhTip.hidden = !!readEl;
    xh.style.opacity = 1;
    xh.style.transform = `translateX(${Math.round(best.x)}px)`;
    const tw = xhTip.offsetWidth;
    const shift = Math.min(st.w - (best.x + tw / 2), Math.max(-(best.x - tw / 2), 0));
    xhTip.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`;
  }
  const move = e => { const r = plot.getBoundingClientRect(); st.hover = e.clientX - r.left; showXh(); };
  plot.addEventListener('pointermove', move);
  plot.addEventListener('pointerdown', move);
  plot.addEventListener('pointerleave', () => { st.hover = null; showXh(); });
  new ResizeObserver(() => draw()).observe(plot);
  return {
    set q(v) { st.q = v; draw(); },
    setOpt(k, v) { st.opts[k] = v; draw(true); },
    draw
  };
}

// ---------- shared drawing helpers ----------
function frame({ w, h, small }, ymax, ticks, n) {
  const m = { l: 44, r: small ? 14 : 160, t: 34, b: 58 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = i => m.l + (i + 0.5) * (iw / n);
  const y = v => m.t + (1 - v / ymax) * ih;
  let svg = '';
  for (const t of ticks) {
    svg += `<line class="g" x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
    svg += `<text class="yl" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}%</text>`;
  }
  svg += `<line class="ax" x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
  return { m, iw, ih, x, y, svg };
}
const sq = (cx, cy, s, cls) => `<rect class="${cls}" x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}"/>`;
function polyline(pts, e) {
  // first e of the way along the points (e in 0..1), for lines that draw themselves
  const n = pts.length - 1, upto = e * n, k = Math.floor(upto);
  const out = pts.slice(0, k + 1);
  if (k < n && upto > k) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], f = upto - k;
    out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]);
  }
  return out.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
}

// ---------- 3. skilled share by price bucket, with the zero-edge band ----------
function bucketsChart(data) {
  return ({ w, h, q, opts, small }) => {
    const win = opts.window || 'novdec2025';
    const rows = data.price_buckets_raw_only[win];
    const labels = data.price_buckets_raw_only.buckets.map(cents);
    const bands = data.simulation.zero_edge_band_by_bucket_pct;
    const F = frame({ w, h, small }, 100, [0, 25, 50, 75, 100], rows.length);
    let svg = F.svg;
    const step = F.iw / rows.length, bw = Math.min(30, step * 0.34);
    const cats = [];
    // thin lines through the markers: the trend with price
    const eAll = rows.map((r, i) => easeOut(clamp01((q - i * 0.07) / 0.55)));
    svg += `<polyline class="c-anti c-thin" points="${rows.map((r, i) => `${F.x(i).toFixed(1)},${F.y(r.ap * eAll[i]).toFixed(1)}`).join(' ')}"/>`;
    svg += `<polyline class="c-skill c-thin" points="${rows.map((r, i) => `${F.x(i).toFixed(1)},${F.y(r.sp * eAll[i]).toFixed(1)}`).join(' ')}"/>`;
    rows.forEach((r, i) => {
      const e = eAll[i];
      const cx = F.x(i);
      const [lo, hi] = bands[i];
      svg += `<rect class="band" x="${cx - bw / 2}" y="${F.y(hi * e)}" width="${bw}" height="${Math.max(0, F.y(lo * e) - F.y(hi * e))}"/>`;
      svg += sq(cx, F.y(r.ap * e), 9, 'm-anti');
      svg += sq(cx, F.y(r.sp * e), 10, 'm-skill');
      const showVal = !small || i === 0 || i === rows.length - 1;
      if (showVal) svg += `<text class="v v--skill" x="${cx + bw / 2 + 6}" y="${F.y(r.sp * e) + (r.sp < r.ap ? 16 : 4)}" opacity="${e}">${pct(r.sp)}</text>`;
      svg += `<text class="xl" x="${cx}" y="${h - F.m.b + 20}" text-anchor="middle">${small ? labels[i].replace('¢', '') : labels[i]}</text>`;
      svg += `<text class="xn" x="${cx}" y="${h - F.m.b + 38}" text-anchor="middle">${small ? '' : 'n '}${fmtInt(r.n)}</text>`;
      cats.push({ x: cx, tip: `${labels[i]} · n ${fmtInt(r.n)} · skilled ${fmtInt(r.s)} (${pct(r.sp)}) · anti ${fmtInt(r.a)} (${pct(r.ap)}) · zero-edge ${lo}–${hi}%` });
    });
    const lx = F.m.l;
    if (small) svg += `<text class="xn" x="${F.m.l - 8}" y="${h - F.m.b + 20}" text-anchor="end">¢</text><text class="xn" x="${F.m.l - 8}" y="${h - F.m.b + 38}" text-anchor="end">n</text>`;
    svg += `<g class="legend" transform="translate(${lx},14)">${sq(5, 0, 9, 'm-skill')}<text x="16" y="4">skilled</text>${sq(86, 0, 9, 'm-anti')}<text x="97" y="4">anti-skilled</text><rect class="band" x="${small ? 0 : 195}" y="${small ? 10 : -6}" width="10" height="12"/><text x="${small ? 16 : 211}" y="${small ? 20 : 4}">zero-edge simulation</text></g>`;
    return { svg, cats, label: 'Share of accounts flagged skilled and anti-skilled by price bucket, with the simulated zero-edge range.' };
  };
}

// ---------- 4. how often a zero-edge trader is called skilled, by price ----------
function curvesChart(data) {
  return ({ w, h, q, small }) => {
    const sim = data.simulation;
    const qs = sim.q;
    const F = frame({ w, h, small }, 100, [0, 25, 50, 75, 100], qs.length);
    let svg = F.svg;
    const e = easeOut(clamp01(q / 0.85));
    // what a fair test should flag
    svg += `<line class="ref" x1="${F.m.l}" x2="${w - F.m.r}" y1="${F.y(5)}" y2="${F.y(5)}"/>`;
    if (small) svg += `<text class="yl" x="${F.m.l - 8}" y="${F.y(5) + 4}" text-anchor="end">5%</text>`;
    else svg += `<text class="v" x="${w - F.m.r}" y="${F.y(5) - 6}" text-anchor="end">5%: what a fair test flags</text>`;
    const series = [['10', 'c-10'], ['40', 'c-40'], ['20', 'c-20']];
    for (const [k, cls] of series) {
      const pts = sim.skilled_pct_by_events[k].map((v, i) => [F.x(i), F.y(v)]);
      svg += `<polyline class="${cls}" points="${polyline(pts, e)}"/>`;
      if (!small) {
        const [lx, ly] = pts[pts.length - 1];
        const dy = k === '10' ? -8 : k === '40' ? 10 : 2;
        svg += `<text class="v" x="${lx + 10}" y="${ly + dy}" opacity="${clamp01((e - 0.9) * 10)}">${k} events</text>`;
      }
    }
    // 99¢, 20 events
    const i99 = qs.indexOf(0.99), v = sim.skilled_pct_by_events['20'][i99];
    const he = clamp01((e - 0.82) / 0.18);
    svg += sq(F.x(i99), F.y(v), 10 * he, 'm-skill');
    svg += `<text class="v v--skill" x="${F.x(i99) - 10}" y="${F.y(v) - 12}" text-anchor="end" opacity="${he}">${pct(v)} at 99¢, 20 events</text>`;
    const cats = [];
    qs.forEach((p, i) => {
      const lab = `${+(p * 100).toFixed(1)}¢`;
      svg += `<text class="xl" x="${F.x(i)}" y="${h - F.m.b + 20}" text-anchor="middle">${small ? lab.replace('¢', '') : lab}</text>`;
      const s = sim.skilled_pct_by_events;
      cats.push({ x: F.x(i), tip: `${lab} · 10 events ${pct(s['10'][i])} · 20 events ${pct(s['20'][i])} · 40 events ${pct(s['40'][i])}` });
    });
    svg += `<text class="xn" x="${F.m.l}" y="${h - F.m.b + 42}">Price paid${small ? ', ¢' : ''}</text>`;
    svg += `<g class="legend" transform="translate(${F.m.l},14)"><line class="c-20" x1="0" x2="22" y1="0" y2="0"/><text x="28" y="4">20 events</text><line class="c-10" x1="104" x2="126" y1="0" y2="0"/><text x="132" y="4">10</text><line class="c-40" x1="160" x2="182" y1="0" y2="0"/><text x="188" y="4">40</text></g>`;
    return { svg, cats, label: 'Simulated share of zero-edge traders flagged skilled, by price paid, for 10, 20 and 40 events.' };
  };
}

// ---------- 5. skilled and anti-skilled shares as the price cap moves ----------
function capsChart(data) {
  return ({ w, h, q, opts, small }) => {
    const win = opts.window || 'novdec2025', corr = opts.corr || 'raw';
    const cs = data.cap_sensitivity, d = cs[win];
    const sk = d[`${corr}_skilled`], an = d[`${corr}_anti`];
    const paper = data.paper_table1_min10_events[corr];
    const caps = cs.caps.map(c => (c === 'no cap' ? 'No cap' : cents(c)));
    const F = frame({ w, h, small }, 35, [0, 10, 20, 30], caps.length);
    let svg = F.svg;
    const e = easeOut(clamp01(q / 0.85));
    // the paper's Table 1 as reference lines
    const pe = clamp01(q / 0.3);
    svg += `<line class="ref ref--skill" x1="${F.m.l}" x2="${F.m.l + (w - F.m.r - F.m.l) * pe}" y1="${F.y(paper.skilled_pct)}" y2="${F.y(paper.skilled_pct)}"/>`;
    svg += `<line class="ref" x1="${F.m.l}" x2="${F.m.l + (w - F.m.r - F.m.l) * pe}" y1="${F.y(paper.anti_pct)}" y2="${F.y(paper.anti_pct)}"/>`;
    // narrow screens: labels at the left end, skilled under its line and anti over it, where the data leave room
    const pl = small ? F.m.l + 4 : w - F.m.r + 10;
    svg += `<text class="v v--skill" x="${pl}" y="${F.y(paper.skilled_pct) + (small ? 15 : 4)}" opacity="${pe}">Paper, skilled ${pct(paper.skilled_pct, 2)}</text>`;
    svg += `<text class="v" x="${pl}" y="${F.y(paper.anti_pct) + (small ? -7 : 4)}" opacity="${pe}">Paper, anti ${pct(paper.anti_pct, 2)}</text>`;
    const pS = sk.map((v, i) => [F.x(i), F.y(v)]), pA = an.map((v, i) => [F.x(i), F.y(v)]);
    svg += `<polyline class="c-anti" points="${polyline(pA, e)}"/>`;
    svg += `<polyline class="c-skill" points="${polyline(pS, e)}"/>`;
    const cats = [];
    caps.forEach((c, i) => {
      const pe2 = clamp01((e * (caps.length - 1) - i) + 1);
      // 95% Wilson intervals from the cohort size
      const n = d.n[i], [sl, sh] = wilson(sk[i], n), [al, ah] = wilson(an[i], n);
      svg += `<line class="wh wh--skill" x1="${F.x(i) + 7}" x2="${F.x(i) + 7}" y1="${F.y(sl)}" y2="${F.y(sh)}" opacity="${pe2}"/>`;
      svg += `<line class="wh" x1="${F.x(i) - 7}" x2="${F.x(i) - 7}" y1="${F.y(al)}" y2="${F.y(ah)}" opacity="${pe2}"/>`;
      svg += sq(F.x(i), F.y(an[i]), 9 * pe2, 'm-anti');
      svg += sq(F.x(i), F.y(sk[i]), 10 * pe2, 'm-skill');
      if (small ? i === caps.length - 1 : i === 0 || i === caps.length - 1) {
        // the higher value is labelled above its marker, the lower one below
        const skUp = sk[i] >= an[i];
        const tx = F.x(i) + (i === 0 ? 10 : -10), anc = i === 0 ? 'start' : 'end';
        svg += `<text class="v v--skill" x="${tx}" y="${F.y(sk[i]) + (skUp ? -10 : 18)}" text-anchor="${anc}" opacity="${pe2}">${pct(sk[i], 2)}</text>`;
        if (!small) svg += `<text class="v" x="${tx}" y="${F.y(an[i]) + (skUp ? 18 : -10)}" text-anchor="${anc}" opacity="${pe2}">${pct(an[i], 2)}</text>`;
      }
      svg += `<text class="xl" x="${F.x(i)}" y="${h - F.m.b + 20}" text-anchor="middle">${small ? c.replace('¢', '').replace('No cap', 'none') : c}</text>`;
      svg += `<text class="xn" x="${F.x(i)}" y="${h - F.m.b + 38}" text-anchor="middle">${small ? '' : 'n '}${fmtInt(d.n[i])}</text>`;
      cats.push({ x: F.x(i), tip: `${c} · n ${fmtInt(n)} · skilled ${pct(sk[i], 2)} [${sl.toFixed(1)}–${sh.toFixed(1)}] · anti ${pct(an[i], 2)} [${al.toFixed(1)}–${ah.toFixed(1)}]` });
    });
    if (small) svg += `<text class="xn" x="${F.m.l - 8}" y="${h - F.m.b + 20}" text-anchor="end">cap ¢</text><text class="xn" x="${F.m.l - 8}" y="${h - F.m.b + 38}" text-anchor="end">n</text>`;
    svg += `<g class="legend" transform="translate(${F.m.l},14)">${sq(5, 0, 9, 'm-skill')}<text x="16" y="4">skilled</text>${sq(86, 0, 9, 'm-anti')}<text x="97" y="4">anti-skilled</text></g>`;
    const L0 = caps.length - 1;
    const idle = `No cap · skilled ${pct(sk[L0], 2)} · anti ${pct(an[L0], 2)} · paper ${pct(paper.skilled_pct, 2)} / ${pct(paper.anti_pct, 2)}`;
    return { svg, cats, idle, label: 'Skilled and anti-skilled shares by price cap, against the paper\'s Table 1.' };
  };
}

// ---------- method 02: the test on synthetic traders with a known answer ----------
function powerChart(data) {
  return ({ w, h, q, small }) => {
    const S = data.method.synthetic_checks, P = S.power_planted_10pp;
    const F = frame({ w, h, small }, 100, [0, 25, 50, 75, 100], P.trades.length);
    let svg = F.svg;
    const e = easeOut(clamp01(q / 0.8));
    // what a fair test should flag, and the usual power target
    svg += `<line class="ref" x1="${F.m.l}" x2="${w - F.m.r}" y1="${F.y(5)}" y2="${F.y(5)}"/>`;
    svg += `<line class="ref" x1="${F.m.l}" x2="${w - F.m.r}" y1="${F.y(80)}" y2="${F.y(80)}"/>`;
    const rx = small ? w - F.m.r : w - F.m.r + 10, ra = small ? 'end' : 'start';
    svg += `<text class="v" x="${rx}" y="${F.y(80) + (small ? -7 : 4)}" text-anchor="${ra}">80% power</text>`;
    svg += `<text class="v" x="${rx}" y="${F.y(5) + (small ? -7 : 4)}" text-anchor="${ra}">5% nominal</text>`;
    const pts = P.detected_pct.map((v, i) => [F.x(i), F.y(v)]);
    svg += `<polyline class="c-20" points="${polyline(pts, e)}"/>`;
    const cats = [];
    P.trades.forEach((t, i) => {
      const k = clamp01(e * (P.trades.length - 1) - i + 1);
      svg += sq(F.x(i), F.y(P.detected_pct[i]), 9 * k, 'm-ink');
      const compact = w < 1000;
      if (!small || i === 1 || i === 5) svg += `<text class="v halo" x="${F.x(i) + (i ? -8 : 8)}" y="${F.y(P.detected_pct[i]) + (i === 0 && compact ? 20 : -10)}" text-anchor="${i ? 'end' : 'start'}" opacity="${k}">${pct(P.detected_pct[i], 2)}</text>`;
      svg += `<text class="xl" x="${F.x(i)}" y="${h - F.m.b + 20}" text-anchor="middle">${t}</text>`;
      let tip = `${t} trades · real 10-point edge found ${pct(P.detected_pct[i], 2)}`;
      if (i === 0) tip += ` · favourite buyers, no edge: ${pct(S.favorite_buyers.raw_pct, 2)} flagged`;
      if (i === 1) tip += ` · pure noise: ${pct(S.noise.raw_pct, 2)} flagged`;
      cats.push({ x: F.x(i), tip });
    });
    if (!small) svg += `<text class="v" x="${w - F.m.r + 10}" y="${F.y(P.detected_pct[5]) + 4}" opacity="${clamp01((e - 0.9) * 10)}">real 10-point edge</text>`;
    // the two control groups
    const ke = clamp01((q - 0.55) / 0.25);
    svg += sq(F.x(1), F.y(S.noise.raw_pct), 9 * ke, 'm-anti');
    svg += `<text class="v halo" x="${F.x(1) + 10}" y="${F.y(S.noise.raw_pct) - (small ? 26 : 8)}" opacity="${ke}">pure noise ${pct(S.noise.raw_pct, 2)}</text>`;
    svg += sq(F.x(0), F.y(S.favorite_buyers.raw_pct), 10 * ke, 'm-skill');
    svg += w < 1000
      ? `<text class="v v--skill halo" x="${F.m.l + 4}" y="${F.y(S.favorite_buyers.raw_pct) - 12}" opacity="${ke}">favourite buyers ${pct(S.favorite_buyers.raw_pct, 2)}</text>`
      : `<text class="v v--skill" x="${F.x(0) + 12}" y="${F.y(S.favorite_buyers.raw_pct) + 4}" opacity="${ke}">favourite buyers, no edge ${pct(S.favorite_buyers.raw_pct, 2)}</text>`;
    svg += `<text class="xn" x="${F.m.l}" y="${h - F.m.b + 42}">Trades per account, doubling</text>`;
    const idle = `160 trades · ${pct(P.detected_pct[4], 2)} of real edges found · favourite buyers ${pct(S.favorite_buyers.raw_pct, 2)}`;
    return { svg, cats, idle, label: 'Synthetic check: share of accounts flagged skilled by trades per account, for a real edge, pure noise and favourite buyers with no edge.' };
  };
}

// ---------- method 03: accounts kept at each step ----------
function funnelChart(data) {
  return ({ w, h, q, small }) => {
    const f = data.method.funnel_novdec2025;
    const rows = [
      ['Accounts trading in Nov–Dec 2025', f.accounts_in_window],
      [`≥ 10 events, ${fmtInt(f.market_makers)} market makers out`, f.eligible],
      ['Sampled, MD5 order', f.sampled],
      ['Tested, with at least one buy', f.with_buys]
    ];
    const m = { l: small ? 8 : 16, r: small ? 64 : 160, t: 26, b: 34 };
    const iw = w - m.l - m.r;
    const x = v => m.l + ((Math.log10(v) - 3) / 3) * iw; // 1,000 to 1,000,000
    const rowH = (h - m.t - m.b) / rows.length;
    let svg = '';
    [1e3, 1e4, 1e5, 1e6].forEach(v => {
      svg += `<line class="g" x1="${x(v)}" x2="${x(v)}" y1="${m.t - 8}" y2="${h - m.b}"/>`;
      svg += `<text class="yl" x="${x(v)}" y="${h - m.b + 18}" text-anchor="${v === 1e6 ? 'end' : 'middle'}">${v >= 1e6 ? '1M' : `${v / 1e3}k`}</text>`;
    });
    rows.forEach(([lab, v], i) => {
      const k = easeOut(clamp01((q - i * 0.12) / 0.5));
      const y0 = m.t + i * rowH, bh = Math.min(22, rowH * 0.36);
      const xe = m.l + (x(v) - m.l) * k;
      svg += `<text class="xl" x="${m.l}" y="${y0 + 12}" opacity="${clamp01(k * 3)}">${esc(lab)}</text>`;
      svg += `<line class="g" x1="${m.l}" x2="${m.l + iw}" y1="${y0 + 20 + bh / 2}" y2="${y0 + 20 + bh / 2}"/>`;
      svg += `<line class="ax" x1="${m.l}" x2="${xe}" y1="${y0 + 20 + bh / 2}" y2="${y0 + 20 + bh / 2}" opacity=".5"/>`;
      svg += sq(xe, y0 + 20 + bh / 2, 11 * clamp01(k * 2), 'm-ink');
      svg += `<text class="v" x="${xe + 12}" y="${y0 + 20 + bh / 2 + 4}" opacity="${k}">${fmtInt(v)}</text>`;
      if (i > 0 && !small) svg += `<text class="xn" x="${w - m.r + 70}" y="${y0 + 20 + bh / 2 + 4}" opacity="${k}">−${fmtInt(rows[i - 1][1] - v)}</text>`;
    });
    if (!small) svg += `<text class="xn" x="${w - m.r + 70}" y="${m.t - 8}">dropped</text>`;
    const idle = `${fmtInt(f.trades)} trades · ${fmtInt(data.samples.novdec2025.events)} events · fills per account: median ${f.fills_p50}, p90 ${f.fills_p90}`;
    return { svg, cats: [], idle, label: 'Accounts kept at each step of the sample, as points on a log scale.' };
  };
}

// ---------- method 04: every account, mean buy price against p-value ----------
function scatterFig(fig, data, pts, { phone }) {
  const host = fig.querySelector('[data-sc-plot]'), readEl = fig.querySelector('[data-read]');
  host.innerHTML = '<canvas class="sc__c"></canvas><div class="fig__svg sc__svg"></div>';
  const cv = host.querySelector('canvas'), ctx = cv.getContext('2d'), over = host.querySelector('.sc__svg');
  const H = data.method.pvalue_hist_novdec2025;
  const hist = H.mean_buy_lt_095.map((v, i) => v + H.mean_buy_ge_095[i] + H.no_buys[i]);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const jit = i => (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.004;
  // the price axis is split: 0–0.90 on 60% of the width, 0.90–1.00 on 40%, where the favourites are
  const fx = x => (x < 0.9 ? 0.6 * (x / 0.9) : 0.6 + 0.4 * ((x - 0.9) / 0.1));
  // readout bins: tenths below 80¢, then the section-3 buckets, read from each account's own bucket
  // (exported from the unrounded price, so the counts match section 3 exactly)
  const EDGES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.97, 0.99, 1];
  const bins = EDGES.slice(0, -1).map((lo, i) => ({ lo, hi: EDGES[i + 1], n: 0, s: 0 }));
  pts.forEach(([x, p, k]) => { const b = bins[k > 0 ? 7 + k : Math.min(7, Math.floor(x * 10))]; b.n++; if (p < 0.05) b.s++; });
  const st = { q: 0, hover: null, key: '' };
  const idle = `mean buy ≥ 95¢: ${fmtInt(H.mean_buy_ge_095[0])} of ${fmtInt(H.mean_buy_ge_095.reduce((a, b) => a + b, 0))} at p < 0.05 · under 95¢: ${fmtInt(H.mean_buy_lt_095[0])} of ${fmtInt(H.mean_buy_lt_095.reduce((a, b) => a + b, 0))}`;
  function draw() {
    const w = host.clientWidth, h = host.clientHeight, small = w < 640, compact = w < 1000;
    const key = `${w}|${h}|${st.q.toFixed(3)}|${st.hover}`;
    if (key === st.key) return;
    st.key = key;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const hw = small ? 64 : 150;
    const m = { l: 40, r: hw + (small ? 12 : 24), t: 14, b: 46 };
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const X = v => m.l + fx(v) * iw, Y = p => m.t + (1 - p) * ih;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = css('--ink'), green = css('--green'), grey = css('--grey-ink');
    // the two tails as faint bands
    ctx.globalAlpha = 0.09; ctx.fillStyle = green; ctx.fillRect(X(0), Y(0.05), iw, Y(0) - Y(0.05));
    ctx.fillStyle = grey; ctx.fillRect(X(0), Y(1), iw, Y(0.95) - Y(1));
    const s = small ? 2.2 : 2.6;
    pts.forEach(([x, p], i) => {
      // ties at 0 spread inside the p < 0.05 band, everything else by at most 0.004
      const dj = p < 0.05 ? Math.abs(jit(i)) * 5 * (0.05 - p) / 0.05 : p < 0.5 ? jit(i) : -jit(i);
      const px = X(x), py = Y(Math.min(1, Math.max(0, p + dj)));
      if (p < 0.05) { ctx.globalAlpha = 0.85; ctx.fillStyle = green; ctx.fillRect(px - s / 2, py - s / 2, s, s); }
      else if (p > 0.95) { ctx.globalAlpha = 0.8; ctx.strokeStyle = grey; ctx.lineWidth = 1; ctx.strokeRect(px - s / 2, py - s / 2, s, s); }
      else { ctx.globalAlpha = 0.28; ctx.fillStyle = ink; ctx.fillRect(px - s / 2, py - s / 2, s, s); }
    });
    // marginal histogram of all 5,000 p-values
    const hx0 = w - hw - 4, hk = easeOut(clamp01((st.q - 0.35) / 0.5));
    const maxN = Math.max(...hist), bw = n => (n / maxN) * (hw - 8) * hk;
    hist.forEach((n, i) => {
      const y1 = Y(i / 20), y0 = Y((i + 1) / 20);
      ctx.globalAlpha = i === 0 ? 0.9 : i === 19 ? 0.55 : 0.35;
      ctx.fillStyle = i === 0 ? green : i === 19 ? grey : ink;
      ctx.fillRect(hx0, y0 + 1, bw(n), y1 - y0 - 2);
    });
    ctx.globalAlpha = 1;
    let svg = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      svg += `<line class="g" x1="${m.l}" x2="${m.l + iw}" y1="${Y(p)}" y2="${Y(p)}"/>`;
      svg += `<text class="yl" x="${m.l - 8}" y="${Y(p) + 4}" text-anchor="end">${p.toFixed(p % 0.5 ? 2 : 1)}</text>`;
    });
    (small ? [0, 0.5, 0.9, 0.99] : compact ? [0, 0.3, 0.6, 0.9, 0.95, 0.99] : [0, 0.3, 0.6, 0.9, 0.95, 0.97, 0.99]).forEach(v => {
      svg += `<text class="xl" x="${X(v)}" y="${h - m.b + 20}" text-anchor="${v === 1 ? 'end' : v === 0 ? 'start' : 'middle'}">${v >= 0.95 && v < 1 ? v.toFixed(2) : v.toFixed(1)}</text>`;
      svg += `<line class="ax" x1="${X(v)}" x2="${X(v)}" y1="${Y(0)}" y2="${Y(0) + 5}"/>`;
    });
    // the break in the scale, marked on the axis
    svg += `<line class="g" x1="${X(0.9)}" x2="${X(0.9)}" y1="${Y(1)}" y2="${Y(0)}"/>`;
    svg += `<text class="xn halo" x="${X(0.9) + 6}" y="${Y(1) + 12}">${small ? '×4.5' : 'scale × 4.5 above 0.90'}</text>`;
    svg += `<line class="ax" x1="${m.l}" x2="${m.l + iw}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    svg += `<line class="ref ref--skill" x1="${X(0.95)}" x2="${X(0.95)}" y1="${Y(1)}" y2="${Y(0)}"/>`;
    svg += `<text class="v v--skill" x="${X(0.95) + 6}" y="${Y(0.5)}">95¢</text>`;
    svg += `<text class="xn" x="${m.l}" y="${h - m.b + 40}">${small ? 'Mean buy price, $' : 'Mean buy price, $ · p-value up the side'}</text>`;
    if (!small) {
      svg += `<text class="v v--skill halo" x="${m.l + 8}" y="${Y(0.05) - 6}">p &lt; 0.05: skilled</text>`;
      svg += `<text class="v halo" x="${m.l + 8}" y="${Y(0.95) + 14}">p &gt; 0.95: anti-skilled</text>`;
    }
    // uniform reference: 250 per bin if the test were fair
    const ux = hx0 + (250 / maxN) * (hw - 8) * hk;
    svg += `<line class="ref" x1="${ux}" x2="${ux}" y1="${Y(1) - 6}" y2="${Y(0)}" opacity="${hk}"/>`;
    svg += `<text class="v" x="${ux}" y="${Y(1) - 10}" text-anchor="middle" opacity="${hk}">250</text>`;
    svg += `<text class="v v--skill" x="${hx0 + bw(hist[0]) - 2}" y="${Y(0.05) - 6}" text-anchor="end" opacity="${hk}">${fmtInt(hist[0])}</text>`;
    if (!small) svg += `<text class="v" x="${hx0 + bw(hist[19]) + 6}" y="${Y(1) + 12}" opacity="${hk}">${fmtInt(hist[19])}</text>`;
    let read = idle;
    if (st.hover != null && st.q > 0.98) {
      const B0 = bins.find(b => st.hover < X(b.hi)) || bins[bins.length - 1];
      svg += `<rect class="hl" x="${X(B0.lo)}" y="${Y(1)}" width="${X(B0.hi) - X(B0.lo)}" height="${ih}"/>`;
      read = `mean buy ${B0.hi === 1 ? `≥ ${B0.lo.toFixed(2)}` : `${B0.lo.toFixed(2)}–${B0.hi.toFixed(2)}`} · ${fmtInt(B0.n)} accounts · p < 0.05: ${fmtInt(B0.s)}${B0.n ? ` (${pct((100 * B0.s) / B0.n)})` : ''}`;
    }
    over.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Scatter of 4,850 accounts: mean buy price against p-value, with a histogram of all 5,000 p-values.">${trSvg(svg)}</svg>`;
    read = tr(read);
    if (readEl.textContent !== read) readEl.textContent = read;
  }
  const move = e => { const r = host.getBoundingClientRect(); st.hover = e.clientX - r.left; draw(); };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerdown', move);
  host.addEventListener('pointerleave', () => { st.hover = null; draw(); });
  new ResizeObserver(() => { st.key = ''; draw(); }).observe(host);
  return { set q(v) { st.q = v; draw(); } };
}

// ---------- results B: observed share against the zero-edge range ----------
function bandChart(data) {
  return ({ w, h, q, small }) => {
    const B = data.simulation.zero_edge_band_by_bucket_pct, labels = data.price_buckets_raw_only.buckets.map(cents);
    const R1 = data.price_buckets_raw_only.novdec2025, R2 = data.price_buckets_raw_only.dec2025;
    const F = frame({ w, h, small }, 100, [0, 25, 50, 75, 100], B.length);
    let svg = F.svg;
    const e = easeOut(clamp01(q / 0.7));
    const step = F.iw / B.length, bw = Math.min(46, step * 0.42);
    const cats = [];
    B.forEach(([lo, hi], i) => {
      const k = clamp01(e * B.length - i * 0.6);
      const cx = F.x(i);
      const ylo = F.y(lo), yhi = F.y(lo + (hi - lo) * k);
      svg += `<rect class="band" x="${cx - bw / 2}" y="${yhi}" width="${bw}" height="${Math.max(0, ylo - yhi)}"/>`;
      if (!small) svg += `<text class="xn" x="${cx - bw / 2 - 6}" y="${F.y(hi) + 4}" text-anchor="end" opacity="${k}">${hi}</text><text class="xn" x="${cx - bw / 2 - 6}" y="${F.y(lo) + 4}" text-anchor="end" opacity="${k}">${lo}</text>`;
      const m = clamp01((q - 0.45 - i * 0.04) / 0.25);
      [[R1[i], 'm-skill', -7], [R2[i], 'm-hollow', 9]].forEach(([r, cls, dx]) => {
        const [wl, wh] = wilson(r.sp, r.n);
        svg += `<line class="wh wh--skill" x1="${cx + dx}" x2="${cx + dx}" y1="${F.y(wl)}" y2="${F.y(wh)}" opacity="${m}"/>`;
        svg += sq(cx + dx, F.y(r.sp), 9 * m, cls);
      });
      const out = R1[i].sp > hi;
      if (out) svg += `<text class="v v--skill halo" x="${cx + 18}" y="${F.y(R1[i].sp) - 10}" opacity="${m}">${small || lang === 'it' ? 'above' : 'above the range'}</text>`;
      svg += `<text class="xl" x="${cx}" y="${h - F.m.b + 20}" text-anchor="middle">${small ? labels[i].replace('¢', '') : labels[i]}</text>`;
      if (!small) svg += `<text class="xn" x="${cx}" y="${h - F.m.b + 38}" text-anchor="middle">${out ? 'outside' : 'inside'}</text>`;
      cats.push({ x: cx, tip: `${labels[i]} · zero-edge ${lo}–${hi}% · Nov–Dec ${pct(R1[i].sp)} (n ${fmtInt(R1[i].n)}) · Dec ${pct(R2[i].sp)} (n ${fmtInt(R2[i].n)}) · ${out ? 'above' : 'inside'}` });
    });
    // the legend is laid out from the length of its words, so it holds in either language
    const cw = 7.4, l1 = tr(small ? 'zero-edge' : 'zero-edge range'), l2 = tr('Nov–Dec'), l3 = tr('Dec');
    const x2 = 18 + l1.length * cw + 20, x3 = x2 + 10 + l2.length * cw + 20;
    svg += `<g class="legend" transform="translate(${F.m.l},14)"><rect class="band" x="0" y="-7" width="12" height="13"/><text x="18" y="4">${l1}</text>${sq(x2, 0, 9, 'm-skill')}<text x="${x2 + 10}" y="4">${l2}</text>${sq(x3, 0, 9, 'm-hollow')}<text x="${x3 + 10}" y="4">${l3}</text></g>`;
    const inside = data.analysis.inside_zero_edge_band.novdec2025.filter(Boolean).length;
    return { svg, cats, idle: `${inside} of ${B.length} buckets inside the zero-edge range, in both windows · above: 80–90¢`, label: 'Observed skilled share by price bucket against the simulated zero-edge range.' };
  };
}

// ---------- results C: what Benjamini–Hochberg removes ----------
function bhChart(data) {
  return ({ w, h, q, small }) => {
    const C = data.cap_sensitivity.novdec2025, L0 = data.cap_sensitivity.caps.length - 1;
    const rows = [
      ['No cap', 'skilled', C.raw_skilled[L0], C.bh_skilled[L0]],
      ['No cap', 'anti', C.raw_anti[L0], C.bh_anti[L0]],
      ['Under 80¢', 'skilled', C.raw_skilled[0], C.bh_skilled[0]],
      ['Under 80¢', 'anti', C.raw_anti[0], C.bh_anti[0]]
    ];
    const F = frame({ w, h, small }, 30, [0, 10, 20, 30], rows.length);
    let svg = F.svg;
    const cats = [];
    rows.forEach(([coh, side, raw, bh], i) => {
      const k = easeOut(clamp01((q - i * 0.1) / 0.5));
      const cx = F.x(i), sk = side === 'skilled';
      const yb = F.y(raw + (bh - raw) * k);
      svg += `<line class="${sk ? 'c-skill' : 'c-anti'}" x1="${cx}" x2="${cx}" y1="${F.y(raw)}" y2="${yb}"/>`;
      svg += sq(cx, F.y(raw), 10, sk ? 'm-hollow' : 'm-anti');
      svg += sq(cx, yb, 10 * k, sk ? 'm-skill' : 'm-grey');
      const cut = 100 * (1 - bh / raw);
      svg += `<text class="v ${sk ? 'v--skill' : ''} halo" x="${cx + 12}" y="${(F.y(raw) + yb) / 2 + 4}" opacity="${clamp01((k - 0.6) / 0.4)}">−${cut.toFixed(1)}%</text>`;
      // the BH value sits below its marker when the two are close, so the pair never overlaps
      if (!small) svg += `<text class="xn" x="${cx - 12}" y="${F.y(raw) + 4}" text-anchor="end">${pct(raw, 2)}</text><text class="xn" x="${cx - 12}" y="${yb + (F.y(raw) - yb > -18 ? 18 : 4)}" text-anchor="end" opacity="${k}">${pct(bh, 2)}</text>`;
      svg += `<text class="xl" x="${cx}" y="${h - F.m.b + 20}" text-anchor="middle">${side}</text>`;
      svg += `<text class="xn" x="${cx}" y="${h - F.m.b + 38}" text-anchor="middle">${small ? (coh === 'No cap' ? '—' : '< 80¢') : coh}</text>`;
      cats.push({ x: cx, tip: `${coh} · ${side} · raw ${pct(raw, 2)} → BH ${pct(bh, 2)} · −${cut.toFixed(1)}%` });
    });
    const bl = tr('raw p') + ' &lt; 0.05', bx = 16 + (bl.length - 3) * 7.4 + 22;
    svg += `<g class="legend" transform="translate(${F.m.l},14)">${sq(5, 0, 9, 'm-hollow')}<text x="16" y="4">${bl}</text>${sq(bx, 0, 9, 'm-skill')}<text x="${bx + 11}" y="4">${tr('after BH')}</text></g>`;
    const A = data.analysis.bh_cut_pct;
    return { svg, cats, idle: `no cap: skilled −${A.no_cap_skilled}%, anti −${A.no_cap_anti}% · under 80¢: −${A.under_80_skilled}%, −${A.under_80_anti}%`, label: 'Share flagged before and after Benjamini–Hochberg, for skilled and anti-skilled, with and without an 80 cent cap.' };
  };
}

// ---------- results D: a small share of accounts, a large share of flags ----------
function concChart(data) {
  return ({ w, h, q, small }) => {
    const K = data.key_facts, b = data.price_buckets_raw_only, C = data.cap_sensitivity, L0 = C.caps.length - 1;
    const decAcc = (100 * b.dec2025[5].n) / C.dec2025.n[L0];
    const groups = [
      ['Nov–Dec 2025', K.accounts_99_plus_share_of_buyers_pct, K.share_of_skilled_at_99_plus_pct],
      ['Dec 2025', +decAcc.toFixed(1), K.dec_share_of_skilled_at_99_plus_pct]
    ];
    const m = { l: small ? 8 : 16, r: small ? 8 : 16, t: 22, b: 30 };
    const iw = w - m.l - m.r, gh = (h - m.t - m.b) / groups.length, bh = Math.min(26, gh * 0.2);
    const X = v => m.l + (v / 100) * iw;
    let svg = '';
    [0, 25, 50, 75, 100].forEach(v => {
      svg += `<line class="g" x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${h - m.b}"/>`;
      svg += `<text class="yl" x="${X(v)}" y="${h - m.b + 18}" text-anchor="${v === 0 ? 'start' : v === 100 ? 'end' : 'middle'}">${v}%</text>`;
    });
    groups.forEach(([lab, acc, fl], g) => {
      const k = easeOut(clamp01((q - g * 0.15) / 0.55));
      const y0 = m.t + g * gh + (small ? 30 : 18), y1 = y0 + bh + (small ? 30 : 26);
      svg += `<text class="xl" x="${m.l}" y="${y0 - (small ? 22 : 8)}">${lab}</text>`;
      [[y0, acc, 'accounts with buys'], [y1, fl, 'skilled flags']].forEach(([y, v, what]) => {
        svg += `<rect class="bar-rest" x="${m.l}" y="${y}" width="${iw}" height="${bh}"/>`;
        svg += `<rect class="bar-skill" x="${m.l}" y="${y}" width="${Math.max(0, X(v * k) - m.l)}" height="${bh}"/>`;
        // narrow: the reading sits above its bar, where it can never run off the edge
        svg += small
          ? `<text class="v halo" x="${m.l}" y="${y - 5}" opacity="${k}">${pct(v)} of ${what}</text>`
          : `<text class="v halo" x="${X(v * k) + 8}" y="${y + bh / 2 + 4}" opacity="${k}">${pct(v)} of ${what}</text>`;
      });
      // the boundary moves right from accounts to flags: the same people, a bigger share
      svg += `<path class="conn" d="M${X(acc * k)},${y0 + bh} L${X(fl * k)},${y1}" opacity="${k}"/>`;
    });
    return { svg, cats: [], idle: `≥ 99¢ buyers: ${pct(groups[0][1])} of accounts, ${pct(groups[0][2], 0)} of skilled flags · Dec ${pct(groups[1][1])} → ${pct(groups[1][2])}`, label: 'Share of accounts that pay 99 cents or more, against their share of skilled flags.' };
  };
}

// ---------- 6. table ----------
function buildTable(tbody, data) {
  const P = data.paper_table1_min10_events, C = data.cap_sensitivity;
  const last = C.caps.length - 1;
  const row = (name, n, rs, ra, bs, ba) => ({ name, n, rs, ra, bs, ba });
  const rows = [
    row('Paper, Table 1', null, P.raw.skilled_pct, P.raw.anti_pct, P.bh.skilled_pct, P.bh.anti_pct),
    ...['novdec2025', 'dec2025'].flatMap(k => {
      const d = C[k], lab = k === 'novdec2025' ? 'Nov–Dec 2025' : 'Dec 2025';
      return [
        row(`${lab}, no cap`, d.n[last], d.raw_skilled[last], d.raw_anti[last], d.bh_skilled[last], d.bh_anti[last]),
        row(`${lab}, under 80¢`, d.n[0], d.raw_skilled[0], d.raw_anti[0], d.bh_skilled[0], d.bh_anti[0])
      ];
    })
  ];
  const cell = (v, cls, lab) => `<td data-label="${lab}"><span class="tv">${v.toFixed(2)}%</span><i class="tb ${cls}" style="--w:${Math.min(1, v / 35).toFixed(3)}"></i></td>`;
  tbody.innerHTML = rows.map(r => `<tr>
    <th scope="row"><i class="tm ${r.rs > r.ra ? 'is-skilled' : ''}" aria-label="${r.rs > r.ra ? 'skilled above anti' : 'anti above skilled'}"></i><span>${nums(tr(r.name))}</span></th>
    <td data-label="Accounts">${r.n == null ? '—' : fmtInt(r.n)}</td>
    ${cell(r.rs, 'tb--skill', 'Skilled, raw')}${cell(r.ra, 'tb--anti', 'Anti, raw')}${cell(r.bs, 'tb--skill', 'Skilled, BH')}${cell(r.ba, 'tb--anti', 'Anti, BH')}
  </tr>`).join('');
}

// ---------- 7. claims ----------
function buildClaims(host) {
  host.innerHTML = CLAIMS.map((g, gi) => `
    <div class="claims__group">
      <h3 class="claims__head">${t(g.group)}</h3>
      ${g.items.map(([tt, b], i) => `
        <div class="claim">
          <button class="claim__btn" type="button" aria-expanded="false" aria-controls="claim-${gi}-${i}">
            <span class="claim__t">${nums(t(tt))}</span><i class="claim__plus" aria-hidden="true"></i>
          </button>
          <div class="claim__body" id="claim-${gi}-${i}" hidden><p>${nums(t(b))}</p></div>
        </div>`).join('')}
    </div>`).join('');
  host.querySelectorAll('.claim__btn').forEach(btn => btn.addEventListener('click', () => {
    const body = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    if (!open) {
      body.hidden = false;
      const hgt = body.scrollHeight;
      body.style.height = '0px';
      requestAnimationFrame(() => { body.style.height = `${hgt}px`; });
      body.addEventListener('transitionend', () => { body.style.height = ''; }, { once: true });
    } else {
      body.style.height = `${body.scrollHeight}px`;
      requestAnimationFrame(() => { body.style.height = '0px'; });
      body.addEventListener('transitionend', () => { body.hidden = true; body.style.height = ''; }, { once: true });
    }
  }));
}

// ---------- 8. links and the reproduce command ----------
function buildLinks(host) {
  // links without an address are left out until they exist
  host.innerHTML = LINKS.filter(l => l.href)
    .map(l => `<li><a href="${l.href}" target="_blank" rel="noopener">${nums(l.label)}<span aria-hidden="true"> ↗</span></a></li>`).join('');
}

export async function initSections({ gsap, ScrollTrigger, phone, reduced, data, billTex, normalTex }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const scrub = (trigger, fn, start = 'top 85%', end = 'top 25%') => {
    if (reduced) { fn(1); return; }
    fn(0);
    ScrollTrigger.create({ trigger, start, end, onUpdate: self => fn(self.progress), onRefresh: self => fn(self.progress) });
  };
  // A build that plays at its own pace once the chart is well on screen (its top at 62% of the
  // view), so it is seen happening however fast the page is scrolled; scrolling back above that
  // line plays it backwards, so coming down again builds it again.
  const play = (trigger, fn, dur = 1.8, start = 'top 62%') => {
    if (reduced) { fn(1); return; }
    const st = { v: 0 };
    let tw = null;
    const go = to => { tw && tw.kill(); tw = gsap.to(st, { v: to, duration: to ? dur : dur * 0.45, ease: to ? 'power2.inOut' : 'power2.in', onUpdate: () => fn(st.v) }); };
    fn(0);
    ScrollTrigger.create({ trigger, start, onEnter: () => go(1), onLeaveBack: () => go(0),
      onRefresh: self => { if (self.progress > 0 && st.v === 0 && !tw) go(1); } });
  };
  const plotOf = fig => fig.querySelector('[data-mini], [data-plot], [data-sc-plot]') || fig;

  // 3D figures first; if WebGL is not there, the 2D figures take their place
  const readOf = fig => { const el = fig.querySelector('[data-read]'); return s => { s = tr(s); if (el.textContent !== s) el.textContent = s; }; };
  const minis = {};
  try {
    const opts = { billTex, normalTex, phone };
    const f3 = $('[data-fig3d="bundles"]'), f4 = $('[data-fig3d="field"]');
    minis.bundles = bundles(f3.querySelector('[data-mini]'), opts, data, readOf(f3));
    minis.field = field(f4.querySelector('[data-mini]'), opts, data, readOf(f4));
    // the close: the same bundle as the first view, turning on its turntable
    const closeHost = $('[data-mini-close]');
    const closeNote = createHero({ host: closeHost, billTex, normalTex, phone, reduced });
    let closeOn = false, closeQ = 0;
    new IntersectionObserver(es => { closeOn = es[0].isIntersecting; }).observe(closeHost);
    gsap.ticker.add(() => { if (closeOn) closeNote.frame(0, performance.now() / 1000); });
    minis.closing = { set q(v) { closeQ = v; } };
    const fc = $('[data-fig3d="compare"]');
    minis.compare = compare(fc.querySelector('[data-mini]'), opts, data, readOf(fc));
    play(plotOf(fc), v => { minis.compare.q = v; }, 2.6);
    play(plotOf(f3), v => { minis.bundles.q = v; }, 2.6);
    play(plotOf(f4), v => { minis.field.q = v; }, 2.6);
    play($('[data-mini-close]'), v => { minis.closing.q = v; }, 2.4, 'top 70%');
  } catch (err) {
    $$('[data-fig3d]').forEach(f => { f.hidden = true; });
    $$('.fig--fallback').forEach(f => { f.hidden = false; });
    $('[data-mini-close]').hidden = true;
  }

  // method 01: the sign flip as a coin, flipped by the scroll
  const coinHost = $('[data-coin]');
  if (coinHost) {
    try {
      const readEl = $('[data-coin-read]');
      const coin = createCoin({ host: coinHost, phone, reduced, read: sg => { readEl.textContent = sg > 0 ? '+1' : '−1'; coinHost.classList.toggle('is-minus', sg < 0); } });
      scrub(coinHost, v => { coin.q = v; }, 'top 85%', 'bottom 20%');
      gsap.ticker.add(() => coin.frame(performance.now() / 1000));
    } catch (err) { coinHost.hidden = true; }
  }

  const charts = {};
  const builders = { buckets: bucketsChart, curves: curvesChart, caps: capsChart, power: powerChart, funnel: funnelChart, band: bandChart, bh: bhChart, conc: concChart };
  $$('[data-fig]').forEach(fig => {
    if (fig.hidden) return;
    const k = fig.dataset.fig;
    charts[k] = makeChart(fig, builders[k](data), { phone });
    play(plotOf(fig), v => { charts[k].q = v; }, 2.6);
  });

  // method 04: the per-account points load on their own; the page does not wait for them
  const scFig = $('[data-scatter]');
  fetch('data/accounts_novdec2025.json').then(r => r.json()).then(j => {
    const sc = scatterFig(scFig, data, j.points, { phone });
    play(plotOf(scFig), v => { sc.q = v; }, 2.2);
    ScrollTrigger.refresh();
  }).catch(() => { scFig.hidden = true; });

  // option rows drive the figure in their own section
  $$('.opts').forEach(group => {
    const sec = group.closest('.sec');
    group.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
      group.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
      if (sec.id === 'finding' && minis.bundles) minis.bundles.setWindow(btn.dataset.value);
      sec.querySelectorAll('[data-fig]').forEach(f => charts[f.dataset.fig] && charts[f.dataset.fig].setOpt(group.dataset.opts, btn.dataset.value));
    }));
  });

  // 3: the counts in the sentence are printed as they are: a number that counts up is a wrong number while it runs

  // 6: rows print one after another
  buildTable($('[data-table] tbody'), data);
  const trs = $$('[data-table] tbody tr');
  play($('[data-table]'), v => trs.forEach((tr, i) => {
    const k = clamp01(v * (trs.length + 1) - i);
    tr.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
    tr.style.setProperty('--k', k.toFixed(3));
  }), 1.6, 'top 70%');

  // 7: rules draw across, then the rows can be opened
  buildClaims($('[data-claims]'));
  const rules = $$('.claim, .claims__head');
  play($('[data-claims]'), v => rules.forEach((el, i) => {
    el.style.setProperty('--r', clamp01((v - (i / rules.length) * 0.6) / 0.4).toFixed(3));
  }), 1.4, 'top 70%');

  // 8: the command types itself; copy puts it on the clipboard
  const code = $('[data-type]'), full = code.textContent;
  const copyBtn = $('[data-copy]');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(full); copyBtn.textContent = t('Copied'); }
    catch { copyBtn.textContent = t('Select and copy'); }
    setTimeout(() => { copyBtn.textContent = t('Copy'); }, 1800);
  });
  buildLinks($('[data-links]'));

  // sources and method notes fold under a 'Source' line: one tap away, out of the way
  $$('.fig__note, .tbl-note, .sig .note').forEach(n => {
    const d = document.createElement('details');
    d.className = 'src';
    d.innerHTML = `<summary>${t('Source and method')}</summary><p class="num">${n.innerHTML}</p>`;
    if (n.tagName === 'FIGCAPTION') { n.innerHTML = ''; n.appendChild(d); }
    else { n.replaceWith(d); }
  });
  // on touch the figure's reading shows after the first tap on it
  $$('.fig').forEach(f => f.addEventListener('pointerdown', () => f.classList.add('is-touched'), { passive: true }));
  // arriving: every tile rises into place as it comes up the screen, and its big number comes up
  // from its own line; both run backwards on the way up
  $$('.sec__title, .fig, .step, .tbl-wrap, .claims, .verdict, .repro, .coin').forEach(el => {
    if (el.closest('.step') && el !== el.closest('.step') && el.classList.contains('fig')) return; // a figure inside a step rides with it
    if (el.closest('.sec--close')) return; // the last screen cannot scroll far enough to finish arriving
    el.classList.add('rv');
    scrub(el, v => el.style.setProperty('--in', easeOut(v).toFixed(3)), 'top 100%', 'top 72%');
  });
  $$('.fig__big').forEach(el => play(el, v => el.style.setProperty('--nb', easeOut(v).toFixed(3)), 0.9, 'top 78%'));
  ScrollTrigger.refresh();
  return minis;
}
