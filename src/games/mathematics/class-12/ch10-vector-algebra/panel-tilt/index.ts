// Inspirations: Minecraft (build in 3D, one block at a time) and drill-the-bolt installer games. Sol is a solar installer robot with a drill. The panel is the
// parallelogram of two supports a and b, drawn in 3D; the mount bolt must go in along a × b, and the right-hand rule says which way that is.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { bWith, buildRounds, cross, explain, intel, judge, missText, normal, size, spotText, type Round, type V3 } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const O = { x: 330, y: 214, s: 17 };
const RUN = 1.7;

const HEROES = [
  { story: 'The cross product a × b = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁) is a vector square to both a and b. Its direction follows the right-hand rule, so b × a points the other way, and its length is the area of the parallelogram the two vectors span.', objective: 'Set the mount bolt to exactly a × b, in three rounds. The bolt test shows how square the mount is; round 1 shows it live and later rounds cost a charge.' },
  { story: 'The area of the parallelogram spanned by a and b is |a × b|. When one component of b is unknown, the area becomes an equation in it. Only one setting from 0 to 9 gives the panel the area the roof allows.', objective: 'Set the unknown component c so the panel has exactly the area wanted, in three rounds. The area shows live in round 1; a panel test costs a charge.' },
  { story: 'Two vectors are parallel exactly when a × b = 0: the parallelogram they span has no area and folds flat. That happens when b is a multiple of a, which fixes the unknown component.', objective: 'Set the unknown component c so the two supports are parallel and the panel folds flat, in three rounds. The boss round has no live area.' },
];

/** Sol: a boxy installer robot with a hard-hat visor, a drill arm and a tool belt. */
function sol(g: G, x: number, y: number, t: number, mood: Mood, drill: number) {
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 14, y + 2, 10, 24);
  g.fillRect(x + 4, y + 2, 10, 24);
  g.fillStyle = PAL.orange;
  g.fillRect(x - 18, y - 36, 36, 40);
  g.fillStyle = PAL.yellow;
  g.fillRect(x - 18, y - 6, 36, 5);
  g.fillStyle = '#8f9bd6';
  g.fillRect(x - 15, y - 62, 30, 26);
  g.fillStyle = PAL.yellow;
  g.fillRect(x - 17, y - 66, 34, 8);
  g.fillStyle = '#0a1030';
  g.fillRect(x - 12, y - 56, 24, 12);
  face(g, x, y - 50, 8, mood, t, PAL.cyan);
  // The drill arm points toward the panel and thrusts when it is used
  const push = drill > 0 ? Math.sin(Math.min(1, drill) * Math.PI) * 8 : 0;
  line(g, x + 16, y - 22, x + 38 + push, y - 30, PAL.dim, 6);
  g.fillStyle = PAL.pink;
  g.fillRect(x + 36 + push, y - 34, 14, 8);
  if (drill > 0 && drill < 1) for (let i = 0; i < 4; i++) text(g, '✦', x + 54 + push + Math.random() * 8, y - 30 + (Math.random() - 0.5) * 14, PAL.yellow, 9);
}

