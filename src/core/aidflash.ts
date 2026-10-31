// The helper rule of the dial games: round 1 (assist 0) has the live helper, round 2 (assist 1) shows it only for a moment
// after a paid check, round 3 (assist 2) never. After a miss the true value or construction is never drawn.

/** How long the round 2 helper stays on after a paid check, in seconds. */
export const FLASH = 1.5;

/**
 * Remembers when the paid check was made. Call `paid()` from the check button and `since(clock, k)` once per frame from the
 * scene (clock = seconds since the game began, k = round index): the result is the seconds since the last paid check in
 * this round, or Infinity if there was none. A new round forgets the check.
 */
export function paidFlash() {
  let pending = false;
  let at = 0;
  let round = -1;
  return {
    paid() {
      pending = true;
    },
    since(clock: number, k: number): number {
      if (pending) {
        pending = false;
        at = clock;
        round = k;
      }
      return round === k ? clock - at : Infinity;
    },
  };
}

/** Whether the helper (anything that reveals the true value) is drawn: live in round 1, on a win, or around a paid check in round 2. */
export const helperOn = (assist: 0 | 1 | 2, won: boolean, since: number) => assist === 0 || won || (assist === 1 && since < FLASH);
