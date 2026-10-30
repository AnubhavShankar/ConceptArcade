// Inspirations: the lock-picking minigame of Fallout and Mastermind (each clue plate tells you whether your code works).
// Tumbler is a safecracker robot with a headlamp and a stethoscope; the vault's clue plates are the equations AX = B.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, buildRounds, explain, intel, judge, missText, plateOk, plateText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.5;

const HEROES = [
  { story: 'Each clue plate on the vault is an equation in the two tumblers. Written as a matrix equation it is AX = B. When |A| ≠ 0 the matrix has an inverse, A⁻¹ = adj A / |A|, and X = A⁻¹B is the one code.', objective: 'Set the tumblers so both plates open, in three rounds. The plate lamps are live in round 1; a plate check costs a charge.' },
  { story: 'A bigger vault has three plates and three tumblers. The adjoint is the transpose of the matrix of cofactors, and the code is X = (adj A)B / |A|.', objective: 'Set all three tumblers so every plate opens, in three rounds. The lamps fade; a plate check costs a charge.' },
  { story: 'The plates are shopping bills: three shoppers paid for baskets of three goods, and the tumblers are the price of one unit of each good. The bills form a system AX = B with the prices as X.', objective: 'Find the price of each good so all three bills are right, in three rounds.' },
  { story: 'Some vaults are jammed. If |A| = 0 there is no inverse. Then compute (adj A)B: if it is the zero vector the plates agree with each other and there are many codes; if not, they contradict and there is none. If |A| ≠ 0 there is exactly one code.', objective: 'Dial |A| and declare whether the vault has one code, none, or many, in three rounds. Both must be right.' },
];
const FIRE = ['Try the code', 'Try the code', 'Try the code', 'Declare the verdict'];
const LABELS = [['Tumbler x', 'Tumbler y'], ['Tumbler x', 'Tumbler y', 'Tumbler z'], ['Price of item 1', 'Price of item 2', 'Price of item 3'], ['Determinant |A|', 'Verdict']];
const ARIA = [['Tumbler x', 'Tumbler y'], ['Tumbler x', 'Tumbler y', 'Tumbler z'], ['Price of the first item', 'Price of the second item', 'Price of the third item'], ['Value of the determinant', 'Verdict on the number of codes']];

/** Tumbler: a safecracker robot with a headlamp, a stethoscope and big hands on the wheel. */
function tumbler(g: G, x: number, y: number, t: number, mood: Mood, turn: number) {
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 22, y - 10, 44, 48);
  g.strokeStyle = PAL.orange;
  g.lineWidth = 1.5;
  g.strokeRect(x - 22, y - 10, 44, 48);
  g.fillStyle = '#8f9bd6';
  g.beginPath();
  g.arc(x, y - 26, 17, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(x, y - 44, 5, Math.PI, 2 * Math.PI);
  g.fill();
  face(g, x, y - 26, 13, mood, t, '#1b1030');
  g.strokeStyle = PAL.pink;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x - 12, y - 8, 12, 0.2, Math.PI * 0.9);
  g.stroke();
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.arc(x - 24, y + 2, 4, 0, Math.PI * 2);
  g.fill();
  line(g, x + 22, y + 4, x + 44 + Math.cos(turn) * 3, y + 4 + Math.sin(turn) * 3, '#4a3a7a', 6);
  line(g, x - 12, y + 38, x - 12, y + 50, PAL.dim, 4);
  line(g, x + 12, y + 38, x + 12, y + 50, PAL.dim, 4);
}

