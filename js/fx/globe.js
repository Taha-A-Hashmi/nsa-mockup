/* Distributor globe: a lit planet with dotted continents (sampled from a real
   land/water mask), atmosphere rim, city nodes, and arcs out of Long Island. */
import * as THREE from 'three';
import { mountScene, softDot, pointer } from './util.js';

const CITIES = [
  [40.75, -73.6, true],  // Long Island HQ
  [43.7, -79.4], [45.5, -73.6], [46.8, -71.2], [49.3, -123.1], [51.0, -114.1], [49.9, -97.1],
  [42.36, -71.06], [39.95, -75.16], [35.2, -80.8], [33.7, -84.4], [36.16, -86.78],
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
  const fx = mountScene(canvas, { fov: 42, z: 7.4, lit: true });
  const globe = new THREE.Group();
  fx.scene.add(globe);

  fx.scene.add(new THREE.AmbientLight(0x2a4560, 0.9));
  const key = new THREE.DirectionalLight(0x9fc8ff, 2.0);
  key.position.set(-4, 3, 5);
  fx.scene.add(key);

  /* the planet ball */
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d2036, roughness: 0.75, metalness: 0.1 })
  ));

  /* atmosphere rim (fresnel, back side) */
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.07, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      uniforms: { c: { value: new THREE.Color(0x2593c9) } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 c; varying vec3 vN; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.5);
        gl_FragColor = vec4(c, f * 0.9); }`,
    })
  );
  globe.add(atmo);

  /* dotted continents from the land/water mask */
  const img = new Image();
  img.src = 'assets/img/earth-water.png';
  img.onload = () => {
    const W = 400, H = 200;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const data = g.getImageData(0, 0, W, H).data;
    const land = (lat, lon) => {
      const u = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W));
      const v = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
      return data[(v * W + u) * 4] < 128; // land is dark in this mask
    };
    const pos = [];
    const STEP = 1.4;
    for (let lat = -58; lat <= 84; lat += STEP) {
      const lonStep = STEP / Math.max(0.35, Math.cos(lat * Math.PI / 180));
      for (let lon = -180; lon < 180; lon += lonStep) {
        if (!land(lat, lon)) continue;
        const v = toVec(lat, lon, R + 0.008);
        pos.push(v.x, v.y, v.z);
      }
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    globe.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
      map: softDot(), color: 0x3fb9ea, size: 0.045, transparent: true, opacity: 0.9,
      alphaTest: 0.02, depthWrite: false,
    })));
    if (reduceMotion) fx.frame();
  };

  /* city nodes */
  const cool = [], warmArr = [];
  for (const [lat, lon, hq] of CITIES) {
    const v = toVec(lat, lon, R + 0.02);
    (hq ? warmArr : cool).push(v.x, v.y, v.z);
  }
  const coolGeo = new THREE.BufferGeometry();
  coolGeo.setAttribute('position', new THREE.Float32BufferAttribute(cool, 3));
  globe.add(new THREE.Points(coolGeo, new THREE.PointsMaterial({
    map: softDot(), color: 0x8fe2ff, size: 0.17, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const warmGeo = new THREE.BufferGeometry();
  warmGeo.setAttribute('position', new THREE.Float32BufferAttribute(warmArr, 3));
  const hqMat = new THREE.PointsMaterial({
    map: softDot(), color: 0xf0a04a, size: 0.34, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  globe.add(new THREE.Points(warmGeo, hqMat));

  /* arcs HQ → each city */
  const hq = toVec(CITIES[0][0], CITIES[0][1]);
  const arcs = [];
  for (let i = 1; i < CITIES.length; i++) {
    const dst = toVec(CITIES[i][0], CITIES[i][1]);
    const mid = hq.clone().add(dst).multiplyScalar(0.5).normalize()
      .multiplyScalar(R + hq.distanceTo(dst) * 0.22);
    const curve = new THREE.QuadraticBezierCurve3(hq, mid, dst);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0x35c3ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    globe.add(line);
    arcs.push({ geo, offset: Math.random() * 4, speed: 0.55 + Math.random() * 0.4 });
    geo.setDrawRange(0, reduceMotion ? 41 : 0);
  }

  /* face North America */
  const baseY = -(-95 + 180) * Math.PI / 180 + Math.PI / 2 + 0.12;
  globe.rotation.x = 0.62;

  fx.run((dt, t) => {
    globe.rotation.y = baseY + Math.sin(t * 0.12) * 0.14 + pointer.x * 0.12;
    globe.rotation.x = 0.62 + pointer.y * 0.06;
    hqMat.size = 0.34 + Math.sin(t * 2.2) * 0.07;
    for (const a of arcs) {
      const u = ((t * a.speed + a.offset) % 4) / 4;
      let n;
      if (u < 0.45) n = Math.floor((u / 0.45) * 41);
      else if (u < 0.75) n = 41;
      else n = Math.floor((1 - (u - 0.75) / 0.25) * 41);
      a.geo.setDrawRange(0, Math.max(0, n));
    }
  });
  if (reduceMotion) { globe.rotation.y = baseY; fx.frame(); }
}
