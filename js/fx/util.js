/* Shared helpers for the three.js scenes. */
import * as THREE from 'three';

/* Soft radial dot texture — every Points/sprite material uses this, never square points. */
let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

/* Canvas-drawn text chip sprite (for orbit labels / globe captions). */
export function textSprite(text, { fill = '#bfe8ff', pad = 26, font = '600 44px "Space Grotesk", sans-serif', frame = 'rgba(53,195,255,0.45)', bg = 'rgba(5,16,26,0.82)' } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = 84;
  c.width = w; c.height = h;
  g.font = font;
  g.fillStyle = bg;
  g.strokeStyle = frame;
  g.lineWidth = 2;
  const r = 12;
  g.beginPath();
  g.roundRect(1, 1, w - 2, h - 2, r);
  g.fill(); g.stroke();
  g.fillStyle = fill;
  g.textBaseline = 'middle';
  g.fillText(text, pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  const scale = 0.010;
  sp.scale.set(w * scale, h * scale, 1);
  return sp;
}

/* Mount a renderer on a canvas: sizing, DPR cap, RAF loop paused offscreen. */
export function mountScene(canvas, { fov = 50, z = 10, dprMax = 1.5, lit = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  if (lit) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
  camera.position.z = z;

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, dprMax));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let visible = false;
  let raf = 0;
  let cb = null;
  const clock = new THREE.Clock();
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (cb) cb(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: '80px' });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop); });

  return {
    scene, camera, renderer, resize,
    run(fn) { cb = fn; if (visible && !raf) raf = requestAnimationFrame(loop); },
    frame() { renderer.render(scene, camera); }, // one-shot render (reduced motion)
  };
}

/* Pointer position normalized to [-1,1], smoothed by caller. */
export const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
});
