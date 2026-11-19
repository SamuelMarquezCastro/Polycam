import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import './style.css';

const viewport = document.querySelector('#stage');
const status = document.querySelector('#status');
const asset = (path) => import.meta.env.BASE_URL + path;
const backdropIntensity = 0.38;
const panorama = { value: null };

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
});
sand.onBeforeCompile = (shader) => {
  shader.uniforms.sandPanorama = panorama;
  shader.uniforms.sandBackdropIntensity = { value: backdropIntensity };
  shader.vertexShader = 'varying vec2 vSandPosition;\nvarying vec3 vSandDirection;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\nvSandPosition = position.xy;\nvSandDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;',
  );
  shader.fragmentShader = `
    varying vec2 vSandPosition;
    varying vec3 vSandDirection;
    uniform sampler2D sandPanorama;
    uniform float sandBackdropIntensity;
  ` + shader.fragmentShader.replace(
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
    `,
  ).replace(
    '#include <opaque_fragment>',
    `
    float distanceBlend = smoothstep(4.3, 15.0, length(vSandPosition));
    vec3 distantSand = texture2D(sandPanorama, equirectUv(normalize(vSandDirection))).rgb;
    outgoingLight = mix(outgoingLight, distantSand * sandBackdropIntensity, distanceBlend);
    #include <opaque_fragment>
    `,
  );
};
const sandGeometry = new THREE.PlaneGeometry(34, 34, 232, 232);
const sandPositions = sandGeometry.getAttribute('position');
for (let i = 0; i < sandPositions.count; i++) {
  const x = sandPositions.getX(i);
  const y = sandPositions.getY(i);
  const radius = Math.hypot(x, y);
  const outsidePlatform = THREE.MathUtils.smoothstep(radius, platformRadius + 0.12, 3.7);
  const landscapeFade = 1 - THREE.MathUtils.smoothstep(radius, 5.5, 13);
  const phase = y * 4.6 + x * 1.8 + 1.9 * Math.sin(x * 0.8 + y * 0.35);
  const ridge = Math.pow(0.5 + 0.5 * Math.sin(phase + 0.25 * Math.sin(phase)), 2);
  const dune = 0.5 + 0.5 * Math.sin(y * 1.24 - x * 0.56 + Math.sin(x * 1.1));
  const height = (0.16 * ridge + 0.11 * dune) * outsidePlatform * landscapeFade;
  sandPositions.setZ(i, height);
}
sandGeometry.computeVertexNormals();
const sandFloor = new THREE.Mesh(sandGeometry, sand);
sandFloor.rotation.x = -Math.PI / 2;
sandFloor.position.y = platformTop - platformDepth - 0.002;
sandFloor.receiveShadow = true;
display.add(sandFloor);

const dustGeometry = new THREE.BufferGeometry();
const dustDensity = document.querySelector('#dust-density');
const dustPositions = new Float32Array(Number(dustDensity.max) * 3);
for (let i = 0; i < dustPositions.length; i += 3) {
  dustPositions[i] = Math.random() * 18;
  dustPositions[i + 1] = Math.pow(Math.random(), 2) * 1.85;
  dustPositions[i + 2] = Math.random() * 13 - 6.5;
}
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const windTime = { value: 0 };
const dust = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({
  uniforms: { windTime, pixelRatio: { value: renderer.getPixelRatio() } },
  transparent: true,
  depthWrite: false,
  vertexShader: `
    uniform float windTime;
    uniform float pixelRatio;
    varying float vOpacity;
    varying float vSwirl;
    void main() {
      float seed = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.54);
      float gust = sin(windTime * 0.72 + position.z * 0.45);
      float x = mod(position.x + windTime * mix(0.68, 1.24, seed) + gust * 0.36, 18.0) - 9.0;
      float y = position.y + 0.10 * sin(x * 1.4 + windTime + seed * 6.28);
      vec3 drift = vec3(x, y, position.z + 0.30 * sin(x * 0.7 + seed * 5.0));
      float cycle = mod(windTime + 1.0, 6.5);
      float swirlStrength = smoothstep(0.25, 1.1, cycle) * (1.0 - smoothstep(2.65, 3.75, cycle));
      vSwirl = step(0.57, seed);
      float opacity = (1.0 - smoothstep(6.0, 9.0, abs(x)))
        * mix(0.40, 0.92, seed) * (0.76 + 0.24 * gust);
      if (vSwirl > 0.5) {
        float strand = fract(position.x / 18.0);
        float angle = -cycle * 2.35 + strand * 4.4 + position.z * 0.085;
        float radius = 1.26 + seed * 0.70 + 0.13 * sin(angle * 2.0 + position.z);
        float height = 0.19 + strand * 1.05 + 0.17 * position.y;
        drift = vec3(cos(angle) * radius, height, sin(angle) * radius);
        opacity = swirlStrength * smoothstep(0.0, 0.2, strand)
          * (1.0 - smoothstep(0.83, 1.0, strand)) * mix(0.33, 0.95, fract(seed * 29.0));
      }
      vec4 view = modelViewMatrix * vec4(drift, 1.0);
      vOpacity = opacity * smoothstep(1.3, 2.5, -view.z);
      gl_PointSize = clamp(mix(25.0, 20.0, vSwirl) / max(-view.z, 1.0), 1.9, 7.5) * pixelRatio;
      gl_Position = projectionMatrix * view;
    }
  `,
  fragmentShader: `
    varying float vOpacity;
    varying float vSwirl;
    void main() {
      vec2 grain = (gl_PointCoord - 0.5) * mix(vec2(2.0, 3.55), vec2(2.25, 2.55), vSwirl);
      float edge = 1.0 - smoothstep(0.18, 1.0, length(grain));
      gl_FragColor = vec4(1.55, 1.02, 0.52, edge * vOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}));
