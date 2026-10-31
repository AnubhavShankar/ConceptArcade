// Inspirations (code comment only): kart racers with warp pipes and shortcut tunnels (dive in at one place, pop out at another), and boost pads that change your
// speed. The player drags two warp mouths along the u-lane and sets the boost, then races. The art is in art.ts.
// Never leak the answer: the tubes, mouths and boost gauge follow the player's own setting. The ghost kart is the round 1 helper only (it drives the clean line from
// the right entry to the right exit; it is never drawn in rounds 2 and 3, nor while a race plays). A miss shows only which part of the player's setting failed, with
// fixed effects (a fixed tumble, a fixed crash, a fixed fling, a stall at a fixed height) and `hit` is a fixed point at the finish line.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { ULANE, HIT, LANE_C, XLAND, Ux, barrier, bez, gauge, ghostPose, kart, mouth, racePose, ring, ringY, scenery, trackY, tube, tubeIn, tubeOut, uAt } from './art';
import { RANGE, START, buildRounds, hintText, judge, missText, outcome, sixths, testText, uv, verdictTime, winText, type Level, type Round } from './logic';
import { GRIP_MIN, goalLine, grip, tint } from './ux';

const ARIA = 'A kart racer on a twisty track with warp pipes that lead down to a straight u-lane, where the player places the warp mouths.';
const ROLE = 'a kart racer who takes warp pipes through u-land to cut the twisty track short';
const HEROES = [
  {
    story: 'The x-land track is a twisty integral. The warp pipe substitutes u = g(x): it takes Zip from x = a to u = g(a), down the straight u-lane, and out at u = g(b). The warp’s boost is the constant left over from du = g′(x) dx.',
    objective: 'Place both warp mouths and set the boost so Zip warps through cleanly, in three rounds.',
  },
  {
    story: 'These warps use logs and exponentials: u = log x turns dx/x into du, and u = 1 + eˣ turns eˣ dx into du.',
    objective: 'Place both mouths and set the boost, in three rounds.',
  },
  {
    story: 'Backwards warps: when u falls as x rises, as u = cos x does, the exit mouth sits to the left of the entry and the boost is negative. Some warps here still run forwards, so check which way u goes.',
    objective: 'Warp through the backwards pipes cleanly, in three rounds.',
  },
  {
    story: 'The warp master’s pipes bring factors of 1/3 and limits below zero.',
    objective: 'Clear the master’s warps, in three rounds.',
  },
];

/** Where the three grips sit: the entry above the lane, the exit below it (far enough apart that two grips at the same u never overlap), the boost on its gauge. */
const HANDLE_Y = { lo: ULANE.y - 20, hi: ULANE.y + 20, k: 309 };
const BOOST = { mid: 160, half: 100 };
const boostX = (k: number) => BOOST.mid + (k / 12) * BOOST.half;
/** The round's goal, one short line on the scene. */
const GOAL = 'Goal: match u = g(x) at both limits, then set the boost';

