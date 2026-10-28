
import { validateReadOnlySelect } from '../services/sqlSafety';

const cases = [
  {
    name: 'Simple approved SELECT',
    sql: 'SELECT name FROM customers',
    shouldPass: true,
  },
  {
    name: 'Approved JOIN',
    sql: 'SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.id',
    shouldPass: true,
  },
  {
    name: 'Non-approved table',
    sql: 'SELECT * FROM pg_catalog.pg_tables',
    shouldPass: false,
  },
  {
    name: 'DELETE statement',
    sql: 'DELETE FROM customers',
    shouldPass: false,
  },
  {
    name: 'Multiple statements',
    sql: 'SELECT name FROM customers; SELECT name FROM products',
    shouldPass: false,
  },
  {
    name: 'Locking SELECT',
    sql: 'SELECT * FROM customers FOR UPDATE',
    shouldPass: false,
  },
  {
    name: 'Server file access',
    sql: 'SELECT pg_read_file(\'postgresql.conf\') FROM customers',
    shouldPass: false,
  },
  {
    name: 'CTE',
    sql: 'WITH x AS (SELECT id FROM customers) SELECT * FROM x',
    shouldPass: false,
  },

{
  name: 'Sleep function',
  sql: 'SELECT pg_sleep(10) FROM customers',
  shouldPass: false,
},
{
  name: 'Sequence modification',
  sql: 'SELECT nextval(\'some_sequence\') FROM customers',
  shouldPass: false,
},
{
  name: 'Allowed schema-qualified table',
  sql: 'SELECT name FROM public.customers',
  shouldPass: true,
},
{
  name: 'Nested unapproved table',
  sql: 'SELECT (SELECT relname FROM pg_catalog.pg_class LIMIT 1) FROM customers',
  shouldPass: false,
},
{
  name: 'UNION with unapproved table',
  sql: 'SELECT name FROM customers UNION SELECT tablename FROM pg_catalog.pg_tables',
  shouldPass: false,
},
{
  name: 'Empty input',
  sql: '',
  shouldPass: false,
},
  {
    name: 'Case-insensitive dangerous function',
    sql: 'SELECT PG_SLEEP(1) FROM customers',
    shouldPass: false,
  },
  {
    name: 'Dangerous function inside nested subquery',
    sql: 'SELECT name FROM customers WHERE id = (SELECT pg_sleep(1) FROM orders LIMIT 1)',
    shouldPass: false,
  },
  {
    name: 'Valid aggregate functions',
    sql: 'SELECT COUNT(*), SUM(total_amount), AVG(total_amount) FROM orders',
    shouldPass: true,
  },
  {
    name: 'Valid COALESCE function',
    sql: 'SELECT COALESCE(name, \'Unknown\') FROM customers',
    shouldPass: true,
  },

  {
    name: 'Schema-qualified dangerous function',
    sql: 'SELECT pg_catalog.pg_sleep(1) FROM customers',
    shouldPass: false,
  },
  {
    name: 'Valid revenue aggregation',
    sql: 'SELECT c.id, SUM(oi.quantity * oi.unit_price) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id GROUP BY c.id',
    shouldPass: true,
  },
  {
    name: 'Valid COALESCE function',
    sql: "SELECT COALESCE(name, 'Unknown') FROM customers",
    shouldPass: true,
  },
  {
    name: 'SQL comment rejection',
    sql: 'SELECT name FROM customers /* unexpected comment */',
    shouldPass: false,
  },


  {
    name: 'COUNT aggregate is allowed',
    sql: 'SELECT COUNT(*) FROM customers',
    shouldPass: true,
  },
  {
    name: 'SUM aggregate is allowed',
    sql: 'SELECT SUM(quantity) FROM order_items',
    shouldPass: true,
  },
  {
    name: 'COALESCE is allowed',
    sql: "SELECT COALESCE(name, 'Unknown') FROM customers",
    shouldPass: true,
  },
  {
    name: 'Unknown custom function is rejected',
    sql: 'SELECT custom_function(name) FROM customers',
    shouldPass: false,
  },
  {
    name: 'Schema-qualified dangerous function is rejected',
    sql: 'SELECT pg_catalog.pg_sleep(1) FROM customers',
    shouldPass: false,
  },
  {
    name: 'Schema-qualified approved function is rejected',
    sql: 'SELECT public.lower(name) FROM customers',
    shouldPass: false,
  },


];

let failures = 0;

for (const test of cases) {
  let passedValidation = false;

  try {
    validateReadOnlySelect(test.sql);
    passedValidation = true;
  } catch {
    passedValidation = false;
  }

  const success = passedValidation === test.shouldPass;

  console.log(
    `${success ? 'PASS' : 'FAIL'}: ${test.name} ` +
    `(expected ${test.shouldPass ? 'accept' : 'reject'}, ` +
    `got ${passedValidation ? 'accept' : 'reject'})`,
  );

  if (!success) failures++;
}

if (failures > 0) {
  throw new Error(`${failures} SQL safety test(s) failed.`);
}

console.log('All SQL safety tests passed.');
