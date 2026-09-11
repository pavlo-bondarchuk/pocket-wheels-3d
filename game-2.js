    const p = trackCurve.getPointAt(u);
    const fi = Math.round(u * segments) % segments;
    const side = frames.binormals[fi];
    const normal = frames.normals[fi].clone().multiplyScalar(-1);
    const tangent = trackCurve.getTangentAt(u);
    for (let k = -2; k <= 2; k++) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(2.5, .08, 1.4), boostMat);
      tempM.makeBasis(side.clone().normalize(), normal.clone().normalize(), tangent.clone().normalize());
      pad.quaternion.setFromRotationMatrix(tempM);
      pad.position.copy(p).addScaledVector(normal, .1).addScaledVector(side, k * 2.2);
      scene.add(pad);
    }
  }
}

function addBox(group, size, pos, mat, rot = [0,0,0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function createWheel(radius, width, rimColor = 0xbec7d3) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: .82, metalness: .05 }));
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * .54, radius * .54, width * 1.04, 12), new THREE.MeshStandardMaterial({ color: rimColor, roughness: .22, metalness: .9 }));
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  return g;
}

function createCarModel(spec, tiny = false) {
  const root = new THREE.Group();
  const scale = tiny ? .44 : 1;
  root.scale.setScalar(scale);
  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: .22, metalness: .58 });
  const accentMat = new THREE.MeshStandardMaterial({ color: spec.accent, roughness: .25, metalness: .45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: .35, metalness: .45 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a3754, roughness: .08, metalness: .25, transparent: true, opacity: .88 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdbe3ee, roughness: .16, metalness: .96 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xeaf8ff, emissive: 0xbfefff, emissiveIntensity: 1.8, roughness: .2 });

  let L = 6.3, W = 3.0, H = 1.25, wheelR = .67;
  if (spec.type === 'formula') { L = 7.0; W = 3.2; H = .72; wheelR = .72; }
  if (spec.type === 'offroad') { L = 6.2; W = 3.25; H = 1.65; wheelR = .86; }
  if (spec.type === 'pickup') { L = 6.6; W = 3.3; H = 1.6; wheelR = .82; }
  if (spec.type === 'drag') { L = 7.1; W = 3.0; H = 1.18; wheelR = .74; }
  if (spec.type === 'roadster') { H = 1.05; }

  addBox(root, [W, .55, L], [0, wheelR + .18, 0], bodyMat);
  addBox(root, [W * .9, .36, L * .43], [0, wheelR + .58, L * .18], bodyMat, [-.08,0,0]);
  addBox(root, [W * .78, H * .62, L * .34], [0, wheelR + .82 + H * .2, -.45], glassMat, [spec.type === 'muscle' ? -.04 : -.12,0,0]);
  addBox(root, [W * .82, .12, L * .3], [0, wheelR + .98 + H * .45, -.55], bodyMat);
  addBox(root, [W * .76, .12, L * .1], [0, wheelR + .62, L * .49], accentMat);

  if (spec.type === 'hyper' || spec.type === 'proto' || spec.type === 'gt') {
    addBox(root, [W * .84, .11, 1.55], [0, wheelR + .78, -L * .44], darkMat);
    addBox(root, [.09, .42, .18], [-W * .28, wheelR + .62, -L * .43], darkMat);
    addBox(root, [.09, .42, .18], [W * .28, wheelR + .62, -L * .43], darkMat);
  }
  if (spec.type === 'muscle' || spec.type === 'drag') {
    addBox(root, [1.0, .55, .95], [0, wheelR + 1.12, .78], chrome);
    addBox(root, [.18, .28, .65], [-.27, wheelR + 1.45, .8], darkMat);
    addBox(root, [.18, .28, .65], [.27, wheelR + 1.45, .8], darkMat);
  }
  if (spec.type === 'rally') {
    addBox(root, [W * .7, .08, 1.4], [0, wheelR + 1.7, -.55], darkMat);
    for (let x of [-.75,-.25,.25,.75]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 8), lightMat);
      lamp.position.set(x, wheelR + .9, L * .51);
      root.add(lamp);
    }
  }
  if (spec.type === 'offroad') {
    addBox(root, [W * .78, .12, 1.8], [0, wheelR + 1.75, -.35], darkMat);
    addBox(root, [W * .88, .12, 1.5], [0, wheelR + .48, L * .5], chrome);
  }
  if (spec.type === 'pickup') {
    addBox(root, [W * .85, .35, L * .34], [0, wheelR + .65, -L * .28], darkMat);
    addBox(root, [W * .78, .12, L * .29], [0, wheelR + .5, -L * .27], accentMat);
  }
  if (spec.type === 'formula') {
    root.children.forEach(ch => { if (ch.geometry?.type === 'BoxGeometry') ch.castShadow = true; });
    addBox(root, [W * .34, .35, L * .6], [0, wheelR + .45, .2], bodyMat);
    addBox(root, [W * .96, .1, .62], [0, wheelR + .55, L * .46], accentMat);
    addBox(root, [W * .92, .1, .78], [0, wheelR + .86, -L * .47], darkMat);
  }

  const wheelZ = L * .31;
  const wheelX = W * .52;
  for (const z of [-wheelZ, wheelZ]) {
    for (const x of [-wheelX, wheelX]) {
      const w = createWheel(wheelR, .52, spec.accent);
      w.position.set(x, wheelR, z);
      root.add(w);
    }
  }

  for (const x of [-W * .28, W * .28]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 8), lightMat);
    lamp.scale.set(1.4, .65, .45);
    lamp.position.set(x, wheelR + .65, L * .52);
    root.add(lamp);
  }
  addBox(root, [W * .58, .16, .1], [0, wheelR + .46, L * .515], darkMat);
  root.userData.spec = spec;
  return root;
}

