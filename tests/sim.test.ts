import { afterEach, describe, expect, it, vi } from 'vitest';
import { startLoop, stepPendulum, type Pendulum } from '../src/core/sim';

const run = (p: Pendulum, accel: number, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) stepPendulum(p, accel, dt);
  return p;
};

describe('stepPendulum', () => {
  it('rests at zero with no force', () => {
    const p = run({ x: 0, v: 0 }, 0, 3);
    expect(p.x).toBe(0);
  });

  it('settles at accel / ω² under a steady push (ω² = 25)', () => {
    const p = run({ x: 0, v: 0 }, 500, 8);
    expect(p.x).toBeCloseTo(500 / 25, 1);
  });

  it('pushes the right way: positive accel moves right, negative moves left', () => {
    expect(run({ x: 0, v: 0 }, 300, 2).x).toBeGreaterThan(0);
    expect(run({ x: 0, v: 0 }, -300, 2).x).toBeLessThan(0);
  });

  it('swings back and settles after the force is removed', () => {
    const p = run({ x: 0, v: 0 }, 800, 3);
    expect(Math.abs(p.x)).toBeGreaterThan(10);
    run(p, 0, 10);
    expect(Math.abs(p.x)).toBeLessThan(0.5);
  });

  it('stays stable at the largest frame step the loop allows (50 ms)', () => {
    const p = run({ x: 50, v: 0 }, 0, 10, 0.05);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Math.abs(p.x)).toBeLessThan(50);
  });

  it('never leaves its limit', () => {
    const p = run({ x: 0, v: 0 }, 1e6, 2);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(140);
  });
});

describe('startLoop', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A fake requestAnimationFrame we can step by hand. */
  function fakeRaf() {
    const queue = new Map<number, (t: number) => void>();
    let next = 1;
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      queue.set(next, cb);
      return next++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
    return (time: number) => {
      const batch = [...queue.entries()];
      queue.clear();
      batch.forEach(([, cb]) => cb(time));
    };
  }

  it('keeps running after a frame throws (one bad frame must not freeze the game)', () => {
    const step = fakeRaf();
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let calls = 0;
    const stop = startLoop(() => {
      calls++;
      if (calls === 1) throw new Error('boom');
    });
    step(16);
    step(32);
    step(48);
    expect(calls).toBe(3);
    expect(err).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops for good when asked, even from inside a frame', () => {
    const step = fakeRaf();
    let calls = 0;
    let stop = () => undefined as void;
    stop = startLoop(() => {
      calls++;
      stop();
    });
    step(16);
    step(32);
    step(48);
    expect(calls).toBe(1);
  });

  it('clamps a huge time step so physics cannot explode after a tab switch', () => {
    const step = fakeRaf();
    const dts: number[] = [];
    const stop = startLoop((dt) => dts.push(dt));
    step(10_000);
    expect(dts[0]).toBeLessThanOrEqual(0.05);
    stop();
  });
});
