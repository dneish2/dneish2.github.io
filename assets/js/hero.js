/* Neishfolio hero — a decision graph that keeps evaluating.
   ~24 nodes in left-to-right layers; every few seconds one root-to-leaf path
   lights up hop by hop, losing branches dim, the chosen leaf holds a glow.
   Decorative only (canvas is aria-hidden); pauses offscreen and on tab blur;
   renders a single static pre-lit frame under prefers-reduced-motion. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var ACCENT = '227, 168, 59';   // --accent
  var INK = '237, 232, 222';     // --ink
  var HOP_MS = 260;              // per-edge light-up time
  var HOLD_MS = 1600;            // leaf glow hold
  var FADE_MS = 900;
  var REST_MS = 1200;
  var FPS = 30;

  var small = window.matchMedia('(max-width: 640px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- graph ---------------------------------------------------------------
  var layers, nodes, edges;

  function buildGraph() {
    var counts = small.matches ? [1, 3, 4, 3] : [1, 4, 6, 7, 5];
    layers = [];
    nodes = [];
    edges = [];
    counts.forEach(function (n, li) {
      var layer = [];
      for (var i = 0; i < n; i++) {
        var node = {
          layer: li,
          fx: (li + 0.5) / counts.length,                          // fraction x
          fy: (i + 0.5) / n + (Math.random() - 0.5) * (0.5 / n),   // fraction y + jitter
          r: li === 0 ? 4 : 3
        };
        layer.push(node);
        nodes.push(node);
      }
      layers.push(layer);
    });
    // each node connects to 2-3 nodes in the next layer, nearest-first
    for (var li = 0; li < layers.length - 1; li++) {
      layers[li].forEach(function (a) {
        var next = layers[li + 1].slice().sort(function (p, q) {
          return Math.abs(p.fy - a.fy) - Math.abs(q.fy - a.fy);
        });
        var fan = 2 + (Math.random() < 0.4 ? 1 : 0);
        next.slice(0, fan).forEach(function (b) {
          edges.push({ a: a, b: b });
        });
      });
    }
  }

  function pickPath() {
    var path = [layers[0][0]];
    for (var li = 0; li < layers.length - 1; li++) {
      var from = path[path.length - 1];
      var options = edges.filter(function (e) { return e.a === from; });
      if (!options.length) break;
      path.push(options[Math.floor(Math.random() * options.length)].b);
    }
    return path;
  }

  function pathEdges(path) {
    var out = [];
    for (var i = 0; i < path.length - 1; i++) {
      var e = edges.find(function (ed) { return ed.a === path[i] && ed.b === path[i + 1]; });
      if (e) out.push(e);
    }
    return out;
  }

  // --- sizing ----------------------------------------------------------------
  var W = 0, H = 0;
  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function nx(n) { return 0.04 * W + n.fx * 0.92 * W; }
  function ny(n) { return 0.08 * H + n.fy * 0.84 * H; }

  // --- drawing ----------------------------------------------------------------
  // progress: 0..1 along the whole path; dim: 0..1 how much losers fade
  function draw(path, pEdges, progress, dim, glow) {
    ctx.clearRect(0, 0, W, H);
    var hops = pEdges.length;

    edges.forEach(function (e) {
      var onPath = pEdges.indexOf(e) !== -1;
      var alpha = onPath ? 0.10 : 0.10 * (1 - dim * 0.75);
      ctx.strokeStyle = 'rgba(' + INK + ',' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx(e.a), ny(e.a));
      ctx.lineTo(nx(e.b), ny(e.b));
      ctx.stroke();
    });

    // lit portion of the path
    if (hops) {
      var litHops = progress * hops;
      pEdges.forEach(function (e, i) {
        var t = Math.max(0, Math.min(1, litHops - i));
        if (t <= 0) return;
        var x1 = nx(e.a), y1 = ny(e.a), x2 = nx(e.b), y2 = ny(e.b);
        ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.85 * glow) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
        ctx.stroke();
      });
    }

    nodes.forEach(function (n) {
      var idx = path.indexOf(n);
      var lit = idx !== -1 && progress * hops >= idx - 0.02;
      var isLeaf = idx === path.length - 1;
      var a;
      if (lit) {
        a = 0.9 * glow;
        ctx.fillStyle = 'rgba(' + ACCENT + ',' + a + ')';
      } else {
        a = 0.35 * (1 - dim * 0.7);
        ctx.fillStyle = 'rgba(' + INK + ',' + a + ')';
      }
      ctx.beginPath();
      ctx.arc(nx(n), ny(n), lit && isLeaf && progress >= 1 ? n.r + 1.5 : n.r, 0, Math.PI * 2);
      ctx.fill();
      if (lit && isLeaf && progress >= 1) {
        ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.35 * glow) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx(n), ny(n), n.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  // --- animation loop ----------------------------------------------------------
  var running = false, visible = true, rafId = 0, lastFrame = 0;
  var path, pEdges, phase, phaseStart;

  function newRound(now) {
    path = pickPath();
    pEdges = pathEdges(path);
    phase = 'trace';
    phaseStart = now;
  }

  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    if (now - lastFrame < 1000 / FPS) return;
    lastFrame = now;

    var t = now - phaseStart;
    var hops = pEdges.length;
    if (phase === 'trace') {
      var p = Math.min(1, t / (HOP_MS * hops));
      draw(path, pEdges, p, p, 1);
      if (p >= 1) { phase = 'hold'; phaseStart = now; }
    } else if (phase === 'hold') {
      draw(path, pEdges, 1, 1, 1);
      if (t >= HOLD_MS) { phase = 'fade'; phaseStart = now; }
    } else if (phase === 'fade') {
      var g = Math.max(0, 1 - t / FADE_MS);
      draw(path, pEdges, 1, g, g);
      if (g <= 0) { phase = 'rest'; phaseStart = now; }
    } else {
      draw(path, pEdges, 0, 0, 0);
      if (t >= REST_MS) newRound(now);
    }
  }

  function start() {
    if (running || reduced.matches || !visible) return;
    running = true;
    lastFrame = 0;
    newRound(performance.now());
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function staticFrame() {
    var p = pickPath();
    draw(p, pathEdges(p), 1, 1, 1);
  }

  function init() {
    buildGraph();
    resize();
    if (reduced.matches) { staticFrame(); } else { start(); }
  }

  // pause when hero offscreen / tab hidden
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (reduced.matches) return;
      if (visible) start(); else stop();
    }, { threshold: 0.05 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (reduced.matches) return;
    if (document.hidden) stop();
    else if (visible) start();
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      stop();
      init();
    }, 150);
  });

  reduced.addEventListener && reduced.addEventListener('change', function () {
    stop();
    init();
  });

  init();

  // --- beach vignette: click the sun for sunset ----------------------------------
  var beach = document.querySelector('.beach');
  if (beach) {
    var sun = beach.querySelector('.vg-sun');
    if (sun) {
      var toggle = function () { beach.classList.toggle('sunset'); };
      sun.addEventListener('click', toggle);
      sun.setAttribute('tabindex', '0');
      sun.setAttribute('role', 'button');
      sun.setAttribute('aria-label', 'Toggle sunset');
      sun.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }
  }

  // --- scramble tagline ---------------------------------------------------------
  // Resolves the hero one-liner character by character, once, on load.
  var el = document.querySelector('[data-scramble]');
  if (el) {
    var target = el.getAttribute('data-scramble');
    if (reduced.matches) {
      el.textContent = target;
    } else {
      var GLYPHS = '▓▒░01<>/{}+=*';
      var DURATION = 900;
      var t0 = performance.now();
      el.setAttribute('aria-label', target);
      (function scramble(now) {
        var p = Math.min(1, (now - t0) / DURATION);
        var solved = Math.floor(p * target.length);
        var out = target.slice(0, solved);
        for (var i = solved; i < target.length; i++) {
          out += target[i] === ' ' ? ' '
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(scramble);
        else el.textContent = target;
      })(t0);
    }
  }
})();
