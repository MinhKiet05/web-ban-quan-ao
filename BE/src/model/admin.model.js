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
 * Khi completed: đồng thời recalculate total_spent / total_orders của user (idempotent)
 */
const updateOrderStatus = async (order_id, status, note = null) => {
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

    const updateSql = `
        UPDATE orders
        SET status = $1, updated_at = NOW()${tsSnippet}
            ${note ? `, cancellation_reason = $3` : ''}
        WHERE id = $2
        RETURNING *
    `;
    const values = note ? [status, order_id, note] : [status, order_id];
    const result = await query(updateSql, values);
    const order = result.rows[0] || null;

    // Khi hoàn thành đơn: cập nhật lại total_spent + total_orders cho user
    // Dùng SET (recalculate) thay vì INCREMENT để idempotent — an toàn kể cả khi trigger DB đã chạy
    if (order && order.user_id && status === 'completed') {
        await query(`
            UPDATE users
            SET
                total_spent  = (
                    SELECT COALESCE(SUM(total), 0)
                    FROM orders
                    WHERE user_id = $1 AND status NOT IN ('cancelled', 'refunded')
                ),
                total_orders = (
                    SELECT COUNT(*)::int
                    FROM orders
                    WHERE user_id = $1 AND status NOT IN ('cancelled', 'refunded')
                ),
                updated_at = NOW()
            WHERE id = $1
        `, [order.user_id]);
    }

    return order;
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

// ─── User management ─────────────────────────────────────────────────────────

/**
 * Lấy tất cả users (admin)
 */
const getAllUsers = async ({ page = 1, limit = 20, search = null } = {}) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
        conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT
            u.id, u.full_name, u.email, u.phone, u.role, u.tier,
            u.avatar_url, u.is_active, u.is_blocked, u.is_verified,
            u.total_orders, u.total_spent, u.loyalty_points,
            u.created_at,
            COUNT(o.id)::int AS order_count
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        ${where}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);
    const result = await query(sql, values);
    return result.rows;
};

/**
 * Đếm tổng users
 */
const countAllUsers = async ({ search = null } = {}) => {
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) {
        conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, values);
    return result.rows[0].total;
};

/**
 * Cập nhật role user
 */
const updateUserRole = async (user_id, role) => {
    const result = await query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, role, is_blocked`,
        [role, user_id]
    );
    return result.rows[0] || null;
};

/**
 * Toggle khóa/mở khóa user
 */
const toggleUserBlock = async (user_id) => {
    const result = await query(
        `UPDATE users SET is_blocked = NOT is_blocked, updated_at = NOW() WHERE id = $1 RETURNING id, full_name, email, role, is_blocked`,
        [user_id]
    );
    return result.rows[0] || null;
};

// ─── Inventory management ─────────────────────────────────────────────────────

/**
 * Lấy danh sách tồn kho theo variant
 */
const getInventory = async ({ page = 1, limit = 50, search = null } = {}) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
        conditions.push(`(p.name ILIKE $${idx} OR pv.sku ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT
            pv.id AS variant_id,
            pv.sku,
            pv.size,
            pv.color,
            pv.stock_qty,
            pv.sold_qty,
            pv.price,
            pv.sale_price,
            pv.is_active,
            p.id AS product_id,
            p.name AS product_name,
            p.slug AS product_slug
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        ${where}
        ORDER BY p.name ASC, pv.color ASC, pv.size ASC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);
    const result = await query(sql, values);
    return result.rows;
};

/**
 * Đếm tổng variants
 */
const countInventory = async ({ search = null } = {}) => {
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) {
        conditions.push(`(p.name ILIKE $${idx} OR pv.sku ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
        SELECT COUNT(pv.id)::int AS total
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        ${where}
    `;
    const result = await query(sql, values);
    return result.rows[0].total;
};

/**
 * Cập nhật tồn kho variant
 */
const updateVariantStock = async (variant_id, stock_qty) => {
    const result = await query(
        `UPDATE product_variants SET stock_qty = $1, updated_at = NOW() WHERE id = $2 RETURNING id, sku, stock_qty, product_id`,
        [stock_qty, variant_id]
    );
    return result.rows[0] || null;
};

// ─── Product management ───────────────────────────────────────────────────────

/**
 * Cập nhật thông tin sản phẩm (admin)
 */
const adminUpdateProduct = async (product_id, fields) => {
    const allowed = ['name', 'short_description', 'description', 'base_price', 'original_price', 'brand', 'status', 'is_featured', 'is_sale', 'discount_percent'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            sets.push(`${key} = $${idx++}`);
            values.push(fields[key]);
        }
    }

    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    values.push(product_id);

    const sql = `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, name, base_price, status, brand, slug`;
    const result = await query(sql, values);
    return result.rows[0] || null;
};

