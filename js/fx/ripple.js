/* Hero fluid ripple: the port footage rendered through a displacement shader —
   the cursor drags liquid distortion (with chromatic split) across the frame. */
import * as THREE from 'three';

const TRAIL = 12;

export function initRipple(canvas, video) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;

  const trail = new Float32Array(TRAIL * 4); // x, y, strength, unused
  const uniforms = {
    uTex: { value: tex },
    uScale: { value: new THREE.Vector2(1, 1) },
    uTrail: { value: trail },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform vec2 uScale; uniform float uTime;
      uniform vec4 uTrail[${TRAIL}];
      varying vec2 vUv;
      void main(){
        vec2 uv = (vUv - 0.5) * uScale + 0.5;
        vec2 push = vec2(0.0);
        float glow = 0.0;
        for (int i = 0; i < ${TRAIL}; i++) {
          vec4 p = uTrail[i];
          if (p.z < 0.001) continue;
          vec2 d = vUv - p.xy;
          d.x *= uScale.y / uScale.x; // keep ripples round
          float dist = length(d);
          float inf = p.z * exp(-dist * dist * 90.0);
          push += normalize(d + 0.0001) * inf * 0.045;
          glow += inf;
        }
        uv += push;
        float ca = glow * 0.010;
        vec3 col;
        col.r = texture2D(uTex, uv + vec2(ca, 0.0)).r;
        col.g = texture2D(uTex, uv).g;
        col.b = texture2D(uTex, uv - vec2(ca, 0.0)).b;
        col += vec3(0.10, 0.35, 0.55) * glow * 0.16;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    renderer.setSize(w, h, false);
    const va = (video.videoWidth || 16) / (video.videoHeight || 9);
    const ca = w / h;
    if (ca > va) uniforms.uScale.value.set(1, va / ca);
    else uniforms.uScale.value.set(ca / va, 1);
  }
  resize();
  addEventListener('resize', resize);
  video.addEventListener('loadedmetadata', resize);

  const hero = canvas.closest('.hero') || canvas.parentElement;
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    for (let i = TRAIL - 1; i > 0; i--) {
      trail[i * 4] = trail[(i - 1) * 4];
      trail[i * 4 + 1] = trail[(i - 1) * 4 + 1];
      trail[i * 4 + 2] = trail[(i - 1) * 4 + 2] * 0.86;
    }
    trail[0] = (e.clientX - r.left) / r.width;
    trail[1] = 1 - (e.clientY - r.top) / r.height;
    trail[2] = 1;
  });

  let visible = true, raf = 0, started = false;
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    uniforms.uTime.value += 0.016;
    for (let i = 0; i < TRAIL; i++) trail[i * 4 + 2] *= 0.955; // ripples relax
    renderer.render(scene, cam);
    if (!started && video.readyState >= 2) { started = true; video.style.opacity = '0'; }
    raf = requestAnimationFrame(loop);
  }
  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }, { rootMargin: '60px' });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop); });
  raf = requestAnimationFrame(loop);
}
