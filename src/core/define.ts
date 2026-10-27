import type { GameModule } from './types';

/** Typed identity helper: `export default defineGame({ mount(ctx) { ... } })`. */
export function defineGame(game: GameModule): GameModule {
  return game;
}
