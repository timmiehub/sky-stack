import { StackGame } from './game.js';
import * as storage from './storage.js';
import * as audio from './audio.js';
import * as ya from './yandex.js';
import { resolveLang } from './i18n.js';
import * as ui from './ui.js';
import { SKINS } from './skins.js';

/** Sticky banner usually sits on the right in Yandex Games iframe */
const STICKY_RIGHT_PX = 110;

const canvas = document.getElementById('game-canvas');
const game = new StackGame(canvas);

let lastResult = null;
let doubledThisRound = false;
let awardedCoins = 0;
let inputBound = false;

function applyStickyInset(enabled) {
  const px = enabled ? STICKY_RIGHT_PX : 0;
  game.setRightInset(px);
  document.documentElement.style.setProperty('--sticky-right', `${px}px`);
}

function bindInput() {
  if (inputBound) return;
  inputBound = true;

  const drop = (e) => {
    if (ui.isAdShowing()) return;
    if (game.state !== 'playing') return;
    e.preventDefault();
    game.drop();
  };

  canvas.addEventListener('pointerdown', drop, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (ui.isAdShowing()) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (game.state === 'playing') {
        e.preventDefault();
        game.drop();
      }
    }
  });
}

function grantProduct(productId) {
  switch (productId) {
    case ya.PRODUCT_IDS.coins_small:
      storage.addCoins(200);
      audio.playCoin();
      break;
    case ya.PRODUCT_IDS.coins_medium:
      storage.addCoins(600);
      audio.playCoin();
      break;
    case ya.PRODUCT_IDS.coins_large:
      storage.addCoins(1500);
      audio.playCoin();
      break;
    case ya.PRODUCT_IDS.skin_pack:
      SKINS.filter((s) => s.unlock === 'pack').forEach((s) => storage.unlockSkin(s.id));
      audio.playUnlock();
      break;
    case ya.PRODUCT_IDS.no_ads:
      storage.setNoAds(true);
      audio.playUnlock();
      break;
    default:
      break;
  }
  ui.refreshMenu();
  ui.renderShop();
}

async function buyProduct(productId) {
  const purchase = await ya.purchase(productId);
  if (!purchase) return;
  grantProduct(productId);
  if (purchase.purchaseToken) {
    await ya.consume(purchase.purchaseToken);
  }
}

async function runRewarded() {
  ui.setAdShowing(true);
  audio.pauseAll();
  ya.gameplayStop();
  try {
    return await ya.showRewarded();
  } finally {
    ui.setAdShowing(false);
    audio.resumeAll();
  }
}

async function runInterstitial(noAds) {
  ui.setAdShowing(true);
  audio.pauseAll();
  ya.gameplayStop();
  try {
    return await ya.showInterstitial({ noAds });
  } finally {
    ui.setAdShowing(false);
    audio.resumeAll();
  }
}

function startPlay() {
  doubledThisRound = false;
  awardedCoins = 0;
  lastResult = null;
  storage.incPlays();
  game.setSkin(storage.get().equippedSkin);
  game.stopLoop();

  // Hide sticky first, then resize & center tower in full width
  ya.showStickyBanner(false);
  applyStickyInset(false);
  ui.showScreen('hud');
  ui.updateHud(0, 0);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      game.resize();
      applyStickyInset(false);
      ya.gameplayStart();
      game.start();
      if (!storage.get().tutorialDone) storage.markTutorial();
    });
  });
}

function enterMenuVisuals() {
  applyStickyInset(true);
  game.resize();
  game.startIdle();
  ya.showStickyBanner(true);
}

async function goMenuAfterOver() {
  const d = storage.get();
  await runInterstitial(d.noAds);
  ui.refreshMenu();
  ui.showScreen('menu');
  ya.gameplayStop();
  enterMenuVisuals();
}

