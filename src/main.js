import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import './style.css';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const asset = (path) => import.meta.env.BASE_URL + path;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x251a15);
scene.backgroundIntensity = 0.38;
scene.backgroundBlurriness = 0.03;
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
renderer.domElement.setAttribute('aria-label', 'Interactieve 3D-weergave van het parfum');
viewport.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 9;
controls.minPolarAngle = THREE.MathUtils.degToRad(72);
controls.maxPolarAngle = THREE.MathUtils.degToRad(83);

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
document.querySelector('#reset').addEventListener('click', resetView);

const keyLight = new THREE.DirectionalLight(0xffe1bf, 2.2);
keyLight.position.set(-3, 5, 4);
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
  display.add(tier);
}

addTier(1.06, 0.055, -0.78, gold);
addTier(1.02, 0.49, -0.515, obsidian);
addTier(1.04, 0.025, -0.2575, gold);
addTier(1.015, 0.055, -0.2175, obsidian);

const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const shadowContext = shadowCanvas.getContext('2d');
const gradient = shadowContext.createRadialGradient(64, 64, 24, 64, 64, 64);
gradient.addColorStop(0, 'rgba(33, 15, 6, 0.68)');
gradient.addColorStop(0.62, 'rgba(33, 15, 6, 0.44)');
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
contactShadow.position.y = -0.809;
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

async function loadEnvironment() {
  const texture = await new HDRLoader().loadAsync(
    asset('textures/HDR/woestijn_parfum_showroom_met_stand_360_2048x1024.hdr'),
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
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
      object.material.metalness = 0;
      object.material.roughness = 0.55;
      object.material.emissive.setHex(0xffffff);
      object.material.emissiveMap = object.material.map;
      object.material.emissiveIntensity = 0.42;
      originalMaterials.set(object, object.material);
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
        mesh.material = alternatives[finish] ?? original;
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
});

let previousFrame;
let seconds = 0;
renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - (previousFrame ?? time)) / 1000, 0.1);
  previousFrame = time;
  seconds += delta * swordSpeed;
  swordOrbit.rotation.y = -0.55 + seconds * 0.38;
  swordFloat.position.y = 0.67 + Math.sin(seconds * 1.4) * 0.14;
  swordFloat.rotation.x = Math.sin(seconds * 0.95) * 0.42;
  swordFloat.rotation.y = Math.sin(seconds * 0.7) * 0.25;
  swordFloat.rotation.z = 0.12 + Math.sin(seconds * 1.4) * 0.08;
  controls.update();
  renderer.render(scene, camera);
});
