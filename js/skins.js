/** Skin palette definitions */

export const SKINS = [
  { id: 'coral', name: 'Coral', colors: ['#ff6b7a', '#ff3d55'], price: 0, unlock: 'start' },
  { id: 'cyan', name: 'Cyan', colors: ['#5ef0e4', '#2ee6d6'], price: 0, unlock: 'start' },
  { id: 'gold', name: 'Gold', colors: ['#ffe08a', '#ffd166'], price: 120, unlock: 'coins' },
  { id: 'lime', name: 'Lime', colors: ['#b8f74a', '#8fd91a'], price: 150, unlock: 'coins' },
  { id: 'magma', name: 'Magma', colors: ['#ff8a4c', '#ff4d2e'], price: 200, unlock: 'coins' },
  { id: 'ocean', name: 'Ocean', colors: ['#4db7ff', '#1e7fff'], price: 200, unlock: 'coins' },
  { id: 'violet', name: 'Violet', colors: ['#c49bff', '#9b5cff'], price: 250, unlock: 'coins' },
  { id: 'mint', name: 'Mint', colors: ['#9bffd0', '#3dffb0'], price: 180, unlock: 'coins' },
  { id: 'sunset', name: 'Sunset', colors: ['#ff9a6c', '#ff5c8a'], price: 280, unlock: 'coins' },
  { id: 'ice', name: 'Ice', colors: ['#e8f7ff', '#a8d8ff'], price: 220, unlock: 'coins' },
  { id: 'ember', name: 'Ember', colors: ['#ffb347', '#ff6b00'], price: 300, unlock: 'coins' },
  { id: 'neon', name: 'Neon', colors: ['#39ff14', '#00e5ff'], price: 350, unlock: 'rv' },
  { id: 'candy', name: 'Candy', colors: ['#ff71ce', '#01cdfe'], price: 0, unlock: 'rv' },
  { id: 'metal', name: 'Metal', colors: ['#d0d5dd', '#6b7280'], price: 400, unlock: 'coins' },
  { id: 'aurora', name: 'Aurora', colors: ['#00ffa3', '#00c2ff', '#ff4ecd'], price: 0, unlock: 'pack' },
  { id: 'plasma', name: 'Plasma', colors: ['#ff00cc', '#3333ff'], price: 0, unlock: 'pack' },
];

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function skinGradient(ctx, skin, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  const cols = skin.colors;
  cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
  return g;
}
