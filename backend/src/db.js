import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.pgSsl ? { rejectUnauthorized: false } : undefined,
});

export const query = (text, params) => pool.query(text, params);

/** Creates tables on startup (idempotent). */
export async function initDb() {
  const sql = await fs.readFile(
    path.join(__dirname, '../sql/schema.sql'),
    'utf8'
  );
  await pool.query(sql);
}
