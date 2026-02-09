const API = {
  async getState() {
    const r = await fetch('/api/state');
    if (!r.ok) throw new Error('Failed to load state');
    return r.json();
  },
  async spin() {
    const r = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!r.ok) throw new Error('Spin failed');
    return r.json();
  },
  async patchCombination(id, payload) {
    const r = await fetch(`/api/combinations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('Update combination failed');
    return r.json();
  },
  async addCombination(combo) {
    const r = await fetch('/api/combinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ combo })
    });
    if (!r.ok) throw new Error('Add combination failed');
    return r.json();
  },
  async removeCombinationByText(combo) {
    const r = await fetch('/api/combinations/by-text', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ combo })
    });
    if (!r.ok) throw new Error('Remove combination failed');
    return r.json();
  },
  async shuffle() {
    const r = await fetch('/api/combinations/shuffle', { method: 'POST' });
    if (!r.ok) throw new Error('Shuffle failed');
    return r.json();
  },
  async resetDefaults() {
    const r = await fetch('/api/reset/defaults', { method: 'POST' });
    if (!r.ok) throw new Error('Reset defaults failed');
    return r.json();
  },
  async resetStats() {
    const r = await fetch('/api/reset/stats', { method: 'POST' });
    if (!r.ok) throw new Error('Reset stats failed');
    return r.json();
  },
  async patchSettings(payload) {
    const r = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('Update settings failed');
    return r.json();
  },
  async uploadBackground(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload/background', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Upload background failed');
    return r.json();
  },
  async removeBackground() {
    const r = await fetch('/api/upload/background', { method: 'DELETE' });
    if (!r.ok) throw new Error('Remove background failed');
    return r.json();
  },
  async uploadAudio(type, file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/upload/audio/${type}`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Upload audio failed');
    return r.json();
  },
  async removeAudio(type) {
    const r = await fetch(`/api/upload/audio/${type}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Remove audio failed');
    return r.json();
  }
};

const state = {
  combos: [],
  spinCount: 0,
  lastComboId: null,
  spinning: false,
  settings: {
    reelSpeedMs: 35,
    bgMusicUrl: '',
    spinSoundUrl: '',
    jackpotSoundUrl: '',
    bgMusicVolume: 35,
    spinSoundVolume: 50,
    jackpotSoundVolume: 70,
    jackpotSoundLoop: false,
    backgroundImageUrl: ''
  }
};

const reelA = document.getElementById('reelA');
const reelB = document.getElementById('reelB');
const reelC = document.getElementById('reelC');
const resultText = document.getElementById('resultText');
const boardGrid = document.getElementById('boardGrid');
const poolCount = document.getElementById('poolCount');
const spinCount = document.getElementById('spinCount');
const spinBtn = document.getElementById('spinBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleBoardBtn = document.getElementById('toggleBoardBtn');
const boardPanel = document.getElementById('boardPanel');
const boardSubtitle = document.getElementById('boardSubtitle');
const boardRulesTab = document.getElementById('boardRulesTab');
const boardCombosTab = document.getElementById('boardCombosTab');
const boardTabRulesBtn = document.getElementById('boardTabRules');
const boardTabCombosBtn = document.getElementById('boardTabCombos');
const newCombo = document.getElementById('newCombo');
const removeCombo = document.getElementById('removeCombo');
const addComboBtn = document.getElementById('addComboBtn');
const removeComboBtn = document.getElementById('removeComboBtn');
const handle = document.querySelector('.handle');
const bgLayer = document.querySelector('.bg');

const uploadBgBtn = document.getElementById('uploadBgBtn');
const removeBgBtn = document.getElementById('removeBgBtn');
const bgFileInput = document.getElementById('bgFileInput');

const reelSpeedInput = document.getElementById('reelSpeed');
const reelSpeedValue = document.getElementById('reelSpeedValue');

const jackpotModal = document.getElementById('jackpotModal');
const jackpotCombo = document.getElementById('jackpotCombo');
const jackpotWinner = document.getElementById('jackpotWinner');
const jackpotCloseBtn = document.getElementById('jackpotCloseBtn');
const coinRain = document.getElementById('coinRain');

const bgMusicUploadBtn = document.getElementById('bgMusicUploadBtn');
const bgMusicRemoveBtn = document.getElementById('bgMusicRemoveBtn');
const bgMusicFileInput = document.getElementById('bgMusicFileInput');
const bgMusicVolumeInput = document.getElementById('bgMusicVolume');
const bgMusicVolumeValue = document.getElementById('bgMusicVolumeValue');

const spinSoundUploadBtn = document.getElementById('spinSoundUploadBtn');
const spinSoundRemoveBtn = document.getElementById('spinSoundRemoveBtn');
const spinSoundFileInput = document.getElementById('spinSoundFileInput');
const spinSoundVolumeInput = document.getElementById('spinSoundVolume');
const spinSoundVolumeValue = document.getElementById('spinSoundVolumeValue');

const jackpotSoundUploadBtn = document.getElementById('jackpotSoundUploadBtn');
const jackpotSoundRemoveBtn = document.getElementById('jackpotSoundRemoveBtn');
const jackpotSoundFileInput = document.getElementById('jackpotSoundFileInput');
const jackpotSoundVolumeInput = document.getElementById('jackpotSoundVolume');
const jackpotSoundVolumeValue = document.getElementById('jackpotSoundVolumeValue');
const jackpotSoundLoopInput = document.getElementById('jackpotSoundLoop');

let audioUnlocked = false;
let audioCtx = null;
let spinSynth = null;

const bgMusicAudio = new Audio();
bgMusicAudio.loop = true;
const spinAudio = new Audio();
spinAudio.loop = true;
const jackpotAudio = new Audio();

function normalizeCombo(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function splitComboToReels(combo) {
  const cleaned = combo.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length === 3) return parts;

  const graphemes = typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(cleaned)].map((s) => s.segment)
    : Array.from(cleaned);

  if (graphemes.length <= 3) {
    const last = graphemes[graphemes.length - 1] || '7';
    return [...graphemes, last, last].slice(0, 3);
  }
  return graphemes.slice(0, 3);
}

function applyCustomBackground(imageUrl) {
  if (!bgLayer) return;
  if (!imageUrl) {
    bgLayer.style.backgroundImage = '';
    bgLayer.style.backgroundSize = '';
    bgLayer.style.backgroundPosition = '';
    bgLayer.style.backgroundRepeat = '';
    return;
  }

  const safeUrl = String(imageUrl).replace(/"/g, '\\"');
  bgLayer.style.backgroundImage = `linear-gradient(rgba(8, 6, 10, 0.45), rgba(8, 6, 10, 0.45)), url("${safeUrl}")`;
  bgLayer.style.backgroundSize = 'cover';
  bgLayer.style.backgroundPosition = 'center';
  bgLayer.style.backgroundRepeat = 'no-repeat';
}

function formatPercent(v) {
  return `${v}%`;
}

function applyAudioVolumes() {
  bgMusicAudio.volume = state.settings.bgMusicVolume / 100;
  spinAudio.volume = state.settings.spinSoundVolume / 100;
  jackpotAudio.volume = state.settings.jackpotSoundVolume / 100;
  if (spinSynth && spinSynth.masterGain) {
    spinSynth.masterGain.gain.value = (state.settings.spinSoundVolume / 100) * 0.18;
  }
}

function applyAudioSources() {
  const s = state.settings;
  bgMusicAudio.src = s.bgMusicUrl || '';
  spinAudio.src = s.spinSoundUrl || '';
  jackpotAudio.src = s.jackpotSoundUrl || '';
  jackpotAudio.loop = !!s.jackpotSoundLoop;

  if (audioUnlocked && bgMusicAudio.src) {
    bgMusicAudio.play().catch(() => {});
  }
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (Ctx && !audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (bgMusicAudio.src) {
    bgMusicAudio.play().catch(() => {});
  }
}

function startSpinSynthSound() {
  if (!audioCtx) return;
  stopSpinSynthSound();

  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = (state.settings.spinSoundVolume / 100) * 0.18;
  masterGain.connect(audioCtx.destination);

  const lowTone = audioCtx.createOscillator();
  lowTone.type = 'sawtooth';
  lowTone.frequency.setValueAtTime(95, now);
  const lowToneGain = audioCtx.createGain();
  lowToneGain.gain.value = 0.2;
  lowTone.connect(lowToneGain);
  lowToneGain.connect(masterGain);

  const highTone = audioCtx.createOscillator();
  highTone.type = 'square';
  highTone.frequency.setValueAtTime(180, now);
  const highToneGain = audioCtx.createGain();
  highToneGain.gain.value = 0.05;
  highTone.connect(highToneGain);
  highToneGain.connect(masterGain);

  const lfo = audioCtx.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.setValueAtTime(13, now);
  const lfoDepth = audioCtx.createGain();
  lfoDepth.gain.value = 0.06;
  lfo.connect(lfoDepth);
  lfoDepth.connect(masterGain.gain);

  lowTone.start();
  highTone.start();
  lfo.start();

  spinSynth = { masterGain, lowTone, highTone, lfo };
}

function stopSpinSynthSound() {
  if (!spinSynth || !audioCtx) return;
  const now = audioCtx.currentTime;
  try {
    spinSynth.masterGain.gain.cancelScheduledValues(now);
    spinSynth.masterGain.gain.setValueAtTime(spinSynth.masterGain.gain.value, now);
    spinSynth.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    spinSynth.lowTone.stop(now + 0.09);
    spinSynth.highTone.stop(now + 0.09);
    spinSynth.lfo.stop(now + 0.09);
  } catch {
    // noop
  }
  spinSynth = null;
}

function playReelStopClick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, now);
  filter.Q.value = 1.2;

  const base = Math.max(0.02, (state.settings.spinSoundVolume / 100) * 0.22);
  gain.gain.setValueAtTime(base, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function startCoinRain() {
  if (!coinRain) return;
  coinRain.innerHTML = '';
  coinRain.classList.add('active');
  coinRain.setAttribute('aria-hidden', 'false');

  const count = window.innerWidth < 800 ? 18 : 30;
  for (let i = 0; i < count; i += 1) {
    const coin = document.createElement('span');
    coin.className = 'coin';
    coin.style.left = `${Math.random() * 100}%`;
    coin.style.setProperty('--size', `${24 + Math.random() * 34}px`);
    coin.style.setProperty('--dur', `${1.9 + Math.random() * 1.8}s`);
    coin.style.setProperty('--delay', `${Math.random() * 1.2}s`);
    coinRain.appendChild(coin);
  }
}

function stopCoinRain() {
  if (!coinRain) return;
  coinRain.classList.remove('active');
  coinRain.setAttribute('aria-hidden', 'true');
  coinRain.innerHTML = '';
}

function hideJackpotPopup() {
  if (!jackpotModal) return;
  jackpotModal.classList.remove('active');
  jackpotModal.setAttribute('aria-hidden', 'true');
  stopCoinRain();
  jackpotAudio.pause();
  jackpotAudio.currentTime = 0;
}

function showJackpotPopup(combo, winner) {
  if (!jackpotModal || !jackpotCombo || !jackpotWinner) return;
  jackpotCombo.textContent = combo || '-';
  jackpotWinner.textContent = winner || 'Не назначен';
  jackpotModal.classList.add('active');
  jackpotModal.setAttribute('aria-hidden', 'false');
  startCoinRain();

  if (jackpotAudio.src) {
    jackpotAudio.loop = !!state.settings.jackpotSoundLoop;
    jackpotAudio.currentTime = 0;
    jackpotAudio.play().catch(() => {});
  }
}

function setBoardTab(tab) {
  if (!boardRulesTab || !boardCombosTab || !boardTabRulesBtn || !boardTabCombosBtn) return;
  const isRules = tab === 'rules';
  boardRulesTab.classList.toggle('active', isRules);
  boardCombosTab.classList.toggle('active', !isRules);
  boardTabRulesBtn.classList.toggle('active', isRules);
  boardTabCombosBtn.classList.toggle('active', !isRules);
  if (boardSubtitle) {
    boardSubtitle.textContent = isRules
      ? 'Базовые правила проведения'
      : 'Кликни по имени победителя, чтобы изменить';
  }
}

function updateCounters() {
  const activeCount = state.combos.filter((item) => item.enabled !== false).length;
  poolCount.textContent = `${activeCount}/${state.combos.length}`;
  spinCount.textContent = state.spinCount;
}

function renderBoard() {
  boardGrid.innerHTML = '';

  state.combos.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'board-card';
    if (state.lastComboId === item.id) card.classList.add('active');
    if (item.enabled === false) card.classList.add('disabled');

    const top = document.createElement('div');
    top.className = 'card-top';

    const combo = document.createElement('div');
    combo.className = 'combo';
    combo.textContent = item.combo;

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `#${index + 1}`;

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'combo-toggle';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = item.enabled !== false;
    toggleInput.addEventListener('change', async (e) => {
      try {
        await API.patchCombination(item.id, { enabled: e.target.checked });
        await syncState();
        renderBoard();
      } catch {
        resultText.textContent = 'Не удалось переключить комбинацию';
      }
    });

    const toggleText = document.createElement('span');
    toggleText.textContent = (item.enabled !== false) ? 'ON' : 'OFF';

    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(toggleText);

    top.appendChild(combo);
    top.appendChild(badge);
    top.appendChild(toggleWrap);

    const winnerWrap = document.createElement('div');
    winnerWrap.className = 'winner';

    const winnerLabel = document.createElement('span');
    winnerLabel.textContent = 'Победитель';

    const winnerInput = document.createElement('input');
    winnerInput.type = 'text';
    winnerInput.value = item.winner || '';
    winnerInput.placeholder = 'Нет имени';
    winnerInput.addEventListener('change', async (e) => {
      try {
        await API.patchCombination(item.id, { winner: e.target.value });
        await syncState();
        renderBoard();
      } catch {
        resultText.textContent = 'Не удалось сохранить победителя';
      }
    });

    const lastHit = document.createElement('div');
    lastHit.className = 'last-hit';
    const hitLabel = Number.isFinite(item.hits) ? ` (${item.hits})` : '';
    lastHit.textContent = item.lastHit
      ? `Последний выигрыш: ${item.lastHit}${hitLabel}`
      : `Еще не выпадало${hitLabel}`;

    winnerWrap.appendChild(winnerLabel);
    winnerWrap.appendChild(winnerInput);
    winnerWrap.appendChild(lastHit);

    card.appendChild(top);
    card.appendChild(winnerWrap);
    boardGrid.appendChild(card);
  });

  updateCounters();
}

