// Inspirations: Plague Inc. (a colony that grows by a rate) and falling-card typing games such as Tetris and The Typing of the Dead (read it and answer before it
// lands). Petri is a lab robot with a dish for a head. Level 1 is a real-time specimen drop: set the scanner to the order and degree before the card lands.
// Levels 2 and 3 set the growth lamp and the dish frequency from the equation the colony or the dish obeys.
import { PAL, createArcade } from '@core/arcade';
import { FLASH, helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { buildRounds, degreeWord, explain, intel, judge, judgeScan, magnify, missText, overshoot, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';

const HEROES = [
  { story: 'A specimen card falls toward the floor. The order of an equation is the order of the highest derivative in it. The degree is the power of that highest derivative, once the equation is a polynomial in its derivatives. If a derivative sits inside sin, cos or e, there is no degree.', objective: 'Set the scanner to the order and the degree before the card lands, in three rounds. The cards fall faster each round; a magnifier costs a charge.' },
  { story: 'A colony grows at a rate proportional to its size: dy/dt = k·y. Separating the variables gives y = c·e^(kt). The lamp setting k decides whether it grows or dies, and how fast.', objective: 'Set the lamp k so the colony reads exactly what is wanted after the stated time, in three rounds. The growth line shows in round 1; an incubator test costs a charge.' },
  { story: 'The dish is on a spring and obeys y″ + m²y = 0. Its solution is y = A cos(mt) + B sin(mt), which repeats every 2π/m. So in one turn of the lamp, t from 0 to 2π, it makes m full swings.', objective: 'Set the frequency m so the dish makes exactly the swings wanted in one lamp turn, in three rounds. The swing curve shows in round 1; the boss round has no curve.' },
];

/** Petri: a lab robot with a glass dish for a head, goggles, a white coat and a scanner wand. */
function petri(g: G, x: number, y: number, t: number, mood: Mood, aim: number, beam: boolean) {
  g.fillStyle = '#d8e4ff';
  g.fillRect(x - 18, y - 36, 36, 40);
  g.fillStyle = PAL.dim;
  g.fillRect(x - 14, y + 4, 10, 22);
  g.fillRect(x + 4, y + 4, 10, 22);
  g.fillStyle = 'rgba(180,230,255,0.25)';
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y - 52, 20, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(93,255,154,0.35)';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(x - 10 + ((i * 7) % 18), y - 44 + ((i * 5) % 8) + Math.sin(t * 2 + i) * 1.5, 2 + (i % 3), 0, Math.PI * 2);
    g.fill();
  }
  face(g, x, y - 54, 12, mood, t, PAL.cyan);
  g.strokeStyle = PAL.pink;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 17, y - 58);
  g.lineTo(x + 17, y - 58);
  g.stroke();
  const wx = x + 20 + Math.cos(aim) * 26;
  const wy = y - 24 + Math.sin(aim) * 26;
  line(g, x + 16, y - 26, wx, wy, PAL.dim, 4);
  g.fillStyle = beam ? PAL.green : PAL.yellow;
  g.beginPath();
  g.arc(wx, wy, 4, 0, Math.PI * 2);
  g.fill();
}

