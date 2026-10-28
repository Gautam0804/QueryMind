
import { Router } from 'express';
import { pool } from '../config/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/overview', requireAuth, async (_req, res) => {
  try {
    const [kpiResult, monthlyResult, customerResult] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(
            SUM(oi.quantity * oi.unit_price), 0
          ) AS total_revenue,
          COUNT(DISTINCT o.id) AS total_orders,
          (SELECT COUNT(*) FROM public.customers) AS total_customers
        FROM public.orders o
        LEFT JOIN public.order_items oi ON oi.order_id = o.id
      `),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM')
            AS month_key,
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY')
            AS month,
          COALESCE(
            SUM(oi.quantity * oi.unit_price), 0
          ) AS revenue
        FROM public.orders o
        LEFT JOIN public.order_items oi ON oi.order_id = o.id
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
      `),

      pool.query(`
        SELECT
          c.id,
          c.name,
          COALESCE(
            SUM(oi.quantity * oi.unit_price), 0
          ) AS revenue,
          COUNT(DISTINCT o.id) AS orders
        FROM public.customers c
        LEFT JOIN public.orders o ON o.customer_id = c.id
        LEFT JOIN public.order_items oi ON oi.order_id = o.id
        GROUP BY c.id, c.name
        ORDER BY revenue DESC, c.name ASC
        LIMIT 5
      `),
    ]);

    const kpis = kpiResult.rows[0];
    const totalRevenue = Number(kpis.total_revenue);
    const totalOrders = Number(kpis.total_orders);

    return res.json({
      kpis: {
        totalRevenue,
        totalOrders,
        totalCustomers: Number(kpis.total_customers),
        averageOrderValue:
          totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      monthlyRevenue: monthlyResult.rows.map((row) => ({
        monthKey: row.month_key,
        month: row.month,
        revenue: Number(row.revenue),
      })),
      topCustomers: customerResult.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      })),
      source: 'postgresql',
    });
  } catch (error) {
    console.error(
      '[QueryMind] Analytics overview failed:',
      error instanceof Error ? error.message : 'UnknownError',
    );

    return res.status(503).json({
      error: 'Unable to load analytics from PostgreSQL.',
    });
  }
});

export default router;
