/* NSA+ ecosystem: CloudSuite core with integration chips on two inclined orbits. */
import * as THREE from 'three';
import { mountScene, softDot, textSprite, pointer } from './util.js';

export function initOrbit(canvas, { reduceMotion = false } = {}) {
  const fx = mountScene(canvas, { fov: 45, z: 9.5 });
  const rig = new THREE.Group();
  fx.scene.add(rig);

  /* core */
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x35c3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.scale.setScalar(3.4);
  rig.add(core);
  const coreDot = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  coreDot.scale.setScalar(1.1);
  rig.add(coreDot);
  const coreLabel = textSprite('CLOUDSUITE', { fill: '#eaf6ff', font: '700 40px "Space Grotesk", sans-serif' });
  coreLabel.position.y = -1.95;
  coreLabel.scale.multiplyScalar(0.85);
  rig.add(coreLabel);

  /* two orbit rings */
  const rings = [
    { r: 3.1, tilt: 0.45, speed: 0.16, items: ['EDI', 'PAYMENTS', 'E-COMMERCE'] },
    { r: 4.15, tilt: -0.35, speed: -0.11, items: ['ANALYTICS', 'WMS · TWL', 'CRM'] },
  ];
  for (const ring of rings) {
    const g = new THREE.Group();
    g.rotation.x = ring.tilt;
    rig.add(g);
    ring.group = g;

    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r));
    }
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x1a6f9f, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    ring.chips = ring.items.map((label, i) => {
      const holder = new THREE.Group();
      g.add(holder);
      const chip = textSprite(label);
      chip.scale.multiplyScalar(0.8);
      holder.add(chip);
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({
        map: softDot(), color: 0xf0a04a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      dot.scale.setScalar(0.5);
      dot.position.y = -0.45;
      holder.add(dot);
      return { holder, phase: (i / ring.items.length) * Math.PI * 2 };
    });
  }

  fx.run((dt, t) => {
    for (const ring of rings) {
      for (const c of ring.chips) {
        const a = c.phase + t * ring.speed * Math.PI * 2 * 0.2 + (reduceMotion ? 0 : 0);
        c.holder.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
      }
    }
    core.scale.setScalar(3.4 + Math.sin(t * 1.8) * 0.25);
    rig.rotation.y += ((pointer.x * 0.25) - rig.rotation.y) * 0.04;
    rig.rotation.x += ((pointer.y * 0.12) - rig.rotation.x) * 0.04;
  });
  if (reduceMotion) {
    for (const ring of rings)
      for (const c of ring.chips)
        c.holder.position.set(Math.cos(c.phase) * ring.r, 0, Math.sin(c.phase) * ring.r);
    fx.frame();
  }
}
