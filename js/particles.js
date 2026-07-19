/** Particle bursts for perfect stacks / miss */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const sp = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        size: 3 + Math.random() * 4,
        color,
        gravity: 0.12,
      });
    }
  }

  confetti(x, y, colors, count = 24) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: -3 - Math.random() * 5,
        life: 1,
        decay: 0.012 + Math.random() * 0.015,
        size: 2 + Math.random() * 5,
        color: colors[i % colors.length],
        gravity: 0.15,
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
  }
}
