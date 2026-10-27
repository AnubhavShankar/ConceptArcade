import { z } from 'zod';

export const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'biology'] as const;
export const DIFFICULTIES = ['concept', 'application', 'challenge'] as const;
export const MECHANICS = [
  'tune-to-target',
  'build-the-setup',
  'predict-then-reveal',
  'fix-the-broken',
  'numeric-puzzle',
  'match-and-sort',
  'deduce-the-hidden',
  'other',
] as const;

export const LEVEL_KINDS = ['foundation', 'complexity', 'concept'] as const;

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** One rung of a game's difficulty ladder. */
export const levelSchema = z
  .object({
    title: z.string().min(3).max(50),
    tier: z.enum(DIFFICULTIES),
    kind: z
      .enum(LEVEL_KINDS)
      .describe(
        'foundation = the first level; complexity = same idea, harder numbers/steps/more bodies; concept = adds a new idea on top of the previous level.',
      ),
    adds: z
      .string()
      .min(5)
      .max(160)
      .describe('Level 1: the baseline skill. Later levels: exactly what is new compared with the previous level.'),
    hints: z
      .array(z.string().min(3).max(200))
      .min(2)
      .max(4)
      .describe('Ordered from gentlest nudge to most revealing. Each hint costs the student one star.'),
  })
  .strict();

export type LevelDef = z.infer<typeof levelSchema>;

/** The metadata every game ships in its `game.json`. */
export const manifestSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(kebab, 'must be kebab-case, e.g. "coulomb-balance"').max(48),
    title: z.string().min(3).max(60),
    summary: z.string().min(60).max(140), // also the search-result description, so it must be a real sentence
    subject: z.enum(SUBJECTS),
    classLevel: z.number().int().min(6).max(12),
    chapter: z
      .object({
        number: z.number().int().min(1).max(30),
        name: z.string().min(3).max(80),
      })
      .strict(),
    ncertRef: z
      .string()
      .min(3)
      .max(80)
      .regex(/^Section \d+(\.\d+)*(?![\d.])/, 'must start with the textbook section number, e.g. "Section 1.4.2, Charge is conserved"')
      .describe('Where the concept is taught, starting with the section number, e.g. "Section 1.4, Coulomb\'s Law". Games are listed in this textbook order. Reference only; never copy text.'),
    order: z
      .number()
      .int()
      .min(0)
      .max(99)
      .optional()
      .describe('Position among games that share the same textbook section (lower comes first). Leave out if yours is the only one.'),
    concepts: z.array(z.string().min(2).max(60)).min(1).max(6),
    learningOutcome: z
      .string()
      .min(10)
      .max(200)
      .describe('What a student can do after winning that they could not reliably do before.'),
    mechanic: z.enum(MECHANICS),
    estimatedMinutes: z.number().int().min(1).max(60).describe('Total for all levels.'),
    levels: z
      .array(levelSchema)
      .min(1)
      .max(6)
      .describe('One level is fine for a single-difficulty game. With 2 or more, each level must add complexity or a concept.')
      .superRefine((levels, ctx) => {
        levels.forEach((l, i) => {
          if (i === 0 && l.kind !== 'foundation') {
            ctx.addIssue({ code: 'custom', path: [i, 'kind'], message: 'level 1 must have kind "foundation"' });
          }
          if (i > 0 && l.kind === 'foundation') {
            ctx.addIssue({ code: 'custom', path: [i, 'kind'], message: 'only level 1 can be "foundation"; use "complexity" or "concept"' });
          }
          if (i > 0 && DIFFICULTIES.indexOf(l.tier) < DIFFICULTIES.indexOf(levels[i - 1].tier)) {
            ctx.addIssue({ code: 'custom', path: [i, 'tier'], message: 'tiers must never go down from one level to the next' });
          }
        });
      }),
    misconceptions: z.array(z.string().min(3).max(160)).max(5).optional(),
    author: z
      .object({
        name: z.string().min(1).max(60),
        github: z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, 'GitHub username'),
      })
      .strict(),
  })
  .strict();

export type GameManifest = z.infer<typeof manifestSchema>;

/** Hardest tier reached by the game's last level. */
export function topTier(m: GameManifest): (typeof DIFFICULTIES)[number] {
  return m.levels[m.levels.length - 1].tier;
}

/** "Section 1.4.2, Charge is conserved" -> [1, 4, 2], so games list in textbook order. Unparseable refs sort last. */
export function sectionKey(m: GameManifest): number[] {
  const hit = /(\d+(?:\.\d+)*)/.exec(m.ncertRef);
  return hit ? hit[1].split('.').map(Number) : [Number.MAX_SAFE_INTEGER];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Folder (relative to src/games) a game must live in, derived from its manifest. */
export function expectedDir(m: GameManifest): string {
  const ch = String(m.chapter.number).padStart(2, '0');
  return `${m.subject}/class-${m.classLevel}/ch${ch}-${slugify(m.chapter.name)}/${m.id}`;
}

export type ParseResult =
  | { ok: true; manifest: GameManifest }
  | { ok: false; errors: string[] };

export function parseManifest(raw: unknown): ParseResult {
  const r = manifestSchema.safeParse(raw);
  if (r.success) return { ok: true, manifest: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
