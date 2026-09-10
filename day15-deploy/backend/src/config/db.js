import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon/Supabase require SSL; local Postgres (via pgAdmin) does not and will
// error if you force it on. NODE_ENV=production is what Render sets
// automatically, so this switches on its own — no manual toggling needed.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('Postgres connected at:', result.rows[0].now);
  } finally {
    client.release();
  }
}
