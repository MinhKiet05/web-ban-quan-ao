const { query } = require("../config/db");
const { generateUniqueId } = require("../utils/generateId");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sinh order_code dạng ORD-YYYYMMDD-XXXXXX
 */
const generateOrderCode = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `ORD-${date}-${rand}`;
};

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * Tạo đơn hàng mới (không bao gồm items – thêm riêng)
 */
const createOrder = async (
  client,
  {
    id,
    user_id,
    subtotal,
    discount_amount = 0,
    shipping_fee = 0,
    tax_amount = 0,
    total,
    shipping_name,
    shipping_phone,
    shipping_email,
    shipping_province,
    shipping_district,
    shipping_ward,
    shipping_street,
    shipping_note,
    customer_note,
    voucher_id = null,
  },
) => {
  try {
    const order_code = generateOrderCode();
    const sql = `
        INSERT INTO orders (
            id, order_code, user_id, voucher_id,
            status, subtotal, discount_amount, shipping_fee, tax_amount, total,
            shipping_name, shipping_phone, shipping_email,
            shipping_province, shipping_district, shipping_ward,
            shipping_street, shipping_note, customer_note,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4,
            'pending', $5, $6, $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18,
            NOW(), NOW()
        ) RETURNING *
    `;
    const values = [
      id,
      order_code,
      user_id,
      voucher_id,
      subtotal,
      discount_amount,
      shipping_fee,
      tax_amount,
      total,
      shipping_name,
      shipping_phone,
      shipping_email,
      shipping_province,
      shipping_district,
      shipping_ward,
      shipping_street,
      shipping_note || null,
      customer_note || null,
    ];
    const result = await client.query(sql, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Thêm một order_item
 */
const createOrderItem = async (
  client,
  {
    id,
    order_id,
    variant_id,
    product_name,
    product_slug,
    sku,
    size,
    color,
    image_url,
    unit_price,
    quantity,
    line_total,
  },
) => {
  const sql = `
        INSERT INTO order_items (
            id, order_id, variant_id,
            product_name, product_slug, sku,
            size, color, image_url,
            unit_price, quantity, line_total,
            created_at
        ) VALUES (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12,
            NOW()
        ) RETURNING *
    `;
  const values = [
    id,
    order_id,
    variant_id,
    product_name,
    product_slug,
    sku,
    size,
    color,
    image_url || null,
    unit_price,
    quantity,
    line_total,
  ];
  const result = await client.query(sql, values);
  return result.rows[0];
};

/**
 * Trừ stock_qty của variant sau khi đặt hàng
 */
const decreaseVariantStock = async (client, variant_id, quantity) => {
  const sql = `
        UPDATE product_variants
        SET stock_qty = stock_qty - $2,
            sold_qty  = sold_qty  + $2,
            updated_at = NOW()
        WHERE id = $1
          AND stock_qty >= $2
        RETURNING id, stock_qty
    `;
  const result = await client.query(sql, [variant_id, quantity]);
  if (result.rowCount === 0) {
    throw new Error(`Variant ${variant_id}: không đủ hàng tồn kho`);
  }
  return result.rows[0];
};

/**
 * Tạo bản ghi thanh toán
 */
const createPayment = async (
  client,
  { id, order_id, method, amount, transaction_id = null },
) => {
  const sql = `
        INSERT INTO payments (
            id, order_id, method, status, amount,
            transaction_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, 'pending', $4,
            $5, NOW(), NOW()
        ) RETURNING *
    `;
  const result = await client.query(sql, [
    id,
    order_id,
    method,
    amount,
    transaction_id,
  ]);
  return result.rows[0];
};

/**
 * Cập nhật trạng thái thanh toán + xác nhận đơn hàng khi thanh toán thành công
 */
const confirmPayment = async (
  client,
  { payment_id, order_id, transaction_id = null },
) => {
  // Đánh dấu payment đã thanh toán
  const paymentSql = `
        UPDATE payments
        SET status = 'paid', transaction_id = COALESCE($2, transaction_id),
            paid_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
  const payResult = await client.query(paymentSql, [
    payment_id,
    transaction_id,
  ]);

  // Chuyển order sang confirmed
  const orderSql = `
        UPDATE orders
        SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
  const ordResult = await client.query(orderSql, [order_id]);

  return { payment: payResult.rows[0], order: ordResult.rows[0] };
};

/**
 * Xóa toàn bộ cart_items của user sau khi đặt hàng thành công
 */
const clearCartAfterOrder = async (client, user_id) => {
  const sql = `
        DELETE FROM cart_items
        WHERE cart_id IN (
            SELECT id FROM carts WHERE user_id = $1
        )
    `;
  await client.query(sql, [user_id]);
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách đơn hàng của user (không bao gồm items)
 */
const getOrdersByUserId = async (user_id, { page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  const sql = `
        SELECT
            o.*,
            p.method  AS payment_method,
            p.status  AS payment_status,
            p.paid_at AS payment_paid_at,
            COUNT(oi.id) AS item_count
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id, p.method, p.status, p.paid_at
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
    `;
  const result = await query(sql, [user_id, limit, offset]);
  return result.rows;
};

/**
 * Lấy chi tiết đơn hàng + items + payment
 */
const getOrderDetail = async (order_id, user_id) => {
  // Order header
  const orderSql = `
        SELECT o.*, p.id AS payment_id, p.method AS payment_method,
               p.status AS payment_status, p.amount AS payment_amount,
               p.transaction_id, p.paid_at
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.id = $1 AND o.user_id = $2
    `;
  const orderResult = await query(orderSql, [order_id, user_id]);
  if (orderResult.rows.length === 0) return null;

  // Order items
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
 * Huỷ đơn hàng (chỉ được khi status = 'pending')
 */
const cancelOrder = async (order_id, user_id, reason) => {
  const sql = `
        UPDATE orders
        SET status = 'cancelled',
            cancellation_reason = $3,
            cancelled_by = 'customer',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
        RETURNING *
    `;
  const result = await query(sql, [order_id, user_id, reason || "Khách huỷ"]);
  return result.rows[0] || null;
};

/**
 * Lấy payment của đơn hàng
 */
const getPaymentByOrderId = async (order_id) => {
  const sql = `SELECT * FROM payments WHERE order_id = $1 LIMIT 1`;
  const result = await query(sql, [order_id]);
  return result.rows[0] || null;
};

module.exports = {
  createOrder,
  createOrderItem,
  decreaseVariantStock,
  createPayment,
  confirmPayment,
  clearCartAfterOrder,
  getOrdersByUserId,
  getOrderDetail,
  cancelOrder,
  getPaymentByOrderId,
  generateOrderCode,
};
