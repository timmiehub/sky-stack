/** i18n dictionaries + language resolve */

const DICTS = {
  ru: {
    tagline: 'Строй выше. Не промахнись.',
    best: 'Рекорд',
    play: 'Играть',
    shop: 'Магазин',
    howToPlay: 'Как играть',
    dailyChallenge: 'Ежедневный челлендж',
    dailyHeight: 'Набери высоту {n}',
    dailyPerfect: 'Собери {n} идеальных стеков',
    dailyDone: 'Выполнено! +{coins}',
    tapToDrop: 'Тапни, чтобы поставить',
    gameOver: 'Конец раунда',
    score: 'Счёт',
    earned: 'Монеты',
    continueWatch: 'Продолжить за видео',
    doubleCoins: 'Удвоить монеты за видео',
    retry: 'Ещё раз',
    menu: 'Меню',
    skins: 'Скины',
    coins: 'Монеты',
    special: 'Особое',
    gotIt: 'Понятно',
    buy: 'Купить',
    equip: 'Надеть',
    equipped: 'Надето',
    watchAd: 'Открыть за видео',
    noAds: 'Без interstitial',
    noAdsOwned: 'Куплено',
    packSmall: 'Пачка монет',
    packMedium: 'Мешок монет',
    packLarge: 'Сундук монет',
    skinPack: 'Набор скинов',
    how1: 'Тапни или кликни, чтобы уронить движущийся блок на башню.',
    how2: 'Чем точнее совпадение — тем шире остаётся блок. Идеал даёт комбо.',
    how3: 'Если блок полностью промахнулся — игра окончена.',
    how4: 'Скорость растёт с высотой. Бей свой рекорд!',
    notEnough: 'Не хватает монет',
    adPlaying: 'Идёт реклама…',
  },
  en: {
    tagline: 'Build higher. Never miss.',
    best: 'Best',
    play: 'Play',
    shop: 'Shop',
    howToPlay: 'How to play',
    dailyChallenge: 'Daily Challenge',
    dailyHeight: 'Reach height {n}',
    dailyPerfect: 'Land {n} perfect stacks',
    dailyDone: 'Done! +{coins}',
    tapToDrop: 'Tap to drop',
    gameOver: 'Round over',
    score: 'Score',
    earned: 'Earned',
    continueWatch: 'Continue for video',
    doubleCoins: 'Double coins for video',
    retry: 'Retry',
    menu: 'Menu',
    skins: 'Skins',
    coins: 'Coins',
    special: 'Special',
    gotIt: 'Got it',
    buy: 'Buy',
    equip: 'Equip',
    equipped: 'Equipped',
    watchAd: 'Unlock for video',
    noAds: 'No interstitial',
    noAdsOwned: 'Owned',
    packSmall: 'Coin pack',
    packMedium: 'Coin bag',
    packLarge: 'Coin chest',
    skinPack: 'Skin pack',
    how1: 'Tap or click to drop the moving block onto the tower.',
    how2: 'Better alignment keeps more width. Perfect hits give combos.',
    how3: 'A full miss ends the run.',
    how4: 'Speed rises with height. Beat your best!',
    notEnough: 'Not enough coins',
    adPlaying: 'Ad playing…',
  },
};

const CIS = new Set(['ru', 'be', 'kk', 'uk', 'uz']);

let lang = 'ru';
let dict = DICTS.ru;

export function resolveLang(sdkLang) {
  const code = (sdkLang || navigator.language || 'ru').slice(0, 2).toLowerCase();
  lang = CIS.has(code) || code === 'ru' ? 'ru' : 'en';
  dict = DICTS[lang];
  return lang;
}

export function t(key, vars = {}) {
  let s = dict[key] ?? DICTS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

export function getLang() {
  return lang;
}

export function applyDomI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}
