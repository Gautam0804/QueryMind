
import { Parser } from 'node-sql-parser';
import { ALLOWED_TABLES } from './schema';

const parser = new Parser();
const allowedTables = new Set<string>(ALLOWED_TABLES);

const ALLOWED_FUNCTIONS = new Set([
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'coalesce',
  'nullif',
  'greatest',
  'least',
  'abs',
  'round',
  'ceil',
  'ceiling',
  'floor',
  'lower',
  'upper',
  'trim',
  'length',
  'date_trunc',
  'extract',
]);

const FORBIDDEN_FUNCTIONS = new Set([
  'pg_sleep',
  'pg_read_file',
  'pg_read_binary_file',
  'pg_ls_dir',
  'pg_stat_file',
  'lo_import',
  'lo_export',
  'dblink',
  'set_config',
  'nextval',
  'setval',
  'pg_terminate_backend',
  'pg_cancel_backend',
]);

export class UnsafeQueryError extends Error {
  constructor(message = 'The generated SQL failed safety validation.') {
    super(message);
    this.name = 'UnsafeQueryError';
  }
}

type AstRecord = Record<string, unknown>;

type TableReference = {
  name: string;
  schema?: string;
};

type FunctionReference = {
  name: string;
  schema?: string;
};

function isRecord(value: unknown): value is AstRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function collectTables(ast: unknown): TableReference[] {
  const found: TableReference[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) return;

    if (Array.isArray(value.from)) {
      for (const source of value.from) {
        if (isRecord(source) && typeof source.table === 'string') {
          found.push({
            name: source.table.toLowerCase(),
            schema:
              typeof source.db === 'string' && source.db
                ? source.db.toLowerCase()
                : undefined,
          });
        }

        visit(source);
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (key !== 'from') {
        visit(child);
      }
    }
  }

  visit(ast);
  return found;
}

function getFunctionReference(
  value: AstRecord,
): FunctionReference | null {
  const rawName = value.name;

  // Aggregate functions such as COUNT and SUM use string names.
  if (typeof rawName === 'string') {
    return { name: rawName.toLowerCase() };
  }

  if (!isRecord(rawName) || !Array.isArray(rawName.name)) {
    return null;
  }

  const parts = rawName.name
    .filter(
      (part): part is AstRecord =>
        isRecord(part) && typeof part.value === 'string',
    )
    .map((part) => (part.value as string).toLowerCase());

  if (parts.length !== 1) {
    return null;
  }

  const functionName = parts[0];

  if (functionName === undefined) {
    return null;
  }

  // node-sql-parser stores qualified function schemas separately.
  const rawSchema = rawName.schema;

  if (rawSchema !== undefined && rawSchema !== null) {
    if (!isRecord(rawSchema) || typeof rawSchema.value !== 'string') {
      return {
        schema: '__invalid_qualification__',
        name: functionName,
      };
    }

    return {
      schema: rawSchema.value.toLowerCase(),
      name: functionName,
    };
  }

  return { name: functionName };
}

function collectFunctionReferences(
  ast: unknown,
): FunctionReference[] {
  const found: FunctionReference[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) return;

    if (
      value.type === 'function' ||
      value.type === 'aggr_func' ||
      value.type === 'window_func'
    ) {
      const reference = getFunctionReference(value);

      if (reference) {
        found.push(reference);
      }
    }

    for (const child of Object.values(value)) {
      visit(child);
    }
  }

  visit(ast);
  return found;
}

function validateFunctions(ast: unknown): void {
  const functions = collectFunctionReferences(ast);

  for (const fn of functions) {
    if (
      FORBIDDEN_FUNCTIONS.has(fn.name) ||
      fn.name.startsWith('pg_advisory_')
    ) {
      throw new UnsafeQueryError(
        'The query contains a disallowed function.',
      );
    }

    if (fn.schema || !ALLOWED_FUNCTIONS.has(fn.name)) {
      throw new UnsafeQueryError(
        `Function "${fn.name}" is not in the SQL allowlist.`,
      );
    }
  }
}

export function validateReadOnlySelect(input: string): string {
  let sql = input.trim();

  if (!sql) {
    throw new UnsafeQueryError('SQL is empty.');
  }

  // Allow one optional trailing semicolon.
  if (sql.endsWith(';')) {
    sql = sql.slice(0, -1).trim();
  }

  // Reject multiple statements and SQL comments.
  if (!sql || sql.includes(';') || /--|\/\*|\*\//.test(sql)) {
    throw new UnsafeQueryError(
      'Multiple statements and SQL comments are not allowed.',
    );
  }

  if (
    /\bFOR\s+(UPDATE|SHARE|NO\s+KEY\s+UPDATE|KEY\s+SHARE)\b/i.test(sql)
  ) {
    throw new UnsafeQueryError(
      'The query contains a disallowed operation.',
    );
  }

  let parsed: unknown;

  try {
    parsed = parser.astify(sql, {
      database: 'Postgresql',
    });
  } catch {
    throw new UnsafeQueryError(
      'The SQL parser rejected the query.',
    );
  }

  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new UnsafeQueryError(
        'Only one statement is allowed.',
      );
    }

    parsed = parsed[0];
  }

  if (!isRecord(parsed) || parsed.type !== 'select') {
    throw new UnsafeQueryError(
      'Only SELECT statements are allowed.',
    );
  }

  if (parsed.with) {
    throw new UnsafeQueryError(
      'CTEs are not allowed in this version.',
    );
  }

  if (
    parsed.into &&
    isRecord(parsed.into) &&
    parsed.into.position
  ) {
    throw new UnsafeQueryError(
      'SELECT INTO is not allowed.',
    );
  }

  validateFunctions(parsed);

  const tables = collectTables(parsed);

  if (tables.length === 0) {
    throw new UnsafeQueryError(
      'The query must reference an approved business table.',
    );
  }

  for (const table of tables) {
    if (table.schema && table.schema !== 'public') {
      throw new UnsafeQueryError(
        'Only the public schema is allowed.',
      );
    }

    if (!allowedTables.has(table.name)) {
      throw new UnsafeQueryError(
        'The query references a non-approved table.',
      );
    }
  }

  return sql;
}
