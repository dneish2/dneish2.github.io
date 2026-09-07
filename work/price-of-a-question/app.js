/* =============================================================================
   The Price of a Question — behaviour.

   No dependencies. Loads after data.js, reads PQ, renders every data-driven
   region, and runs the two toys.

   Chart palettes were validated against the dark surface (#171512) with the
   dataviz six-checks validator: all pass.
     stacked fills  #A0524F infra, #4E86C4 search, #B8842B model
     revenue        #5D9B4A  (status line, distinguished by mark type + label)
     crossover      #B8842B, #4E86C4, #A0524F, #2FA57C
   ============================================================================= */
(function () {
  'use strict';

  var D = window.PQ;
  if (!D) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var C = {
    model: '#B8842B',
    search: '#4E86C4',
    infra: '#A0524F',
    revenue: '#5D9B4A',
    accent: '#E3A83B',
    ink: '#EDE8DE',
    muted: '#ACA599',
    danger: '#C4574B',
    line: 'rgba(237,232,222,0.16)'
  };

  /* ── tiny helpers ─────────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function usd(v, dp) {
    if (v === null || v === undefined) return '—';
    var d = dp === undefined ? (v < 1 ? 3 : 2) : dp;
    return '$' + v.toFixed(d);
  }
  function money(v) {
    if (v >= 1000) return '$' + Math.round(v).toLocaleString();
    if (v >= 10) return '$' + v.toFixed(0);
    return '$' + v.toFixed(2);
  }

  // Render one provenance-tagged number. This is the only place the marker
  // glyph is decided, and it is decided by `kind`, never by hand.
  var whyId = 0;
  function num(entry, opts) {
    if (!entry) return '';
    opts = opts || {};
    var v = entry.value;
    var shown = opts.text !== undefined ? opts.text
      : (typeof v === 'number'
        ? (entry.unit === 'usd' || (entry.unit || '').indexOf('usd') === 0 ? usd(v) : v.toLocaleString())
        : v);
    if (opts.suffix) shown += opts.suffix;
    else if (entry.unit && entry.unit !== 'usd' && entry.unit.indexOf('usd') !== 0) shown += ' ' + entry.unit;

    if (entry.kind === 'm') {
      var t = entry.src + (entry.note ? ' · ' + entry.note : '');
      return '<span class="n m" title="' + esc(t) + '">' + esc(shown) + '</span>';
    }
    // An estimate you can open.
    var id = 'why' + (++whyId);
    return '<button class="n e" type="button" aria-expanded="false" aria-controls="' + id + '" data-why="' + id + '">'
      + esc(shown) + '</button>'
      + '<span class="why" id="' + id + '" role="note">' + esc(entry.why || '')
      + (entry.note ? ' (' + esc(entry.note) + ')' : '') + '</span>';
  }

  // Delegated toggle for every estimate on the page.
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button[data-why]') : null;
    if (!b) return;
    var box = document.getElementById(b.getAttribute('data-why'));
    if (!box) return;
    var open = box.classList.toggle('open');
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ── reveals ──────────────────────────────────────────────────────────── */
  function initReveals() {
    var els = $$('[data-reveal]');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ── the ledger rail ──────────────────────────────────────────────────── */
  var ACT_ORDER = ['question', 'ledger', 'deck', 'line', 'tree', 'bill', 'rig', 'broke'];
  var ACT_NAMES = {
    question: 'The question', ledger: 'The task ledger', deck: 'The deck', line: 'The line',
    tree: 'The tree', bill: 'The bill', rig: 'The rig', broke: 'What broke'
  };
  var railState = { act: 'question', monthly: null };

  function paintRail() {
    var idx = ACT_ORDER.indexOf(railState.act);
    $$('.rail-ledger a').forEach(function (a) {
      var i = ACT_ORDER.indexOf(a.getAttribute('data-act'));
      a.classList.toggle('on', i === idx);
      a.classList.toggle('spent', i < idx);
    });
    // The unit changes at the calculator: one question becomes one month.
    var total = $('#rlTotal'), label = $('#rlLabel');
    var mTotal = $('.rail-mobile .m-total'), mLabel = $('.rail-mobile .m-label'), mAct = $('.rail-mobile .m-act');
    var isBusiness = idx >= ACT_ORDER.indexOf('bill') && railState.monthly !== null;
    var tText = isBusiness ? money(railState.monthly) : usd(D.coldOpen.machine.total);
    var lText = isBusiness ? 'to run it for a month' : 'to answer one question';
    if (total) total.textContent = tText;
    if (label) label.textContent = lText;
    if (mTotal) mTotal.textContent = tText;
    if (mLabel) mLabel.textContent = isBusiness ? 'per month' : 'one question';
    if (mAct) mAct.textContent = ACT_NAMES[railState.act] || '';
  }

  // Which act the reader is actually in. Computed from geometry rather than
  // from IntersectionObserver entry order: a jump (a rail click, a hash load)
  // fires several entries in one callback, and "last entry wins" is not
  // deterministic about which one that is.
  function activeAct() {
    var mid = window.innerHeight * 0.4;
    var best = ACT_ORDER[0];
    for (var i = 0; i < ACT_ORDER.length; i++) {
      var el = document.getElementById(ACT_ORDER[i]);
      if (el && el.getBoundingClientRect().top <= mid) best = ACT_ORDER[i];
    }
    return best;
  }

  function initRail() {
    paintRail();
    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        var next = activeAct();
        if (next !== railState.act) { railState.act = next; paintRail(); }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ── 00 · cold open ───────────────────────────────────────────────────── */
  function renderColdOpen() {
    var co = D.coldOpen;
    var seat = D.seatById[co.human.seat];
    var humanUsd = seat.mid * (co.human.minutes / 60);

    $('#cpHuman').textContent = '$' + Math.round(humanUsd).toLocaleString();
    $('#cpMachine').textContent = usd(co.machine.total);

    $('#cpHumanBd').innerHTML =
      '<div><span>fully loaded rate</span><span>' + num({
        value: seat.mid, unit: 'usd', kind: 'e',
        why: '$' + seat.base[0] + 'k to $' + seat.base[1] + 'k base, × 1.35 loaded, ÷ 2,600 desk hours; midpoint taken'
      }, { text: '$' + seat.mid + '/hr' }) + '</span></div>'
      + '<div><span>time on task</span><span>' + num({
        value: 4, unit: '', kind: 'e', why: 'a full research note is most of a working day for one associate'
      }, { text: '4 hours' }) + '</span></div>';

    $('#cpMachineBd').innerHTML =
      '<div><span>search</span><span>' + num(co.machine.search) + '</span></div>'
      + '<div><span>model</span><span>' + num(co.machine.model) + '</span></div>'
      + '<div><span>elapsed</span><span>' + num(co.machine.elapsed) + '</span></div>'
      + '<div><span>charged to the user</span><span>' + co.machine.charged.credits + ' credits</span></div>';
  }

  /* ── 01 · task ledger ─────────────────────────────────────────────────── */
  function renderLedger() {
    $('#seatRates').innerHTML = D.hourly.seats.map(function (s) {
      return '<div><div class="sr-l">' + esc(s.label) + '</div><div class="sr-v">'
        + num({
          value: s.mid, unit: 'usd', kind: 'e',
          why: '$' + s.base[0] + 'k to $' + s.base[1] + 'k base × 1.35 ÷ 2,600 hours = $'
            + s.rate[0] + ' to $' + s.rate[1] + '/hr; midpoint shown'
        }, { text: '$' + s.mid + '/hr' })
        + '</div></div>';
    }).join('');

    $('#tlBody').innerHTML = D.tasks.map(function (t) {
      var tier = D.tierById[t.tier];
      // Only a T0 action is genuinely free. A local-model call has no API
      // invoice, but it still draws a credit, so it is not "free" and the
      // ledger must not say so.
      var free = t.tier === 'T0';
      var machineEntry = t.cogs || tier.perCall;
      return '<tr' + (free ? ' class="free"' : '') + '>'
        + '<td class="t-task">' + esc(t.task)
        + (t.note ? '<span class="t-note">' + esc(t.note) + '</span>' : '') + '</td>'
        + '<td>' + esc(t.seatLabel) + '</td>'
        + '<td class="t-num">' + num({
          value: t.humanUsd, unit: 'usd', kind: 'e',
          why: t.minutes + ' minutes at $' + D.seatById[t.seat].mid + '/hr'
        }, { text: '$' + t.humanUsd.toFixed(0) }) + '</td>'
        + '<td class="t-surface">' + esc(t.surface) + '</td>'
        + '<td><span class="tier-chip" data-t="' + t.tier + '">' + esc(tier.name.replace(/_/g, ' ')) + '</span></td>'
        + '<td class="t-num">' + num(tier.credits, { text: String(t.credits) }) + '</td>'
        + '<td class="t-machine">' + num(machineEntry, {
          text: free ? 'free' : (t.tier === 'T1' ? 'no invoice' : usd(t.machineUsd, t.machineUsd < 0.01 ? 3 : 2))
        }) + '</td>'
        + '</tr>';
    }).join('');
  }

  /* ── 02 · the deck ────────────────────────────────────────────────────── */
  function cardHTML(c, ghost) {
    var cls = 'card' + (c.dead ? ' dead' : '') + (c.chosen ? ' chosen' : '');
    var sub = c.subtitle || (c.tier ? D.tierById[c.tier].label : '') || '';
    var cliff = '';
    if (c.priceCliff) {
      var days = Math.round((new Date(c.priceCliff.date) - new Date()) / 86400000);
      cliff = '<div class="cliff"><b>Intro pricing ends ' + esc(c.priceCliff.date) + '</b>'
        + (days > 0 ? ' (' + days + ' days)' : ' (expired)')
        + '<br>' + usd(c.priceCliff.before.value) + ' → ' + usd(c.priceCliff.after.value)
        + ' per call.<br>' + esc(c.priceCliff.escapeHatch) + '</div>';
    }
    return '<div class="card-slot">'
      + '<button class="' + cls + '" type="button" aria-pressed="false">'
      + '<div class="face front">'
      + (ghost ? '<span class="c-ghost" aria-hidden="true">' + esc(ghost) + '</span>' : '')
      + '<div class="c-name">' + esc(c.name) + '</div>'
      + '<div class="c-sub">' + esc(sub) + '</div>'
      + '<ul class="c-stats">' + c.stats.map(function (s) {
        return '<li><span class="k">' + esc(s.k) + '</span><span class="v">' + num(s.v) + '</span></li>';
      }).join('') + '</ul>'
      + '<div class="c-flip"><span>What it cannot do</span><span aria-hidden="true">↻</span></div>'
      + '</div>'
      + '<div class="face back">'
      + '<div class="c-name">' + esc(c.name) + '</div>'
      + '<div class="c-scroll">'
      + '<div class="c-head can">Can</div>'
      + '<ul class="c-list c-can">' + c.can.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
      + '<div class="c-head cant">Cannot</div>'
      + '<ul class="c-list c-cant">' + c.cant.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
      + '</div>'
      + cliff
      + '<div class="c-flip"><span class="src">' + esc(c.cantSrc || '') + '</span><span aria-hidden="true">↻</span></div>'
      + '</div>'
      + '</button></div>';
  }

  // A flip card has to be a fixed height (both faces are absolutely stacked), so
  // the height has to come from the tallest face in the deck. Measured rather
  // than guessed: a hard-coded min-height clipped the longest card's "Cannot"
  // list, which read as broken rather than as scrollable.
  function fitDeck(container) {
    var cards = $$('.card', container);
    if (!cards.length) return;
    cards.forEach(function (c) { c.style.minHeight = ''; });

    // scrollHeight on the flex face leaves out its own bottom padding, so a
    // single measure/apply pass lands consistently short. Iterate to the fixed
    // point instead of hard-coding the difference.
    var applied = 0;
    for (var pass = 0; pass < 5; pass++) {
      var need = 0;
      cards.forEach(function (card) {
        $$('.face', card).forEach(function (face) {
          var sc = $('.c-scroll', face);
          var ghost = $('.c-ghost', face);
          // The ghost numeral bleeds past the bottom edge on purpose. It is
          // clipped visually, but it still counts toward scrollHeight, so
          // measuring with it visible chases an overflow that is not real.
          if (ghost) ghost.style.display = 'none';
          if (sc) { sc.style.overflow = 'visible'; sc.style.flex = 'none'; }
          // scrollHeight is content space; min-height is border-box. Without the
          // border delta the loop settles exactly one border short, forever.
          need = Math.max(need, face.scrollHeight + (face.offsetHeight - face.clientHeight));
          if (sc) { sc.style.overflow = ''; sc.style.flex = ''; }
          if (ghost) ghost.style.display = '';
        });
      });
      need = Math.ceil(need);
      if (need <= applied) break;
      applied = need;
      cards.forEach(function (card) { card.style.minHeight = applied + 'px'; });
    }
  }

  function fitAllDecks() {
    ['#deckModels', '#deckHardware', '#deckData'].forEach(function (sel) {
      var el = $(sel);
      if (el) fitDeck(el);
    });
  }

  function renderDeck() {
    $('#deckModels').innerHTML = D.models.map(function (c) { return cardHTML(c, c.tier); }).join('');
    $('#deckHardware').innerHTML = D.hardware.map(function (c) { return cardHTML(c, ''); }).join('');
    $('#deckData').innerHTML = D.data.map(function (c) { return cardHTML(c, c.rung ? String(c.rung) : ''); }).join('');

    $$('.pq .card').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        // Let an estimate button inside a card open its own note without flipping.
        if (ev.target.closest('button[data-why]')) return;
        var on = btn.classList.toggle('flipped');
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });

    fitAllDecks();
    // Widths change how the text wraps, so the measurement has to be redone.
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(fitAllDecks, 180);
    }, { passive: true });
  }

  /* ── 03 · the belt ────────────────────────────────────────────────────── */
  function renderBelt() {
    var running = 0;
    $('#belt').innerHTML = D.line.map(function (s) {
      running += s.usd;
      return '<div class="station' + (s.open ? ' openable' : '') + '">'
        + '<div class="dot"></div>'
        + '<div class="body">'
        + '<div class="st-name">' + esc(s.name) + '</div>'
        + '<div class="st-detail">' + esc(s.detail) + '</div>'
        + '<div class="src" style="margin-top:.3rem">' + esc(s.src) + '</div>'
        + '</div>'
        + '<div class="st-cost"><span class="ms">+' + s.ms.toLocaleString() + ' ms</span>'
        + '<span class="usd' + (s.usd === 0 ? ' zero' : '') + '">' + usd(running) + '</span></div>'
        + '</div>';
    }).join('');
  }

  /* ── 03 · the router simulator ────────────────────────────────────────── */
  var RANK = { T0: 0, T1: 1, T2: 2, T3: 3, T3D: 4 };
  var PICKS = [
    { id: 'auto', label: 'Auto (no pick)', tier: null, minRole: 'anon' },
    { id: 'open-qwen', label: 'Qwen 2.5 (free)', tier: 'T1', minRole: 'anon' },
    { id: 'open-gemma', label: 'Gemma 2 (free)', tier: 'T1', minRole: 'anon' },
    { id: 'haiku', label: 'Claude Haiku', tier: 'T2', minRole: 'member' },
    { id: 'sonnet', label: 'Claude Sonnet', tier: 'T3', minRole: 'analyst' }
  ];
  var REASONS = {
    no_credit: 'You are out of credits for this month, so this ran on the fast model.',
    budget: 'This account has spent its budget for today, so this ran on the fast model.',
    down: 'Our usual model was unavailable, so this ran on a smaller one.',
    dead: 'No model was available, so this is the deterministic read.',
    gate: 'That model is not part of your plan, so this used the plan default.'
  };

  function pickById(id) { for (var i = 0; i < PICKS.length; i++) if (PICKS[i].id === id) return PICKS[i]; return PICKS[0]; }

  // A faithful port of Router.route()'s ordering.
  function route(o) {
    var steps = [];
    var role = D.roleById[o.role];
    var pick = pickById(o.pick);
    var reason = null;

    // 0. Access gate: can this role even pick that model?
    var pickDropped = false;
    if (pick.id !== 'auto' && D.roleRank[o.role] < D.roleRank[pick.minRole]) {
      pickDropped = true;
      reason = 'gate';
      steps.push({ i: '0', lbl: 'Access gate', out: pick.label + ' not in plan', cls: 'clamped' });
      pick = PICKS[0];
    }

    // 1. Desired tier. An explicit pick is a hard cap and ignores the task default.
    var taskDefault = D.taskTier[o.task];
    var desired = pick.tier || taskDefault;
    var hardCap = !!pick.tier;
    steps.push({
      i: '1',
      lbl: hardCap ? 'Explicit pick, <b>hard cap</b>' : 'Task default',
      out: D.tierById[desired].name.replace(/_/g, ' '),
      cls: ''
    });

    // 2. Clamp to the role ceiling.
    var ceiling = role.maxTier;
    var served = RANK[desired] > RANK[ceiling] ? ceiling : desired;
    var roleClamped = served !== desired;
    steps.push({
      i: '2', lbl: 'Plan ceiling', out: D.tierById[ceiling].name.replace(/_/g, ' '),
      cls: roleClamped ? 'clamped' : 'noop'
    });

    // 3. Budget clamp: would this call cross the role's daily dollar cap?
    var cost = D.tierById[served].perCall.value;
    var budget = role.daily.value;
    var budgetClamped = false;
    if (o.spend + cost > budget && RANK[served] > RANK.T1) {
      served = 'T1'; budgetClamped = true; reason = 'budget';
    }
    steps.push({
      i: '3',
      lbl: 'Daily budget, ' + usd(o.spend, 2) + ' of ' + usd(budget, 2),
      out: budgetClamped ? 'clamped to T1 LOCAL' : 'room to spend',
      cls: budgetClamped ? 'clamped' : 'noop'
    });

    // 4. Cache. A hit is free and stops here.
    if (o.cached) {
      steps.push({ i: '4', lbl: 'Response cache, 1 hour TTL', out: 'HIT', cls: 'free' });
      return { steps: steps, served: served, credits: 0, usd: 0, reason: null, cached: true };
    }
    steps.push({ i: '4', lbl: 'Response cache, 1 hour TTL', out: 'miss', cls: 'noop' });

    // 5. Provider failure walks TIER_FALLBACK, with a `seen` set to break the
    //    T1 <-> T2 cycle, and the upward step capped by an explicit pick.
    var walked = [];
    if (o.down) {
      var seen = {}, t = served, guard = 0;
      while (guard++ < 6) {
        seen[t] = true;
        var next = D.fallback[t];
        if (hardCap && RANK[next] > RANK[desired]) { t = 'T0'; walked.push('T0'); break; }
        if (seen[next]) { t = 'T0'; walked.push('T0'); break; }
        t = next; walked.push(t);
        if (t !== 'T1' || !o.down) break;
        if (RANK[t] <= RANK.T1) break;
      }
      served = t;
      reason = served === 'T0' ? 'dead' : 'down';
    }
    steps.push({
      i: '5',
      lbl: o.down ? 'Provider down, walk the fallback' : 'Provider healthy',
      out: o.down ? (walked.length ? walked.join(' → ') : 'no route') : 'no fallback needed',
      cls: o.down ? 'clamped' : 'noop'
    });

    // 6. Land.
    var tier = D.tierById[served];
    steps.push({ i: '6', lbl: 'Served', out: tier.model, cls: '' });
    return {
      steps: steps, served: served, credits: tier.credits.value,
      usd: tier.perCall.value, reason: reason, cached: false
    };
  }

  function initSim() {
    var elRole = $('#simRole'), elPick = $('#simPick'), elTask = $('#simTask'),
      elSpend = $('#simSpend'), elSpendVal = $('#simSpendVal'),
      elCache = $('#simCache'), elDown = $('#simDown');
    if (!elRole) return;

    elRole.innerHTML = D.roles.map(function (r) {
      return '<option value="' + r.id + '">' + esc(r.label) + '</option>';
    }).join('');
    elPick.innerHTML = PICKS.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.label) + '</option>';
    }).join('');
    elTask.innerHTML = D.simTasks.map(function (t) {
      return '<option value="' + t.id + '">' + esc(t.label) + '</option>';
    }).join('');
    elRole.value = 'analyst';
    elTask.value = 'NARRATIVE';

    var timer = null;
    function run() {
      var res = route({
        role: elRole.value, pick: elPick.value, task: elTask.value,
        spend: parseFloat(elSpend.value), cached: elCache.checked, down: elDown.checked
      });
      elSpendVal.textContent = usd(parseFloat(elSpend.value), 2);

      var box = $('#simSteps');
      box.innerHTML = res.steps.map(function (s) {
        return '<div class="step ' + s.cls + '"><span class="i">' + s.i + '</span>'
          + '<span class="lbl">' + s.lbl + '</span>'
          + '<span class="out">' + esc(s.out) + '</span></div>';
      }).join('');

      var tier = D.tierById[res.served];
      $('#simServed').textContent = tier.label + ' · ' + tier.name.replace(/_/g, ' ');
      $('#simCharge').textContent = res.cached
        ? '0 credits · cache hit · $0.000'
        : res.credits + ' credit' + (res.credits === 1 ? '' : 's') + ' · ' + usd(res.usd);

      var rn = $('#simReason');
      if (res.reason && REASONS[res.reason]) { rn.textContent = REASONS[res.reason]; rn.hidden = false; }
      else { rn.hidden = true; }

      // The one orchestrated moment on the page: the trace lands step by step.
      var steps = $$('.step', box);
      if (REDUCED) { steps.forEach(function (s) { s.classList.add('shown'); }); return; }
      if (timer) clearInterval(timer);
      var i = 0;
      timer = setInterval(function () {
        if (i >= steps.length) { clearInterval(timer); timer = null; return; }
        steps[i++].classList.add('shown');
      }, 95);
    }

    [elRole, elPick, elTask, elSpend, elCache, elDown].forEach(function (el) {
      el.addEventListener('input', run);
      el.addEventListener('change', run);
    });

    $$('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-preset');
        if (p === 'leak') {
          elRole.value = 'analyst'; elPick.value = 'open-qwen'; elTask.value = 'INVESTMENT_THESIS';
          elSpend.value = 0; elCache.checked = false; elDown.checked = true;
        } else if (p === 'clamp') {
          elRole.value = 'options'; elPick.value = 'sonnet'; elTask.value = 'COMPETITIVE_SYNTH';
          elSpend.value = 0.49; elCache.checked = false; elDown.checked = false;
        } else {
          elRole.value = 'member'; elPick.value = 'auto'; elTask.value = 'NARRATIVE';
          elSpend.value = 0; elCache.checked = false; elDown.checked = true;
        }
        run();
      });
    });

    run();
  }

  /* ── 04 · the tree ────────────────────────────────────────────────────── */
  function renderTree() {
    $('#tree').innerHTML = D.roles.map(function (r) {
      var ceilName = D.tierById[r.maxTier].label;
      return '<div class="tnode">'
        + '<div class="tn-id">'
        + '<div class="tn-label">' + esc(r.label) + '</div>'
        + '<div class="tn-price' + (r.price ? '' : ' free') + '">' + (r.price ? '$' + r.price + '/mo' : 'free') + '</div>'
        + '</div>'
        + '<div>'
        + '<div class="tn-gates">'
        + '<span class="gate ceil">ceiling <b>' + esc(ceilName) + '</b></span>'
        + '<span class="gate">credits ' + num(r.credits, { text: String(r.credits.value) }) + '</span>'
        + '<span class="gate">daily cap ' + num(r.daily, { text: usd(r.daily.value, 2) }) + '</span>'
        + '</div>'
        + '<div class="tn-unlocks">' + r.unlocks.map(function (u) {
          return '<span class="unlock">' + esc(u) + '</span>';
        }).join('') + '</div>'
        + '<p class="tn-note">' + esc(r.note) + '</p>'
        + '</div></div>';
    }).join('');
  }

  /* ── charts: a small SVG kit ──────────────────────────────────────────── */
  function svgEl(w, h, label) {
    return {
      w: w, h: h, parts: [], label: label || '',
      add: function (s) { this.parts.push(s); return this; },
      out: function () {
        return '<svg class="chart" viewBox="0 0 ' + this.w + ' ' + this.h + '"'
          + ' role="img" aria-label="' + esc(this.label) + '" preserveAspectRatio="xMidYMid meet">'
          + this.parts.join('') + '</svg>';
      }
    };
  }
  function txt(x, y, s, cls, anchor, fill) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'tick') + '"'
      + (anchor ? ' text-anchor="' + anchor + '"' : '')
      + (fill ? ' fill="' + fill + '"' : '') + '>' + esc(s) + '</text>';
  }
  function path(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + (w || 2)
      + '" stroke-linejoin="round" stroke-linecap="round"' + (extra || '') + '/>';
  }
  function area(d, fill) { return '<path d="' + d + '" fill="' + fill + '" stroke="none"/>'; }

  /* ── 05 · the bill ────────────────────────────────────────────────────── */
  // Quota-derived action ceilings. A plan cannot cost more than its quota allows,
  // which is exactly why the quotas exist.
  var PLAN_ACTIONS = { free: 9 / 1, member: 40 / 2, analyst: 120 / 5, options: 300 / 5 };
  var PLAN_TIER = { free: 'T1', member: 'T2', analyst: 'T3', options: 'T3' };

  var calc = {
    member: 60, analyst: 25, options: 10, freeRatio: 4,
    actionsPerDay: 0.8, cacheHit: 35, t1: 'haiku'
  };

  function t1CallCost() {
    if (calc.t1 === 'haiku') return 0.002;
    if (calc.t1 === 'local') return 0;
    return 0;
  }

  // Monthly model spend for a given paying-subscriber scale factor.
  function modelCost(counts) {
    var hit = calc.cacheHit / 100;
    var total = 0;
    ['member', 'analyst', 'options'].forEach(function (p) {
      var acts = Math.min(calc.actionsPerDay * 30, PLAN_ACTIONS[p]);
      var per = D.tierById[PLAN_TIER[p]].perCall.value;
      total += counts[p] * acts * (1 - hit) * per;
    });
    var freeUsers = (counts.member + counts.analyst + counts.options) * calc.freeRatio;
    if (calc.t1 !== 'none') {
      var freeActs = Math.min(calc.actionsPerDay * 30, PLAN_ACTIONS.free);
      total += freeUsers * freeActs * (1 - hit) * t1CallCost();
    }
    return total;
  }

  // Search demand saturates: one paid search serves everyone inside the cache
  // window, so spend tracks distinct questions, not people. Then it is capped.
  function searchCost(totalUsers) {
    var ceil = D.econ.distinctQueryCeiling.value;
    var q = ceil * (1 - Math.exp(-totalUsers / 300));
    var tav = Math.min(q, D.econ.tavilyMonthlyCap.value);
    var ser = Math.min(Math.max(q - tav, 0), D.econ.serperMonthlyCap.value);
    return tav * D.econ.tavilyUnit.value + ser * D.econ.serperUnit.value;
  }

  function infraCost(totalUsers) {
    var extra = Math.max(0, Math.ceil(totalUsers / D.econ.instanceCapacity.value) - 1);
    return D.econ.infraFloor.value + extra * D.econ.infraStep.value;
  }

  function revenueAt(counts) {
    var gross = counts.member * 8 + counts.analyst * 14 + counts.options * 24;
    var subs = counts.member + counts.analyst + counts.options;
    var fees = gross * D.econ.stripe.pct.value + subs * D.econ.stripe.flat.value;
    return { gross: gross, net: gross - fees, fees: fees };
  }

  function scaleCounts(k) {
    return { member: calc.member * k, analyst: calc.analyst * k, options: calc.options * k };
  }

  function economicsAt(counts) {
    var subs = counts.member + counts.analyst + counts.options;
    var users = subs * (1 + calc.freeRatio);
    var mc = modelCost(counts), sc = searchCost(users), ic = infraCost(users);
    var rev = revenueAt(counts);
    return {
      subs: subs, users: users, model: mc, search: sc, infra: ic,
      cogs: mc + sc + ic, revenue: rev.net, gross: rev.gross, fees: rev.fees,
      profit: rev.net - (mc + sc + ic)
    };
  }

  function findBreakEven() {
    var base = { member: calc.member, analyst: calc.analyst, options: calc.options };
    var total = base.member + base.analyst + base.options;
    if (total <= 0) return null;
    for (var n = 1; n <= 400; n++) {
      var k = n / total;
      if (economicsAt(scaleCounts(k)).profit > 0) return n;
    }
    return null;
  }

  function renderCalcCtls() {
    var C_ = [
      { id: 'member', label: 'Pro subscribers', min: 0, max: 400, step: 1, fmt: function (v) { return v + ' × $8'; } },
      { id: 'analyst', label: 'Analyst subscribers', min: 0, max: 200, step: 1, fmt: function (v) { return v + ' × $14'; } },
      { id: 'options', label: 'Options subscribers', min: 0, max: 120, step: 1, fmt: function (v) { return v + ' × $24'; } },
      { id: 'freeRatio', label: 'Free users per paying', min: 0, max: 12, step: 1, fmt: function (v) { return v + '×'; } },
      { id: 'actionsPerDay', label: 'Actions per user per day', min: 0.1, max: 6, step: 0.1, fmt: function (v) { return v.toFixed(1); } },
      { id: 'cacheHit', label: 'Cache hit rate', min: 0, max: 80, step: 5, fmt: function (v) { return v + '%'; } }
    ];
    $('#calcCtls').innerHTML = C_.map(function (c) {
      return '<div class="ctl"><label for="cc_' + c.id + '">' + esc(c.label) + '</label>'
        + '<input type="range" id="cc_' + c.id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + calc[c.id] + '" />'
        + '<span class="ctl-val" id="ccv_' + c.id + '">' + esc(c.fmt(calc[c.id])) + '</span></div>';
    }).join('')
      + '<div class="ctl"><label for="cc_t1">Free tier runs on</label>'
      + '<select id="cc_t1">'
      + '<option value="haiku">Haiku (what production does)</option>'
      + '<option value="local">A local GPU</option>'
      + '<option value="none">Nothing, deterministic only</option>'
      + '</select><span class="ctl-val" id="ccv_t1">$0.002 per call</span></div>';

    C_.forEach(function (c) {
      var el = document.getElementById('cc_' + c.id);
      el.addEventListener('input', function () {
        calc[c.id] = parseFloat(el.value);
        document.getElementById('ccv_' + c.id).textContent = c.fmt(calc[c.id]);
        paintBill();
      });
    });
    var t1 = document.getElementById('cc_t1');
    t1.addEventListener('change', function () {
      calc.t1 = t1.value;
      document.getElementById('ccv_t1').textContent =
        calc.t1 === 'haiku' ? '$0.002 per call' : calc.t1 === 'local' ? 'no marginal cost, plus a box' : 'no model at all';
      paintBill();
    });
  }

  // Log-scaled x so the break-even at a handful of subscribers and the shape at
  // a thousand are both legible on one axis.
  function makeLogX(min, max, x0, x1) {
    var lo = Math.log10(min), hi = Math.log10(max);
    return function (v) { return x0 + (Math.log10(Math.max(v, min)) - lo) / (hi - lo) * (x1 - x0); };
  }

  // Sample the model across the subscriber range once; both scale charts read it.
  function samplePoints() {
    var pts = [], base = calc.member + calc.analyst + calc.options;
    for (var i = 0; i <= 90; i++) {
      var s = Math.pow(10, (i / 90) * 3); // 1 -> 1000
      var k = base > 0 ? s / base : 0;
      var ec = economicsAt(scaleCounts(k));
      ec.subs = s;
      pts.push(ec);
    }
    return pts;
  }

  // Chart 1: where the money goes. Cost only, linear y, so the composition is
  // readable. Revenue is 60x cost at the top of this range, so putting it on
  // this axis would flatten every band into a sliver.
  function chartComposition() {
    var W = 760, H = 260, L = 52, R = 96, T = 14, B = 34;
    var X = makeLogX(1, 1000, L, W - R);
    var pts = samplePoints();
    var maxY = 0;
    pts.forEach(function (p) { maxY = Math.max(maxY, p.cogs); });
    maxY = Math.max(maxY * 1.08, 10);
    var Y = function (v) { return H - B - (v / maxY) * (H - B - T); };
    var end = pts[pts.length - 1];
    var s = svgEl(W, H, 'Stacked area chart of monthly cost against paying subscribers on a log scale. '
      + 'At 1,000 subscribers the total is ' + money(end.cogs) + ' a month: '
      + money(end.cogs - end.infra - end.search) + ' model calls, ' + money(end.search) + ' search, '
      + money(end.infra) + ' infrastructure. Model cost rises with use; search flattens because one '
      + 'search serves every user inside the cache window.');

    for (var g = 0; g <= 4; g++) {
      var v = maxY * g / 4, y = Y(v);
      s.add('<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '"/>');
      s.add(txt(L - 8, y + 3, money(v), 'tick', 'end'));
    }
    [1, 10, 100, 1000].forEach(function (v) {
      s.add(txt(X(v), H - B + 16, v.toLocaleString(), 'tick', 'middle'));
    });
    s.add(txt((L + W - R) / 2, H - 4, 'paying subscribers (log scale)', 'tick', 'middle'));

    function band(lower, upper, fill) {
      var d = 'M' + X(pts[0].subs) + ',' + Y(lower(pts[0]));
      pts.forEach(function (p) { d += 'L' + X(p.subs) + ',' + Y(lower(p)); });
      for (var j = pts.length - 1; j >= 0; j--) d += 'L' + X(pts[j].subs) + ',' + Y(upper(pts[j]));
      return area(d + 'Z', fill);
    }
    s.add(band(function () { return 0; }, function (p) { return p.infra; }, C.infra));
    s.add(band(function (p) { return p.infra; }, function (p) { return p.infra + p.search; }, C.search));
    s.add(band(function (p) { return p.infra + p.search; }, function (p) { return p.cogs; }, C.model));

    // 2px surface gap between stacked segments
    var dInfra = '', dSearch = '';
    pts.forEach(function (p, j) {
      dInfra += (j ? 'L' : 'M') + X(p.subs) + ',' + Y(p.infra);
      dSearch += (j ? 'L' : 'M') + X(p.subs) + ',' + Y(p.infra + p.search);
    });
    s.add(path(dInfra, '#171512', 2));
    s.add(path(dSearch, '#171512', 2));

    // Direct labels at the right edge, at each band's vertical middle.
    var last = pts[pts.length - 1];
    var mids = [
      { y: Y(last.infra / 2), t: 'infrastructure', c: C.infra },
      { y: Y(last.infra + last.search / 2), t: 'search', c: C.search },
      { y: Y(last.infra + last.search + (last.cogs - last.infra - last.search) / 2), t: 'model calls', c: C.model }
    ].sort(function (a, b) { return a.y - b.y; });
    // keep labels from colliding
    for (var i2 = 1; i2 < mids.length; i2++) {
      if (mids[i2].y - mids[i2 - 1].y < 13) mids[i2].y = mids[i2 - 1].y + 13;
    }
    mids.forEach(function (mm) { s.add(txt(W - R + 8, mm.y + 3, mm.t, 'ann', 'start', mm.c)); });
    return s.out();
  }

  // Chart 2: does it pay for itself. Two lines, one log axis, because revenue
  // and cost differ by orders of magnitude across this range.
  function chartMargin() {
    var W = 760, H = 260, L = 56, R = 86, T = 14, B = 34;
    var X = makeLogX(1, 1000, L, W - R);
    var pts = samplePoints();
    var minY = 1, maxY = 1;
    pts.forEach(function (p) { maxY = Math.max(maxY, p.cogs, p.revenue); });
    maxY = Math.pow(10, Math.ceil(Math.log10(maxY)));
    var lY = Math.log10(minY), hY = Math.log10(maxY);
    var Y = function (v) { return H - B - (Math.log10(Math.max(v, minY)) - lY) / (hY - lY) * (H - B - T); };
    var beL = findBreakEven();
    var endM = pts[pts.length - 1];
    var s = svgEl(W, H, 'Log-log line chart comparing monthly revenue against total monthly cost as '
      + 'subscribers grow from 1 to 1,000. Break-even is at '
      + (beL ? beL + ' paying subscriber' + (beL === 1 ? '' : 's') : 'no point in this range')
      + '. At 1,000 subscribers revenue is ' + money(endM.revenue) + ' against ' + money(endM.cogs)
      + ' of cost.');

    for (var d10 = 0; Math.pow(10, d10) <= maxY; d10++) {
      var v = Math.pow(10, d10), y = Y(v);
      s.add('<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '"/>');
      s.add(txt(L - 8, y + 3, money(v), 'tick', 'end'));
    }
    [1, 10, 100, 1000].forEach(function (v) {
      s.add(txt(X(v), H - B + 16, v.toLocaleString(), 'tick', 'middle'));
    });
    s.add(txt((L + W - R) / 2, H - 4, 'paying subscribers (log scale) · both axes log', 'tick', 'middle'));

    var dCost = '', dRev = '';
    pts.forEach(function (p, j) {
      dCost += (j ? 'L' : 'M') + X(p.subs) + ',' + Y(p.cogs);
      dRev += (j ? 'L' : 'M') + X(p.subs) + ',' + Y(p.revenue);
    });
    s.add(path(dCost, C.model, 2.5));
    s.add(path(dRev, C.revenue, 2.5));

    var be = findBreakEven();
    if (be) {
      var bx = X(be);
      s.add('<line class="ann-rule" x1="' + bx + '" y1="' + T + '" x2="' + bx + '" y2="' + (H - B) + '"/>');
      s.add(txt(bx + 6, T + 11, 'break-even · ' + be + ' subscriber' + (be === 1 ? '' : 's'), 'ann', 'start'));
    }
    var base = calc.member + calc.analyst + calc.options;
    if (base > 0) {
      var cx = X(base), cur = economicsAt(scaleCounts(1));
      s.add('<circle cx="' + cx + '" cy="' + Y(cur.cogs) + '" r="4" fill="' + C.model + '" stroke="#171512" stroke-width="2"/>');
      s.add('<circle cx="' + cx + '" cy="' + Y(cur.revenue) + '" r="4" fill="' + C.revenue + '" stroke="#171512" stroke-width="2"/>');
      s.add(txt(cx, Y(cur.revenue) - 11, 'you are here', 'ann', 'middle'));
    }
    var lastP = pts[pts.length - 1];
    s.add(txt(W - R + 8, Y(lastP.revenue) + 3, 'revenue', 'ann', 'start', C.revenue));
    s.add(txt(W - R + 8, Y(lastP.cogs) + 3, 'total cost', 'ann', 'start', C.model));
    return s.out();
  }

  function chartPerUser() {
    var W = 760, H = 180, L = 52, R = 16, T = 14, B = 34;
    var minS = 1, maxS = 1000;
    var X = makeLogX(minS, maxS, L, W - R);
    var base = calc.member + calc.analyst + calc.options;
    var pts = [];
    for (var i = 0; i <= 90; i++) {
      var sN = Math.pow(10, Math.log10(minS) + (i / 90) * (Math.log10(maxS) - Math.log10(minS)));
      var k = base > 0 ? sN / base : 0;
      var ec = economicsAt(scaleCounts(k));
      pts.push({ subs: sN, per: ec.cogs / Math.max(sN, 1) });
    }
    var maxY = 0; pts.forEach(function (p) { maxY = Math.max(maxY, p.per); });
    maxY = Math.max(maxY, 0.5);
    var Y = function (v) { return H - B - (v / maxY) * (H - B - T); };
    var pu0 = pts[0].per, pu1 = pts[pts.length - 1].per;
    var s = svgEl(W, H, 'Line chart of monthly cost per subscriber against subscriber count on a log '
      + 'scale. It falls from ' + usd(pu0) + ' at a single subscriber to ' + usd(pu1)
      + ' at 1,000, because search and infrastructure are shared while only model calls scale per user.');
    for (var g = 0; g <= 3; g++) {
      var v = maxY * g / 3, y = Y(v);
      s.add('<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '"/>');
      s.add(txt(L - 8, y + 3, '$' + v.toFixed(2), 'tick', 'end'));
    }
    [1, 10, 100, 1000].forEach(function (v) { s.add(txt(X(v), H - B + 16, v.toLocaleString(), 'tick', 'middle')); });
    s.add(txt((L + W - R) / 2, H - 4, 'paying subscribers (log scale)', 'tick', 'middle'));
    var d = '';
    pts.forEach(function (p, j) { d += (j ? 'L' : 'M') + X(p.subs) + ',' + Y(p.per); });
    s.add(path(d, C.accent, 2.5));
    var lastP = pts[pts.length - 1];
    s.add(txt(W - R - 2, Y(lastP.per) - 8, 'cost per subscriber, ' + usd(lastP.per) + ' at 1,000', 'ann', 'end', C.accent));
    return s.out();
  }

  function paintBill() {
    var cur = economicsAt(scaleCounts(1));
    var be = findBreakEven();
    railState.monthly = cur.cogs;

    var margin = cur.revenue > 0 ? (cur.profit / cur.revenue) : null;
    $('#calcKpis').innerHTML = [
      { k: 'Monthly revenue', v: money(cur.revenue), s: money(cur.fees) + ' to Stripe', cls: '' },
      { k: 'Monthly cost', v: money(cur.cogs), s: money(cur.model) + ' models · ' + money(cur.search) + ' search', cls: 'accent' },
      { k: 'Margin', v: margin === null ? '—' : Math.round(margin * 100) + '%', s: money(cur.profit) + ' a month', cls: cur.profit >= 0 ? 'good' : 'bad' },
      { k: 'Break-even', v: be ? be + '' : '—', s: be ? 'paying subscribers at this mix' : 'not reachable at this mix', cls: '' },
      { k: 'Cost per subscriber', v: cur.subs ? usd(cur.cogs / cur.subs) : '—', s: 'falls as it grows', cls: '' }
    ].map(function (k) {
      return '<div class="kpi ' + k.cls + '"><div class="k">' + esc(k.k) + '</div>'
        + '<div class="v">' + esc(k.v) + '</div><div class="s">' + esc(k.s) + '</div></div>';
    }).join('');

    $('#chartComposition').innerHTML = chartComposition();
    $('#chartMargin').innerHTML = chartMargin();
    $('#chartPerUser').innerHTML = chartPerUser();
    var rb = $('#railBill'); if (rb) rb.textContent = money(cur.cogs) + '/mo';
    paintRail();
  }

  /* ── 06 · the rig ─────────────────────────────────────────────────────── */
  function chartCrossover() {
    var W = 760, H = 300, L = 58, R = 90, T = 14, B = 34;
    // Capped at 500k rather than 1M: at 1M the pay-per-call line lands within a
    // few pixels of the H100 line and their right-edge labels collide.
    var minX = 1000, maxX = 500000;
    var X = makeLogX(minX, maxX, L, W - R);
    var minY = 1, maxY = 3000;
    var lY = Math.log10(minY), hY = Math.log10(maxY);
    var Y = function (v) { return H - B - (Math.log10(Math.max(v, minY)) - lY) / (hY - lY) * (H - B - T); };
    var per = D.crossover.perCall.value;
    var cols = { none: C.model, mac: C.search, gpu5090: C.infra, h100: '#2FA57C' };

    var s = svgEl(W, H, 'Log-log line chart of monthly cost against model calls served, comparing '
      + 'paying Haiku per call with three owned or rented machines. Paying per call is the cheapest '
      + 'option until roughly ' + Math.round((96 / per) / 1000) + ' thousand calls a month, which is '
      + 'far beyond this product\'s volume.');
    [1, 10, 100, 1000].forEach(function (v) {
      var y = Y(v);
      s.add('<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '"/>');
      s.add(txt(L - 8, y + 3, '$' + v.toLocaleString(), 'tick', 'end'));
    });
    [1000, 10000, 100000, 500000].forEach(function (v) {
      s.add(txt(X(v), H - B + 16, (v / 1000) + 'k', 'tick', 'middle'));
    });
    s.add(txt((L + W - R) / 2, H - 4, 'model calls served per month (log scale)', 'tick', 'middle'));

    D.crossover.options.forEach(function (o) {
      var d = '', label = null;
      for (var i = 0; i <= 60; i++) {
        var calls = Math.pow(10, Math.log10(minX) + (i / 60) * (Math.log10(maxX) - Math.log10(minX)));
        // Owned hardware costs its amortized monthly whatever it serves.
        // Renting costs per call.
        var cost = o.monthly > 0 ? o.monthly : calls * per;
        d += (i ? 'L' : 'M') + X(calls) + ',' + Y(cost);
        if (i === 60) label = Y(cost);
      }
      s.add(path(d, cols[o.id], 2.5));
      s.add(txt(W - R + 6, label + 3, o.label, 'ann', 'start', cols[o.id]));
    });

    // The crossover that matters: owned 5090 against paying per call.
    var gpu = D.crossover.options.filter(function (o) { return o.id === 'gpu5090'; })[0];
    var xc = gpu.monthly / per;
    var cx = X(xc);
    s.add('<line class="ann-rule" x1="' + cx + '" y1="' + T + '" x2="' + cx + '" y2="' + (H - B) + '"/>');
    s.add(txt(cx - 6, T + 12, 'crossover · ' + Math.round(xc / 1000) + 'k calls', 'ann', 'end'));
    return s.out();
  }

  function renderRig() {
    var gpu = D.crossover.options.filter(function (o) { return o.id === 'gpu5090'; })[0];
    var per = D.crossover.perCall.value;
    var xc = gpu.monthly / per;
    var subs = xc / D.crossover.callsPerProSubscriber.value;
    $('#chartCrossover').innerHTML = chartCrossover();
    $('#rigKpis').innerHTML = [
      { k: '5090, amortized', v: money(gpu.monthly) + '/mo', s: '$2,300 over 24 months', cls: '' },
      { k: 'Haiku, per call', v: '$0.002', s: 'what production runs at T1', cls: 'accent' },
      { k: 'Crossover', v: Math.round(xc / 1000) + 'k calls/mo', s: 'below this, renting wins', cls: '' },
      { k: 'In subscribers', v: '~' + Math.round(subs).toLocaleString(), s: 'Pro accounts, at 20 calls each', cls: 'bad' }
    ].map(function (k) {
      return '<div class="kpi ' + k.cls + '"><div class="k">' + esc(k.k) + '</div>'
        + '<div class="v">' + esc(k.v) + '</div><div class="s">' + esc(k.s) + '</div></div>';
    }).join('');
    var rr = $('#railRig'); if (rr) rr.textContent = Math.round(xc / 1000) + 'k calls';
  }

  /* ── 07 · what broke ──────────────────────────────────────────────────── */
  function renderFailures() {
    $('#fails').innerHTML = D.failures.map(function (f) {
      return '<div class="fail"><h4>' + esc(f.title) + '</h4>'
        + '<p>' + esc(f.body) + '</p>'
        + '<p class="lesson">' + esc(f.lesson) + '</p>'
        + '<span class="src">' + esc(f.src) + '</span></div>';
    }).join('');
    $('#gates').innerHTML = D.openGates.map(function (g) {
      return '<li><div class="g-t">' + esc(g.title) + '</div><p class="g-b">' + esc(g.body) + '</p></li>';
    }).join('');
  }

  /* ── test hook ────────────────────────────────────────────────────────────
     The two toys are the load-bearing claims on this page, so their pure
     functions are reachable for verification against the real repo behaviour.
     Nothing on the page reads this.
     ──────────────────────────────────────────────────────────────────────── */
  window.__PQ_TEST = {
    route: route, economicsAt: economicsAt, findBreakEven: findBreakEven,
    searchCost: searchCost, modelCost: modelCost, scaleCounts: scaleCounts,
    calc: calc, RANK: RANK, PICKS: PICKS,
    charts: {
      composition: chartComposition, margin: chartMargin,
      perUser: chartPerUser, crossover: chartCrossover
    }
  };

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    renderColdOpen();
    renderLedger();
    renderDeck();
    renderBelt();
    initSim();
    renderTree();
    renderCalcCtls();
    paintBill();
    renderRig();
    renderFailures();
    initReveals();
    initRail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
