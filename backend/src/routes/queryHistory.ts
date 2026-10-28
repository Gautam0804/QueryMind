
import { Router } from 'express';
import { historyPool } from '../config/db';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    try {
      const result = await historyPool.query(
        `SELECT
           id,
           question,
           generated_sql AS "generatedSql",
           status,
           row_count AS "rowCount",
           duration_ms AS "durationMs",
           error_message AS "errorMessage",
           created_at AS "createdAt",
           completed_at AS "completedAt"
         FROM public.query_history
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 100`,
        [req.userId],
      );

      return res.json({ history: result.rows });
    } catch (error) {
      console.error(
        '[QueryMind] Failed to load query history:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      return res.status(500).json({
        error: 'Unable to load query history.',
      });
    }
  },
);

export default router;
