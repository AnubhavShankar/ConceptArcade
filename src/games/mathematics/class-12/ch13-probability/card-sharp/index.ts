// Inspirations: Solitaire and Minesweeper (tap cards to mark them) and stage card tricks. Ace is a magician in a top hat. Level 1 is a tap-the-cards board: mark the
// cards that fit the condition B (the reduced sample space), then the ones that also fit A, and the chance is the green cards out of the marked ones. Levels 2
// and 3 set a chance for independent events and for two cards drawn without replacement.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { CARDS, RANKS, SUITS, buildRounds, counts, drawChance, explain, frac, intel, judge, judgeBoard, missText, pOf, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const GRID = { x0: 190, y0: 60, w: 56, h: 52, gap: 6 };
const NAMES = ['not marked', 'fits B', 'fits B and A'];

const HEROES = [
  { story: 'When we are told that B has happened, the sample space shrinks to the outcomes of B. The chance of A given B is the number of outcomes in both A and B, out of the number in B. So mark the reduced sample space first, then count what also fits A. Do not count the cards outside B.', objective: 'Mark every card that fits B, then mark again the ones that also fit A, in three rounds. The count shows live in round 1; a peek costs a charge.' },
  { story: 'Two events are independent when P(A ∩ B) = P(A)·P(B). If the chance of A and the chance of both are known, the chance of B follows by dividing. Here P(B) is a whole number of twelfths.', objective: 'Set k so that P(B) = k/12 makes A and B independent, in three rounds. The rectangles show in round 1; a check costs a charge.' },
  { story: 'Drawing without replacement changes the deck after the first card: P(both red) = (r/N)·((r − 1)/(N − 1)). For at least one red, take 1 minus the chance that both are black. The number of red cards r is the unknown.', objective: 'Set the number of red cards so the chance of the draw is exactly the chance stated, in three rounds. The boss round asks for at least one red.' },
];

/** Ace: a stage magician in a top hat and cape with a card fan in one hand and a sparkling wand in the other. */
function ace(g: G, x: number, y: number, t: number, mood: Mood, spark: boolean) {
  g.fillStyle = '#3a1f6a';
  g.beginPath();
  g.moveTo(x - 20, y - 36);
  g.lineTo(x + 20, y - 36);
  g.lineTo(x + 26, y + 26);
  g.lineTo(x - 26, y + 26);
  g.fill();
  g.fillStyle = PAL.white;
  g.fillRect(x - 8, y - 34, 16, 22);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(x, y - 48, 12, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 47, 9, mood, t, '#1b1030');
  g.fillStyle = '#111';
  g.fillRect(x - 16, y - 60, 32, 5);
  g.fillRect(x - 10, y - 82, 20, 24);
  g.fillStyle = PAL.pink;
  g.fillRect(x - 10, y - 66, 20, 4);
  // The card fan in the left hand
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(x - 26, y - 20);
    g.rotate(-0.5 + i * 0.3 + Math.sin(t * 2) * 0.05);
    g.fillStyle = PAL.white;
    g.fillRect(-4, -26, 14, 22);
    g.fillStyle = i % 2 ? PAL.red : '#111';
    g.fillRect(-1, -22, 5, 5);
    g.restore();
  }
  // The wand
  const wx = x + 38;
  const wy = y - 36 - Math.sin(t * 3) * 3;
  line(g, x + 20, y - 20, wx, wy, '#e8c9a0', 4);
  line(g, wx, wy, wx + 12, wy - 10, PAL.white, 3);
  if (spark) for (let i = 0; i < 5; i++) text(g, '✦', wx + 12 + Math.random() * 18 - 6, wy - 10 + Math.random() * 20 - 12, PAL.yellow, 10);
}

