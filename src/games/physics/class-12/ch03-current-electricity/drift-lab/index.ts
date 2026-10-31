// Inspirations (code comment only): kart-racer time trials against a ghost racer, the pacing lights of athletics meets, and village-fair snail races.
// The player sets the pace for Zip, a free electron in a copper wire, so that he drifts beside Shelly the champion racing snail: the race current and its
// arrow (level 1), the current (level 2), the race wire off the spool rack (level 3), the millivolt throttle and the wire (level 4). Then the Marshal drops the flag.
// Never leak the answer: Zip never drifts before the flag; on a miss Zip and Shelly stop at the fixed 0.6 of the track, never at a fraction of the error; the pace
// board is the only helper (live in round 1, for 1.5 s after a pace check in round 2, never in round 3); `hit` is a fixed point; every animation ends by 2.4 s.
// The art is in art.ts.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { text } from '@core/neon';
import {
  LANE, RACK3, RACK4, RAIL, SWITCH, arrowSwitch, battery, board, camera, capX, clamp01, confetti, crossAt, crowd, ease, facingOf, fairground, feederLabel, finishX, flashRect, grip, lamp,
  lampAt, lanes, lens, lensArm, marshal, photo, poses, rack, rail, setting, shards, shelly, signal, slotX, startX, table, trophy, tube, zipDot,
  type MarshalState, type Outcome, type ShellyState, type ZipMood,
} from './art';
import {
  DIAL, FEEDER, LCD_OFF, buildRounds, factLabel, fault, goalLine, hintText, judge, lampState, lcdText, meterText, missText, verdictDelay, winText, type Round,
} from './logic';

const ARIA = 'A snail race at a fair: a racing snail on a chalk lane beside a copper wire in a glass tube, a magnifier showing a free electron inside the wire, a race battery at one end and a finish lamp at the other.';
const ROLE = 'a free electron in a copper wire, hired to pace the champion racing snail';
const HEROES = [
  {
    story: 'The fair’s snail race has a new pacer: Zip, a free electron in a copper wire laid along the track in a glass tube. When the flag drops the battery connects, and every free electron starts to drift toward the battery’s + end. A current is charge per second through the start gate, and by convention it points the opposite way to the electrons’ drift.',
    objective: 'Set the current and its direction so Zip drifts beside Shelly to a dead heat, in three heats.',
  },
  {
    story: 'Now the stewards give Shelly’s record time and the wire’s cross-section. Every free electron drifts at v_d = I/(neA), and copper has 8.5 × 10²⁸ free electrons in each cubic metre, so even a big current only makes them crawl.',
    objective: 'Set the current that makes Zip drift at exactly Shelly’s record pace.',
  },
  {
    story: 'The race battery now drives a fixed current, and you pick the race wire from the spool rack. The same current flows through the thick feeder and the race wire, so where the wire is thinner the electrons drift faster. Nobody measured the track, but the finish lamp lit a few nanoseconds after the field passed the start gate: the field that starts the drift moves at 3 × 10⁸ m/s.',
    objective: 'Pick the race wire that makes Zip drift at Shelly’s record pace.',
  },
  {
    story: 'The finals use a millivolt supply that holds the voltage across the track wire. That voltage sets a field E = V/L, and each electron drifts at v_d = μE, where μ is copper’s mobility on the day. The current that drift carries, I = nAev_d, lights the photo-finish lamp in series: too little and the photo is too dark, too much and the lamp blows.',
    objective: 'Set the voltage and the race wire so Zip ties Shelly and the lamp lights the photo.',
  },
];
const BANNER = ['HEAT 1', 'SEMI-FINAL', 'GRAND FINAL'];

