import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import './style.css';

const viewport = document.querySelector('#stage');
const status = document.querySelector('#status');
const asset = (path) => import.meta.env.BASE_URL + path;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x251a15);
scene.environmentIntensity = 0.95;

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 40);
const target = new THREE.Vector3(0, 0.32, 0);
const display = new THREE.Group();
display.scale.setScalar(1.12);
display.position.y = 0.37;
scene.add(display);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute('aria-label', 'Interactieve 3D-weergave van het parfum');
viewport.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 9;
controls.minPolarAngle = THREE.MathUtils.degToRad(72);
controls.maxPolarAngle = THREE.MathUtils.degToRad(83);

let intro;
let introDismissed = false;
function stopIntro() {
  introDismissed = true;
  intro?.kill();
}
controls.addEventListener('start', stopIntro);

function resetView() {
  const distance = THREE.MathUtils.lerp(
    4.35,
    6.05,
    1 - THREE.MathUtils.smoothstep(camera.aspect, 0.95, 1.55),
  );
  camera.position.set(-0.992 * distance, target.y + 0.27 * distance, -0.127 * distance);
  controls.target.copy(target);
  controls.update();
}

new ResizeObserver(() => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}).observe(viewport);
camera.aspect = viewport.clientWidth / viewport.clientHeight;
camera.updateProjectionMatrix();
resetView();
document.querySelector('#reset').addEventListener('click', () => {
  stopIntro();
  resetView();
});

function playIntro() {
  if (introDismissed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const destination = camera.position.clone();
  const openingOffset = destination.clone().sub(target)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.085)
    .multiplyScalar(1.10);
  camera.position.copy(target).add(openingOffset);
  intro = gsap.to(camera.position, {
    x: destination.x,
    y: destination.y,
    z: destination.z,
    duration: 1.7,
    ease: 'power2.out',
  });
}

const keyLight = new THREE.DirectionalLight(0xffe1bf, 2.2);
keyLight.position.set(-3, 5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
Object.assign(keyLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 15 });
keyLight.shadow.camera.updateProjectionMatrix();
keyLight.shadow.normalBias = 0.025;
keyLight.shadow.radius = 4;
keyLight.shadow.intensity = 0.65;
const fill = new THREE.HemisphereLight(0xffecd4, 0x594338, 0.9);
scene.add(keyLight, fill);

const textureLoader = new THREE.TextureLoader();
function colorTexture(name, repeatX, repeatY) {
  const texture = textureLoader.load(asset('textures/materials/' + name));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const obsidian = new THREE.MeshStandardMaterial({
  map: colorTexture('grey_obsidian_TRUE_TILEABLE_1024.png', 2, 1),
  roughness: 0.32,
  metalness: 0.18,
});
const gold = new THREE.MeshStandardMaterial({
  map: colorTexture('gold_TRUE_TILEABLE_1024.png', 2, 1),
  color: 0xffdda1,
  roughness: 0.28,
  metalness: 0.72,
});

function addTier(radius, height, y, material) {
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 96), material);
  tier.position.y = y;
  tier.castShadow = true;
  tier.receiveShadow = true;
  display.add(tier);
}

addTier(1.06, 0.055, -0.78, gold);
addTier(1.02, 0.49, -0.515, obsidian);
addTier(1.04, 0.025, -0.2575, gold);
addTier(1.015, 0.055, -0.2175, obsidian);

// The stone surface sits flush with the bottom of the obsidian pedestal.
const platformTop = -0.8075;
const platformDepth = 0.35;
const stoneCanvas = document.createElement('canvas');
stoneCanvas.width = stoneCanvas.height = 256;
const stoneContext = stoneCanvas.getContext('2d');
const stonePixels = stoneContext.createImageData(256, 256);
let grain = 37;
for (let y = 0; y < 256; y++) {
  for (let x = 0; x < 256; x++) {
    grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
    const veins = Math.sin(y * 0.12 + 1.7 * Math.sin(x * 0.027) + 0.9 * Math.sin((x + y) * 0.038));
    const variation = 8 * veins + 4 * Math.sin(y * 0.39 + x * 0.045) + (grain / 2 ** 32 - 0.5) * 12;
    const i = (y * 256 + x) * 4;
    stonePixels.data[i] = 181 + variation;
    stonePixels.data[i + 1] = 151 + variation;
    stonePixels.data[i + 2] = 118 + variation;
    stonePixels.data[i + 3] = 255;
  }
}
stoneContext.putImageData(stonePixels, 0, 0);
const stoneTexture = new THREE.CanvasTexture(stoneCanvas);
stoneTexture.colorSpace = THREE.SRGBColorSpace;
stoneTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const stone = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.68 });
stone.shadowSide = THREE.DoubleSide;
const platformRadius = 2.42;
const platformSurface = new THREE.Mesh(new THREE.CircleGeometry(platformRadius, 128), stone);
platformSurface.rotation.x = -Math.PI / 2;
platformSurface.position.y = platformTop;
platformSurface.receiveShadow = true;
platformSurface.castShadow = true;
display.add(platformSurface);

