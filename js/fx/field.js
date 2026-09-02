/* The Field: one persistent particle world behind the whole page.
   Particles morph between formations as each section scrolls into place —
   the site reads as a single continuous 3D space. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const N = 3000;

/* formation generators — index → [x, y, z] in world units (camera z 14) */
const F = {
  cloud(i) {
    const r = mulberry(i * 7 + 1);
    return [(r() - 0.5) * 24, (r() - 0.5) * 14, (r() - 0.5) * 7];
  },
  lattice(i) {
    const ix = i % 20, iy = Math.floor(i / 20) % 12, iz = Math.floor(i / 240) % 13;
    const r = mulberry(i * 3 + 5);
    return [(ix - 9.5) * 1.12 + (r() - 0.5) * 0.14, (iy - 5.5) * 1.12 + (r() - 0.5) * 0.14, -iz * 1.1 + (r() - 0.5) * 0.14];
  },
  rings(i) {
    const ring = i % 3;
    const rad = [4.2, 5.8, 7.4][ring];
    const tilt = [0.5, -0.35, 0.15][ring];
    const a = (i / N) * Math.PI * 2 * 47 + ring;
    const x = Math.cos(a) * rad, z0 = Math.sin(a) * rad;
    return [x, z0 * Math.sin(tilt), z0 * Math.cos(tilt) - 2];
  },
  stream(i) {
    const r = mulberry(i * 11 + 9);
    const t = i / N;
    const x = -13 + t * 26;
    const lane = (i % 5 - 2) * 0.85;
    return [x, Math.sin(x * 0.42 + lane) * 2.6 + lane, (r() - 0.5) * 4];
  },
  shell(i) {
    const g = (1 + Math.sqrt(5)) / 2;
    const th = 2 * Math.PI * i / g;
    const ph = Math.acos(1 - 2 * (i + 0.5) / N);
    const rad = 5.2;
    return [rad * Math.cos(th) * Math.sin(ph), rad * Math.cos(ph), rad * Math.sin(th) * Math.sin(ph) - 1];
  },
  helix(i) {
    const t = i / N;
    const a = t * Math.PI * 10;
    return [-12 + t * 24, Math.sin(a) * 2.6, Math.cos(a) * 2.6 - 1];
  },
  focus(i) {
    const r = mulberry(i * 13 + 3);
    const a = (i / N) * Math.PI * 2 * 113;
    const rad = 4.2 + (r() - 0.5) * 0.9;
    return [Math.cos(a) * rad, Math.sin(a) * rad * 0.72, (r() - 0.5) * 2];
  },
};
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* which formation each section wants */
const SECTIONS = [
  ['.hero', 'cloud'], ['.stats', 'lattice'], ['#solutions', 'lattice'],
  ['#ecosystem', 'rings'], ['#migration', 'stream'], ['#network', 'shell'],
  ['.people', 'cloud'], ['.story', 'helix'], ['#contact', 'focus'],
];

export function initField(canvas, { small = false } = {}) {
  const fx = mountScene(canvas, { fov: 50, z: 14, dprMax: small ? 1.1 : 1.4 });
  const group = new THREE.Group();
  fx.scene.add(group);

  const n = small ? 1400 : N;
  /* precompute every formation once */
  const forms = {};
  for (const key of Object.keys(F)) {
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = F[key](i);
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
    }
    forms[key] = arr;
  }

  const pos = new Float32Array(forms.cloud);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) phase[i] = Math.random() * Math.PI * 2;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({
    map: softDot(), color: 0x2593c9, size: 0.11, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  /* a warm minority riding the same formations */
  const wn = Math.floor(n / 14);
  const wpos = new Float32Array(wn * 3);
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
  group.add(new THREE.Points(wgeo, new THREE.PointsMaterial({
    map: softDot(), color: 0xf0a04a, size: 0.17, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* section anchors → formation timeline */
  let anchors = [];
  function measure() {
    anchors = SECTIONS.map(([sel, form]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { doc: r.top + scrollY + r.height * 0.5, form };
    }).filter(Boolean).sort((a, b) => a.doc - b.doc);
  }
  measure();
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('resize', measure);

  function blendState() {
    const y = scrollY + innerHeight * 0.5;
    if (!anchors.length) return { a: 'cloud', b: 'cloud', t: 0 };
    if (y <= anchors[0].doc) return { a: anchors[0].form, b: anchors[0].form, t: 0 };
    const last = anchors[anchors.length - 1];
    if (y >= last.doc) return { a: last.form, b: last.form, t: 0 };
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y >= anchors[i].doc && y < anchors[i + 1].doc) {
        let u = (y - anchors[i].doc) / (anchors[i + 1].doc - anchors[i].doc);
        u = u * u * (3 - 2 * u);
        return { a: anchors[i].form, b: anchors[i + 1].form, t: u };
      }
    }
    return { a: last.form, b: last.form, t: 0 };
  }

  fx.run((dt, t) => {
    const { a, b, t: u } = blendState();
    const A = forms[a], B = forms[b];
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const wob = Math.sin(t * 0.7 + phase[i]) * 0.16;
      pos[j] = A[j] + (B[j] - A[j]) * u + wob;
      pos[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * u + Math.cos(t * 0.6 + phase[i] * 1.3) * 0.16;
      pos[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * u;
    }
    geo.attributes.position.needsUpdate = true;
    for (let k = 0; k < wn; k++) {
      const i = k * 14, j = i * 3;
      wpos[k * 3] = pos[j]; wpos[k * 3 + 1] = pos[j + 1]; wpos[k * 3 + 2] = pos[j + 2];
    }
    wgeo.attributes.position.needsUpdate = true;

    group.rotation.y += ((pointer.x * 0.1) - group.rotation.y) * 0.03;
    group.rotation.x += ((pointer.y * 0.06) - group.rotation.x) * 0.03;
  });
}
