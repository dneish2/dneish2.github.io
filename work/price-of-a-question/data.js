/* =============================================================================
   The Price of a Question — the numbers.

   Every figure on the page comes from here, and every figure carries a `kind`:

     'm'  MEASURED  — lifted from the finplatform repo or a live receipt.
                      Rendered with a filled diamond. The `src` is a real path.
     'e'  ESTIMATED — a public-source figure or an arithmetic derivation.
                      Rendered with a hollow diamond. The `why` shows the math.

   Nothing on the page hand-types a glyph. The marker is rendered from `kind`,
   so a number cannot claim to be measured unless it says so here.

   Last reconciled against finplatform @ 2026-08-05.
   ============================================================================= */
(function (global) {
  'use strict';

  /* --- tiny constructors ------------------------------------------------- */
  // measured: a number with a repo path behind it
  const m = (value, unit, src, note) => ({ value, unit, kind: 'm', src, note });
  // estimated: a number with its derivation behind it
  const e = (value, unit, why, note) => ({ value, unit, kind: 'e', why, note });

  const PQ = {};

  PQ.meta = {
    title: 'The Price of a Question',
    subject: 'finplatform',
    reconciled: '2026-08-05',
    repo: 'finplatform',
    // The one date the whole cost model pivots on.
    sonnetIntroEnds: '2026-08-31'
  };

  /* =========================================================================
     1. TIERS — the spine. Everything else hangs off these five rows.
     ========================================================================= */
  PQ.tiers = [
    {
      id: 'T0', name: 'T0_NONE', label: 'Deterministic',
      short: 'No model ran',
      model: 'none',
      credits: m(0, 'credits', 'auth/credits.py:84', 'genuinely free: no model ran'),
      perCall: m(0, 'usd', 'llm/tiers.py:44'),
      capability: null
    },
    {
      id: 'T1', name: 'T1_LOCAL', label: 'Local / open',
      short: 'Qwen 2.5 7B, or whatever FINPLATFORM_T1_MODEL points at',
      model: 'qwen2.5:7b',
      credits: m(1, 'credits', 'auth/credits.py:85', 'the local model is not free to the platform'),
      perCall: m(0, 'usd', 'llm/tiers.py:45', 'planning cost only; the electricity is real'),
      capability: 'small'
    },
    {
      id: 'T2', name: 'T2_MID', label: 'Hosted small',
      short: 'Claude Haiku 4.5',
      model: 'claude-haiku-4-5-20251001',
      credits: m(2, 'credits', 'auth/credits.py:86'),
      perCall: m(0.002, 'usd', 'llm/tiers.py:46'),
      capability: 'mid'
    },
    {
      id: 'T3', name: 'T3_LARGE', label: 'Large synthesis',
      short: 'Claude Sonnet 5',
      model: 'claude-sonnet-5',
      credits: m(5, 'credits', 'auth/credits.py:87'),
      perCall: m(0.011, 'usd', 'llm/tiers.py:61', 'intro pricing; re-measure before 2026-08-31'),
      capability: 'strong'
    },
    {
      id: 'T3D', name: 'T3_DEEP_AGENT', label: 'Deep agent',
      short: 'A multi-call research run, not one call',
      model: 'open_deep_research',
      credits: m(10, 'credits', 'auth/credits.py:88'),
      perCall: m(0.40, 'usd', 'llm/tiers.py:62'),
      capability: 'strong'
    }
  ];
  PQ.tierById = Object.fromEntries(PQ.tiers.map(t => [t.id, t]));

  // TASK_TIER — what each kind of work wants by default, before any clamp.
  // finplatform/llm/tiers.py:17-32
  PQ.taskTier = {
    FORMAT: 'T0', MATH: 'T0', DEDUPE: 'T0',
    EXTRACT: 'T1', CLASSIFY: 'T1', SHORT_SUMMARY: 'T1',
    SECTION_SUMMARY: 'T2', NARRATIVE: 'T2',
    COMPETITIVE_SYNTH: 'T3', INVESTMENT_THESIS: 'T3', REFLECT: 'T3',
    PRIVATE_EXTRACT: 'T2',   // pinned up: 7B fails the strict-JSON + URL-echo contract
    PRIVATE_SYNTH: 'T3',
    DEEP_RESEARCH: 'T3D'
  };

  // The tasks worth putting in the router simulator, with the human-readable
  // label and the reason the default is what it is.
  PQ.simTasks = [
    { id: 'CLASSIFY', label: 'Classify a query', why: 'Cheap resolution. Local is plenty.' },
    { id: 'SHORT_SUMMARY', label: 'Summarize one article', why: 'Short, grounded, no synthesis.' },
    { id: 'NARRATIVE', label: 'Write the market story', why: 'Prose. Gets a depth directive.' },
    { id: 'PRIVATE_EXTRACT', label: 'Extract facts to strict JSON', why: 'Pinned to T2. A 7B model breaks the contract.' },
    { id: 'COMPETITIVE_SYNTH', label: 'Map the competitive landscape', why: 'Real synthesis. Wants the big model.' },
    { id: 'INVESTMENT_THESIS', label: 'Write the thesis', why: 'The most expensive thing we ask for.' }
  ];

  // TIER_FALLBACK — where a tier goes when it cannot serve.
  // finplatform/llm/tiers.py:192-198. T1 -> T2 is deliberate and load-bearing.
  PQ.fallback = { T3D: 'T3', T3: 'T2', T2: 'T1', T1: 'T2', T0: 'T0' };

  /* =========================================================================
     2. ROLES — the tech tree, and every clamp that draws a gate.
     ========================================================================= */
  PQ.roles = [
    {
      id: 'anon', label: 'Anonymous', plan: null, price: 0,
      maxTier: 'T1',
      credits: m(3, 'credits lifetime', 'auth/credits.py:123', 'device AND ip keyed, so clearing storage does not reset it'),
      daily: m(0.05, 'usd/day', 'auth/credits.py:67'),
      unlocks: ['Deterministic renders', 'Three tries, ever'],
      note: 'On any LLM GET path an anonymous reader is forced to T0 outright, so the page renders deterministically rather than quietly spending.'
    },
    {
      id: 'free', label: 'Free', plan: 'Free', price: 0,
      maxTier: 'T1',
      credits: m(9, 'credits/mo', 'auth/credits.py:124'),
      daily: m(0.10, 'usd/day', 'auth/credits.py:68'),
      unlocks: ['Qwen 2.5', 'Skim research', 'The whole deterministic surface'],
      note: '"You have a free local model" is really "you have 9 local-model credits, then pick a plan."'
    },
    {
      id: 'member', label: 'Pro', plan: 'Pro', price: 8,
      maxTier: 'T2',
      credits: m(40, 'credits/mo', 'auth/credits.py:125', 'the docstring above it still says 20'),
      daily: m(0.25, 'usd/day', 'auth/credits.py:69', '40 Haiku credits cannot reach this anyway'),
      unlocks: ['Claude Haiku', 'Fresh news bypass', 'Forward-looking depth'],
      note: 'The first rung where the paywall buys a different model rather than more of the same one.'
    },
    {
      id: 'analyst', label: 'Analyst', plan: 'Analyst', price: 14,
      maxTier: 'T3',
      credits: m(120, 'credits/mo', 'auth/credits.py:126'),
      daily: m(0.50, 'usd/day', 'auth/credits.py:70', 'belt and suspenders: 120 Sonnet credits is about $3.60/mo worst case'),
      unlocks: ['Claude Sonnet', 'Portfolio sensitivity', 'Precedent and scenarios'],
      note: 'Sonnet depth with a capped credit count. The middle rung exists so the top rung does not have to be cheap.'
    },
    {
      id: 'options', label: 'Options', plan: 'Options', price: 24,
      maxTier: 'T3',
      credits: m(300, 'credits/mo', 'auth/credits.py:132', 'marketed as unlimited, enforced as 300'),
      daily: m(0.50, 'usd/day', 'auth/credits.py:71', 'THE load-bearing clamp: this is the margin bound'),
      unlocks: ['The Advanced Desk', 'Hedge sizing', 'Vol surface', 'Signal Lab'],
      note: 'Analyst plus a $10/mo add-on. The real value of the add-on is data depth, which is a fixed cost, not a per-call one.'
    }
  ];
  PQ.roleById = Object.fromEntries(PQ.roles.map(r => [r.id, r]));
  PQ.roleRank = { anon: 0, free: 1, member: 2, analyst: 3, options: 4 };

  /* =========================================================================
     3. THE DECK — models
     ========================================================================= */
  PQ.models = [
    {
      id: 'qwen', name: 'Qwen 2.5 7B', suit: 'model',
      tier: 'T1', pick: 'open-qwen', minRole: 'anon', capability: 'small', open: true,
      stats: [
        { k: 'credits / action', v: m(1, '', 'auth/credits.py:85') },
        { k: 'cost / call', v: m(0, 'usd', 'llm/tiers.py:45') },
        { k: 'served by', v: m('ollama | vllm', '', 'llm/tiers.py:41') },
        { k: 'prompt profile', v: m('small', '', 'llm/tiers.py:166') }
      ],
      can: [
        'Best open tool-caller in the deck, and the fastest thing here',
        'Told outright that it does not know live facts, so it leans on the provided DATA and SOURCES',
        'Carries the entire free tier'
      ],
      cant: [
        'Fails the strict-JSON plus URL-echo contract, which is why PRIVATE_EXTRACT is pinned up to Haiku',
        'Its analysis prose was bad enough that the small-model-writes-analysis path was deleted rather than tuned',
        'Does not exist in production at all: Cloud Run has no GPU'
      ],
      cantSrc: 'llm/tiers.py:30, serve.py:5545'
    },
    {
      id: 'gemma', name: 'Gemma 2 9B', suit: 'model',
      tier: 'T1', pick: 'open-gemma', minRole: 'anon', capability: 'mid', open: true,
      stats: [
        { k: 'credits / action', v: m(1, '', 'auth/credits.py:85') },
        { k: 'cost / call', v: m(0, 'usd', 'llm/tiers.py:45') },
        { k: 'auto-routed for', v: m('synthesis, thesis', '', 'llm/tiers.py:114-117') },
        { k: 'prompt profile', v: m('mid', '', 'llm/tiers.py:170') }
      ],
      can: [
        'The free tier\'s upgrade path: at T1 auto, deep-synthesis tasks route here instead of Qwen',
        'Better prose and reasoning than the 7B for the same credit'
      ],
      cant: [
        'Only routed when provider_has_model() confirms it is actually installed, so the option cannot become a dead end',
        'Vanishes from the catalog entirely when the T1 provider is not ollama or vllm, because asking Anthropic for Gemma is an error, not a fallback'
      ],
      cantSrc: 'llm/tiers.py:98-99, llm/providers.py:28'
    },
    {
      id: 'haiku', name: 'Claude Haiku 4.5', suit: 'model',
      tier: 'T2', pick: 'haiku', minRole: 'member', capability: 'mid', open: false,
      stats: [
        { k: 'credits / action', v: m(2, '', 'auth/credits.py:86') },
        { k: 'cost / call', v: m(0.002, 'usd', 'llm/tiers.py:46') },
        { k: 'list price', v: m('$1 / $5', 'per MTok in/out', 'docs/MONETIZATION_ECONOMICS.md') },
        { k: 'prompt profile', v: m('mid', '', 'llm/tiers.py:170') }
      ],
      can: [
        'Holds the strict-JSON plus URL-echo extraction contract the 7B drops',
        'Adds one or two specific forward-looking signals on prose tasks, which is what Pro is actually buying',
        'Quietly does two jobs: it is T2, and in production it is also T1'
      ],
      cant: [
        'Does not get the precedent-and-scenario depth directive. That is reserved for T3, by prompt, not by capability',
        'Being the production free tier means every anonymous reader is a real API call, which is why the anon path is forced to deterministic'
      ],
      cantSrc: 'llm/tiers.py:140-150, DEPLOY.md:201'
    },
    {
      id: 'sonnet', name: 'Claude Sonnet 5', suit: 'model',
      tier: 'T3', pick: 'sonnet', minRole: 'analyst', capability: 'strong', open: false,
      flagship: true,
      stats: [
        { k: 'credits / action', v: m(5, '', 'auth/credits.py:87') },
        { k: 'cost / call', v: m(0.011, 'usd', 'llm/tiers.py:61', 'measured with count_tokens, not assumed') },
        { k: 'intro price', v: m('$2 / $10', 'per MTok in/out', 'llm/tiers.py:52') },
        { k: 'tokenizes', v: m(1.30, 'x the same text', 'llm/tiers.py:51') }
      ],
      can: [
        'The only model licensed to weigh competing signals and add precedent or scenario nuance',
        'Measured, not assumed: the same prompt was run through count_tokens on both models before the switch',
        'Every safety-critical behavior check passes on it'
      ],
      cant: [
        'The 29% saving is time-boxed. After 2026-08-31 the identical call costs about $0.0165, roughly 7% MORE than Sonnet 4.6 costs today',
        'It scores worse on the grounding check, but so does 4.6, because that metric counts token overlap and marks any long answer down. A metric defect, not a verdict'
      ],
      cantSrc: 'llm/tiers.py:50-60',
      // The countdown beat.
      priceCliff: {
        date: '2026-08-31',
        before: m(0.011, 'usd/call', 'llm/tiers.py:52'),
        after: e(0.0165, 'usd/call', 'the same call at list pricing once the intro window closes', 'stated in the source comment'),
        escapeHatch: 'FINPLATFORM_T3_MODEL=claude-sonnet-4-6 reverts it with no deploy'
      }
    },
    {
      id: 'deep', name: 'Deep research agent', suit: 'model',
      tier: 'T3D', pick: null, minRole: null, capability: 'strong', open: false,
      stats: [
        { k: 'credits / action', v: m(10, '', 'auth/credits.py:88') },
        { k: 'cost / run', v: m(0.40, 'usd', 'llm/tiers.py:62') },
        { k: 'stages', v: m(5, '', 'reports.py:321-359') },
        { k: 'typical', v: m(45, 'seconds', 'reports.py:321-359') }
      ],
      can: [
        'Many calls, not one. It is the only thing here that is a run rather than a request',
        'Powers the private-company dossier, where there is no ticker to look up'
      ],
      cant: [
        'Sits above every sellable plan\'s ceiling on purpose, so it cannot be spammed cheap',
        'The dossier is priced flat at 10 credits with about $0.52 of cost behind it. Thin margin, deliberately'
      ],
      cantSrc: 'auth/credits.py:82, docs/MONETIZATION_ECONOMICS.md'
    }
  ];

  /* =========================================================================
     4. THE DECK — hardware
     ========================================================================= */
  PQ.hardware = [
    {
      id: 'cr1', name: 'Cloud Run 1Gi', suit: 'hw', dead: true,
      subtitle: 'The one that died',
      stats: [
        { k: 'memory', v: m('1 GiB', '', 'DEPLOY.md:199') },
        { k: 'cpu', v: m(2, 'vCPU', 'DEPLOY.md:199') },
        { k: 'instances', v: m('1 to 10', '', 'DEPLOY.md:199') },
        { k: 'monthly', v: e(15, 'usd', '$5 to $25/mo at low traffic, per the economics doc; midpoint taken') }
      ],
      can: [
        'Scale-to-floor: one warm instance, ten at the ceiling',
        'Ran the whole product, SPA and API, in one container for months'
      ],
      cant: [
        'Ten OOM kills in sixteen hours, at 1024 to 1060 MiB. Cloud Run does not throttle on OOM, it kills the instance',
        'scipy became a real import at server start, and the snapshot warm builds quote frames for the entire S&P 500'
      ],
      cantSrc: 'DEPLOY.md:236-278'
    },
    {
      id: 'cr2', name: 'Cloud Run 2Gi', suit: 'hw',
      subtitle: 'The fix, not yet applied',
      stats: [
        { k: 'memory', v: m('2 GiB', '', 'DEPLOY.md:236-278') },
        { k: 'cpu', v: m(2, 'vCPU', 'DEPLOY.md:236-278') },
        { k: 'gpu', v: m('none', '', 'DEPLOY.md', 'this is the whole reason prod T1 is Haiku') },
        { k: 'monthly', v: e(25, 'usd', 'roughly double the memory line on the same traffic') }
      ],
      can: [
        'Enough headroom for scipy plus a full-universe snapshot warm',
        'Costs a few dollars a month more than the configuration that was killing itself'
      ],
      cant: [
        'Still no GPU, at any memory size, so a local model cannot run here at all',
        'Status as of 2026-08-04: recommended, not applied'
      ],
      cantSrc: 'DEPLOY.md:236-278'
    },
    {
      id: 'gpu5090', name: 'RTX 5090 + vLLM', suit: 'hw',
      subtitle: 'The one in the room',
      stats: [
        { k: 'vram', v: e('32 GB', '', 'published card spec') },
        { k: 'serves', v: m('Qwen2.5-32B-AWQ', '', 'docker-compose.yml') },
        { k: 'gpu util', v: m(0.85, '', 'docker-compose.yml', '--gpu-memory-utilization') },
        { k: 'capex', v: e(2300, 'usd', 'street price band of roughly $2,000 to $2,600; midpoint taken') },
        { k: 'amortized', v: e(96, 'usd/mo', '$2,300 over 24 months = $96/mo, before power') }
      ],
      can: [
        'Runs a 32B model with prefix caching on, which is a genuinely better free tier than a 7B',
        'Every marginal call after the capex is electricity',
        'No rate limit, no vendor, no price cliff on 2026-08-31'
      ],
      cant: [
        'Crossover against Haiku is around 50,000 calls a month. Below that it is the more expensive option',
        'Cloud Run cannot reach it, so it needs a second always-on machine carrying an SLA that does not exist',
        'A GPU under your desk has an uptime number, and it is not four nines'
      ],
      cantSrc: 'docker-compose.yml, DEPLOY.md:201'
    },
    {
      id: 'mac', name: 'Mac Mini M4', suit: 'hw',
      subtitle: 'The quiet option',
      stats: [
        { k: 'capex', v: e(999, 'usd', 'mid-configuration street price') },
        { k: 'power', v: e('5 to 65 W', '', 'published idle and load figures') },
        { k: 'amortized', v: e(42, 'usd/mo', '$999 over 24 months = $42/mo, before power') },
        { k: 'ceiling', v: e('7B to 14B', '', 'what unified memory comfortably serves at usable speed') }
      ],
      can: [
        'Cheapest path to a real always-on local tier',
        'Draws less power than the lightbulb above it'
      ],
      cant: [
        'Tops out near the model class that already failed the JSON contract, so it buys the tier that did not work',
        'Same SLA problem as the 5090, at a lower ceiling'
      ],
      cantSrc: 'llm/tiers.py:30'
    },
    {
      id: 'h100', name: 'Rented H100', suit: 'hw',
      subtitle: 'Someone else\'s problem',
      stats: [
        { k: 'rate', v: e(2.50, 'usd/gpu-hr', 'commodity band of roughly $2 to $3/hr; midpoint taken') },
        { k: 'always on', v: e(1825, 'usd/mo', '$2.50/hr x 730 hours = $1,825/mo') },
        { k: 'break-even', v: e(912500, 'haiku calls/mo', '$1,825 / $0.002 per call') }
      ],
      can: [
        'Real capacity, on demand, with no capex and no box in the room'
      ],
      cant: [
        'Always-on rental costs more per month than the entire projected revenue of the product',
        'Only makes sense at nearly a million calls a month, which is two orders of magnitude past where this sits'
      ],
      cantSrc: 'derived against llm/tiers.py:46'
    },
    {
      id: 'none', name: 'No hardware', suit: 'hw', chosen: true,
      subtitle: 'What production actually does',
      stats: [
        { k: 'capex', v: m(0, 'usd', 'DEPLOY.md:201') },
        { k: 'T1 provider', v: m('anthropic', '', 'DEPLOY.md:201') },
        { k: 'T1 model', v: m('claude-haiku-4-5', '', 'DEPLOY.md:201') },
        { k: 'cost / call', v: m(0.002, 'usd', 'llm/tiers.py:46') }
      ],
      can: [
        'Zero capex, zero idle, and it scales to zero when nobody is reading',
        'One vendor, one key, one failure mode, and an actual uptime guarantee',
        'Below about 50,000 calls a month it is simply the cheapest thing on this table'
      ],
      cant: [
        'The two open-model rows disappear from the picker, so "free and open" is a development-time truth, not a production one',
        'Every anonymous reader would be a billable call, which is why the anonymous path is forced to deterministic instead',
        'Named in the repo as an undecided launch gate, not as a settled answer'
      ],
      cantSrc: 'llm/tiers.py:98-99, docs/MONETIZATION_ECONOMICS.md'
    }
  ];

  /* =========================================================================
     5. THE DECK — data providers
     ========================================================================= */
  PQ.data = [
    {
      id: 'yfinance', name: 'yfinance', suit: 'data',
      stats: [
        { k: 'cost / call', v: m(0, 'usd', 'budget.py:353-363') },
        { k: 'serves', v: m('bars, quotes, chains', '', 'docs/DATA_STRATEGY.md') },
        { k: 'quote cadence', v: m('60 to 90 s', '', 'docs/DATA_STRATEGY.md') }
      ],
      can: ['Still the primary spine: bars, fundamentals, earnings dates, analyst ratings, and live options chains', 'Free'],
      cant: ['Rate-limits under load, so the app serves an honest "unavailable" plus stale-real cache rather than a guess'],
      cantSrc: 'finplatform/CLAUDE.md'
    },
    {
      id: 'edgar', name: 'SEC EDGAR', suit: 'data',
      stats: [
        { k: 'cost / call', v: m(0, 'usd', 'budget.py:353-363') },
        { k: 'via', v: m('edgartools', '', 'finplatform/CLAUDE.md') }
      ],
      can: ['Filings and retrieval excerpts, free, authoritative, and cached to disk'],
      cant: ['Needs the venv python. System python lacks edgartools, and the feature degrades to empty rather than erroring'],
      cantSrc: 'finplatform/CLAUDE.md'
    },
    {
      id: 'tavily', name: 'Tavily', suit: 'data', rung: 1,
      stats: [
        { k: 'cost / call', v: m(0.008, 'usd', 'budget.py:353-363', 'converted from 1 credit at $0.008') },
        { k: 'daily cap', v: m(60, 'calls', 'budget.py:34-37') },
        { k: 'monthly cap', v: m(900, 'calls', 'budget.py:34-37') },
        { k: 'cache ttl', v: m('7 days', '', 'research/search.py:84', 'RESEARCH_TTL_S') }
      ],
      can: [
        'Rung one: the quality search, budget-gated',
        'One call serves every user for the cache window. Feed plus brief plus coverage on one ticker is exactly one Tavily call, verified live'
      ],
      cant: [
        'Hard capped at 900 calls a month, which is the entire reason search cost cannot run away',
        'Exhaustion degrades to cache-with-a-timestamp. It is never an outage'
      ],
      cantSrc: 'budget.py, docs/MONETIZATION_ECONOMICS.md:49-56'
    },
    {
      id: 'serper', name: 'Serper', suit: 'data', rung: 2, keyless: true,
      stats: [
        { k: 'cost / call', v: m(0.0003, 'usd', 'budget.py:353-363') },
        { k: 'daily cap', v: m(400, 'calls', 'budget.py:34-37') },
        { k: 'monthly cap', v: m(2400, 'calls', 'budget.py:34-37') }
      ],
      can: ['Rung two: 27x cheaper than Tavily, for volume rather than quality'],
      cant: ['The key was never created. The rung is wired, tested, capped, and keyless'],
      cantSrc: 'docs/DATA_STRATEGY.md'
    },
    {
      id: 'searxng', name: 'SearXNG', suit: 'data', rung: 3, dead: true,
      stats: [
        { k: 'cost / call', v: m(0, 'usd', 'budget.py:353-363') },
        { k: 'in production', v: m('disabled', '', 'research/search.py:122-129') }
      ],
      can: ['Self-hosted, free, and a genuine floor under the ladder in local development'],
      cant: ['Measured in production: 4.1 seconds for zero results, twice, because Cloud Run\'s datacenter IP is blocked. Now skipped by environment rather than removed'],
      cantSrc: 'research/search.py:122-129'
    },
    {
      id: 'databento', name: 'Databento', suit: 'data',
      stats: [
        { k: 'per-call cap', v: m(0.02, 'usd', 'budget.py:252-257') },
        { k: 'daily cap', v: m(1.00, 'usd', 'budget.py:252-257') },
        { k: 'monthly cap', v: m(10.00, 'usd', 'budget.py:252-257') },
        { k: 'warm quote', v: m(0.392, 'usd', 'budget.py:252-257', 'quoted 2026-08-01') }
      ],
      can: [
        'Licensed daily bars, about 7 ms chart reads, and an options evidence locker back to 2013',
        'Policy is get_cost first, always. The free quote runs before the paid call'
      ],
      cant: [
        'Not flipped on. The seam exists and the switch is one env var',
        'Live data is not licensed, and the rail is parked behind "when traders pay us"'
      ],
      cantSrc: 'docs/DATA_STRATEGY.md, data/market.py'
    }
  ];

  /* =========================================================================
     6. THE TASK LEDGER — desk work, priced two ways.

     The human side is ESTIMATED and shows its arithmetic. The machine side is
     MEASURED. Keeping those two facts visually separate is the whole point.
     ========================================================================= */

  // Fully-loaded hourly, derived once, openly.
  PQ.hourly = {
    loadFactor: e(1.35, 'x', 'benefits, payroll tax, seat, and a market-data terminal on top of base'),
    deskHours: e(2600, 'hours/yr', 'a finance desk year, not the 2,080-hour office default'),
    seats: [
      { id: 'ra', label: 'Research assistant', base: [65, 85] },
      { id: 'assoc', label: 'Equity research associate', base: [130, 160] },
      { id: 'risk', label: 'Risk manager', base: [150, 200] },
      { id: 'opts', label: 'Options strategist', base: [180, 250] },
      { id: 'strat', label: 'Desk strategist', base: [200, 300] }
    ]
  };

  // Every seat's hourly, computed from the band above so the page cannot drift
  // from its own stated arithmetic.
  PQ.hourly.seats.forEach(s => {
    const lo = (s.base[0] * 1000 * 1.35) / 2600;
    const hi = (s.base[1] * 1000 * 1.35) / 2600;
    s.rate = [Math.round(lo), Math.round(hi)];
    s.mid = Math.round((lo + hi) / 2);
  });
  PQ.seatById = Object.fromEntries(PQ.hourly.seats.map(s => [s.id, s]));

  // minutes: how long the human version of this slice takes. ESTIMATED.
  // tier/credits/usd: what the platform actually charges and spends. MEASURED.
  PQ.tasks = [
    {
      task: 'Decide whether a name is even public',
      seat: 'ra', minutes: 3,
      surface: '/api/research/classify', tier: 'T0',
      note: 'No model. A resolver.'
    },
    {
      task: 'Log a trade and grade how it was exited',
      seat: 'ra', minutes: 12,
      surface: '/api/setups/*', tier: 'T0',
      note: 'Deterministic end to end. Never metered.'
    },
    {
      task: 'Skim a company: what it does, how it is doing',
      seat: 'assoc', minutes: 25,
      surface: '/api/research?depth=skim', tier: 'T1'
    },
    {
      task: 'Summarize one news item for the desk',
      seat: 'ra', minutes: 8,
      surface: '/api/news/summary', tier: 'T2'
    },
    {
      task: 'Write the morning market note',
      seat: 'strat', minutes: 45,
      surface: '/api/market/story', tier: 'T2',
      note: 'Auto and fast stay local here, so a paid call is never silent.'
    },
    {
      task: 'Answer what an options trade needs to work',
      seat: 'opts', minutes: 20,
      surface: '/api/options/ask', tier: 'T2'
    },
    {
      task: 'Build the pre-earnings brief',
      seat: 'assoc', minutes: 90,
      surface: '/api/earnings?gen=1', tier: 'T2'
    },
    {
      task: 'Run portfolio sensitivity',
      seat: 'risk', minutes: 45,
      surface: '/api/risky/sensitivity', tier: 'T3'
    },
    {
      task: 'Size a hedge against the book',
      seat: 'risk', minutes: 60,
      surface: '/api/risky/hedge', tier: 'T3'
    },
    {
      task: 'Write the full research note',
      seat: 'assoc', minutes: 240,
      surface: '/api/research?depth=deep', tier: 'T3',
      elapsed: m(12, 's', 'reports.py:321-359')
    },
    {
      task: 'Map the competitive landscape',
      seat: 'assoc', minutes: 300,
      surface: '/api/research/landscape', tier: 'T3'
    },
    {
      task: 'Dossier a private company with no ticker',
      seat: 'assoc', minutes: 480,
      surface: '/api/research/private', tier: 'T3D',
      elapsed: m(45, 's', 'reports.py:321-359', '5 stages'),
      cogs: m(0.52, 'usd', 'docs/MONETIZATION_ECONOMICS.md', '$0.40 model + about $0.12 search'),
      note: 'Priced flat at 10 credits against about $0.52 of cost. Thin on purpose.'
    }
  ];

  // Derive both sides of every row from the tables above.
  PQ.tasks.forEach(t => {
    const seat = PQ.seatById[t.seat];
    const tier = PQ.tierById[t.tier];
    t.seatLabel = seat.label;
    t.humanUsd = +(seat.mid * (t.minutes / 60)).toFixed(2);
    t.credits = tier.credits.value;
    t.machineUsd = t.cogs ? t.cogs.value : tier.perCall.value;
  });

  /* =========================================================================
     7. THE COLD OPEN — one request, both prices.
     ========================================================================= */
  PQ.coldOpen = {
    request: '/api/research?t=MU&depth=deep',
    human: {
      task: 'Write the full research note on Micron',
      seat: 'assoc',
      minutes: 240
    },
    machine: {
      search: m(0.008, 'usd', 'budget.py:353-363', 'one Tavily call'),
      model: m(0.011, 'usd', 'llm/tiers.py:61', 'one Sonnet call'),
      total: 0.019,
      elapsed: m(12, 's', 'reports.py:321-359'),
      charged: { credits: 5, usd: 0.62 }
    }
  };

  /* =========================================================================
     8. THE LINE — one request, station by station.
     ========================================================================= */
  PQ.line = [
    {
      id: 'throttle', name: 'Per-IP throttle', ms: 0, usd: 0,
      detail: 'The sixteen LLM-reaching GET paths share the metered POSTs\' bucket, so a read cannot cost more than a write.',
      src: 'serve.py:1500-1517'
    },
    {
      id: 'cache', name: 'Tiered cache', ms: 2, usd: 0,
      detail: 'memory, then Redis, then disk, then the shared Supabase table, then build. Hits promote upward.',
      src: 'data/tiered.py'
    },
    {
      id: 'ladder', name: 'Data ladder', ms: 1240, usd: 0.008,
      detail: 'Tavily, then Serper, then the floor. Every rung budget-gated. Failures are never cached.',
      src: 'research/search.py:122-129'
    },
    {
      id: 'budget', name: 'Retrieval budget', ms: 4, usd: 0,
      detail: 'A 30,000 character ceiling with per-kind quotas. What gets dropped is reported, not silently absorbed.',
      src: 'retrieval/budget.py'
    },
    {
      id: 'router', name: 'The router', ms: 8100, usd: 0.011, open: true,
      detail: 'Six decisions, in order, before a single token is generated. Open this one.',
      src: 'llm/router.py'
    },
    {
      id: 'invariants', name: 'Behavior invariants', ms: 12, usd: 0,
      detail: 'No fabrication, no obeying injected instructions, honest caveats, abstain when the data is not there.',
      src: 'llm/eval/'
    },
    {
      id: 'envelope', name: 'Report envelope', ms: 3, usd: 0,
      detail: 'Every surface returns the same shape, and provenance is part of it: model, tier, credits, elapsed, sources.',
      src: 'reports.py'
    }
  ];

  /* =========================================================================
     9. THE BILL — the economics model behind Toy 2.
     ========================================================================= */
  PQ.econ = {
    // Revenue side
    plans: [
      { id: 'free', label: 'Free', price: 0, credits: 9, tier: 'T1' },
      { id: 'member', label: 'Pro', price: 8, credits: 40, tier: 'T2' },
      { id: 'analyst', label: 'Analyst', price: 14, credits: 120, tier: 'T3' },
      { id: 'options', label: 'Options', price: 24, credits: 300, tier: 'T3' }
    ],
    packs: [
      { id: 'p1', price: 1, credits: 10 },
      { id: 'p3', price: 3, credits: 40 },
      { id: 'p10', price: 10, credits: 200 },
      { id: 'p25', price: 25, credits: 750 }
    ],
    stripe: { pct: m(0.029, '', 'docs/MONETIZATION_ECONOMICS.md'), flat: m(0.30, 'usd', 'docs/MONETIZATION_ECONOMICS.md') },

    // Cost side
    infraFloor: e(15, 'usd/mo', 'Cloud Run at low traffic runs $5 to $25/mo; midpoint taken'),
    infraStep: e(12, 'usd/mo per instance', 'each additional warm instance at the 2Gi/2vCPU shape'),
    instanceCapacity: e(2000, 'subscribers/instance', 'a rough serving assumption, not a load test'),

    // The shape of the argument: search is capped, models are not.
    searchCapMonthly: m(7.92, 'usd/mo', 'budget.py', '900 Tavily at $0.008 plus 2,400 Serper at $0.0003'),
    tavilyUnit: m(0.008, 'usd', 'budget.py:353-363'),
    serperUnit: m(0.0003, 'usd', 'budget.py:353-363'),
    tavilyMonthlyCap: m(900, 'calls', 'budget.py'),
    serperMonthlyCap: m(2400, 'calls', 'budget.py'),

    // How search demand grows: distinct queries per cache window, not users.
    // Modeled as a saturating curve because the ticker universe is finite.
    distinctQueryCeiling: e(1200, 'queries/mo', 'the practical ceiling of distinct ticker-and-window queries across a retail universe'),

    breakEven: m('3 to 6', 'Pro subscribers', 'docs/MONETIZATION_ECONOMICS.md'),
    margins: {
      member: m(0.93, '', 'docs/MONETIZATION_ECONOMICS.md'),
      analyst: m(0.90, '', 'docs/MONETIZATION_ECONOMICS.md'),
      options: m(null, '', 'docs/MONETIZATION_ECONOMICS.md', 'unbounded on the revenue side, so this one can go negative')
    },
    // A typical large-model call is the $0.011 planning constant. A heavy desk
    // query carrying near the full retrieval ceiling is roughly three times
    // that, and the difference is the entire reason the clamp is denominated in
    // dollars rather than in calls.
    typicalCallUsd: m(0.011, 'usd', 'llm/tiers.py:61', 'measured on a representative analyst prompt'),
    heavyCallUsd: e(0.030, 'usd', 'a desk query carrying near the 30,000-character retrieval ceiling, roughly 3x the typical prompt; this is the rate the economics doc reasons with'),

    // The failure case the clamps exist to prevent.
    optionsRisk: {
      callsPerDay: m(30, 'sonnet calls/day', 'docs/MONETIZATION_ECONOMICS.md'),
      costTypical: 9.90,
      cost: m(27, 'usd/mo', 'docs/MONETIZATION_ECONOMICS.md', '30 calls/day at the heavy rate, not the typical one'),
      revenue: 24,
      mitigations: [
        'ROLE_DAILY_BUDGET_USD caps the day at $0.50, about $15/mo, and degrades the model instead of blocking the action',
        'The quota is 300 credits, about 60 Sonnet reports, roughly 4x a real heavy user'
      ]
    },
    unharvested: m('20 to 40', 'percent of input cost', 'docs/MONETIZATION_ECONOMICS.md', 'prompt caching reads at about 0.1x and is not implemented')
  };

  /* =========================================================================
     10. THE CROSSOVER — hardware, weighed.
     ========================================================================= */
  PQ.crossover = {
    perCall: m(0.002, 'usd', 'llm/tiers.py:46', 'Haiku, which is what production actually runs at T1'),
    options: [
      { id: 'none', label: 'Haiku for all', monthly: 0, note: 'What production does' },
      { id: 'mac', label: 'Mac Mini M4', monthly: 42, note: '$999 over 24 months' },
      { id: 'gpu5090', label: 'RTX 5090 + vLLM', monthly: 96, note: '$2,300 over 24 months' },
      { id: 'h100', label: 'Rented H100', monthly: 1825, note: '$2.50/hr, always on' }
    ],
    // A Pro subscriber at 40 credits/mo runs about 20 Haiku actions.
    callsPerProSubscriber: e(20, 'calls/mo', '40 credits at 2 credits per Haiku action')
  };

  /* =========================================================================
     11. WHAT BROKE.
     ========================================================================= */
  PQ.failures = [
    {
      title: '1Gi was not enough',
      body: 'Ten OOM kills in sixteen hours, at 1024 to 1060 MiB. Cloud Run does not throttle a container that runs out of memory. It kills the instance and starts another one.',
      lesson: 'A memory limit is not a budget. It is a cliff.',
      src: 'DEPLOY.md:236-278'
    },
    {
      title: 'scipy was never installed in production',
      body: 'For the entire life of the /risky surface, the optimizer\'s max-Sharpe path never ran. The import failed silently and the code fell through to a simpler branch. Then scipy became a real dependency, imported at server start, and helped push memory over the line.',
      lesson: 'The same missing dependency was invisible for months and then fatal in a day. Silent degradation is the expensive failure mode, not the loud one.',
      src: 'DEPLOY.md:236-278'
    },
    {
      title: 'A search rung that only failed in production',
      body: 'SearXNG worked locally and returned nothing in the cloud, because Cloud Run\'s datacenter IP is blocked by the upstreams it queries. Measured: 4.1 seconds for zero results, twice, on every request that reached it.',
      lesson: 'It is now skipped by environment rather than deleted, because the rung is still real in development.',
      src: 'research/search.py:122-129'
    },
    {
      title: 'The comment drifted, the constant did not',
      body: 'credits.py opens with a docstring advertising 20 credits a month for Pro and unlimited for Options. The enforced table two hundred lines below says 40 and 300.',
      lesson: 'The number a user actually gets was right the whole time. Only the prose describing it was wrong, which is the argument for putting invariants in code rather than in documentation.',
      src: 'auth/credits.py:9 vs :122-135'
    }
  ];

  /* =========================================================================
     12. OPEN GATES — what is not decided.
     ========================================================================= */
  PQ.openGates = [
    { title: 'The production T1 provider', body: 'Cloud Run has no GPU, so today every free-tier action is a Haiku call. vLLM on owned hardware, deterministic-only, or Haiku-for-everyone is an undecided launch gate, not a settled answer.' },
    { title: 'The Serper key', body: 'Rung two of the search ladder is wired, capped, tested, and keyless.' },
    { title: 'Prompt caching', body: 'Cache reads run at about a tenth of input cost. It is documented, unimplemented, and worth 20 to 40 percent of the input bill.' },
    { title: 'The 2026-08-31 price cliff', body: 'Sonnet 5 intro pricing ends. The same call goes from about $0.011 to about $0.0165. The escape hatch is one environment variable.' }
  ];

  global.PQ = PQ;
})(window);
