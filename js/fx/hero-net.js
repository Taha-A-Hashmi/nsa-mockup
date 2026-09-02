/* Hero: floating supply-network — glowing nodes + links over the port footage. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

export function initHeroNet(canvas) {
  const fx = mountScene(canvas, { fov: 55, z: 14 });
  const group = new THREE.Group();
  fx.scene.add(group);

  const N = 110;
  const LINK = 4.1;
  const base = new Float32Array(N * 3);
  const pos = new Float32Array(N * 3);
  const phase = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    base[i * 3] = (Math.random() - 0.5) * 34;
    base[i * 3 + 1] = (Math.random() - 0.5) * 17;
    base[i * 3 + 2] = (Math.random() - 0.5) * 9;
    phase[i * 2] = Math.random() * Math.PI * 2;
    phase[i * 2 + 1] = 0.4 + Math.random() * 0.7;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0x35c3ff, size: 0.34, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  group.add(points);

  /* a few warm nodes — order signals in the network */
  const warmIdx = [];
  for (let i = 0; i < 10; i++) warmIdx.push(Math.floor(Math.random() * N));
  const wGeo = new THREE.BufferGeometry();
  const wPos = new Float32Array(warmIdx.length * 3);
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  const warm = new THREE.Points(wGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0xf0a04a, size: 0.6, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  group.add(warm);

  const MAX_SEG = 700;
  const lGeo = new THREE.BufferGeometry();
  const lPos = new Float32Array(MAX_SEG * 6);
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color: 0x1a9fd8, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  group.add(lines);

  fx.run((dt, t) => {
    for (let i = 0; i < N; i++) {
      const p0 = phase[i * 2], sp = phase[i * 2 + 1];
      pos[i * 3] = base[i * 3] + Math.sin(t * sp + p0) * 0.7;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.cos(t * sp * 0.8 + p0 * 1.7) * 0.55;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * sp * 0.6 + p0 * 0.6) * 0.5;
    }
    pGeo.attributes.position.needsUpdate = true;
    for (let k = 0; k < warmIdx.length; k++) {
      const i = warmIdx[k];
      wPos[k * 3] = pos[i * 3]; wPos[k * 3 + 1] = pos[i * 3 + 1]; wPos[k * 3 + 2] = pos[i * 3 + 2];
    }
    wGeo.attributes.position.needsUpdate = true;

    let s = 0;
    const L2 = LINK * LINK;
    for (let i = 0; i < N && s < MAX_SEG; i++) {
      for (let j = i + 1; j < N && s < MAX_SEG; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < L2) {
          lPos[s * 6] = pos[i * 3]; lPos[s * 6 + 1] = pos[i * 3 + 1]; lPos[s * 6 + 2] = pos[i * 3 + 2];
          lPos[s * 6 + 3] = pos[j * 3]; lPos[s * 6 + 4] = pos[j * 3 + 1]; lPos[s * 6 + 5] = pos[j * 3 + 2];
          s++;
        }
      }
    }
    lGeo.setDrawRange(0, s * 2);
    lGeo.attributes.position.needsUpdate = true;

    group.rotation.y += ((pointer.x * 0.14) - group.rotation.y) * 0.04;
    group.rotation.x += ((pointer.y * 0.08) - group.rotation.x) * 0.04;
  });
}
