import type { GameManifest, LevelDef } from './manifest';

/** Everything the shell hands to a game. A game must not reach outside this. */
export interface GameContext {
  /** Empty element the game renders into. Build DOM with `h()`/`svg()` or `textContent`, never innerHTML. */
  readonly root: HTMLElement;
  readonly manifest: GameManifest;
  /** Which level to play, 1-based. Every game must behave differently per level (see `levels` in game.json). */
  readonly level: number;
  readonly levelCount: number;
  /** This level's entry from game.json. */
  readonly levelInfo: LevelDef;
  /** Seeded random in [0, 1). Use this, not Math.random, so rounds are reproducible via `?seed=`. */
  random(): number;
  /** Integer in [min, max], inclusive. */
  randomInt(min: number, max: number): number;
  /**
   * Call when the student has beaten this level. `stars` is how well they did (1 to 3);
   * the shell subtracts one per hint used (minimum 1), saves progress, unlocks the next level.
   */
  win(result: { stars: 1 | 2 | 3 }): void;
  /** Start this level again with a fresh seed (the shell unmounts and remounts the game). */
  restart(): void;
}

export interface GameModule {
  /** Render the game into `ctx.root`. May return a cleanup function (timers, rAF, listeners on window). */
  mount(ctx: GameContext): void | (() => void);
}
