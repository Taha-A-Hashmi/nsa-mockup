/* NSA+ ecosystem: a faceted CloudSuite hub with integration panels on two
   inclined orbits, tethered to the core. Framed to fit the stage. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

function labelTexture(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 46px "Space Grotesk", sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 8;
  c.width = w; c.height = 64;
  g.font = font;
  g.fillStyle = '#d9f1ff';
  g.textBaseline = 'middle';
  g.fillText(text, 4, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / 64 };
}

export function initOrbit(canvas, { reduceMotion = false } = {}) {
  const fx = mountScene(canvas, { fov: 45, z: 11.4, lit: true });
  const rig = new THREE.Group();
  fx.scene.add(rig);

  fx.scene.add(new THREE.HemisphereLight(0x3a5a80, 0x0a0f16, 0.8));
  const key = new THREE.DirectionalLight(0xbfe0ff, 1.6);
  key.position.set(-4, 6, 8);
  fx.scene.add(key);
  const warm = new THREE.DirectionalLight(0xf0a04a, 0.5);
  warm.position.set(5, -3, 4);
  fx.scene.add(warm);

  /* ── the hub: faceted core + glowing seams ── */
  const hub = new THREE.Group();
  rig.add(hub);
  const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
  hub.add(new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({
    color: 0x10293d, metalness: 0.55, roughness: 0.32,
    emissive: 0x0a94d1, emissiveIntensity: 0.28, flatShading: true,
  })));
  hub.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({
    color: 0x35c3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x1a9fd8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(4.6);
  rig.add(glow);

  const { tex: coreTex, aspect: coreAspect } = labelTexture('CLOUDSUITE DISTRIBUTION');
  const coreLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false }));
  coreLabel.scale.set(0.42 * coreAspect, 0.42, 1);
  coreLabel.position.y = -2.05;
  rig.add(coreLabel);

  /* ── orbit rings with panel chips ── */
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0e1c2c, metalness: 0.35, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0c1723, emissive: 0xf0a04a, emissiveIntensity: 1.6 });
  const rings = [
    { r: 2.85, tilt: 0.42, speed: 0.05, items: ['EDI', 'PAYMENTS', 'E-COMMERCE'] },
    { r: 3.95, tilt: -0.32, speed: -0.035, items: ['ANALYTICS', 'WMS · TWL', 'CRM'] },
  ];
  const tethers = [];
  for (const ring of rings) {
    const g = new THREE.Group();
    g.rotation.x = ring.tilt;
    rig.add(g);

    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r));
    }
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x1a6f9f, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    ring.chips = ring.items.map((label, i) => {
      const holder = new THREE.Group();
      g.add(holder);
      const { tex, aspect } = labelTexture(label);
      const h = 0.4;
      const w = h * aspect + 0.5;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.68, 0.12), panelMat);
      holder.add(panel);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(h * aspect, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      face.position.set(0.1, 0, 0.075);
      holder.add(face);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.68, 0.13), accentMat);
      bar.position.x = -w / 2 + 0.1;
      holder.add(bar);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({
        color: 0x2c93c9, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      holder.add(edge);
      const tether = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x1a6f9f, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      rig.add(tether);
      tethers.push(tether);
      return { holder, phase: (i / ring.items.length) * Math.PI * 2 + (ring.tilt > 0 ? 0.5 : 0), tether };
    });
  }

  const worldPos = new THREE.Vector3();
  function placeChips(t) {
    for (const ring of rings) {
      for (const c of ring.chips) {
        const a = c.phase + t * ring.speed * Math.PI * 2;
        c.holder.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
        c.holder.getWorldPosition(worldPos);
        rig.worldToLocal(worldPos);
        const attr = c.tether.geometry.attributes.position;
        attr.setXYZ(0, 0, 0, 0);
        attr.setXYZ(1, worldPos.x, worldPos.y, worldPos.z);
        attr.needsUpdate = true;
        c.holder.lookAt(fx.camera.position);
      }
    }
  }

  fx.run((dt, t) => {
    placeChips(t);
    hub.rotation.y += dt * 0.25;
    hub.rotation.x = Math.sin(t * 0.4) * 0.15;
    glow.material.opacity = 0.45 + Math.sin(t * 1.8) * 0.1;
    rig.rotation.y += ((pointer.x * 0.2) - rig.rotation.y) * 0.04;
    rig.rotation.x += ((pointer.y * 0.1) - rig.rotation.x) * 0.04;
  });
  if (reduceMotion) { placeChips(0.5); fx.frame(); }
}