function mountBoard(ctx: Parameters<typeof mountDialLevel>[0]) {
  const rounds = buildRounds(1, ctx.random);
  const hero = HEROES[0];
  const state = Array.from({ length: CARDS }, () => 0);
  let peek = -10;
  let shown = false;
  const A = createArcade(
    ctx,
    { name: 'Ace', role: 'a stage magician in a top hat who deals from a deck of 24 cards', story: hero.story, objective: hero.objective },
    {
      W: 640,
      H: 340,
      aria: 'A magician beside a table of 24 playing cards in four rows, which the player taps to mark the cards that fit the condition and the event.',
      rounds: 3,
      charges: [1, 1, 0],
      onRound: (k) => {
        state.fill(0);
        shown = false;
        buttons.forEach(refresh);
        A.feedback.hidden = true;
        const r = rounds[k];
        A.hint.textContent = `${intel(r)} ${r.assist === 0 ? 'The count is live.' : r.assist === 1 ? 'The count is dim: a peek costs a charge.' : 'Boss round: no count, no peek.'}`;
      },
    },
  );
  const cur = () => rounds[Math.min(A.round, 2)];
  const cell = (i: number) => ({ x: GRID.x0 + (i % RANKS.length) * (GRID.w + GRID.gap), y: GRID.y0 + Math.floor(i / RANKS.length) * (GRID.h + GRID.gap) });
  const label = (i: number) => `${RANKS[i % RANKS.length]}${SUITS[Math.floor(i / RANKS.length)]}`;
  const cycle = (i: number) => {
    if (A.phase !== 'play') return;
    state[i] = (state[i] + 1) % 3;
    A.sound('blip');
    refresh(buttons[i]);
  };
  function refresh(b: HTMLButtonElement) {
    const i = Number(b.dataset.i);
    b.title = NAMES[state[i]];
    b.style.background = state[i] === 2 ? '#2d8a57' : state[i] === 1 ? '#8a7a1d' : '';
    b.setAttribute('aria-pressed', String(state[i] > 0));
  }
  const holder = document.createElement('div');
  holder.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:4px;max-width:420px;margin:8px auto';
  const buttons = Array.from({ length: CARDS }, (_, i) => {
    const b = A.button(label(i), `Card ${label(i)}`, () => cycle(i), 'small');
    b.dataset.i = String(i);
    holder.append(b);
    return b;
  });
  A.controls.append(holder);
  A.canvas.addEventListener('pointerdown', (e) => {
    if (A.phase !== 'play') return;
    const rect = A.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * 640) / rect.width;
    const py = ((e.clientY - rect.top) * 340) / rect.height;
    for (let i = 0; i < CARDS; i++) {
      const c = cell(i);
      if (px >= c.x && px <= c.x + GRID.w && py >= c.y && py <= c.y + GRID.h) {
        cycle(i);
        return;
      }
    }
  });
  A.controls.append(
    A.button('👀 Peek', 'Peek: the cards that fit B glow for a moment', () => {
      if (!A.spend()) return;
      peek = A.clock;
      A.say('Peek: the cards that fit B glow for a moment.', true);
    }, 'secondary'),
    A.button('🃏 Show the cards', 'Show the cards', () => {
      const r = cur();
      const ok = judgeBoard(r, state);
      shown = true;
      A.resolve(ok, ok ? `Trick works! ${explain(r)}` : missText(r, 0, state), { x: 380, y: 170 }, 1.0);
    }),
  );
  A.scene((g, t) => {
    if (A.phase === 'between') return;
    if (A.phase === 'play') shown = false;
    const r = cur();
    backdrop(g);
    text(g, `B: ${r.textB}`, 380, 40, PAL.yellow, 13);
    text(g, `A: ${r.textA}`, 380, 56, PAL.green, 13);
    const showPeek = t - peek < 1.8;
    for (let i = 0; i < CARDS; i++) {
      const c = cell(i);
      const red = Math.floor(i / RANKS.length) === 1 || Math.floor(i / RANKS.length) === 2;
      g.fillStyle = state[i] === 2 ? '#bff5d4' : state[i] === 1 ? '#fff0a8' : PAL.white;
      g.fillRect(c.x, c.y, GRID.w, GRID.h);
      g.strokeStyle = showPeek && r.target[i] > 0 ? PAL.cyan : state[i] === 2 ? PAL.green : state[i] === 1 ? PAL.yellow : PAL.dim;
      g.lineWidth = showPeek && r.target[i] > 0 ? 4 : 2;
      g.strokeRect(c.x, c.y, GRID.w, GRID.h);
      text(g, label(i), c.x + GRID.w / 2, c.y + GRID.h / 2 + 6, red ? '#d33' : '#111', 17);
    }
    const [p, f] = counts(state);
    const live = r.assist === 0;
    const dim = r.assist === 1;
    g.globalAlpha = dim ? 0.3 : 1;
    if (live || dim) text(g, p === 0 ? 'marked: 0' : `marked ${p}, green ${f}  →  ${frac(f, p)}`, 380, 310, PAL.yellow, 13);
    else text(g, 'count hidden', 380, 310, PAL.dim, 12);
    g.globalAlpha = 1;
    const ok = shown ? judgeBoard(r, state) : null;
    const mood: Mood = ok === null ? 'happy' : A.rt > 0.9 ? (ok ? 'cheer' : 'worried') : 'happy';
    ace(g, 70, 270, t, mood, ok !== null && A.rt < 1.4);
    if (ok !== null && A.rt > 1.1) verdict(g, ok, 'THE TRICK WORKS', 'THE TRICK FAILS');
  });
  A.mountAll();
  return A.run();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  return {
    hero: { name: 'Ace', role: 'a stage magician in a top hat whose tricks depend on the chances being right', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'v', aria: n === 2 ? 'The k in P(B) = k/12' : 'Number of red cards', label: n === 2 ? 'k in P(B) = k/12' : 'Red cards', unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => (n === 2 ? `P(B) = ${frac(v, 12)}` : `${v} red`) }],
    handles: [trackHandle<Round>('v', (r) => r.min, (r) => r.max)],
    test: { button: '🔮 Check', aria: 'Check: see the chance this setting gives', read: (r, v) => spotText(r, v.v) },
    fire: { button: n === 2 ? '✨ Test independence' : '🂡 Draw two cards', aria: 'Show the trick' },
    judge: (r, v) => judge(r, v.v),
    miss: (r, v) => missText(r, v.v),
    win: (r) => `Trick works! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The picture is live.' : r.assist === 1 ? 'The picture is dim: a check costs a charge.' : 'Boss round: no picture, no check.'}`,
    hit: () => [380, 170],
    delay: 1.4,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const val = shot ? shot.v.v : v.v;
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && !shot;
      g.globalAlpha = dim ? 0.3 : 1;
      if (r.kind === 'indep') {
        // The unit square: A is a vertical band, B a horizontal band, and the overlap's area is their product.
        const S = { x: 330, y: 70, s: 180 };
        g.strokeStyle = PAL.dim;
        g.lineWidth = 2;
        g.strokeRect(S.x, S.y, S.s, S.s);
        g.fillStyle = 'rgba(255,77,141,0.25)';
        g.fillRect(S.x, S.y, (S.s * r.a) / 12, S.s);
        text(g, `P(A) = ${frac(r.a, 12)}`, S.x + 70, S.y + S.s + 16, PAL.pink, 12);
        if (live || dim) {
          g.fillStyle = 'rgba(80,200,255,0.25)';
          g.fillRect(S.x, S.y + S.s - (S.s * val) / 12, S.s, (S.s * val) / 12);
          g.fillStyle = 'rgba(255,210,63,0.55)';
          g.fillRect(S.x, S.y + S.s - (S.s * val) / 12, (S.s * r.a) / 12, (S.s * val) / 12);
          text(g, `P(A)·P(B) = ${frac(r.a * val, 144)}`, S.x + S.s + 70, S.y + 30, PAL.yellow, 12);
        }
        g.globalAlpha = 1;
        text(g, `P(A ∩ B) = ${frac(r.a * r.ans, 144)}`, S.x + S.s + 70, S.y + 52, PAL.green, 12);
      } else {
        // A row of cards: red backs and black backs, then two drawn cards flip
        const cw = Math.min(34, 420 / r.N);
        const red = val;
        for (let i = 0; i < r.N; i++) {
          const x = 200 + i * (cw + 4);
          g.fillStyle = i < red ? '#c22' : '#223';
          g.fillRect(x, 120, cw, 50);
          g.strokeStyle = PAL.white;
          g.lineWidth = 1.5;
          g.strokeRect(x, 120, cw, 50);
        }
        g.globalAlpha = 1;
        text(g, `${red} red, ${r.N - red} black`, 380, 105, PAL.white, 13);
        const [n2, d2] = drawChance(r, r.ans);
        text(g, `chance wanted: ${frac(n2, d2)}`, 380, 210, PAL.green, 13);
        if (live || dim) {
          g.globalAlpha = dim ? 0.3 : 1;
          const [a, b] = drawChance(r, val);
          text(g, `with ${red} red: ${frac(a, b)}`, 380, 232, PAL.yellow, 12);
          g.globalAlpha = 1;
        }
        if (shot && rt > 0.4) {
          for (let i = 0; i < 2; i++) {
            g.fillStyle = PAL.white;
            g.fillRect(300 + i * 70, 252, 50, 60);
            const isRed = r.mode === 'both' ? shot.ok || i === 0 : i === 0;
            g.fillStyle = isRed ? '#d33' : '#111';
            g.beginPath();
            g.arc(325 + i * 70, 282, 10, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.globalAlpha = 1;
      const mood: Mood = shot ? (rt > 1.0 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      ace(g, 70, 270, t, mood, shot !== null && rt < 1.4);
      track(g, r.min, r.max);
      if (shot && rt > 1.1) verdict(g, shot.ok, 'THE TRICK WORKS', 'THE TRICK FAILS');
      void num;
      void pOf;
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level));
    if (n === 1) return mountBoard(ctx as never);
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, 'A stage magician beside two bands of probability or a row of red and black cards, with a number to set.');
  },
});
