import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { expectedDir } from '../src/core/manifest';
import { validateGames } from '../scripts/lib/validate';
import { manifest } from './fixtures';

const made: string[] = [];
afterEach(() => {
  while (made.length) fs.rmSync(made.pop()!, { recursive: true, force: true });
});

/** A games tree with one valid game for the given chapter, plus an optional set of curriculum files. */
function setup(chapter: { number: number; name: string }, curriculumFiles: Record<string, unknown> | null, over: Record<string, unknown> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-games-'));
  made.push(root);
  const m = manifest('curr-game', { chapter, ...over });
  const dir = path.join(root, expectedDir(m));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(m));
  fs.writeFileSync(path.join(dir, 'index.ts'), 'export default { mount(ctx: any) { return ctx.level; } };');
  fs.writeFileSync(path.join(dir, 'logic.test.ts'), '');
  const curRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-files-'));
  made.push(curRoot);
  for (const [name, data] of Object.entries(curriculumFiles ?? {})) fs.writeFileSync(path.join(curRoot, name), typeof data === 'string' ? data : JSON.stringify(data));
  return { root, curRoot };
}

const physics12 = { subject: 'physics', classLevel: 12, chapters: [{ number: 1, name: 'Electric Charges and Fields' }, { number: 2, name: 'Electrostatic Potential and Capacitance' }] };
const chapter1 = { number: 1, name: 'Electric Charges and Fields' };

describe('curriculum consistency', () => {
  it('passes when the game matches the curriculum', () => {
    const { root, curRoot } = setup(chapter1, { 'p12.json': physics12 });
    expect(validateGames(root, curRoot).errors).toEqual([]);
  });

  it('passes with no curriculum at all (a new subject needs no shared-file edit)', () => {
    const { root, curRoot } = setup(chapter1, {});
    expect(validateGames(root, curRoot).errors).toEqual([]);
  });

  it('passes for a subject or class the curriculum does not cover', () => {
    const { root, curRoot } = setup({ number: 1, name: 'Solutions' }, { 'p12.json': physics12 }, { subject: 'chemistry' });
    expect(validateGames(root, curRoot).errors).toEqual([]);
  });

  it('rejects a chapter name that differs from the curriculum, and says what it should be', () => {
    const { root, curRoot } = setup({ number: 1, name: 'Electric Charge and Field' }, { 'p12.json': physics12 });
    expect(validateGames(root, curRoot).errors.join(' | ')).toMatch(/chapter name must be "Electric Charges and Fields"/);
  });

  it('rejects a chapter number that is not in the curriculum', () => {
    const { root, curRoot } = setup({ number: 9, name: 'Ray Optics and Optical Instruments' }, { 'p12.json': physics12 });
    expect(validateGames(root, curRoot).errors.join(' | ')).toMatch(/chapter 9 is not in the physics class 12 curriculum/);
  });

  it('reports an invalid curriculum file instead of crashing', () => {
    const { root, curRoot } = setup(chapter1, { 'bad.json': { subject: 'astrology', classLevel: 12, chapters: [] } });
    const errors = validateGames(root, curRoot).errors.join(' | ');
    expect(errors).toMatch(/curriculum\/bad\.json/);
  });

  it('reports a curriculum file that is not valid JSON', () => {
    const { root, curRoot } = setup(chapter1, { 'broken.json': '{ not json' });
    expect(validateGames(root, curRoot).errors.join(' | ')).toMatch(/curriculum\/broken\.json: not valid JSON/);
  });

  it('rejects two curriculum files for the same subject and class', () => {
    const { root, curRoot } = setup(chapter1, { 'a.json': physics12, 'b.json': physics12 });
    expect(validateGames(root, curRoot).errors.join(' | ')).toMatch(/a second file for physics class 12/);
  });
});
