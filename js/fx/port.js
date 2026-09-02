/* Hero: a living 3D container port at night. Gantry cranes (one lifting a
   container), a docked ship, container stacks, amber quay lights streaking on
   the water, sea mist and stars — with cursor parallax on the camera. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function initPort(canvas, video, { reduceMotion = false, small = false } = {}) {
  const fx = mountScene(canvas, { fov: 50, dprMax: small ? 1.25 : 1.5, lit: true });
  fx.renderer.toneMappingExposure = 1.4;
  fx.scene.fog = new THREE.FogExp2(0x050b14, 0.0085);

  /* ── light ── */
  fx.scene.add(new THREE.HemisphereLight(0x27496e, 0x060a12, 0.85));
  const moon = new THREE.DirectionalLight(0x8fb4de, 0.85);
  moon.position.set(-30, 40, 20);
  fx.scene.add(moon);

  const steel = new THREE.MeshStandardMaterial({ color: 0x27506f, roughness: 0.52, metalness: 0.5 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x0e1c2c, roughness: 0.6, metalness: 0.45 });
  const amberGlow = new THREE.MeshStandardMaterial({ color: 0x2a1c08, emissive: 0xffb35c, emissiveIntensity: 2.4 });

  /* ── water ── */
  fx.scene.add(((m) => { m.rotation.x = -Math.PI / 2; m.position.y = 0; return m; })(
    new THREE.Mesh(new THREE.PlaneGeometry(320, 240),
      new THREE.MeshStandardMaterial({ color: 0x07131f, roughness: 0.32, metalness: 0.55 }))
  ));

  /* ── quay ── */
  const quay = new THREE.Mesh(new THREE.BoxGeometry(150, 1.6, 26), new THREE.MeshStandardMaterial({ color: 0x0d1826, roughness: 0.85 }));
  quay.position.set(5, 0.8, -21);
  fx.scene.add(quay);
  /* sodium strip along the quay edge */
  const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(148, 0.14, 0.3), amberGlow);
  edgeGlow.position.set(5, 1.7, -8.2);
  fx.scene.add(edgeGlow);

  /* ── container stacks (instanced) ── */
  const boxGeo = new THREE.BoxGeometry(2.4, 1.05, 1.05);
  const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.15 });
  const palette = [0x7a3a2a, 0x2a5a5f, 0x3a4a63, 0x8a6a30, 0x584a6a, 0x35505f].map((c) => new THREE.Color(c));
  const spots = [];
  for (let gx = -60; gx <= 68; gx += 2.9) {
    for (let gz = -26; gz >= -31; gz -= 1.4) {
      const h = Math.floor(rand(0, 4.2));
      for (let s = 0; s < h; s++) spots.push([gx + rand(-0.06, 0.06), 2.15 + s * 1.08, gz, rand(-0.02, 0.02)]);
    }
  }
  const stacks = new THREE.InstancedMesh(boxGeo, boxMat, spots.length);
  const dummy = new THREE.Object3D();
  spots.forEach(([x, y, z, ry], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stacks.setMatrixAt(i, dummy.matrix);
    stacks.setColorAt(i, palette[Math.floor(Math.random() * palette.length)].clone().multiplyScalar(rand(0.7, 1.1)));
  });
  fx.scene.add(stacks);

  /* ── gantry cranes ── */
  const cranes = [];
  function crane(x, withLoad) {
    const g = new THREE.Group();
    g.position.set(x, 1.6, -13);
    const H = 15, W = 4.4;
    for (const sx of [-W / 2, W / 2])
      for (const sz of [-2.2, 2.2]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, H, 0.55), steel);
        leg.position.set(sx, H / 2, sz);
        g.add(leg);
      }
    for (const sz of [-2.2, 2.2]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, 0.4), steel);
      brace.position.set(0, H * 0.55, sz);
      g.add(brace);
    }
    const portal = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 1.1, 5.6), steelDark);
    portal.position.set(0, H + 0.5, 0);
    g.add(portal);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 26), steel);
    boom.position.set(0, H + 1.4, 7);
    g.add(boom);
    const house = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 3.2), steelDark);
    house.position.set(0, H + 2.4, -4.5);
    g.add(house);
    /* back stays */
    const stayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, H + 1.8, -5.8), new THREE.Vector3(0, H + 1.8, 19.5),
      new THREE.Vector3(0, H + 1.8, -5.8), new THREE.Vector3(0, H + 5.5, 0),
      new THREE.Vector3(0, H + 5.5, 0), new THREE.Vector3(0, H + 1.8, 19.5),
    ]);
    g.add(new THREE.LineSegments(stayGeo, new THREE.LineBasicMaterial({ color: 0x2f597c, transparent: true, opacity: 0.8 })));
    /* trolley + hoist */
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 1.6), steelDark);
    trolley.position.set(0, H + 0.7, 6);
    g.add(trolley);
    let load = null, cables = null;
    if (withLoad) {
      load = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.05, 1.05), new THREE.MeshStandardMaterial({ color: 0x8a4a26, roughness: 0.65, metalness: 0.2 }));
      load.rotation.y = Math.PI / 2;
      g.add(load);
      const cGeo = new THREE.BufferGeometry();
      cGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
      cables = new THREE.LineSegments(cGeo, new THREE.LineBasicMaterial({ color: 0x6f95b8, transparent: true, opacity: 0.85 }));
      g.add(cables);
    }
    /* floods on the portal + red beacon on the boom tip */
    const flood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 0.4), amberGlow);
    flood.position.set(0, H - 0.2, 2.4);
    g.add(flood);
    const cl = new THREE.PointLight(0xffb066, 90, 34, 2);
    cl.position.set(0, H - 1, 2.4);
    g.add(cl);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220505, emissive: 0xff3b30, emissiveIntensity: 3 }));
    beacon.position.set(0, H + 2.1, 19.6);
    g.add(beacon);
    fx.scene.add(g);
    cranes.push({ g, trolley, load, cables, beacon, phase: rand(0, Math.PI * 2), H });
    return g;
  }
  crane(3, true);
  crane(21, false);
  crane(39, true);
  if (!small) crane(57, false);

  /* ── the ship ── */
  const ship = new THREE.Group();
  ship.position.set(26, 0, 2.5);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(46, 3.4, 9), new THREE.MeshStandardMaterial({ color: 0x101a26, roughness: 0.6, metalness: 0.3 }));
  hull.position.y = 1.6;
  ship.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 3.4, 3), hull.material);
  bow.rotation.y = Math.PI;
  bow.position.set(-25.2, 1.6, 0);
  ship.add(bow);
  const deckSpots = [];
  for (let dx = -20; dx <= 18; dx += 2.9)
    for (let dz = -3; dz <= 3; dz += 1.4) {
      const h = Math.floor(rand(1, 3.6));
      for (let s = 0; s < h; s++) deckSpots.push([dx, 3.85 + s * 1.08, dz]);
    }
  const deck = new THREE.InstancedMesh(boxGeo, boxMat, deckSpots.length);
  deckSpots.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    deck.setMatrixAt(i, dummy.matrix);
    deck.setColorAt(i, palette[Math.floor(Math.random() * palette.length)].clone().multiplyScalar(rand(0.65, 1.05)));
  });
  ship.add(deck);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3, 6.5, 8.4), new THREE.MeshStandardMaterial({ color: 0x24425e, roughness: 0.5, metalness: 0.3 }));
  bridge.position.set(20.5, 6.5, 0);
  ship.add(bridge);
  const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.7, 7.6), amberGlow);
  bridgeGlass.position.set(20.5, 9.1, 0);
  ship.add(bridgeGlass);
  const hullLights = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 0.2), amberGlow);
  hullLights.position.set(-1, 3.1, 4.6);
  ship.add(hullLights);
  const shipLight = new THREE.PointLight(0xffc98a, 70, 40, 2);
  shipLight.position.set(0, 8, 0);
  ship.add(shipLight);
  fx.scene.add(ship);

  /* ── quay light poles ── */
  const poles = [];
  for (const px of small ? [-14, 14, 44] : [-30, -6, 18, 44, 66]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9, 0.22), steelDark);
    pole.position.set(px, 6.1, -11);
    fx.scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.5), amberGlow);
    head.position.set(px, 10.6, -10.8);
    fx.scene.add(head);
    const pl = new THREE.PointLight(0xffb066, 130, 60, 2);
    pl.position.set(px, 10, -11);
    fx.scene.add(pl);
    poles.push(px);
  }

  /* ── light streaks on the water ── */
  const streakGeo = new THREE.PlaneGeometry(1, 1);
  const streaks = [];
  function streak(x, z, w, len, color, op) {
    const m = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op * 1.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(w, len, 1);
    m.position.set(x, 0.03, z + len / 2);
    fx.scene.add(m);
    streaks.push({ m, base: op, phase: rand(0, Math.PI * 2) });
  }
  for (const px of poles) streak(px + rand(-1, 1), -8, rand(0.6, 1.1), rand(26, 46), 0xffa04e, rand(0.18, 0.32));
  for (let i = 0; i < 12; i++) streak(rand(-60, 70), -8, rand(0.35, 0.8), rand(14, 34), 0xff8f3c, rand(0.08, 0.2));
  streak(3, -6, 0.7, 48, 0x35c3ff, 0.13);
  streak(39, -6, 0.7, 44, 0x35c3ff, 0.11);

  /* ── horizon glow behind the port ── */
  for (const [hx, color, sc, op] of [[-40, 0xff9a40, 70, 0.28], [15, 0x2c84b8, 95, 0.22], [70, 0xff9a40, 65, 0.24]]) {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDot(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    g.position.set(hx, 6, -85);
    g.scale.set(sc, sc * 0.35, 1);
    fx.scene.add(g);
  }

  /* ── terminal lights: hundreds of glowing points across the structures ── */
  (function portLights() {
    const amber = [], cool = [];
    for (let x = -62; x <= 72; x += 4.6) amber.push(x + rand(-1, 1), 2.05, -8.4); // dock line
    for (let i = 0; i < 60; i++) amber.push(rand(-60, 70), rand(2.6, 6.4), rand(-25.5, -31)); // among the stacks
    for (const cx of [3, 21, 39, 57]) { // on the cranes
      const H = 15;
      amber.push(cx - 2.2, 1.6 + H, -13, cx + 2.2, 1.6 + H, -13, cx, 1.6 + H + 2.2, -17.5);
      cool.push(cx, 1.6 + H + 1.6, -6, cx, 1.6 + H + 1.6, 1);
      for (let bz = -3; bz <= 18; bz += 5.5) cool.push(cx + rand(-0.2, 0.2), 1.6 + H + 1.9, -13 + bz + 13);
    }
    for (let i = 0; i < 14; i++) amber.push(26 + rand(-22, 20), rand(3.6, 5.6), 2.5 + rand(-4, 4)); // ship deck
    cool.push(46.5, 11.2, 2.5, 5.8, 11.2, 2.5);
    const mk = (arr, color, size, op) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      fx.scene.add(new THREE.Points(g, new THREE.PointsMaterial({
        map: softDot(), color, size, transparent: true, opacity: op, fog: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })));
    };
    mk(amber, 0xffb066, 2.7, 0.95);
    mk(cool, 0xd8ecff, 2.1, 0.9);
  })();

  /* ── stars + sea mist ── */
  const starPos = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    starPos[i * 3] = rand(-140, 140);
    starPos[i * 3 + 1] = rand(18, 90);
    starPos[i * 3 + 2] = rand(-120, -50);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  fx.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0xbcd8f0, size: 0.5, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const mists = [];
  for (let i = 0; i < (small ? 5 : 9); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDot(), color: 0x2c4a66, transparent: true, opacity: rand(0.05, 0.1), blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.position.set(rand(-60, 70), rand(1, 5), rand(-30, 10));
    sp.scale.setScalar(rand(18, 34));
    fx.scene.add(sp);
    mists.push({ sp, v: rand(0.2, 0.6) });
  }

  /* ── camera ── */
  const look = new THREE.Vector3();
  function placeCamera(t) {
    fx.camera.position.set(
      -6 + Math.sin(t * 0.05) * 2 + pointer.x * 3,
      9.5 + Math.cos(t * 0.07) * 0.6 + pointer.y * -1.8,
      58
    );
    look.set(13 + pointer.x * 4, 8.2 + pointer.y * -1.6, -12);
    fx.camera.lookAt(look);
  }

  function animate(dt, t) {
    placeCamera(t);
    for (const c of cranes) {
      const u = (Math.sin(t * 0.22 + c.phase) + 1) / 2; // trolley travel
      c.trolley.position.z = -1 + u * 9.5;
      c.beacon.material.emissiveIntensity = 2 + Math.sin(t * 2.4 + c.phase) * 1.6;
      if (c.load) {
        const lift = (Math.sin(t * 0.31 + c.phase * 1.7) + 1) / 2;
        const y = 3 + lift * (c.H - 3.4);
        c.load.position.set(0, y, c.trolley.position.z);
        const a = c.cables.geometry.attributes.position.array;
        a[0] = -0.5; a[1] = c.H + 0.4; a[2] = c.trolley.position.z;
        a[3] = -0.5; a[4] = y + 0.55; a[5] = c.trolley.position.z;
        a[6] = 0.5; a[7] = c.H + 0.4; a[8] = c.trolley.position.z;
        a[9] = 0.5; a[10] = y + 0.55; a[11] = c.trolley.position.z;
        c.cables.geometry.attributes.position.needsUpdate = true;
      }
    }
    for (const s of streaks) {
      s.m.material.opacity = s.base * (0.72 + 0.28 * Math.sin(t * 1.7 + s.phase));
    }
    for (const m of mists) {
      m.sp.position.x += m.v * dt;
      if (m.sp.position.x > 80) m.sp.position.x = -70;
    }
    ship.position.y = Math.sin(t * 0.4) * 0.12;
    ship.rotation.z = Math.sin(t * 0.3) * 0.004;
  }

  fx.run(animate);
  const hideVideo = () => { if (video) video.style.opacity = '0'; };
  if (reduceMotion) { placeCamera(0.5); animate(0.016, 0.5); fx.frame(); hideVideo(); }
  else requestAnimationFrame(() => requestAnimationFrame(hideVideo));
}