const stoneProfile = [
  [2.39, -platformDepth], [2.43, -0.34], [2.455, -0.31], [2.46, -0.27],
  [2.46, -0.045], [2.452, -0.024], [2.438, -0.008], [platformRadius, 0],
].map(([radius, height]) => new THREE.Vector2(radius, height));
const platformEdge = new THREE.Mesh(new THREE.LatheGeometry(stoneProfile, 128), stone);
platformEdge.position.y = platformTop;
platformEdge.receiveShadow = true;
platformEdge.castShadow = true;
display.add(platformEdge);

// The near sand is geometry, fading into the distant landscape in the HDR.
const sand = new THREE.MeshStandardMaterial({
  color: 0x87562f,
  roughness: 0.93,
  transparent: true,
  depthWrite: false,
});
sand.onBeforeCompile = (shader) => {
  shader.vertexShader = 'varying vec2 vSandPosition;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\nvSandPosition = position.xy;',
  );
  shader.fragmentShader = 'varying vec2 vSandPosition;\n' + shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    vec2 p = vSandPosition;
    float bend = sin(p.x * 1.45 + p.y * 0.32);
    float ripple = sin(p.y * 17.0 + p.x * 3.1 + 1.65 * bend);
    float variation = sin(p.x * 0.72 - p.y * 1.21) * sin(p.y * 0.99);
    float grain = sin(p.x * 117.0 + p.y * 83.0) * sin(p.y * 109.0 - p.x * 71.0);
    float grainMask = 1.0 - smoothstep(0.35, 1.9, max(fwidth(p.x), fwidth(p.y)) * 100.0);
    diffuseColor.rgb *= 0.91 + 0.075 * ripple + 0.10 * variation + 0.038 * grain * grainMask;
    diffuseColor.a *= 1.0 - smoothstep(5.4, 16.0, length(p));
    `,
  );
};
const sandFloor = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), sand);
sandFloor.rotation.x = -Math.PI / 2;
sandFloor.position.y = platformTop - platformDepth - 0.002;
sandFloor.receiveShadow = true;
display.add(sandFloor);

const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const shadowContext = shadowCanvas.getContext('2d');
const gradient = shadowContext.createRadialGradient(64, 64, 24, 64, 64, 64);
gradient.addColorStop(0, 'rgba(33, 15, 6, 0.48)');
gradient.addColorStop(0.62, 'rgba(33, 15, 6, 0.28)');
gradient.addColorStop(1, 'rgba(33, 15, 6, 0)');
shadowContext.fillStyle = gradient;
shadowContext.fillRect(0, 0, 128, 128);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
shadowTexture.colorSpace = THREE.SRGBColorSpace;
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3.05, 3.05),
  new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = platformTop + 0.001;
display.add(contactShadow);

function bindSlider(id, apply) {
  const input = document.getElementById(id);
  const output = document.querySelector('output[for="' + id + '"]');
  function update() {
    apply(input.valueAsNumber);
    output.value = input.valueAsNumber.toFixed(2).replace('.', ',');
  }
  input.addEventListener('input', update);
  update();
}

bindSlider('light', (value) => { keyLight.intensity = value; });
bindSlider('reflection', (value) => { scene.environmentIntensity = value; });
bindSlider('roughness', (value) => { obsidian.roughness = value; });
let swordSpeed = 1;
bindSlider('sword-speed', (value) => { swordSpeed = value; });

const settingsToggle = document.querySelector('#settings-toggle');
const settingsPanel = document.querySelector('#settings-panel');
function setSettingsOpen(open) {
  settingsPanel.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
}
settingsToggle.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !settingsPanel.hidden) {
    setSettingsOpen(false);
    settingsToggle.focus();
  }
});

async function loadEnvironment() {
  const texture = await new HDRLoader().loadAsync(
    asset('textures/HDR/parfumatelier_gouden_uur_360_4096x2048.hdr'),
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.wrapS = THREE.RepeatWrapping;
  scene.environment = texture;

  // Sample the HDR directly for the backdrop at its original resolution.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 16), new THREE.ShaderMaterial({
    uniforms: { panorama: { value: texture } },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vSkyDirection;
      void main() {
        vSkyDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #include <common>
      uniform sampler2D panorama;
      varying vec3 vSkyDirection;
      void main() {
        vec2 uv = equirectUv(normalize(vSkyDirection));
        gl_FragColor = vec4(texture2D(panorama, uv).rgb * 0.38, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.renderOrder = -1;
  scene.add(sky);
}

function groupPerfumeSurfaces(geometry) {
  const { index } = geometry;
  const position = geometry.getAttribute('position');
  const label = [];
  const accents = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    const group = Math.min(position.getY(a), position.getY(b), position.getY(c)) < -0.095
      ? label
      : accents;
    group.push(a, b, c);
  }
  geometry.setIndex(new THREE.BufferAttribute(new index.array.constructor(label.concat(accents)), 1));
  geometry.clearGroups();
  geometry.addGroup(0, label.length, 0);
  geometry.addGroup(label.length, accents.length, 1);
}

async function loadPerfume() {
  const { scene: perfume } = await new GLTFLoader().loadAsync(asset('model/parfum.glb'));
  const bounds = new THREE.Box3().setFromObject(perfume);
  perfume.scale.multiplyScalar(1.58 / bounds.getSize(new THREE.Vector3()).y);
  perfume.rotation.y = -1.60;
  bounds.setFromObject(perfume);
  const center = bounds.getCenter(new THREE.Vector3());
  perfume.position.set(-center.x, -0.19 - bounds.min.y, -center.z);

  const textureFiles = {
    obsidian: 'grey_obsidian_TRUE_TILEABLE_1024.png',
    gold: 'gold_TRUE_TILEABLE_1024.png',
    silver: 'rough_silver_TRUE_TILEABLE_1024.png',
  };
  const alternatives = {
    obsidian: new THREE.MeshStandardMaterial({
      map: colorTexture(textureFiles.obsidian, 1, 1),
      metalness: 0.12,
      roughness: 0.32,
    }),
    gold: new THREE.MeshStandardMaterial({
      map: colorTexture(textureFiles.gold, 1, 1),
      metalness: 0.8,
      roughness: 0.28,
    }),
    silver: new THREE.MeshStandardMaterial({
      map: colorTexture(textureFiles.silver, 1, 1),
      metalness: 0.72,
      roughness: 0.4,
    }),
  };
  for (const material of Object.values(alternatives)) material.map.flipY = false;

  const originalMaterials = new Map();
  // The scanned bottle already has its shading baked into its color texture.
  perfume.traverse((object) => {
    if (object.isMesh && object.material.isMeshStandardMaterial) {
      object.castShadow = true;
      object.material.metalness = 0;
      object.material.roughness = 0.55;
      object.material.emissive.setHex(0xffffff);
      object.material.emissiveMap = object.material.map;
      object.material.emissiveIntensity = 0.42;
      originalMaterials.set(object, object.material);
      groupPerfumeSurfaces(object.geometry);
      object.material = [object.material, object.material];
    }
  });
  display.add(perfume);
  const swatches = document.querySelectorAll('.swatches button');
  for (const swatch of swatches) {
    const finish = swatch.dataset.material;
    if (textureFiles[finish]) {
      swatch.style.backgroundImage = `url("${asset('textures/materials/' + textureFiles[finish])}")`;
    }
    swatch.disabled = false;
    swatch.addEventListener('click', () => {
      for (const [mesh, original] of originalMaterials) {
        mesh.material = [original, alternatives[finish] ?? original];
      }
      for (const option of swatches) {
        option.setAttribute('aria-pressed', String(option === swatch));
      }
    });
  }
}

const swordOrbit = new THREE.Group();
display.add(swordOrbit);
const swordFloat = new THREE.Group();
swordFloat.position.z = 1.32;
swordOrbit.add(swordFloat);

async function loadSword() {
  const { scene: sword } = await new GLTFLoader().loadAsync(
    asset('model/arabic_sword/scene.gltf'),
  );
  const bounds = new THREE.Box3().setFromObject(sword);
  sword.scale.multiplyScalar(1.45 / bounds.getSize(new THREE.Vector3()).x);
  bounds.setFromObject(sword);
  sword.position.sub(bounds.getCenter(new THREE.Vector3()));
  swordFloat.add(sword);
}

Promise.allSettled([loadPerfume(), loadEnvironment(), loadSword()]).then(([perfume, environment, sword]) => {
  const errors = [];
  if (perfume.status === 'rejected') errors.push('Het parfummodel kon niet worden geladen.');
  if (environment.status === 'rejected') errors.push('De HDR-ruimte kon niet worden geladen.');
  if (sword.status === 'rejected') errors.push('Het zwaard kon niet worden geladen.');
  status.textContent = errors.join(' ');
  status.hidden = errors.length === 0;
  if (perfume.status === 'fulfilled' && environment.status === 'fulfilled') playIntro();
});

let previousFrame;
let seconds = 0;
renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - (previousFrame ?? time)) / 1000, 0.1);
  previousFrame = time;
  seconds += delta * swordSpeed;
  swordOrbit.rotation.y = 1.44 + Math.sin(seconds * 0.54 + 0.8) * 1.65;
  swordFloat.position.y = 0.67 + Math.sin(seconds * 1.4) * 0.14;
  swordFloat.rotation.x = Math.sin(seconds * 0.95) * 0.42;
  swordFloat.rotation.y = Math.sin(seconds * 0.7) * 0.25;
  swordFloat.rotation.z = 0.12 + Math.sin(seconds * 1.4) * 0.08;
  controls.update();
  renderer.render(scene, camera);
});