type Dial = { min: number; max: number };
const railX = (d: Dial, x: number) => RAIL.x0 + ((x - d.min) / (d.max - d.min)) * (RAIL.x1 - RAIL.x0);
const railHandle = (key: string, d: Dial): HandleSpec<Round> => ({
  dial: key,
  at: (_r, v) => [railX(d, v[key]), RAIL.y],
  drag: (_r, px) => d.min + ((px - RAIL.x0) / (RAIL.x1 - RAIL.x0)) * (d.max - d.min),
  radius: 20,
});
const spoolHandle = (rack3: typeof RACK3): HandleSpec<Round> => ({
  dial: 'a',
  at: (_r, v) => [slotX(v.a), rack3.y + rack3.h / 2],
  drag: (_r, px) => 0.25 * (Math.floor((px - rack3.x0) / rack3.w) + 1),
  radius: 20,
});

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  let touched = false;
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v;
    if (fx.shot !== shot) {
      fx.shot = shot;
      fx.done.clear();
    }
    const once = (key: string, fn: () => void) => {
      if (!fx.done.has(key)) {
        fx.done.add(key);
        fn();
      }
    };
    if (n === 1 && v.i !== DIAL.i1.start) touched = true;

    const f = shot ? fault(r, shot.v) : null;
    const out: Outcome | null = shot ? (shot.ok ? 'win' : (f ?? 'slow')) : null;
    const tv = shot ? verdictDelay(r, shot.v) : 0;
    const since = shot ? rt - tv : -1; // seconds since the verdict
    const P = shot ? poses(r, f, rt) : { sp: 0, zp: 0, zx: startX(r) };
    if (out) {
      A.canvas.dataset.take = out;
      A.canvas.dataset.pos = `${P.sp.toFixed(2)},${P.zp.toFixed(2)}`;
    } else {
      delete A.canvas.dataset.take;
      delete A.canvas.dataset.pos;
    }

    // the pace board, the only helper
    const sinceCheck = flash.since(t, k);
    const won = shot !== null && shot.ok;
    const missed = shot !== null && !shot.ok;
    const live = helperOn(r.assist, won, missed ? Infinity : sinceCheck);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const boardText = live ? lcdText(r, v) : LCD_OFF;

    const s0 = startX(r);
    const s1 = finishX(r);
    const face = facingOf(r);
    const lampSt = r.kind === 'mob' ? lampState(r, v) : 'ok';

    // ---- the take, shared by every level -----------------------------------------------------------------------------------------------------------------
    let zMood: ZipMood = 'happy';
    let sState: ShellyState = 'idle';
    let sU = 0;
    let mState: MarshalState = 'idle';
    let mU = 0;
    let bob = 0;
    let lampLit = 0;
    let popped = false;
    let flare = false;
    let visor = false;
    let run = 0;
    if (shot) {
      once('go', () => A.float('GO!', 572, 250, PAL.green));
      mState = 'go';
      mU = rt;
      visor = rt >= 0.1 && since < 0;
      run = since < 0 ? ease((rt - 0.1) / 0.2) : 0;
      sState = P.sp > 0 && rt < (crossAt(f) ?? 0.6) ? 'racing' : 'idle';
      if (rt >= 0.08) {
        if (lampSt === 'ok') lampLit = 1;
        else if (lampSt === 'dim') lampLit = 0.3;
        else if (rt < 0.3) {
          lampLit = 1;
          flare = rt < 0.25;
        } else popped = true;
      }
      if (lampSt === 'blown' && rt >= 0.3) {
        once('pop', () => A.float('POP', lampAt(r)[0], 140, PAL.orange));
      }
      if (f === 'backward' && rt >= 0.6) {
        once('bonk', () => {
          A.float('BONK', capX(r), 222, PAL.white);
          A.shake(5);
        });
        zMood = 'dizzy';
        visor = false;
      }
      if (since >= 0) {
        if (out === 'win') {
          zMood = 'cheer';
          sState = 'win';
          sU = since;
          mState = 'win';
          mU = since;
          bob = since < 0.8 ? 4 * Math.abs(Math.sin((Math.PI * since) / 0.4)) : 0;
          once('verdict', () => A.float('RECORD!', 572, 250, PAL.yellow));
        } else {
          if (f !== 'backward') zMood = 'worried';
          sState = f === 'fast' ? 'sigh' : f === 'backward' || f === 'slow' || f === 'dim' || f === 'blown' ? 'look' : 'idle';
          sU = since;
          mState = f === 'backward' ? 'palm' : 'nope';
          mU = since;
          once('verdict', () => {
            A.float(f === 'backward' ? 'WRONG WAY' : 'NO RECORD', 572, 250, PAL.red);
            A.float(f === 'fast' ? 'sigh…' : '?', s0 + (s1 - s0) * P.sp, 186, PAL.white);
          });
        }
      }
    }

    // ---- compose the frame (README order) --------------------------------------------------------------------------------------------------------------
    fairground(g, t, k, calm);
    if (k === 2) trophy(g);
    crowd(g, k, bob);
    if (out && since >= 0) photo(g, out, -92 + 146 * ease(since / 0.25), t);
    table(g);
    lanes(g, r);
    const fact = factLabel(r);
    if (fact) text(g, fact, 315, 196, PAL.white, 11);
    const [lx] = lampAt(r);
    lamp(g, r, lampLit, popped);
    if (flare) {
      g.globalAlpha = 0.8;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(lx, lampAt(r)[1], 13, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    if (shot && popped) shards(g, r, rt - 0.3);
    if (lampSt === 'dim' && shot && rt >= 0.08) text(g, 'dim', lx + (lx > 320 ? -13 : 13), lampAt(r)[1] + 4, PAL.white, 11, lx > 320 ? 'right' : 'left');
    camera(g, r);
    lensArm(g);
    const shellyX = s0 + (s1 - s0) * P.sp;
    shelly(g, shellyX, LANE.snailY, t, { facing: face, state: sState, trailFrom: shot ? s0 : null, u: sU });
    tube(g);
    if (shot && rt < 0.08) signal(g, s0 + ((s1 - s0) * rt) / 0.08);
    zipDot(g, shot && rt >= 0.1 ? P.zx : s0, t, calm);
    if (!shot) text(g, 'Zip', s0, 264, PAL.cyan, 11);
    lens(g, t, P.zx - s0, { mood: zMood, visor, facing: face, run, calm }, calm);
    battery(g, n, (r as Extract<Round, { kind: 'thick' }>).i);
    if (n === 3) feederLabel(g, FEEDER);
    if (n === 1) {
      arrowSwitch(g, v.dir);
      setting(g, `current ${v.dir ? '←' : '→'}`, 36, 250);
      grip(g, SWITCH.x + (v.dir ? -SWITCH.len : SWITCH.len), SWITCH.y, '⇔');
    }
    if (n === 3 || n === 4) {
      const R = n === 3 ? RACK3 : RACK4;
      rack(g, n, v.a);
      grip(g, slotX(v.a), R.y + R.h / 2, '⇔', 0.6);
      if (!shot) setting(g, `${v.a} mm²`, slotX(v.a), n === 3 ? 292 : 264);
    }
    if (n === 1 || n === 2) {
      const d = n === 1 ? DIAL.i1 : DIAL.i2;
      rail(g, d.min, d.max);
      const hx = railX(d, v.i);
      grip(g, hx, RAIL.y, '⇔');
      setting(g, `${v.i} A`, hx, 302);
      if (n === 1 && k === 0 && !touched) text(g, 'drag ⇔', hx, 286 + 3 * Math.sin(4 * t), PAL.yellow, 12);
    }
    if (n === 4) {
      rail(g, DIAL.mv.min, DIAL.mv.max);
      const hx = railX(DIAL.mv, v.mv);
      grip(g, hx, RAIL.y, '⇔');
      if (hx > 480) setting(g, `${v.mv} mV`, hx - 26, 334, 'right');
      else setting(g, `${v.mv} mV`, hx + 26, 334, 'left');
    }
    marshal(g, t, mState, mU);
    board(g, boardText, r.assist === 0 ? PAL.green : PAL.yellow);
    text(g, BANNER[k], 12, 20, PAL.yellow, 11, 'left');
    text(g, goalLine(r), 320, 20, PAL.white, 13);

    // ---- take effects ---------------------------------------------------------------------------------------------------------------------------------
    if (shot && rt >= 0.08 && rt < 1.2) {
      g.globalAlpha = rt < 0.8 ? 1 : clamp01(1 - (rt - 0.8) / 0.4);
      text(g, 'signal 3 × 10⁸ m/s', 315, 184, PAL.white, 11);
      g.globalAlpha = 1;
    }
    const cross = shot ? crossAt(f) : null;
    if (shot && cross !== null && !calm) flashRect(g, s1, rt - cross);
    if (out === 'win' && since >= 0 && !calm) confetti(g, since);
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  const dA: DialSpec<Round> = { key: 'a', aria: 'Race wire cross-section in square millimetres', label: 'Race wire', unit: 'mm²', ...DIAL.a };
  if (n === 1) {
    dials.push(
      { key: 'i', aria: 'Race current in amperes', label: 'Current', unit: 'A', ...DIAL.i1 },
      { key: 'dir', aria: 'Current arrow: 0 points left to right, 1 points right to left', label: 'Current arrow', unit: '', ...DIAL.dir, text: (x) => (x ? '← right to left' : '→ left to right') },
    );
    handles.push(railHandle('i', DIAL.i1), {
      dial: 'dir',
      at: (_r, v) => [SWITCH.x + (v.dir ? -SWITCH.len : SWITCH.len), SWITCH.y],
      drag: (_r, px) => (px < SWITCH.x ? 1 : 0),
      radius: 20,
    });
  } else if (n === 2) {
    dials.push({ key: 'i', aria: 'Race current in amperes', label: 'Current', unit: 'A', ...DIAL.i2 });
    handles.push(railHandle('i', DIAL.i2));
  } else if (n === 3) {
    dials.push(dA);
    handles.push(spoolHandle(RACK3));
  } else {
    dials.push({ key: 'mv', aria: 'Voltage across the track wire in millivolts', label: 'Voltage', unit: 'mV', ...DIAL.mv }, dA);
    handles.push(railHandle('mv', DIAL.mv), spoolHandle(RACK4));
  }

  return {
    hero: { name: 'Zip', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '⏱ Pace check',
      aria: 'Pace check: read the pace board for this setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v);
      },
    },
    fire: { button: '🏁 Drop the flag', aria: 'Drop the flag and start the heat' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 170],
    delay: (r, v) => verdictDelay(r, v),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
