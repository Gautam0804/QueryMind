
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { pool, historyPool } from './config/db';
import queryRouter from './routes/query';
import analyticsRouter from './routes/analytics';
import queryHistoryRouter from './routes/queryHistory';
import authRouter from './routes/auth';
import { getSchemaTables } from './services/schema';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.disable('x-powered-by');

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Authentication
app.use('/api/auth', authRouter);

// Health checks
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'QueryMind API',
  });
});

app.get('/api/db-health', async (_req, res) => {
  try {
    await pool.query('SELECT 1 AS connected');

    return res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    return res.status(503).json({
      status: 'error',
      database: 'unavailable',
      message: 'Database connection failed.',
    });
  }
});

// Database schema
app.get('/api/schema', async (_req, res) => {
  try {
    const tables = await getSchemaTables();
    return res.json({ tables });
  } catch {
    return res.status(503).json({
      error: 'Unable to retrieve database schema.',
    });
  }
});

// Application routes
app.use('/api/analytics', analyticsRouter);
app.use('/api/query-history', queryHistoryRouter);
app.use('/api/query', queryRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found.',
  });
});

// Error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(
      '[QueryMind API] Unhandled error:',
      err instanceof Error ? err.message : 'Unknown error',
    );

    if (res.headersSent) return;

    return res.status(500).json({
      error: 'Internal server error.',
    });
  },
);

const server = app.listen(port, () => {
  console.log(`QueryMind API running at http://localhost:${port}`);
});

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(async () => {
    await Promise.allSettled([
      pool.end(),
      historyPool.end(),
    ]);

    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
