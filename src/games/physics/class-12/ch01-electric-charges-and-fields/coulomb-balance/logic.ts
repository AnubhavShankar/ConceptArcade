// Pure physics + checking logic: no DOM. This is what logic.test.ts covers.

/** Coulomb constant 1/(4πε₀) in N m² C⁻² (NCERT uses 9 × 10⁹). */
export const K = 9e9;
/** Accepted relative error on the student's distance. */
export const TOLERANCE = 0.03;

export interface Round {
  q1uC: number;
  q2uC: number;
  /** The intended answer in cm (before the force is rounded for display). */
  rCm: number;
  /** Target force in N, rounded to 3 significant figures as shown to the student. */
  targetForce: number;
}

export type Outcome = 'win' | 'units' | 'tooClose' | 'tooFar';

export interface Judgement {
  outcome: Outcome;
  /** Force (N) at the student's guessed separation, shown so they can learn from it. */
  forceAtGuess: number;
}

/** Magnitude of the force (N) between charges q1, q2 (C) separated by r (m). */
export function coulombForce(q1: number, q2: number, r: number): number {
  return (K * Math.abs(q1 * q2)) / (r * r);
}

export function makeRound(random: () => number): Round {
  const q1uC = 1 + Math.floor(random() * 9);
  const q2uC = 1 + Math.floor(random() * 9);
  const choices = [5, 10, 15, 20, 25, 30, 40, 50];
  const rCm = choices[Math.floor(random() * choices.length)];
  const targetForce = Number(coulombForce(q1uC * 1e-6, q2uC * 1e-6, rCm / 100).toPrecision(3));
  return { q1uC, q2uC, rCm, targetForce };
}

/** The exact answer (cm) for the force as displayed. */
export function answerCm(round: Round): number {
  return 100 * Math.sqrt((K * round.q1uC * 1e-6 * round.q2uC * 1e-6) / round.targetForce);
}

export function judge(round: Round, guessCm: number): Judgement {
  const forceAtGuess = coulombForce(round.q1uC * 1e-6, round.q2uC * 1e-6, guessCm / 100);
  const answer = answerCm(round);
  const near = (x: number) => Math.abs(x - answer) / answer <= TOLERANCE;

  let outcome: Outcome;
  if (near(guessCm)) outcome = 'win';
  else if (near(guessCm * 100)) outcome = 'units'; // typed metres instead of centimetres
  else outcome = forceAtGuess > round.targetForce ? 'tooClose' : 'tooFar';
  return { outcome, forceAtGuess };
}

export function starsForAttempts(attempts: number): 1 | 2 | 3 {
  return attempts <= 1 ? 3 : attempts === 2 ? 2 : 1;
}

/** 3 significant figures, no trailing noise. */
export function fmt(x: number): string {
  return String(Number(x.toPrecision(3)));
}
