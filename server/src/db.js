import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Neon (and most hosted Postgres) require TLS; local dev does not.
const local = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: local ? undefined : { rejectUnauthorized: false },
  max: 5,
});

export const q = (text, params) => pool.query(text, params);
