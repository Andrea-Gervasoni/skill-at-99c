// Sign-randomization null for one trader, computed in the page (hero_sim in site_data.json).
// One unit stake per event: a win at price q pays 1 - q, a loss costs q.
// p is the paper's mid-p: (draws above the observed total + 0.5 * ties) / B.

export const B = 1000;
export const EVENTS = 20;
export const SEED = 20261031;

export const STATES = {
  fav99: { q: 0.99, losses: 0 },
  fav99loss: { q: 0.99, losses: 1 },
  fair50: { q: 0.5, losses: null } // outcomes drawn as fair coins from the same stream
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Totals are kept in integer cents so ties are exact.
export function heroSim(key) {
  const { q, losses } = STATES[key];
  const rand = mulberry32(SEED + Math.round(q * 1000));
  const win = Math.round((1 - q) * 100);
  const loss = -Math.round(q * 100);

  const profits = [];
  for (let i = 0; i < EVENTS; i++) {
    const won = losses === null ? rand() < q : i >= losses;
    profits.push(won ? win : loss);
  }
  const observed = profits.reduce((a, b) => a + b, 0);

  const totals = new Int32Array(B);
  let greater = 0, ties = 0;
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < EVENTS; i++) s += rand() < 0.5 ? -profits[i] : profits[i];
    totals[b] = s;
    if (s > observed) greater++;
    else if (s === observed) ties++;
  }
  const p = (greater + 0.5 * ties) / B;
  const sorted = Float64Array.from(totals).sort();
  const p95 = sorted[Math.ceil(0.95 * B) - 1];
  const verdict = p < 0.05 ? 'skilled' : p > 0.95 ? 'anti-skilled' : 'none';
  return {
    key, q, profits, totals, greater, ties,
    observed: observed / 100, p, p95: p95 / 100, verdict,
    wins: profits.filter(v => v > 0).length
  };
}
