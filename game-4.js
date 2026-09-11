  ui.garage.classList.add('hidden');
  ui.garage.setAttribute('aria-hidden', 'true');
  if (!state.finished) {
    state.running = true;
    state.startTime = performance.now() - state.elapsed;
  }
}

function buildGarage() {
  ui.carGrid.innerHTML = '';
  cars.forEach(spec => {
    const btn = document.createElement('button');
    btn.className = 'car-card';
    btn.dataset.id = spec.id;
    const hex = `#${spec.color.toString(16).padStart(6,'0')}`;
    btn.innerHTML = `<div class="car-card-visual"><div class="mini-car" style="background:${hex}"></div></div><div class="car-card-body"><span>${spec.cls}</span><strong>${spec.name}</strong></div>`;
    btn.addEventListener('click', () => {
      state.previewId = spec.id;
      updateGarageSelection();
    });
    ui.carGrid.appendChild(btn);
  });
}

function updateGarageSelection() {
  const spec = cars[state.previewId];
  const hex = `#${spec.color.toString(16).padStart(6,'0')}`;
  ui.selectedPreview.innerHTML = `<div class="preview-car" style="background:${hex}"></div>`;
  ui.selectedClass.textContent = spec.cls;
  ui.selectedName.textContent = spec.name;
  ui.speedBar.style.width = `${Math.round(spec.max / 83 * 100)}%`;
  ui.accelBar.style.width = `${Math.round(spec.accel / 45 * 100)}%`;
  ui.handlingBar.style.width = `${Math.round(spec.handling * 100)}%`;
  document.querySelectorAll('.car-card').forEach(card => card.classList.toggle('active', Number(card.dataset.id) === spec.id));
}

function selectPreviewCar() {
  state.selectedId = state.previewId;
  localStorage.setItem('pocket-wheels-car', String(state.selectedId));
  closeGarage();
  resetRace(true);
}

function setQuality(mode) {
  state.quality = mode;
  const dprBase = window.devicePixelRatio || 1;
  const mobile = matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(dprBase, 1.6);
  let shadows = true;
  if (mode === 'LOW') { dpr = Math.min(dprBase, 1); shadows = false; }
  if (mode === 'MED') { dpr = Math.min(dprBase, 1.25); shadows = true; }
  if (mode === 'HIGH') { dpr = Math.min(dprBase, 1.8); shadows = true; }
  if (mode === 'AUTO') { dpr = Math.min(dprBase, mobile ? 1.2 : 1.55); shadows = !mobile; }
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = shadows;
  ui.qualityBtn.textContent = `Якість: ${mode}`;
}

function cycleQuality() {
  const list = ['AUTO', 'LOW', 'MED', 'HIGH'];
  const i = (list.indexOf(state.quality) + 1) % list.length;
  setQuality(list[i]);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function bindControls() {
  const down = e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.gas = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.brake = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'KeyR') resetRace(true);
    if (e.code === 'KeyC') state.cameraMode = (state.cameraMode + 1) % 3;
    if (e.code === 'KeyG') openGarage();
  };
  const upKey = e => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.gas = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.brake = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
  };
  addEventListener('keydown', down, { passive: false });
  addEventListener('keyup', upKey);
  document.querySelectorAll('[data-touch]').forEach(btn => {
    const k = btn.dataset.touch;
    const set = v => { keys[k] = v; };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); btn.setPointerCapture?.(e.pointerId); });
    btn.addEventListener('pointerup', e => { e.preventDefault(); set(false); });
    btn.addEventListener('pointercancel', () => set(false));
    btn.addEventListener('pointerleave', e => { if (e.buttons === 0) set(false); });
  });
  document.querySelector('#garageBtn').addEventListener('click', openGarage);
  document.querySelector('#closeGarage').addEventListener('click', closeGarage);
  document.querySelector('#useCar').addEventListener('click', selectPreviewCar);
  document.querySelector('#qualityBtn').addEventListener('click', cycleQuality);
  document.querySelector('#restartBtn').addEventListener('click', () => resetRace(true));
  document.querySelector('#finishGarage').addEventListener('click', () => {
    ui.finish.classList.add('hidden');
    openGarage();
  });
  addEventListener('resize', resize);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(.034, clock.getDelta());
  updateRace(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}

function init() {
  const saved = Number(localStorage.getItem('pocket-wheels-car'));
  if (Number.isInteger(saved) && saved >= 0 && saved < cars.length) state.selectedId = saved;
  state.previewId = state.selectedId;
  createLights();
  createRoom();
  createTrack();
  buildGarage();
  bindControls();
  setQuality('AUTO');
  resize();
  resetRace(true);
  animate();
}

init();