async function syncState() {
  const payload = await API.getState();
  state.combos = payload.combinations || [];
  state.spinCount = Number(payload.spinCount || 0);
  state.lastComboId = payload.lastComboId ?? null;
  state.settings = {
    ...state.settings,
    ...(payload.settings || {})
  };

  applyCustomBackground(state.settings.backgroundImageUrl || '');
  applyAudioSources();
  applyAudioVolumes();

  if (reelSpeedInput && reelSpeedValue) {
    reelSpeedInput.value = String(state.settings.reelSpeedMs || 35);
    reelSpeedValue.textContent = String(state.settings.reelSpeedMs || 35);
  }
  if (bgMusicVolumeInput && bgMusicVolumeValue) {
    bgMusicVolumeInput.value = String(state.settings.bgMusicVolume);
    bgMusicVolumeValue.textContent = formatPercent(state.settings.bgMusicVolume);
  }
  if (spinSoundVolumeInput && spinSoundVolumeValue) {
    spinSoundVolumeInput.value = String(state.settings.spinSoundVolume);
    spinSoundVolumeValue.textContent = formatPercent(state.settings.spinSoundVolume);
  }
  if (jackpotSoundVolumeInput && jackpotSoundVolumeValue) {
    jackpotSoundVolumeInput.value = String(state.settings.jackpotSoundVolume);
    jackpotSoundVolumeValue.textContent = formatPercent(state.settings.jackpotSoundVolume);
  }
  if (jackpotSoundLoopInput) {
    jackpotSoundLoopInput.checked = !!state.settings.jackpotSoundLoop;
  }
}

