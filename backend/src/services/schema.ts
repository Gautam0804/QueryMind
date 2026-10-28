import { pool } from '../config/db';

export const ALLOWED_TABLES = [
  'customers',
  'products',
  'orders',
  'order_items',
] as const;

export type SchemaColumn = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
};

export async function getSchemaDetails(): Promise<SchemaColumn[]> {
  const result = await pool.query<SchemaColumn>(
    `SELECT
       table_name,
       column_name,
       data_type,
       is_nullable
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = ANY($2::text[])
     ORDER BY table_name, ordinal_position`,
    ['public', [...ALLOWED_TABLES]],
  );

  return result.rows;
}

export async function getSchemaTables(): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = $2
       AND table_name = ANY($3::text[])
     ORDER BY table_name`,
    ['public', 'BASE TABLE', [...ALLOWED_TABLES]],
  );

  return result.rows.map((row) => row.table_name);
}