dust.position.y = sandFloor.position.y + 0.24;
dust.rotation.y = Math.PI / 2;
dust.frustumCulled = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
dust.visible = !reducedMotion.matches;
reducedMotion.addEventListener('change', (event) => { dust.visible = !event.matches; });
display.add(dust);

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

function bindSlider(id, apply, format = (value) => value.toFixed(2).replace('.', ',')) {
  const input = document.getElementById(id);
  const output = document.querySelector('output[for="' + id + '"]');
  function update() {
    apply(input.valueAsNumber);
    output.value = format(input.valueAsNumber);
  }
  input.addEventListener('input', update);
  update();
}

bindSlider('light', (value) => { keyLight.intensity = value; });
bindSlider('reflection', (value) => { scene.environmentIntensity = value; });
bindSlider('roughness', (value) => { obsidian.roughness = value; });
let swordSpeed = 1;
bindSlider('sword-speed', (value) => { swordSpeed = value; });
bindSlider('dust-density', (value) => { dustGeometry.setDrawRange(0, value); }, String);

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
  panorama.value = texture;
  scene.environment = texture;

  // Sample the HDR directly for the backdrop at its original resolution.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 16), new THREE.ShaderMaterial({
    uniforms: { panorama, backdropIntensity: { value: backdropIntensity } },
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
      uniform float backdropIntensity;
      varying vec3 vSkyDirection;
      void main() {
        vec2 uv = equirectUv(normalize(vSkyDirection));
        gl_FragColor = vec4(texture2D(panorama, uv).rgb * backdropIntensity, 1.0);
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

function applyPerfumeLabel(material) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  const foil = context.createLinearGradient(200, 180, 825, 850);
  foil.addColorStop(0, '#eec88a');
  foil.addColorStop(0.47, '#c38f55');
  foil.addColorStop(1, '#efc184');
  context.fillStyle = foil;
  for (const [text, font, baseline, width] of [
    ['FARIS AL ARAB', 'bold 133px "Times New Roman"', 345, 852],
    ['MAISON', '86px Georgia', 663, 545],
    ['ASRAR', 'bold 45px Arial', 728, 320],
    ['EAU DE PARFUM', '48px Arial', 857, 580],
    ['℮ 100 ML 3.38 FL.OZ', '43px Arial', 915, 590],
  ]) {
    context.font = font;
    context.fillText(text, 512, baseline, width);
  }

  const lettering = new THREE.CanvasTexture(canvas);
  lettering.colorSpace = THREE.SRGBColorSpace;
  lettering.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  material.onBeforeCompile = (shader) => {
    shader.uniforms.labelLettering = { value: lettering };
    shader.uniforms.labelStone = { value: obsidian.map };
    shader.vertexShader = 'varying vec3 vBottlePosition;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvBottlePosition = position;',
    );
    shader.fragmentShader = `
      varying vec3 vBottlePosition;
      uniform sampler2D labelLettering;
      uniform sampler2D labelStone;
    ` + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      vec2 labelUv = (vBottlePosition.xy - vec2(-0.222, -0.487)) / vec2(0.444, 0.371);
      vec2 edge = min(labelUv, 1.0 - labelUv);
      float labelCoverage = smoothstep(0.0, 0.07, min(edge.x, edge.y))
        * smoothstep(0.218, 0.233, vBottlePosition.z);
      vec4 foilInk = texture2D(labelLettering, labelUv);
      vec3 stoneFace = texture2D(labelStone, labelUv).rgb * 0.56;
      vec3 restoredLabel = mix(stoneFace, foilInk.rgb, foilInk.a);
      diffuseColor.rgb = mix(diffuseColor.rgb, restoredLabel, labelCoverage);
      `,
    ).replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      totalEmissiveRadiance = mix(totalEmissiveRadiance, restoredLabel * 0.42, labelCoverage);
      `,
    );
  };
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
      applyPerfumeLabel(object.material);
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
  windTime.value = time / 1000;
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