function animateReels(finalCombo, onComplete) {
  const symbols = Array.from(
    new Set(
      state.combos
        .filter((item) => item.enabled !== false)
        .flatMap((item) => splitComboToReels(item.combo))
        .map((v) => v.trim())
        .filter(Boolean)
    )
  );

  const reels = [reelA, reelB, reelC];
  const parts = splitComboToReels(finalCombo);
  const stopTimes = [1000, 2000, 3000];
  const totalDuration = 4000;
  const stopped = [false, false, false];
  const fallback = ['7', '🍒', '💎'];

  const interval = setInterval(() => {
    reels.forEach((reel, index) => {
      if (stopped[index]) return;
      const source = symbols.length ? symbols : fallback;
      reel.textContent = source[Math.floor(Math.random() * source.length)];
    });
  }, state.settings.reelSpeedMs || 35);

  stopTimes.forEach((time, index) => {
    setTimeout(() => {
      stopped[index] = true;
      reels[index].textContent = parts[index] || finalCombo;
      playReelStopClick();
    }, time);
  });

  setTimeout(() => {
    clearInterval(interval);
    state.spinning = false;
    spinAudio.pause();
    spinAudio.currentTime = 0;
    stopSpinSynthSound();
    if (typeof onComplete === 'function') onComplete();
  }, totalDuration);
}

