/* Digital-twin warehouse: a glowing wireframe DC the camera flies through on scroll.
   Racks/floor = additive line work, cartons = soft points, order pulses travel the aisle. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function initWarehouse(canvas, section, { reduceMotion = false, small = false } = {}) {
  const fx = mountScene(canvas, { fov: 60, dprMax: small ? 1.25 : 1.5 });
  fx.scene.fog = new THREE.FogExp2(0x04080f, 0.03);

  const BAYS = small ? 16 : 26;
  const Z0 = 8, BAY = 3;
  const ZEND = Z0 - BAYS * BAY;
  const LEVELS = [0.7, 2.5, 4.3, 6.1];

  /* ── rack frames ── */
  const framePts = [];
  const push = (x1, y1, z1, x2, y2, z2) => framePts.push(x1, y1, z1, x2, y2, z2);
  for (const sideX of [-6, 6]) {
    for (const dx of [-0.75, 0.75]) {
      const x = sideX + dx;
      for (let b = 0; b <= BAYS; b++) push(x, 0, Z0 - b * BAY, x, 6.7, Z0 - b * BAY); // uprights
      for (const y of LEVELS) push(x, y, Z0, x, y, ZEND); // long beams
    }
    for (let b = 0; b <= BAYS; b++)
      for (const y of LEVELS) push(sideX - 0.75, y, Z0 - b * BAY, sideX + 0.75, y, Z0 - b * BAY); // cross beams
  }
  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(framePts, 3));
  fx.scene.add(new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({
    color: 0x1d5a80, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ── floor grid + aisle edges ── */
  const gridPts = [];
  for (let x = -9; x <= 9; x += 1.5) gridPts.push(x, 0, Z0 + 4, x, 0, ZEND - 4);
  for (let z = Z0 + 4; z >= ZEND - 4; z -= BAY) gridPts.push(-9, 0, z, 9, 0, z);
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  fx.scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({
    color: 0x0e3350, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const aisleGeo = new THREE.BufferGeometry();
  aisleGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -4.4, 0.01, Z0 + 4, -4.4, 0.01, ZEND - 4, 4.4, 0.01, Z0 + 4, 4.4, 0.01, ZEND - 4,
  ], 3));
  fx.scene.add(new THREE.LineSegments(aisleGeo, new THREE.LineBasicMaterial({
    color: 0x35c3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ── cartons ── */
  const cold = [], hot = [];
  for (const sideX of [-6, 6]) {
    for (let b = 0; b < BAYS; b++) {
      for (const y of LEVELS) {
        for (let k = 0; k < 2; k++) {
          if (Math.random() > 0.62) continue;
          const x = sideX + (Math.random() - 0.5) * 1.1;
          const z = Z0 - b * BAY - 0.7 - k * 1.4 + (Math.random() - 0.5) * 0.4;
          (Math.random() < 0.1 ? hot : cold).push(x, y + 0.35, z);
        }
      }
    }
  }
  const coldGeo = new THREE.BufferGeometry();
  coldGeo.setAttribute('position', new THREE.Float32BufferAttribute(cold, 3));
  fx.scene.add(new THREE.Points(coldGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0x5f88b0, size: 0.46, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const hotGeo = new THREE.BufferGeometry();
  hotGeo.setAttribute('position', new THREE.Float32BufferAttribute(hot, 3));
  const hotMat = new THREE.PointsMaterial({
    map: softDot(), color: 0xf0a04a, size: 0.7, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  fx.scene.add(new THREE.Points(hotGeo, hotMat));

  /* ── drifting dust ── */
  const dust = new Float32Array((small ? 160 : 300) * 3);
  for (let i = 0; i < dust.length; i += 3) {
    dust[i] = (Math.random() - 0.5) * 18;
    dust[i + 1] = Math.random() * 7;
    dust[i + 2] = Z0 + 6 - Math.random() * (BAYS * BAY + 12);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  fx.scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0x9fc6e8, size: 0.14, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ── order pulses: bright sprites running the aisle, into a bay, up to a shelf ── */
  const pulses = [];
  const pulseMat = new THREE.SpriteMaterial({
    map: softDot(), color: 0x66d4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (let i = 0; i < (small ? 4 : 7); i++) {
    const sp = new THREE.Sprite(pulseMat.clone());
    sp.scale.setScalar(0.9);
    fx.scene.add(sp);
    pulses.push({ sp, t: Math.random(), dur: 7 + Math.random() * 5, side: Math.random() < 0.5 ? -1 : 1,
      bayZ: Z0 - (2 + Math.random() * (BAYS - 4)) * BAY, level: LEVELS[Math.floor(Math.random() * 4)] });
  }
  function pulsePos(p) {
    const { side, bayZ, level } = p;
    const u = p.t;
    if (u < 0.6) { // run the aisle
      const k = u / 0.6;
      return [side * 1.4, 0.5, Z0 + 2 + (bayZ - Z0 - 2) * k];
    } else if (u < 0.8) { // turn into the rack
      const k = (u - 0.6) / 0.2;
      return [side * (1.4 + 4.6 * k), 0.5, bayZ];
    }
    const k = (u - 0.8) / 0.2; // lift to the shelf
    return [side * 6, 0.5 + (level - 0.2) * k, bayZ];
  }

  /* ── the system core at the far end ── */
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x35c3ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.position.set(0, 3.6, ZEND - 5);
  core.scale.setScalar(7);
  fx.scene.add(core);
  const coreDot = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  coreDot.position.copy(core.position);
  coreDot.scale.setScalar(2.2);
  fx.scene.add(coreDot);

  /* ── camera along the aisle, scrubbed ── */
  const state = { p: reduceMotion ? 0.42 : 0 };
  const look = new THREE.Vector3();
  function placeCamera(t) {
    const p = state.p;
    const z = 13 + (ZEND + 16 - 13) * p;
    const rise = smoothstep(0.78, 1, p);
    fx.camera.position.set(
      Math.sin(p * Math.PI * 2.2) * 0.9 + pointer.x * 0.4,
      3.1 + rise * 5.5 + Math.sin(t * 0.5) * 0.06,
      z
    );
    look.set(pointer.x * 1.2, 2.9 - rise * 2.4 + pointer.y * -0.5, z - 12);
    fx.camera.lookAt(look);
  }

  if (!reduceMotion && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=' + (small ? '220%' : '300%'),
      pin: true, scrub: 0.6, anticipatePin: 1,
      onUpdate: (self) => {
        state.p = self.progress;
        const caps = section.querySelectorAll('.ops-cap');
        const n = caps.length;
        caps.forEach((c, i) => {
          const mid = (i + 0.5) / n;
          c.classList.toggle('on', Math.abs(self.progress - mid) < 0.5 / n - 0.012);
        });
      },
    });
  }

  fx.run((dt, t) => {
    placeCamera(t);
    hotMat.size = 0.7 + Math.sin(t * 2.4) * 0.16;
    core.scale.setScalar(7 + Math.sin(t * 1.6) * 0.8);
    for (const p of pulses) {
      p.t += dt / p.dur;
      if (p.t >= 1) {
        p.t = 0;
        p.side = Math.random() < 0.5 ? -1 : 1;
        p.bayZ = Z0 - (2 + Math.random() * (BAYS - 4)) * BAY;
        p.level = LEVELS[Math.floor(Math.random() * 4)];
      }
      const [x, y, z] = pulsePos(p);
      p.sp.position.set(x, y, z);
      p.sp.material.opacity = p.t > 0.94 ? (1 - p.t) / 0.06 : 1;
    }
  });
  if (reduceMotion) { placeCamera(0); fx.frame(); }
}