/**
 * Lấy danh sách sản phẩm cho admin (có status archived)
 */
const adminGetProducts = async ({ page = 1, limit = 30, search = null, status = null } = {}) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
        conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.brand ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }
    if (status) {
        conditions.push(`p.status = $${idx++}`);
        values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT
            p.id, p.name, p.slug, p.sku, p.brand, p.base_price, p.original_price,
            p.status, p.is_featured, p.is_sale, p.discount_percent,
            p.sold_count, p.view_count, p.avg_rating, p.review_count,
            p.created_at, p.updated_at,
            c.name AS category_name,
            COALESCE(SUM(pv.stock_qty), 0)::int AS total_stock,
            COUNT(pv.id)::int AS variant_count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
        ${where}
        GROUP BY p.id, c.name
        ORDER BY p.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);
    const result = await query(sql, values);
    return result.rows;
};

const countAdminProducts = async ({ search = null, status = null } = {}) => {
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) {
        conditions.push(`(name ILIKE $${idx} OR sku ILIKE $${idx} OR brand ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }
    if (status) {
        conditions.push(`status = $${idx++}`);
        values.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT COUNT(*)::int AS total FROM products ${where}`, values);
    return result.rows[0].total;
};

// ─── Analytics / Stats ────────────────────────────────────────────────────────

/**
 * Doanh thu theo tháng (6 tháng gần nhất)
 */
const getMonthlyRevenue = async () => {
    const sql = `
        SELECT
            to_char(date_trunc('month', created_at), 'MM/YYYY') AS label,
            COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS revenue,
            COUNT(*) FILTER (WHERE status NOT IN ('cancelled','refunded'))::int AS orders
        FROM orders
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
    `;
    const result = await query(sql);
    return result.rows;
};

/**
 * Top 10 sản phẩm bán chạy nhất
 */
const getTopProducts = async () => {
    const sql = `
        SELECT
            p.id,
            p.name AS product_name,
            p.slug,
            COALESCE(SUM(oi.quantity), 0)::int                   AS sold_count,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric AS revenue
        FROM products p
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        LEFT JOIN order_items oi ON oi.variant_id = pv.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status NOT IN ('cancelled','refunded')
        GROUP BY p.id, p.name, p.slug
        ORDER BY sold_count DESC
        LIMIT 10
    `;
    const result = await query(sql);
    return result.rows;
};

/**
 * Tăng trưởng users theo tháng (6 tháng) + thống kê sản phẩm
 */
const getGrowthStats = async () => {
    const userGrowthSql = `
        SELECT
            to_char(date_trunc('month', created_at), 'MM/YYYY') AS label,
            COUNT(*)::int AS new_users
        FROM users
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
    `;
    const productStatsSql = `
        SELECT
            COUNT(*)::int                                        AS total_products,
            COUNT(*) FILTER (WHERE status = 'active')::int      AS active,
            COUNT(*) FILTER (WHERE status = 'draft')::int       AS draft,
            COUNT(*) FILTER (WHERE status = 'archived')::int    AS archived
        FROM products
    `;
    const lowStockSql = `
        SELECT COUNT(*)::int AS low_stock
        FROM product_variants
        WHERE stock_qty > 0 AND stock_qty <= 10 AND is_active = TRUE
    `;

    const [userGrowth, productStats, lowStock] = await Promise.all([
        query(userGrowthSql),
        query(productStatsSql),
        query(lowStockSql),
    ]);

    return {
        user_growth: userGrowth.rows,
        product_stats: {
            ...productStats.rows[0],
            low_stock: lowStock.rows[0].low_stock,
        },
    };
};

module.exports = {
    getDashboardStats,
    getTotalUsers,
    getAllOrders,
    countAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    getRevenueChart,
    getAllUsers,
    countAllUsers,
    updateUserRole,
    toggleUserBlock,
    getInventory,
    countInventory,
    updateVariantStock,
    adminUpdateProduct,
    adminGetProducts,
    countAdminProducts,
    getMonthlyRevenue,
    getTopProducts,
    getGrowthStats,
};
