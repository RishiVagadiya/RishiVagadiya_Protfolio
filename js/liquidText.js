// Liquid / gooey metal text effect — reproduces the "Ori Lazar" animated name.
// A ping-pong feedback buffer accumulates a fading trail under the cursor;
// a displacement + emboss shader melts and re-forms the letters into liquid chrome.
import * as THREE from "three";

const TRAIL_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }
`;

// Feedback pass: fade previous trail, stamp a soft brush along the mouse segment.
const TRAIL_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2 uMouse;      // current, uv space
  uniform vec2 uPrevMouse;  // previous, uv space
  uniform float uAspect;    // w/h
  uniform float uRadius;
  uniform float uStrength;
  uniform float uDecay;
  uniform float uActive;

  // distance from p to segment a-b (aspect corrected)
  float segDist(vec2 p, vec2 a, vec2 b){
    p.x*=uAspect; a.x*=uAspect; b.x*=uAspect;
    vec2 pa = p-a, ba = b-a;
    float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-5),0.0,1.0);
    return length(pa - ba*h);
  }
  void main(){
    float prev = texture2D(uPrev, vUv).r * uDecay;
    float d = segDist(vUv, uPrevMouse, uMouse);
    float brush = smoothstep(uRadius, 0.0, d) * uStrength * uActive;
    gl_FragColor = vec4(max(prev, brush), 0.0, 0.0, 1.0);
  }
`;

// Main pass: displace + light the text using the trail height field.
const MAIN_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uText;
  uniform sampler2D uTrail;
  uniform vec2 uTexel;      // 1/size
  uniform float uDistort;
  uniform float uTime;

  void main(){
    // height field + gradient (fake normal) from the trail
    float h  = texture2D(uTrail, vUv).r;
    float hx = texture2D(uTrail, vUv+vec2(uTexel.x,0.0)).r - texture2D(uTrail, vUv-vec2(uTexel.x,0.0)).r;
    float hy = texture2D(uTrail, vUv+vec2(0.0,uTexel.y)).r - texture2D(uTrail, vUv-vec2(0.0,uTexel.y)).r;
    vec2 grad = vec2(hx, hy);

    // melt: pull the sampled text toward the peaks + a little wobble
    float wobble = sin(uTime*3.0 + vUv.y*40.0) * 0.0015 * h;
    vec2 uv = vUv - grad * uDistort - vec2(wobble, 0.0);

    // slight chromatic split inside liquid zones for shimmer
    float ca = h * 0.006;
    float r = texture2D(uText, uv + vec2(ca,0.0)).a;
    float g = texture2D(uText, uv).a;
    float b = texture2D(uText, uv - vec2(ca,0.0)).a;
    float alpha = max(r, max(g,b));

    // liquid-metal shading from the gradient normal
    vec3 n = normalize(vec3(-grad*80.0, 1.0));
    vec3 L = normalize(vec3(0.4, 0.7, 0.8));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(diff, 24.0);

    // base white text -> chrome (cyan/violet tint) where h is high
    vec3 baseCol = vec3(0.92,0.95,1.0);
    vec3 metal   = mix(vec3(0.55,0.85,1.0), vec3(0.75,0.65,1.0), n.x*0.5+0.5);
    vec3 col = mix(baseCol, metal, clamp(h*1.6,0.0,1.0));
    col += spec * h * 1.4;                 // specular sparkle
    col += vec3(0.2,0.55,1.0) * h * 0.25;  // cyan bloom

    gl_FragColor = vec4(col, alpha);
  }
