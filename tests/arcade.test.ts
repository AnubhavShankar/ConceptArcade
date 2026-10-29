import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heartsToStars, roundScore } from '../src/core/arcade';

describe('arcade scoring', () => {
  it('a fast, charge-saving, streaking round scores more than a slow, costly, cold one', () => {
    const best = roundScore({ chargesLeft: 2, seconds: 2, streak: 3 });
    const worst = roundScore({ chargesLeft: 0, seconds: 120, streak: 0 });
    expect(worst).toBe(100);
    expect(best).toBeGreaterThan(worst * 2);
  });
  it('each unused charge is worth 50 points and the speed bonus never goes below zero', () => {
    expect(roundScore({ chargesLeft: 1, seconds: 100, streak: 0 }) - roundScore({ chargesLeft: 0, seconds: 100, streak: 0 })).toBe(50);
    expect(roundScore({ chargesLeft: 0, seconds: 1e6, streak: 0 })).toBe(100);
  });
  it('the streak multiplier is capped at four', () => {
    expect(roundScore({ chargesLeft: 0, seconds: 100, streak: 4 })).toBe(200);
    expect(roundScore({ chargesLeft: 0, seconds: 100, streak: 40 })).toBe(200);
  });
  it('hearts left map to stars between 1 and 3', () => {
    expect([0, 1, 2, 3, 5].map(heartsToStars)).toEqual([1, 1, 2, 3, 3]);
  });
});

/** Every CSS rule as [selector, body], ignoring media-query wrappers. */
function rules(css: string): [string, string][] {
  const out: [string, string][] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push([m[1].trim(), m[2]]);
  return out;
}

describe('arcade styles stay out of the shell’s way', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const all = rules(css);
  it('no rule on a class the shell already owns (.stage wraps every game) sets line-height: 0', () => {
    const bad = all.filter(([sel, body]) => /(^|,)\s*\.stage(\s|,|$)/.test(sel) && /line-height:\s*0/.test(body));
    expect(bad).toEqual([]);
  });
  it('line-height 0 is confined to the arcade screen, so text elsewhere keeps its line height', () => {
    const zero = all.filter(([, body]) => /line-height:\s*0\b/.test(body)).map(([sel]) => sel);
    expect(zero).toEqual(['.arcade-screen']);
  });
  it('the hero banner and the HUD never set line-height at all', () => {
    const touching = all.filter(([sel, body]) => /^\.(hero|hud)\b/.test(sel) && /line-height/.test(body));
    expect(touching).toEqual([]);
  });
});
