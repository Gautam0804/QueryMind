
import { Router } from 'express';
import { z } from 'zod';
import { historyPool } from '../config/db';
import { runNaturalLanguageQuery } from '../services/queryService';
import { UnsafeQueryError } from '../services/sqlSafety';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

const requestSchema = z.object({
  question: z.string().trim().min(3).max(500),
});

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof UnsafeQueryError) {
    return 'Generated SQL failed safety validation.';
  }

  if (error instanceof Error) {
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(error.message)) {
      return 'AI provider quota is exhausted.';
    }

    if (
      /DEADLINE_EXCEEDED|timed out|timeout|504/i.test(error.message)
    ) {
      return 'AI provider request timed out.';
    }
  }

  return 'Query generation or execution failed.';
}

router.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    const validation = requestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Provide a question between 3 and 500 characters.',
      });
    }

    const question = validation.data.question;
    let historyId: string | null = null;

    // Create a history record associated with the authenticated user.
    try {
      const history = await historyPool.query<{ id: string }>(
        `INSERT INTO public.query_history
           (user_id, question, status)
         VALUES ($1, $2, 'pending')
         RETURNING id::text AS id`,
        [userId, question],
      );

      historyId = history.rows[0]?.id ?? null;
    } catch (error) {
      console.error(
        '[QueryMind] Could not create query history record:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    try {
      // Preserve the existing SQL generation and safety pipeline.
      const result = await runNaturalLanguageQuery(question);

      if (historyId) {
        try {
          await historyPool.query(
            `UPDATE public.query_history
             SET generated_sql = $1,
                 status = 'success',
                 row_count = $2,
                 duration_ms = $3,
                 error_message = NULL,
                 completed_at = NOW()
             WHERE id = $4 AND user_id = $5`,
            [
              result.sql,
              result.rowCount,
              result.durationMs,
              historyId,
              userId,
            ],
          );
        } catch (error) {
          console.error(
            '[QueryMind] Could not complete query history record:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      return res.json(result);
    } catch (error) {
      const safeError = getSafeErrorMessage(error);

      if (historyId) {
        try {
          await historyPool.query(
            `UPDATE public.query_history
             SET status = 'failed',
                 error_message = $1,
                 completed_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [safeError, historyId, userId],
          );
        } catch (historyError) {
          console.error(
            '[QueryMind] Could not mark query history as failed:',
            historyError instanceof Error
              ? historyError.message
              : 'Unknown error',
          );
        }
      }

      if (error instanceof UnsafeQueryError) {
        return res.status(422).json({
          error:
            'The generated query did not pass SQL safety checks. Try rephrasing your question.',
        });
      }

      console.error(
        '[QueryMind] Query endpoint failed:',
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'UnknownError',
      );

      return res.status(502).json({
        error:
          'Unable to generate or execute this query. Check the backend configuration and database schema.',
      });
    }
  },
);

export default router;
