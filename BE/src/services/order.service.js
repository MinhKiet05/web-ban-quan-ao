const { getClient } = require("../config/db");
const { generateUniqueId } = require("../utils/generateId");
const { createError, VALIDATION_ERRORS, DB_ERRORS } = require("../constants");
const {
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
} = require("../model/order.model");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map phương thức thanh toán FE → DB enum
 * FE gửi: 'cod' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay'
 */
const VALID_PAYMENT_METHODS = [
  "cod",
  "vnpay",
  "momo",
  "zalopay",
  "bank_transfer",
  "credit_card",
  "debit_card",
];

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Tạo đơn hàng mới từ giỏ hàng
 *
 * Flow:
 *  1. Validate input
 *  2. BEGIN transaction
 *  3. Tạo order
 *  4. Tạo order_items + trừ stock từng variant
 *  5. Tạo payment record (status = pending)
 *  6. Nếu method = COD hoặc credit_card/debit_card (giả lập): confirm ngay
 *  7. Xoá cart_items
 *  8. COMMIT
 */
const placeOrder = async (
  user_id,
  {
    // Shipping info
    shipping_name,
    shipping_phone,
    shipping_email,
    shipping_province,
    shipping_district,
    shipping_ward,
    shipping_street,
    shipping_note,
    customer_note,
    // Tài chính
    shipping_fee = 0,
    voucher_id = null,
    // Payment
    payment_method = "cod",
    // Items từ giỏ hàng (FE gửi lên để xác nhận)
    items, // [{ variant_id, product_name, product_slug, sku, size, color, image_url, unit_price, quantity }]
  },
) => {
  // ── Validate ───────────────────────────────────────────────────────────
  if (!user_id)
    throw createError(
      VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
      "user_id là bắt buộc",
    );

  const requiredShipping = {
    shipping_name,
    shipping_phone,
    shipping_province,
    shipping_district,
    shipping_ward,
    shipping_street,
  };
  for (const [k, v] of Object.entries(requiredShipping)) {
    if (!v || !String(v).trim())
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        `${k} là bắt buộc`,
      );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw createError(
      VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
      "Đơn hàng phải có ít nhất 1 sản phẩm",
    );
  }

  if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
    throw createError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      `Phương thức thanh toán không hợp lệ: ${payment_method}`,
    );
  }

  // Validate phone
  if (!/^\d{10,15}$/.test(String(shipping_phone).replace(/[\s\-+]/g, ""))) {
    throw createError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      "Số điện thoại không hợp lệ",
    );
  }

  // ── Tính tiền ──────────────────────────────────────────────────────────
  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.unit_price) * parseInt(item.quantity),
    0,
  );
  const discount_amount = 0; // TODO: tích hợp voucher
  const tax_amount = 0;
  const total =
    subtotal + parseFloat(shipping_fee) - discount_amount + tax_amount;

  // ── Transaction ────────────────────────────────────────────────────────
  const client = await getClient();
  try {
    await client.query("BEGIN");

    // 1. Tạo order
    const order_id = await generateUniqueId("orders", "id", "ord", 8);
    const order = await createOrder(client, {
      id: order_id,
      user_id,
      subtotal,
      discount_amount,
      shipping_fee: parseFloat(shipping_fee),
      tax_amount,
      total,
      shipping_name,
      shipping_phone,
      shipping_email: shipping_email || null,
      shipping_province,
      shipping_district,
      shipping_ward,
      shipping_street,
      shipping_note,
      customer_note,
      voucher_id,
    });

    // 2. Tạo order_items + trừ stock
    const orderItems = [];
    for (const item of items) {
      const item_id = await generateUniqueId(
        "order_items",
        "id",
        "oi",
        8,
        client,
      );
      const line_total = parseFloat(item.unit_price) * parseInt(item.quantity);
      const oi = await createOrderItem(client, {
        id: item_id,
        order_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        product_slug: item.product_slug || "",
        sku: item.sku || "",
        size: item.size || "",
        color: item.color || "",
        image_url: item.image_url || null,
        unit_price: parseFloat(item.unit_price),
        quantity: parseInt(item.quantity),
        line_total,
      });
      await decreaseVariantStock(
        client,
        item.variant_id,
        parseInt(item.quantity),
      );
      orderItems.push(oi);
    }

    // 3. Tạo payment record
    const payment_id = await generateUniqueId("payments", "id", "pay", 8);
    const payment = await createPayment(client, {
      id: payment_id,
      order_id,
      method: payment_method,
      amount: total,
    });

    // 4. COD hoặc card/bank → xác nhận ngay (giả lập)
    let finalOrder = order;
    let finalPayment = payment;
    const autoConfirmMethods = [
      "cod",
      "credit_card",
      "debit_card",
      "bank_transfer",
    ];
    if (autoConfirmMethods.includes(payment_method)) {
      const confirmed = await confirmPayment(client, {
        payment_id,
        order_id,
        transaction_id: payment_method !== "cod" ? `TXN-${Date.now()}` : null,
      });
      finalOrder = confirmed.order;
      finalPayment = confirmed.payment;
    }

    // 5. Xoá giỏ hàng
    await clearCartAfterOrder(client, user_id);

    await client.query("COMMIT");

    return {
      order: { ...finalOrder, items: orderItems },
      payment: finalPayment,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách đơn hàng của user
 */
const getUserOrders = async (user_id, { page, limit } = {}) => {
  if (!user_id)
    throw createError(
      VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
      "user_id là bắt buộc",
    );
  return await getOrdersByUserId(user_id, { page, limit });
};

/**
 * Lấy chi tiết đơn hàng (chỉ user sở hữu mới được xem)
 */
const getUserOrderDetail = async (order_id, user_id) => {
  if (!order_id || !user_id)
    throw createError(
      VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
      "Thiếu thông tin",
    );
  const order = await getOrderDetail(order_id, user_id);
  if (!order) throw createError(DB_ERRORS.NOT_FOUND, "Không tìm thấy đơn hàng");
  return order;
};

/**
 * Huỷ đơn hàng
 */
const cancelUserOrder = async (order_id, user_id, reason) => {
  if (!order_id || !user_id)
    throw createError(
      VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
      "Thiếu thông tin",
    );
  const order = await cancelOrder(order_id, user_id, reason);
  if (!order)
    throw createError(
      DB_ERRORS.NOT_FOUND,
      "Không thể huỷ đơn hàng (không tìm thấy hoặc đơn đã được xử lý)",
    );
  return order;
};

/**
 * Lấy trạng thái thanh toán
 */
const getPaymentStatus = async (order_id, user_id) => {
  // Kiểm tra quyền sở hữu
  const order = await getOrderDetail(order_id, user_id);
  if (!order) throw createError(DB_ERRORS.NOT_FOUND, "Không tìm thấy đơn hàng");
  const payment = await getPaymentByOrderId(order_id);
  if (!payment)
    throw createError(
      DB_ERRORS.NOT_FOUND,
      "Không tìm thấy thông tin thanh toán",
    );
  return payment;
};

module.exports = {
  placeOrder,
  getUserOrders,
  getUserOrderDetail,
  cancelUserOrder,
  getPaymentStatus,
};
