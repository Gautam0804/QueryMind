
import 'dotenv/config';

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  gemini,
} from '../config/gemini';

import { seedPool } from '../config/seedDb';

type SeedDocument = {
  objectName: string;
  description: string;
  content: string;
  source: string;
};

const documents: SeedDocument[] = [
  {
    objectName: 'customers',
    description: 'Business knowledge for the customers table.',
    content:
      'The customers table contains customer records. Use only columns confirmed by the live database schema. Check the actual foreign-key relationships before joining this table to orders.',
    source: 'querymind-seed',
  },
  {
    objectName: 'orders',
    description: 'Business knowledge for the orders table.',
    content:
      'The orders table contains order records. Inspect the live schema to identify customer relationships, dates, totals, and order status fields. Never assume a column exists unless it appears in the live schema.',
    source: 'querymind-seed',
  },
  {
    objectName: 'products',
    description: 'Business knowledge for the products table.',
    content:
      'The products table contains product records. Use the actual product columns from the live schema. Do not assume that current product prices represent historical sales prices.',
    source: 'querymind-seed',
  },
  {
    objectName: 'order_items',
    description: 'Business knowledge for the order_items table.',
    content:
      'The order_items table links order records and product records when supported by its actual foreign keys. Verify the real join columns and available quantity or price fields before calculating sales metrics.',
    source: 'querymind-seed',
  },
  {
    objectName: 'customer_revenue',
    description: 'Guidance for customer revenue analysis.',
    content:
      'For customer revenue analysis, aggregate the verified order amount field by customer and sort by the aggregate in descending order. Join customers to orders using actual relationships from the live schema. Use a LIMIT for top-N questions.',
    source: 'querymind-seed',
  },
  {
    objectName: 'product_analysis',
    description: 'Guidance for product analytics.',
    content:
      'For product analysis, join order_items to products only using verified relationships. Calculate product revenue only when the schema provides appropriate price and quantity data. Do not infer historical revenue from current product prices without evidence.',
    source: 'querymind-seed',
  },
  {
    objectName: 'query_safety',
    description: 'QueryMind SQL generation safety rules.',
    content:
      'QueryMind analytics queries must use only customers, products, orders, and order_items. Generate one read-only SELECT statement and use real column names from the live schema. Generated SQL must still pass the application SQL safety validator.',
    source: 'querymind-seed',
  },
];

function normalizeEmbedding(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error('Gemini returned an invalid embedding vector.');
  }

  return values.map((value) => value / magnitude);
}

async function embedDocument(content: string): Promise<number[]> {
  const response = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: content,
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (
    !values ||
    values.length !== EMBEDDING_DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error('Gemini returned an unexpected embedding dimension.');
  }

  return normalizeEmbedding(values);
}

async function main(): Promise<void> {
  const client = await seedPool.connect();

  try {
    // Embed first so API failures do not delete the existing seed records.
    const prepared = [];

    for (const document of documents) {
      const embedding = await embedDocument(document.content);
      prepared.push({ document, embedding });
    }

    await client.query('BEGIN');

    await client.query(
      'DELETE FROM public.schema_knowledge WHERE source = $1',
      ['querymind-seed'],
    );

    for (const { document, embedding } of prepared) {
      const vectorLiteral = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO public.schema_knowledge
           (object_name, description, content, source, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [
          document.objectName,
          document.description,
          document.content,
          document.source,
          vectorLiteral,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${prepared.length} Gemini RAG documents.`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The transaction may already have ended.
    }

    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error: unknown) => {
    console.error('RAG seeding failed. Check Gemini configuration and database access.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await seedPool.end();
  });
