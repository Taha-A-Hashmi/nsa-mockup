/* ═══════════════════════════════════════════════════════════════
   NSA one-page concept — motion layer
   gsap + ScrollTrigger + SplitText + Lenis (all vendored in /lib)
   ═══════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger, SplitText);
document.documentElement.classList.add('js');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

/* ── Lenis smooth scroll ── */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* anchor links ride Lenis */
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView();
  });
});

/* ── Loader (once per session) ── */
const loaderDone = (() => {
  const el = $('#loader');
  let seen = false;
  try { seen = sessionStorage.getItem('nsa-loaded') === '1'; } catch (e) {}
  if (!el || seen || reduceMotion) {
    if (el) el.classList.add('done');
    return Promise.resolve();
  }
  try { sessionStorage.setItem('nsa-loaded', '1'); } catch (e) {}
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: () => { el.classList.add('done'); resolve(); } });
    tl.to('.loader-logo', { opacity: 1, duration: 0.5, ease: 'power2.out' })
      .to('.loader-bar span', { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0.15)
      .to(el, { opacity: 0, duration: 0.01 }, '+=0.15');
    setTimeout(() => { el.classList.add('done'); resolve(); }, 4000); // failsafe
  });
})();

/* ── Hero entrance + HUD ── */
(function heroEntrance() {
  const title = $('.hero-title');
  if (!title) return;
  if (reduceMotion) { $$('.hud-chip').forEach((c) => (c.style.opacity = 1)); return; }

  const paths = $$('.hud-path');
  paths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });

  Promise.all([document.fonts.ready, loaderDone]).then(() => {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'sl' });
    title.classList.add('split-ready');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(split.lines, { yPercent: 110, duration: 1.05, stagger: 0.09 }, 0.05)
      .from('.hero-eyebrow', { opacity: 0, y: 14, duration: 0.7 }, 0.2)
      .from('.hero-sub', { opacity: 0, y: 20, duration: 0.8 }, 0.5)
      .from('.hero-cta .btn', { opacity: 0, y: 18, duration: 0.7, stagger: 0.1 }, 0.65)
      .from('.hero-foot', { opacity: 0, duration: 0.9 }, 0.9)
      .to(paths, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.15 }, 0.8)
      .to('.hud-chip', { opacity: 1, duration: 0.6, stagger: 0.18 }, 1.2);

    $$('.hud-chip').forEach((chip, i) => {
      gsap.to(chip, { y: i % 2 ? 8 : -8, duration: 3 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  });

  /* parallax out */
  gsap.to('.hero-video', {
    scale: 1.12, yPercent: 10, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero-inner', {
    opacity: 0, yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom 30%', scrub: true },
  });
})();

/* ── Scroll progress + header hide ── */
(function chrome() {
  gsap.to('#progressFill', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: 0.3 },
  });
  const header = $('#siteHeader');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      header.classList.toggle('hide', y > 340 && y > lastY + 2);
      lastY = y;
    },
  });
})();

/* ── Marquees ── */
(function marquees() {
  $$('.marquee').forEach((m) => {
    const track = $('.marquee-track', m);
    if (!track) return;
    const kids = Array.from(track.children);
    /* duplicate until we safely cover 2× the viewport */
    while (track.scrollWidth < innerWidth * 2.2) {
      kids.forEach((k) => track.appendChild(k.cloneNode(true)));
    }
    /* one more full copy so -50% lands on identical content */
    Array.from(track.children).forEach((k) => track.appendChild(k.cloneNode(true)));
    const half = track.scrollWidth / 2;
    const speed = parseFloat(m.dataset.speed || '40');
    if (reduceMotion) return;
    gsap.to(track, { x: -half, duration: half / speed, ease: 'none', repeat: -1 });
  });
})();

/* ── Section title reveals ── */
(function titles() {
  const els = $$('.reveal-title, .reveal-line');
  if (reduceMotion || !els.length) return;
  Promise.all([document.fonts.ready, loaderDone]).then(() => {
    els.forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl' });
      el.classList.add('split-ready');
      gsap.from(split.lines, {
        yPercent: 110, duration: 0.95, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
  });
})();

/* ── Generic rises ── */
(function rises() {
  if (reduceMotion) return;
  $$('.card, .stat, .mile-none').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 34, duration: 0.8, ease: 'power2.out', delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  gsap.from('.people-media', {
    clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power3.inOut',
    scrollTrigger: { trigger: '.people', start: 'top 75%', once: true },
  });
})();

/* ── Count-ups ── */
(function counters() {
  $$('.count').forEach((el) => {
    const to = parseFloat(el.dataset.to);
    if (reduceMotion) { el.textContent = to; return; }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 1.6, ease: 'power2.out',
      snap: { v: 1 },
      onUpdate: () => (el.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
})();

/* ── Spotlight cards ── */
if (finePointer) {
  $$('.spot').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

/* ── Card 3D tilt ── */
if (finePointer && !reduceMotion) {
  $$('.card').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power2' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power2' });
    gsap.set(card, { transformPerspective: 800 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
      ry(((e.clientX - r.left) / r.width - 0.5) * 9);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ── Magnetic buttons ── */
if (finePointer && !reduceMotion) {
  $$('.magnetic').forEach((btn) => {
    const qx = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3' });
    const qy = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      qx((e.clientX - r.left - r.width / 2) * 0.28);
      qy((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}

/* ── Custom cursor ── */
if (finePointer && !reduceMotion) {
  document.documentElement.classList.add('has-cursor');
  const wrap = $('.cursor');
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
  addEventListener('pointermove', (e) => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    wrap.classList.toggle('hot', !!e.target.closest('a, button, .card'));
  });
}

/* ── Migration path scrub ── */
(function migration() {
  const path = $('#path');
  if (!path || reduceMotion) return;
  const items = $$('li', path);
  ScrollTrigger.create({
    trigger: path, start: 'top 72%', end: 'bottom 45%', scrub: 0.4,
    onUpdate: (self) => {
      path.style.setProperty('--fill', self.progress.toFixed(4));
      items.forEach((li, i) => li.classList.toggle('on', self.progress >= i / items.length + 0.02));
    },
  });
})();

/* ── Story: pinned horizontal timeline ── */
(function story() {
  const pin = $('.story-pin');
  const track = $('#storyTrack');
  const year = $('#storyYear');
  if (!pin || !track) return;
  if (reduceMotion) { pin.style.overflowX = 'auto'; return; }
  const miles = $$('.mile', track);
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + parseFloat(getComputedStyle(pin).paddingLeft) * 2);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.story', start: 'top top', end: () => '+=' + (dist() + innerHeight * 0.4),
      pin: pin, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const i = Math.min(miles.length - 1, Math.floor(self.progress * miles.length));
        const y = miles[i].dataset.year;
        if (year.textContent !== y) year.textContent = y;
      },
    },
  });
  gsap.from(miles, {
    opacity: 0, y: 40, duration: 0.7, ease: 'power2.out', stagger: 0.06,
    scrollTrigger: { trigger: '.story', start: 'top 70%', once: true },
  });
})();

/* ── Pause videos offscreen ── */
(function videoBudget() {
  const vids = $$('video');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) { v.play().catch(() => {}); }
      else v.pause();
    });
  }, { rootMargin: '120px' });
  vids.forEach((v) => io.observe(v));
})();
