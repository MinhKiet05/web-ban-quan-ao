const { query } = require("../config/db");
const { generateUniqueId } = require("../utils/generateId");

/**
 * Lấy thông tin chi tiết của sản phẩm theo slug
 * @param {string} slug - Slug của sản phẩm cần lấy thông tin
 * @
 * returns thông tin chi tiết của sản phẩm, bao gồm các trường cơ bản và các biến thể, hình ảnh liên quan
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */

const findCartByUserId = async (user_id) => {
  try {
    const sql = `
      SELECT id FROM carts
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;
    const result = await query(sql, [user_id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const getCartItemsByUserId = async (user_id) => {
  try {
    const sql = `
            SELECT
                c.id AS cart_id,
                ci.id AS cart_item_id,
                ci.quantity,
                ci.added_price,
                pv.id AS variant_id,
                pv.sku,
                pv.size,
                pv.color,
                pv.price,
                pv.sale_price,
                pv.stock_qty,
                p.id AS product_id,
                p.name AS product_name,
                p.slug AS product_slug,
                pi.url AS image_url,
                pi.thumbnail_url
            FROM carts c
            JOIN cart_items ci ON ci.cart_id = c.id
            JOIN product_variants pv ON pv.id = ci.variant_id
            JOIN products p ON p.id = pv.product_id
            LEFT JOIN product_images pi
                ON pi.product_id = p.id
                AND pi.is_primary = TRUE
            WHERE c.user_id = $1
            ORDER BY ci.created_at DESC
        `;
    const result = await query(sql, [user_id]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Tạo cart mới cho user
 * @param {*} user_id úser_id của user cần tạo cart
 * @param {*} cart_id id của cart mới tạo
 * @returns cart vừa tạo
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc lỗi ràng buộc
 */
const createCart = async (user_id, cart_id) => {
  try {
    await query("BEGIN");

    const sql = `
            INSERT INTO carts (id, user_id, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING id
        `;
    const result = await query(sql, [cart_id, user_id]);
    await query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
};

/**
 * Hàm thêm item vào cart của user, nếu user chưa có cart thì sẽ tạo mới cart trước rồi mới thêm item vào
 * @param {*} user_id user_id của user cần thêm item vào cart
 * @param {*} cart_id cart_id của cart cần thêm item vào
 * @param {*} variant_id variant_id của sản phẩm cần thêm vào cart
 * @param {*} quantity số lượng cần thêm vào cart
 * @param {*} added_price giá thêm vào cần thêm vào cart
 * @returns cartItem vừa tạo
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc lỗi ràng buộc
 */

const addItemAddToCart = async (
  user_id,
  cart_id,
  variant_id,
  quantity,
  added_price,
) => {
  try {
    const item_id = await generateUniqueId('cart_items', 'id', 'ci', 8);
    const sql = `
      INSERT INTO cart_items (id, cart_id, variant_id, quantity, added_price, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (cart_id, variant_id)
      DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await query(sql, [item_id, cart_id, variant_id, quantity, added_price]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Cập nhật thông tin của item trong cart
 * @param {*} cart_item_id id của cart item cần cập nhật
 * @param {*} quantity số lượng mới của item
 * @param {*} added_price giá thêm mới của item
 * @returns cartItem vừa cập nhật
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc lỗi ràng buộc
 */
const updateCartItem = async (cart_item_id, quantity, added_price) => {
  try {
    await query("BEGIN");
    const sql = `
            UPDATE cart_items
            SET quantity = $1, added_price = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id
        `;
    const result = await query(sql, [quantity, added_price, cart_item_id]);
    await query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
};


const deleteCartItem = async (cart_item_id) => {
  try {
    await query("BEGIN");
    const sql = `
            DELETE FROM cart_items
            WHERE id = $1
            RETURNING id
        `;
    const result = await query(sql, [cart_item_id]);
    await query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
};

module.exports = { getCartItemsByUserId, findCartByUserId, createCart, addItemAddToCart, updateCartItem, deleteCartItem };
