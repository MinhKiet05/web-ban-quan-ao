const { query } = require('../config/db');

/**
 * Lấy thống kê tổng quan cho dashboard admin
 */
const getDashboardStats = async () => {
    const sql = `
        SELECT
            COUNT(*)::int                                              AS total_orders,
            COUNT(*) FILTER (WHERE status = 'pending')::int          AS pending_orders,
            COUNT(*) FILTER (WHERE status = 'confirmed')::int        AS confirmed_orders,
            COUNT(*) FILTER (WHERE status = 'packing')::int          AS packing_orders,
            COUNT(*) FILTER (WHERE status = 'shipped')::int          AS shipped_orders,
            COUNT(*) FILTER (WHERE status = 'delivered')::int        AS delivered_orders,
            COUNT(*) FILTER (WHERE status = 'completed')::int        AS completed_orders,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int        AS cancelled_orders,
            COUNT(*) FILTER (WHERE status = 'refunded')::int         AS refunded_orders,
            COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS total_revenue,
            COALESCE(SUM(total) FILTER (
                WHERE status NOT IN ('cancelled','refunded')
                AND created_at >= date_trunc('month', NOW())
            ), 0)::numeric AS monthly_revenue
        FROM orders
    `;
    const result = await query(sql);
    return result.rows[0];
};

/**
 * Lấy tổng số user
 */
const getTotalUsers = async () => {
    const result = await query(`SELECT COUNT(*)::int AS total FROM users`);
    return result.rows[0].total;
};

/**
 * Lấy tất cả đơn hàng (admin) có phân trang + filter
 */
const getAllOrders = async ({
    page = 1,
    limit = 20,
    status = null,
    search = null,
} = {}) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status && status !== 'all') {
        conditions.push(`o.status = $${idx++}`);
        values.push(status);
    }

    if (search) {
        conditions.push(
            `(o.order_code ILIKE $${idx} OR u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`
        );
        values.push(`%${search}%`);
        idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT
            o.id,
            o.order_code,
            o.status,
            o.total,
            o.subtotal,
            o.shipping_fee,
            o.discount_amount,
            o.shipping_name,
            o.shipping_phone,
            o.shipping_email,
            o.shipping_province,
            o.shipping_district,
            o.customer_note,
            o.cancellation_reason,
            o.created_at,
            o.updated_at,
            u.id         AS user_id,
            u.full_name  AS user_name,
            u.email      AS user_email,
            u.avatar_url AS user_avatar,
            p.method     AS payment_method,
            p.status     AS payment_status,
            COUNT(oi.id)::int AS item_count
        FROM orders o
        LEFT JOIN users u  ON u.id = o.user_id
        LEFT JOIN payments p ON p.order_id = o.id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        ${where}
        GROUP BY o.id, u.id, p.method, p.status
        ORDER BY o.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(limit, offset);
    const result = await query(sql, values);
    return result.rows;
};

/**
 * Đếm tổng đơn hàng (để phân trang)
 */
const countAllOrders = async ({ status = null, search = null } = {}) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status && status !== 'all') {
        conditions.push(`o.status = $${idx++}`);
        values.push(status);
    }

    if (search) {
        conditions.push(
            `(o.order_code ILIKE $${idx} OR u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`
        );
        values.push(`%${search}%`);
        idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT COUNT(DISTINCT o.id)::int AS total
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ${where}
    `;
    const result = await query(sql, values);
    return result.rows[0].total;
};

/**
 * Lấy chi tiết đơn hàng (admin, không cần user_id)
 */
const getAdminOrderDetail = async (order_id) => {
    const orderSql = `
        SELECT
            o.*,
            u.full_name AS user_name,
            u.email     AS user_email,
            u.avatar_url AS user_avatar,
            p.id         AS payment_id,
            p.method     AS payment_method,
            p.status     AS payment_status,
            p.amount     AS payment_amount,
            p.transaction_id,
            p.paid_at
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.id = $1
    `;
    const orderResult = await query(orderSql, [order_id]);
    if (orderResult.rows.length === 0) return null;

    const itemsSql = `
        SELECT oi.*, pv.stock_qty AS current_stock
        FROM order_items oi
        LEFT JOIN product_variants pv ON pv.id = oi.variant_id
        WHERE oi.order_id = $1
        ORDER BY oi.created_at
    `;
    const itemsResult = await query(itemsSql, [order_id]);

    return { ...orderResult.rows[0], items: itemsResult.rows };
};

/**
 * Cập nhật trạng thái đơn hàng (admin)
 */
const updateOrderStatus = async (order_id, status, note = null) => {
    // Xác định timestamp column tương ứng
    const timestampMap = {
        confirmed:  'confirmed_at',
        packing:    'packed_at',
        shipped:    'shipped_at',
        delivered:  'delivered_at',
        completed:  'completed_at',
        cancelled:  'cancelled_at',
    };

    const tsCol = timestampMap[status];
    const tsSnippet = tsCol ? `, ${tsCol} = NOW()` : '';

    const sql = `
        UPDATE orders
        SET status = $1, updated_at = NOW()${tsSnippet}
            ${note ? `, cancellation_reason = $3` : ''}
        WHERE id = $2
        RETURNING *
    `;
    const values = note ? [status, order_id, note] : [status, order_id];
    const result = await query(sql, values);
    return result.rows[0] || null;
};

/**
 * Lấy doanh thu theo ngày (7 ngày gần nhất)
 */
const getRevenueChart = async () => {
    const sql = `
        SELECT
            to_char(created_at::date, 'DD/MM') AS label,
            COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric AS revenue,
            COUNT(*) FILTER (WHERE status != 'cancelled')::int AS orders
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY created_at::date
        ORDER BY created_at::date
    `;
    const result = await query(sql);
    return result.rows;
};

module.exports = {
    getDashboardStats,
    getTotalUsers,
    getAllOrders,
    countAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    getRevenueChart,
};
