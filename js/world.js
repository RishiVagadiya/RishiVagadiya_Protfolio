import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Sky } from "three/addons/objects/Sky.js";

const MODEL_URL = "/assets/bicycle_game_asset.glb";
const MODEL_SCALE = 1;
const MODEL_Y = 0;

// ---- Rider tuning (easy to nudge) ----
const DRIVER_SCALE = 0.80;   // overall size of the character on the bike
const DRIVER_LEAN  = 0.66;   // total forward lean spread across the spine (radians)
const NECK_LIFT    = 0.40;   // counter-tilt so the head keeps looking ahead
const SEAT_SINK    = 0.05;   // how far the hips sit below the top of the saddle
const HAND_GRIP_DROP = 0.30; // grips sit this fraction below the top of the handlebar bbox
const HAND_GRIP_BACK = 0.52; // grips sit this fraction toward the rear of the bar bbox
const HAND_GRIP_INSET = 0.11;// pull grips in from the very tips of the bar
const HAND_GRIP_FWD  = 0.15; // reach the grips this much toward the front so the hands seat on them
const HAND_GRIP_LOWER = 0.07;// drop the grips a touch so the palms rest on the bar
const GRIP_CURL    = 0.5;    // how far the fingers curl around the bar (radians/segment)
const GRIP_THUMB   = 0.3;    // thumb curl

