// A single shared connection pool. Every route imports this instead of
// opening its own connection — that's the whole point of a pool.
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Most hosted Postgres (Render, Supabase, Railway) requires TLS but ships
    // a certificate the pg driver doesn't automatically trust. This is the
    // standard escape hatch for that — fine for a project like this one.
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    // A background/idle client dying shouldn't crash the whole server.
    console.error('Unexpected error on idle Postgres client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