function vault(g: G, cx: number, cy: number, t: number, vals: string[], open: number, alarm: boolean, wheel: number) {
  g.fillStyle = alarm && Math.sin(t * 20) > 0 ? '#5a1a2a' : '#26305f';
  g.beginPath();
  g.arc(cx, cy, 98, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.dim;
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = '#10163a';
  g.beginPath();
  g.ellipse(cx + open * 60, cy, 80 * (1 - open * 0.7), 80, 0, 0, Math.PI * 2);
  g.fill();
  if (open > 0.05) {
    g.fillStyle = PAL.yellow;
    g.fillRect(cx - 24, cy - 12, 48 * open * 0.6 + 8, 30);
  }
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  const spokes = 6;
  for (let i = 0; i < spokes; i++) line(g, cx + open * 60, cy, cx + open * 60 + Math.cos(wheel + (i * Math.PI * 2) / spokes) * 30 * (1 - open * 0.7), cy + Math.sin(wheel + (i * Math.PI * 2) / spokes) * 30, PAL.cyan, 3);
  vals.forEach((v, i) => {
    const wx = cx - 52 + i * 52;
    g.fillStyle = '#060a24';
    g.fillRect(wx - 20, cy + 46, 40, 28);
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 1.5;
    g.strokeRect(wx - 20, cy + 46, 40, 28);
    text(g, v, wx, cy + 66, PAL.yellow, 15);
  });
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const digits = n < 4;
  const count = n === 1 ? 2 : 3;
  const keys = digits ? ['x', 'y', 'z'].slice(0, count) : ['d', 'm'];
  const dials = digits
    ? keys.map((k, i) => ({ key: k, aria: ARIA[n - 1][i], label: LABELS[n - 1][i], unit: n === 3 ? '₹' : '', step: 1, min: DIALS.digits.min, max: DIALS.digits.max, start: 0, text: (v: number) => `${v}` }))
    : [
        { key: 'd', aria: ARIA[3][0], label: LABELS[3][0], unit: '', step: 1, min: DIALS.det.min, max: DIALS.det.max, start: 0, text: (v: number) => `|A| = ${num(v)}` },
        { key: 'm', aria: ARIA[3][1], label: LABELS[3][1], unit: '', step: 1, min: 1, max: 3, start: 1, text: (v: number) => ['1: exactly one code', '2: no code', '3: many codes'][v - 1] },
      ];
  return {
    hero: { name: 'Tumbler', role: 'a safecracker robot with a headlamp and a stethoscope, who opens vaults by reading their clue plates', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials,
    test: { button: '🩺 Plate check', aria: 'Plate check: listen to the plates at these settings', read: (r, v) => spotText(r, v) },
    fire: { button: n === 4 ? '🔒 Declare' : '🔓 Try the code', aria: FIRE[n - 1] },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Open! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? (n < 4 ? 'The plate lamps are live.' : 'The plates are shown in full.') : r.assist === 1 ? 'The lamps are dim: a plate check costs a charge.' : 'Boss round: no lamps, no check.'}`,
    hit: () => [470, 160],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      tumbler(g, 330, 180, t, mood, shot ? rt * 8 : 0);
      const vals = digits ? keys.map((k) => String(v[k])) : [`|A|=${v.d}`, `#${v.m}`];
      const resolved = shot && rt > 0.9;
      vault(g, 500, 150, t, vals, resolved && shot.ok ? Math.min(1, (rt - 0.9) * 2) : 0, resolved ? !shot.ok : false, shot ? rt * 6 : 0);
      text(g, 'CLUE PLATES', 22, 40, PAL.dim, 12, 'left');
      const tumblers = digits ? keys.map((k) => v[k]) : [];
      const lampMode = digits ? (r.assist === 0 || shot ? 1 : r.assist === 1 ? 0.3 : 0) : 0;
      r.A.forEach((_, i) => {
        const y = 78 + i * 52;
        g.fillStyle = '#10163a';
        g.fillRect(14, y - 24, 270, 38);
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 1.2;
        g.strokeRect(14, y - 24, 270, 38);
        text(g, plateText(r, i), 22, y, PAL.white, 12, 'left');
        if (lampMode > 0) {
          const ok = plateOk(r, tumblers)[i];
          g.globalAlpha = lampMode;
          g.fillStyle = ok ? PAL.green : PAL.red;
          g.beginPath();
          g.arc(298, y - 5, 6, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }
      });
      if (n === 4) text(g, 'pick |A| and the verdict', 150, 270, PAL.dim, 12);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'VAULT OPEN', 'ALARM');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A safecracker robot beside a round vault door, with clue plates that are equations and tumbler dials for the code.');
  },
});
