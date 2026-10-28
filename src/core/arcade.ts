// Arcade engine for the hero-and-objective games: lives, rounds, score and combo, limited charges, particles,
// screen shake, sound, and direct manipulation (drag handles on the canvas plus an accessible slider).
// A game keeps its rules in logic.ts and only draws its scene and reports each attempt through `resolve`.
import type { GameContext } from './types';
import { h } from './dom';
import { fitCanvas, pointerToLocal, startLoop } from './sim';
import type { Hero } from './labkit';

/** Arcade palette: the game screen is always dark, in light and dark mode, like a real game cabinet. */
export const PAL = { bg0: '#0b1030', bg1: '#222a66', grid: 'rgba(130,160,255,0.13)', cyan: '#4de1ff', yellow: '#ffd23f', pink: '#ff4d8d', green: '#5dff9a', white: '#f4f6ff', dim: '#8f9bd6', red: '#ff5a5a', orange: '#ff9b3d' };

/** Seconds the consequence of an attempt plays. */
export const RESOLVE = 2.4;
const BETWEEN = 0.9;

/** One heart left is 1 star, two is 2, three or more is 3. */
export function heartsToStars(hearts: number): 1 | 2 | 3 {
  return Math.max(1, Math.min(3, hearts)) as 1 | 2 | 3;
}

/** Points for a solved round: 100, +50 per unused charge, up to +50 for speed, multiplied by the streak. */
export function roundScore(o: { chargesLeft: number; seconds: number; streak: number }): number {
  const speed = Math.max(0, 50 - Math.floor(o.seconds * 2));
  const mult = 1 + 0.25 * Math.min(4, Math.max(0, o.streak));
  return Math.round((100 + 50 * Math.max(0, o.chargesLeft) + speed) * mult);
}

export type Phase = 'play' | 'resolve' | 'between' | 'over' | 'won';
type Sfx = 'blip' | 'ok' | 'bad' | 'win' | 'grab';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Floater { text: string; x: number; y: number; life: number; color: string }
export interface Handle {
  x: () => number;
  y: () => number;
  r: number;
  drag: (x: number, y: number) => void;
  enabled?: () => boolean;
}

export interface ArcadeOptions {
  W: number;
  H: number;
  aria: string;
  rounds: number;
  hearts?: number;
  /** Charges at the start of each round (a number for all rounds, or one per round). */
  charges?: number | number[];
  /** Called at the start of every round, with the round index from 0. */
  onRound: (round: number) => void;
}

