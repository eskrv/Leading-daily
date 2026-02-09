import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const DEFAULT_COMBINATIONS = [
  { id: 1, combo: '777', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 2, combo: '🍒🍒🍒', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 3, combo: '💎💎💎', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 4, combo: '⚡️⚡️⚡️', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 5, combo: '🍐🍐🍐', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 6, combo: '🍋🍋🍋', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 7, combo: '🔔🔔🔔', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 8, combo: '🍀🍀🍀', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 9, combo: '💰💰💰', winner: '', hits: 0, enabled: true, lastHit: null },
  { id: 10, combo: '⭐️⭐️⭐️', winner: '', hits: 0, enabled: true, lastHit: null }
];

const DEFAULT_SETTINGS = {
  reelSpeedMs: 35,
  bgMusicUrl: '',
  spinSoundUrl: '',
  jackpotSoundUrl: '',
  bgMusicVolume: 35,
  spinSoundVolume: 50,
  jackpotSoundVolume: 70,
  jackpotSoundLoop: false,
  backgroundImageUrl: ''
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function normalizeCombo(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function nowRu() {
  return new Date().toLocaleString('ru-RU');
}

function getInitialState() {
  return {
    nextCombinationId: DEFAULT_COMBINATIONS.length + 1,
    nextSpinId: 1,
    lastComboId: null,
    combinations: DEFAULT_COMBINATIONS,
    spins: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

function readState() {
  ensureDirs();
  if (!fs.existsSync(STATE_FILE)) {
    const initial = getInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    return {
      ...getInitialState(),
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {})
      }
    };
  } catch {
    const initial = getInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function publicPathFor(filePath) {
  return '/' + path.relative(__dirname, filePath).split(path.sep).join('/');
}

function removeOldFile(urlPath) {
  if (!urlPath) return;
  const abs = path.join(__dirname, urlPath.replace(/^\//, ''));
  if (abs.startsWith(UPLOADS_DIR) && fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'misc';
    const dir = path.join(UPLOADS_DIR, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

app.get('/api/state', (req, res) => {
  const state = readState();
  res.json({
    combinations: state.combinations,
    spinCount: state.spins.length,
    lastComboId: state.lastComboId,
    settings: state.settings
  });
});

app.post('/api/spin', (req, res) => {
  const state = readState();
  const active = state.combinations.filter((c) => c.enabled !== false);
  if (!active.length) {
    return res.status(400).json({ error: 'No active combinations' });
  }

  let pool = active;
  if (active.length > 1 && state.lastComboId != null) {
    const excludedLast = active.filter((c) => c.id !== state.lastComboId);
    if (excludedLast.length) pool = excludedLast;
  }

  const minHits = Math.min(...pool.map((c) => Number(c.hits || 0)));
  const candidates = pool.filter((c) => Number(c.hits || 0) === minHits);
  const winner = candidates[Math.floor(Math.random() * candidates.length)];

  winner.hits = Number(winner.hits || 0) + 1;
  winner.lastHit = nowRu();
  if (typeof req.body?.winnerName === 'string' && req.body.winnerName.trim()) {
    winner.winner = req.body.winnerName.trim();
  }

  state.lastComboId = winner.id;
  state.spins.push({
    id: state.nextSpinId++,
    combinationId: winner.id,
    combo: winner.combo,
    winnerNameSnapshot: winner.winner || '',
    createdAt: new Date().toISOString()
  });

  writeState(state);

  return res.json({
    combo: winner.combo,
    winner: winner.winner || '',
    combinationId: winner.id,
    spinCount: state.spins.length
  });
});

app.patch('/api/combinations/:id', (req, res) => {
  const id = Number(req.params.id);
  const state = readState();
  const item = state.combinations.find((c) => c.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (typeof req.body?.winner === 'string') {
    item.winner = req.body.winner;
  }
  if (typeof req.body?.enabled === 'boolean') {
    item.enabled = req.body.enabled;
    if (!item.enabled && state.lastComboId === item.id) {
      state.lastComboId = null;
    }
  }

  writeState(state);
  return res.json({ ok: true, combination: item });
});

app.post('/api/combinations', (req, res) => {
  const combo = normalizeCombo(req.body?.combo);
  if (!combo) {
    return res.status(400).json({ error: 'Combo is required' });
  }

  const state = readState();
  if (state.combinations.some((c) => c.combo === combo)) {
    return res.status(409).json({ error: 'Combo already exists' });
  }

  const created = {
    id: state.nextCombinationId++,
    combo,
    winner: '',
    hits: 0,
    enabled: true,
    lastHit: null
  };
  state.combinations.push(created);
  writeState(state);
  return res.status(201).json({ combination: created });
});

app.delete('/api/combinations/by-text', (req, res) => {
  const combo = normalizeCombo(req.body?.combo);
  if (!combo) {
    return res.status(400).json({ error: 'Combo is required' });
  }

  const state = readState();
  const before = state.combinations.length;
  state.combinations = state.combinations.filter((c) => c.combo !== combo);

  if (state.combinations.length === before) {
    return res.status(404).json({ error: 'Combo not found' });
  }

  if (!state.combinations.some((c) => c.id === state.lastComboId)) {
    state.lastComboId = null;
  }

  writeState(state);
  return res.json({ ok: true });
});

app.post('/api/combinations/shuffle', (req, res) => {
  const state = readState();
  for (let i = state.combinations.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.combinations[i], state.combinations[j]] = [state.combinations[j], state.combinations[i]];
  }
  writeState(state);
  res.json({ ok: true });
});

app.post('/api/reset/defaults', (req, res) => {
  const state = readState();
  state.combinations = DEFAULT_COMBINATIONS.map((c) => ({ ...c }));
  state.nextCombinationId = state.combinations.length + 1;
  state.spins = [];
  state.nextSpinId = 1;
  state.lastComboId = null;
  writeState(state);
  res.json({ ok: true });
});

app.post('/api/reset/stats', (req, res) => {
  const state = readState();
  state.combinations = state.combinations.map((c) => ({
    ...c,
    hits: 0,
    lastHit: null
  }));
  state.spins = [];
  state.nextSpinId = 1;
  state.lastComboId = null;
  writeState(state);
  res.json({ ok: true });
});

app.patch('/api/settings', (req, res) => {
  const allowed = [
    'reelSpeedMs',
    'bgMusicVolume',
    'spinSoundVolume',
    'jackpotSoundVolume',
    'jackpotSoundLoop'
  ];
  const state = readState();

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      state.settings[key] = req.body[key];
    }
  }

  writeState(state);
  res.json({ ok: true, settings: state.settings });
});

app.post('/api/upload/background', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }
  const state = readState();
  removeOldFile(state.settings.backgroundImageUrl);
  state.settings.backgroundImageUrl = publicPathFor(req.file.path);
  writeState(state);
  return res.json({ url: state.settings.backgroundImageUrl });
});

app.delete('/api/upload/background', (req, res) => {
  const state = readState();
  removeOldFile(state.settings.backgroundImageUrl);
  state.settings.backgroundImageUrl = '';
  writeState(state);
  res.json({ ok: true });
});

app.post('/api/upload/audio/:type', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const type = req.params.type;
  const keyMap = {
    bg: 'bgMusicUrl',
    spin: 'spinSoundUrl',
    jackpot: 'jackpotSoundUrl'
  };
  const settingKey = keyMap[type];
  if (!settingKey) {
    return res.status(400).json({ error: 'Unknown type' });
  }

  const state = readState();
  removeOldFile(state.settings[settingKey]);
  state.settings[settingKey] = publicPathFor(req.file.path);
  writeState(state);
  return res.json({ url: state.settings[settingKey] });
});

app.delete('/api/upload/audio/:type', (req, res) => {
  const type = req.params.type;
  const keyMap = {
    bg: 'bgMusicUrl',
    spin: 'spinSoundUrl',
    jackpot: 'jackpotSoundUrl'
  };
  const settingKey = keyMap[type];
  if (!settingKey) {
    return res.status(400).json({ error: 'Unknown type' });
  }

  const state = readState();
  removeOldFile(state.settings[settingKey]);
  state.settings[settingKey] = '';
  writeState(state);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureDirs();
readState();

app.listen(PORT, () => {
  console.log(`Casino 777 server is running on http://0.0.0.0:${PORT}`);
});