async function spin() {
  if (state.spinning) return;

  const active = state.combos.filter((c) => c.enabled !== false);
  if (!active.length) {
    spinAudio.pause();
    spinAudio.currentTime = 0;
    stopSpinSynthSound();
    resultText.textContent = 'Нет активных комбинаций — включите хотя бы одну';
    return;
  }

  state.spinning = true;
  try {
    const result = await API.spin();
    resultText.textContent = `Однорукий бандит выбрал: ${result.combo}`;

    await syncState();
    renderBoard();

    animateReels(result.combo, () => {
      showJackpotPopup(result.combo, result.winner || '');
    });
  } catch {
    state.spinning = false;
    spinAudio.pause();
    spinAudio.currentTime = 0;
    stopSpinSynthSound();
    resultText.textContent = 'Ошибка спина. Повтори попытку';
  }
}

function pullHandleThenSpin() {
  if (state.spinning) return;

  unlockAudio();
  if (spinAudio.src) {
    spinAudio.currentTime = 0;
    spinAudio.play().catch(() => {});
  }
  startSpinSynthSound();

  if (handle) {
    handle.classList.add('pulled');
    setTimeout(() => {
      handle.classList.remove('pulled');
    }, 350);
  }

  setTimeout(() => {
    spin();
  }, 350);
}