export function createArcade(ctx: GameContext, hero: Hero, o: ArcadeOptions) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const canvas = h('canvas', { role: 'img', 'aria-label': o.aria });
  const g = fitCanvas(canvas, o.W, o.H);
  const banner = h('section', { class: 'panel hero' }, h('p', { class: 'hero-name' }, `${hero.name}, ${hero.role}`), h('p', null, hero.story), h('p', { class: 'objective' }, h('strong', null, 'Objective: '), hero.objective));
  const heartsEl = h('span', { class: 'hud-hearts' });
  const roundEl = h('span', { class: 'hud-round' });
  const scoreEl = h('span', { class: 'hud-score' });
  const comboEl = h('span', { class: 'hud-combo' });
  const chargeEl = h('span', { class: 'hud-charges' });
  let muted = false;
  const muteBtn = h('button', { class: 'btn small hud-mute', type: 'button', 'aria-label': 'Sound on', 'aria-pressed': 'false', onclick: () => {
    muted = !muted;
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
    muteBtn.setAttribute('aria-pressed', String(muted));
  } }, '🔊');
  const hud = h('div', { class: 'hud', role: 'status' }, heartsEl, roundEl, scoreEl, comboEl, chargeEl, muteBtn);
  const overlayTitle = h('p', { class: 'overlay-title' });
  const overlaySub = h('p', { class: 'overlay-sub' });
  const retry = h('button', { class: 'btn', type: 'button', 'aria-label': 'Try this level again', onclick: () => ctx.restart() }, 'Try again');
  const overlay = h('div', { class: 'overlay', hidden: true }, overlayTitle, overlaySub, retry);
  const stage = h('div', { class: 'stage' }, canvas, overlay);
  const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
  const hint = h('p', { class: 'muted note' });
  const controls = h('div', { class: 'lab-controls' });

  let hearts = o.hearts ?? 3;
  let round = 0;
  let score = 0;
  let streak = 0;
  let charges = 0;
  let phase: Phase = 'play';
  let clock = 0;
  let roundT = 0;
  let phaseT = 0;
  let resolveOk = false;
  let winSent = false;
  let shakeAmt = 0;
  let lastPoints = 0;
  let pending: { ok: boolean; text: string; x: number; y: number; delay: number } | null = null;
  function applyPending() {
    if (!pending) return;
    const { ok, text, x: px, y: py } = pending;
    pending = null;
    api.say(text, ok);
    if (ok) {
      lastPoints = roundScore({ chargesLeft: charges, seconds: roundT, streak });
      score += lastPoints;
      streak++;
      burst(px, py, PAL.green, 40, 220);
      burst(px, py, PAL.yellow, 20, 140);
      float(`+${lastPoints}`, px, py - 20, PAL.yellow);
      sound('ok');
    } else {
      hearts--;
      streak = 0;
      shake(9);
      burst(px, py, PAL.red, 22, 120);
      float('−1 ♥', px, py - 20, PAL.red);
      sound('bad');
    }
    hudUpdate();
  }
  let drawScene: (g: CanvasRenderingContext2D, t: number) => void = () => undefined;
  const parts: Particle[] = [];
  const floats: Floater[] = [];
  const handles: Handle[] = [];
  let dragging: Handle | null = null;
  let audio: AudioContext | null = null;

  const chargesFor = (r: number) => (Array.isArray(o.charges) ? (o.charges[r] ?? o.charges[o.charges.length - 1] ?? 0) : (o.charges ?? 0));

  function sound(kind: Sfx) {
    if (muted) return;
    try {
      const AC = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
      if (!AC) return;
      audio ??= new AC();
      const notes: Record<Sfx, [number, number, OscillatorType][]> = {
        blip: [[880, 0.07, 'sine']],
        grab: [[440, 0.04, 'sine']],
        ok: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.18, 'triangle']],
        bad: [[170, 0.22, 'sawtooth'], [120, 0.25, 'sawtooth']],
        win: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.1, 'triangle'], [1047, 0.3, 'triangle']],
      };
      let at = audio.currentTime;
      for (const [f, d, type] of notes[kind]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.06, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + d);
        osc.connect(gain).connect(audio.destination);
        osc.start(at);
        osc.stop(at + d);
        at += d * 0.9;
      }
    } catch {
      /* no audio: fine */
    }
  }

  function hudUpdate() {
    heartsEl.textContent = '♥'.repeat(Math.max(0, hearts)) + '♡'.repeat(Math.max(0, (o.hearts ?? 3) - hearts));
    heartsEl.setAttribute('aria-label', `Hearts left: ${hearts}`);
    roundEl.textContent = `Round ${Math.min(round + 1, o.rounds)} of ${o.rounds}`;
    scoreEl.textContent = `Score ${score}`;
    comboEl.textContent = streak >= 2 ? `Streak ×${1 + 0.25 * Math.min(4, streak)}` : '';
    chargeEl.textContent = chargesFor(round) > 0 ? `Charges ${'⚡'.repeat(charges)}${'·'.repeat(Math.max(0, chargesFor(round) - charges))}` : '';
    chargeEl.setAttribute('aria-label', `Charges left: ${charges}`);
  }
  function syncControls() {
    const live = phase === 'play';
    controls.querySelectorAll('button, input').forEach((el) => {
      if (live) el.removeAttribute('disabled');
      else el.setAttribute('disabled', '');
    });
    retry.removeAttribute('disabled');
  }
  function setPhase(p: Phase) {
    phase = p;
    phaseT = 0;
    syncControls();
    overlay.hidden = p !== 'over' && p !== 'won';
    retry.hidden = p !== 'over';
    canvas.dataset.phase = p;
  }

  function burst(x: number, y: number, color: string, n = 24, speed = 160) {
    if (reduce) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.7 + Math.random() * 0.6, max: 1.3, color, size: 2 + Math.random() * 3 });
    }
  }
  const float = (text: string, x: number, y: number, color: string = PAL.yellow) => floats.push({ text, x, y, life: 1.3, color });
  const shake = (px: number) => {
    if (!reduce) shakeAmt = Math.max(shakeAmt, px);
  };

  function startRound() {
    charges = chargesFor(round);
    roundT = 0;
    setPhase('play');
    hudUpdate();
    o.onRound(round);
  }

  const api = {
    banner,
    canvas,
    g,
    W: o.W,
    H: o.H,
    controls,
    hint,
    feedback,
    PAL,
    sound,
    burst,
    float,
    shake,
    get phase() {
      return phase;
    },
    get hearts() {
      return hearts;
    },
    get round() {
      return round;
    },
    get score() {
      return score;
    },
    get charges() {
      return charges;
    },
    get lastPoints() {
      return lastPoints;
    },
    /** Seconds since the round began. */
    get t() {
      return roundT;
    },
    /** Seconds since the attempt was committed (0 outside a resolve). */
    get rt() {
      return phase === 'resolve' ? phaseT : 0;
    },
    get clock() {
      return clock;
    },
    /** Seconds the current resolve has left to run, as 0..1 progress. */
    get progress() {
      return phase === 'resolve' ? Math.min(1, phaseT / RESOLVE) : 0;
    },
    say(text: string, good = false) {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    },
    /** Invalid input: tell the player, charge nothing. */
    freeNote(text: string) {
      api.say(`${text} That does not cost you anything.`);
    },
    /** Spend one charge; false (and a free note) if none are left. */
    spend(): boolean {
      if (charges <= 0) {
        api.freeNote('No charges left this round.');
        return false;
      }
      charges--;
      hudUpdate();
      sound('blip');
      return true;
    },
    /**
     * Commit an attempt. The scene plays its consequence for RESOLVE seconds; then the next round, a retry or game over.
     * The score, hearts, burst and message land `delay` seconds in (the moment of impact), so nothing is spoiled early.
     */
    resolve(ok: boolean, text: string, at?: { x: number; y: number }, delay = 0) {
      if (phase !== 'play') return;
      resolveOk = ok;
      setPhase('resolve');
      pending = { ok, text, x: at?.x ?? o.W / 2, y: at?.y ?? o.H / 2, delay };
      if (delay <= 0) applyPending();
    },
    /** A draggable thing on the canvas; it pulses until grabbed. */
    handle(hd: Handle) {
      handles.push(hd);
    },
    button(text: string, aria: string, fn: () => void, kind = '') {
      return h('button', { class: `btn ${kind}`.trim(), type: 'button', 'aria-label': aria, onclick: () => {
        if (phase === 'play') fn();
      } }, text);
    },
    /** A big slider with a live readout: the accessible twin of a drag handle. */
    slider(s: { aria: string; label: string; min: number; max: number; step: number; value: number; unit: string; text?: (v: number) => string; onInput: (v: number) => void }) {
      let lo = s.min;
      let hi = s.max;
      const out = h('span', { class: 'v-readout' });
      const input = h('input', { class: 'v-slider', type: 'range', min: lo, max: hi, step: s.step, value: s.value, 'aria-label': s.aria }) as HTMLInputElement;
      const show = () => (out.textContent = `${s.text ? s.text(Number(input.value)) : input.value} ${s.unit}`);
      input.addEventListener('input', () => {
        show();
        s.onInput(Number(input.value));
      });
      show();
      return {
        row: h('div', { class: 'control' }, h('span', { class: 'control-label' }, s.label), input, out),
        get: () => Number(input.value),
        /** Set from a drag or a new round; clamps and snaps to the step. */
        set(v: number) {
          const snapped = Math.round((Math.max(lo, Math.min(hi, v)) - lo) / s.step) * s.step + lo;
          input.value = String(Number(snapped.toFixed(6)));
          show();
          s.onInput(Number(input.value));
        },
        /** Change the range (for a new round). */
        range(min: number, max: number) {
          lo = min;
          hi = max;
          input.min = String(min);
          input.max = String(max);
        },
      };
    },
    /** Register the scene; call once, then mountAll(). */
    scene(fn: (g: CanvasRenderingContext2D, t: number) => void) {
      drawScene = fn;
    },
    mountAll() {
      ctx.root.append(banner, hud, stage, hint, controls, feedback);
      hudUpdate();
      syncControls();
    },
    /** Begin round 1 and run the loop; returns the cleanup function. */
    run(): () => void {
      startRound();
      return startLoop((dt) => {
        clock += dt;
        phaseT += dt;
        if (phase === 'play') roundT += dt;
        if (phase === 'resolve' && pending && phaseT >= pending.delay) applyPending();
        if (phase === 'resolve' && phaseT >= RESOLVE) {
          if (resolveOk) {
            if (round + 1 < o.rounds) {
              round++;
              roundEl.textContent = `Round ${round + 1} of ${o.rounds}`;
              setPhase('between');
              float(`Round ${round + 1}`, o.W / 2, o.H / 2, PAL.white);
            } else {
              setPhase('won');
              overlayTitle.textContent = 'Level clear!';
              overlaySub.textContent = `${'★'.repeat(heartsToStars(hearts))} · Score ${score}`;
              sound('win');
              burst(o.W / 2, o.H / 2, PAL.yellow, 60, 260);
              burst(o.W / 2, o.H / 3, PAL.pink, 40, 220);
            }
          } else if (hearts <= 0) {
            setPhase('over');
            overlayTitle.textContent = 'Out of hearts';
            overlaySub.textContent = `Score ${score}. Look at what went wrong, then try again.`;
          } else {
            setPhase('play');
          }
        } else if (phase === 'between' && phaseT >= BETWEEN) {
          startRound();
        } else if (phase === 'won' && phaseT >= 1.4 && !winSent) {
          winSent = true;
          ctx.win({ stars: heartsToStars(hearts) });
        }
        // particles and floaters
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 320 * dt;
          if (p.life <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i--) {
          floats[i].life -= dt;
          floats[i].y -= 34 * dt;
          if (floats[i].life <= 0) floats.splice(i, 1);
        }
        shakeAmt = Math.max(0, shakeAmt - dt * 24);
        // draw
        g.clearRect(0, 0, o.W, o.H);
        g.save();
        if (shakeAmt > 0) g.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
        const bg = g.createLinearGradient?.(0, 0, 0, o.H);
        if (bg) {
          bg.addColorStop(0, PAL.bg0);
          bg.addColorStop(1, PAL.bg1);
          g.fillStyle = bg;
        } else g.fillStyle = PAL.bg0;
        g.fillRect(-10, -10, o.W + 20, o.H + 20);
        g.strokeStyle = PAL.grid;
        g.lineWidth = 1;
        for (let x = 0; x <= o.W; x += 40) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, o.H);
          g.stroke();
        }
        for (let y = 0; y <= o.H; y += 40) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(o.W, y);
          g.stroke();
        }
        drawScene(g, clock);
        if (phase === 'play') {
          for (const hd of handles) {
            if (hd.enabled && !hd.enabled()) continue;
            const pulse = dragging === hd ? 1 : 0.5 + 0.5 * Math.sin(clock * 5);
            g.strokeStyle = PAL.yellow;
            g.globalAlpha = 0.35 + 0.65 * pulse;
            g.lineWidth = 3;
            g.beginPath();
            g.arc(hd.x(), hd.y(), hd.r + 3 + (dragging === hd ? 0 : pulse * 4), 0, Math.PI * 2);
            g.stroke();
            g.globalAlpha = 1;
          }
        }
        for (const p of parts) {
          g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
          g.fillStyle = p.color;
          g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        g.globalAlpha = 1;
        for (const f of floats) {
          g.globalAlpha = Math.max(0, Math.min(1, f.life));
          g.font = 'bold 20px system-ui, sans-serif';
          g.textAlign = 'center';
          g.fillStyle = f.color;
          g.fillText(f.text, f.x, f.y);
        }
        g.globalAlpha = 1;
        g.restore();
      });
    },
  };

  // pointer dragging of handles on the canvas
  const local = (e: PointerEvent) => pointerToLocal(e, canvas, o.W, o.H);
  canvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'play') return;
    const p = local(e);
    const hd = handles.find((x) => (!x.enabled || x.enabled()) && Math.hypot(p.x - x.x(), p.y - x.y()) <= x.r + 14);
    if (!hd) return;
    dragging = hd;
    canvas.setPointerCapture?.(e.pointerId);
    sound('grab');
    hd.drag(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || phase !== 'play') return;
    const p = local(e);
    dragging.drag(p.x, p.y);
  });
  const release = () => {
    dragging = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  return api;
}
export type Arcade = ReturnType<typeof createArcade>;
