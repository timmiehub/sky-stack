/** Procedural SFX via Web Audio — no external files needed */

let ctx = null;
let muted = false;
let unlocked = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
}

export function setMuted(v) {
  muted = !!v;
  if (muted && ctx) {
    try {
      ctx.suspend();
    } catch {
      /* */
    }
  } else if (!muted && ctx && unlocked) {
    try {
      ctx.resume();
    } catch {
      /* */
    }
  }
}

export function isMuted() {
  return muted;
}

export function pauseAll() {
  if (ctx && ctx.state === 'running') {
    try {
      ctx.suspend();
    } catch {
      /* */
    }
  }
}

export function resumeAll() {
  if (muted || !unlocked) return;
  if (ctx && ctx.state === 'suspended') {
    try {
      ctx.resume();
    } catch {
      /* */
    }
  }
}

function beep({ freq = 440, dur = 0.08, type = 'square', gain = 0.08, slide = 0 }) {
  if (muted) return;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) {
    o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + dur);
  }
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function playPlace(perfect = false) {
  if (perfect) {
    beep({ freq: 520, dur: 0.07, type: 'sine', gain: 0.1 });
    setTimeout(() => beep({ freq: 780, dur: 0.1, type: 'sine', gain: 0.09 }), 40);
  } else {
    beep({ freq: 280, dur: 0.06, type: 'triangle', gain: 0.07 });
  }
}

export function playMiss() {
  beep({ freq: 160, dur: 0.2, type: 'sawtooth', gain: 0.06, slide: -80 });
}

export function playClick() {
  beep({ freq: 660, dur: 0.04, type: 'square', gain: 0.04 });
}

export function playCoin() {
  beep({ freq: 880, dur: 0.05, type: 'sine', gain: 0.07 });
  setTimeout(() => beep({ freq: 1175, dur: 0.08, type: 'sine', gain: 0.06 }), 50);
}

export function playUnlock() {
  beep({ freq: 400, dur: 0.08, type: 'sine', gain: 0.08, slide: 200 });
}