/** What a paid test shows for a moment in round 2, level by level (used in the hint). */
const SHOWN = ['the bolt and its readout', 'the area', 'the panel as it folds, and the area'];

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const flash = paidFlash();
  const rounds = buildRounds(n, random);
  const P = (v: V3): [number, number] => [O.x + O.s * (v[0] - 0.45 * v[2]), O.y - O.s * (v[1] - 0.3 * v[2])];
  const keys = n === 1 ? ['n1', 'n2', 'n3'] : ['c'];
  const labels = n === 1 ? ['Bolt x', 'Bolt y', 'Bolt z'] : ['Unknown c'];
  const vals = (v: Record<string, number>) => keys.map((k) => v[k]);
  return {
    hero: { name: 'Sol', role: 'a solar installer robot with a drill who bolts a panel in along the cross product of its supports', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: keys.map((k, i) => ({ key: k, aria: n === 1 ? `Mount bolt component ${'xyz'[i]}` : 'Unknown component c', label: labels[i], unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start[i], text: (v: number) => (n === 1 ? `${'xyz'[i]} = ${num(v)}` : `c = ${num(v)}`) })),
    handles: n === 1 ? [] : [trackHandle<Round>('c', (r) => r.min, (r) => r.max)],
    test: { button: n === 1 ? '🔩 Bolt test' : '📐 Panel test', aria: 'Panel test: see how the panel sits for this setting', read: (r, v) => (flash.paid(), spotText(r, vals(v))) },
    fire: { button: '🔧 Drive the bolt', aria: 'Drive the bolt' },
    judge: (r, v) => judge(r, vals(v)),
    miss: (r, v) => missText(r, vals(v)),
    win: (r) => `Panel locked! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live readout is on.' : r.assist === 1 ? `Nothing is shown: a test shows ${SHOWN[n - 1]} for a moment and costs a charge.` : 'Boss round: no readout, no test.'}`,
    hit: () => [O.x, O.y - 40],
    delay: RUN,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      // The helper (the player's bolt, the area, the folded-flat picture) is live in round 1, shows for 1.5 s after a paid test in round 2, and appears after a win;
      // never before Fire in the boss round and never during a miss.
      const since = flash.since(A.clock, k);
      const helper = helperOn(r.assist, !!shot?.ok, shot ? Infinity : since);
      A.canvas.dataset.helper = helper ? '1' : '0';
      const use = vals(shot ? shot.v : v);
      // In level 3 the panel folds flat exactly at the answer, so with the helper off the panel is drawn with a fixed c of 0 (which is never parallel to a).
      const hideFlat = n === 3 && !helper;
      const b = bWith(r, hideFlat ? [0] : use);
      const nrm = normal(r, use);
      const flat = r.kind === 'parallel' && helper && size(cross(r.a, b)) === 0;
      // Axes for orientation
      for (const [d, c, nm] of [[[2.6, 0, 0], PAL.red, 'x'], [[0, 2.6, 0], PAL.green, 'y'], [[0, 0, 2.6], PAL.cyan, 'z']] as [V3, string, string][]) {
        line(g, ...P([0, 0, 0]), ...P(d), c, 1.5);
        text(g, nm, P(d)[0] + 8, P(d)[1] - 4, c, 11);
      }
      // The panel: the parallelogram on a and b
      const pts = [[0, 0, 0], r.a, [r.a[0] + b[0], r.a[1] + b[1], r.a[2] + b[2]], b] as V3[];
      const wob = shot && !shot.ok && rt > 0.5 ? Math.sin(rt * 22) * 3 * Math.max(0, 1 - (rt - 0.5) / 1.2) : 0;
      g.fillStyle = shot && rt > 0.6 ? (shot.ok ? 'rgba(93,255,154,0.35)' : 'rgba(255,90,90,0.3)') : 'rgba(77,225,255,0.3)';
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 2.5;
      g.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = P(p);
        if (i === 0) g.moveTo(x + wob, y);
        else g.lineTo(x + wob, y);
      });
      g.closePath();
      g.fill();
      g.stroke();
      line(g, ...P([0, 0, 0]), ...P(r.a), PAL.pink, 3);
      line(g, ...P([0, 0, 0]), ...P(b), PAL.yellow, 3);
      text(g, 'a', P(r.a)[0] + 8, P(r.a)[1], PAL.pink, 13);
      text(g, 'b', P(b)[0] + 8, P(b)[1], PAL.yellow, 13);
      if (flat) text(g, 'folded flat', O.x + 40, O.y - 120, PAL.green, 13);
      // The mount bolt from the middle of the panel
      const mid: V3 = [(r.a[0] + b[0]) / 2, (r.a[1] + b[1]) / 2, (r.a[2] + b[2]) / 2];
      if (r.kind === 'mount') {
        if (helper) {
          const tip: V3 = [mid[0] + nrm[0] * 0.22, mid[1] + nrm[1] * 0.22, mid[2] + nrm[2] * 0.22];
          line(g, ...P(mid), ...P(tip), PAL.orange, 4);
          g.fillStyle = PAL.orange;
          g.beginPath();
          g.arc(...P(tip), 5, 0, Math.PI * 2);
          g.fill();
          text(g, `bolt ${num(use[0])}, ${num(use[1])}, ${num(use[2])}`, 500, 40, PAL.orange, 12);
        } else if (shot) {
          // A miss drives a bolt of fixed size and direction: the picture never shows how far off the setting was or where the true bolt points.
          const [mx, my] = P(mid);
          line(g, mx, my, mx, my - 34, PAL.orange, 4);
          text(g, 'bolt driven', 500, 40, PAL.dim, 12);
        } else text(g, 'bolt hidden', 500, 40, PAL.dim, 12);
        if (shot && shot.ok && rt > 0.9) {
          // On a win, the true normal is marked once the bolt is in
          const tn = cross(r.a, r.b);
          const tip: V3 = [mid[0] + tn[0] * 0.22, mid[1] + tn[1] * 0.22, mid[2] + tn[2] * 0.22];
          line(g, ...P(mid), ...P(tip), PAL.green, 2, [4, 4]);
        }
      } else if (helper) text(g, `area ${num(Math.round(size(nrm) * 10) / 10)}`, 500, 40, PAL.yellow, 12);
      else text(g, 'area hidden', 500, 40, PAL.dim, 12);
      if (r.kind === 'area') text(g, `wanted ${num(r.T)}`, 500, 58, PAL.green, 12);
      const mood: Mood = shot ? (rt > RUN - 0.4 ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      sol(g, 70, 270, t, mood, shot ? rt / 1.0 : 0);
      if (n > 1) track(g, r.min, r.max);
      if (shot && rt > RUN - 0.3) verdict(g, shot.ok, 'PANEL LOCKED', 'PANEL MISALIGNED');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A solar installer robot beside a 3D solar panel spanned by two support vectors, bolting it in along their cross product.');
  },
});
