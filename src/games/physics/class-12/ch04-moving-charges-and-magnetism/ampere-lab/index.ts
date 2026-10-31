// "First Plasma". Inspirations (code comment only): remote-handling robot games (drive the arm into a hot zone, set the tool, back out), "find the sweet spot"
// probe puzzles, and the shot countdown of rocket-launch games. Spanner, a robot inside a small tokamak, places a field probe with its arm, then the control
// room fires a test shot and the plasma holds or breaks up. Level 1 the busbar probe (side and distance), 2 the plasma column (inner and outer probe),
// 3 the X-point (null of two currents), 4 the central solenoid (its length), 5 the toroidal coil (probe radius; beyond Section 4.7 by owner decision).
// Never leak the answer: the probe readout is the only place where the field at the player's setting (or its direction in level 1) appears before a shot;
// it is live in round 1, on for 1.5 s after a probe check in round 2, never in round 3. `hit` is a fixed point; every miss takes a fixed look (ERR, the two
// fixed scorch points, frost or a dim glow, ZERO); everything ends by 2.3 s and the verdict lands at 0.9 s. The art is in art.ts.
import { PAL, type Arcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { helperOn, paidFlash } from '@core/aidflash';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import {
  C, HIT, LINE, PAD, SIDE_V, SOLE, WALL_FAR, WALL_NEAR, arm, busbar, clamp01, column, controlWindow, exhaust, goalLine, hall, handleGrip, inPx, invTorPx, lenPx, outPx, plate, probe, rayPx,
  readout, rod, scorch, sidePad, solenoid, spanner, tag, toroid, torPx, vesselCam, xPx, xpoint, type AnaMood, type SolState, type SpannerMood,
} from './art';
import {
  LCD_OFF, buildRounds, fault, goal, hintText, judge as judgeRound, lcdText, meterText, missText, torRegion, winText, type ColRow, type Round, type Values,
} from './logic';

const ARIA = 'Inside a fusion reactor: a robot with a long arm sets field probes beside busbars, a plasma column and magnet coils, while a shift leader watches from the control room.';
const ROLE = 'a remote-handling robot inside a fusion reactor, getting every system ready for first plasma';
const HEROES = [
  {
    story: 'Tonight the reactor tries for its first plasma, and Spanner, its remote-handling robot, is setting up. Thick busbars feed the magnets, and each needs a field probe calibrated beside it. Ampère’s law round a circle of radius r gives B = μ₀I/2πr. The field circles the busbar: grip it with your right thumb along the current, and your fingers curl the way the field goes. The probe reads only a field along its arrow.',
    objective: 'Put the probe on the right side of the busbar, at the distance where it reads the calibration field, in three shots.',
  },
  {
    story: 'The plasma column itself carries a current, spread evenly over its cross-section. Outside it the whole current counts: B = μ₀I/2πr. Inside, a circle of radius r encloses only I r²/a² of it, so B = μ₀Ir/2πa², growing from zero at the centre. One probe goes inside the column and one outside, and both must read the same field.',
    objective: 'Set the inner and outer probes so both read the target field, in three shots.',
  },
  {
    story: 'The plasma’s exhaust must be steered onto a tough tungsten plate at the X-point, where the fields of the plasma current and the divertor coil’s current cancel. Two parallel currents the same way cancel between them; opposite ways, they cancel only outside, beyond the smaller current.',
    objective: 'Slide the exhaust plate to the null point, in three shots.',
  },
  {
    story: 'The central solenoid starts the plasma current. Spanner can slide its free end on a telescopic former, spreading the same turns over a different length. Inside a long solenoid B = μ₀nI, the same everywhere inside, where n counts the turns per metre in all the layers.',
    objective: 'Stretch the solenoid to the length that gives the field it needs inside, in three shots.',
  },
  {
    story: 'Last, the ring of toroidal coils that holds the plasma. A toroid is a solenoid bent into a ring. A circle inside the winding encloses N turns of current, so B = μ₀NI/2πr there; a circle in the hole encloses no current at all. The field probe slides out from the middle of the ring.',
    objective: 'Slide the probe to the radius where the toroidal field is the target, in three shots.',
  },
];

type Kind<K extends Round['kind']> = Extract<Round, { kind: K }>;
const VERDICT = 0.9;
const dist = (px: number, py: number) => Math.hypot(px - C.x, py - C.y);
const rrange = (r: Round) => r as unknown as ColRow;

// ---- the dials and handles of each level (section 7 of the brief) ----
const SIDE_WORDS = ['right', 'above', 'left', 'below'];
const sideDial: DialSpec<Round> = { key: 'side', aria: 'Side of the busbar for the probe: 0 right, 1 above, 2 left, 3 below', label: 'Side', unit: '', step: 1, min: 0, max: 3, start: 0, text: (x) => SIDE_WORDS[x] };
const distDial: DialSpec<Round> = { key: 'r', aria: 'Probe distance from the busbar in centimetres', label: 'Distance', unit: 'cm', step: 5, min: 5, max: 100, start: 5 };
const rinDial: DialSpec<Round> = { key: 'rin', aria: 'Inner probe radius in centimetres', label: 'Inner probe', unit: 'cm', step: 1, min: 1, max: (r) => rrange(r).a - 1, start: 1 };
const routDial: DialSpec<Round> = { key: 'rout', aria: 'Outer probe radius in centimetres', label: 'Outer probe', unit: 'cm', step: 1, min: (r) => rrange(r).a + 1, max: (r) => 3 * rrange(r).a, start: (r) => rrange(r).a + 1 };
const plateDial: DialSpec<Round> = { key: 'x', aria: 'Exhaust plate position in centimetres from the plasma current', label: 'Plate', unit: 'cm', step: 2, min: 2, max: 98, start: 2 };
const lenDial: DialSpec<Round> = { key: 'L', aria: 'Solenoid length in centimetres', label: 'Length', unit: 'cm', step: 5, min: 20, max: 150, start: 20 };
const probeDial: DialSpec<Round> = { key: 'r', aria: 'Probe radius from the middle of the ring in centimetres', label: 'Probe', unit: 'cm', step: 1, min: 2, max: 60, start: 2 };

interface Mark {
  /** Which handle was dragged last, for the highlight and (level 2) the arm. */
  which: string;
  at: number;
  dragged: boolean;
}
/** Everything a level's picture needs this frame. */
interface X {
  g: CanvasRenderingContext2D;
  t: number;
  rt: number;
  k: number;
  v: Values;
  shot: boolean;
  ok: boolean;
  f: ReturnType<typeof fault>;
  hot: (which: string) => boolean;
  mark: Mark;
  A: Arcade;
}
type Scene = (r: Round, x: X) => { tool: [number, number]; post: () => void };

// ---- level 1: the busbar probe ----
const sceneBus: Scene = (round, x) => {
  const r = round as Kind<'bus'>;
  const { g, v, rt, shot, ok } = x;
  const d = [SIDE_V[v.side!][0] * rayPx(v.r!), SIDE_V[v.side!][1] * rayPx(v.r!)];
  const tool: [number, number] = [C.x + d[0], C.y + d[1]];
  busbar(g, r.cur, r.I);
  arm(g, tool, shot && rt < 0.2);
  const shown = shot && rt >= 0.4 ? (ok ? 'CAL ✓' : 'ERR') : '—';
  probe(g, tool[0], tool[1], r.arrow, shown, shown === 'CAL ✓' ? PAL.green : shown === 'ERR' ? PAL.red : PAL.dim, SIDE_V[v.side!]);
  return {
    tool,
    post: () => {
      sidePad(g, v.side!);
      if (shot) return;
      const sv = SIDE_V[v.side!];
      handleGrip(g, tool[0], tool[1], '⇔', x.hot('r'));
      handleGrip(g, PAD.x + 22 * sv[0], PAD.y + 22 * sv[1], '✥', x.hot('side'));
      const beyond = 38;
      tag(g, `${v.r} cm`, tool[0] + sv[0] * beyond, tool[1] + sv[1] * beyond + 4, 'center');
      if (x.k === 0 && !x.mark.dragged) {
        const bob = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 0 : Math.sin(x.t * 4) * 3;
        tag(g, 'drag the probe ⇔', tool[0], tool[1] - 30 + bob, 'center');
      }
    },
  };
};

// ---- level 2: inside the plasma ----
const sceneCol: Scene = (round, x) => {
  const r = round as Kind<'col'>;
  const { g, v, rt, shot, ok, f } = x;
  column(g, r);
  const pin: [number, number] = [C.x - inPx(r, v.rin!), C.y];
  const pout: [number, number] = [C.x + outPx(r, v.rout!), C.y];
  arm(g, x.mark.which === 'rout' ? pout : pin, shot && rt < 0.2);
  let din = '—';
  let dout = '—';
  if (shot && rt >= 0.4) {
    if (ok) din = dout = '✓';
    else if (f === 'inLow' || f === 'inHigh') din = 'ERR';
    else dout = 'ERR';
  }
  rod(g, pin[0], pin[1], din, din === 'ERR' ? PAL.red : din === '✓' ? PAL.green : PAL.dim);
  rod(g, pout[0], pout[1], dout, dout === 'ERR' ? PAL.red : dout === '✓' ? PAL.green : PAL.dim);
  return {
    tool: pin,
    post: () => {
      if (shot) return;
      handleGrip(g, pin[0], pin[1], '⇔', x.hot('rin'));
      handleGrip(g, pout[0], pout[1], '⇔', x.hot('rout'));
      tag(g, `${v.rin} cm`, pin[0], pin[1] - 26, 'center');
      tag(g, `${v.rout} cm`, pout[0], pout[1] - 26, 'center');
    },
  };
};

// ---- level 3: the X-point ----
const sceneXpt: Scene = (round, x) => {
  const r = round as Kind<'xpt'>;
  const { g, v, rt, shot, ok, f } = x;
  xpoint(g, r);
  const tool: [number, number] = [xPx(v.x!), LINE.y];
  if (shot && rt >= 0.2) {
    const wall = f === 'near' ? WALL_NEAR : WALL_FAR;
    const to: [number, number] = ok ? [tool[0], LINE.y - 22] : wall;
    exhaust(g, to, clamp01((rt - 0.2) / 0.4));
    if (!ok && rt >= 0.6) scorch(g, wall);
  }
  arm(g, tool, shot && rt < 0.2);
  plate(g, v.x!, shot && ok && rt >= 0.6);
  return {
    tool,
    post: () => {
      if (shot) return;
      handleGrip(g, tool[0], tool[1], '⇔', x.hot('x'));
      tag(g, `${v.x} cm`, tool[0], tool[1] - 28, 'center');
    },
  };
};

// ---- level 4: the central solenoid ----
const sceneSol: Scene = (round, x) => {
  const r = round as Kind<'sol'>;
  const { g, v, rt, shot, ok, f } = x;
  const mode: SolState = !shot ? 'idle' : ok ? 'win' : f === 'quench' ? 'quench' : 'dim';
  const tool: [number, number] = [SOLE.x0 + lenPx(v.L!), SOLE.y];
  solenoid(g, r, v.L!, { mode, lit: shot ? clamp01((rt - 0.2) / 0.4) : 0, rt });
  arm(g, tool, shot && rt < 0.2);
  return {
    tool,
    post: () => {
      if (shot) return;
      handleGrip(g, tool[0], tool[1], '⇔', x.hot('L'));
      tag(g, `${v.L} cm`, tool[0], SOLE.y - 44, 'center');
    },
  };
};

// ---- level 5: the toroidal field ----
const sceneTor: Scene = (round, x) => {
  const r = round as Kind<'tor'>;
  const { g, v, rt, shot, ok, f, t } = x;
  toroid(g, r, t, shot && rt >= 0.2);
  const tool: [number, number] = [C.x + torPx(r, v.r!), C.y];
  arm(g, tool, shot && rt < 0.2);
  const shown = shot && rt >= 0.4 ? (ok ? '✓' : f === 'zero' ? 'ZERO' : 'ERR') : '—';
  rod(g, tool[0], tool[1], shown, shown === '✓' ? PAL.green : shown === '—' ? PAL.dim : PAL.red);
  return {
    tool,
    post: () => {
      if (shot) return;
      handleGrip(g, tool[0], tool[1], '⇔', x.hot('r'));
      tag(g, `${v.r} cm`, tool[0], tool[1] - 26, 'center');
      tag(g, torRegion(r, v.r!), tool[0], tool[1] + 46, 'center', PAL.white, 11);
    },
  };
};

const SCENES: Scene[] = [sceneBus, sceneCol, sceneXpt, sceneSol, sceneTor];

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const mark: Mark = { which: '', at: -10, dragged: false };
  let seen: unknown = null;
  const done = new Set<string>();
  const stamp = (which: string, A: () => Arcade | null) => {
    mark.which = which;
    mark.at = A()?.clock ?? 0;
    mark.dragged = true;
  };
  let arcade: Arcade | null = null;
  const getA = () => arcade;
  const dragging = (which: string, fn: (r: Round, px: number, py: number, v: Record<string, number>) => number) => (r: Round, px: number, py: number, v: Record<string, number>) => {
    stamp(which, getA);
    return fn(r, px, py, v);
  };
  const dials: DialSpec<Round>[][] = [[sideDial, distDial], [rinDial, routDial], [plateDial], [lenDial], [probeDial]];
  const handles: HandleSpec<Round>[][] = [
    [
      { dial: 'r', at: (_r, v) => [C.x + SIDE_V[v.side][0] * rayPx(v.r), C.y + SIDE_V[v.side][1] * rayPx(v.r)], drag: dragging('r', (_r, px, py) => (dist(px, py) - 26) / 1.2), radius: 20 },
      {
        dial: 'side',
        at: (_r, v) => [PAD.x + 22 * SIDE_V[v.side][0], PAD.y + 22 * SIDE_V[v.side][1]],
        drag: dragging('side', (_r, px, py) => ((Math.round(Math.atan2(PAD.y - py, px - PAD.x) / (Math.PI / 2)) % 4) + 4) % 4),
        radius: 20,
      },
    ],
    [
      { dial: 'rin', at: (r, v) => [C.x - inPx(rrange(r), v.rin), C.y], drag: dragging('rin', (r, px) => ((C.x - px) / 70) * rrange(r).a), radius: 20 },
      { dial: 'rout', at: (r, v) => [C.x + outPx(rrange(r), v.rout), C.y], drag: dragging('rout', (r, px) => rrange(r).a + ((px - C.x - 70) / 80) * 2 * rrange(r).a), radius: 20 },
    ],
    [{ dial: 'x', at: (_r, v) => [xPx(v.x), LINE.y], drag: dragging('x', (_r, px) => ((px - LINE.x0) / LINE.span) * 100), radius: 20 }],
    [{ dial: 'L', at: (_r, v) => [SOLE.x0 + lenPx(v.L), SOLE.y], drag: dragging('L', (_r, px) => 20 + (px - SOLE.x0 - 80) / 2.4), radius: 20 }],
    [{ dial: 'r', at: (r, v) => [C.x + torPx(r as Kind<'tor'>, v.r), C.y], drag: dragging('r', (r, px) => invTorPx(r as Kind<'tor'>, px - C.x)), radius: 20 }],
  ];

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    arcade = A;
    const v = s.v as Values;
    if (seen !== shot) {
      seen = shot;
      done.clear();
    }
    const once = (key: string, fn: () => void) => {
      if (!done.has(key)) {
        done.add(key);
        fn();
      }
    };
    // the probe readout, the only helper: live in round 1, for 1.5 s after a probe check in round 2, never in round 3
    const since = flash.since(t, k);
    const live = !shot && helperOn(r.assist, false, since);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const f = shot ? fault(r, shot.v as Values) : null;
    const ok = !!shot?.ok;
    if (shot) A.canvas.dataset.take = ok ? 'win' : (f ?? 'wrong');
    else delete A.canvas.dataset.take;
    const age = shot ? rt - VERDICT : -1;
    const x: X = { g, t, rt: shot ? rt : -1, k, v, shot: !!shot, ok, f, hot: (w) => mark.which === w && A.clock - mark.at < 0.15, mark, A };
    if (shot) {
      once('fire', () => {
        A.float('CLUNK', 96, 224, PAL.white);
        A.float('Shot away!', 86, 112, PAL.white);
      });
      if (rt >= VERDICT) {
        once('verdict', () => {
          if (ok) {
            A.sound('win');
            A.float('BEEP BOOP!', 96, 224, PAL.green);
            A.float(k === 2 ? 'FIRST PLASMA!' : 'Nice!', 86, 112, PAL.yellow);
            A.float('mmm', 552, 112, PAL.pink);
          } else A.float('Disruption…', 86, 112, PAL.red);
        });
      }
      if (n === 3 && !ok && rt >= 0.6) once('scorch', () => A.burst(...(f === 'near' ? WALL_NEAR : WALL_FAR), PAL.orange, 12, 120));
    }

    hall(g, t, k);
    const { tool, post } = SCENES[n - 1](r, x);
    const spMood: SpannerMood = age >= 0 ? (ok ? 'cheer' : 'worried') : 'happy';
    spanner(g, t, { mood: spMood, rt: shot ? rt : -1, age, look: tool });
    const ana: AnaMood = !shot ? 'idle' : age >= 0 ? (ok ? 'win' : 'miss') : 'lean';
    controlWindow(g, t, ana, k);
    vesselCam(g, t, k, { rt: shot ? rt : -1, ok });
    readout(g, live ? lcdText(r, v) : LCD_OFF, r.assist === 0 ? PAL.green : PAL.yellow);
    post();
    if (!shot) goalLine(g, goal(r));
  }

  return {
    hero: { name: 'Spanner', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: dials[n - 1],
    handles: handles[n - 1],
    test: { button: '🔎 Probe check', aria: 'Probe check: read the probe for this setting', read: (r, v) => { flash.paid(); return meterText(r, v as Values); } },
    fire: { button: '⚡ Fire the shot', aria: 'Fire a test plasma shot with these settings' },
    judge: (r, v) => judgeRound(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: VERDICT,
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