function level(n: Level, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, t, rt, shot, A, v } = s;
    if (shot && fx.shot !== shot) {
      fx.shot = shot;
      fx.done.clear();
    }
    if (!shot) fx.shot = null;
    const once = (key: string, fn: () => void) => {
      if (fx.done.has(key)) return;
      fx.done.add(key);
      fn();
    };

    // the ghost kart: round 1 only, and never while a race plays
    const ghostOn = r.assist === 0 && !shot;
    A.canvas.dataset.ghost = ghostOn ? '1' : '0';

    const pose = shot ? racePose(r, v, rt) : null;
    const kind = shot ? outcome(r, v) : null;
    if (shot && pose && kind) {
      A.canvas.dataset.race = kind;
      A.canvas.dataset.dir = kind === 'entry' ? '0' : String(pose.dir);
      A.canvas.dataset.kart = pose.where;
    } else {
      delete A.canvas.dataset.race;
      delete A.canvas.dataset.dir;
      delete A.canvas.dataset.kart;
    }

    scenery(g, r, t);
    tint(g, s.k, t);
    tube(g, tubeIn(r, v), PAL.green, t, pose?.brokenTube ?? false);
    tube(g, tubeOut(r, v), PAL.orange, t, false);
    ring(g, XLAND.x0, ringY(r, 'in'), t, pose?.swirlIn ?? 0, PAL.green);
    ring(g, XLAND.x1, ringY(r, 'out'), t, pose?.swirlOut ?? 0, PAL.orange);
    mouth(g, Ux(v.lo), PAL.green, 'IN', false);
    mouth(g, Ux(v.hi), PAL.orange, 'OUT', (pose?.barrier ?? 0) >= 1);
    if (pose) barrier(g, Ux(v.hi) + pose.dir * 32, pose.barrier);
    gauge(g, v.k);

    if (ghostOn) {
      const gp = ghostPose(r, t);
      if (gp) kart(g, gp.x, gp.y, t, { ghost: true, scale: gp.scale, flip: gp.flip, wheel: gp.wheel });
    }

    if (shot && pose && kind) {
      // one-shot effects at the moment each part of the race happens
      if (rt >= 0.3) once('dive', () => A.burst(XLAND.x0, ringY(r, 'in'), PAL.green, 10, 110));
      if (kind === 'entry') {
        if (rt >= 0.4) once('break', () => { const [bx, by] = bez(tubeIn(r, v), 0.5); A.burst(bx, by, PAL.yellow, 14, 140); });
        if (rt >= 0.55) once('float', () => A.float('DEAD PIPE!', 320, 205, PAL.orange));
      } else if (kind === 'exit') {
        if (rt >= 1.4) {
          once('crash', () => A.burst(Ux(v.hi) + pose.dir * 24, LANE_C, PAL.orange, 22, 200));
          once('float', () => A.float('CRASH!', 320, 205, PAL.orange));
        }
      } else if (kind === 'fast') {
        if (rt >= 1.5) {
          once('pop', () => A.burst(XLAND.x1, ringY(r, 'out'), PAL.orange, 16, 180));
          once('float', () => A.float('SPIN OUT!', 320, 205, PAL.orange));
        }
      } else if (kind === 'slow') {
        if (rt >= 1.5) {
          once('puff', () => { const [bx, by] = bez(tubeOut(r, v), 0.45); A.burst(bx, by, PAL.yellow, 8, 80); });
          once('float', () => A.float('STALLED!', 320, 205, PAL.orange));
        }
      } else {
        if (rt >= 1.7) {
          once('pop', () => A.burst(XLAND.x1, ringY(r, 'out'), PAL.green, 26, 200));
          once('float', () => A.float('WARP!', 320, 205, PAL.green));
        }
        if (rt >= 1.97) {
          once('confetti', () => {
            const y = trackY(r, XLAND.finish) - 20;
            A.burst(XLAND.finish, y, PAL.yellow, 36, 240);
            A.burst(XLAND.finish, y, PAL.pink, 24, 200);
          });
        }
      }
    }

    // Zip: parked and idling while the player sets the warp, then the race
    if (pose) kart(g, pose.x, pose.y, t, { mood: pose.mood, scale: pose.scale, flip: pose.flip, rot: pose.rot, flame: pose.flame, wheel: pose.wheel, visorDown: pose.visorDown, stars: pose.stars });
    else kart(g, XLAND.park, trackY(r, XLAND.park) - 11.2, t, { mood: 'happy', scale: 0.8, flame: 0.1, wheel: t * 2, idle: true });

    // The grips of the three handles, each with the player's own setting beside it (the boost is written on its gauge), and the round's goal.
    if (!shot) {
      const cue = n === 1 && s.k === 0;
      grip(g, A.canvas, t, { x: Ux(v.lo), y: HANDLE_Y.lo, r: GRIP_MIN, dir: 'h', read: `entry u = ${uv(v.lo)}`, side: v.lo > 18 ? 'left' : 'right', cue, glass: true });
      grip(g, A.canvas, t, { x: Ux(v.hi), y: HANDLE_Y.hi, r: GRIP_MIN, dir: 'h', read: `exit u = ${uv(v.hi)}`, side: v.hi > 18 ? 'left' : 'right', glass: true });
      grip(g, A.canvas, t, { x: boostX(v.k), y: HANDLE_Y.k, r: GRIP_MIN, dir: 'h', read: '', side: 'right', glass: true });
    }
    goalLine(g, GOAL, A.t, shot !== null, 64);
  }

  return {
    hero: { name: 'Zip', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [
      { key: 'lo', aria: 'Entry mouth position on the u-lane', label: 'Entry u', unit: '', step: 1, min: RANGE.lo.min, max: RANGE.lo.max, start: START.lo },
      { key: 'hi', aria: 'Exit mouth position on the u-lane', label: 'Exit u', unit: '', step: 1, min: RANGE.hi.min, max: RANGE.hi.max, start: START.hi },
      { key: 'k', aria: 'Warp boost factor, in sixths', label: 'Boost', unit: '', step: 1, min: RANGE.k.min, max: RANGE.k.max, start: START.k, text: (v) => `×${sixths(v)}` },
    ],
    handles: [
      { dial: 'lo', at: (_r, v) => [Ux(v.lo), HANDLE_Y.lo], drag: (_r, px) => uAt(px), radius: GRIP_MIN },
      { dial: 'hi', at: (_r, v) => [Ux(v.hi), HANDLE_Y.hi], drag: (_r, px) => uAt(px), radius: GRIP_MIN },
      { dial: 'k', at: (_r, v) => [boostX(v.k), HANDLE_Y.k], drag: (_r, px) => Math.max(RANGE.k.min, Math.min(RANGE.k.max, Math.round(((px - BOOST.mid) / BOOST.half) * 12))), radius: GRIP_MIN },
    ],
    test: { button: '🏁 Test lap', aria: 'Test lap: check the entry, the exit and the boost', read: (r, v) => testText(r, v) },
    fire: { button: '🏎 Race', aria: 'Race through the warp' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: (r, v) => verdictTime(r, v),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as Level;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