function createRoom() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 420), new THREE.MeshStandardMaterial({ color: 0xb8c2cd, roughness: .72, metalness: .02 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcfd8e3, roughness: .75 });
  addBox(scene, [1, 80, 420], [-118, 40, 0], wallMat);
  addBox(scene, [260, 80, 1], [0, 40, -105], wallMat);

  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x242d38, roughness: .32, metalness: .58 });
  const shelfBack = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: .55 });
  const shelfGroup = new THREE.Group();
  shelfGroup.position.set(-104, 0, 38);
  for (let unit = 0; unit < 3; unit++) {
    const z0 = unit * 34 - 34;
    addBox(shelfGroup, [12, 30, 1.2], [0, 15, z0], shelfBack);
    addBox(shelfGroup, [.7, 31, 14], [-5.8, 15, z0], shelfMat);
    addBox(shelfGroup, [.7, 31, 14], [5.8, 15, z0], shelfMat);
    for (let y = 3; y <= 27; y += 6) addBox(shelfGroup, [12.2, .5, 14], [0, y, z0], shelfMat);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const spec = cars[(unit * 16 + row * 4 + col) % cars.length];
        const tiny = createCarModel(spec, true);
        tiny.rotation.y = Math.PI / 2;
        tiny.position.set(0, 4.1 + row * 6, z0 - 4.7 + col * 3.1);
        shelfGroup.add(tiny);
      }
    }
  }
  scene.add(shelfGroup);

  const blue = new THREE.MeshStandardMaterial({ color: 0x1659c7, roughness: .34, metalness: .2 });
  for (const x of [-74,-46,-18,10,78]) {
    addBox(scene, [2.4, 10, 2.4], [x, 5, 34], blue);
    addBox(scene, [12, 1.7, 3], [x, 9.7, 34], blue);
  }
  for (const x of [-70,-36,2,38,76]) {
    addBox(scene, [2.4, 7, 2.4], [x, 3.5, -34], blue);
  }
  addBox(scene, [3, 33, 3], [40, 16.5, 24], blue);
  addBox(scene, [3, 33, 3], [70, 16.5, 24], blue);
  addBox(scene, [36, 2.2, 3], [55, 16, 24], blue);

  const windowMat = new THREE.MeshStandardMaterial({ color: 0xbfe7ff, emissive: 0x77cfff, emissiveIntensity: .35, roughness: .15, metalness: .05, transparent: true, opacity: .7 });
  for (let i = 0; i < 3; i++) addBox(scene, [38, 34, .25], [-55 + i * 42, 36, -103.8], windowMat);

  const posterMat = new THREE.MeshStandardMaterial({ color: 0x27456d, roughness: .45 });
  addBox(scene, [36, 22, .35], [20, 32, -103.2], posterMat);
  addBox(scene, [24, 14, .38], [-62, 27, -103.15], new THREE.MeshStandardMaterial({ color: 0xe86b2e, roughness: .5 }));
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x57452f, 2.3));
  const sun = new THREE.DirectionalLight(0xfff2dc, 3.6);
  sun.position.set(65, 95, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  scene.add(sun);
  const warm = new THREE.PointLight(0xffa85a, 1200, 90, 2);
  warm.position.set(-35, 30, 20);
  scene.add(warm);
  const cool = new THREE.PointLight(0x70b8ff, 900, 80, 2);
  cool.position.set(80, 28, -35);
  scene.add(cool);
}

function frameAt(u) {
  const uu = ((u % 1) + 1) % 1;
  const idx = Math.min(segments, Math.round(uu * segments));
  const p = trackCurve.getPointAt(uu);
  const tangent = trackCurve.getTangentAt(uu).normalize();
  const side = frames.binormals[idx].clone().normalize();
  const normal = frames.normals[idx].clone().multiplyScalar(-1).normalize();
  return { p, tangent, side, normal };
}

function placeOnTrack(obj, u, lateral = 0, lift = carClearance) {
