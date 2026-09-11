  const f = frameAt(u);
  obj.position.copy(f.p).addScaledVector(f.side, lateral).addScaledVector(f.normal, lift);
  tempM.makeBasis(f.side, f.normal, f.tangent);
  obj.quaternion.setFromRotationMatrix(tempM);
  return f;
}

function spawnPlayer() {
  if (state.player) scene.remove(state.player);
  state.player = createCarModel(cars[state.selectedId]);
  state.player.scale.multiplyScalar(.82);
  scene.add(state.player);
  placeOnTrack(state.player, state.progress, state.lateral, carClearance);
  ui.carName.textContent = cars[state.selectedId].name;
  ui.carClass.textContent = cars[state.selectedId].cls;
}

function spawnAi() {
  state.ai.forEach(a => scene.remove(a.obj));
  state.ai.length = 0;
  const ids = [7, 14, 23, 31, 37];
  ids.forEach((id, i) => {
    const obj = createCarModel(cars[id]);
    obj.scale.multiplyScalar(.78);
    scene.add(obj);
    state.ai.push({
      obj,
      progress: (state.progress - .015 * (i + 1) + 1) % 1,
      speed: 47 + i * 2.8,
      lateral: [-3.8, 3.4, -1.2, 1.8, 0][i],
      lap: 1
    });
  });
}

function resetRace(withCountdown = true) {
  state.progress = .01;
  state.prevProgress = .01;
  state.lateral = 0;
  state.lateralVelocity = 0;
  state.speed = 0;
  state.lap = 1;
  state.finished = false;
  state.elapsed = 0;
  state.lastBoostIndex = -1;
  spawnPlayer();
  spawnAi();
  ui.finish.classList.add('hidden');
  if (withCountdown) startCountdown();
  else {
    state.running = true;
    state.startTime = performance.now();
  }
}

function startCountdown() {
  state.running = false;
  let n = 3;
  ui.countdown.textContent = n;
  ui.countdown.classList.remove('hidden');
  const tick = () => {
    n -= 1;
    if (n > 0) {
      ui.countdown.textContent = n;
      setTimeout(tick, 700);
    } else if (n === 0) {
      ui.countdown.textContent = 'GO!';
      state.running = true;
      state.startTime = performance.now();
      setTimeout(() => ui.countdown.classList.add('hidden'), 500);
    }
  };
  setTimeout(tick, 700);
}

