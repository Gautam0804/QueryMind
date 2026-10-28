
import assert from 'node:assert/strict';
import { runNaturalLanguageQueryWithDependencies } from '../services/queryService';
import type { SchemaColumn } from '../services/schema';
import type { KnowledgeDocument } from '../services/rag';

const schema: SchemaColumn[] = [
  {
    table_name: 'customers',
    column_name: 'name',
    data_type: 'text',
    is_nullable: 'NO',
  },
];

const knowledge: KnowledgeDocument[] = [];

function makeDependencies(options?: {
  generatedSql?: string;
  rejectValidation?: boolean;
  failOnSelect?: boolean;
}) {
  let connectionAttempts = 0;
  let releaseCalls = 0;
  const executedQueries: string[] = [];

  const dependencies = {
    getSchemaDetails: async () => schema,
    retrieveKnowledge: async (_question: string) => knowledge,
    generateSql: async () => ({
      sql: options?.generatedSql ?? 'SELECT name FROM customers',
      explanation: 'Test query',
    }),
    validateReadOnlySelect: (sql: string): string => {
      if (options?.rejectValidation) {
        throw new Error('Rejected unsafe SQL');
      }
      return sql;
    },
    connect: async () => {
      connectionAttempts++;

      return {
        query: async (sql: string) => {
          executedQueries.push(sql);

          if (
            options?.failOnSelect &&
            sql.includes('AS querymind_result')
          ) {
            throw new Error('Simulated query execution failure');
          }

          if (sql.startsWith('SELECT *')) {
            return {
              fields: [{ name: 'name' }],
              rows: [{ name: 'Acme Corporation' }],
            };
          }

          return { fields: [], rows: [] };
        },
        release: () => {
          releaseCalls++;
        },
      };
    },
  };

  return {
    dependencies,
    get connectionAttempts() {
      return connectionAttempts;
    },
    get releaseCalls() {
      return releaseCalls;
    },
    executedQueries,
  };
}

async function testUnsafeSqlDoesNotAcquireConnection() {
  const test = makeDependencies({ rejectValidation: true });

  await assert.rejects(
    runNaturalLanguageQueryWithDependencies(
      'Test unsafe SQL rejection',
      test.dependencies,
    ),
    /Rejected unsafe SQL/,
  );

  assert.equal(test.connectionAttempts, 0);
  assert.equal(test.releaseCalls, 0);

  console.log('PASS: Unsafe SQL is rejected before connection acquisition.');
}

async function testSuccessfulQueryReturnsResults() {
  const test = makeDependencies();

  const result = await runNaturalLanguageQueryWithDependencies(
    'Show customers',
    test.dependencies,
  );

  assert.equal(test.connectionAttempts, 1);
  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.rows, [{ name: 'Acme Corporation' }]);
  assert.ok(test.executedQueries.includes('BEGIN TRANSACTION READ ONLY'));
  assert.ok(test.executedQueries.includes('COMMIT'));
  assert.equal(test.releaseCalls, 1);

  console.log('PASS: Successful query returns results and releases the client.');
}

async function testQueryFailureRollsBackAndReleases() {
  const test = makeDependencies({ failOnSelect: true });

  await assert.rejects(
    runNaturalLanguageQueryWithDependencies(
      'Test database query failure',
      test.dependencies,
    ),
    /Simulated query execution failure/,
  );

  assert.ok(test.executedQueries.includes('ROLLBACK'));
  assert.equal(test.releaseCalls, 1);

  console.log('PASS: Query failure triggers rollback and releases the client.');
}

async function main() {
  await testUnsafeSqlDoesNotAcquireConnection();
  await testSuccessfulQueryReturnsResults();
  await testQueryFailureRollsBackAndReleases();

  console.log('All query-service tests passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
