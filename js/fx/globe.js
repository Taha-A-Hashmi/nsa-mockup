/* North-America network globe: graticule sphere, city nodes, arcs pulsing out of NY. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const CITIES = [
  [40.75, -73.6, true],  // Long Island HQ
  [43.7, -79.4], [45.5, -73.6], [46.8, -71.2], [49.3, -123.1], [51.0, -114.1], [49.9, -97.1],
  [40.7, -74.0], [42.36, -71.06], [39.95, -75.16], [35.2, -80.8], [33.7, -84.4], [36.16, -86.78],
  [41.9, -87.6], [43.0, -87.9], [44.98, -93.3], [38.6, -90.2], [39.1, -94.6], [35.5, -97.5],
  [32.8, -96.8], [29.8, -95.4], [39.7, -105.0], [40.76, -111.9], [33.4, -112.0],
  [34.05, -118.2], [37.77, -122.4], [45.5, -122.7], [47.6, -122.3], [38.25, -85.76], [42.33, -83.05],
];
const R = 2.1;

function toVec(lat, lon, r = R) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export function initGlobe(canvas, { reduceMotion = false } = {}) {
  const fx = mountScene(canvas, { fov: 42, z: 5.4 });
  const globe = new THREE.Group();
  fx.scene.add(globe);

  /* graticule */
  const grat = [];
  for (let lat = -60; lat <= 75; lat += 15) {
    let prev = null;
    for (let lon = -180; lon <= 180; lon += 6) {
      const v = toVec(lat, lon);
      if (prev) grat.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
      prev = v;
    }
  }
  for (let lon = -180; lon < 180; lon += 15) {
    let prev = null;
    for (let lat = -80; lat <= 80; lat += 6) {
      const v = toVec(lat, lon);
      if (prev) grat.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
      prev = v;
    }
  }
  const gratGeo = new THREE.BufferGeometry();
  gratGeo.setAttribute('position', new THREE.Float32BufferAttribute(grat, 3));
  globe.add(new THREE.LineSegments(gratGeo, new THREE.LineBasicMaterial({
    color: 0x1a5578, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  /* occluder so back-side lines dim */
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R - 0.02, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x04080f, transparent: true, opacity: 0.92 })
  ));

  /* city nodes */
  const cool = [], warm = [];
  for (const [lat, lon, hq] of CITIES) {
    const v = toVec(lat, lon, R + 0.01);
    (hq ? warm : cool).push(v.x, v.y, v.z);
  }
  const coolGeo = new THREE.BufferGeometry();
  coolGeo.setAttribute('position', new THREE.Float32BufferAttribute(cool, 3));
  globe.add(new THREE.Points(coolGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0x35c3ff, size: 0.2, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const warmGeo = new THREE.BufferGeometry();
  warmGeo.setAttribute('position', new THREE.Float32BufferAttribute(warm, 3));
  const hqMat = new THREE.PointsMaterial({
    map: softDot(), color: 0xf0a04a, size: 0.34, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  globe.add(new THREE.Points(warmGeo, hqMat));

  /* arcs HQ → each city, animated draw */
  const hq = toVec(CITIES[0][0], CITIES[0][1]);
  const arcs = [];
  for (let i = 1; i < CITIES.length; i++) {
    const dst = toVec(CITIES[i][0], CITIES[i][1]);
    const mid = hq.clone().add(dst).multiplyScalar(0.5).normalize()
      .multiplyScalar(R + hq.distanceTo(dst) * 0.35);
    const curve = new THREE.QuadraticBezierCurve3(hq, mid, dst);
    const pts = curve.getPoints(40);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x35c3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    globe.add(line);
    arcs.push({ line, geo, offset: Math.random() * 4, speed: 0.55 + Math.random() * 0.4 });
    if (reduceMotion) geo.setDrawRange(0, 41);
    else geo.setDrawRange(0, 0);
  }

  /* faint halo */
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0x0f6f9f, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.setScalar(R * 5.4);
  fx.scene.add(halo);

  /* face North America, gentle oscillation */
  const baseY = -(-95 + 180) * Math.PI / 180 + Math.PI / 2 + 0.12;
  globe.rotation.x = 0.62;

  fx.run((dt, t) => {
    globe.rotation.y = baseY + Math.sin(t * 0.12) * 0.16 + pointer.x * 0.12;
    globe.rotation.x = 0.62 + pointer.y * 0.06;
    hqMat.size = 0.34 + Math.sin(t * 2.2) * 0.07;
    for (const a of arcs) {
      const u = ((t * a.speed + a.offset) % 4) / 4; // draw, hold, fade cycle
      let n;
      if (u < 0.45) n = Math.floor((u / 0.45) * 41);
      else if (u < 0.75) n = 41;
      else n = Math.floor((1 - (u - 0.75) / 0.25) * 41);
      a.geo.setDrawRange(0, Math.max(0, n));
    }
  });
  if (reduceMotion) {
    globe.rotation.y = baseY;
    fx.frame();
  }
}
