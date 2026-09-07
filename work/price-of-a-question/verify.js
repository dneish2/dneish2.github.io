/* ============================================================================
   node verify.js

   This page makes quantitative claims, so the claims are tested. The harness
   loads data.js and app.js under a minimal DOM shim (readyState stays
   'loading', so boot() never runs) and exercises the pure functions behind the
   two toys.

   What it holds the page to:
     - the router simulator matches Router.route()'s real ordering, including a
       672-combination sweep of the no-leakage invariant
     - the credit weights, role ceilings, and daily clamps match credits.py
     - the economics reconcile with docs/MONETIZATION_ECONOMICS.md
     - every chart renders, is well-formed, has an accessible name, and emits no
       NaN, including at zero subscribers
     - every figure in data.js is tagged measured (with a source) or estimated
       (with its arithmetic)

   If a finplatform constant changes, this is what tells you the page went
   stale. Run it before publishing.
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

global.window = { matchMedia: () => ({ matches: false }) };
global.document = {
  readyState: 'loading',
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => []
};

for (const f of ['data.js', 'app.js']) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  (0, eval)(src);
}

const D = window.PQ;
const T = window.__PQ_TEST;
let fails = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`));
}
function served(o) { return T.route(o).served; }

console.log('\n=== ROUTER: tier defaults (TASK_TIER, tiers.py:17-32) ===');
// Analyst has a T3 ceiling and plenty of budget, so the task default shows through.
check('CLASSIFY -> T1', served({ role: 'analyst', pick: 'auto', task: 'CLASSIFY', spend: 0 }), 'T1');
check('NARRATIVE -> T2', served({ role: 'analyst', pick: 'auto', task: 'NARRATIVE', spend: 0 }), 'T2');
check('COMPETITIVE_SYNTH -> T3', served({ role: 'analyst', pick: 'auto', task: 'COMPETITIVE_SYNTH', spend: 0 }), 'T3');
check('PRIVATE_EXTRACT pinned up to T2', served({ role: 'analyst', pick: 'auto', task: 'PRIVATE_EXTRACT', spend: 0 }), 'T2');

console.log('\n=== ROUTER: role ceiling (ROLE_MAX_TIER, credits.py:50-58) ===');
check('free cannot reach T3', served({ role: 'free', pick: 'auto', task: 'INVESTMENT_THESIS', spend: 0 }), 'T1');
check('member caps at T2', served({ role: 'member', pick: 'auto', task: 'INVESTMENT_THESIS', spend: 0 }), 'T2');
check('analyst reaches T3', served({ role: 'analyst', pick: 'auto', task: 'INVESTMENT_THESIS', spend: 0 }), 'T3');
check('options reaches T3', served({ role: 'options', pick: 'auto', task: 'INVESTMENT_THESIS', spend: 0 }), 'T3');

console.log('\n=== ROUTER: explicit pick is a HARD CAP (router.py:_desired_tier) ===');
check('analyst picks qwen on a thesis -> T1, not T3',
  served({ role: 'analyst', pick: 'open-qwen', task: 'INVESTMENT_THESIS', spend: 0 }), 'T1');
check('analyst picks haiku on a thesis -> T2',
  served({ role: 'analyst', pick: 'haiku', task: 'INVESTMENT_THESIS', spend: 0 }), 'T2');

console.log('\n=== ROUTER: access gate (ModelChoice.min_role, tiers.py:101-108) ===');
check('free cannot pick sonnet, falls to plan default',
  served({ role: 'free', pick: 'sonnet', task: 'NARRATIVE', spend: 0 }), 'T1');
check('member cannot pick sonnet',
  served({ role: 'member', pick: 'sonnet', task: 'COMPETITIVE_SYNTH', spend: 0 }), 'T2');

console.log('\n=== ROUTER: budget clamp (ROLE_DAILY_BUDGET_USD, credits.py:66-74) ===');
// Options: $0.50/day. A Sonnet call is $0.011, so $0.49 + $0.011 > $0.50 clamps.
check('options at $0.49 clamps a Sonnet call to T1',
  served({ role: 'options', pick: 'sonnet', task: 'COMPETITIVE_SYNTH', spend: 0.49 }), 'T1');
check('options at $0.40 does not clamp',
  served({ role: 'options', pick: 'sonnet', task: 'COMPETITIVE_SYNTH', spend: 0.40 }), 'T3');
check('clamp degrades, never blocks (an answer is still served)',
  T.route({ role: 'options', pick: 'sonnet', task: 'COMPETITIVE_SYNTH', spend: 0.49 }).served !== null, true);

console.log('\n=== ROUTER: the no-leakage invariant (router.py:227-237) ===');
// The whole point: an explicit cheap pick can never become an expensive call,
// even when the provider is down and fallback would otherwise step upward.
const leakRoles = ['free', 'member', 'analyst', 'options'];
const leakTasks = Object.keys(D.taskTier);
let leaked = [];
for (const role of leakRoles) {
  for (const task of leakTasks) {
    for (const spend of [0, 0.2, 0.49]) {
      for (const down of [false, true]) {
        for (const cached of [false, true]) {
          const r = T.route({ role, pick: 'open-qwen', task, spend, cached, down });
          if (T.RANK[r.served] > T.RANK.T1) leaked.push({ role, task, spend, down, cached, got: r.served });
        }
      }
    }
  }
}
check('picking Qwen never serves above T1, across ' +
  (leakRoles.length * leakTasks.length * 3 * 2 * 2) + ' combinations', leaked, []);

console.log('\n=== ROUTER: fallback cycle terminates (TIER_FALLBACK T1<->T2) ===');
check('provider down on a T1 auto call lands somewhere real',
  ['T0', 'T1', 'T2'].includes(served({ role: 'free', pick: 'auto', task: 'CLASSIFY', spend: 0, down: true })), true);
let hung = false;
for (const role of leakRoles) for (const task of leakTasks) for (const pick of ['auto', 'open-qwen', 'haiku', 'sonnet']) {
  try { T.route({ role, pick, task, spend: 0, down: true }); } catch (e) { hung = true; }
}
check('no fallback walk throws or hangs', hung, false);

console.log('\n=== ROUTER: cache hit is free (llm/cache.py) ===');
const cr = T.route({ role: 'analyst', pick: 'sonnet', task: 'COMPETITIVE_SYNTH', spend: 0, cached: true });
check('cached call charges 0 credits', cr.credits, 0);
check('cached call charges $0', cr.usd, 0);

console.log('\n=== CREDITS: weights match credits.py:83-89 ===');
check('T0=0 T1=1 T2=2 T3=5 T3D=10',
  D.tiers.map(t => t.credits.value), [0, 1, 2, 5, 10]);

console.log('\n=== ECONOMICS: reconcile against MONETIZATION_ECONOMICS.md ===');
// Pro alone: 40 credits = 20 Haiku actions/mo worst case.
Object.assign(T.calc, { member: 100, analyst: 0, options: 0, freeRatio: 0, actionsPerDay: 6, cacheHit: 0, t1: 'haiku' });
const proOnly = T.economicsAt(T.scaleCounts(1));
const proModelPerUser = proOnly.model / 100;
check('Pro worst-case model COGS/user = 20 actions x $0.002 = $0.04',
  +proModelPerUser.toFixed(4), 0.04);

// Analyst: 120 credits = 24 Sonnet actions/mo.
Object.assign(T.calc, { member: 0, analyst: 100, options: 0, freeRatio: 0, actionsPerDay: 6, cacheHit: 0 });
const anOnly = T.economicsAt(T.scaleCounts(1));
check('Analyst worst-case model COGS/user = 24 x $0.011 = $0.264',
  +(anOnly.model / 100).toFixed(4), 0.264);

// Options: 300 credits = 60 Sonnet actions/mo => the doc's "~$1.80 on $24".
Object.assign(T.calc, { member: 0, analyst: 0, options: 100, freeRatio: 0, actionsPerDay: 6, cacheHit: 0 });
const opOnly = T.economicsAt(T.scaleCounts(1));
check('Options worst-case model COGS/user = 60 x $0.011 = $0.66 (doc quotes ~$1.80 at $0.03/call)',
  +(opOnly.model / 100).toFixed(4), 0.66);

console.log('\n=== ECONOMICS: search is capped and saturating ===');
check('search never exceeds the $7.92 cap', T.searchCost(1e9) <= D.econ.searchCapMonthly.value + 0.01, true);
const s10 = T.searchCost(10), s100 = T.searchCost(100), s10k = T.searchCost(10000);
check('search rises with users', s10 < s100 && s100 < s10k, true);
check('search flattens: 100->10k users adds less than 10x',
  (s10k / s100) < 10, true);
console.log(`          search @10 users  ${s10.toFixed(3)}`);
console.log(`          search @100      ${s100.toFixed(3)}`);
console.log(`          search @10,000   ${s10k.toFixed(3)}  (cap ${D.econ.searchCapMonthly.value})`);

console.log('\n=== ECONOMICS: break-even (doc says 3 to 6 Pro subscribers) ===');
Object.assign(T.calc, { member: 100, analyst: 0, options: 0, freeRatio: 0, actionsPerDay: 0.8, cacheHit: 35, t1: 'haiku' });
const bePro = T.findBreakEven();
console.log(`          Pro-only break-even: ${bePro} subscribers`);
check('Pro-only break-even lands in 2 to 8', bePro >= 2 && bePro <= 8, true);

console.log('\n=== ECONOMICS: cost per subscriber falls with scale ===');
Object.assign(T.calc, { member: 60, analyst: 25, options: 10, freeRatio: 4, actionsPerDay: 0.8, cacheHit: 35 });
const base = 95;
const per = [5, 50, 500, 1000].map(n => {
  const ec = T.economicsAt(T.scaleCounts(n / base));
  return +(ec.cogs / n).toFixed(4);
});
console.log(`          $/subscriber at 5, 50, 500, 1000: ${per.join('  ')}`);
check('per-subscriber cost is monotonically falling',
  per[0] > per[1] && per[1] > per[2] && per[2] > per[3], true);

console.log('\n=== ECONOMICS: the Options negative-margin case ===');
// The page claims the verdict flips with prompt size, not call count.
const typical = 30 * 30 * D.econ.typicalCallUsd.value;
const heavy = 30 * 30 * D.econ.heavyCallUsd.value;
console.log(`          30 calls/day at the typical rate = $${typical.toFixed(2)}/mo`);
console.log(`          30 calls/day at the heavy rate   = $${heavy.toFixed(2)}/mo  vs $24 revenue`);
check('typical-size usage stays under the $24 price', typical < 24, true);
check('heavy-size usage goes over it', heavy > 24, true);
check('the heavy figure reconciles with the doc\'s ~$27', Math.round(heavy), 27);
// The shipped clamp: $0.50/day.
check('the daily clamp bounds it to about $15/mo',
  +(D.roleById.options.daily.value * 30).toFixed(2), 15.00);
check('the clamp sits below the price, so the plan cannot lose money',
  D.roleById.options.daily.value * 30 < 24, true);

console.log('\n=== CROSSOVER: hardware arithmetic ===');
const gpu = D.crossover.options.find(o => o.id === 'gpu5090');
const xc = gpu.monthly / D.crossover.perCall.value;
console.log(`          5090 $${gpu.monthly}/mo / $0.002 per call = ${xc.toLocaleString()} calls/mo`);
check('crossover is about 48,000 calls', Math.round(xc / 1000), 48);
check('in Pro subscribers, about 2,400', Math.round(xc / D.crossover.callsPerProSubscriber.value / 100) * 100, 2400);

console.log('\n=== LEDGER: derived hourly rates match the stated arithmetic ===');
const assoc = D.seatById.assoc;
check('associate band = 130k-160k x1.35 / 2600 = $68-$83', assoc.rate, [68, 83]);
check('every task row has both a human and a machine price',
  D.tasks.every(t => typeof t.humanUsd === 'number' && typeof t.machineUsd === 'number'), true);
check('exactly the T0 rows are genuinely free',
  D.tasks.filter(t => t.tier === 'T0').length, 2);
check('T1 rows have no API invoice but still draw a credit',
  D.tasks.filter(t => t.tier === 'T1').every(t => t.machineUsd === 0 && t.credits === 1), true);

console.log('\n=== CHART GEOMETRY: the reason the charts are split ===');
Object.assign(T.calc, { member: 60, analyst: 25, options: 10, freeRatio: 4, actionsPerDay: 0.8, cacheHit: 35, t1: 'haiku' });
const bigEnd = T.economicsAt(T.scaleCounts(1000 / 95));
const ratio = bigEnd.revenue / bigEnd.cogs;
console.log(`          at 1,000 subscribers: revenue $${bigEnd.revenue.toFixed(0)} vs cost $${bigEnd.cogs.toFixed(0)} (${ratio.toFixed(0)}x)`);
check('revenue outruns cost by >20x, so a shared linear axis would flatten the cost stack',
  ratio > 20, true);

// Every band must stay visible in the composition chart.
const bands = { infra: bigEnd.infra, search: bigEnd.search, model: bigEnd.cogs - bigEnd.infra - bigEnd.search };
const smallest = Math.min(...Object.values(bands)) / bigEnd.cogs;
console.log(`          bands at 1,000: infra $${bands.infra.toFixed(0)}, search $${bands.search.toFixed(2)}, model $${bands.model.toFixed(0)}`);
check('every cost band is a visible share (>2% of total) at full scale', smallest > 0.02, true);
check('all three bands are positive', Object.values(bands).every(v => v > 0), true);

// Crossover chart: the two highest lines must not collide at the right edge.
const maxX = 500000, perCall = D.crossover.perCall.value;
const payAt = maxX * perCall;
const h100 = D.crossover.options.find(o => o.id === 'h100').monthly;
const lo = Math.log10(1), hi = Math.log10(3000);
const sep = Math.abs(Math.log10(payAt) - Math.log10(h100)) / (hi - lo);
console.log(`          at 500k calls: pay-per-call $${payAt} vs H100 $${h100}, ${(sep * 100).toFixed(1)}% of plot height apart`);
check('the two top crossover lines separate by >4% of plot height (labels will not collide)', sep > 0.04, true);
check('the crossover point sits inside the plotted range',
  (gpu.monthly / perCall) > 1000 && (gpu.monthly / perCall) < maxX, true);

console.log('\n=== CHARTS: each builder renders without throwing ===');
for (const [name, fn] of Object.entries(T.charts)) {
  let svg = null, err = null;
  try { svg = fn(); } catch (e) { err = e.message; }
  check(`${name} renders`, err, null);
  if (svg) {
    check(`${name} is well-formed svg`, /^<svg[\s\S]*<\/svg>$/.test(svg.trim()), true);
    check(`${name} has an accessible name`, /aria-label="[^"]{40,}"/.test(svg), true);
    check(`${name} emits no NaN coordinates`, /NaN|Infinity/.test(svg), false);
  }
}
// The edge case most likely to produce NaN: an empty subscriber base.
Object.assign(T.calc, { member: 0, analyst: 0, options: 0 });
for (const [name, fn] of Object.entries(T.charts)) {
  let err = null, svg = null;
  try { svg = fn(); } catch (e) { err = e.message; }
  check(`${name} survives zero subscribers`, err, null);
  if (svg) check(`${name} emits no NaN at zero`, /NaN|Infinity/.test(svg), false);
}
Object.assign(T.calc, { member: 60, analyst: 25, options: 10 });

console.log('\n=== PROVENANCE: every number is tagged ===');
function walk(o, hits) {
  if (!o || typeof o !== 'object') return hits;
  if (o.kind === 'm' || o.kind === 'e') {
    hits.push(o);
    if (o.kind === 'm' && !o.src) hits.untagged = true;
    if (o.kind === 'e' && !o.why) hits.untagged = true;
    return hits;
  }
  for (const k of Object.keys(o)) walk(o[k], hits);
  return hits;
}
const all = walk(D, []);
const measured = all.filter(x => x.kind === 'm').length;
const estimated = all.filter(x => x.kind === 'e').length;
console.log(`          ${measured} measured, ${estimated} estimated, ${all.length} total`);
check('no measured value is missing its source, no estimate its arithmetic', !!all.untagged, false);

console.log('\n' + (fails ? `${fails} CHECK(S) FAILED` : 'ALL CHECKS PASSED'));
process.exit(fails ? 1 : 0);
