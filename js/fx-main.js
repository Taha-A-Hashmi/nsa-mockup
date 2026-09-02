/* Entry for the three.js layer. Runs after main.js (module scripts are deferred),
   so gsap/ScrollTrigger globals already exist. */
import { initHeroNet } from './fx/hero-net.js';
import { initWarehouse } from './fx/warehouse.js';
import { initGlobe } from './fx/globe.js';
import { initOrbit } from './fx/orbit.js';
import { initGuide } from './fx/guide.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 760;

function tryInit(name, fn) {
  try { fn(); } catch (e) { console.warn(`[fx] ${name} failed:`, e); }
}

const netCanvas = document.querySelector('.hero-net');
if (netCanvas && !small && !reduceMotion) tryInit('hero-net', () => initHeroNet(netCanvas));

const opsSection = document.querySelector('#ops');
const opsCanvas = document.querySelector('.ops-canvas');
if (opsSection && opsCanvas) tryInit('warehouse', () => initWarehouse(opsCanvas, opsSection, { reduceMotion, small }));

const globeCanvas = document.querySelector('.globe-canvas');
if (globeCanvas) tryInit('globe', () => initGlobe(globeCanvas, { reduceMotion }));

const orbitCanvas = document.querySelector('.orbit-canvas');
if (orbitCanvas) tryInit('orbit', () => initOrbit(orbitCanvas, { reduceMotion }));

const guideCanvas = document.querySelector('.guide-canvas');
if (guideCanvas && !reduceMotion) tryInit('guide', () => initGuide(guideCanvas, { small }));

/* Triggers were created across two scripts — re-sort by document order so
   the ops pin (early in the page) plays nicely with the story pin. */
if (window.ScrollTrigger) {
  ScrollTrigger.sort();
  requestAnimationFrame(() => ScrollTrigger.refresh());
}
