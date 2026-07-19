import { t, applyDomI18n } from './i18n.js';
import * as storage from './storage.js';
import { SKINS } from './skins.js';
import * as audio from './audio.js';
import * as ya from './yandex.js';
import { TV_ICON_SVG } from './icons.js';

const screens = {
  boot: () => document.getElementById('screen-boot'),
  menu: () => document.getElementById('screen-menu'),
  hud: () => document.getElementById('screen-hud'),
  over: () => document.getElementById('screen-over'),
  shop: () => document.getElementById('screen-shop'),
  how: () => document.getElementById('screen-how'),
};

let shopTab = 'skins';
let catalogCache = [];
let handlers = {};
let adShowing = false;

export function setHandlers(h) {
  handlers = h;
}

export function isAdShowing() {
  return adShowing;
}

export function setAdShowing(v) {
  adShowing = !!v;
  const el = document.getElementById('ad-block');
  if (el) {
    el.classList.toggle('hidden', !adShowing);
    el.setAttribute('aria-hidden', adShowing ? 'false' : 'true');
  }
  document.body.classList.toggle('ad-showing', adShowing);
}

export function fillTvSlots(root = document) {
  root.querySelectorAll('.tv-slot').forEach((slot) => {
    if (!slot.dataset.filled) {
      slot.innerHTML = TV_ICON_SVG;
      slot.dataset.filled = '1';
    }
  });
}

function makeRewardBtnContent(labelText) {
  const wrap = document.createElement('span');
  wrap.className = 'btn-reward-inner';
  wrap.innerHTML = `${TV_ICON_SVG}<span class="btn-reward-label"></span>`;
  wrap.querySelector('.btn-reward-label').textContent = labelText;
  return wrap;
}

