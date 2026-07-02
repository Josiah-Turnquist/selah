import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.js';

const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');

try {
  await pool.query(schema);
  console.log('schema applied');
} finally {
  await pool.end();
}
