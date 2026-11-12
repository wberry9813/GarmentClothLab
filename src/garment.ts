import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './garment.css';

type Preset = 'tshirt' | 'cape';
type Anchor = { u: number; v: number };

const root = document.querySelector<HTMLDivElement>('#garment-app')!;
root.innerHTML = `
<header class="topbar"><div><div class="eyebrow">GARMENT CLOTH LAB / 02</div><h1>Garment Motion</h1></div><div class="status"><i></i> SILHOUETTE-AWARE · LOCAL PHYSICS</div></header>
<main class="layout"><section class="stage"><div class="stage-note"><span>LIVE GARMENT SIMULATION</span><span id="fps">60 FPS</span></div><div id="viewport"></div><div class="stage-hint">拖动物体施加外力 · 拖动空白区域旋转视角</div></section>
<aside class="panel">
<section><div class="section-label">GARMENT STRUCTURE</div><div class="preset-row">
<button class="preset active" data-preset="tshirt"><span class="swatch"></span><b>T-shirt</b><small>棉质 · 双肩锚点</small></button>
<button class="preset" data-preset="cape"><span class="swatch cape"></span><b>Cape</b><small>轻薄 · 三点悬挂</small></button>
</div><div id="mesh-status" class="mesh-status">轮廓网格：准备中</div></section>
<section><div class="section-label">YOUR GARMENT</div><label class="upload"><input id="upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><span>＋</span><div><b>导入服装图片</b><small>透明背景 PNG / WebP / SVG 效果最佳</small></div></label><div id="filename" class="filename">当前：演示白色棉质 T 恤</div></section>
<section><div class="section-label">FABRIC PHYSICS</div>
<label class="control"><span>风力 <output id="wind-value">0.35</output></span><input id="wind" type="range" min="0" max="2" step="0.01" value="0.35"></label>
<label class="control"><span>结构刚度 <output id="soft-value">0.72</output></span><input id="soft" type="range" min="0.2" max="1" step="0.01" value="0.72"></label>
<label class="control"><span>阻尼 <output id="damp-value">0.035</output></span><input id="damp" type="range" min="0.005" max="0.12" step="0.001" value="0.035"></label>
<label class="toggle"><input id="auto" type="checkbox" checked><span>持续微风</span></label></section>
<section class="actions"><button id="impulse" class="primary">施加轻风</button><button id="reset" class="secondary">重置悬挂</button></section>
<p class="disclaimer">V0.2：根据图片 Alpha 透明通道裁掉网格外区域，并按服装类型布置肩部 / 颈部锚点。仍未实现 AI 部件识别、裁片缝合、自碰撞；不透明背景图片会按矩形处理。</p>
</aside></main>
<footer>GarmentClothLab · Prototype 0.2 <span>Silhouette mesh + Verlet physics · Runs entirely in your browser</span></footer>`;

const viewport = document.querySelector<HTMLDivElement>('#viewport')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setClearColor('#eeeae4');
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, viewport.clientWidth / viewport.clientHeight, 0.1, 50);
camera.position.set(0, 0.1, 5.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minDistance = 3.7;
controls.maxDistance = 8;

scene.add(new THREE.HemisphereLight(0xffffff, 0xb2a99d, 2));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(-2, 3, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xd7c9ef, 1);
rim.position.set(3, 1, -2);
scene.add(rim);

const hanger = new THREE.Group();
const hangerPoints = [
  new THREE.Vector3(0, 1.82, 0.04), new THREE.Vector3(0, 2.0, 0.04),
  new THREE.Vector3(0, 2.0, 0.04), new THREE.Vector3(-0.12, 1.9, 0.04),
  new THREE.Vector3(-0.12, 1.9, 0.04), new THREE.Vector3(-0.72, 1.48, 0.04),
  new THREE.Vector3(-0.72, 1.48, 0.04), new THREE.Vector3(0, 1.3, 0.04),
  new THREE.Vector3(0, 1.3, 0.04), new THREE.Vector3(0.72, 1.48, 0.04),
  new THREE.Vector3(0.72, 1.48, 0.04), new THREE.Vector3(0.12, 1.9, 0.04),
  new THREE.Vector3(0.12, 1.9, 0.04), new THREE.Vector3(0, 2.0, 0.04),
];
hanger.add(new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(hangerPoints),
  new THREE.LineBasicMaterial({ color: 0x71685e }),
));
scene.add(hanger);