export function showScreen(name) {
  Object.keys(screens).forEach((k) => {
    const el = screens[k]();
    if (!el) return;
    if (k === name) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  if (name === 'menu' || name === 'over' || name === 'shop' || name === 'how') {
    ya.showStickyBanner(true);
  } else if (name === 'hud') {
    ya.showStickyBanner(false);
  }
  handlers.onLayoutForScreen?.(name);
}

export function setBootProgress(p) {
  const fill = document.getElementById('boot-fill');
  if (fill) fill.style.width = `${Math.round(p * 100)}%`;
}

export function showToast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

export function refreshI18n() {
  applyDomI18n();
  fillTvSlots();
  const list = document.getElementById('how-list');
  if (list) {
    list.innerHTML = '';
    ['how1', 'how2', 'how3', 'how4'].forEach((key) => {
      const li = document.createElement('li');
      li.textContent = t(key);
      list.appendChild(li);
    });
  }
  refreshDaily();
  updateMuteBtn();
}

function setCoins(elId, value) {
  const el = document.getElementById(elId);
  if (el) el.textContent = String(value);
}

export function refreshMenu() {
  const d = storage.get();
  document.getElementById('menu-best').textContent = String(d.best);
  setCoins('menu-coins-val', d.coins);
  setCoins('shop-coins-val', d.coins);
  refreshDaily();
  updateMuteBtn();
}

export function refreshDaily() {
  const daily = storage.ensureDaily();
  const desc = document.getElementById('daily-desc');
  const fill = document.getElementById('daily-fill');
  if (!desc || !fill) return;
  if (daily.claimed) {
    desc.textContent = t('dailyDone', { coins: 50 });
    fill.style.width = '100%';
  } else {
    const key = daily.type === 'height' ? 'dailyHeight' : 'dailyPerfect';
    desc.textContent = `${t(key, { n: daily.target })} (${daily.progress}/${daily.target})`;
    fill.style.width = `${Math.min(100, (daily.progress / daily.target) * 100)}%`;
  }
}

export function updateHud(score, combo) {
  const scoreEl = document.getElementById('hud-score');
  const comboEl = document.getElementById('hud-combo');
  const hint = document.getElementById('hud-hint');
  if (scoreEl) {
    scoreEl.textContent = String(score);
    scoreEl.style.animation = 'none';
    void scoreEl.offsetWidth;
    scoreEl.style.animation = '';
  }
  if (comboEl) {
    if (combo >= 2) {
      comboEl.classList.remove('hidden');
      comboEl.textContent = `x${combo}`;
    } else {
      comboEl.classList.add('hidden');
    }
  }
  if (hint) {
    if (score === 0) hint.classList.remove('hidden');
    else hint.classList.add('hidden');
  }
}

export function showGameOver(result) {
  document.getElementById('over-score').textContent = String(result.score);
  document.getElementById('over-best').textContent = String(storage.get().best);
  document.getElementById('over-coins').textContent = `+${result.coinsEarned}`;

  const cont = document.getElementById('btn-continue');
  if (result.continued) cont.classList.add('hidden');
  else cont.classList.remove('hidden');

  const dbl = document.getElementById('btn-double');
  dbl.disabled = !!result.doubled;
  fillTvSlots();
  showScreen('over');
}

export function updateMuteBtn() {
  const btn = document.getElementById('btn-mute');
  if (!btn) return;
  const muted = audio.isMuted();
  btn.innerHTML = muted
    ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>`
    : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>`;
  btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
}

export function setCatalog(catalog) {
  catalogCache = catalog || [];
}

function productPriceLabel(id, fallback) {
  const p = catalogCache.find((c) => c.id === id);
  if (p) {
    const price = p.price || p.priceValue || '';
    const curr = p.priceCurrencyCode || '';
    return `${price} ${curr}`.trim() || fallback;
  }
  return fallback;
}

export function renderShop() {
  const d = storage.get();
  setCoins('shop-coins-val', d.coins);
  const root = document.getElementById('shop-content');
  root.innerHTML = '';

  if (shopTab === 'skins') {
    SKINS.forEach((skin) => {
      const owned = d.unlockedSkins.includes(skin.id);
      const equipped = d.equippedSkin === skin.id;
      const item = document.createElement('div');
      item.className = `shop-item${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}`;
      const preview = document.createElement('div');
      preview.className = 'skin-preview';
      preview.style.background = `linear-gradient(90deg, ${skin.colors.join(',')})`;
      const name = document.createElement('div');
      name.className = 'shop-item-name';
      name.textContent = skin.name;
      const price = document.createElement('div');
      price.className = 'shop-item-price';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';

      if (equipped) {
        price.textContent = t('equipped');
        btn.textContent = t('equipped');
        btn.disabled = true;
      } else if (owned) {
        price.textContent = '';
        btn.textContent = t('equip');
        btn.onclick = () => {
          audio.playClick();
          storage.equipSkin(skin.id);
          handlers.onEquipSkin?.(skin.id);
          renderShop();
        };
      } else if (skin.unlock === 'rv') {
        price.textContent = t('watchAd');
        btn.className = 'btn btn-reward';
        btn.appendChild(makeRewardBtnContent(t('watchAd')));
        btn.onclick = () => handlers.onUnlockSkinRv?.(skin.id);
      } else if (skin.unlock === 'pack') {
        price.textContent = t('skinPack');
        btn.textContent = t('buy');
        btn.onclick = () => handlers.onBuyProduct?.(ya.PRODUCT_IDS.skin_pack);
      } else {
        price.textContent = `${skin.price}`;
        btn.textContent = t('buy');
        btn.onclick = () => {
          if (storage.spendCoins(skin.price)) {
            audio.playUnlock();
            storage.unlockSkin(skin.id);
            storage.equipSkin(skin.id);
            handlers.onEquipSkin?.(skin.id);
            renderShop();
            refreshMenu();
          } else {
            showToast(t('notEnough'));
          }
        };
      }

      item.append(preview, name, price, btn);
      root.appendChild(item);
    });
  } else if (shopTab === 'coins') {
    const packs = [
      { id: ya.PRODUCT_IDS.coins_small, coins: 200, label: 'packSmall' },
      { id: ya.PRODUCT_IDS.coins_medium, coins: 600, label: 'packMedium' },
      { id: ya.PRODUCT_IDS.coins_large, coins: 1500, label: 'packLarge' },
    ];
    packs.forEach((pack) => {
      const item = document.createElement('div');
      item.className = 'shop-item shop-wide';
      item.innerHTML = `<div class="shop-item-name">${t(pack.label)}</div>
        <div class="shop-item-price">+${pack.coins} · ${productPriceLabel(pack.id, 'IAP')}</div>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = t('buy');
      btn.onclick = () => handlers.onBuyProduct?.(pack.id);
      item.appendChild(btn);
      root.appendChild(item);
    });
  } else {
    const item = document.createElement('div');
    item.className = 'shop-item shop-wide';
    const owned = storage.get().noAds;
    item.innerHTML = `<div class="shop-item-name">${t('noAds')}</div>
      <div class="shop-item-price">${owned ? t('noAdsOwned') : productPriceLabel(ya.PRODUCT_IDS.no_ads, 'IAP')}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = owned ? t('noAdsOwned') : t('buy');
    btn.disabled = owned;
    btn.onclick = () => handlers.onBuyProduct?.(ya.PRODUCT_IDS.no_ads);
    item.appendChild(btn);
    root.appendChild(item);

    const pack = document.createElement('div');
    pack.className = 'shop-item shop-wide';
    pack.innerHTML = `<div class="shop-item-name">${t('skinPack')}</div>
      <div class="shop-item-price">${productPriceLabel(ya.PRODUCT_IDS.skin_pack, 'IAP')}</div>`;
    const pbtn = document.createElement('button');
    pbtn.type = 'button';
    pbtn.className = 'btn btn-secondary';
    pbtn.textContent = t('buy');
    pbtn.onclick = () => handlers.onBuyProduct?.(ya.PRODUCT_IDS.skin_pack);
    pack.appendChild(pbtn);
    root.appendChild(pack);
  }
}

export function bindUI() {
  fillTvSlots();

  document.getElementById('btn-play').onclick = () => {
    if (adShowing) return;
    audio.unlockAudio();
    audio.playClick();
    handlers.onPlay?.();
  };
  document.getElementById('btn-shop').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    shopTab = 'skins';
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === shopTab);
    });
    renderShop();
    showScreen('shop');
  };
  document.getElementById('btn-how').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    showScreen('how');
  };
  document.getElementById('btn-how-close').onclick = () => {
    audio.playClick();
    showScreen('menu');
  };
  document.getElementById('btn-shop-back').onclick = () => {
    audio.playClick();
    refreshMenu();
    showScreen('menu');
    handlers.onBackMenu?.();
  };
  document.getElementById('btn-mute').onclick = () => {
    audio.setMuted(!audio.isMuted());
    updateMuteBtn();
    audio.playClick();
  };
  document.getElementById('btn-retry').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    handlers.onRetry?.();
  };
  document.getElementById('btn-menu').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    handlers.onMenuFromOver?.();
  };
  document.getElementById('btn-continue').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    handlers.onContinueRv?.();
  };
  document.getElementById('btn-double').onclick = () => {
    if (adShowing) return;
    audio.playClick();
    handlers.onDoubleRv?.();
  };

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      shopTab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((tEl) => {
        tEl.classList.toggle('active', tEl.dataset.tab === shopTab);
      });
      audio.playClick();
      renderShop();
    };
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
}
