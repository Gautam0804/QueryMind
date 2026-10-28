
import { performance } from 'node:perf_hooks';
import { pool } from '../config/db';
import { getSchemaDetails } from './schema';
import { retrieveKnowledge } from './rag';
import { generateSql } from './sqlGenerator';
import {
  UnsafeQueryError,
  validateReadOnlySelect,
} from './sqlSafety';
import type { SchemaColumn } from './schema';
import type { KnowledgeDocument } from './rag';

export type QueryResponse = {
  question: string;
  sql: string;
  explanation: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  durationMs: number;
};

type QueryClient = {
  query: (sql: string) => Promise<{
    fields: Array<{ name: string }>;
    rows: Array<Record<string, unknown>>;
  }>;
  release: () => void;
};

type QueryDependencies = {
  getSchemaDetails: () => Promise<SchemaColumn[]>;
  retrieveKnowledge: (question: string) => Promise<KnowledgeDocument[]>;
  generateSql: (
    question: string,
    schema: SchemaColumn[],
    knowledge: KnowledgeDocument[],
  ) => Promise<{ sql: string; explanation: string }>;
  validateReadOnlySelect: (sql: string) => string;
  connect: () => Promise<QueryClient>;
};

const productionDependencies: QueryDependencies = {
  getSchemaDetails,
  retrieveKnowledge,
  generateSql,
  validateReadOnlySelect,
  connect: () => pool.connect() as Promise<QueryClient>,
};

// Fast-fail for explicit attempts to query PostgreSQL system catalogs.
// The SQL AST validator remains the actual SQL security boundary.
const SYSTEM_CATALOG_PATTERN =
  /\b(?:pg_catalog|information_schema|pg_tables|pg_class|pg_namespace|pg_attribute|pg_database|pg_roles|pg_user)\b/i;

export async function runNaturalLanguageQuery(
  question: string,
): Promise<QueryResponse> {
  return runNaturalLanguageQueryWithDependencies(
    question,
    productionDependencies,
  );
}

export async function runNaturalLanguageQueryWithDependencies(
  question: string,
  dependencies: QueryDependencies,
): Promise<QueryResponse> {
  const totalStarted = performance.now();

  console.log('[QueryMind] Starting query pipeline');

  // Reject obvious system-catalog requests before expensive operations.
  if (SYSTEM_CATALOG_PATTERN.test(question)) {
    console.warn(
      '[QueryMind] Rejected a system-catalog request before schema/RAG/Gemini.',
    );

    throw new UnsafeQueryError(
      'System catalog queries are not allowed.',
    );
  }

  const schemaStarted = performance.now();
  const ragStarted = performance.now();

  const schemaPromise = dependencies.getSchemaDetails().then((schema) => {
    console.log(
      `[QueryMind] Schema loaded in ${Math.round(
        performance.now() - schemaStarted,
      )}ms`,
    );

    return schema;
  });

  const knowledgePromise = dependencies
    .retrieveKnowledge(question)
    .then((knowledge) => {
      console.log(
        `[QueryMind] RAG completed in ${Math.round(
          performance.now() - ragStarted,
        )}ms`,
      );

      return knowledge;
    });

  const [schema, knowledge] = await Promise.all([
    schemaPromise,
    knowledgePromise,
  ]);

  if (schema.length === 0) {
    throw new Error('No approved business schema was found.');
  }

  console.log('[QueryMind] Generating SQL with Gemini');

  const generationStarted = performance.now();

  const generated = await dependencies.generateSql(
    question,
    schema,
    knowledge,
  );

  console.log(
    `[QueryMind] Gemini completed in ${Math.round(
      performance.now() - generationStarted,
    )}ms`,
  );

  // Validate generated SQL before acquiring a database connection.
  const sql = dependencies.validateReadOnlySelect(generated.sql);

  console.log('[QueryMind] SQL validation passed; connecting to database');

  const client = await dependencies.connect();
  const databaseStarted = performance.now();

  try {
    await client.query('BEGIN TRANSACTION READ ONLY');

    await client.query("SET LOCAL statement_timeout = '5000ms'");

    await client.query(
      "SET LOCAL idle_in_transaction_session_timeout = '5000ms'",
    );

    const result = await client.query(
      `SELECT *
       FROM (${sql}) AS querymind_result
       LIMIT 200`,
    );

    await client.query('COMMIT');

    const databaseDurationMs = Math.round(
      performance.now() - databaseStarted,
    );

    console.log(
      `[QueryMind] Database completed in ${databaseDurationMs}ms`,
    );

    console.log(
      `[QueryMind] Total pipeline time: ${Math.round(
        performance.now() - totalStarted,
      )}ms`,
    );

    return {
      question,
      sql,
      explanation: generated.explanation,
      columns: result.fields.map((field) => field.name),
      rows: result.rows,
      rowCount: result.rows.length,
      durationMs: databaseDurationMs,
    };
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