function formatTime(ms) {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const z = Math.floor(total % 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(z).padStart(3,'0')}`;
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.remove('hidden');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => ui.toast.classList.add('hidden'), 1000);
}

function updateRace(dt) {
  const spec = cars[state.selectedId];
  const throttle = keys.gas ? 1 : 0;
  const brake = keys.brake ? 1 : 0;
  const rolling = state.speed > 1 ? 4.2 : 1.6;
  if (state.running && !state.finished) {
    state.speed += throttle * spec.accel * dt;
    state.speed -= brake * 42 * dt;
    state.speed -= rolling * dt;
    state.speed = THREE.MathUtils.clamp(state.speed, 0, spec.max);

    const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const steerForce = 18 * spec.handling * (1 - Math.min(.36, state.speed / 180));
    state.lateralVelocity += steer * steerForce * dt;
    state.lateralVelocity *= Math.pow(.09, dt);
    state.lateral += state.lateralVelocity * dt;
    const limit = trackWidth * .38;
    if (Math.abs(state.lateral) > limit) {
      state.lateral = THREE.MathUtils.clamp(state.lateral, -limit, limit);
      state.lateralVelocity *= -.18;
      state.speed *= .988;
    }

    const boostUs = [.145, .59];
    boostUs.forEach((u, i) => {
      const d = Math.abs((((state.progress - u + .5) % 1) + 1) % 1 - .5);
      if (d < .009 && state.lastBoostIndex !== i) {
        state.speed = Math.min(spec.max + 13, state.speed + 18);
        state.lastBoostIndex = i;
        showToast('BOOST +18');
      }
      if (d > .03 && state.lastBoostIndex === i) state.lastBoostIndex = -1;
    });

    state.prevProgress = state.progress;
    state.progress = (state.progress + state.speed * dt / trackLength) % 1;
    if (state.prevProgress > .9 && state.progress < .1) {
      state.lap += 1;
      if (state.lap > state.laps) finishRace();
      else showToast(`Коло ${state.lap} / ${state.laps}`);
    }
    state.elapsed = performance.now() - state.startTime;
  }

  const f = placeOnTrack(state.player, state.progress, state.lateral, carClearance);
  const roll = THREE.MathUtils.clamp(-state.lateralVelocity * .035, -.16, .16);
  tempQ.setFromAxisAngle(f.tangent, roll);
  state.player.quaternion.premultiply(tempQ);

  for (let i = 0; i < state.ai.length; i++) {
    const a = state.ai[i];
    if (state.running && !state.finished) {
      const wobble = Math.sin(performance.now() * .0007 + i) * .9;
      const aiSpeed = a.speed + Math.sin(performance.now() * .0004 + i * 2) * 4;
      const old = a.progress;
      a.progress = (a.progress + aiSpeed * dt / trackLength) % 1;
      if (old > .9 && a.progress < .1) a.lap += 1;
      placeOnTrack(a.obj, a.progress, a.lateral + wobble, carClearance);
    }
  }

  const rankData = [{ player: true, value: (state.lap - 1) + state.progress }].concat(state.ai.map(a => ({ value: (a.lap - 1) + a.progress })));
  rankData.sort((a,b) => b.value - a.value);
  const place = rankData.findIndex(r => r.player) + 1;
  ui.place.textContent = `${place} / ${rankData.length}`;
  ui.lap.textContent = `${Math.min(state.lap, state.laps)} / ${state.laps}`;
  ui.time.textContent = formatTime(state.elapsed);
  ui.speed.textContent = `${Math.round(state.speed * 3.6)} км/год`;
}

function updateCamera(dt) {
  const f = frameAt(state.progress);
  let desired, look;
  if (state.cameraMode === 0) {
    desired = f.p.clone().addScaledVector(f.side, state.lateral * .35).addScaledVector(f.normal, 6.2).addScaledVector(f.tangent, -12.5);
    look = f.p.clone().addScaledVector(f.side, state.lateral).addScaledVector(f.normal, 1.8).addScaledVector(f.tangent, 8);
  } else if (state.cameraMode === 1) {
    desired = f.p.clone().addScaledVector(f.normal, 2.8).addScaledVector(f.tangent, -3.4);
    look = f.p.clone().addScaledVector(f.tangent, 14).addScaledVector(f.normal, 1.3);
  } else {
    desired = f.p.clone().addScaledVector(f.side, 22).addScaledVector(f.normal, 13).addScaledVector(f.tangent, -4);
    look = f.p.clone().addScaledVector(f.tangent, 5);
  }
  const k = 1 - Math.pow(.001, dt);
  camera.position.lerp(desired, k);
  tempV.copy(look);
  camera.up.lerp(f.normal, k).normalize();
  camera.lookAt(tempV);
}

function finishRace() {
  state.finished = true;
  state.running = false;
  const rankData = [{ player: true, value: (state.lap - 1) + state.progress }].concat(state.ai.map(a => ({ value: (a.lap - 1) + a.progress })));
  rankData.sort((a,b) => b.value - a.value);
  const place = rankData.findIndex(r => r.player) + 1;
  ui.finishTitle.textContent = place === 1 ? 'Перемога!' : `Фініш: ${place} місце`;
  ui.finishTime.textContent = formatTime(state.elapsed);
  ui.finish.classList.remove('hidden');
}

function openGarage() {
  state.running = false;
  state.previewId = state.selectedId;
  updateGarageSelection();
  ui.garage.classList.remove('hidden');
  ui.garage.setAttribute('aria-hidden', 'false');
}

function closeGarage() {
