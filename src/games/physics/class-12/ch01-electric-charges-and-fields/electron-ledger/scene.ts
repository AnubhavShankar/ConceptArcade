// The workshop picture: bodies drawn as atoms (protons in the middle, electrons orbiting), with electrons that visibly
// fly from one body to the other. The planning of who sends what to whom is pure and tested; the drawing is not.
import { disc, label, SIGN_COLOR, signColor, type Theme } from '@core/draw';

/** An electron flight. -1 means the pump (the outside world). */
export interface Flight {
  from: number;
  to: number;
}

const MAX_FLIGHTS = 24;

/**
 * Turn a change in electron-dot counts into single-electron flights. Losers send to gainers one dot at a time;
 * anything left over goes to or from the pump. Changes beyond MAX_FLIGHTS are applied at once (`instant`).
 */
export function planFlow(prev: number[], next: number[]): { flights: Flight[]; instant: number[] } {
  const delta = next.map((n, i) => n - (prev[i] ?? 0));
  const losers: number[] = [];
  const gainers: number[] = [];
  delta.forEach((d, i) => {
    for (let k = 0; k < Math.abs(d); k++) (d < 0 ? losers : gainers).push(i);
  });
  const flights: Flight[] = [];
  const instant = delta.map(() => 0);
  const paired = Math.min(losers.length, gainers.length);
  for (let k = 0; k < paired; k++) flights.push({ from: losers[k], to: gainers[k] });
  for (let k = paired; k < losers.length; k++) flights.push({ from: losers[k], to: -1 });
  for (let k = paired; k < gainers.length; k++) flights.push({ from: -1, to: gainers[k] });
  const kept = flights.slice(0, MAX_FLIGHTS);
  for (const f of flights.slice(MAX_FLIGHTS)) {
    if (f.from >= 0) instant[f.from] -= 1;
    if (f.to >= 0) instant[f.to] += 1;
  }
  return { flights: kept, instant };
}

/**
 * How far the first two bodies are pushed along the line between them during the force demo. Positive moves the
 * first body towards the second. Attraction closes the gap a little, repulsion pushes them well apart.
 * `progress` runs 0 to 1; `strength` scales the whole motion (a weak charge barely moves anything).
 */
export function demoOffset(relation: 'attract' | 'repel' | null, progress: number, strength: number): number {
  if (relation === null) return 0;
  const p = Math.min(1, Math.max(0, progress));
  const ease = 1 - Math.pow(1 - p, 3);
  const wobble = relation === 'attract' ? Math.sin(p * Math.PI * 3) * (1 - p) * 4 : 0; // a little bump as they meet
  const full = relation === 'attract' ? 30 : -58;
  return (full * ease + wobble) * strength;
}

export interface SceneBody {
  name: string;
  x: number;
}

interface Token extends Flight {
  t: number; // starts negative (the stagger delay) and reaches 1 on landing
  departed: boolean;
}

export interface Scene {
  /** Move to new electron-dot counts (gained minus lost, per body) with flying electrons. */
  set(units: number[], opts?: { rub?: number[] }): void;
  /** Jump to neutral at once (fresh pieces). */
  reset(): void;
  /** Show the force between the first two bodies: they attract, repel, or (null) nothing happens. */
  demo(relation: 'attract' | 'repel' | null, strength?: number): void;
  clearDemo(): void;
  demoState(): '' | 'attract' | 'repel' | 'none';
  selected: Set<string>;
  frame(dt: number): void;
  settled(): boolean;
  hit(x: number, y: number): number;
  /** Dots currently drawn on each body (gained minus lost). */
  shown(): number[];
}

