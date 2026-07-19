/**
 * Yandex Games SDK wrapper with local mock fallback.
 */

let ysdk = null;
let payments = null;
let player = null;
let ready = false;
let lastInterstitial = 0;
const INTERSTITIAL_COOLDOWN_MS = 75000;

/**
 * PRODUCT IDs must match Yandex Games Console (see iap-ids.txt):
 * coins_small, coins_medium, coins_large, skin_pack, no_ads
 */
const PRODUCT_IDS = {
  coins_small: 'coins_small',
  coins_medium: 'coins_medium',
  coins_large: 'coins_large',
  skin_pack: 'skin_pack',
  no_ads: 'no_ads',
};

export { PRODUCT_IDS };

function isSdkAvailable() {
  return typeof window.YaGames !== 'undefined' && window.YaGames?.init;
}

export async function initYandex() {
  if (!isSdkAvailable()) {
    console.info('[Sky Stack] YaGames SDK missing — mock mode');
    ready = true;
    return { mock: true, lang: null };
  }

  try {
    ysdk = await window.YaGames.init();
    ready = true;

    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch {
      player = null;
    }

    try {
      payments = await ysdk.getPayments({ signed: false });
    } catch {
      payments = null;
    }

    return {
      mock: false,
      lang: ysdk.environment?.i18n?.lang || null,
      ysdk,
    };
  } catch (err) {
    console.warn('[Sky Stack] SDK init failed, mock mode', err);
    ready = true;
    return { mock: true, lang: null };
  }
}

export function gameReady() {
  try {
    ysdk?.features?.LoadingAPI?.ready?.();
  } catch {
    /* */
  }
}

export function gameplayStart() {
  try {
    ysdk?.features?.GameplayAPI?.start?.();
  } catch {
    /* */
  }
}

export function gameplayStop() {
  try {
    ysdk?.features?.GameplayAPI?.stop?.();
  } catch {
    /* */
  }
}

export function onPauseResume({ onPause, onResume }) {
  if (!ysdk?.on) return () => {};
  const pauseHandler = () => onPause?.();
  const resumeHandler = () => onResume?.();
  ysdk.on('game_api_pause', pauseHandler);
  ysdk.on('game_api_resume', resumeHandler);
  return () => {
    try {
      ysdk.off('game_api_pause', pauseHandler);
      ysdk.off('game_api_resume', resumeHandler);
    } catch {
      /* */
    }
  };
}

export function showStickyBanner(show = true) {
  try {
    if (!ysdk?.adv) return;
    if (show) {
      ysdk.adv.showBannerAdv?.();
    } else {
      ysdk.adv.hideBannerAdv?.();
    }
  } catch {
    /* */
  }
}

/**
 * Fullscreen interstitial with cooldown. Resolves when closed.
 * @param {{ noAds?: boolean, force?: boolean }} opts
 */
export function showInterstitial(opts = {}) {
  return new Promise((resolve) => {
    if (opts.noAds && !opts.force) {
      resolve({ shown: false, reason: 'no_ads' });
      return;
    }
    const now = Date.now();
    if (!opts.force && now - lastInterstitial < INTERSTITIAL_COOLDOWN_MS) {
      resolve({ shown: false, reason: 'cooldown' });
      return;
    }

    if (!ysdk?.adv?.showFullscreenAdv) {
      resolve({ shown: false, reason: 'mock' });
      return;
    }

    gameplayStop();
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {
          // звук глушит вызывающая сторона; стоп геймплея уже сделан
        },
        onClose: (wasShown) => {
          if (wasShown) lastInterstitial = Date.now();
          resolve({ shown: !!wasShown });
        },
        onError: () => resolve({ shown: false, reason: 'error' }),
      },
    });
  });
}

/**
 * Rewarded video. Resolves { rewarded: true/false }.
 */
export function showRewarded() {
  return new Promise((resolve) => {
    if (!ysdk?.adv?.showRewardedVideo) {
      // Local mock: grant reward for testing
      console.info('[Sky Stack] mock rewarded — grant');
      resolve({ rewarded: true, mock: true });
      return;
    }

    gameplayStop();
    let granted = false;
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {},
        onRewarded: () => {
          granted = true;
        },
        onClose: () => resolve({ rewarded: granted }),
        onError: () => resolve({ rewarded: false }),
      },
    });
  });
}

export async function loadPlayerData() {
  if (!player?.getData) return null;
  try {
    return await player.getData();
  } catch {
    return null;
  }
}

export async function savePlayerData(data) {
  if (!player?.setData) return;
  try {
    await player.setData(data, true);
  } catch {
    /* */
  }
}

export function getCurrency() {
  try {
    return {
      code: ysdk?.getPayments ? null : null,
    };
  } catch {
    return null;
  }
}

export async function fetchCatalog() {
  if (!payments?.getCatalog) return [];
  try {
    return await payments.getCatalog();
  } catch {
    return [];
  }
}

export async function purchase(productId) {
  if (!payments?.purchase) {
    console.info('[Sky Stack] mock purchase', productId);
    return { mock: true, productID: productId, purchaseToken: 'mock' };
  }
  try {
    const purchase = await payments.purchase({ id: productId });
    return purchase;
  } catch (err) {
    console.warn('purchase failed', err);
    return null;
  }
}

export async function consume(purchaseToken) {
  if (!payments?.consumePurchase || !purchaseToken || purchaseToken === 'mock') return true;
  try {
    await payments.consumePurchase(purchaseToken);
    return true;
  } catch {
    return false;
  }
}

export async function processPendingPurchases(onProduct) {
  if (!payments?.getPurchases) return;
  try {
    const list = await payments.getPurchases();
    for (const p of list || []) {
      await onProduct?.(p);
      await consume(p.purchaseToken);
    }
  } catch {
    /* */
  }
}

export function getYsdk() {
  return ysdk;
}

export function isReady() {
  return ready;
}
