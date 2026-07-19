/** Persist progress: localStorage + optional Yandex player cloud */

const KEY = 'sky_stack_v1';

const DEFAULT = {
  best: 0,
  coins: 0,
  unlockedSkins: ['coral', 'cyan'],
  equippedSkin: 'coral',
  noAds: false,
  tutorialDone: false,
  daily: { date: '', type: 'height', target: 20, progress: 0, claimed: false },
  totalPlays: 0,
};

let data = { ...DEFAULT, unlockedSkins: [...DEFAULT.unlockedSkins] };
let cloudSaver = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = {
        ...DEFAULT,
        ...parsed,
        unlockedSkins: Array.isArray(parsed.unlockedSkins)
          ? [...new Set([...DEFAULT.unlockedSkins, ...parsed.unlockedSkins])]
          : [...DEFAULT.unlockedSkins],
        daily: { ...DEFAULT.daily, ...(parsed.daily || {}) },
      };
    }
  } catch {
    data = { ...DEFAULT, unlockedSkins: [...DEFAULT.unlockedSkins] };
  }
  ensureDaily();
  return data;
}

export function get() {
  return data;
}

function persistLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function save() {
  persistLocal();
  if (cloudSaver) {
    cloudSaver({ ...data });
  }
}

export function setCloudSaver(fn) {
  cloudSaver = fn;
}

export function mergeCloud(remote) {
  if (!remote || typeof remote !== 'object') return data;
  data.best = Math.max(data.best || 0, remote.best || 0);
  data.coins = Math.max(data.coins || 0, remote.coins || 0);
  data.noAds = !!(data.noAds || remote.noAds);
  data.tutorialDone = !!(data.tutorialDone || remote.tutorialDone);
  const skins = new Set([
    ...(data.unlockedSkins || []),
    ...(remote.unlockedSkins || []),
  ]);
  data.unlockedSkins = [...skins];
  if (remote.equippedSkin && data.unlockedSkins.includes(remote.equippedSkin)) {
    data.equippedSkin = remote.equippedSkin;
  }
  persistLocal();
  return data;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function ensureDaily() {
  const today = todayStr();
  if (data.daily.date !== today) {
    const types = ['height', 'perfect'];
    const type = types[Math.floor(Math.random() * types.length)];
    data.daily = {
      date: today,
      type,
      target: type === 'height' ? 15 + Math.floor(Math.random() * 20) : 5 + Math.floor(Math.random() * 8),
      progress: 0,
      claimed: false,
    };
    persistLocal();
  }
  return data.daily;
}

export function updateDailyProgress(run) {
  ensureDaily();
  if (data.daily.claimed) return data.daily;
  if (data.daily.type === 'height') {
    data.daily.progress = Math.max(data.daily.progress, run.score || 0);
  } else {
    data.daily.progress = Math.max(data.daily.progress, run.perfects || 0);
  }
  if (data.daily.progress >= data.daily.target && !data.daily.claimed) {
    data.daily.claimed = true;
    data.coins += 50;
  }
  save();
  return data.daily;
}

export function addCoins(n) {
  data.coins = Math.max(0, (data.coins || 0) + n);
  save();
  return data.coins;
}

export function spendCoins(n) {
  if (data.coins < n) return false;
  data.coins -= n;
  save();
  return true;
}

export function setBest(score) {
  if (score > data.best) {
    data.best = score;
    save();
    return true;
  }
  return false;
}

export function unlockSkin(id) {
  if (!data.unlockedSkins.includes(id)) {
    data.unlockedSkins.push(id);
    save();
  }
}

export function equipSkin(id) {
  if (data.unlockedSkins.includes(id)) {
    data.equippedSkin = id;
    save();
    return true;
  }
  return false;
}

export function setNoAds(v) {
  data.noAds = !!v;
  save();
}

export function markTutorial() {
  data.tutorialDone = true;
  save();
}

export function incPlays() {
  data.totalPlays = (data.totalPlays || 0) + 1;
  save();
}
