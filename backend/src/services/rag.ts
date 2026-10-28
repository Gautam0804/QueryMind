
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  gemini,
} from '../config/gemini';

import { knowledgePool } from '../config/knowledgeDb';

export type KnowledgeDocument = {
  content: string;
  source: string;
};

export type EmbeddingTask =
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT';

function normalizeEmbedding(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error('Gemini returned an invalid embedding vector.');
  }

  return values.map((value) => value / magnitude);
}

export async function createEmbedding(
  text: string,
  taskType: EmbeddingTask = 'RETRIEVAL_DOCUMENT',
): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error('Cannot create an embedding from empty text.');
  }

  const response = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: input,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (
    !values ||
    values.length !== EMBEDDING_DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error(
      'Gemini returned an embedding with an unexpected dimension.',
    );
  }

  // gemini-embedding-001 requires normalization when using
  // a reduced output dimension.
  return normalizeEmbedding(values);
}

export async function retrieveKnowledge(
  question: string,
): Promise<KnowledgeDocument[]> {
  const embedding = await createEmbedding(
    question,
    'RETRIEVAL_QUERY',
  );

  const vectorLiteral = `[${embedding.join(',')}]`;

  const result = await knowledgePool.query<KnowledgeDocument>(
    `SELECT
       COALESCE(
         NULLIF(content, ''),
         object_name || ': ' || description
       ) AS content,
       source
     FROM public.schema_knowledge
     WHERE embedding IS NOT NULL
       AND (
         content IS NOT NULL
         OR (
           object_name IS NOT NULL
           AND description IS NOT NULL
         )
       )
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [vectorLiteral],
  );

  return result.rows;
}