export function createScene(args: { g: CanvasRenderingContext2D; W: number; H: number; col: Theme; bodies: SceneBody[]; protons?: number; port?: { x: number; label: string }; legend: string; initial?: number[]; unknown?: number[] }): Scene {
  const { g, W, H, col, bodies, legend } = args;
  const P = args.protons ?? 12;
  const n = bodies.length;
  const R = n === 1 ? 74 : n === 2 ? 70 : n === 3 ? 58 : 48;
  const cy = H / 2 - 8;
  const disp = bodies.map((_, i) => args.initial?.[i] ?? 0);
  let target = [...disp];
  const unknown = new Set(args.unknown ?? []);
  let tokens: Token[] = [];
  let rubbing: number[] = [];
  let rubT = 0;
  let demoRel: 'attract' | 'repel' | null | undefined; // undefined: no demo shown
  let demoP = 1;
  let demoK = 1;
  let clock = 0;
  const selected = new Set<string>();
  const portPos = args.port ? { x: args.port.x, y: cy } : null;

  const centre = (i: number) => {
    const wiggle = rubbing.includes(i) && rubT > 0 ? Math.sin(rubT * 38) * 7 * (rubbing.indexOf(i) === 0 ? 1 : -1) : 0;
    const push = demoRel !== undefined && i < 2 ? demoOffset(demoRel, demoP, demoK) * (i === 0 ? 1 : -1) : 0;
    return { x: bodies[i].x + wiggle + push, y: cy };
  };
  const endpoint = (i: number) => (i >= 0 ? centre(i) : portPos ?? { x: W / 2, y: H - 10 });

  function drawBody(i: number) {
    const { x, y } = centre(i);
    const d = disp[i];
    const col2 = unknown.has(i) ? col.muted : signColor(-d);
    if (selected.has(bodies[i].name)) {
      g.setLineDash([6, 5]);
      disc(g, x, y, R + 9, 'rgba(0,0,0,0)', col.accent, 2);
      g.setLineDash([]);
    }
    disc(g, x, y, R, col.panel, col2, 3);
    // protons: a tight cluster that never moves
    for (let k = 0; k < P; k++) {
      const a = k * 2.4;
      const rr = R * 0.26 * Math.sqrt((k + 0.5) / P) * 1.6;
      disc(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 3.4, SIGN_COLOR.pos);
    }
    // electrons: P slots on an orbit; missing ones show as hollow slots. Extra ones sit on an outer orbit.
    const present = Math.max(0, Math.min(P, P + d));
    const spin = clock * 0.4;
    for (let k = 0; k < P; k++) {
      const a = spin + (k / P) * Math.PI * 2;
      const px = x + Math.cos(a) * R * 0.64;
      const py = y + Math.sin(a) * R * 0.64;
      if (k < present) disc(g, px, py, 4.2, SIGN_COLOR.neg);
      else disc(g, px, py, 4.2, 'rgba(0,0,0,0)', col.muted, 1.2);
    }
    const extra = Math.min(Math.max(0, d), 18);
    for (let k = 0; k < extra; k++) {
      const a = -spin * 0.7 + (k / Math.max(extra, 6)) * Math.PI * 2;
      disc(g, x + Math.cos(a) * R * 0.86, y + Math.sin(a) * R * 0.86, 4.2, SIGN_COLOR.neg);
    }
    const mark = unknown.has(i) ? '?' : d === 0 ? '0' : d < 0 ? '+' : '−';
    label(g, mark, x, y - R - 14, { size: 24, color: unknown.has(i) ? col.muted : signColor(-d) });
    label(g, bodies[i].name, x, y + R + 22, { size: 14, color: col.text });
    const note = d === 0 ? 'neutral' : d < 0 ? `lost ${-d} dot${d === -1 ? '' : 's'}` : `gained ${d} dot${d === 1 ? '' : 's'}`;
    label(g, note, x, y + R + 40, { size: 12, bold: false, color: col.muted });
  }

  function drawPump() {
    if (!portPos || !args.port) return;
    const { x, y } = portPos;
    g.fillStyle = col.panel;
    g.strokeStyle = col.line;
    g.lineWidth = 2;
    g.beginPath();
    g.rect(x - 46, y - 36, 92, 72);
    g.fill();
    g.stroke();
    label(g, args.port.label, x, y - 4, { size: 13, color: col.text });
    label(g, 'electrons in / out', x, y + 16, { size: 11, bold: false, color: col.muted });
  }

  /** Arrows between the first two bodies and a caption, showing the force they exert on each other. */
  function drawForce() {
    const a = centre(0);
    const b = centre(1);
    const y = cy - R - 40;
    const mid = (a.x + b.x) / 2;
    if (demoRel === null) {
      label(g, 'Nothing happens: the sphere is neutral', mid, y, { size: 14, color: col.muted });
      return;
    }
    const alpha = Math.min(1, demoP * 2.5) * demoK;
    g.globalAlpha = Math.max(0.35, alpha);
    const arrow = (x1: number, x2: number) => {
      g.strokeStyle = demoRel === 'attract' ? SIGN_COLOR.neg : SIGN_COLOR.pos;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x1, y + 16);
      g.lineTo(x2, y + 16);
      g.stroke();
      const dir = Math.sign(x2 - x1);
      g.beginPath();
      g.moveTo(x2, y + 16);
      g.lineTo(x2 - dir * 10, y + 9);
      g.lineTo(x2 - dir * 10, y + 23);
      g.closePath();
      g.fillStyle = g.strokeStyle;
      g.fill();
    };
    const gap = 26;
    if (demoRel === 'attract') {
      arrow(mid - gap - 34, mid - 6);
      arrow(mid + gap + 34, mid + 6);
    } else {
      arrow(mid - 6, mid - gap - 34);
      arrow(mid + 6, mid + gap + 34);
    }
    g.globalAlpha = 1;
    const word = demoK < 1 ? (demoRel === 'attract' ? 'attract, only weakly' : 'repel, only weakly') : demoRel === 'attract' ? 'ATTRACT' : 'REPEL';
    label(g, 'They ' + word, mid, y, { size: 15, color: col.text });
  }

  function drawToken(tk: Token) {
    if (tk.t < 0) return;
    const a = endpoint(tk.from);
    const b = endpoint(tk.to);
    const e = tk.t < 0.5 ? 2 * tk.t * tk.t : 1 - Math.pow(-2 * tk.t + 2, 2) / 2; // ease in-out
    const x = a.x + (b.x - a.x) * e;
    const y = a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * 46;
    disc(g, x, y, 6, SIGN_COLOR.neg, '#ffffff', 1.5);
    label(g, '−', x, y + 4, { size: 11, color: '#ffffff' });
  }

  return {
    selected,
    shown: () => [...disp],
    settled: () => tokens.length === 0 && rubT <= 0 && demoP >= 1,
    demo(relation, strength = 1) {
      demoRel = relation;
      demoK = strength;
      demoP = 0;
    },
    clearDemo() {
      demoRel = undefined;
      demoP = 1;
    },
    demoState: () => (demoRel === undefined ? '' : demoRel === null ? 'none' : demoRel),
    hit(x, y) {
      for (let i = 0; i < n; i++) {
        const c = centre(i);
        if ((x - c.x) ** 2 + (y - c.y) ** 2 <= (R + 10) ** 2) return i;
      }
      return -1;
    },
    reset() {
      tokens = [];
      rubbing = [];
      rubT = 0;
      demoRel = undefined;
      disp.forEach((_, i) => (disp[i] = args.initial?.[i] ?? 0));
      target = [...disp];
    },
    set(units, opts = {}) {
      const { flights, instant } = planFlow(target, units);
      target = [...units];
      instant.forEach((v, i) => (disp[i] += v));
      flights.forEach((f, k) => tokens.push({ ...f, t: -0.14 * k, departed: false }));
      if (opts.rub?.length) {
        rubbing = opts.rub;
        rubT = 0.7;
      }
    },
    frame(dt) {
      clock += dt;
      rubT = Math.max(0, rubT - dt);
      if (demoRel !== undefined) demoP = Math.min(1, demoP + dt / 1.1);
      for (const tk of tokens) {
        tk.t += dt / 0.8;
        if (tk.t >= 0 && !tk.departed) {
          tk.departed = true;
          if (tk.from >= 0) disp[tk.from] -= 1;
        }
      }
      for (const tk of tokens) if (tk.t >= 1 && tk.to >= 0) disp[tk.to] += 1;
      tokens = tokens.filter((tk) => tk.t < 1);
      g.clearRect(0, 0, W, H);
      drawPump();
      for (let i = 0; i < n; i++) drawBody(i);
      for (const tk of tokens) drawToken(tk);
      if (demoRel !== undefined) drawForce();
      label(g, legend, 10, H - 8, { size: 11, bold: false, color: col.muted, align: 'left' });
    },
  };
}
