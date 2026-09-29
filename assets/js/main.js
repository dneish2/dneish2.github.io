/* Neishfolio — shared utilities: scroll reveal, header state, footer year. */
(function () {
  'use strict';

  // Scroll reveal — one observer, unobserve after entry. CSS does the motion;
  // hiding styles are gated on html.js + prefers-reduced-motion in main.css.
  var revealed = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealed.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }

  // Header border appears once the page scrolls.
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Demo reels: the markup is a plain <video controls>, so it works without JS.
  // Here the native controls give way to a poster play button until someone
  // asks for the video, and only one reel plays at a time.
  var reels = document.querySelectorAll('.demo-reel video');
  reels.forEach(function (video) {
    var frame = video.parentElement;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'play';
    btn.setAttribute('aria-label', 'Play: ' + (video.dataset.title || 'demo') + ', ' + (video.dataset.length || '') + ', narrated');
    btn.innerHTML =
      '<span class="play-disc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg></span>' +
      '<span class="play-label"><b></b><span></span></span>';
    btn.querySelector('b').textContent = video.dataset.title || 'Watch the demo';
    btn.querySelector('.play-label span').textContent = 'Watch · ' + (video.dataset.length || '') + ' · sound on';
    video.controls = false;
    frame.appendChild(btn);
    btn.addEventListener('click', function () {
      video.controls = true;
      btn.remove();
      video.play();
    });
    video.addEventListener('play', function () {
      reels.forEach(function (other) { if (other !== video) other.pause(); });
    });
  });

  // Footer year.
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // Footer sign-off types itself when it scrolls into view.
  var signoff = document.querySelector('.site-footer .signoff');
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (signoff && motionOK && 'IntersectionObserver' in window) {
    var full = signoff.textContent;
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      signoff.classList.add('typing');
      signoff.textContent = '';
      var i = 0;
      (function step() {
        i += 1;
        signoff.textContent = full.slice(0, i);
        if (i < full.length) {
          setTimeout(step, 26);
        } else {
          setTimeout(function () { signoff.classList.remove('typing'); }, 1400);
        }
      })();
    }, { threshold: 0.5 }).observe(signoff);
  }
})();