async function addCombo() {
  const comboText = normalizeCombo(newCombo.value);
  if (!comboText) return;
  try {
    await API.addCombination(comboText);
    newCombo.value = '';
    await syncState();
    renderBoard();
    resultText.textContent = `Бандит принял в банду: ${comboText}`;
  } catch {
    resultText.textContent = 'Не удалось добавить комбинацию';
  }
}

async function removeComboByText() {
  const comboText = normalizeCombo(removeCombo.value);
  if (!comboText) return;
  try {
    await API.removeCombinationByText(comboText);
    removeCombo.value = '';
    await syncState();
    renderBoard();
    resultText.textContent = `Бандит выгнал: ${comboText}`;
  } catch {
    resultText.textContent = 'Комбинация не найдена';
  }
}

async function shufflePool() {
  try {
    await API.shuffle();
    await syncState();
    renderBoard();
    resultText.textContent = 'Бандит перемешал удачу';
  } catch {
    resultText.textContent = 'Не удалось перемешать пул';
  }
}

async function resetDefaults() {
  try {
    await API.resetDefaults();
    await syncState();
    renderBoard();
    resultText.textContent = 'Бандит вернул все на круги своя';
  } catch {
    resultText.textContent = 'Не удалось сбросить к дефолту';
  }
}

async function resetStats() {
  try {
    await API.resetStats();
    await syncState();
    renderBoard();
    resultText.textContent = 'Бандит стер следы прошлых побед';
  } catch {
    resultText.textContent = 'Не удалось сбросить статистику';
  }
}

function wireBackgroundUpload() {
  uploadBgBtn.addEventListener('click', () => {
    bgFileInput.click();
  });

  bgFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      resultText.textContent = 'Выберите файл изображения';
      return;
    }

    try {
      await API.uploadBackground(file);
      await syncState();
      resultText.textContent = 'Фон обновлен';
    } catch {
      resultText.textContent = 'Не удалось загрузить фон';
    }

    e.target.value = '';
  });

  removeBgBtn.addEventListener('click', async () => {
    try {
      await API.removeBackground();
      await syncState();
      resultText.textContent = 'Пользовательский фон удален';
    } catch {
      resultText.textContent = 'Не удалось удалить фон';
    }
  });
}

function wireAudioUpload(button, input, type, successText) {
  if (!button || !input) return;

  button.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      resultText.textContent = 'Выберите аудиофайл';
      return;
    }

    try {
      await API.uploadAudio(type, file);
      await syncState();
      if (type === 'bg') {
        unlockAudio();
        bgMusicAudio.currentTime = 0;
        bgMusicAudio.play().catch(() => {});
      }
      resultText.textContent = successText;
    } catch {
      resultText.textContent = 'Не удалось загрузить аудио';
    }

    e.target.value = '';
  });
}

function wireAudioRemove(button, type, successText) {
  if (!button) return;
  button.addEventListener('click', async () => {
    try {
      await API.removeAudio(type);
      await syncState();
      resultText.textContent = successText;
    } catch {
      resultText.textContent = 'Не удалось удалить аудио';
    }
  });
}

