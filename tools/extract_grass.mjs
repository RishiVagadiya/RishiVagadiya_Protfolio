// Extracts the lush summer grass + flower meshes from the downloaded 28MB
// grass asset-pack GLB, recenters them at the origin, strips the 5000+
// animations, simplifies geometry, shrinks textures to 512px WebP and writes
// a small assets/grass_pack.glb the portfolio can actually ship.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const SRC = 'C:/Users/rishi/Downloads/uploads_files_5772178_Grass.glb';
const OUT = fileURLToPath(new URL('../assets/grass_pack.glb', import.meta.url));

// clean key -> mesh name inside the pack
const KEEP = {
  grass_med:     'sc_grass_02_high.002',
  grass_tiny:    'sc_grass_tiny_01_high.002',
  grass_clump_a: 'sc_grass_clump_03_high',
  grass_clump_b: 'sc_grass_clump_02_high.002',
  grass_wild:    'sc_grass_wild_clump_02_high.002',
  grass_dry:     'sc_grass_dry_01_high',
  grass_duo:     'sc_grass_duo_02_high.002',
  daisies:       'sc_daisies_high',
  dandelion:     'sc_dandelion_01_high',
  clover:        'sc_clovers_01_high',
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);
const root = doc.getRoot();

// drop every baked animation (the pack ships thousands of per-blade sway clips)
for (const anim of root.listAnimations()) anim.dispose();

const scene = root.listScenes()[0];

// locate the node that renders each wanted mesh
const keepNodes = new Map();
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  for (const [key, meshName] of Object.entries(KEEP)) {
    if (mesh.getName() === meshName && !keepNodes.has(key)) keepNodes.set(key, node);
  }
}
const missing = Object.keys(KEEP).filter(k => !keepNodes.has(k));
if (missing.length) console.warn('MISSING:', missing.join(', '));

// re-root the kept nodes at the origin under clean names, drop everything else
for (const [key, node] of keepNodes) {
  node.setName(key);
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  scene.addChild(node); // re-parents to the scene root
}
const keepSet = new Set(keepNodes.values());
for (const child of scene.listChildren()) {
  if (!keepSet.has(child)) child.dispose();
}

await doc.transform(
  prune(),
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.24, error: 0.12 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
  quantize(),
  prune()
);

await io.write(OUT, doc);

// report
let totalVerts = 0;
for (const [key, node] of keepNodes) {
  const mesh = node.getMesh();
  let v = 0;
  for (const prim of mesh.listPrimitives()) v += prim.getAttribute('POSITION').getCount();
  totalVerts += v;
  console.log(`${key.padEnd(14)} ${v} verts, ${mesh.listPrimitives().length} prim(s)`);
}
console.log('total verts:', totalVerts);
console.log('written:', OUT);
