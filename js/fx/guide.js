/* The Order: a carton with a holo ring that travels the page as you scroll —
   one order flowing through the system, delivered at the contact section. */
import * as THREE from 'three';
import { mountScene, softDot } from './util.js';

export function initGuide(canvas, { small = false } = {}) {
  const fx = mountScene(canvas, { fov: 45, z: 10, dprMax: 1.5, lit: true });

  fx.scene.add(new THREE.HemisphereLight(0x3a5a80, 0x0a0f16, 0.9));
  const key = new THREE.DirectionalLight(0xcfe6ff, 1.8);
  key.position.set(-3, 5, 6);
  fx.scene.add(key);
  const warm = new THREE.DirectionalLight(0xf0a04a, 0.7);
  warm.position.set(4, -2, 3);
  fx.scene.add(warm);

  /* ── the carton ── */
  const order = new THREE.Group();
  fx.scene.add(order);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.56, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xb3865c, roughness: 0.75, metalness: 0.02 })
  );
  order.add(box);
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(0.79, 0.57, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xe4d6b8, roughness: 0.55 })
  );
  order.add(tape);
  const stamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.14, 0.575),
    new THREE.MeshStandardMaterial({ color: 0x0c1723, emissive: 0x0a94d1, emissiveIntensity: 1.2 })
  );
  stamp.position.set(0.18, 0.12, 0);
  order.add(stamp);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.018, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0x35c3ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2.6;
  order.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x1a9fd8, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(2.4);
  order.add(glow);
  const scale = small ? 0.62 : 1;
  order.scale.setScalar(scale);

  /* ── trail: fading line + a few lagging sparks ── */
  const TRAIL = 26;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailCol = new Float32Array(TRAIL * 3);
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  tGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fx.scene.add(trail);
  const cTail = new THREE.Color(0x04121e), cHead = new THREE.Color(0x2fb6e8);

  /* ── waypoints anchored to real sections ── */
  const WAYS = [
    ['.hero', 0.86, 0.30], ['.clients', 0.07, 0.72], ['#ops', 0.92, 0.14],
    ['#solutions', 0.94, 0.42], ['.quote', 0.08, 0.74], ['#ecosystem', 0.63, 0.08],
    ['#migration', 0.90, 0.46], ['#network', 0.50, 0.10], ['.people', 0.93, 0.38],
    ['.story', 0.05, 0.16], ['.badges', 0.14, 0.40], ['#contact', 0.50, 0.86],
  ];
  let anchors = [];
  function measure() {
    anchors = WAYS.map(([sel, nx, ny]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { doc: r.top + scrollY + r.height * 0.5, nx, ny };
    }).filter(Boolean).sort((a, b) => a.doc - b.doc);
  }
  measure();
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('resize', measure);

  function targetScreen() {
    const y = scrollY + innerHeight * 0.5;
    if (!anchors.length) return { nx: 0.9, ny: 0.5, done: false };
    if (y <= anchors[0].doc) return { nx: anchors[0].nx, ny: anchors[0].ny, done: false };
    const last = anchors[anchors.length - 1];
    if (y >= last.doc) return { nx: last.nx, ny: last.ny, done: true };
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (y >= a.doc && y < b.doc) {
        let u = (y - a.doc) / (b.doc - a.doc);
        u = u * u * (3 - 2 * u);
        return { nx: a.nx + (b.nx - a.nx) * u, ny: a.ny + (b.ny - a.ny) * u, done: false };
      }
    }
    return { nx: last.nx, ny: last.ny, done: true };
  }

  /* screen (0..1) → world on the z=0 plane */
  const halfH = Math.tan((45 / 2) * Math.PI / 180) * 10;
  function toWorld(nx, ny, out) {
    const aspect = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight);
    out.set((nx * 2 - 1) * halfH * aspect, -(ny * 2 - 1) * halfH, 0);
  }

  const cur = new THREE.Vector3(halfH * 1.2, 0, 0);
  const tgt = new THREE.Vector3();
  const vel = new THREE.Vector3();
  let trailInit = false;

  fx.run((dt, t) => {
    const { nx, ny, done } = targetScreen();
    toWorld(nx, ny, tgt);
    const prev = cur.clone();
    cur.lerp(tgt, Math.min(1, dt * 3.2));
    vel.copy(cur).sub(prev).divideScalar(Math.max(dt, 0.001));

    order.position.copy(cur);
    order.position.y += Math.sin(t * 1.4) * 0.09;
    order.rotation.y += dt * (0.6 + Math.min(2.5, vel.length() * 0.25));
    order.rotation.z += ((-vel.x * 0.02) - order.rotation.z) * 0.08;
    order.rotation.x += ((vel.y * 0.015) - order.rotation.x) * 0.08;
    ring.rotation.z += dt * 1.2;

    const speed = vel.length();
    if (done && speed < 0.4) { // delivered — settle and pulse
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.16);
      glow.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
    } else {
      ring.scale.setScalar(1);
      glow.material.opacity = 0.4;
    }

    if (!trailInit) {
      for (let i = 0; i < TRAIL; i++) { trailPos[i * 3] = cur.x; trailPos[i * 3 + 1] = cur.y; trailPos[i * 3 + 2] = cur.z; }
      trailInit = true;
    }
    for (let i = TRAIL - 1; i > 0; i--) {
      trailPos[i * 3] = trailPos[(i - 1) * 3];
      trailPos[i * 3 + 1] = trailPos[(i - 1) * 3 + 1];
      trailPos[i * 3 + 2] = trailPos[(i - 1) * 3 + 2];
    }
    trailPos[0] = cur.x; trailPos[1] = cur.y + Math.sin(t * 1.4) * 0.09; trailPos[2] = 0;
    const fade = Math.min(1, speed * 0.5); // trail only shows when moving
    const col = new THREE.Color();
    for (let i = 0; i < TRAIL; i++) {
      col.lerpColors(cHead, cTail, i / (TRAIL - 1)).multiplyScalar(fade);
      trailCol[i * 3] = col.r; trailCol[i * 3 + 1] = col.g; trailCol[i * 3 + 2] = col.b;
    }
    tGeo.attributes.position.needsUpdate = true;
    tGeo.attributes.color.needsUpdate = true;
  });
}