function wireVolumeControl(input, valueEl, key) {
  if (!input || !valueEl) return;
  input.addEventListener('input', async (e) => {
    const nextValue = Number(e.target.value);
    if (!Number.isFinite(nextValue)) return;

    state.settings[key] = nextValue;
    valueEl.textContent = formatPercent(nextValue);
    applyAudioVolumes();

    try {
      await API.patchSettings({ [key]: nextValue });
    } catch {
      resultText.textContent = 'Не удалось сохранить громкость';
    }
  });
}

function wireEvents() {
  spinBtn.addEventListener('click', pullHandleThenSpin);
  if (handle) {
    handle.addEventListener('click', pullHandleThenSpin);
  }

  shuffleBtn.addEventListener('click', shufflePool);
  resetStatsBtn.addEventListener('click', resetStats);
  resetBtn.addEventListener('click', resetDefaults);

  toggleBoardBtn.addEventListener('click', () => {
    const isHidden = boardPanel.classList.toggle('hidden');
    toggleBoardBtn.textContent = isHidden ? 'Показать табло' : 'Скрыть табло';
  });

  if (boardTabRulesBtn) {
    boardTabRulesBtn.addEventListener('click', () => setBoardTab('rules'));
  }
  if (boardTabCombosBtn) {
    boardTabCombosBtn.addEventListener('click', () => setBoardTab('combos'));
  }

  addComboBtn.addEventListener('click', addCombo);
  removeComboBtn.addEventListener('click', removeComboByText);

  newCombo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCombo();
  });
  removeCombo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') removeComboByText();
  });

  if (reelSpeedInput && reelSpeedValue) {
    reelSpeedInput.addEventListener('input', async (e) => {
      const nextValue = Number(e.target.value);
      if (!Number.isFinite(nextValue)) return;
      reelSpeedValue.textContent = String(nextValue);
      state.settings.reelSpeedMs = nextValue;
      try {
        await API.patchSettings({ reelSpeedMs: nextValue });
      } catch {
        resultText.textContent = 'Не удалось сохранить скорость';
      }
    });
  }

  wireBackgroundUpload();
  wireAudioUpload(bgMusicUploadBtn, bgMusicFileInput, 'bg', 'Фоновая музыка загружена');
  wireAudioUpload(spinSoundUploadBtn, spinSoundFileInput, 'spin', 'Звук прокрутки загружен');
  wireAudioUpload(jackpotSoundUploadBtn, jackpotSoundFileInput, 'jackpot', 'Звук джекпота загружен');
  wireAudioRemove(bgMusicRemoveBtn, 'bg', 'Фоновая музыка удалена');
  wireAudioRemove(spinSoundRemoveBtn, 'spin', 'Звук прокрутки удален');
  wireAudioRemove(jackpotSoundRemoveBtn, 'jackpot', 'Звук джекпота удален');

  wireVolumeControl(bgMusicVolumeInput, bgMusicVolumeValue, 'bgMusicVolume');
  wireVolumeControl(spinSoundVolumeInput, spinSoundVolumeValue, 'spinSoundVolume');
  wireVolumeControl(jackpotSoundVolumeInput, jackpotSoundVolumeValue, 'jackpotSoundVolume');

  if (jackpotSoundLoopInput) {
    jackpotSoundLoopInput.addEventListener('change', async (e) => {
      state.settings.jackpotSoundLoop = e.target.checked;
      jackpotAudio.loop = !!state.settings.jackpotSoundLoop;
      try {
        await API.patchSettings({ jackpotSoundLoop: state.settings.jackpotSoundLoop });
      } catch {
        resultText.textContent = 'Не удалось сохранить режим зацикливания';
      }
    });
  }

  if (jackpotCloseBtn) {
    jackpotCloseBtn.addEventListener('click', hideJackpotPopup);
  }
  if (jackpotModal) {
    jackpotModal.addEventListener('click', (e) => {
      if (e.target === jackpotModal) {
        hideJackpotPopup();
      }
    });
  }

  document.addEventListener('pointerdown', unlockAudio, { once: true });
}

async function bootstrap() {
  try {
    wireEvents();
    await syncState();
    setBoardTab('rules');
    renderBoard();
  } catch {
    resultText.textContent = 'Сервер недоступен. Проверь запуск backend';
  }
}

bootstrap();
