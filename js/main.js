// toxuesure.in — fog, lens and chapters.
// One fixed WebGL canvas draws the fog. HTML stays on top for text.
// The fog shader blurs whatever sits behind it (hidden hero lines, chapter video)
// and a lens at the cursor (or a held finger) shows it sharp.

const root = document.documentElement;
root.classList.add('js');

// ---------- tunables (brand tokens) ----------
const FOG = [0xe9 / 255, 0xe9 / 255, 0xe6 / 255];
const INK = [0x0a / 255, 0x0a / 255, 0x0a / 255];
const DOT = [0xed / 255, 0x3b / 255, 0x03 / 255];
const VEIL = 0.72;             // fog-veil
const LENS_R = 120;            // lens-size 240px diameter (css px)
const LENS_R_TOUCH = 100;      // 200px on touch
const LENS_SOFT = 24;          // soft edge, css px
const DOWNSCALE = 6;           // blur is done at 1/6 size
const HIDDEN_LINES = [         // only visible through the lens: [text, x, y, style]
  ['you looked closer.', 0.56, 0.20, 'display'],
  ['one dot. no apologies.', 0.10, 0.30, 'mono'],
  ['made in blender.', 0.74, 0.44, 'mono'],
  ['scroll. it clears.', 0.36, 0.52, 'mono'],
];

const isTouch = matchMedia('(hover: none)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- load: rack focus on the wordmark ----------
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
fontsReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready'))));

// ---------- chapters: play only what is near the screen ----------
const chapters = [...document.querySelectorAll('[data-chapter]')].map((el) => ({
  el,
  frame: el.querySelector('.chapter__frame'),
  video: el.querySelector('video'),
  clear: 0,
}));
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const ch = chapters.find((c) => c.el === e.target);
    if (!ch || !ch.video) continue;
    if (e.isIntersecting) ch.video.play().catch(() => {});
    else ch.video.pause();
  }
}, { rootMargin: '20% 0px' });
chapters.forEach((c) => io.observe(c.el));

function chapterClear(rect, vh) {
  // 1 when the frame is centred, easing (cubic out) from 0 as it approaches
  const c = rect.top + rect.height / 2;
  const x = 1 - Math.min(Math.abs(c - vh / 2) / (vh * 0.32), 1);
  return 1 - Math.pow(1 - x, 3);
}

// ---------- WebGL ----------
let THREE;
try {
  THREE = await import('three');
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
  root.classList.add('gl');
  startGL();
} catch (err) {
  root.classList.remove('gl');
  root.classList.add('no-gl');
  startFallback();
}

function startFallback() {
  const tick = () => {
    const vh = innerHeight;
    for (const ch of chapters) ch.el.classList.toggle('is-clear', chapterClear(ch.frame.getBoundingClientRect(), vh) > 0.6);
    requestAnimationFrame(tick);
  };
  tick();
}