export function initWorld(canvas) {
  const isMobile = /Mobi|Android|iPhone|iPad|Macintosh/i.test(navigator.userAgent) && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: !isMobile, 
    powerPreference: "high-performance" 
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  // ---- physically-based sunset sky (three.js Sky shader) ----
  // Real atmospheric scattering with a low evening sun replaces the old flat
  // gradient. The environment map for PBR reflections is generated FROM this
  // sky, so water and building glass pick up genuine sunset tones.
  const sky = new Sky();
  sky.scale.setScalar(2000);
  const skyUni = sky.material.uniforms;
  skyUni.turbidity.value = 7;
  skyUni.rayleigh.value = 2.2;
  skyUni.mieCoefficient.value = 0.008;
  skyUni.mieDirectionalG.value = 0.82;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - 5.5), // elevation: sun low on the horizon
    THREE.MathUtils.degToRad(-62)       // azimuth: roughly matches the key light
  );
  skyUni.sunPosition.value.copy(sunDir);

  // warm dusk haze: distant scenery melts into the horizon glow
  scene.fog = new THREE.Fog(0xbd8a72, 30, 195);

  // Global materials
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15181f, metalness: 0.6, roughness: 0.5 });

  // PBR reflections generated from the sunset sky itself
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.add(sky); // re-parent the sky into the visible world

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 900);
  // Camera relative position to the bike will be maintained in the render loop
  // Adjusted: shifted right, lowered, and angled up to show full building tops (matching reference 2)
  const camOffset = new THREE.Vector3(-0.4, 2.0, 7.8);
  const camLookOffset = new THREE.Vector3(-0.2, 0.7, -1);

  // ---- lights ----
  // Low warm sun + peach sky bounce + cool twilight fill = golden hour
  scene.add(new THREE.HemisphereLight(0xffc9a3, 0x2e3a26, 0.55));
  const sun = new THREE.DirectionalLight(0xffb377, 2.6);
  // We attach the sun to the camera later so it follows the player
  sun.position.set(-14, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const fillLight = new THREE.DirectionalLight(0x7d8bff, 0.4);
  fillLight.position.set(6, 5, 5);
  scene.add(fillLight);

  // ================= ROAD =================
  const roadCanvas = document.createElement("canvas");
  roadCanvas.width = 128; roadCanvas.height = 1024;
  const rc = roadCanvas.getContext("2d");
  rc.fillStyle = "#2b2d33"; rc.fillRect(0, 0, 128, 1024);
  for (let i = 0; i < 4000; i++) { 
    const g = 20 + Math.random() * 40;
    rc.fillStyle = `rgba(${g},${g},${g + 4},${Math.random() * 0.5})`;
    rc.fillRect(Math.random() * 128, Math.random() * 1024, 2, 2);
  }
  rc.fillStyle = "#e9e4c9"; 
  rc.fillRect(10, 0, 4, 1024); rc.fillRect(114, 0, 4, 1024);
  for (let y = 0; y < 1024; y += 120) rc.fillRect(61, y, 6, 64); 
  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 33);
  roadTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  roadTex.colorSpace = THREE.SRGBColorSpace;

  // The road is no longer a straight strip: roadX(z) gives the centerline's
  // sideways drift at depth z — a right-hand sweep first, then a left-hand
  // one — and everything in the world (bike, camera, buildings, props, river,
  // grass) is laid out relative to this curve.
  const ROAD_HALF_W = 4.5;
  const LANE_X = -1.2; // bike's lane offset from the road centerline
  function roadX(z) {
    return -7 * Math.sin(z / 34);
  }

  // Builds a flat ribbon (y=0) that follows a centerline of {x,z} points.
  // UVs run 0..1 across (u) and along (v) so tiling road/water textures work.
  function buildRibbonGeo(centerline, width) {
    const half = width / 2;
    const pos = [], norm = [], uv = [], idx = [];
    for (let i = 0; i < centerline.length; i++) {
      const p = centerline[i];
      const prev = centerline[Math.max(0, i - 1)];
      const next = centerline[Math.min(centerline.length - 1, i + 1)];
      let dx = next.x - prev.x, dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const px = -dz, pz = dx; // ground-plane perpendicular
      pos.push(p.x + px * half, 0, p.z + pz * half, p.x - px * half, 0, p.z - pz * half);
      norm.push(0, 1, 0, 0, 1, 0);
      const v = i / (centerline.length - 1);
      uv.push(0, v, 1, v);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); // CCW from above => up-facing
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  const roadLine = [];
  for (let z = 25; z >= -305; z -= 2.5) roadLine.push({ x: roadX(z), z });
  const road = new THREE.Mesh(
    buildRibbonGeo(roadLine, ROAD_HALF_W * 2),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
  );
  road.receiveShadow = true;
  scene.add(road);

  // one big grass ground under everything (the curved road sits on top of it),
  // canvas-painted with tonal patches + blade noise so it reads as a real
  // meadow instead of a flat green sheet
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = groundCanvas.height = 512;
  const gtx = groundCanvas.getContext("2d");
  gtx.fillStyle = "#39602c"; gtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) { // large soft tonal patches
    const px = Math.random() * 512, py = Math.random() * 512, pr = 30 + Math.random() * 90;
    const tone = ["#2f5628", "#3c682f", "#456f33", "#33612c", "#5a7439"][(Math.random() * 5) | 0];
    const rg = gtx.createRadialGradient(px, py, 0, px, py, pr);
    rg.addColorStop(0, tone + "cc"); rg.addColorStop(1, tone + "00");
    gtx.fillStyle = rg;
    gtx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  for (let i = 0; i < 14000; i++) { // fine blade speckle
    const g = 70 + Math.random() * 80;
    gtx.fillStyle = `rgba(${(g * 0.45) | 0},${g | 0},${(g * 0.4) | 0},${0.1 + Math.random() * 0.25})`;
    gtx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1 + Math.random() * 2);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(26, 118);
  groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  groundTex.colorSpace = THREE.SRGBColorSpace;
  const grassMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, envMapIntensity: 0.25 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 1000), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, -400);
  ground.receiveShadow = true;
  scene.add(ground);

  // ================= RIVER SYSTEM (long winding river + branches, right side) =================
  // A long main river starts just past the Projects section and follows the
  // road's curves on the right side all the way down the course. Several
  // branch streams split off it across the ground. Every river is a ribbon
  // mesh over its own centerline; all centerline samples are collected in
  // riverSamples so grass/flower placement can avoid the water.
  const riverSamples = []; // { x, z, halfW } — exclusion zones for vegetation
  const waterTextures = []; // one clone per river so each scrolls in the loop

  // water surface texture: blue depth gradient + light ripple streaks; the
  // texture offset is scrolled in the render loop so the river visibly flows
  const waterCanvas = document.createElement("canvas");
  waterCanvas.width = 128; waterCanvas.height = 512;
  const wtx = waterCanvas.getContext("2d");
  const wg = wtx.createLinearGradient(0, 0, 128, 0);
  wg.addColorStop(0, "#123a5e"); wg.addColorStop(0.5, "#1e5d8f"); wg.addColorStop(1, "#123a5e");
  wtx.fillStyle = wg; wtx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 260; i++) {
    wtx.fillStyle = `rgba(190, 230, 255, ${0.04 + Math.random() * 0.12})`;
    wtx.fillRect(Math.random() * 128, Math.random() * 512, 8 + Math.random() * 26, 1.5);
  }
  const waterTexBase = new THREE.CanvasTexture(waterCanvas);
  waterTexBase.wrapS = waterTexBase.wrapT = THREE.RepeatWrapping;
  waterTexBase.colorSpace = THREE.SRGBColorSpace;

  // rippled water normal map: canvas height-noise -> sobel filter. Per-river
  // clones scroll at their own speed in the loop so the surface shimmers and
  // catches moving sunset reflections.
  const waterNormalTex = (() => {
    const S = 256;
    const hc = document.createElement("canvas"); hc.width = hc.height = S;
    const hx = hc.getContext("2d");
    hx.fillStyle = "#808080"; hx.fillRect(0, 0, S, S);
    hx.filter = "blur(2px)";
    for (let i = 0; i < 520; i++) {
      const g = (90 + Math.random() * 110) | 0;
      hx.fillStyle = `rgba(${g},${g},${g},0.5)`;
      hx.beginPath();
      hx.ellipse(Math.random() * S, Math.random() * S, 4 + Math.random() * 22, 1 + Math.random() * 5, Math.random() * Math.PI, 0, 6.3);
      hx.fill();
    }
    hx.filter = "none";
    const hd = hx.getImageData(0, 0, S, S).data;
    const nc = document.createElement("canvas"); nc.width = nc.height = S;
    const nx = nc.getContext("2d");
    const out = nx.createImageData(S, S);
    const hAt = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) / 255;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) / 255;
      const i = (y * S + x) * 4;
      out.data[i] = 127.5 + dx * 280;
      out.data[i + 1] = 127.5 + dy * 280;
      out.data[i + 2] = 255;
      out.data[i + 3] = 255;
    }
    nx.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(nc);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const waterNormals = []; // { tex, speed } — scrolled in the render loop

  const bankMat = new THREE.MeshStandardMaterial({ color: 0x70583a, roughness: 1, side: THREE.DoubleSide });

  function makeRiver(points, waterW, lift = 0) {
    // dirt bank sits just under the water so the river gets a soft earthy edge
    // (lift raises branch streams a hair so junctions never z-fight the main river)
    const bank = new THREE.Mesh(buildRibbonGeo(points, waterW + 1.4), bankMat);
    bank.position.y = -0.012 + lift;
    bank.receiveShadow = true;
    scene.add(bank);

    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    }
    const tex = waterTexBase.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(len / 9)));
    waterTextures.push(tex);

    const nrm = waterNormalTex.clone();
    nrm.needsUpdate = true;
    nrm.repeat.set(2, Math.max(2, Math.round(len / 5)));
    waterNormals.push({ tex: nrm, speed: 0.85 + Math.random() * 0.5 });

    const water = new THREE.Mesh(
      buildRibbonGeo(points, waterW),
      new THREE.MeshStandardMaterial({
        map: tex,
        normalMap: nrm,
        normalScale: new THREE.Vector2(0.55, 0.55),
        color: 0xbfe2ff,
        roughness: 0.08,
        metalness: 0.25,
        transparent: true,
        opacity: 0.93,
        emissive: 0x0d3752,
        emissiveIntensity: 0.35,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide
      })
    );
    water.position.y = 0.004 + lift;
    scene.add(water);

    for (const p of points) riverSamples.push({ x: p.x, z: p.z, halfW: waterW / 2 + 0.9 });
  }

  // main river: enters after the Projects building (z ≈ -38) and meanders on
  // the right verge for the whole ride, echoing the road's own curves
  const mainRiverX = (z) => roadX(z) + 22 + 2.5 * Math.sin(z / 19 + 2.0);
  const mainRiverPts = [];
  for (let z = -38; z >= -300; z -= 3) mainRiverPts.push({ x: mainRiverX(z), z });
  makeRiver(mainRiverPts, 3.4);

  // branch streams: split off the main river and spread across the ground on
  // the right, each with its own gentle bend
  const branchDefs = [
    { z: -55,  len: 26, head: -0.45, bend:  0.9 },
    { z: -95,  len: 30, head:  0.35, bend: -0.8 },
    { z: -140, len: 24, head: -0.55, bend:  0.8 },
    { z: -185, len: 34, head:  0.25, bend: -0.9 },
    { z: -235, len: 28, head: -0.40, bend:  0.7 },
    { z: -270, len: 24, head:  0.30, bend: -0.6 },
  ];
  for (const b of branchDefs) {
    const pts = [];
    let x = mainRiverX(b.z), z = b.z, h = b.head;
    const STEP = 2.4, steps = Math.ceil(b.len / STEP);
    for (let i = 0; i <= steps; i++) {
      pts.push({ x, z });
      x += Math.cos(h) * STEP;
      z += Math.sin(h) * STEP;
      h += b.bend * (STEP / b.len);
    }
    makeRiver(pts, 2.0, 0.004);
  }

  // quick lookup so vegetation never spawns in the water
  function inRiver(x, z) {
    for (const s of riverSamples) {
      const dz = z - s.z;
      if (dz > s.halfW || dz < -s.halfW) continue;
      const dx = x - s.x;
      if (dx * dx + dz * dz < s.halfW * s.halfW) return true;
    }
    return false;
  }

  // rocks scattered along the banks of every river
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5f6b, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const s = riverSamples[(Math.random() * riverSamples.length) | 0];
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + Math.random() * 0.2, 0), rockMat);
    const side = Math.random() < 0.5 ? -1 : 1;
    rock.position.set(
      s.x + side * (s.halfW - 0.5 + Math.random() * 0.5),
      0.02,
      s.z + (Math.random() - 0.5) * 2
    );
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    scene.add(rock);
  }

  // ================= VEGETATION PLACEMENT HELPER =================
  // The grass itself is now real modelled clumps from assets/grass_pack.glb,
  // loaded further down (it needs the GLTF loader). This helper picks spots
  // on the verge that follow the road's curve and skip every river.
  function groundSpot(maxSpread, minOff = 0.7) {
    for (let t = 0; t < 24; t++) {
      const z = 20 - Math.random() * 315;
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = roadX(z) + side * (ROAD_HALF_W + minOff + Math.random() * maxSpread);
      if (!inRiver(x, z)) return { x, z };
    }
    return null;
  }
  const _gDummy = new THREE.Object3D();

  // ================= DRIFTING CLOUDS =================
  // Soft procedural cumulus sprites high over the course, tinted by the low
  // sun, drifting slowly sideways and wrapping around so the sky always moves.
  function makeCloudTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const x = c.getContext("2d");
    const puffs = 16 + ((Math.random() * 10) | 0);
    for (let i = 0; i < puffs; i++) {
      const px = 40 + Math.random() * 176;
      const py = 58 + (Math.random() - 0.5) * 34;
      const pr = 14 + Math.random() * 26;
      const g = x.createRadialGradient(px, py, pr * 0.1, px, py, pr);
      const a = 0.1 + Math.random() * 0.16;
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.65, `rgba(255,244,235,${a * 0.55})`);
      g.addColorStop(1, "rgba(255,240,230,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 128);
    }
    // shade the underside so the puffs read as lit-from-above clouds
    const sh = x.createLinearGradient(0, 60, 0, 128);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(120,90,110,0.2)");
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = sh; x.fillRect(0, 0, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const cloudTexs = [makeCloudTexture(), makeCloudTexture(), makeCloudTexture()];
  const clouds = [];
  const CLOUD_COUNT = isMobile ? 10 : 20;
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const z = 40 - (i / CLOUD_COUNT) * 400 + (Math.random() - 0.5) * 26;
    const mat = new THREE.SpriteMaterial({
      map: cloudTexs[i % 3],
      transparent: true,
      opacity: 0.5 + Math.random() * 0.38,
      color: new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xffc9a6), Math.random() * 0.65),
      depthWrite: false,
      fog: false,
      rotation: (Math.random() - 0.5) * 0.25
    });
    const spr = new THREE.Sprite(mat);
    const sx = 26 + Math.random() * 46;
    spr.scale.set(sx, sx * (0.34 + Math.random() * 0.14), 1);
    spr.position.set(roadX(z) + (Math.random() - 0.5) * 260, 34 + Math.random() * 42, z);
    spr.userData = { speed: 0.55 + Math.random() * 1.1, baseZ: z };
    scene.add(spr);
    clouds.push(spr);
  }

  // ================= DISTANT MOUNTAIN RIDGES =================
  // Layered silhouette ridges flanking the whole course — the warm dusk fog
  // does the atmospheric-perspective work of fading them into the horizon.
  function makeRidge(width, height, peaks, colorHex) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    for (let i = 0; i <= peaks; i++) {
      const px = -width / 2 + (i / peaks) * width;
      const py = (i === 0 || i === peaks) ? height * 0.12 : height * (0.35 + Math.random() * 0.65);
      shape.lineTo(px - (width / peaks) * 0.22 * Math.random(), py);
      if (i < peaks) shape.lineTo(px + (width / peaks) * (0.3 + Math.random() * 0.3), height * (0.1 + Math.random() * 0.22));
    }
    shape.lineTo(width / 2, 0);
    shape.closePath();
    return new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: colorHex, fog: true })
    );
  }
  // Ridges are flat silhouettes, so they must sit FAR off the verge — anchor
  // each by its inner edge (never its centre) so the wide silhouette can never
  // reach across the road. Base drops below ground and they face the camera
  // squarely (no inward tilt) to stay a clean backdrop.
  const RIDGE_INNER = 95; // minimum distance from road centre to a ridge's near edge
  function placeRidge(width, height, peaks, colorHex, rz, side, zBack) {
    const m = makeRidge(width, height, peaks, colorHex);
    m.position.set(roadX(rz) + side * (RIDGE_INNER + width / 2), -3, rz - zBack);
    scene.add(m);
  }
  const ridgeRows = isMobile ? 5 : 9;
  for (let i = 0; i < ridgeRows; i++) {
    const rz = 30 - (i / (ridgeRows - 1)) * 400;
    for (const side of [-1, 1]) {
      placeRidge(200 + Math.random() * 80, 26 + Math.random() * 16, 5, 0x5d4a72, rz, side, 60);
      if (!isMobile && Math.random() < 0.7) {
        placeRidge(140 + Math.random() * 60, 16 + Math.random() * 10, 4, 0x413352, rz, side, 30);
      }
    }
  }
  // big hazy ranges closing off the vista far behind the whole course; these
  // sit well past the last building so they read purely as distant horizon
  for (const [off, h, col] of [[-360, 48, 0x6b5580], [-420, 60, 0x7d6690]]) {
    const back = makeRidge(600, h, 9, col);
    back.position.set(roadX(-380), -4, off);
    scene.add(back);
  }

  // ================= FAR CITY SKYLINE =================
  // A ring of dark towers with lit windows far off both verges (one
  // InstancedMesh) — the city this neon road belongs to.
  const skylineCanvas = document.createElement("canvas");
  skylineCanvas.width = 64; skylineCanvas.height = 128;
  const skx = skylineCanvas.getContext("2d");
  skx.fillStyle = "#141b29"; skx.fillRect(0, 0, 64, 128);
  for (let wy = 4; wy < 124; wy += 7) {
    for (let wx = 4; wx < 60; wx += 8) {
      const r = Math.random();
      skx.fillStyle = r < 0.22 ? "#ffd28a" : r < 0.3 ? "#9fc8ff" : "#1d2536";
      skx.fillRect(wx, wy, 5, 4);
    }
  }
  const skylineTex = new THREE.CanvasTexture(skylineCanvas);
  skylineTex.colorSpace = THREE.SRGBColorSpace;
  const towerSideMat = new THREE.MeshBasicMaterial({ map: skylineTex, fog: true });
  const towerTopMat = new THREE.MeshBasicMaterial({ color: 0x10151f, fog: true });
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  towerGeo.translate(0, 0.5, 0); // base sits on the ground
  const TOWER_COUNT = isMobile ? 22 : 46;
  const skyline = new THREE.InstancedMesh(
    towerGeo,
    [towerSideMat, towerSideMat, towerTopMat, towerTopMat, towerSideMat, towerSideMat],
    TOWER_COUNT
  );
  skyline.frustumCulled = false;
  for (let i = 0; i < TOWER_COUNT; i++) {
    const tz = -6 - (i / TOWER_COUNT) * 330 + (Math.random() - 0.5) * 10;
    const side = i % 2 ? 1 : -1;
    _gDummy.position.set(roadX(tz) + side * (40 + Math.random() * 34), 0, tz);
    _gDummy.rotation.y = Math.random() * 0.5 - 0.25;
    _gDummy.scale.set(4 + Math.random() * 5, 9 + Math.random() * 19, 4 + Math.random() * 5);
    _gDummy.updateMatrix();
    skyline.setMatrixAt(i, _gDummy.matrix);
  }
  _gDummy.rotation.set(0, 0, 0);
  _gDummy.scale.set(1, 1, 1);
  scene.add(skyline);

  // ================= BIRDS =================
  // Small flocks gliding in lazy circles high over the course.
  const birds = [];
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x201826, side: THREE.DoubleSide, fog: true });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.52, 0.1, 0.16, 0.52, 0.1, -0.16], 3));
  wingGeo.computeVertexNormals();
  const flockDefs = isMobile ? [{ z: -80 }] : [{ z: -45 }, { z: -135 }, { z: -225 }];
  for (const f of flockDefs) {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group();
      const wl = new THREE.Mesh(wingGeo, birdMat);
      const wr = new THREE.Mesh(wingGeo, birdMat);
      wr.scale.x = -1;
      b.add(wl, wr);
      b.scale.setScalar(0.8 + Math.random() * 0.5);
      scene.add(b);
      birds.push({
        g: b, wl, wr,
        cx: roadX(f.z) + (Math.random() - 0.5) * 30,
        cz: f.z + (Math.random() - 0.5) * 24,
        y: 16 + Math.random() * 9,
        r: 10 + Math.random() * 10,
        sp: (0.08 + Math.random() * 0.07) * (Math.random() < 0.5 ? 1 : -1),
        ph: Math.random() * 6.3,
        flap: 7 + Math.random() * 4
      });
    }
  }

  // ================= SCENERY =================
  // Tree models loading
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onLoad = () => {
    const loaderEl = document.getElementById("loader");
    if (loaderEl) {
      loaderEl.classList.add("hide");
    }
  };
  const loader = new GLTFLoader(loadingManager);
  let ginkgoTreeModel = null;
  let customTreeModel2 = null;
  const treePlaceholders = [];

  loader.load("/assets/ginkgo_tree.glb", (gltf) => {
    ginkgoTreeModel = gltf.scene;
    prepareTreeModel(ginkgoTreeModel, 5.2);
    replacePlaceholdersWithModel(ginkgoTreeModel, "ginkgo");
  });

  loader.load("/assets/tree_mesh.glb", (gltf) => {
    customTreeModel2 = gltf.scene;
    prepareTreeModel(customTreeModel2, 5.8);
    replacePlaceholdersWithModel(customTreeModel2, "mesh_tree");
  });

  // ================= REALISTIC GRASS (grass_pack.glb, instanced) =================
  // Real modelled grass clumps, wild grass, daisies, dandelions and clovers
  // extracted from the downloaded grass pack. Every type is scattered as an
  // InstancedMesh (one draw call per material) and swayed by a vertex-shader
  // wind so the whole meadow visibly moves.
  const windUniform = { value: 0 };
  const grassMatCache = new Map(); // source material uuid -> cheap wind material
  function windMaterialFor(srcMat) {
    let mat = grassMatCache.get(srcMat.uuid);
    if (mat) return mat;
    // rebuild as plain MeshStandardMaterial: the pack ships physical materials
    // (specular/ior) that cost too much for a full meadow
    mat = new THREE.MeshStandardMaterial({
      map: srcMat.map ?? null,
      color: srcMat.color?.clone() ?? new THREE.Color(0xffffff),
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.45
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windUniform;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uWindTime;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
{
  float windPhase = 0.0;
  #ifdef USE_INSTANCING
    windPhase = instanceMatrix[3][0] * 0.6 + instanceMatrix[3][2] * 0.9;
  #endif
  float windBend = pow(max(position.y, 0.0), 1.5); // geometry is height-normalized
  float windGust = sin(uWindTime * 1.7 + windPhase) + 0.45 * sin(uWindTime * 3.3 + windPhase * 1.6);
  transformed.x += windGust * windBend * 0.06;
  transformed.z += cos(uWindTime * 1.2 + windPhase) * windBend * 0.035;
}`);
    };
    grassMatCache.set(srcMat.uuid, mat);
    return mat;
  }

  // key = node name inside grass_pack.glb; h = world-height range;
  // counts = [desktop, mobile]; outer = keep away from the road (dry fringe)
  const GRASS_TYPES = [
    { key: "grass_tiny",    h: [0.32, 0.55], counts: [50, 15] },
    { key: "grass_med",     h: [0.5, 0.9],   counts: [25, 8] },
    { key: "grass_clump_a", h: [0.45, 0.8],  counts: [20, 6] },
    { key: "grass_clump_b", h: [0.55, 0.95], counts: [6, 2] },
    { key: "grass_wild",    h: [0.6, 1.0],   counts: [12, 4] },
    { key: "grass_duo",     h: [0.42, 0.75], counts: [20, 6] },
    { key: "grass_dry",     h: [0.5, 0.85],  counts: [12, 4], outer: true },
    { key: "daisies",       h: [0.3, 0.45],  counts: [8, 3] },
    { key: "dandelion",     h: [0.34, 0.5],  counts: [15, 5] },
    { key: "clover",        h: [0.22, 0.34], counts: [6, 2] },
  ];

  loader.load("/assets/grass_pack.glb", (gltf) => {
    const pack = gltf.scene;
    pack.updateMatrixWorld(true);
    for (const t of GRASS_TYPES) {
      const rootNode = pack.getObjectByName(t.key);
      if (!rootNode) continue;
      // bake every child mesh into root-local space
      const rootInv = new THREE.Matrix4().copy(rootNode.matrixWorld).invert();
      const prims = [];
      rootNode.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone()
          .applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld));
        prims.push({ geo, mat: windMaterialFor(o.material) });
      });
      if (!prims.length) continue;
      // normalize: base on the ground, unit height, centered — so instance
      // scale.y IS the world height and the wind shader sees y in 0..1
      const box = new THREE.Box3();
      for (const p of prims) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
      const size = box.getSize(new THREE.Vector3());
      const ctr = box.getCenter(new THREE.Vector3());
      const inv = 1 / Math.max(size.y, 0.001);
      for (const p of prims) {
        p.geo.translate(-ctr.x, -box.min.y, -ctr.z);
        p.geo.scale(inv, inv, inv);
      }
      // one shared set of instance transforms per type: lush verge near the
      // road plus scattered spread across the plains
      const count = isMobile ? t.counts[1] : t.counts[0];
      const mats4 = [];
      for (let i = 0; i < count; i++) {
        const spot = t.outer
          ? groundSpot(26, 6)
          : (Math.random() < 0.62 ? groundSpot(7, 0.5) : groundSpot(28, 6));
        if (!spot) continue;
        _gDummy.position.set(spot.x, -0.03, spot.z);
        _gDummy.rotation.y = Math.random() * Math.PI * 2;
        const hh = t.h[0] + Math.random() * (t.h[1] - t.h[0]);
        _gDummy.scale.set(hh * (0.8 + Math.random() * 0.55), hh, hh * (0.8 + Math.random() * 0.55));
        _gDummy.updateMatrix();
        mats4.push(_gDummy.matrix.clone());
      }
      for (const p of prims) {
        const im = new THREE.InstancedMesh(p.geo, p.mat, mats4.length);
        for (let i = 0; i < mats4.length; i++) im.setMatrixAt(i, mats4[i]);
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = false;
        im.receiveShadow = false;
        im.frustumCulled = false; // instances span the whole course
        scene.add(im);
      }
    }
    _gDummy.rotation.set(0, 0, 0);
    _gDummy.scale.set(1, 1, 1);
  });

  function prepareTreeModel(model, targetHeight) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 0.001);
    model.scale.multiplyScalar(targetHeight / height);
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.material) {
          o.material.roughness = Math.max(o.material.roughness ?? 0.8, 0.85);
        }
      }
    });
  }

  function replacePlaceholdersWithModel(model, type) {
    for (let i = 0; i < treePlaceholders.length; i++) {
      const p = treePlaceholders[i];
      if (p.userData.treeType === type) {
        const clone = model.clone();
        clone.position.copy(p.position);
        clone.rotation.copy(p.rotation);
        clone.scale.multiplyScalar(p.userData.scale ?? 1);
        scene.remove(p);
        scene.add(clone);
      }
    }
  }

  // Helper functions for procedural models
  function makeTree(type = "ginkgo") {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 1 }));
    trunk.position.y = 0.6; trunk.castShadow = true; g.add(trunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2c7a3f, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 - i * 0.15, 0), foliageMat);
      f.position.y = 1.2 + i * 0.5; f.castShadow = true; g.add(f);
    }
    g.userData.treeType = type;
    g.userData.scale = 1;
    treePlaceholders.push(g);
    return g;
  }
  function makeLamp() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.8, roughness: 0.4 }));
    pole.position.y = 2.2; pole.castShadow = true; g.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffcaa0, emissiveIntensity: 2 }));
    head.position.set(0.4, 4.3, 0); g.add(head);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4a })); arm.position.set(0.2, 4.4, 0); g.add(arm);
    const l = new THREE.PointLight(0xffcf9e, 6, 12); l.position.set(0.4, 4.2, 0); g.add(l);
    return g;
  }

  // ================= ROADSIDE GADGETS =================
  // Small neon props that decorate the verges: holographic arcade signs, hovering
  // delivery drones, cyber vending kiosks, glowing hydrants and bollards. The
  // moving ones register in `animatedProps` and are ticked from the render loop.
  const animatedProps = [];
  const neonMat  = (hex, i = 2.4) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: i, roughness: 0.35, metalness: 0.2 });
  const metalMat = () => new THREE.MeshStandardMaterial({ color: 0x262b36, metalness: 0.85, roughness: 0.35 });

  function createHoloTexture(colorHex, glyph) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#04060f"; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = "rgba(255,255,255,0.05)"; x.lineWidth = 1;
    for (let y = 6; y < 256; y += 8) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
    x.strokeStyle = colorHex; x.lineWidth = 10; x.shadowColor = colorHex; x.shadowBlur = 24;
    x.strokeRect(18, 18, 220, 220);
    x.shadowBlur = 32; x.fillStyle = "#ffffff"; x.font = "bold 118px sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(glyph, 128, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  function makeHoloSign(colorHex = "#00e0ff", glyph = "▶") {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 8), metalMat());
    pole.position.y = 1.3; pole.castShadow = true; g.add(pole);
    const holo = new THREE.Group(); holo.position.y = 3.05; g.add(holo);
    const tex = createHoloTexture(colorHex, glyph);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.15, transparent: true, opacity: 0.92, side: THREE.DoubleSide, roughness: 0.3 }));
    holo.add(panel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.03, 8, 4), neonMat(colorHex, 3.2));
    rim.rotation.z = Math.PI / 4; holo.add(rim);
    const holoLight = new THREE.PointLight(colorHex, 2.6, 8); holoLight.position.set(0, 0, 0.5); holo.add(holoLight);
    animatedProps.push({ obj: holo, kind: "holo", baseY: 3.05, phase: Math.random() * 6.28 });
    return g;
  }

  function makeDrone(colorHex = "#ff5c8a") {
    const g = new THREE.Group();
    const craft = new THREE.Group(); g.add(craft);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), metalMat());
    body.castShadow = true; craft.add(body);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), neonMat(colorHex, 4.5));
    glow.position.y = -0.09; craft.add(glow);
    const rotors = [];
    for (const [dx, dz] of [[0.24, 0.24], [-0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), metalMat());
      arm.position.set(dx, 0.02, dz); craft.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 12),
        new THREE.MeshStandardMaterial({ color: 0x0d0f14, transparent: true, opacity: 0.45 }));
      rotor.position.set(dx, 0.06, dz); craft.add(rotor); rotors.push(rotor);
    }
    // no PointLight here — the emissive belly glow is enough and keeps the
    // per-fragment light count down (drones move, so their light would be costly)
    animatedProps.push({ obj: craft, kind: "drone", baseY: 0, phase: Math.random() * 6.28, rotors, glow });
    return g;
  }

  function makeKiosk(colorHex = "#7a5cff") {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x161a24, metalness: 0.6, roughness: 0.4 }));
    body.position.y = 0.9; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const tex = createHoloTexture(colorHex, "⚡");
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.3 }));
    screen.position.set(0, 1.16, 0.31); g.add(screen);
    for (const yy of [0.06, 1.75]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.05, 0.64), neonMat(colorHex, 2.6));
      strip.position.y = yy; g.add(strip);
    }
    const light = new THREE.PointLight(colorHex, 2.4, 6); light.position.set(0, 1.4, 0.7); g.add(light);
    return g;
  }

  function makeHydrant(colorHex = "#ff5c8a") {
    const g = new THREE.Group(); const mat = neonMat(colorHex, 1.4);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 10), mat);
    body.position.y = 0.25; body.castShadow = true; g.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat); cap.position.y = 0.5; g.add(cap);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), mat);
      arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.16, 0.34, 0); g.add(arm);
    }
    return g;
  }

  function makeBollards(colorHex = "#00ffcc") {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x20242e, metalness: 0.7, roughness: 0.4 }));
      post.position.set(0, 0.25, i * 0.95); post.castShadow = true; g.add(post);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), neonMat(colorHex, 3));
      top.position.set(0, 0.51, i * 0.95); g.add(top);
    }
    return g;
  }

  // Helper to create beautiful glowing billboards with section details and icons
  function createBillboardTexture(index, colorHex) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#080a15");
    grad.addColorStop(0.5, "#0c0e1e");
    grad.addColorStop(1, "#15182e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Glowing border
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(15, 15, 482, 482);
    
    // Matrix grid background
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let x = 30; x < 512; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 30; y < 512; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }

    // Section specifics
    const sections = [
      { title: "01 PROJECTS", icon: "🎮" },
      { title: "02 CAREER", icon: "💼" },
      { title: "03 SKILLS", icon: "⚡" },
      { title: "04 RESEARCH", icon: "🧠" },
      { title: "05 CONTACT", icon: "✉️" }
    ];
    const sec = sections[index];

    // Draw icon (glowing)
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffffff";
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sec.icon, 256, 130);

    // Draw title
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorHex;
    ctx.font = "bold 32px 'Sora', sans-serif";
    ctx.fillText(sec.title, 256, 195);

    // Draw horizontal lines (representing details)
    ctx.shadowBlur = 5;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    
    const lineYStart = 250;
    const lineSpacing = 32;
    for (let i = 0; i < 7; i++) {
      const y = lineYStart + i * lineSpacing;
      const width = 180 + Math.random() * 160;
      const startX = 256 - width / 2;
      ctx.strokeStyle = i % 2 === 0 ? colorHex : "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width, y);
      ctx.stroke();
    }
    
    // Corner accent brackets
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(35, 70); ctx.lineTo(35, 35); ctx.lineTo(70, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(477, 70); ctx.lineTo(477, 35); ctx.lineTo(442, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, 442); ctx.lineTo(35, 477); ctx.lineTo(70, 477); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(477, 442); ctx.lineTo(477, 477); ctx.lineTo(442, 477); ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Generates realistic building facade textures: a grid of glass windows
  // (some warmly lit, others reflecting the sky) plus matching emissive and
  // roughness maps so glass panes get sharp environment reflections.
  function createFacadeTextures(cols, rows) {
    const CELL = 32;
    const W = cols * CELL, H = rows * CELL;
    const mapC = document.createElement("canvas"); mapC.width = W; mapC.height = H;
    const emiC = document.createElement("canvas"); emiC.width = W; emiC.height = H;
    const rouC = document.createElement("canvas"); rouC.width = W; rouC.height = H;
    const mc = mapC.getContext("2d"), ec = emiC.getContext("2d"), oc = rouC.getContext("2d");

    // concrete wall base with grime noise
    mc.fillStyle = "#262b38"; mc.fillRect(0, 0, W, H);
    for (let i = 0; i < (W * H) / 90; i++) {
      const g = 30 + Math.random() * 25;
      mc.fillStyle = `rgba(${g},${g},${g + 8},0.35)`;
      mc.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    ec.fillStyle = "#000000"; ec.fillRect(0, 0, W, H);          // walls emit nothing
    oc.fillStyle = "#e8e8e8"; oc.fillRect(0, 0, W, H);          // walls are rough

    const litColors = ["#ffd98a", "#ffe9b8", "#cfe4ff"];
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const x = cx * CELL + 6, y = cy * CELL + 6, w2 = CELL - 12, h2 = CELL - 10;
        // dark metal window frame
        mc.fillStyle = "#11131b";
        mc.fillRect(x - 2, y - 2, w2 + 4, h2 + 4);
        if (Math.random() < 0.28) {
          // warmly lit interior window
          const col = litColors[(Math.random() * litColors.length) | 0];
          const grd = mc.createLinearGradient(0, y, 0, y + h2);
          grd.addColorStop(0, col); grd.addColorStop(1, "#8a6a3a");
          mc.fillStyle = grd; mc.fillRect(x, y, w2, h2);
          ec.fillStyle = col; ec.fillRect(x, y, w2, h2);
        } else {
          // dark blue glass with vertical sky-reflection gradient
          const grd = mc.createLinearGradient(0, y, 0, y + h2);
          grd.addColorStop(0, "#3a4f6e"); grd.addColorStop(0.5, "#1c2637"); grd.addColorStop(1, "#101623");
          mc.fillStyle = grd; mc.fillRect(x, y, w2, h2);
        }
        // glass is smooth => dark on roughness map => strong reflections
        oc.fillStyle = "#282828"; oc.fillRect(x, y, w2, h2);
        // centre mullion divider
        mc.fillStyle = "rgba(10,12,18,0.8)";
        mc.fillRect(x + w2 / 2 - 1, y, 2, h2);
      }
    }

    const map = new THREE.CanvasTexture(mapC); map.colorSpace = THREE.SRGBColorSpace;
    const emissiveMap = new THREE.CanvasTexture(emiC); emissiveMap.colorSpace = THREE.SRGBColorSpace;
    const roughnessMap = new THREE.CanvasTexture(rouC);
    return { map, emissiveMap, roughnessMap };
  }

  function makeBuilding(isMain = false, mainIndex = 0) {
    const h = isMain ? 12 : 6 + Math.random() * 10;
    const w = isMain ? 8 : 3 + Math.random() * 4;
    const d = isMain ? 8 : w;
    const geo = new THREE.BoxGeometry(w, h, d);
    const col = new THREE.Color().setHSL(0.62 + Math.random() * 0.1, 0.25, 0.14 + Math.random() * 0.08);

    // Glass curtain-wall facade: window grid texture + emissive lit windows +
    // roughness map so the glass panes reflect the environment realistically.
    const cols = Math.max(3, Math.round(w * 1.1));
    const rows = Math.max(4, Math.round(h * 0.9));
    const fac = createFacadeTextures(cols, rows);
    const wallMat = new THREE.MeshStandardMaterial({
      map: fac.map,
      emissiveMap: fac.emissiveMap,
      emissive: 0xffffff,
      emissiveIntensity: isMain ? 1.1 : 0.85,
      roughnessMap: fac.roughnessMap,
      roughness: 1,
      metalness: 0.45,
      envMapIntensity: 1.4
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.6), roughness: 0.95 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const b = new THREE.Mesh(geo, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    b.position.y = h / 2; b.castShadow = true; b.receiveShadow = true;

    // Add roof detail (AC units, penthouse boxes)
    const roofDetailGeo = new THREE.BoxGeometry(w * 0.4, 0.8, d * 0.4);
    const roofDetail = new THREE.Mesh(roofDetailGeo, roofMat);
    roofDetail.position.set(0, h/2 + 0.4, 0);
    b.add(roofDetail);

    // Add Antenna with flashing red beacon
    if (Math.random() < 0.7) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8), darkMat);
      ant.position.set((Math.random() - 0.5) * (w - 1), h/2 + 0.9, (Math.random() - 0.5) * (d - 1));
      b.add(ant);
      
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      beacon.position.set(ant.position.x, h/2 + 1.8, ant.position.z);
      if (!window.__beacons) window.__beacons = [];
      window.__beacons.push(beacon);
      b.add(beacon);
    }
    
    // Add a glowing "poster" screen with details to the main buildings
    if (isMain) {
      const colors = ["#00e0ff", "#7a5cff", "#ff5c8a", "#00ffcc", "#ffbe1a"];
      const canvasTex = createBillboardTexture(mainIndex, colors[mainIndex]);
      const screenMat = new THREE.MeshStandardMaterial({ 
        map: canvasTex, 
        emissiveMap: canvasTex,
        emissive: new THREE.Color(0xffffff), 
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.8
      });
      const screenGeo = new THREE.PlaneGeometry(5.2, 5.2);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, h/2 - 0.5, d/2 + 0.02);
      b.add(screen);
    }
    
    return b;
  }

  // Fixed, lighter scenery. Trees are kept off the road and normalized to a consistent height.
  const sceneryRows = [
    { z: -8, side: -1, kind: "lamp" },
    { z: -18, side: 1, kind: "tree", type: "mesh_tree", scale: 0.95 },
    { z: -36, side: -1, kind: "tree", type: "ginkgo", scale: 0.9 },
    { z: -58, side: 1, kind: "building" },
    { z: -78, side: -1, kind: "tree", type: "mesh_tree", scale: 1.0 },
    { z: -102, side: 1, kind: "tree", type: "ginkgo", scale: 0.88 },
    { z: -126, side: -1, kind: "lamp" },
    { z: -148, side: 1, kind: "tree", type: "mesh_tree", scale: 0.96 },
    { z: -172, side: -1, kind: "building" },
    { z: -198, side: 1, kind: "tree", type: "ginkgo", scale: 0.92 },
    { z: -226, side: -1, kind: "tree", type: "mesh_tree", scale: 0.95 },
  ];

  for (const row of sceneryRows) {
    let obj;
    if (row.kind === "tree") {
      obj = makeTree(row.type);
      obj.userData.scale = row.scale;
      obj.position.x = roadX(row.z) + row.side * 10.5;
    } else if (row.kind === "lamp") {
      obj = makeLamp();
      obj.position.x = roadX(row.z) + row.side * 6.2;
    } else {
      obj = makeBuilding(false, 0);
      obj.position.x = roadX(row.z) + row.side * 24;
    }
    obj.position.z = row.z;
    obj.rotation.y = row.side < 0 ? Math.PI * 0.08 : -Math.PI * 0.08;
    scene.add(obj);
  }

  // Generate the 5 Main Fixed Buildings for the sections
  // Alternating: Left, Right, Left, Right, Left — offset from the curved road
  const stopPointsZ = [-30, -70, -110, -150, -190];
  const buildingSide = [-1, 1, -1, 1, -1];
  const sectionGatePos = []; // entry gates — app.js opens a panel when the bike reaches one

  for(let i = 0; i < 5; i++) {
    const bx = roadX(stopPointsZ[i]) + buildingSide[i] * 14;
    const building = makeBuilding(true, i);
    building.position.set(bx, 0, stopPointsZ[i]);
    building.rotation.y = buildingSide[i] < 0 ? Math.PI/8 : -Math.PI/8;
    scene.add(building);

    // Add a spotlight illuminating the building in section-specific neon colors
    const colors = [0x00e0ff, 0x7a5cff, 0xff5c8a, 0x00ffcc, 0xffbe1a];
    const spot = new THREE.SpotLight(colors[i], 20, 35, Math.PI/3, 0.5, 1);
    spot.position.set(roadX(stopPointsZ[i] + 8) + buildingSide[i] * 5.6, 12, stopPointsZ[i] + 8);
    spot.target = building;
    scene.add(spot);

    // glowing entry gate on the verge in front of each building: the player
    // "enters" the section by riding through/near it (proximity handled in app.js)
    const gate = new THREE.Group();
    const gateColor = colors[i];
    const gz = stopPointsZ[i] + 4;
    const gx = roadX(gz) + buildingSide[i] * (ROAD_HALF_W + 1.6);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 8), metalMatGate());
      post.position.set(s * 1.7, 1.6, 0); post.castShadow = true; gate.add(post);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10),
        new THREE.MeshStandardMaterial({ color: gateColor, emissive: gateColor, emissiveIntensity: 3, roughness: 0.3 }));
      orb.position.set(s * 1.7, 3.3, 0); gate.add(orb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.22),
      new THREE.MeshStandardMaterial({ color: gateColor, emissive: gateColor, emissiveIntensity: 2.2, roughness: 0.3 }));
    lintel.position.y = 3.35; gate.add(lintel);
    gate.position.set(gx, 0, gz);
    gate.lookAt(roadX(gz), 0, gz);
    scene.add(gate);
    sectionGatePos.push({ x: gx, z: gz });
  }
  function metalMatGate() {
    return new THREE.MeshStandardMaterial({ color: 0x262b36, metalness: 0.85, roughness: 0.35 });
  }

  // Scatter neon gadgets along the verges to bring the roadside to life.
  const gadgetRows = [
    { z: -13,  side:  1, kind: "holo",     color: "#00e0ff", glyph: "▶" },
    { z: -22,  side: -1, kind: "drone",    color: "#ff5c8a" },
    { z: -44,  side:  1, kind: "kiosk",    color: "#7a5cff" },
    { z: -50,  side: -1, kind: "bollards", color: "#00ffcc" },
    { z: -60,  side:  1, kind: "hydrant",  color: "#ff5c8a" },
    { z: -88,  side: -1, kind: "holo",     color: "#00ffcc", glyph: "✦" },
    { z: -98,  side:  1, kind: "drone",    color: "#00e0ff" },
    { z: -118, side: -1, kind: "kiosk",    color: "#ff5c8a" },
    { z: -134, side:  1, kind: "holo",     color: "#ffbe1a", glyph: "★" },
    { z: -158, side: -1, kind: "hydrant",  color: "#00e0ff" },
    { z: -176, side:  1, kind: "bollards", color: "#7a5cff" },
    { z: -202, side: -1, kind: "drone",    color: "#ffbe1a" },
  ];
  for (const row of gadgetRows) {
    let obj, x = row.side * 6.4, y = 0;
    if (row.kind === "holo")          { obj = makeHoloSign(row.color, row.glyph); }
    else if (row.kind === "drone")    { obj = makeDrone(row.color); y = 3.3; x = row.side * 5.2; }
    else if (row.kind === "kiosk")    { obj = makeKiosk(row.color); x = row.side * 6.6; }
    else if (row.kind === "hydrant")  { obj = makeHydrant(row.color); x = row.side * 5.4; }
    else                              { obj = makeBollards(row.color); x = row.side * 4.7; }
    obj.position.set(roadX(row.z) + x, y, row.z);
    obj.rotation.y = row.side < 0 ? Math.PI * 0.16 : -Math.PI * 0.16;
    scene.add(obj);
  }

  // ================= BICYCLE + RIDER =================
  const bike = new THREE.Group();
  bike.position.set(-1.2, 0, 0); // Start near the origin
  bike.scale.setScalar(0.7);     // Made smaller to see character better
  scene.add(bike);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x00e0ff, metalness: 0.9, roughness: 0.22 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.85, metalness: 0 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e6, metalness: 1, roughness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a06b, roughness: 0.7 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7a5cff, roughness: 0.6, metalness: 0.05 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xff5c8a, roughness: 0.4, metalness: 0.2 });

  const WHEEL_R = 0.62;
  function tube(a, b, r = 0.045, mat = frameMat) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
    m.castShadow = true;
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    return m;
  }
  function makeWheel() {
    const g = new THREE.Group();
    const spinner = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, 0.06, 12, 40), rubberMat);
    tire.castShadow = true; spinner.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R - 0.05, 0.02, 8, 40), spokeMat);
    spinner.add(rim);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, (WHEEL_R - 0.06) * 2, 4), spokeMat);
      s.rotation.z = (i / 12) * Math.PI * 2; spinner.add(s);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), darkMat);
    hub.rotation.x = Math.PI / 2; spinner.add(hub); 
    g.add(spinner);
    g.rotation.y = Math.PI / 2;    
    g.userData.spinner = spinner;  
    return g;
  }

  const rearZ = 0.55, frontZ = -0.55, axleY = WHEEL_R;
  const wheelR = makeWheel(); wheelR.position.set(0, axleY, rearZ); bike.add(wheelR);
  const wheelF = makeWheel(); wheelF.position.set(0, axleY, frontZ); bike.add(wheelF);

  const BB = [0, WHEEL_R - 0.16, 0.05];             
  const seatTop = [0, WHEEL_R + 0.62, 0.42];
  const headTop = [0, WHEEL_R + 0.5, -0.5];
  const barPos = [0, WHEEL_R + 0.55, -0.62];
  bike.add(tube([0, axleY, rearZ], seatTop));                 
  bike.add(tube([0, axleY, rearZ], BB));                      
  bike.add(tube(BB, seatTop));                                
  bike.add(tube(BB, headTop));                                
  bike.add(tube(seatTop, headTop));                           
  bike.add(tube([0, axleY, frontZ], headTop));                
  bike.add(tube(headTop, barPos, 0.03, darkMat));             
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), darkMat);
  bar.position.set(0, barPos[1], barPos[2]); bike.add(bar);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.28), darkMat);
  seat.position.set(0, seatTop[1] + 0.05, seatTop[2]); seat.castShadow = true; bike.add(seat);

  const crank = new THREE.Group(); crank.position.set(0, BB[1], BB[2]); bike.add(crank);
  const CRANK_R = 0.17;
  const pedalGeo = new THREE.BoxGeometry(0.16, 0.04, 0.1);
  const pedalA = new THREE.Mesh(pedalGeo, darkMat);
  const pedalB = new THREE.Mesh(pedalGeo, darkMat);
  const armA = new THREE.Mesh(new THREE.BoxGeometry(0.03, CRANK_R, 0.03), spokeMat);
  const armB = new THREE.Mesh(new THREE.BoxGeometry(0.03, CRANK_R, 0.03), spokeMat);
  armA.position.y = CRANK_R / 2; pedalA.position.y = CRANK_R;
  armB.position.y = CRANK_R / 2; pedalB.position.y = CRANK_R;
  const crankArmA = new THREE.Group(); crankArmA.add(armA, pedalA);
  const crankArmB = new THREE.Group(); crankArmB.add(armB, pedalB); crankArmB.rotation.z = Math.PI;
  crankArmA.position.x = 0.09; crankArmB.position.x = -0.09;
  crank.add(crankArmA, crankArmB);
  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16), spokeMat);
  chainring.rotation.z = Math.PI / 2; crank.add(chainring);

  const rider = new THREE.Group(); bike.add(rider);
  const hip = new THREE.Vector3(0, WHEEL_R + 0.34, 0.28);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 6, 12), clothMat);
  torso.position.set(0, hip.y + 0.32, hip.z - 0.14);
  torso.rotation.x = -0.55; torso.castShadow = true; rider.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
  head.position.set(0, hip.y + 0.72, hip.z - 0.34); head.castShadow = true; rider.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
  helmet.position.copy(head.position); helmet.position.y += 0.02; rider.add(helmet);
  
  function limbCyl(mat, r = 0.05) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat); m.castShadow = true; return m;
  }
  function orient(mesh, from, to) {
    const len = from.distanceTo(to);
    mesh.scale.set(1, len, 1);
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  }
  const leftArm = limbCyl(clothMat, 0.045); rider.add(leftArm);
  const rightArm = limbCyl(clothMat, 0.045); rider.add(rightArm);
  orient(leftArm, new THREE.Vector3(-0.16, hip.y + 0.5, hip.z - 0.22), new THREE.Vector3(-0.16 * 1.4, barPos[1], barPos[2]));
  orient(rightArm, new THREE.Vector3(0.16, hip.y + 0.5, hip.z - 0.22), new THREE.Vector3(0.16 * 1.4, barPos[1], barPos[2]));
  const THIGH = 0.34, SHIN = 0.36;
  const legs = [
    { thigh: limbCyl(clothMat, 0.055), shin: limbCyl(skinMat, 0.045), phase: 0,        xOff: 0.11 },
    { thigh: limbCyl(clothMat, 0.055), shin: limbCyl(skinMat, 0.045), phase: Math.PI,  xOff: -0.11 },
  ];
  legs.forEach(l => rider.add(l.thigh, l.shin));
  function solveLeg(leg, pedalWorldY, pedalWorldZ) {
    const x = leg.xOff;
    const h = new THREE.Vector3(x, hip.y, hip.z);
    const f = new THREE.Vector3(x, pedalWorldY, pedalWorldZ);
    let d = h.distanceTo(f);
    d = Math.min(d, THIGH + SHIN - 0.001);
    d = Math.max(d, Math.abs(THIGH - SHIN) + 0.001);
    const base = Math.atan2(f.y - h.y, f.z - h.z);       
    const cosK = (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d);
    const thighAng = base - Math.acos(THREE.MathUtils.clamp(cosK, -1, 1));
    const knee = new THREE.Vector3(x,
      h.y + Math.sin(thighAng) * THIGH,
      h.z + Math.cos(thighAng) * THIGH);
    orient(leg.thigh, h, knee);
    orient(leg.shin, knee, f);
  }

  // ---- GLB attachment state ----
  // References into the loaded GLB models so wheels/cranks spin with speed and
  // the driver's hands stay pinned to the handlebar / feet to the pedals.
  let glbSpin = null;   // { wheels: [{node, base}], cranks: [{node, base}] }
  let driverIK = null;  // { armL, armR, legL, legR } bone chains (shoulder→hand, thigh→foot)

  // Real attachment points measured from the VISIBLE glb bicycle (bike-local space).
  // These replace the old hard-coded procedural coordinates so the rider's hands
  // and feet lock onto the geometry the player actually sees.
  let gripLAnchor = null, gripRAnchor = null;  // handlebar grips (THREE.Vector3, bike-local)
  let crankPivot = null;                        // spins the glb crank + pedals about the true bottom bracket
  const pedalTargets = { L: null, R: null };    // { node, localCenter } live-tracked pedal centres for foot IK

  // Small CCD IK solver: rotates the bones of a chain so the end bone (hand or
  // foot) reaches a world-space target (handlebar grip / pedal position).
  const _ikV1 = new THREE.Vector3(), _ikV2 = new THREE.Vector3(), _ikV3 = new THREE.Vector3();
  const _ikQ1 = new THREE.Quaternion(), _ikQ2 = new THREE.Quaternion(), _ikQ3 = new THREE.Quaternion();
  const _ikTargetA = new THREE.Vector3(), _ikTargetB = new THREE.Vector3();
  function solveCCD(chain, target, iterations = 5) {
    const effector = chain[chain.length - 1];
    for (let it = 0; it < iterations; it++) {
      for (let i = chain.length - 2; i >= 0; i--) {
        const bone = chain[i];
        effector.getWorldPosition(_ikV1);
        bone.getWorldPosition(_ikV2);
        _ikV1.sub(_ikV2);
        _ikV3.copy(target).sub(_ikV2);
        if (_ikV1.lengthSq() < 1e-10 || _ikV3.lengthSq() < 1e-10) continue;
        _ikQ1.setFromUnitVectors(_ikV1.normalize(), _ikV3.normalize());
        bone.getWorldQuaternion(_ikQ2);
        _ikQ2.premultiply(_ikQ1);                    // desired world rotation
        bone.parent.getWorldQuaternion(_ikQ3);
        bone.quaternion.copy(_ikQ3.invert()).multiply(_ikQ2); // back to local space
        bone.updateMatrixWorld(true);
      }
    }
  }

  // Optional GLB drop-in
  if (MODEL_URL) {
    loader.load(MODEL_URL, (gltf) => {
      const m = gltf.scene;
      m.scale.setScalar(MODEL_SCALE);
      m.position.y += MODEL_Y;
      m.rotation.y = Math.PI; // Rotate 180 degrees to face forward down the road
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

      // Find wheel / crank / pedal nodes inside the GLB so we can spin them in
      // sync with riding speed (works even if the GLB has no baked animation).
      const wheelNodes = [], crankNodes = [];
      m.traverse(o => {
        const n = (o.name || "").toLowerCase();
        if (/wheel|tyre|tire|rim/.test(n)) wheelNodes.push(o);
        else if (/crank|pedal|sprocket|chainring/.test(n)) crankNodes.push(o);
      });
      // keep only top-most matches to avoid double-rotating nested children
      const topMost = arr => arr.filter(o => !arr.some(p => p !== o && p.getObjectById(o.id)));
      glbSpin = {
        wheels: topMost(wheelNodes).map(o => ({ node: o, base: o.rotation.x })),
        cranks: topMost(crankNodes).map(o => ({ node: o, base: o.rotation.x }))
      };
      
      // Hide procedural bike parts, but keep the rider visible
      bike.children.forEach(c => {
        if (c !== rider) {
          c.visible = false;
        } else {
          c.visible = true;
        }
      });

      // Add the GLB bicycle to the bike group first, update matrix, then measure it
      bike.add(m);
      m.updateMatrixWorld(true);

      // ---- Measure the REAL bike so the rider attaches to visible geometry ----
      // The glb parts are cleanly named (Handle / Seat / Pedalier / Pedal_Left /
      // Pedal_Right). We read their world bounding boxes and convert to bike-local
      // space to get exact grip / saddle / bottom-bracket anchors.
      const _box = new THREE.Box3(), _bc = new THREE.Vector3();
      const partByName = (...keys) => {
        let hit = null;
        m.traverse(o => {
          if (hit || !o.name) return;
          const n = o.name.toLowerCase();
          if (keys.some(k => n.includes(k))) hit = o;
        });
        return hit;
      };
      const localBoxOf = (node) => {
        if (!node) return null;
        _box.setFromObject(node);
        const lo = bike.worldToLocal(_box.min.clone());
        const hi = bike.worldToLocal(_box.max.clone());
        return {
          min: new THREE.Vector3(Math.min(lo.x, hi.x), Math.min(lo.y, hi.y), Math.min(lo.z, hi.z)),
          max: new THREE.Vector3(Math.max(lo.x, hi.x), Math.max(lo.y, hi.y), Math.max(lo.z, hi.z)),
        };
      };
      const localCenterOf = (node) => {
        const b = localBoxOf(node);
        return b ? b.min.clone().add(b.max).multiplyScalar(0.5) : null;
      };

      const handleNode = partByName("handle");
      const seatNode   = partByName("seat", "saddle");
      const crankNode  = partByName("pedalier", "crank", "bottom");
      const pedalLNode = m.getObjectByName("Pedal_Left")  || partByName("pedal_l");
      const pedalRNode = m.getObjectByName("Pedal_Right") || partByName("pedal_r");

      // Handlebar grips: the two X-ends of the handle bar, near its top, mid-depth.
      const hb = localBoxOf(handleNode);
      if (hb) {
        const gy = hb.max.y - (hb.max.y - hb.min.y) * HAND_GRIP_DROP - HAND_GRIP_LOWER;
        const gz = hb.min.z + (hb.max.z - hb.min.z) * HAND_GRIP_BACK - HAND_GRIP_FWD;
        const inset = (hb.max.x - hb.min.x) * HAND_GRIP_INSET;
        gripLAnchor = new THREE.Vector3(hb.min.x + inset, gy, gz);
        gripRAnchor = new THREE.Vector3(hb.max.x - inset, gy, gz);
      } else {
        // fall back to the old procedural handlebar if the glb changes
        gripLAnchor = new THREE.Vector3(-0.23, barPos[1] + 0.02, barPos[2] + 0.04);
        gripRAnchor = new THREE.Vector3( 0.23, barPos[1] + 0.02, barPos[2] + 0.04);
      }

      // ---- Crank pivot: reparent the crank + pedals under a group at the true
      // bottom bracket so they orbit correctly, and the feet can track them. ----
      const crankCenter = localCenterOf(crankNode);
      if (crankCenter && (pedalLNode || pedalRNode)) {
        crankPivot = new THREE.Group();
        crankPivot.position.copy(crankCenter);
        bike.add(crankPivot);
        bike.updateMatrixWorld(true);
        if (crankNode) crankPivot.attach(crankNode);          // crank arms spin with the pivot
        const capture = (node, slot) => {
          if (!node) return;
          crankPivot.attach(node);                            // preserves world transform
          _box.setFromObject(node); _box.getCenter(_bc);
          pedalTargets[slot] = { node, localCenter: node.worldToLocal(_bc.clone()) };
        };
        // driver's LEFT foot is on -X in bike space -> that's Pedal_Left here
        capture(pedalLNode, "L");
        capture(pedalRNode, "R");
        // the old per-node crank spin is now handled by the pivot instead
        if (glbSpin) glbSpin.cranks = [];
      }

      // Load custom driver character
      loader.load("/assets/driver.glb", (driverGltf) => {
        const mDriver = driverGltf.scene;

        // Hide the procedural rider completely since we now have the 3D character!
        rider.visible = false;

        mDriver.scale.setScalar(DRIVER_SCALE);
        mDriver.position.set(0, -0.02, -0.08);
        mDriver.rotation.y = Math.PI; // Face forward down the road

        mDriver.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.frustumCulled = false; // skinned mesh: keep visible while bones move it
          }
        });

        bike.add(mDriver);
        mDriver.updateMatrixWorld(true);

        // ---- Rig attachment ----
        // Locate hand and foot bones in the character rig, then build 3-bone
        // chains (arm→forearm→hand, thigh→shin→foot) that IK toward the
        // handlebar grips and pedals every frame.
        const bones = [];
        mDriver.traverse(o => { if (o.isBone) bones.push(o); });
        const byName = (name) => bones.find(b => b.name.toLowerCase() === name.toLowerCase()) || null;
        const fuzzyEnd = (kw, side) => bones.find(b => {
          const n = b.name.toLowerCase();
          if (!n.includes(kw)) return false;
          return side === "L" ? /left|(^|[^a-z])l([^a-z]|$)/.test(n)
                              : /right|(^|[^a-z])r([^a-z]|$)/.test(n);
        }) || null;
        const endBone = (exact, kw, side) => byName(exact) || fuzzyEnd(kw, side);
        const chainOf = (end) => {
          if (!end) return null;
          const c = [end];
          let bn = end;
          for (let i = 1; i < 3 && bn.parent && bn.parent.isBone; i++) { bn = bn.parent; c.unshift(bn); }
          return c.length >= 2 ? c : null;
        };
        driverIK = {
          armL: chainOf(endBone("LeftHand", "hand", "L")),
          armR: chainOf(endBone("RightHand", "hand", "R")),
          legL: chainOf(endBone("LeftFoot", "foot", "L")),
          legR: chainOf(endBone("RightFoot", "foot", "R"))
        };
        if (!driverIK.armL && !driverIK.legL) {
          driverIK = null; // static mesh without a skeleton — nothing to attach
          console.warn("driver.glb has no hand/foot bones; skipping IK attachment");
        }

        // ---- Seat the rider: lean the spine forward and drop the hips onto the
        // saddle so the arms can actually reach the bars and the legs the pedals.
        const spine = ["Spine", "Spine1", "Spine2"].map(byName).filter(Boolean);
        if (spine.length) {
          const per = DRIVER_LEAN / spine.length;
          spine.forEach(b => { b.rotation.x += per; });
        }
        const neck = byName("Neck");
        if (neck) neck.rotation.x -= NECK_LIFT;

        // Curl the fingers into a relaxed grip so the hands read as holding the
        // bar (left/right are mirrored, so the curl axis flips per side).
        bones.forEach(b => {
          const n = b.name.toLowerCase();
          if (!n.includes("hand")) return;
          const s = n.includes("left") ? 1 : -1;
          const seg = n.match(/(index|middle|ring|pinky)([1-3])$/);
          if (seg) b.rotation.z += s * GRIP_CURL;
          else if (/thumb[1-3]$/.test(n)) b.rotation.z -= s * GRIP_THUMB;
        });
        mDriver.updateMatrixWorld(true);

        const hips = byName("Hips");
        const seatBox = localBoxOf(seatNode);
        if (hips && seatBox) {
          const hw = new THREE.Vector3(); hips.getWorldPosition(hw);
          const hl = bike.worldToLocal(hw.clone());
          mDriver.position.y += (seatBox.max.y - SEAT_SINK) - hl.y;
          mDriver.position.z += (seatBox.min.z + seatBox.max.z) * 0.5 - hl.z;
          mDriver.updateMatrixWorld(true);
        }
        // remember the placed pose so the per-frame bob starts from here
        mDriver.userData.baseY = mDriver.position.y;
        mDriver.userData.baseZ = mDriver.position.z;

        window.__driverModel = {
          scene: mDriver,
          mixer: driverGltf.animations.length ? new THREE.AnimationMixer(mDriver) : null,
          clip: driverGltf.animations[0] || null
        };
        if (window.__driverModel.mixer) {
          window.__driverModel.mixer.clipAction(window.__driverModel.clip).play();
        }
      }, undefined, (err) => {
        console.error("Error loading driver model:", err);
      });

      window.__bikeModel = { scene: m, mixer: gltf.animations.length ? new THREE.AnimationMixer(m) : null,
        clip: gltf.animations[0] };
      if (window.__bikeModel.mixer) window.__bikeModel.mixer.clipAction(window.__bikeModel.clip).play();
    }, undefined, (err) => { console.error("Error loading model:", err); });
  }

  // ================= EXPOSED API FOR APP.JS =================
  let currentBikeZ = 0;
  let pedalAngle = 0;
  let lastBikeZ = 0;
  let lastSpeed = 0;

  // Called every frame by the external system to set bike position
  // It handles all the pedaling animations automatically.
  function setDistance(z, speedDelta) {
    currentBikeZ = z;
    lastSpeed = speedDelta;
    
    // speedDelta is negative if moving backwards (Z increases)
    // we use it to calculate pedal rotation and bobbing.
    // distance traveled in local units:
    const distTraveled = lastBikeZ - currentBikeZ; // positive when going forward
    lastBikeZ = currentBikeZ;

    // wheels + crank
    const wheelSpin = (currentBikeZ / WHEEL_R); 
    wheelR.userData.spinner.rotation.z = wheelSpin;
    wheelF.userData.spinner.rotation.z = wheelSpin;
    
    pedalAngle = (currentBikeZ / WHEEL_R) * 0.5;
    crank.rotation.x = pedalAngle;

    // spin the GLB bicycle's wheels and crank in sync with distance traveled,
    // so they only rotate while actually driving
    if (glbSpin) {
      for (const wnode of glbSpin.wheels) wnode.node.rotation.x = wnode.base + wheelSpin;
      for (const cnode of glbSpin.cranks) cnode.node.rotation.x = cnode.base + pedalAngle;
    }

    // pedals world position -> legs IK
    for (const leg of legs) {
      const a = pedalAngle + leg.phase;
      const py = BB[1] + Math.cos(a) * CRANK_R;
      const pz = BB[2] + Math.sin(a) * CRANK_R;
      solveLeg(leg, py, pz);
    }
  }

  let isPaused = false;
  let hasRenderedOnce = false;

  // Gather all local PointLights and SpotLights for dynamic visibility optimization
  const lightTracker = [];
  scene.traverse(o => {
    if (o.isPointLight || o.isSpotLight) {
      const worldPos = new THREE.Vector3();
      o.getWorldPosition(worldPos);
      lightTracker.push({
        light: o,
        z: worldPos.z
      });
    }
  });

  // ================= RENDER LOOP =================
  const clock = new THREE.Clock();
  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    if (isPaused && hasRenderedOnce) return;

    // Only enable lights that are close to the bike to save GPU fragment shader processing
    for (let i = 0; i < lightTracker.length; i++) {
      const item = lightTracker[i];
      const dist = Math.abs(item.z - currentBikeZ);
      item.light.visible = dist < 50;
    }

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    
    // Blinking beacons
    if (window.__beacons) {
      const blink = Math.sin(elapsed * 8) > 0;
      for (const b of window.__beacons) {
        b.visible = blink;
      }
    }

    // River flow: scroll every river's water texture along its stream, and
    // its ripple normal map slightly faster so the surface shimmers
    for (const t of waterTextures) t.offset.y = elapsed * 0.12;
    for (const wn of waterNormals) {
      wn.tex.offset.y = elapsed * 0.22 * wn.speed;
      wn.tex.offset.x = Math.sin(elapsed * 0.35) * 0.05;
    }

    // meadow wind
    windUniform.value = elapsed;

    // clouds drift sideways and wrap around the course
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > roadX(c.userData.baseZ) + 170) c.position.x = roadX(c.userData.baseZ) - 170;
    }

    // birds circle, bob and flap
    for (const b of birds) {
      const a = elapsed * b.sp * 6.3 + b.ph;
      const dx = -Math.sin(a) * Math.sign(b.sp), dz = Math.cos(a) * Math.sign(b.sp);
      b.g.position.set(
        b.cx + Math.cos(a) * b.r,
        b.y + Math.sin(elapsed * 0.7 + b.ph) * 1.2,
        b.cz + Math.sin(a) * b.r
      );
      b.g.rotation.y = Math.atan2(dx, dz);
      const w = Math.sin(elapsed * b.flap + b.ph) * 0.55;
      b.wl.rotation.z = w;
      b.wr.rotation.z = -w;
    }

    // Roadside gadgets: holo signs sway + bob, drones hover + spin rotors + blink
    for (const p of animatedProps) {
      if (p.kind === "holo") {
        p.obj.rotation.y = Math.sin(elapsed * 0.8 + p.phase) * 0.4;
        p.obj.position.y = p.baseY + Math.sin(elapsed * 1.6 + p.phase) * 0.08;
      } else if (p.kind === "drone") {
        p.obj.position.y = p.baseY + Math.sin(elapsed * 2 + p.phase) * 0.18;
        p.obj.rotation.y = elapsed * 0.6 + p.phase;
        for (const r of p.rotors) r.rotation.y = elapsed * 40;
        p.glow.visible = Math.sin(elapsed * 10 + p.phase) > 0;
      }
    }
    
    // Baked animations play proportionally to actual riding speed:
    // fully stopped => frozen wheels/pedals, faster ride => faster animation.
    const rideAnim = Math.min(2.5, lastSpeed * 1.5);
    if (window.__bikeModel?.mixer) {
      window.__bikeModel.mixer.update(dt * rideAnim);
    }
    if (window.__driverModel?.mixer) {
      window.__driverModel.mixer.update(dt * rideAnim);
    }
    
    // Alive dynamic animation: bobbing, swaying and leaning forward based on pedaling and speed.
    // Starts from the placed base pose (hips-on-saddle) instead of a hard-coded height.
    if (window.__driverModel?.scene) {
      const d = window.__driverModel.scene;
      const bob = Math.sin(pedalAngle * 2) * 0.015;
      const sway = Math.cos(elapsed * 5) * 0.012 * Math.min(1, lastSpeed * 5);
      const lean = 0.04 * Math.min(1, lastSpeed * 5);

      d.position.y = (d.userData.baseY ?? -0.02) + bob;
      d.position.z = (d.userData.baseZ ?? -0.08);
      d.rotation.z = sway;
      d.rotation.x = lean;
    }
    
    // Apply position along the curved road: the bike rides its lane on the
    // centerline curve, steers to face the road's tangent and leans into turns
    bike.position.z = currentBikeZ;
    bike.position.x = roadX(currentBikeZ) + LANE_X;
    const aheadDX = roadX(currentBikeZ - 1) - roadX(currentBikeZ);
    bike.rotation.y = Math.atan2(-aheadDX, 1);
    const curv = roadX(currentBikeZ - 2) - 2 * roadX(currentBikeZ - 1) + roadX(currentBikeZ);
    bike.rotation.z = THREE.MathUtils.clamp(-curv * 20, -0.15, 0.15) * Math.min(1, lastSpeed * 2);

    // ---- Pin the character to the bicycle ----
    // Runs after the mixer + bob/sway so it wins over the baked pose: hands stay
    // glued to the real handlebar grips and feet ride the actual pedals as the
    // crank rotates.
    if (crankPivot) crankPivot.rotation.x = pedalAngle;   // spin the visible crank + pedals
    if (driverIK) {
      bike.updateMatrixWorld(true);
      const ikIter = isMobile ? 2 : 4;
      // hands -> measured handlebar grips (bike-local -> world)
      if (driverIK.armL && gripLAnchor)
        solveCCD(driverIK.armL, bike.localToWorld(_ikTargetA.copy(gripLAnchor)), ikIter);
      if (driverIK.armR && gripRAnchor)
        solveCCD(driverIK.armR, bike.localToWorld(_ikTargetB.copy(gripRAnchor)), ikIter);
      // feet -> live world position of the actual pedal geometry, so they can
      // never drift off the pedals no matter how the crank is spinning
      if (driverIK.legL && pedalTargets.L)
        solveCCD(driverIK.legL, pedalTargets.L.node.localToWorld(_ikTargetA.copy(pedalTargets.L.localCenter)), ikIter);
      if (driverIK.legR && pedalTargets.R)
        solveCCD(driverIK.legR, pedalTargets.R.node.localToWorld(_ikTargetB.copy(pedalTargets.R.localCenter)), ikIter);
    }
    
    // Move sun with bike so shadows stay crisp
    sun.position.x = roadX(currentBikeZ) - 14;
    sun.position.z = currentBikeZ + 8;
    sun.target.position.set(roadX(currentBikeZ), 0, currentBikeZ);
    sun.target.updateMatrixWorld();

    // Camera follows the bike around the curves: it sits behind the bike on
    // the road curve and looks at where the road is heading, so left/right
    // turns read clearly on screen
    const camRoadX = roadX(currentBikeZ + camOffset.z);
    camera.position.z = currentBikeZ + camOffset.z;
    camera.position.x = camRoadX + camOffset.x;
    camera.position.y = camOffset.y;
    camera.lookAt(
      roadX(currentBikeZ + camLookOffset.z) + camLookOffset.x,
      camLookOffset.y,
      currentBikeZ + camLookOffset.z
    );

    renderer.render(scene, camera);
    if (isPaused) {
      hasRenderedOnce = true;
    }
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Distance from the bike (at depth z) to a section's entry gate — app.js
  // uses this to open a section panel only when the player actually arrives.
  // Lateral offset is damped so gates on the left and right verge trigger at
  // the same riding distance.
  function distanceToSection(index, z = currentBikeZ) {
    const g = sectionGatePos[index];
    if (!g) return Infinity;
    return Math.hypot((g.x - roadX(z)) * 0.4, g.z - z);
  }

  return {
    setDistance,
    distanceToSection,
    pause() { isPaused = true; clock.stop(); },
    resume() { isPaused = false; clock.start(); },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}
