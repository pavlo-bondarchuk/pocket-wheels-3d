
const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ef);
scene.fog = new THREE.Fog(0xdfe6ef, 150, 430);

const camera = new THREE.PerspectiveCamera(58, 1, .1, 650);
const clock = new THREE.Clock();
const tempV = new THREE.Vector3();
const tempV2 = new THREE.Vector3();
const tempM = new THREE.Matrix4();
const tempQ = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

const ui = {
  lap: document.querySelector('#lap'),
  place: document.querySelector('#place'),
  time: document.querySelector('#time'),
  speed: document.querySelector('#speed'),
  carName: document.querySelector('#carName'),
  carClass: document.querySelector('#carClass'),
  countdown: document.querySelector('#countdown'),
  toast: document.querySelector('#toast'),
  garage: document.querySelector('#garage'),
  carGrid: document.querySelector('#carGrid'),
  selectedPreview: document.querySelector('#selectedPreview'),
  selectedClass: document.querySelector('#selectedClass'),
  selectedName: document.querySelector('#selectedName'),
  speedBar: document.querySelector('#speedBar'),
  accelBar: document.querySelector('#accelBar'),
  handlingBar: document.querySelector('#handlingBar'),
  finish: document.querySelector('#finish'),
  finishTitle: document.querySelector('#finishTitle'),
  finishTime: document.querySelector('#finishTime'),
  qualityBtn: document.querySelector('#qualityBtn')
};

const palette = [
  0x1579ff, 0xff2e2e, 0xffc400, 0x2ad15c, 0x9b5cff, 0xff6b00, 0x19c7c9, 0xf5f7fb,
  0x111318, 0xd83cff, 0x75d928, 0xe9a62f, 0x4f67ff, 0xff4f8a, 0x0fc28c, 0x8b9aaa
];

const archetypes = [
  { cls: 'HYPER', prefix: ['Neon', 'Apex', 'Vector', 'Pulse'], suffix: ['Comet', 'Vortex', 'Blade', 'Rift'], max: 72, accel: 32, handling: .92, type: 'hyper' },
  { cls: 'MUSCLE', prefix: ['Fire', 'Iron', 'Redline', 'Street'], suffix: ['Hammer', 'Torch', 'King', 'Beast'], max: 64, accel: 36, handling: .72, type: 'muscle' },
  { cls: 'RALLY', prefix: ['Dust', 'Gravel', 'Storm', 'Trail'], suffix: ['Runner', 'Fox', 'Dash', 'Claw'], max: 60, accel: 34, handling: .95, type: 'rally' },
  { cls: 'PROTO', prefix: ['Nova', 'Quantum', 'Solar', 'Flux'], suffix: ['X', 'Zero', 'Prime', 'Arrow'], max: 76, accel: 29, handling: .88, type: 'proto' },
  { cls: 'ROADSTER', prefix: ['Sun', 'Coast', 'Velvet', 'Blue'], suffix: ['Ray', 'Sprint', 'Wind', 'Drop'], max: 62, accel: 31, handling: .98, type: 'roadster' },
  { cls: 'GT', prefix: ['Midnight', 'Silver', 'Carbon', 'Royal'], suffix: ['GT', 'RS', 'Tourer', 'Racer'], max: 68, accel: 30, handling: .86, type: 'gt' },
  { cls: 'OFFROAD', prefix: ['Rock', 'Wild', 'Mud', 'Desert'], suffix: ['Crusher', 'Scout', 'Rex', 'Nomad'], max: 54, accel: 38, handling: .67, type: 'offroad' },
  { cls: 'PICKUP', prefix: ['Thunder', 'Steel', 'Ridge', 'Heavy'], suffix: ['Hauler', 'Ram', 'Truck', 'Bolt'], max: 56, accel: 37, handling: .64, type: 'pickup' },
  { cls: 'FORMULA', prefix: ['Rapid', 'Ultra', 'Air', 'Velocity'], suffix: ['One', 'Wing', 'F8', 'Jet'], max: 80, accel: 28, handling: .93, type: 'formula' },
  { cls: 'DRAG', prefix: ['Nitro', 'Chrome', 'Burnout', 'Blaze'], suffix: ['Snake', 'Rocket', 'Demon', 'Rail'], max: 83, accel: 42, handling: .52, type: 'drag' }
];

const cars = archetypes.flatMap((a, ai) => a.prefix.map((p, i) => ({
  id: ai * 4 + i,
  name: `${p} ${a.suffix[i]}`.toUpperCase(),
  cls: a.cls,
  type: a.type,
  color: palette[(ai * 3 + i * 5) % palette.length],
  accent: palette[(ai * 7 + i * 2 + 3) % palette.length],
  max: a.max + i * 1.5,
  accel: a.accel + ((i + ai) % 3) * 1.5,
  handling: Math.min(1, a.handling + (i - 1.5) * .02)
})));