function startGL() {
  const canvas = document.getElementById('fog');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // pass brand hex through untouched
  const dprCap = isTouch ? 1.5 : 2;
  let dpr = Math.min(devicePixelRatio || 1, dprCap);

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene();
  scene.add(quad);

  const rtOpts = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtFull = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts);

  // hidden hero lines, drawn into a canvas texture
  const hiddenCanvas = document.createElement('canvas');
  const hiddenTex = new THREE.CanvasTexture(hiddenCanvas);
  hiddenTex.colorSpace = THREE.NoColorSpace;
  const hero = document.querySelector('.hero');

  function drawHidden() {
    const r = hero.getBoundingClientRect();
    hiddenCanvas.width = Math.max(1, Math.round(r.width * dpr));
    hiddenCanvas.height = Math.max(1, Math.round(r.height * dpr));
    const g = hiddenCanvas.getContext('2d');
    g.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    g.fillStyle = '#0a0a0a';
    g.textBaseline = 'top';
    const small = r.width < 700;
    for (const [text, x, y, style] of HIDDEN_LINES) {
      g.font = style === 'display'
        ? `800 ${Math.round((small ? 22 : 34) * dpr)}px "Archivo Expanded", Arial, sans-serif`
        : `400 ${Math.round((small ? 13 : 15) * dpr)}px "IBM Plex Mono", monospace`;
      const px = Math.min(x * hiddenCanvas.width, hiddenCanvas.width - g.measureText(text).width - 16 * dpr);
      g.fillText(text, Math.max(16 * dpr, px), y * hiddenCanvas.height);
    }
    hiddenTex.needsUpdate = true;
  }

  // video textures, one per chapter with video
  const blank = new THREE.DataTexture(new Uint8Array([233, 233, 230, 255]), 1, 1);
  blank.needsUpdate = true;
  for (const ch of chapters) {
    if (!ch.video) continue;
    ch.tex = new THREE.VideoTexture(ch.video);
    ch.tex.colorSpace = THREE.NoColorSpace;
    ch.tex.minFilter = THREE.LinearFilter;
    ch.tex.generateMipmaps = false;
  }

  const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  // pass 1: what sits behind the glass
  const composite = new THREE.ShaderMaterial({
    uniforms: {
      uRes: { value: new THREE.Vector2() },
      uHero: { value: new THREE.Vector4() },
      uMedia: { value: new THREE.Vector4(-1, -1, 0, 0) },
      uHasVideo: { value: 0 },
      tHidden: { value: hiddenTex },
      tVideo: { value: blank },
      uFog: { value: new THREE.Vector3(...FOG) },
      uInk: { value: new THREE.Vector3(...INK) },
    },
    vertexShader: vert,
    fragmentShader: `
      uniform vec2 uRes; uniform vec4 uHero; uniform vec4 uMedia; uniform float uHasVideo;
      uniform sampler2D tHidden; uniform sampler2D tVideo; uniform vec3 uFog; uniform vec3 uInk;
      varying vec2 vUv;
      void main(){
        vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;           // top-left origin, device px
        vec3 col = uFog;
        vec2 h = (p - uHero.xy) / uHero.zw;
        if (h.x >= 0.0 && h.x <= 1.0 && h.y >= 0.0 && h.y <= 1.0) {
          float a = texture2D(tHidden, vec2(h.x, 1.0 - h.y)).a;
          col = mix(col, uInk, a);
        }
        vec2 m = (p - uMedia.xy) / uMedia.zw;
        if (uHasVideo > 0.5 && m.x >= 0.0 && m.x <= 1.0 && m.y >= 0.0 && m.y <= 1.0) {
          col = texture2D(tVideo, vec2(m.x, 1.0 - m.y)).rgb;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  // passes 2-4: downsample and blur (kawase)
  const blur = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uOff: { value: 0 } },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uOff; varying vec2 vUv;
      void main(){
        vec2 o = uTexel * (uOff + 0.5);
        vec3 c = texture2D(tSrc, vUv).rgb * 0.2;
        c += texture2D(tSrc, vUv + vec2( o.x,  o.y)).rgb * 0.2;
        c += texture2D(tSrc, vUv + vec2(-o.x,  o.y)).rgb * 0.2;
        c += texture2D(tSrc, vUv + vec2( o.x, -o.y)).rgb * 0.2;
        c += texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb * 0.2;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // final pass: glass, veil, drifting fog, lens
  const finalMat = new THREE.ShaderMaterial({
    uniforms: {
      tSharp: { value: rtFull.texture }, tBlur: { value: rtA.texture },
      uRes: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2(-9999, -9999) },
      uR: { value: LENS_R }, uSoft: { value: LENS_SOFT }, uLensOn: { value: 0 }, uDpr: { value: 1 },
      uMedia: { value: new THREE.Vector4(-1, -1, 0, 0) }, uClear: { value: 0 }, uTime: { value: 0 },
      uFog: { value: new THREE.Vector3(...FOG) }, uDot: { value: new THREE.Vector3(...DOT) }, uVeil: { value: VEIL },
    },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tSharp; uniform sampler2D tBlur; uniform vec2 uRes; uniform vec2 uMouse;
      uniform float uR; uniform float uSoft; uniform float uLensOn; uniform float uDpr;
      uniform vec4 uMedia; uniform float uClear; uniform float uTime;
      uniform vec3 uFog; uniform vec3 uDot; uniform float uVeil;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
        float fogAmt = 1.0;
        vec2 m = (p - uMedia.xy) / uMedia.zw;
        if (m.x >= 0.0 && m.x <= 1.0 && m.y >= 0.0 && m.y <= 1.0) fogAmt = 1.0 - uClear;
        float R = uR * uDpr;
        float d = distance(p, uMouse);
        float lens = (1.0 - smoothstep(R - uSoft * uDpr, R, d)) * uLensOn;
        fogAmt *= 1.0 - lens;
        vec3 c = mix(texture2D(tSharp, vUv).rgb, texture2D(tBlur, vUv).rgb, fogAmt);
        float n = fbm(p / uRes.y * 2.4 + vec2(uTime * 0.012, -uTime * 0.008));
        vec3 fogCol = uFog + (n - 0.5) * 0.045;
        c = mix(c, fogCol, fogAmt * uVeil);
        float rim = (1.0 - smoothstep(0.0, uDpr, abs(d - R) - 0.75 * uDpr)) * uLensOn;
        c = mix(c, uDot, rim);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  let W = 1, H = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, dprCap);
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const fw = Math.round(W * dpr), fh = Math.round(H * dpr);
    rtFull.setSize(fw, fh);
    const sw = Math.max(1, Math.round(fw / DOWNSCALE)), sh = Math.max(1, Math.round(fh / DOWNSCALE));
    rtA.setSize(sw, sh); rtB.setSize(sw, sh);
    blur.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    composite.uniforms.uRes.value.set(fw, fh);
    finalMat.uniforms.uRes.value.set(fw, fh);
    finalMat.uniforms.uDpr.value = dpr;
    drawHidden();
  }
  addEventListener('resize', resize);
  fontsReady.then(drawHidden);
  resize();

  // lens: follows the pointer on desktop, press and hold on touch
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0, target: 0 };
  let holdTimer = 0;
  addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX; mouse.ty = e.clientY;
    if (e.pointerType === 'mouse') { if (!mouse.target) dispatchEvent(new CustomEvent('tx:lens', { detail: 'pointer' })); mouse.target = 1; if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; } }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.target = 0; });
  addEventListener('blur', () => { mouse.target = 0; });
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    mouse.tx = mouse.x = e.clientX; mouse.ty = mouse.y = e.clientY;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { mouse.target = 1; dispatchEvent(new CustomEvent('tx:lens', { detail: 'touch' })); }, 180);
  }, { passive: true });
  const release = (e) => { if (e.pointerType !== 'mouse') { clearTimeout(holdTimer); mouse.target = 0; } };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  finalMat.uniforms.uR.value = isTouch ? LENS_R_TOUCH : LENS_R;

  const work = document.getElementById('work');
  const t0 = performance.now();
  let last = t0;

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(scene, cam); }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    // nothing fogged on screen (plain sections cover the canvas): skip the GPU work
    if (work.getBoundingClientRect().bottom < -50) return;

    const vh = innerHeight;
    const k = 1 - Math.exp(-dt * 18);                  // smoothing, no overshoot
    mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;
    mouse.on += (mouse.target - mouse.on) * (1 - Math.exp(-dt * 14));

    // the chapter nearest the centre owns the glass
    let active = null, best = -1;
    for (const ch of chapters) {
      const r = ch.frame.getBoundingClientRect();
      ch.rect = r;
      ch.clear = chapterClear(r, vh);
      const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (vis > best) { best = vis; active = ch; }
    }
    const hr = hero.getBoundingClientRect();
    composite.uniforms.uHero.value.set(hr.left * dpr, hr.top * dpr, hr.width * dpr, hr.height * dpr);
    if (active && best > 0) {
      const r = active.rect;
      const v4 = [r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr];
      composite.uniforms.uMedia.value.set(...v4);
      finalMat.uniforms.uMedia.value.set(...v4);
      const ready = active.tex && active.video.readyState >= 2;
      composite.uniforms.uHasVideo.value = ready ? 1 : 0;
      composite.uniforms.tVideo.value = ready ? active.tex : blank;
      finalMat.uniforms.uClear.value = active.tex ? active.clear : 0;
    } else {
      composite.uniforms.uMedia.value.set(-1, -1, 0, 0);
      finalMat.uniforms.uMedia.value.set(-1, -1, 0, 0);
      composite.uniforms.uHasVideo.value = 0;
      finalMat.uniforms.uClear.value = 0;
    }

    finalMat.uniforms.uMouse.value.set(mouse.x * dpr, mouse.y * dpr);
    finalMat.uniforms.uLensOn.value = mouse.on;
    finalMat.uniforms.uTime.value = reduceMotion ? 0 : (now - t0) / 1000;

    pass(composite, rtFull);
    blur.uniforms.tSrc.value = rtFull.texture; blur.uniforms.uOff.value = 0; pass(blur, rtA);
    blur.uniforms.tSrc.value = rtA.texture; blur.uniforms.uOff.value = 1; pass(blur, rtB);
    blur.uniforms.tSrc.value = rtB.texture; blur.uniforms.uOff.value = 2; pass(blur, rtA);
    pass(finalMat, null);
  }
  requestAnimationFrame(frame);
}
