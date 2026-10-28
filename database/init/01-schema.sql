
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'completed', 'cancelled')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer
    ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
    ON order_items(product_id);

-- Schema documentation used by the future RAG pipeline.
CREATE TABLE IF NOT EXISTS schema_knowledge (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    object_name TEXT NOT NULL,
    description TEXT NOT NULL,
    embedding VECTOR(384),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO customers (name, email) VALUES
    ('Acme Corporation', 'acme@example.com'),
    ('Vertex Solutions', 'vertex@example.com'),
    ('Northstar Labs', 'northstar@example.com'),
    ('Orbit Commerce', 'orbit@example.com'),
    ('Pinnacle Group', 'pinnacle@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, price) VALUES
    ('Analytics Pro', 'Software', 499.00),
    ('Cloud Storage', 'Infrastructure', 199.00),
    ('Security Suite', 'Security', 299.00),
    ('Data Connector', 'Integration', 149.00),
    ('Enterprise Plan', 'Software', 999.00)
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_id, status, created_at)
SELECT c.id, v.status, v.created_at
FROM (
    VALUES
        ('acme@example.com', 'completed', NOW() - INTERVAL '5 days'),
        ('acme@example.com', 'completed', NOW() - INTERVAL '20 days'),
        ('vertex@example.com', 'completed', NOW() - INTERVAL '12 days'),
        ('northstar@example.com', 'completed', NOW() - INTERVAL '35 days'),
        ('orbit@example.com', 'pending', NOW() - INTERVAL '2 days'),
        ('pinnacle@example.com', 'completed', NOW() - INTERVAL '50 days')
) AS v(email, status, created_at)
JOIN customers c ON c.email = v.email
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.id
      AND o.created_at = v.created_at
);

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT o.id, p.id, v.quantity, p.price
FROM (
    VALUES
        (1, 'Analytics Pro', 2),
        (1, 'Cloud Storage', 3),
        (2, 'Security Suite', 1),
        (3, 'Enterprise Plan', 1),
        (4, 'Data Connector', 4),
        (5, 'Cloud Storage', 2),
        (6, 'Analytics Pro', 1)
) AS v(order_id, product_name, quantity)
JOIN orders o ON o.id = v.order_id
JOIN products p ON p.name = v.product_name
WHERE NOT EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.order_id = o.id
      AND oi.product_id = p.id
);