const state = {
  selectedId: 0,
  previewId: 0,
  player: null,
  ai: [],
  progress: .01,
  prevProgress: .01,
  lateral: 0,
  lateralVelocity: 0,
  speed: 0,
  lap: 1,
  laps: 2,
  running: false,
  finished: false,
  startTime: 0,
  elapsed: 0,
  cameraMode: 0,
  quality: 'AUTO',
  lastBoostIndex: -1
};

const keys = { gas: false, brake: false, left: false, right: false };
const trackWidth = 13.5;
const carClearance = 1.15;
const segments = 860;
let trackCurve;
let frames;
let trackLength = 1;

function buildTrackPoints() {
  const pts = [];
  const push = (x, y, z) => pts.push(new THREE.Vector3(x, y, z));
  for (let x = -76; x <= 38; x += 4) push(x, 3, 34);
  const cx = 55, cy = 18, r = 15;
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI / 2 + Math.PI * 2 * (i / 64);
    push(cx + r * Math.cos(a), cy + r * Math.sin(a), 34);
  }
  for (let x = 56; x <= 86; x += 4) push(x, 3, 34);
  for (let i = 1; i <= 34; i++) {
    const a = Math.PI / 2 - Math.PI * (i / 34);
    push(86 + 34 * Math.cos(a), 3, 0 + 34 * Math.sin(a));
  }
  for (let x = 84; x >= -62; x -= 4) {
    const q = (84 - x) / 146;
    const hill = Math.sin(q * Math.PI * 2) * 1.6 + Math.exp(-Math.pow((q - .54) * 9, 2)) * 8;
    push(x, 3 + Math.max(0, hill), -34);
  }
  for (let i = 1; i <= 34; i++) {
    const a = -Math.PI / 2 - Math.PI * (i / 34);
    push(-62 + 34 * Math.cos(a), 3, 0 + 34 * Math.sin(a));
  }
  return pts;
}

function createTrack() {
  trackCurve = new THREE.CatmullRomCurve3(buildTrackPoints(), true, 'catmullrom', .08);
  trackCurve.arcLengthDivisions = 3000;
  trackLength = trackCurve.getLength();
  frames = trackCurve.computeFrenetFrames(segments, true);

  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = trackCurve.getPointAt(u);
    const side = frames.binormals[i];
    const left = p.clone().addScaledVector(side, trackWidth / 2);
    const right = p.clone().addScaledVector(side, -trackWidth / 2);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, u * 34, 1, u * 34);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, c, d, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5b0b, roughness: .28, metalness: .08, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  const leftPts = [], rightPts = [];
  for (let i = 0; i < 300; i++) {
    const u = i / 300;
    const p = trackCurve.getPointAt(u);
    const fi = Math.round(u * segments) % segments;
    const side = frames.binormals[fi];
    const normal = frames.normals[fi].clone().multiplyScalar(-1);
    leftPts.push(p.clone().addScaledVector(side, trackWidth / 2 + .28).addScaledVector(normal, .25));
    rightPts.push(p.clone().addScaledVector(side, -trackWidth / 2 - .28).addScaledVector(normal, .25));
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0xff7a1c, roughness: .22, metalness: .1 });
  for (const pts of [leftPts, rightPts]) {
    const c = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', .12);
    const g = new THREE.TubeGeometry(c, 450, .3, 7, true);
    const rail = new THREE.Mesh(g, railMat);
    rail.castShadow = true;
    rail.receiveShadow = true;
    scene.add(rail);
  }

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45 });
  for (let i = 0; i < 10; i++) {
    const u = (i * .0012 + .002) % 1;
    const p = trackCurve.getPointAt(u);
    const fi = Math.round(u * segments) % segments;
    const side = frames.binormals[fi];
    const normal = frames.normals[fi].clone().multiplyScalar(-1);
    const tangent = trackCurve.getTangentAt(u);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.05, .05, trackWidth * .5), stripeMat);
    tempM.makeBasis(side.clone().normalize(), normal.clone().normalize(), tangent.clone().normalize());
    bar.quaternion.setFromRotationMatrix(tempM);
    bar.position.copy(p).addScaledVector(normal, .07).addScaledVector(tangent, i * .03);
    bar.scale.x = 1;
    bar.scale.z = i % 2 ? 1.6 : 1.6;
    scene.add(bar);
  }

  const boostMat = new THREE.MeshStandardMaterial({ color: 0x67e8ff, emissive: 0x0089b5, emissiveIntensity: 4, roughness: .2 });
  for (const u of [.145, .59]) {