const cols = 43;
const rows = 55;
const count = cols * rows;
const clothWidth = 2.05;
const clothHeight = 2.55;
const topY = 1.75;
const positions = new Float32Array(count * 3);
const previous = new Float32Array(count * 3);
const uv: number[] = [];
const active = new Uint8Array(count).fill(1);
let triangleIndices: number[] = [];
let edgeA: number[] = [];
let edgeB: number[] = [];
let restLengths: number[] = [];
let edgeStrength: number[] = [];
const idx = (x: number, y: number) => y * cols + x;

function addConstraint(a: number, b: number, strength: number) {
  if (!active[a] || !active[b]) return;
  edgeA.push(a);
  edgeB.push(b);
  const ai = a * 3;
  const bi = b * 3;
  restLengths.push(Math.hypot(
    positions[bi] - positions[ai],
    positions[bi + 1] - positions[ai + 1],
    positions[bi + 2] - positions[ai + 2],
  ));
  edgeStrength.push(strength);
}

for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const i = idx(x, y);
    const u = x / (cols - 1);
    const v = y / (rows - 1);
    positions[i * 3] = (u - 0.5) * clothWidth;
    positions[i * 3 + 1] = topY - v * clothHeight;
    positions[i * 3 + 2] = 0.012 * Math.sin(u * 9) * Math.sin(v * 4);
    previous.set(positions.subarray(i * 3, i * 3 + 3), i * 3);
    uv.push(u, 1 - v);
  }
}

function buildTopology(image: HTMLImageElement | HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let opaque = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = x / (cols - 1);
      const v = y / (rows - 1);
      const px = Math.min(canvas.width - 1, Math.round(u * (canvas.width - 1)));
      const py = Math.min(canvas.height - 1, Math.round(v * (canvas.height - 1)));
      const alpha = pixels[(py * canvas.width + px) * 4 + 3];
      const isActive = alpha > 24;
      active[idx(x, y)] = isActive ? 1 : 0;
      if (isActive) opaque++;
    }
  }

  triangleIndices = [];
  edgeA = [];
  edgeB = [];
  restLengths = [];
  edgeStrength = [];

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const a = idx(x, y);
      const b = idx(x + 1, y);
      const c = idx(x, y + 1);
      const d = idx(x + 1, y + 1);
      if (active[a] && active[c] && active[b]) triangleIndices.push(a, c, b);
      if (active[b] && active[c] && active[d]) triangleIndices.push(b, c, d);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = idx(x, y);
      if (!active[a]) continue;
      if (x + 1 < cols) addConstraint(a, idx(x + 1, y), 1);
      if (y + 1 < rows) addConstraint(a, idx(x, y + 1), 1);
      if (x + 1 < cols && y + 1 < rows) {
        addConstraint(a, idx(x + 1, y + 1), 0.78);
        addConstraint(idx(x + 1, y), idx(x, y + 1), 0.78);
      }
      if (x + 2 < cols) addConstraint(a, idx(x + 2, y), 0.34);
      if (y + 2 < rows) addConstraint(a, idx(x, y + 2), 0.34);
    }
  }

  const coverage = opaque / count;
  const status = document.querySelector<HTMLDivElement>('#mesh-status')!;
  status.textContent = `轮廓网格：${Math.round(coverage * 100)}% 顶点参与 · ${triangleIndices.length / 3} 个三角面`;
  status.classList.toggle('warning', coverage > 0.97);
  if (coverage > 0.97) status.title = '图片可能没有透明背景，当前会按矩形布料模拟。';
  else status.title = '已根据图片透明通道生成服装轮廓网格。';

  geometry.setIndex(triangleIndices);
  geometry.computeVertexNormals();
  resetSimulation();
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

const material = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transparent: true,
  alphaTest: 0.035,
  side: THREE.DoubleSide,
  roughness: 0.86,
  metalness: 0,
  sheen: 0.48,
  sheenRoughness: 0.92,
  envMapIntensity: 0.5,
});
const garment = new THREE.Mesh(geometry, material);
garment.position.y = -0.03;
scene.add(garment);