function mountScan(ctx: Parameters<typeof mountDialLevel>[0]) {
  const rounds = buildRounds(1, ctx.random);
  const hero = HEROES[0];
  let order = 4;
  let degree = 4;
  let born = 0;
  let prev = '';
  let frozen = 0;
  let timedOut = false;
  let mag = false;
  let scanned: { ok: boolean } | null = null;
  const A = createArcade(
    ctx,
    { name: 'Petri', role: 'a lab robot with a glass dish for a head who scans each specimen for its order and degree', story: hero.story, objective: hero.objective },
    {
      W: 640,
      H: 340,
      aria: 'A lab robot with a scanner wand beside a falling specimen card that shows a differential equation.',
      rounds: 3,
      charges: [1, 1, 0],
      onRound: (k) => {
        sliders[0].set(4);
        sliders[1].set(4);
        mag = false;
        A.feedback.hidden = true;
        A.hint.textContent = `${intel(rounds[k])} A magnifier costs a charge.`;
      },
    },
  );
  const sliders = [
    A.slider({ aria: 'Order of the equation', label: 'Order', min: 1, max: 4, step: 1, value: 4, unit: '', text: (v) => `order ${v}`, onInput: (v) => (order = v) }),
    A.slider({ aria: 'Degree of the equation', label: 'Degree', min: 0, max: 4, step: 1, value: 4, unit: '', text: (v) => (v === 0 ? 'not defined' : `degree ${v}`), onInput: (v) => (degree = v) }),
  ];
  const cur = () => rounds[Math.min(A.round, 2)];
  A.controls.append(
    ...sliders.map((s) => s.row),
    A.button('🔍 Magnifier', 'Magnifier: show the highest derivative', () => {
      if (!A.spend()) return;
      mag = true;
      A.say(magnify(cur()), true);
    }, 'secondary'),
    A.button('📡 Scan the specimen', 'Scan the specimen', () => {
      const r = cur();
      const ok = judgeScan(r, order, degree);
      frozen = A.clock - born;
      scanned = { ok };
      A.resolve(ok, ok ? `Scanned! ${explain(r)}` : missText(r), { x: 320, y: 190 }, 1.1);
    }),
  );
  A.scene((g, t) => {
    if (A.phase === 'between') return;
    if (A.phase === 'play' && prev !== 'play') {
      born = t;
      scanned = null;
      timedOut = false;
      mag = false;
    }
    prev = A.phase;
    const r = cur();
    const el = A.phase === 'play' ? t - born : frozen;
    if (A.phase === 'play' && el >= r.fall && !timedOut) {
      timedOut = true;
      frozen = r.fall;
      A.resolve(false, 'The specimen hit the floor before it was scanned. Read the equation first, then set the scanner; the cards fall faster each round.', { x: 320, y: 230 }, 0.4);
    }
    backdrop(g);
    const fall = Math.min(1, el / r.fall);
    const cy = 66 + fall * 130;
    line(g, 150, 232, 560, 232, PAL.red, 2, [8, 6]);
    text(g, 'floor', 540, 248, PAL.red, 10);
    g.fillStyle = fall > 0.75 && !scanned ? 'rgba(255,90,90,0.22)' : 'rgba(80,200,255,0.18)';
    g.strokeStyle = fall > 0.75 && !scanned ? PAL.red : PAL.cyan;
    g.lineWidth = 2;
    g.fillRect(150, cy - 24, 410, 48);
    g.strokeRect(150, cy - 24, 410, 48);
    text(g, r.text, 355, cy + 5, PAL.white, 16);
    if (mag) {
      const w = r.text.length * 4.4;
      const at = r.text.indexOf(r.highest);
      const x0 = 355 - (r.text.length * 8.2) / 2 + at * 8.2;
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x0, cy + 11);
      g.lineTo(x0 + r.highest.length * 8.2, cy + 11);
      g.stroke();
      void w;
    }
    // The timer bar
    g.fillStyle = PAL.dim;
    g.fillRect(150, 276, 410, 6);
    g.fillStyle = fall > 0.75 ? PAL.red : PAL.green;
    g.fillRect(150, 276, 410 * (1 - fall), 6);
    text(g, `Order ${order}, degree ${degreeWord(degree)}`, 355, 306, PAL.yellow, 14);
    const mood: Mood = scanned ? (A.rt > 0.9 ? (scanned.ok ? 'cheer' : 'worried') : 'happy') : timedOut ? 'worried' : 'happy';
    const beam = scanned !== null && A.rt < 1.1;
    petri(g, 70, 226, t, mood, beam ? -0.5 : Math.sin(t * 2) * 0.1 - 0.3, beam);
    if (beam) line(g, 118, 190, 150, cy, PAL.green, 2 + Math.sin(t * 40));
    if (scanned && A.rt > 1.1) verdict(g, scanned.ok, 'SPECIMEN SCANNED', 'SCANNER ALARM');
    if (timedOut && A.rt > 0.4) verdict(g, false, 'SPECIMEN HIT THE FLOOR', '');
  });
  A.mountAll();
  return A.run();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const key = n === 2 ? 'k' : 'm';
  const RUN = 1.8;
  /** The growth line or swing curve is the helper: live in round 1, for 1.5 s after a paid test in round 2 (at the tested setting), on a win. */
  const flash = paidFlash();
  let tested = 0;
  return {
    hero: { name: 'Petri', role: n === 2 ? 'a lab robot with a dish for a head who sets the growth lamp' : 'a lab robot with a dish for a head who tunes the spring under the dish', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key, aria: n === 2 ? 'Lamp setting k' : 'Dish frequency m', label: n === 2 ? 'Lamp k' : 'Frequency m', unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => `${key} = ${num(v)}` }],
    handles: [trackHandle<Round>(key, (r) => r.min, (r) => r.max)],
    test: { button: n === 2 ? '🧫 Incubator test' : '🌀 Swing test', aria: n === 2 ? 'Incubator test: read the colony for this lamp setting' : 'Swing test: count the swings for this frequency', read: (r, v) => {
        tested = v[key];
        flash.paid();
        return spotText(r, v[key]);
      },
    },
    fire: { button: n === 2 ? '💡 Switch on the lamp' : '🎛️ Start the dish', aria: n === 2 ? 'Switch on the lamp' : 'Start the dish' },
    judge: (r, v) => judge(r, v[key]),
    miss: (r, v) => missText(r, v[key]),
    win: (r) => `${n === 2 ? 'Colony on target!' : 'Dish in time!'} ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The curve is live.' : r.assist === 1 ? 'No curve: a test shows it for a moment and costs a charge.' : 'Boss round: no curve, no test.'}`,
    hit: () => [320, 150],
    delay: RUN + 0.3,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      // The helper (the growth line or the swing curve at the setting): live in round 1, for 1.5 s after a paid test in round 2 (at the tested
      // setting), on a win. A miss in rounds 2 and 3 plays a fixed effect in the right direction instead, never one that scales with the setting.
      const since = flash.since(t, k);
      const won = shot !== null && shot.ok;
      const help = helperOn(r.assist, won, shot ? Infinity : since);
      A.canvas.dataset.helper = help ? '1' : '0';
      const miss = shot !== null && !shot.ok;
      const up = miss && overshoot(r, shot!.v[key]);
      const frozen = !shot && r.assist === 1 && since < FLASH;
      const val = frozen ? tested : shot ? shot.v[key] : v[key];
      const p = shot ? Math.min(1, rt / RUN) : 0;
      const Px = { x0: 170, x1: 560, top: 70, bottom: 250 };
      line(g, Px.x0, (Px.top + Px.bottom) / 2, Px.x1, (Px.top + Px.bottom) / 2, PAL.dim, 1);
      let dishY = 0;
      let dishR = 26;
      if (r.kind === 'grow') {
        // The height is ln(y/c), a straight line of slope k, so the reading can be compared with the target dot.
        const span = 14;
        const X = (tt: number) => Px.x0 + (tt / r.T) * (Px.x1 - Px.x0);
        const Y = (e: number) => Px.bottom - ((e + span / 2) / span) * (Px.bottom - Px.top);
        line(g, Px.x0, Y(0), Px.x1, Y(0), PAL.dim, 1.5);
        g.fillStyle = PAL.green;
        g.beginPath();
        g.arc(X(r.T), Y(r.exp), 7, 0, Math.PI * 2);
        g.fill();
        text(g, `wanted c·e^${num(r.exp)}`, X(r.T) - 12, Y(r.exp) - 12, PAL.green, 11, 'right');
        text(g, 'height = ln(y / c)', Px.x0 + 4, Px.top - 6, PAL.dim, 10, 'left');
        if (help || miss) {
          // The line ends at the setting's own height while the helper is on; a hidden-helper miss ends a fixed 34 px above or below the target dot.
          const full = shot ? p : 1;
          const ey = help ? Y(val * r.T) : Y(r.exp) + (up ? -34 : 34);
          line(g, X(0), Y(0), X(0) + full * (X(r.T) - X(0)), Y(0) + full * (ey - Y(0)), PAL.yellow, 3);
        }
        dishR = !shot ? 18 : help ? 18 + Math.max(-6, Math.min(24, val * r.T * p * 1.6)) : up ? 18 + 22 * p : 18 - 8 * p;
      } else {
        const X = (tt: number) => Px.x0 + (tt / (2 * Math.PI)) * (Px.x1 - Px.x0);
        const Y = (y: number) => (Px.top + Px.bottom) / 2 - y * 70;
        text(g, `wanted: ${r.swings} full swings in 2π`, Px.x1, Px.top - 6, PAL.green, 11, 'right');
        // The swings drawn are the setting's own while the helper is on; a hidden-helper miss draws a fixed 7 swings (too many) or 1 (too few).
        const swings = help ? val : up ? 7 : 1;
        if (help || miss) {
          g.strokeStyle = PAL.yellow;
          g.lineWidth = 3;
          g.beginPath();
          const end = shot ? p : 1;
          for (let i = 0; i <= 240 * end; i++) {
            const tt = (i / 240) * 2 * Math.PI;
            if (i === 0) g.moveTo(X(tt), Y(Math.cos(swings * tt)));
            else g.lineTo(X(tt), Y(Math.cos(swings * tt)));
          }
          g.stroke();
        }
        dishY = shot ? Math.cos(swings * p * 2 * Math.PI) * 40 : Math.sin(t * 3) * 3;
      }
      // The dish itself
      g.fillStyle = 'rgba(180,230,255,0.2)';
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(110, 140 + dishY, dishR, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (r.kind === 'swing') line(g, 110, 200 + dishY * 0.2, 110, 220, PAL.dim, 3);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      petri(g, 90, 300, t, mood, -0.3, false);
      track(g, r.min, r.max);
      if (shot && rt > RUN + 0.2) verdict(g, shot.ok, n === 2 ? 'COLONY ON TARGET' : 'DISH IN TIME', n === 2 ? 'COLONY OFF TARGET' : 'DISH OUT OF TIME');
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level));
    if (n === 1) return mountScan(ctx as never);
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, 'A lab robot beside a dish and a plot, setting a growth lamp or a spring frequency from a differential equation.');
  },
});
