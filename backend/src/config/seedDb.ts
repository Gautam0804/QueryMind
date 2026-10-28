
import 'dotenv/config';
import { Pool } from 'pg';

const required = ['RAG_DB_USER', 'RAG_DB_PASSWORD'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const seedPool = new Pool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 15433),
  database: process.env.DB_NAME ?? 'querymind',
  user: process.env.RAG_DB_USER,
  password: process.env.RAG_DB_PASSWORD,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  max: 2,
  application_name: 'querymind-rag-seed',
});

seedPool.on('error', () => {
  console.error('Unexpected error from an idle RAG seed connection.');
});