let preset: Preset = 'tshirt';
let wind = 0.35;
let stiffness = 0.72;
let damping = 0.035;
let autoWind = true;
let time = 0;
let impulse = 0;
let accumulator = 0;
const fixedStep = 1 / 120;
const maxSubsteps = 6;
const pins = new Map<number, THREE.Vector3>();

function presetAnchors(): Anchor[] {
  return preset === 'tshirt'
    ? [{ u: 0.32, v: 0.13 }, { u: 0.68, v: 0.13 }]
    : [{ u: 0.38, v: 0.11 }, { u: 0.5, v: 0.135 }, { u: 0.62, v: 0.11 }];
}

function findNearestActive(target: Anchor): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < count; i++) {
    if (!active[i]) continue;
    const u = (i % cols) / (cols - 1);
    const v = Math.floor(i / cols) / (rows - 1);
    const distance = (u - target.u) ** 2 + (v - target.v) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

function setPins() {
  pins.clear();
  for (const anchor of presetAnchors()) {
    const i = findNearestActive(anchor);
    if (i < 0) continue;
    const k = i * 3;
    pins.set(i, new THREE.Vector3(positions[k], positions[k + 1], positions[k + 2]));
  }
}

function resetSimulation() {
  for (let i = 0; i < count; i++) {
    const u = (i % cols) / (cols - 1);
    const v = Math.floor(i / cols) / (rows - 1);
    positions[i * 3] = (u - 0.5) * clothWidth;
    positions[i * 3 + 1] = topY - v * clothHeight;
    positions[i * 3 + 2] = 0.012 * Math.sin(u * 9) * Math.sin(v * 4);
  }
  previous.set(positions);
  setPins();
  accumulator = 0;
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function simulateSubstep(dt: number) {
  const damp = Math.pow(1 - damping, dt * 60);
  for (let i = 0; i < count; i++) {
    if (!active[i]) continue;
    const k = i * 3;
    const pin = pins.get(i);
    if (pin) {
      positions[k] = pin.x;
      positions[k + 1] = pin.y;
      positions[k + 2] = pin.z;
      previous[k] = pin.x;
      previous[k + 1] = pin.y;
      previous[k + 2] = pin.z;
      continue;
    }

    const vx = (positions[k] - previous[k]) * damp;
    const vy = (positions[k + 1] - previous[k + 1]) * damp;
    const vz = (positions[k + 2] - previous[k + 2]) * damp;
    previous[k] = positions[k];
    previous[k + 1] = positions[k + 1];
    previous[k + 2] = positions[k + 2];

    const u = (i % cols) / (cols - 1);
    const v = Math.floor(i / cols) / (rows - 1);
    const gust = autoWind ? Math.sin(time * 1.45 + u * 5.5 + v * 2.4) * 0.5 + 0.5 : 0.08;
    const windScale = preset === 'cape' ? 1.35 : 0.72;
    positions[k] += vx + Math.sin(time * 0.7 + v * 3) * wind * gust * windScale * dt * dt * 2.8;
    positions[k + 1] += vy - 9.8 * dt * dt;
    positions[k + 2] += vz + (wind * gust + impulse) * Math.sin(u * Math.PI) * dt * dt * 5.0;
  }

  for (let iteration = 0; iteration < 7; iteration++) {
    for (let c = 0; c < edgeA.length; c++) {
      const a = edgeA[c];
      const b = edgeB[c];
      const ia = a * 3;
      const ib = b * 3;
      const dx = positions[ib] - positions[ia];
      const dy = positions[ib + 1] - positions[ia + 1];
      const dz = positions[ib + 2] - positions[ia + 2];
      const distance = Math.hypot(dx, dy, dz) || 1e-8;
      const correction = ((distance - restLengths[c]) / distance) * 0.5 * stiffness * edgeStrength[c];
      const ox = dx * correction;
      const oy = dy * correction;
      const oz = dz * correction;
      if (!pins.has(a)) {
        positions[ia] += ox;
        positions[ia + 1] += oy;
        positions[ia + 2] += oz;
      }
      if (!pins.has(b)) {
        positions[ib] -= ox;
        positions[ib + 1] -= oy;
        positions[ib + 2] -= oz;
      }
    }
    for (const [i, p] of pins) {
      const k = i * 3;
      positions[k] = p.x;
      positions[k + 1] = p.y;
      positions[k + 2] = p.z;
    }
  }
  impulse *= 0.965;
}

function step(dt: number) {
  accumulator += Math.min(dt, 0.05);
  let substeps = 0;
  while (accumulator >= fixedStep && substeps < maxSubsteps) {
    time += fixedStep;
    simulateSubstep(fixedStep);
    accumulator -= fixedStep;
    substeps++;
  }
  if (substeps === maxSubsteps) accumulator = 0;
}

function kickAt(x: number, y: number, amount: number) {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < count; i++) {
    if (!active[i] || pins.has(i)) continue;
    const d = Math.hypot(positions[i * 3] - x, positions[i * 3 + 1] - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  if (best < 0) return;
  const bx = positions[best * 3];
  const by = positions[best * 3 + 1];
  const radius = 0.62;
  for (let i = 0; i < count; i++) {
    if (!active[i] || pins.has(i)) continue;
    const k = i * 3;
    const d = Math.hypot(positions[k] - bx, positions[k + 1] - by);
    if (d > radius) continue;
    const weight = 1 - d / radius;
    previous[k] -= amount * weight * 0.11;
    previous[k + 1] += amount * weight * 0.05;
    previous[k + 2] -= amount * weight * 0.14;
  }
}

const loader = new THREE.TextureLoader();
function setTexture(url: string) {
  loader.load(url, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.map?.dispose();
    material.map = loaded;
    material.needsUpdate = true;
    buildTopology(loaded.image as HTMLImageElement);
  });
}

function loadPreset(next: Preset) {
  preset = next;
  setTexture(`${import.meta.env.BASE_URL}demo-${next}.svg`);
  document.querySelectorAll<HTMLButtonElement>('.preset').forEach((button) => {
    button.classList.toggle('active', button.dataset.preset === next);
  });
  document.querySelector('#filename')!.textContent =
    next === 'tshirt' ? '当前：演示白色棉质 T 恤' : '当前：演示轻薄多层披风';
  resetSimulation();
}

function loadUserImage(file: File) {
  const url = URL.createObjectURL(file);
  loader.load(url, (loaded) => {
    URL.revokeObjectURL(url);
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.map?.dispose();
    material.map = loaded;
    material.needsUpdate = true;
    document.querySelector('#filename')!.textContent = `当前：${file.name}`;
    buildTopology(loaded.image as HTMLImageElement);
  }, undefined, () => URL.revokeObjectURL(url));
}

function bindRange(id: string, setter: (value: number) => void, outputId: string) {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)!;
  const output = document.querySelector<HTMLOutputElement>(`#${outputId}`)!;
  input.addEventListener('input', () => {
    const value = Number(input.value);
    setter(value);
    output.value = value.toFixed(2);
  });
}
bindRange('wind', (value) => wind = value, 'wind-value');
bindRange('soft', (value) => stiffness = value, 'soft-value');
bindRange('damp', (value) => damping = value, 'damp-value');
document.querySelector<HTMLInputElement>('#auto')!.addEventListener('change', (event) => {
  autoWind = (event.target as HTMLInputElement).checked;
});
document.querySelector<HTMLButtonElement>('#impulse')!.addEventListener('click', () => {
  impulse = 1.5;
  kickAt(0, 0.1, 1.4);
});
document.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', resetSimulation);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let dragging = false;
function setPointer(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
}
renderer.domElement.addEventListener('pointerdown', (event) => {
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(garment)[0];
  if (!hit) return;
  dragging = true;
  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  kickAt(hit.point.x, hit.point.y, 1.2);
  event.stopImmediatePropagation();
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(garment)[0];
  if (hit) kickAt(hit.point.x, hit.point.y, 0.3);
});
const stopDrag = () => {
  dragging = false;
  controls.enabled = true;
};
renderer.domElement.addEventListener('pointerup', stopDrag);
renderer.domElement.addEventListener('pointercancel', stopDrag);

let last = performance.now();
let frames = 0;
let fpsStart = last;
function animate(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  step(dt);
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  controls.update();
  renderer.render(scene, camera);
  frames++;
  if (now - fpsStart > 1000) {
    document.querySelector('#fps')!.textContent = `${Math.round(frames * 1000 / (now - fpsStart))} FPS`;
    frames = 0;
    fpsStart = now;
  }
  requestAnimationFrame(animate);
}
function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
new ResizeObserver(resize).observe(viewport);
loadPreset('tshirt');
requestAnimationFrame(animate);
