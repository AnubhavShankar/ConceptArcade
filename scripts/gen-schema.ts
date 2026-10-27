import fs from 'node:fs';
import { z } from 'zod';
import { manifestSchema } from '../src/core/manifest';

// Editors use this for autocomplete/validation when game.json has a "$schema" pointing at it.
fs.mkdirSync('schema', { recursive: true });
fs.writeFileSync('schema/game.schema.json', JSON.stringify(z.toJSONSchema(manifestSchema), null, 2) + '\n');
console.log('wrote schema/game.schema.json');
