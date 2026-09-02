/* Warehouse flythrough: a real DC — steel racking, pallets, cartons, forklifts,
   sodium fixtures — with a thin "digital layer" (scan frame, order pulses, dust)
   over it. Camera walks the aisle on scroll. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const rand = (a, b) => a + Math.random() * (b - a);

export function initWarehouse(canvas, section, { reduceMotion = false, small = false } = {}) {
  const fx = mountScene(canvas, { fov: 60, dprMax: small ? 1.25 : 1.5, lit: true });
  fx.scene.fog = new THREE.FogExp2(0x04080f, 0.026);

  const BAYS = small ? 14 : 22;
  const Z0 = 8, BAY = 3.1;
  const ZEND = Z0 - BAYS * BAY;
  const LEVELS = [1.9, 3.7, 5.5]; // beam heights; ground level is the floor

  /* ── lights ── */
  fx.scene.add(new THREE.HemisphereLight(0x24405e, 0x0a0f16, 0.75));
  const dir = new THREE.DirectionalLight(0x8fb8e0, 0.35);
  dir.position.set(-6, 12, 4);
  fx.scene.add(dir);
  const fixGeo = new THREE.BoxGeometry(1.7, 0.09, 0.5);
  const fixMat = new THREE.MeshStandardMaterial({ color: 0x1c2634, emissive: 0xffd9a0, emissiveIntensity: 2.6 });
  const nFix = small ? 4 : 6;
  for (let i = 0; i < nFix; i++) {
    const z = Z0 - 4 - (i + 0.5) * ((BAYS * BAY - 6) / nFix);
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, 7.2, z);
    fx.scene.add(fixture);
    const pl = new THREE.PointLight(0xffc98a, 90, 32, 2);
    pl.position.set(0, 6.6, z);
    fx.scene.add(pl);
  }

  /* ── floor ── */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(26, BAYS * BAY + 22),
    new THREE.MeshStandardMaterial({ color: 0x151c27, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.02, (Z0 + ZEND) / 2);
  fx.scene.add(floor);
  /* aisle guide lines — the digital layer starts here */
  const aisleGeo = new THREE.BufferGeometry();
  aisleGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -4.3, 0.02, Z0 + 6, -4.3, 0.02, ZEND - 4, 4.3, 0.02, Z0 + 6, 4.3, 0.02, ZEND - 4,
  ], 3));
  fx.scene.add(new THREE.LineSegments(aisleGeo, new THREE.LineBasicMaterial({
    color: 0x35c3ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* ── racking (instanced) ── */
  const dummy = new THREE.Object3D();
  const RACK_X = [-6.2, 6.2]; // rack centerlines
  const FRAME_DX = 0.62;      // front/back post offset from centerline

  // uprights
  const upGeo = new THREE.BoxGeometry(0.14, 6.6, 0.14);
  const upMat = new THREE.MeshStandardMaterial({ color: 0x364c74, roughness: 0.55, metalness: 0.45 });
  const uprights = new THREE.InstancedMesh(upGeo, upMat, (BAYS + 1) * 4);
  let ui = 0;
  for (const cx of RACK_X)
    for (let b = 0; b <= BAYS; b++)
      for (const dx of [-FRAME_DX, FRAME_DX]) {
        dummy.position.set(cx + dx, 3.3, Z0 - b * BAY);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        uprights.setMatrixAt(ui++, dummy.matrix);
      }
  fx.scene.add(uprights);

  // beams (run along z, classic orange)
  const beamGeo = new THREE.BoxGeometry(0.09, 0.16, BAY - 0.18);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xc9660f, roughness: 0.5, metalness: 0.35 });
  const beams = new THREE.InstancedMesh(beamGeo, beamMat, BAYS * LEVELS.length * 4);
  let bi = 0;
  for (const cx of RACK_X)
    for (let b = 0; b < BAYS; b++)
      for (const y of LEVELS)
        for (const dx of [-FRAME_DX, FRAME_DX]) {
          dummy.position.set(cx + dx, y, Z0 - b * BAY - BAY / 2);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          beams.setMatrixAt(bi++, dummy.matrix);
        }
  fx.scene.add(beams);

  // pallets + cartons
  const slotYs = [0.08, ...LEVELS.map((y) => y + 0.1)];
  const palGeo = new THREE.BoxGeometry(1.15, 0.11, 1.15);
  const palMat = new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 0.85 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 });
  const cardboard = [new THREE.Color(0xa8815a), new THREE.Color(0xb58e64), new THREE.Color(0x8f6c47), new THREE.Color(0x9c7b55)];
  const slots = [];
  for (const cx of RACK_X)
    for (let b = 0; b < BAYS; b++)
      for (const y of slotYs)
        for (const dz of [-BAY * 0.28, -BAY * 0.72])
          if (Math.random() < 0.72) slots.push([cx, y, Z0 - b * BAY + dz * 1 - 0]);
  const pallets = new THREE.InstancedMesh(palGeo, palMat, slots.length);
  slots.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 0.055, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pallets.setMatrixAt(i, dummy.matrix);
  });
  fx.scene.add(pallets);

  const cartonSpots = [];
  for (const [x, y, z] of slots) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++)
      cartonSpots.push([x + rand(-0.24, 0.24), y + 0.11, z + rand(-0.24, 0.24), rand(0.38, 0.62), rand(0.3, 0.55), rand(0.38, 0.62), rand(-0.2, 0.2), k]);
  }
  const cartons = new THREE.InstancedMesh(boxGeo, boxMat, cartonSpots.length);
  cartonSpots.forEach(([x, y, z, sx, sy, sz, ry, stack], i) => {
    dummy.position.set(x, y + sy / 2 + stack * 0.02, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    cartons.setMatrixAt(i, dummy.matrix);
    cartons.setColorAt(i, cardboard[Math.floor(Math.random() * cardboard.length)]);
  });
  fx.scene.add(cartons);

  /* ── forklifts (stylized, parked in the aisle mouth of a bay) ── */
  function forklift() {
    const g = new THREE.Group();
    const amber = new THREE.MeshStandardMaterial({ color: 0xd98a2b, roughness: 0.5, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2836, roughness: 0.6, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 1.5), amber);
    body.position.y = 0.62;
    g.add(body);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.45), dark);
    counter.position.set(0, 0.5, 0.95);
    g.add(counter);
    for (const sx of [-0.34, 0.34]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.1, 0.09), dark);
      post.position.set(sx, 1.35, -0.86);
      g.add(post);
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.05), dark);
      fork.position.set(sx * 0.65, 0.12, -1.45);
      g.add(fork);
      const wheelF = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 14), dark);
      wheelF.rotation.z = Math.PI / 2;
      wheelF.position.set(sx * 1.15, 0.26, -0.45);
      g.add(wheelF);
      const wheelB = wheelF.clone();
      wheelB.position.z = 0.75;
      g.add(wheelB);
    }
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), amber);
    guard.position.set(0, 1.9, -0.1);
    g.add(guard);
    for (const [px, pz] of [[-0.4, -0.5], [0.4, -0.5], [-0.4, 0.3], [0.4, 0.3]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.06), dark);
      pillar.position.set(px, 1.3, pz - 0.1);
      g.add(pillar);
    }
    return g;
  }
  const f1 = forklift();
  f1.position.set(-3.2, 0, Z0 - 5.2);
  f1.rotation.y = 0.5;
  fx.scene.add(f1);
  const f2 = forklift();
  f2.position.set(3.1, 0, Z0 - BAYS * BAY * 0.62);
  f2.rotation.y = -2.2;
  fx.scene.add(f2);

  /* ── digital layer: scan frame, pulses, dust, core ── */
  const scanGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 1.9, 1.7));
  const scanMat = new THREE.LineBasicMaterial({ color: 0x35c3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const scan = new THREE.LineSegments(scanGeo, scanMat);
  fx.scene.add(scan);
  let scanT = 0;
  function rescan() {
    const cx = RACK_X[Math.random() < 0.5 ? 0 : 1];
    const b = 1 + Math.floor(Math.random() * (BAYS - 2));
    const lvl = Math.random() < 0.5 ? 0.95 : LEVELS[Math.floor(Math.random() * LEVELS.length)] + 0.95;
    scan.position.set(cx, lvl, Z0 - b * BAY - BAY / 2);
  }
  rescan();

  const pulses = [];
  for (let i = 0; i < (small ? 4 : 7); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDot(), color: 0x66d4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.setScalar(0.8);
    fx.scene.add(sp);
    pulses.push({ sp, t: Math.random(), dur: 7 + Math.random() * 5, side: Math.random() < 0.5 ? -1 : 1,
      bayZ: Z0 - (2 + Math.random() * (BAYS - 4)) * BAY, level: [0.6, ...LEVELS][Math.floor(Math.random() * 4)] });
  }
  function pulsePos(p) {
    const { side, bayZ, level } = p;
    const u = p.t;
    if (u < 0.6) { const k = u / 0.6; return [side * 1.5, 0.5, Z0 + 2 + (bayZ - Z0 - 2) * k]; }
    if (u < 0.8) { const k = (u - 0.6) / 0.2; return [side * (1.5 + 4.7 * k), 0.5, bayZ]; }
    const k = (u - 0.8) / 0.2;
    return [side * 6.2, 0.5 + (level + 0.3) * k, bayZ];
  }

  const dust = new Float32Array((small ? 140 : 260) * 3);
  for (let i = 0; i < dust.length; i += 3) {
    dust[i] = rand(-9, 9); dust[i + 1] = rand(0.2, 7); dust[i + 2] = Z0 + 6 - Math.random() * (BAYS * BAY + 12);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  fx.scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0xcfe3f5, size: 0.1, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x35c3ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.position.set(0, 3.6, ZEND - 5);
  core.scale.setScalar(7);
  fx.scene.add(core);
  const coreDot = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  coreDot.position.copy(core.position);
  coreDot.scale.setScalar(2);
  fx.scene.add(coreDot);

  /* ── camera scrub ── */
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
    core.scale.setScalar(7 + Math.sin(t * 1.6) * 0.8);
    scanT += dt;
    const cyc = scanT % 2.6;
    scanMat.opacity = cyc < 0.35 ? cyc / 0.35 * 0.85 : Math.max(0, 0.85 * (1 - (cyc - 0.35) / 1.6));
    if (cyc < dt) rescan();
    for (const p of pulses) {
      p.t += dt / p.dur;
      if (p.t >= 1) {
        p.t = 0;
        p.side = Math.random() < 0.5 ? -1 : 1;
        p.bayZ = Z0 - (2 + Math.random() * (BAYS - 4)) * BAY;
        p.level = [0.6, ...LEVELS][Math.floor(Math.random() * 4)];
      }
      const [x, y, z] = pulsePos(p);
      p.sp.position.set(x, y, z);
      p.sp.material.opacity = p.t > 0.94 ? (1 - p.t) / 0.06 : 1;
    }
  });
  if (reduceMotion) { placeCamera(0); fx.frame(); }
}
