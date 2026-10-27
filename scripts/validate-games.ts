import path from 'node:path';
import { validateGames } from './lib/validate';

const root = path.resolve('src/games');
const { errors, games } = validateGames(root);

if (errors.length) {
  console.error(`\nGame validation failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nSee CONTRIBUTING.md for the rules.\n');
  process.exit(1);
}
console.log(`✓ ${games.length} game${games.length === 1 ? '' : 's'} valid`);