ui.setHandlers({
  onLayoutForScreen: (name) => {
    if (name === 'hud') applyStickyInset(false);
    else applyStickyInset(true);
  },
  onPlay: () => startPlay(),
  onRetry: async () => {
    const d = storage.get();
    await runInterstitial(d.noAds);
    startPlay();
  },
  onMenuFromOver: () => goMenuAfterOver(),
  onBackMenu: () => enterMenuVisuals(),
  onEquipSkin: (id) => game.setSkin(id),
  onUnlockSkinRv: async (skinId) => {
    const res = await runRewarded();
    if (res.rewarded) {
      storage.unlockSkin(skinId);
      storage.equipSkin(skinId);
      game.setSkin(skinId);
      audio.playUnlock();
      ui.renderShop();
      ui.refreshMenu();
    }
  },
  onBuyProduct: (id) => buyProduct(id),
  onContinueRv: async () => {
    const res = await runRewarded();
    if (res.rewarded) {
      applyStickyInset(false);
      ui.showScreen('hud');
      ya.gameplayStart();
      game.continueRun();
    }
  },
  onDoubleRv: async () => {
    if (!lastResult || doubledThisRound) return;
    const res = await runRewarded();
    if (res.rewarded) {
      doubledThisRound = true;
      storage.addCoins(lastResult.coinsEarned);
      awardedCoins += lastResult.coinsEarned;
      lastResult.coinsEarned *= 2;
      lastResult.doubled = true;
      audio.playCoin();
      ui.showGameOver(lastResult);
    }
  },
});

game.onScore = (score, combo) => {
  ui.updateHud(score, combo);
};

game.onGameOver = (result) => {
  ya.gameplayStop();
  storage.setBest(result.score);
  const delta = Math.max(0, result.coinsEarned - awardedCoins);
  if (delta > 0) {
    storage.addCoins(delta);
    awardedCoins = result.coinsEarned;
  }
  storage.updateDailyProgress(result);
  lastResult = { ...result, doubled: false };
  game.keepDrawing();
  ui.showGameOver(lastResult);
  ui.refreshMenu();
};

function onVisibility() {
  if (document.hidden) {
    audio.pauseAll();
    if (game.state === 'playing') game.pause();
    ya.gameplayStop();
  } else {
    if (!ui.isAdShowing()) audio.resumeAll();
    if (game.state === 'playing' && !ui.isAdShowing()) {
      game.resume();
      ya.gameplayStart();
    }
  }
}

async function boot() {
  ui.setBootProgress(0.1);
  storage.load();
  ui.bindUI();
  bindInput();

  ui.setBootProgress(0.35);
  const init = await ya.initYandex();
  resolveLang(init.lang);
  ui.refreshI18n();

  storage.setCloudSaver((data) => {
    ya.savePlayerData(data);
  });

  const remote = await ya.loadPlayerData();
  if (remote) storage.mergeCloud(remote);

  ui.setBootProgress(0.55);

  const catalog = await ya.fetchCatalog();
  ui.setCatalog(catalog);

  await ya.processPendingPurchases(async (p) => {
    grantProduct(p.productID);
  });

  ui.setBootProgress(0.75);

  ya.onPauseResume({
    onPause: () => {
      audio.pauseAll();
      if (game.state === 'playing') game.pause();
      ya.gameplayStop();
    },
    onResume: () => {
      if (!ui.isAdShowing()) audio.resumeAll();
      if (game.state === 'playing' && !ui.isAdShowing()) {
        game.resume();
        ya.gameplayStart();
      }
    },
  });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', () => {
    audio.pauseAll();
    if (game.state === 'playing') game.pause();
  });
  window.addEventListener('focus', () => {
    if (!ui.isAdShowing()) audio.resumeAll();
    if (game.state === 'playing' && !ui.isAdShowing()) game.resume();
  });

  window.addEventListener('resize', () => {
    game.resize();
  });

  game.setSkin(storage.get().equippedSkin);
  game.resize();
  ui.setBootProgress(1);

  ui.refreshMenu();
  ui.showScreen('menu');
  enterMenuVisuals();
  ya.gameReady();
}

boot().catch((err) => {
  console.error(err);
  resolveLang(null);
  ui.refreshI18n();
  ui.refreshMenu();
  ui.showScreen('menu');
  game.resize();
  enterMenuVisuals();
  ya.gameReady();
});