`;

export function initLiquidName(canvas, text = "Rishi Vagadiya") {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  // --- text texture (drawn on a 2D canvas) ---
  const tCanvas = document.createElement("canvas");
  const tCtx = tCanvas.getContext("2d");
  const textTex = new THREE.CanvasTexture(tCanvas);
  textTex.minFilter = THREE.LinearFilter;
  textTex.magFilter = THREE.LinearFilter;

  function drawText(w, h) {
    tCanvas.width = w; tCanvas.height = h;
    tCtx.clearRect(0, 0, w, h);
    // fit font size to width
    let size = Math.floor(h * 0.62);
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    const setFont = s => (tCtx.font = `${s}px "VT323", monospace`);
    setFont(size);
    while (tCtx.measureText(text).width > w * 0.94 && size > 10) {
      size -= 2; setFont(size);
    }
    tCtx.fillStyle = "#ffffff";
    tCtx.shadowColor = "rgba(0,224,255,0.35)";
    tCtx.shadowBlur = size * 0.08;
    tCtx.fillText(text, w / 2, h / 2 + size * 0.04);
    textTex.needsUpdate = true;
  }

  // --- ping-pong trail render targets ---
  const rtOpts = { format: THREE.RGBAFormat, type: THREE.HalfFloatType,
                   minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
                   depthBuffer: false, stencilBuffer: false };
  let rtA, rtB, W = 2, H = 2;

  const trailMat = new THREE.ShaderMaterial({
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
    uniforms: {
      uPrev: { value: null }, uMouse: { value: new THREE.Vector2(-1, -1) },
      uPrevMouse: { value: new THREE.Vector2(-1, -1) }, uAspect: { value: 1 },
      uRadius: { value: 0.09 }, uStrength: { value: 1.0 },
      uDecay: { value: 0.955 }, uActive: { value: 0 },
    },
  });
  const mainMat = new THREE.ShaderMaterial({
    vertexShader: TRAIL_VERT, fragmentShader: MAIN_FRAG, transparent: true,
    uniforms: {
      uText: { value: textTex }, uTrail: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 2, 1 / 2) },
      uDistort: { value: 0.14 }, uTime: { value: 0 },
    },
  });

  const trailScene = new THREE.Scene();
  trailScene.add(new THREE.Mesh(quad, trailMat));
  const mainScene = new THREE.Scene();
  mainScene.add(new THREE.Mesh(quad, mainMat));

  const mouse = new THREE.Vector2(-1, -1);
  const prevMouse = new THREE.Vector2(-1, -1);
  let active = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.floor(rect.width * dpr));
    const h = Math.max(2, Math.floor(rect.height * dpr));
    if (w === W && h === H && rtA) return;
    W = w; H = h;
    renderer.setSize(rect.width, rect.height, false);
    if (rtA) { rtA.dispose(); rtB.dispose(); }
    rtA = new THREE.WebGLRenderTarget(w, h, rtOpts);
    rtB = new THREE.WebGLRenderTarget(w, h, rtOpts);
    trailMat.uniforms.uAspect.value = w / h;
    trailMat.uniforms.uRadius.value = 0.11;
    mainMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    drawText(w, h);
  }

  // pointer -> uv (origin bottom-left, y flipped to match GL)
  function onMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    const v = 1 - (clientY - rect.top) / rect.height;
    prevMouse.copy(mouse.x < -0.5 ? new THREE.Vector2(u, v) : mouse);
    mouse.set(u, v);
    active = 1;
  }
  canvas.addEventListener("pointermove", e => onMove(e.clientX, e.clientY));
  canvas.addEventListener("pointerleave", () => { active = 0; });
  canvas.addEventListener("touchmove", e => {
    if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  let raf, t0 = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    resize();
    const time = t * 0.001;

    // feedback trail: read rtA, write rtB
    trailMat.uniforms.uPrev.value = rtA.texture;
    trailMat.uniforms.uMouse.value.copy(mouse);
    trailMat.uniforms.uPrevMouse.value.copy(prevMouse.x < -0.5 ? mouse : prevMouse);
    trailMat.uniforms.uActive.value = active;
    renderer.setRenderTarget(rtB);
    renderer.render(trailScene, camera);

    // main pass to screen
    mainMat.uniforms.uTrail.value = rtB.texture;
    mainMat.uniforms.uTime.value = time;
    renderer.setRenderTarget(null);
    renderer.render(mainScene, camera);

    // swap + let trail settle when idle
    const tmp = rtA; rtA = rtB; rtB = tmp;
    prevMouse.copy(mouse);
    active *= 0.9; // decay activation so a pause stops adding ink
  }

  // wait for the pixel font before first draw
  const start = () => { resize(); frame(0); };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('40px "VT323"').then(start).catch(start);
  } else start();

  window.addEventListener("resize", resize);
  return { destroy() { cancelAnimationFrame(raf); renderer.dispose(); } };
}
