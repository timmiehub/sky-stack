/** Premium block skins — textured assets + polish overlays */

export const SKINS = [
  { id: 'coral', name: 'Кирпич', nameEn: 'Brick', colors: ['#ff6b7a', '#ff3d55'], price: 0, unlock: 'start', tex: 'brick' },
  { id: 'cyan', name: 'Стекло', nameEn: 'Glass', colors: ['#7af0e8', '#2ee6d6'], price: 0, unlock: 'start', tex: 'glass' },
  { id: 'tiger', name: 'Тигр', nameEn: 'Tiger', colors: ['#ff9a3c', '#1a1208'], price: 180, unlock: 'coins', tex: 'tiger' },
  { id: 'leopard', name: 'Леопард', nameEn: 'Leopard', colors: ['#f0c878', '#3a2810'], price: 220, unlock: 'coins', tex: 'leopard' },
  { id: 'zebra', name: 'Зебра', nameEn: 'Zebra', colors: ['#f5f5f5', '#151515'], price: 200, unlock: 'coins', tex: 'zebra' },
  { id: 'wood', name: 'Дуб', nameEn: 'Oak', colors: ['#c48a4a', '#6b3e1a'], price: 160, unlock: 'coins', tex: 'wood' },
  { id: 'honey', name: 'Соты', nameEn: 'Honeycomb', colors: ['#ffd166', '#e09a20'], price: 240, unlock: 'coins', tex: 'honey' },
  { id: 'lava', name: 'Лава', nameEn: 'Lava', colors: ['#ff4d00', '#2a0600'], price: 320, unlock: 'coins', tex: 'lava' },
  { id: 'frost', name: 'Иней', nameEn: 'Frost', colors: ['#eaf7ff', '#7ec8ff'], price: 280, unlock: 'coins', tex: 'frost' },
  { id: 'carbon', name: 'Карбон', nameEn: 'Carbon', colors: ['#2a2e35', '#0d0f12'], price: 360, unlock: 'coins', tex: 'carbon' },
  { id: 'circuit', name: 'Схема', nameEn: 'Circuit', colors: ['#0a1f18', '#39ff14'], price: 420, unlock: 'coins', tex: 'circuit' },
  { id: 'galaxy', name: 'Галактика', nameEn: 'Galaxy', colors: ['#1a0a3a', '#ff4ecd'], price: 480, unlock: 'coins', tex: 'galaxy' },
  { id: 'marble', name: 'Мрамор', nameEn: 'Marble', colors: ['#f2f0ea', '#9a958c'], price: 400, unlock: 'coins', tex: 'marble' },
  { id: 'camo', name: 'Камуфляж', nameEn: 'Camo', colors: ['#5a6b3a', '#2d351c'], price: 260, unlock: 'coins', tex: 'camo' },
  { id: 'confetti', name: 'Конфетти', nameEn: 'Party', colors: ['#ff5a6a', '#ffd166'], price: 300, unlock: 'coins', tex: 'confetti' },
  { id: 'holo', name: 'Голограмма', nameEn: 'Holo', colors: ['#00ffa3', '#ff4ecd'], price: 550, unlock: 'coins', tex: 'holo' },
  { id: 'neon', name: 'Неон', nameEn: 'Neon', colors: ['#39ff14', '#00e5ff'], price: 0, unlock: 'rv', tex: 'neon' },
  { id: 'candy', name: 'Леденец', nameEn: 'Candy', colors: ['#ff71ce', '#ffffff'], price: 0, unlock: 'rv', tex: 'candy' },
  { id: 'aurora', name: 'Сияние', nameEn: 'Aurora', colors: ['#00ffa3', '#ff4ecd'], price: 0, unlock: 'pack', tex: 'aurora' },
  { id: 'dragon', name: 'Чешуя', nameEn: 'Dragon', colors: ['#1a5c3a', '#7dffb0'], price: 0, unlock: 'pack', tex: 'dragon' },
  { id: 'void', name: 'Пустота', nameEn: 'Void', colors: ['#050510', '#6b2bff'], price: 0, unlock: 'pack', tex: 'void' },
];

const textureCache = new Map();
let preloadPromise = null;

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function skinDisplayName(skin, lang = 'ru') {
  return lang === 'en' ? (skin.nameEn || skin.name) : skin.name;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Preload all skin textures once */
export function preloadSkins() {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(
    SKINS.map(async (skin) => {
      const key = skin.tex || skin.id;
      if (textureCache.has(key)) return;
      const img = await loadImage(`assets/skins/${key}.jpg`);
      textureCache.set(key, img);
    }),
  );
  return preloadPromise;
}

export function skinGradient(ctx, skin, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  skin.colors.forEach((c, i) => g.addColorStop(i / Math.max(1, skin.colors.length - 1), c));
  return g;
}

function roundPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawFallback(ctx, skin, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, skin.colors[0]);
  g.addColorStop(1, skin.colors[1] || skin.colors[0]);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawTextureCover(ctx, img, x, y, w, h, time = 0) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return false;

  // scroll holo / aurora slightly
  const scroll = ((time * 0.02) % iw);

  // cover-fit into block
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = x + (w - dw) / 2 - scroll * scale * 0.15;
  const dy = y + (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
  // wrap for scroll
  if (scroll > 0) {
    ctx.drawImage(img, dx + dw, dy, dw, dh);
  }
  return true;
}

function drawBevel(ctx, x, y, w, h) {
  // top highlight
  const hi = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  hi.addColorStop(0, 'rgba(255,255,255,0.42)');
  hi.addColorStop(0.35, 'rgba(255,255,255,0.12)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, w, h * 0.55);

  // bottom shade
  const sh = ctx.createLinearGradient(x, y + h * 0.45, x, y + h);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sh;
  ctx.fillRect(x, y + h * 0.45, w, h * 0.55);

  // inner rim
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  roundPath(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 5);
  ctx.stroke();
}

/**
 * Draw a premium skinned block.
 */
export function drawSkin(ctx, skin, x, y, w, h, time = 0) {
  const key = skin.tex || skin.id;
  const img = textureCache.get(key);
  const animated = key === 'holo' || key === 'aurora' || key === 'neon' || key === 'void';

  ctx.save();
  roundPath(ctx, x, y, w, h, 6);
  ctx.clip();

  if (img) {
    drawTextureCover(ctx, img, x, y, w, h, animated ? time : 0);
  } else {
    drawFallback(ctx, skin, x, y, w, h);
  }

  drawBevel(ctx, x, y, w, h);

  // specialty glow
  if (key === 'neon' || key === 'lava' || key === 'void') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 + (Math.sin(time * 0.004) + 1) * 0.04;
    ctx.fillStyle = skin.colors[0];
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
