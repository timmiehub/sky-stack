import { ParticleSystem } from './particles.js';
import { getSkin, drawSkin, preloadSkins } from './skins.js';
import * as audio from './audio.js';

const PERFECT_TOLERANCE = 4;
const MIN_WIDTH = 18;
const BLOCK_HEIGHT = 28;
const BASE_SPEED = 2.4;
const SPEED_STEP = 0.08;
const MAX_SPEED = 7.5;
/** Keep top block around this fraction of screen height (higher = lower on screen) */
const CAMERA_FOCUS = 0.58;
/** Max blocks kept in memory (bottom ones culled) */
const MAX_BLOCKS = 80;
/** How far past the stack the moving block may travel */
const MOVE_OVERHANG = 200;

export class StackGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = new ParticleSystem();
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this.running = false;
    this.paused = false;
    this.state = 'idle'; // idle | playing | over
    this.skinId = 'coral';
    this.score = 0;
    this.combo = 0;
    this.perfects = 0;
    this.coinsEarned = 0;
    this.continued = false;
    this.shake = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.blocks = [];
    this.current = null;
    this.falling = null;
    this.dir = 1;
    this.moveMin = 0;
    this.moveMax = 0;
    this.speed = BASE_SPEED;
    this.hue = 0;
    this.onScore = null;
    this.onGameOver = null;
    this.onPerfect = null;
    this._raf = 0;
    this._last = 0;
    this.bgStars = [];
    /** Sticky banner on the right eats visible space — center tower in remaining area */
    this.rightInset = 0;
    this.resize();
  }

  get playCenterX() {
    return (this.w - this.rightInset) / 2;
  }

  setRightInset(px) {
    this.rightInset = Math.max(0, Number(px) || 0);
  }

  async initAssets() {
    await preloadSkins();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.bgStars.length) this._initStars();
  }

  _initStars() {
    this.bgStars = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.5,
      a: 0.2 + Math.random() * 0.5,
    }));
  }

  setSkin(id) {
    this.skinId = id;
  }

  /** Keep the top of the tower near CAMERA_FOCUS of the viewport */
  _updateCameraToTop() {
    const top = this.blocks[this.blocks.length - 1];
    if (!top) return;
    // screenY = worldY + cameraY  →  cameraY = focusScreenY - worldY
    this.targetCameraY = this.h * CAMERA_FOCUS - top.y;
  }

  _cullBlocks() {
    if (this.blocks.length <= MAX_BLOCKS) return;
    const remove = this.blocks.length - MAX_BLOCKS;
    this.blocks.splice(0, remove);
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.perfects = 0;
    this.coinsEarned = 0;
    this.continued = false;
    this.shake = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.speed = BASE_SPEED;
    this.hue = Math.random() * 360;
    this.particles.clear();
    this.falling = null;

    const baseW = Math.min(Math.min(this.w - this.rightInset, this.w) * 0.55, 220);
    const baseX = this.playCenterX - baseW / 2;
    // Start lower on the screen
    const baseY = this.h * 0.84;

    this.blocks = [
      {
        x: baseX,
        y: baseY,
        w: baseW,
        h: BLOCK_HEIGHT,
        perfect: true,
        skinId: this.skinId,
      },
    ];

    this._updateCameraToTop();
    this.cameraY = this.targetCameraY;
    this._spawnMoving();
    this.state = 'playing';
    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this.onScore?.(this.score, this.combo);
    this._loop();
  }

  continueRun() {
    if (this.state !== 'over') return;
    this.continued = true;
    const top = this.blocks[this.blocks.length - 1];
    if (top && top.w < MIN_WIDTH) {
      top.w = Math.max(top.w, MIN_WIDTH + 10);
      top.x = Math.max(8, Math.min(top.x, this.w - top.w - 8));
    }
    this._spawnMoving();
    this._updateCameraToTop();
    this.state = 'playing';
    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this._loop();
  }

  _spawnMoving() {
    const top = this.blocks[this.blocks.length - 1];
    const w = top.w;
    const fromLeft = Math.random() > 0.5;
    this.dir = fromLeft ? 1 : -1;

    // Travel relative to the tower — wider than mobile, but not full desktop width
    const overhang = Math.min(MOVE_OVERHANG, Math.max(90, Math.min(this.w * 0.22, 260)));
    this.moveMin = top.x - overhang;
    this.moveMax = top.x + top.w + overhang - w;
    if (this.moveMax < this.moveMin) {
      const center = top.x + top.w / 2 - w / 2;
      this.moveMin = center - overhang;
      this.moveMax = center + overhang;
    }

    this.current = {
      x: fromLeft ? this.moveMin : this.moveMax,
      y: top.y - BLOCK_HEIGHT,
      w,
      h: BLOCK_HEIGHT,
      skinId: this.skinId,
    };
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.score * SPEED_STEP);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.running || this.state !== 'playing') return;
    this.paused = false;
    this._last = performance.now();
    this._loop();
  }

  stopLoop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  drop() {
    if (this.state !== 'playing' || this.paused || !this.current || this.falling) return;
    audio.unlockAudio();
    this.falling = { ...this.current, vy: 0 };
    this.current = null;
  }

  _resolveDrop() {
    const fall = this.falling;
    const top = this.blocks[this.blocks.length - 1];
    if (!fall || !top) return;

    const left = Math.max(fall.x, top.x);
    const right = Math.min(fall.x + fall.w, top.x + top.w);
    const overlap = right - left;

    if (overlap <= 0) {
      this.particles.burst(fall.x + fall.w / 2, fall.y + fall.h / 2, '#ff5a6a', 22);
      audio.playMiss();
      this.shake = 14;
      this.falling = null;
      this._gameOver();
      return;
    }

    const offset = Math.abs(fall.x - top.x);
    const perfect = offset <= PERFECT_TOLERANCE;

    let placed = {
      x: left,
      y: top.y - BLOCK_HEIGHT,
      w: overlap,
      h: BLOCK_HEIGHT,
      perfect,
      skinId: this.skinId,
    };

    if (perfect) {
      placed.x = top.x;
      placed.w = top.w;
      this.combo += 1;
      this.perfects += 1;
      this.particles.confetti(
        placed.x + placed.w / 2,
        placed.y,
        ['#ffd166', '#2ee6d6', '#ff5a6a', '#fff'],
        28,
      );
      audio.playPlace(true);
      this.onPerfect?.(this.combo);
    } else {
      this.combo = 0;
      const scrapX = fall.x < top.x ? fall.x : right;
      const scrapW = fall.w - overlap;
      if (scrapW > 2) {
        this.particles.burst(scrapX + scrapW / 2, fall.y + 10, '#ff8a9a', 10);
      }
      audio.playPlace(false);
      this.shake = 6;
    }

    if (placed.w < MIN_WIDTH) {
      this.blocks.push(placed);
      this.falling = null;
      this.score += 1;
      this.coinsEarned += 1;
      this._updateCameraToTop();
      this.onScore?.(this.score, this.combo);
      this.particles.burst(placed.x + placed.w / 2, placed.y, '#ff5a6a', 16);
      audio.playMiss();
      this.shake = 12;
      this._gameOver();
      return;
    }

    this.blocks.push(placed);
    this._cullBlocks();
    this.falling = null;
    this.score += 1;
    const bonus = perfect ? Math.min(5, 1 + this.combo) : 1;
    this.coinsEarned += bonus;
    this.hue = (this.hue + 12) % 360;

    this._updateCameraToTop();

    this.onScore?.(this.score, this.combo);
    this._spawnMoving();
  }

  _gameOver() {
    this.state = 'over';
    this.running = false;
    this.onGameOver?.({
      score: this.score,
      perfects: this.perfects,
      coinsEarned: this.coinsEarned,
      continued: this.continued,
    });
  }

  _loop = (now = performance.now()) => {
    if (!this.running) return;
    const dt = Math.min(32, now - this._last) / 16.67;
    this._last = now;
    if (!this.paused) this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  _update(dt) {
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.3) this.shake = 0;

    // Smooth camera follow (works for both positive and negative offsets)
    this.cameraY += (this.targetCameraY - this.cameraY) * Math.min(1, 0.12 * dt);

    if (this.current) {
      this.current.x += this.dir * this.speed * dt;
      if (this.current.x >= this.moveMax) {
        this.current.x = this.moveMax;
        this.dir = -1;
      } else if (this.current.x <= this.moveMin) {
        this.current.x = this.moveMin;
        this.dir = 1;
      }
    }

    if (this.falling) {
      this.falling.vy += 0.9 * dt;
      this.falling.y += this.falling.vy * dt;
      const top = this.blocks[this.blocks.length - 1];
      if (this.falling.y + this.falling.h >= top.y) {
        this.falling.y = top.y - this.falling.h;
        this._resolveDrop();
      }
    }

    this.particles.update();
  }

  _draw() {
    const ctx = this.ctx;
    const { w, h } = this;

    ctx.clearRect(0, 0, w, h);

    // background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, `hsl(${(this.hue + 200) % 360} 40% 14%)`);
    bg.addColorStop(0.55, '#0a1220');
    bg.addColorStop(1, '#050a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // stars (parallax)
    for (const s of this.bgStars) {
      ctx.globalAlpha = s.a * 0.7;
      ctx.fillStyle = '#cfe8ff';
      const sy = ((s.y * h * 2 + this.cameraY * 0.12) % h + h) % h;
      ctx.beginPath();
      ctx.arc(s.x * w, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // soft glow orb
    ctx.save();
    ctx.globalAlpha = 0.18;
    const orb = ctx.createRadialGradient(w * 0.5, h * 0.25, 10, w * 0.5, h * 0.25, w * 0.45);
    orb.addColorStop(0, '#2ee6d6');
    orb.addColorStop(1, 'transparent');
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;

    ctx.save();
    ctx.translate(sx, sy + this.cameraY);

    if (this.blocks.length) {
      const base = this.blocks[0];
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, base.y + BLOCK_HEIGHT, w, h * 2);
    }

    for (let i = 0; i < this.blocks.length; i++) {
      this._drawBlock(this.blocks[i], i === this.blocks.length - 1);
    }

    if (this.current) this._drawBlock(this.current, true, 0.92);
    if (this.falling) this._drawBlock(this.falling, true);

    this.particles.draw(ctx);
    ctx.restore();
  }

  _drawBlock(b, highlight = false, alpha = 1) {
    const ctx = this.ctx;
    const skin = getSkin(b.skinId || this.skinId);
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + 3, b.y + 5, b.w, b.h);

    drawSkin(ctx, skin, b.x, b.y, b.w, b.h, performance.now());

    if (b.perfect && highlight) {
      ctx.strokeStyle = 'rgba(255,209,102,0.9)';
      ctx.lineWidth = 2;
      roundRect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  startIdle() {
    this.state = 'idle';
    this.running = true;
    this.paused = false;
    this.blocks = [];
    this.current = null;
    this.falling = null;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.score = 0;
    this.particles.clear();

    const baseW = Math.min(Math.min(this.w - this.rightInset, this.w) * 0.5, 200);
    const y = this.h * 0.84;
    const palette = ['coral', 'tiger', 'lava', 'galaxy', 'holo', 'dragon'];
    for (let i = 0; i < 6; i++) {
      const shrink = i * 6;
      const bw = baseW - shrink;
      this.blocks.unshift({
        x: this.playCenterX - bw / 2 + Math.sin(i) * 4,
        y: y - i * BLOCK_HEIGHT,
        w: bw,
        h: BLOCK_HEIGHT,
        perfect: true,
        skinId: palette[i % palette.length],
      });
    }

    const top = this.blocks[this.blocks.length - 1];
    this.current = {
      x: 0,
      y: top.y - BLOCK_HEIGHT,
      w: top.w,
      h: BLOCK_HEIGHT,
      skinId: 'coral',
    };
    this.dir = 1;
    this.speed = 1.6;
    this._last = performance.now();
    this._loop();
  }

  keepDrawing() {
    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this._loop();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
