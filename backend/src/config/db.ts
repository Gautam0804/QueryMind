
import 'dotenv/config';
import { Pool } from 'pg';

const requiredEnv = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'HISTORY_DB_USER',
  'HISTORY_DB_PASSWORD',
  'AUTH_DB_USER',
  'AUTH_DB_PASSWORD',
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const port = Number(process.env.DB_PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid port number.');
}

const commonConfig = {
  host: process.env.DB_HOST,
  port,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  max: 5,
};

// Read-only connection for schema inspection and query execution.
export const pool = new Pool({
  ...commonConfig,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  application_name: 'querymind-backend',
});

// Dedicated connection for query-history writes.
export const historyPool = new Pool({
  ...commonConfig,
  user: process.env.HISTORY_DB_USER,
  password: process.env.HISTORY_DB_PASSWORD,
  application_name: 'querymind-history-writer',
});

// Dedicated connection for authentication and user records.
export const authPool = new Pool({
  ...commonConfig,
  user: process.env.AUTH_DB_USER,
  password: process.env.AUTH_DB_PASSWORD,
  application_name: 'querymind-auth-writer',
});

pool.on('error', () => {
  console.error(
    'Unexpected error from an idle PostgreSQL reader connection.'
  );
});

historyPool.on('error', () => {
  console.error(
    'Unexpected error from an idle PostgreSQL history connection.'
  );
});

authPool.on('error', () => {
  console.error(
    'Unexpected error from an idle PostgreSQL auth connection.'
  );
});
