/* ============================================================================
   Render sweep. Requires Playwright, which this repo does not depend on, so it
   borrows the copy in the finplatform tooling next door:

     python -m http.server 8099          # from the site root
     NODE_PATH=../../../finplatform/_tooling/node_modules node sweep.cjs

   Override the target with PQ_URL. Screenshots land beside this file.

   What it holds the page to, at 1440 / 1039 / 390 and under reduced motion:
     - a clean console, and no uncaught errors
     - no horizontal overflow from this page's own content (shared site chrome
       is reported separately, since a 2px .site-nav overflow is pre-existing
       and affects every page on the site)
     - every data-driven region actually filled
     - four charts, each with an accessible name and no NaN geometry
     - no card face clipped, at any width
     - the ledger rail swaps to the mobile strip at 1040px, and tracks scroll
     - card flips, both router presets, slider recomputation, zero subscribers
     - reduced motion renders a complete static page, nothing stuck invisible
   ============================================================================ */
const { chromium } = require('playwright');
const path = require('path');

const URL = process.env.PQ_URL || 'http://127.0.0.1:8099/work/price-of-a-question/';
const OUT = __dirname;
let fails = 0;
const ok = (n, c, extra) => {
  if (!c) fails++;
  console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c || extra === undefined ? '' : `\n          ${extra}`}`);
};

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'rail-boundary', width: 1039, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

(async () => {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [], warnings = [];
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.type() === 'warning') warnings.push(m.text());
    });
    page.on('pageerror', e => errors.push('UNCAUGHT: ' + e.message));

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    ok('no console errors', errors.length === 0, errors.slice(0, 4).join('\n          '));
    ok('no console warnings', warnings.length === 0, warnings.slice(0, 3).join('\n          '));

    // No horizontal body scroll at any width. Attribute any overflow to the
    // element causing it, so a shared-chrome bug is not blamed on this page.
    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const culprits = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 0.5 && !el.closest('[style*="overflow"], .tl-scroll, .chart-wrap')) {
          culprits.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), inChrome: !!el.closest('.site-header, .site-footer') });
        }
      });
      return {
        scrollW: document.documentElement.scrollWidth,
        clientW: vw,
        fromPage: culprits.filter(c => !c.inChrome).map(c => c.sel),
        fromChrome: [...new Set(culprits.filter(c => c.inChrome).map(c => c.sel))]
      };
    });
    ok('no overflow from this page\'s own content', overflow.fromPage.length === 0,
      overflow.fromPage.slice(0, 5).join(', '));
    if (overflow.fromChrome.length) {
      console.log(`  NOTE  shared site chrome overflows by ${overflow.scrollW - overflow.clientW}px: ${overflow.fromChrome.join(', ')} (pre-existing, not this page)`);
    }

    // Every data-driven region actually filled.
    const filled = await page.evaluate(() => {
      const ids = ['seatRates', 'tlBody', 'deckModels', 'deckHardware', 'deckData', 'belt',
        'simSteps', 'tree', 'calcCtls', 'calcKpis', 'chartComposition', 'chartMargin',
        'chartPerUser', 'chartCrossover', 'rigKpis', 'fails', 'gates'];
      return ids.filter(id => {
        const el = document.getElementById(id);
        return !el || el.children.length === 0;
      });
    });
    ok('every data-driven region rendered', filled.length === 0, 'empty: ' + filled.join(', '));

    const charts = await page.evaluate(() =>
      [...document.querySelectorAll('svg.chart')].map(s => ({
        label: (s.getAttribute('aria-label') || '').length,
        nan: /NaN|Infinity/.test(s.outerHTML)
      })));
    ok('four charts present', charts.length === 4, `found ${charts.length}`);
    ok('all charts have accessible names', charts.every(c => c.label > 40));
    ok('no NaN in rendered chart geometry', charts.every(c => !c.nan));

    // The rail is the signature; it must swap at 1040px.
    // Both faces of every card must fit. A clipped "Cannot" list reads as a
    // rendering bug, not as a scroll region.
    const clipped = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.pq .card').forEach(card => {
        card.querySelectorAll('.face').forEach(face => {
          const sc = face.querySelector('.c-scroll');
          // .c-ghost bleeds past the edge by design and is clipped; exclude it,
          // or every card reads as permanently overflowing.
          const ghost = face.querySelector('.c-ghost');
          if (ghost) ghost.style.display = 'none';
          if (sc) { sc.style.overflow = 'visible'; sc.style.flex = 'none'; }
          if (face.scrollHeight > face.clientHeight + 1) {
            bad.push((card.querySelector('.c-name') || {}).textContent + ' / ' +
              (face.classList.contains('back') ? 'back' : 'front') +
              ' needs ' + face.scrollHeight + ' has ' + face.clientHeight);
          }
          if (sc) { sc.style.overflow = ''; sc.style.flex = ''; }
          if (ghost) ghost.style.display = '';
        });
      });
      return bad;
    });
    ok('no card face is clipped', clipped.length === 0, clipped.slice(0, 4).join('\n          '));

    const rail = await page.evaluate(() => {
      const d = getComputedStyle(document.querySelector('.rail-ledger')).display;
      const m = getComputedStyle(document.querySelector('.rail-mobile')).display;
      return { desktop: d, mobile: m };
    });
    if (vp.width >= 1040) {
      ok('sticky ledger rail visible', rail.desktop !== 'none', JSON.stringify(rail));
      ok('mobile strip hidden', rail.mobile === 'none', JSON.stringify(rail));
    } else {
      ok('sticky ledger rail hidden', rail.desktop === 'none', JSON.stringify(rail));
      ok('mobile strip visible', rail.mobile !== 'none', JSON.stringify(rail));
    }

    await page.screenshot({ path: path.join(OUT, `pq-${vp.name}.png`), fullPage: false });

    if (vp.name === 'desktop') {
      // --- card flip ---
      const card = page.locator('#deckModels .card').first();
      await card.click();
      await page.waitForTimeout(700);
      ok('card flips on click', await card.evaluate(el => el.classList.contains('flipped')));
      ok('flipped card reports pressed state', await card.getAttribute('aria-pressed') === 'true');
      await card.click();
      await page.waitForTimeout(700);

      // --- router simulator: the no-leakage preset ---
      await page.click('[data-preset="leak"]');
      await page.waitForTimeout(900);
      const leak = await page.evaluate(() => ({
        served: document.getElementById('simServed').textContent,
        steps: document.querySelectorAll('#simSteps .step').length,
        shown: document.querySelectorAll('#simSteps .step.shown').length
      }));
      ok('router trace renders all steps', leak.steps >= 6, JSON.stringify(leak));
      ok('trace animation completes', leak.shown === leak.steps, JSON.stringify(leak));
      ok('picking Qwen never serves Sonnet', !/Sonnet|LARGE/.test(leak.served), leak.served);

      // --- router simulator: the budget clamp preset ---
      await page.click('[data-preset="clamp"]');
      await page.waitForTimeout(900);
      const clamp = await page.evaluate(() => ({
        served: document.getElementById('simServed').textContent,
        reason: document.getElementById('simReason').hidden ? null
          : document.getElementById('simReason').textContent
      }));
      ok('budget clamp degrades the model', /Local|LOCAL/.test(clamp.served), clamp.served);
      ok('clamp explains itself in plain language', !!clamp.reason, String(clamp.reason));

      // --- the bill: sliders recompute ---
      const before = await page.textContent('#calcKpis');
      await page.evaluate(() => {
        const el = document.getElementById('cc_member');
        el.value = String(Number(el.max));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(300);
      const after = await page.textContent('#calcKpis');
      ok('moving a slider recomputes the bill', before !== after);

      // Zero subscribers is reachable; it must not blow up.
      await page.evaluate(() => {
        ['cc_member', 'cc_analyst', 'cc_options'].forEach(id => {
          const el = document.getElementById(id);
          el.value = '0';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await page.waitForTimeout(300);
      const zeroErrs = errors.length;
      ok('zero subscribers does not throw', zeroErrs === 0, errors.slice(-2).join(' | '));

      // --- an estimate opens its arithmetic ---
      const estBtn = page.locator('button.n.e').first();
      await estBtn.click();
      await page.waitForTimeout(200);
      ok('an estimate opens its derivation',
        await estBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true'));

      // --- rail tracks scroll ---
      // main.css sets html{scroll-behavior:smooth}, so wait for the scroll to
      // actually settle rather than racing a 9,000px animation.
      await page.evaluate(() => document.getElementById('rig').scrollIntoView());
      await page.waitForFunction(() => {
        const y = window.scrollY;
        if (window.__lastY === y) return true;
        window.__lastY = y;
        return false;
      }, null, { timeout: 8000, polling: 120 });
      await page.waitForTimeout(250);
      const railOn = await page.evaluate(() => {
        const a = document.querySelector('.rail-ledger a.on');
        return a ? a.getAttribute('data-act') : null;
      });
      ok('ledger rail follows the scroll position', railOn === 'rig', String(railOn));

      // The unit flips from one question to one month at the calculator.
      const label = await page.textContent('#rlLabel');
      ok('rail switches unit past the calculator', /month/.test(label), label);

      await page.screenshot({ path: path.join(OUT, 'pq-desktop-interacted.png'), fullPage: false });
    }

    await ctx.close();
  }

  // --- reduced motion: a complete, correct, static page ---
  console.log('\n=== prefers-reduced-motion: reduce ===');
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce'
  });
  const page = await ctx.newPage();
  const rmErrors = [];
  page.on('pageerror', e => rmErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') rmErrors.push(m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  ok('no errors under reduced motion', rmErrors.length === 0, rmErrors.slice(0, 3).join(' | '));

  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal]')]
      .filter(el => getComputedStyle(el).opacity === '0').length);
  ok('nothing stays invisible when motion is off', hidden === 0, `${hidden} elements at opacity 0`);

  await page.click('[data-preset="clamp"]');
  await page.waitForTimeout(150);
  const rmSteps = await page.evaluate(() => ({
    total: document.querySelectorAll('#simSteps .step').length,
    shown: document.querySelectorAll('#simSteps .step.shown').length
  }));
  ok('router trace shows instantly, not stepped', rmSteps.total > 0 && rmSteps.shown === rmSteps.total,
    JSON.stringify(rmSteps));

  await page.screenshot({ path: path.join(OUT, 'pq-reduced-motion.png'), fullPage: false });
  await ctx.close();

  await browser.close();
  console.log('\n' + (fails ? `${fails} CHECK(S) FAILED` : 'RENDER SWEEP CLEAN'));
  process.exit(fails ? 1 : 0);
})();
