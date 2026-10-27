// Small toolkit for canvas-based simulation games. Pure physics is exported separately so it can be tested.

/** Size a canvas for a logical w × h scene, crisp on high-DPI screens, scaling to the container's width. */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.aspectRatio = `${w} / ${h}`;
  canvas.style.touchAction = 'none'; // dragging on a phone must not scroll the page
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

/** Convert a pointer position to the scene's logical coordinates. */
export function pointerToLocal(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
}

/**
 * requestAnimationFrame loop with a clamped time step. Returns a stop function (use it as your cleanup).
 * The next frame is scheduled BEFORE the callback runs and errors are caught, so one bad frame can
 * never kill the loop and freeze the game.
 */
export function startLoop(frame: (dt: number) => void): () => void {
  let id = 0;
  let alive = true;
  let last = performance.now();
  const tick = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    id = requestAnimationFrame(tick);
    try {
      frame(dt);
    } catch (e) {
      console.error(e);
    }
  };
  id = requestAnimationFrame(tick);
  return () => {
    alive = false;
    cancelAnimationFrame(id);
  };
}

/** A hanging body's horizontal state: x is the displacement from its resting position. */
export interface Pendulum {
  x: number;
  v: number;
}

/**
 * One step of a damped pendulum (small-angle): a = accel − ω² x − c v. Semi-implicit Euler is stable
 * at the clamped frame step. `accel` is the horizontal acceleration from outside forces.
 */
export function stepPendulum(
  p: Pendulum,
  accel: number,
  dt: number,
  { omega2 = 25, damping = 2.2, limit = 140 }: { omega2?: number; damping?: number; limit?: number } = {},
): void {
  p.v += (accel - omega2 * p.x - damping * p.v) * dt;
  p.x += p.v * dt;
  if (Math.abs(p.x) > limit) {
    p.x = Math.sign(p.x) * limit;
    p.v = 0;
  }
}
