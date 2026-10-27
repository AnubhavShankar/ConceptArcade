import { parseManifest, type GameManifest } from '../src/core/manifest';
import type { GameEntry } from '../src/core/registry';

/** A valid manifest for tests; override any field. */
export function manifest(id: string, over: Partial<Record<string, unknown>> = {}): GameManifest {
  const level = (title: string, tier: string, kind: string) => ({ title, tier, kind, adds: `${title} adds something.`, hints: ['First hint here', 'Second hint here'] });
  const r = parseManifest({
    id,
    title: `Game ${id}`,
    summary: `A game called ${id}, written for the tests, with enough words in it.`,
    subject: 'physics',
    classLevel: 12,
    chapter: { number: 1, name: 'Electric Charges and Fields' },
    ncertRef: 'Section 1.2, Electric Charge',
    concepts: ['Charge'],
    learningOutcome: 'Student can do the thing well.',
    mechanic: 'other',
    estimatedMinutes: 5,
    levels: [level('One', 'concept', 'foundation'), level('Two', 'application', 'complexity'), level('Three', 'challenge', 'concept')],
    author: { name: 'Tester', github: 'tester' },
    ...over,
  });
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.manifest;
}

/** A catalog entry (the shell only needs `manifest` for browsing; `load` is never called here). */
export const entry = (id: string, over: Partial<Record<string, unknown>> = {}): GameEntry => ({
  manifest: manifest(id, over),
  load: async () => ({ mount: () => undefined }),
});
