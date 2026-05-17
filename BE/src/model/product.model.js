const { query } = require("../config/db");

/**
 * Bản đồ sắp xếp cho các trường hợp sort khác nhau
 * - newest: Sắp xếp theo ngày tạo mới nhất (created_at DESC)
 * - oldest: Sắp xếp theo ngày tạo cũ nhất
 * - price_asc: Sắp xếp theo giá tăng dần
 * - price_desc: Sắp xếp theo giá giảm dần
 * - name_asc: Sắp xếp theo tên A-Z
 * - name_desc: Sắp xếp theo tên Z-A
 * - best_selling: Sắp xếp theo số lượng đã bán giảm dần
 * - rating: Sắp xếp theo đánh giá giảm dần
 * */
const SORT_MAP = {
  newest: { col: "sort_key", dir: "DESC", cursorCol: "sort_key" },
  oldest: { col: "sort_key", dir: "ASC", cursorCol: "sort_key" },
  price_asc: { col: "display_price", dir: "ASC", cursorCol: "display_price" },
  price_desc: {
    col: "display_price",
    dir: "DESC",
    cursorCol: "display_price",
  },
  name_asc: { col: "name", dir: "ASC", cursorCol: "name" },
  name_desc: { col: "name", dir: "DESC", cursorCol: "name" },
  best_selling: { col: "sold_count", dir: "DESC", cursorCol: "sold_count" },
  rating: { col: "avg_rating", dir: "DESC", cursorCol: "avg_rating" },
};

const PRODUCT_IMAGE_JSON_SQL = `
  jsonb_build_object(
    'id', pi.id,
    'url', pi.url,
    'thumbnail_url', pi.thumbnail_url,
    'alt_text', pi.alt_text,
    'is_primary', pi.is_primary,
    'sort_order', pi.sort_order
  )
`;

const VARIANT_IMAGES_SQL = `
  SELECT jsonb_agg(
    ${PRODUCT_IMAGE_JSON_SQL}
    ORDER BY pi.sort_order ASC, pi.created_at ASC
  ) AS images
  FROM product_images pi
  WHERE pi.variant_id = pv.id
`;

const PRODUCT_VARIANT_IMAGES_SQL = `
  SELECT jsonb_agg(
    ${PRODUCT_IMAGE_JSON_SQL}
    ORDER BY pi.sort_order ASC, pi.created_at ASC
  ) AS product_images
  FROM product_images pi
  WHERE pi.product_id = p.id
    AND pi.variant_id IS NULL
`;

const PRIMARY_PRODUCT_IMAGE_SQL = `
  SELECT jsonb_build_object(
    'id', pi.id,
    'url', pi.url,
    'thumbnail_url', pi.thumbnail_url,
    'alt_text', pi.alt_text,
    'is_primary', pi.is_primary,
    'sort_order', pi.sort_order
  ) AS primary_image
  FROM product_images pi
  WHERE pi.product_id = p.id
  ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at ASC
  LIMIT 1
`;

const PRODUCT_LIST_SQL = ({
  whereClause,
  cursorClause,
  col,
  dir,
  limitPlaceholder,
}) => `
  WITH list AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.short_description,
      p.brand,
      p.created_at,
      p.discount_percent,
      p.is_sale,
      p.original_price,
      COALESCE(p.published_at, p.updated_at) AS sort_key,
      COALESCE(v.price_min, p.base_price) AS display_price,
      COALESCE(v.total_stock, 0) AS total_stock,
      p.avg_rating,
      p.review_count,
      p.sold_count,
      p.is_featured,
      p.is_new,
      p.is_bestseller,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      img.primary_image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT
        MIN(COALESCE(pv.sale_price, pv.price)) AS price_min,
        SUM(COALESCE(pv.stock_qty, 0)) AS total_stock
      FROM product_variants pv
      WHERE pv.product_id = p.id AND pv.is_active = TRUE
    ) v ON TRUE
    LEFT JOIN LATERAL (
      ${PRIMARY_PRODUCT_IMAGE_SQL}
    ) img ON TRUE
    ${whereClause}
  )
  SELECT *
  FROM list
  ${cursorClause}
  ORDER BY ${col} ${dir}, id ${dir}
  LIMIT ${limitPlaceholder};
`;

const VARIANTS_SQL = `
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pv.id,
      'sku', pv.sku,
      'size', pv.size,
      'color', pv.color,
      'price', pv.price,
      'sale_price', pv.sale_price,
      'stock_qty', pv.stock_qty,
      'sold_qty', pv.sold_qty,
      'is_active', pv.is_active,
      'is_default', pv.is_default,
      'images', COALESCE(vi.images, '[]'::jsonb)
    )
    ORDER BY pv.is_default DESC, pv.created_at ASC
  ) AS variants
  FROM product_variants pv
  LEFT JOIN LATERAL (
    ${VARIANT_IMAGES_SQL}
  ) vi ON true
  WHERE pv.product_id = p.id
`;

const PRODUCT_DETAIL_SQL = `
  SELECT
    p.id,
    p.name,
    p.slug,
    p.sku,
    p.status,
    p.short_description,
    p.description,
    p.brand,
    p.base_price,
    p.original_price,
    p.is_sale,
    p.discount_percent,
    COALESCE(
      (SELECT MIN(COALESCE(pv2.sale_price, pv2.price))
       FROM product_variants pv2
       WHERE pv2.product_id = p.id AND pv2.is_active = TRUE),
      p.base_price
    ) AS display_price,
    p.requires_shipping,
    p.weight_grams,
    p.view_count,
    p.sold_count,
    p.avg_rating,
    p.review_count,
    p.is_featured,
    p.is_new,
    p.is_bestseller,
    p.meta_title,
    p.meta_description,
    p.meta_keywords,
    p.published_at,
    p.created_at,
    p.updated_at,
    c.id AS category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(v.variants, '[]'::jsonb) AS variants,
    COALESCE(img.product_images, '[]'::jsonb) AS product_images
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    ${VARIANTS_SQL}
  ) v ON true
  LEFT JOIN LATERAL (
    ${PRODUCT_VARIANT_IMAGES_SQL}
  ) img ON true
  WHERE p.slug = $1
    AND p.status != 'archived';
`;

/**
 * Tìm kiếm nhiều sản phẩm với các tùy chọn lọc và sắp xếp
 *
 * @param {String} param.category_id id của danh mục để lọc sản phẩm (tùy chọn)
 * @param {String} param.sort sắp xếp theo một trong các giá trị: 'newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'best_selling', 'rating'
 * @param {Number} param.limit giới hạn số lượng sản phẩm trả về (mặc định là 10)
 * @param {Object} param.cursor là một đối tượng chứa thông tin về vị trí hiện tại trong phân trang, bao gồm:
 *   - value: giá trị của trường sắp xếp (ví dụ: created_at, price, name, sold_count, rating)
 *   - id: id của sản phẩm để đảm bảo tính duy nhất trong phân trang
 * @returns số lượng sản phẩm tìm được dựa trên các điều kiện lọc và sắp xếp đã cho
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const findManyForList = async ({
  category_id,
  category_ids,
  sort = "newest",
  limit = 10,
  cursor,
  min_price,
  max_price,
  inStock,
  rating,
  colors,
  sizes,
  is_sale,
  q,
}) => {
  try {
    const { col, dir, cursorCol } = SORT_MAP[sort] || SORT_MAP.newest;
    const op = dir === "DESC" ? "<" : ">";
    const params = [];
    const conditions = [];

    conditions.push(`p.status = 'active'`);

    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (Array.isArray(category_ids) && category_ids.length > 0) {
      params.push(category_ids);
      conditions.push(`p.category_id = ANY($${params.length}::text[])`);
    }

    if (min_price !== undefined) {
      params.push(min_price);
      conditions.push(
        `COALESCE(v.price_min, p.base_price) >= $${params.length}`,
      );
    }

    if (max_price !== undefined) {
      params.push(max_price);
      conditions.push(
        `COALESCE(v.price_min, p.base_price) <= $${params.length}`,
      );
    }

    if (inStock === true) {
      conditions.push(`COALESCE(v.total_stock, 0) > 0`);
    }

    if (rating !== undefined) {
      params.push(rating);
      conditions.push(`p.avg_rating >= $${params.length}`);
    }

    if (is_sale === true) {
      conditions.push(`p.is_sale = TRUE`);
    }

    if (q) {
      params.push(`%${q}%`);
      conditions.push(
        `(p.name ILIKE $${params.length} OR p.short_description ILIKE $${params.length} OR p.brand ILIKE $${params.length})`,
      );
    }

    if (Array.isArray(colors) && colors.length > 0) {
      params.push(colors);
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM product_variants pv_color
          WHERE pv_color.product_id = p.id
            AND pv_color.is_active = TRUE
            AND LOWER(pv_color.color) = ANY($${params.length}::text[])
        )
      `);
    }

    if (Array.isArray(sizes) && sizes.length > 0) {
      params.push(sizes);
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM product_variants pv_size
          WHERE pv_size.product_id = p.id
            AND pv_size.is_active = TRUE
            AND LOWER(pv_size.size) = ANY($${params.length}::text[])
        )
      `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let cursorClause = "";
    if (cursor && cursor.value !== undefined && cursor.id) {
      params.push(cursor.value, cursor.id);
      cursorClause = `
        WHERE (
          list.${cursorCol} ${op} $${params.length - 1}
          OR (list.${cursorCol} = $${params.length - 1} AND list.id ${op} $${params.length})
        )
      `;
    }

    params.push(limit);
    const sql = PRODUCT_LIST_SQL({
      whereClause,
      cursorClause,
      col,
      dir,
      limitPlaceholder: `$${params.length}`,
    });

    const { rows } = await query(sql, params);
    return rows;
  } catch (error) {
    console.error("Error in findManyForList:", error);
    throw error;
  }
};

const getFilterMetadata = async () => {
  try {
    const sql = `
      SELECT
        COALESCE(
          (
            SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ORDER BY c.name)
            FROM categories c
            WHERE c.is_active = TRUE
          ),
          '[]'::jsonb
        ) AS categories,
        COALESCE(
          (
            SELECT jsonb_agg(DISTINCT LOWER(pv.color)) FILTER (WHERE pv.color IS NOT NULL AND pv.color <> '')
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.is_active = TRUE
              AND p.status = 'active'
          ),
          '[]'::jsonb
        ) AS colors,
        COALESCE(
          (
            SELECT jsonb_agg(DISTINCT LOWER(pv.size)) FILTER (WHERE pv.size IS NOT NULL AND pv.size <> '')
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.is_active = TRUE
              AND p.status = 'active'
          ),
          '[]'::jsonb
        ) AS sizes,
        (
          SELECT MIN(COALESCE(v.price_min, p.base_price))
          FROM products p
          LEFT JOIN LATERAL (
            SELECT MIN(COALESCE(pv.sale_price, pv.price)) AS price_min
            FROM product_variants pv
            WHERE pv.product_id = p.id
              AND pv.is_active = TRUE
          ) v ON TRUE
          WHERE p.status = 'active'
        ) AS min_price,
        (
          SELECT MAX(COALESCE(v.price_max, p.base_price))
          FROM products p
          LEFT JOIN LATERAL (
            SELECT MAX(COALESCE(pv.sale_price, pv.price)) AS price_max
            FROM product_variants pv
            WHERE pv.product_id = p.id
              AND pv.is_active = TRUE
          ) v ON TRUE
          WHERE p.status = 'active'
        ) AS max_price;
    `;

    const { rows } = await query(sql);
    return rows[0];
  } catch (error) {
    console.error("Error in getFilterMetadata:", error);
    throw error;
  }
};

/**
 * Hàm tìm kiếm chi tiết một sản phẩm dựa trên slug, bao gồm thông tin cơ bản, các biến thể và hình ảnh liên quan
 * @param {*} slug slug của sản phẩm cần tìm kiếm chi tiết
 * @returns thông tin chi tiết của sản phẩm, bao gồm các trường cơ bản và các biến thể, hình ảnh liên quan
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const findByIdDetailBySlug = async (slug) => {
  try {
    const sql = PRODUCT_DETAIL_SQL;

   
    
    const { rows } = await query(sql, [slug]);
   
    return rows[0] || null;
  } catch (error) {
    console.error("Error in findByIdDetailBySlug:", error);
    throw error;
  }
};

const createProduct = async (newProduct) => {
  try {
    query("BEGIN");
    const insertProductSql = `
          INSERT INTO products (
            name, slug, sku, short_description, description, brand, base_price,
            requires_shipping, weight_grams, status, is_featured, is_new,
            is_bestseller, published_at, meta_title, meta_description, meta_keywords,
            category_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, NOW(), NOW()
          ) RETURNING id;
        `;
  } catch (error) {
    query("ROLLBACK");
    console.error("Error in createProduct:", error);
    throw error;
  }
};

/**
 * Tìm kiếm sản phẩm theo danh mục với các tùy chọn lọc và sắp xếp
 * @param {*} categoryId Id danh mục sản phẩm
 * @param {*} options tùy chọn lọc và sắp xếp, bao gồm:
 *   - sort: cách sắp xếp sản phẩm (newest, oldest, price_asc, price_desc, name_asc, name_desc, best_selling, rating)
 *   - limit: số lượng sản phẩm tối đa trả về
 *   - cursor: thông tin phân trang để lấy trang tiếp theo (bao gồm giá trị của trường sắp xếp và id sản phẩm)
 * @return danh sách sản phẩm thuộc danh mục đã cho, có thể được lọc và sắp xếp theo các tùy chọn trong options
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const findByCategory = async (categoryId, options) => {
  try {
    const { sort, limit, cursor } = options;
    const { col, dir, cursorCol } = SORT_MAP[sort] || SORT_MAP.newest;
    const op = dir === "DESC" ? "<" : ">";
    const params = [categoryId];
    const conditions = [`p.category_id = $1`, `p.status = 'active'`];
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Xây dựng điều kiện phân trang dựa trên cursor
    let cursorClause = "";
    // Cursor sẽ bao gồm giá trị của trường sắp xếp và id sản phẩm để đảm bảo tính duy nhất
    // Ví dụ: { value: '2024-01-01T00:00:00Z', id: '123e4567-e89b-12d3-a456-426614174000' }
    // Điều kiện phân trang sẽ là:
    // WHERE (list.sort_key < '2024-01-01T00:00:00Z' OR (list.sort_key = '2024-01-01T00:00:00Z' AND list.id < '123e4567-e89b-12d3-a456-426614174000'))
    if (cursor && cursor.value !== undefined && cursor.id) {
      params.push(cursor.value, cursor.id);
      cursorClause = `
          WHERE (
            list.${cursorCol} ${op} $${params.length - 1}
            OR (list.${cursorCol} = $${params.length - 1} AND list.id ${op} $${params.length})
          )
        `;
    }

    // Thêm tham số limit vào cuối cùng để tránh ảnh hưởng đến vị trí của các tham số khác trong câu truy vấn
    params.push(limit);
    // Xây dựng câu truy vấn SQL với các điều kiện và phân trang đã xác định
    // Sử dụng hàm PRODUCT_LIST_SQL để tạo câu truy vấn hoàn chỉnh

    const sql = PRODUCT_LIST_SQL({
      whereClause,
      cursorClause,
      col,
      dir,
      limitPlaceholder: `$${params.length}`,
    });

    const { rows } = await query(sql, params);
    return rows;
  } catch (error) {
    console.error("Error in findByCategory:", error);
    throw error;
  }
};

/**
 * Cập nhật thông tin sản phẩm dựa trên id và các trường cần cập nhật
 * @param {*} product sản phẩm cần cập nhật
 * @returns Promise.resolve() nếu cập nhật thành công, Promise.reject() nếu có lỗi trong quá trình cập nhật
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const updateProduct = async (product) => {
  try {
    // Tách id ra khỏi các trường cần cập nhật
    const { id, ...fieldsToUpdate } = product;

    // Xây dựng câu truy vấn động dựa trên các trường cần cập nhật
    const updateFields = Object.keys(fieldsToUpdate);

    const updateValues = Object.values(fieldsToUpdate);
    // Thêm id vào cuối cùng để sử dụng trong điều kiện WHERE

    const placeholders = updateFields.map((_, i) => `$${i + 2}`).join(", ");

    // Câu truy vấn SQL động để cập nhật các trường đã cho
    const sql = `
      UPDATE products
      SET ${updateFields.map((field, i) => `${field} = $${i + 2}`).join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await query(sql, [id, ...updateValues]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    throw error;
  }
};

/**
 * Xóa sản phẩm theo id bằng cách cập nhật trường status thành 'archived' để giữ lại dữ liệu lịch sử và tránh xóa hoàn toàn khỏi cơ sở dữ liệu
 * @param {*} id id của sản phẩm cần xóa
 * @returns thông tin sản phẩm đã được cập nhật trạng thái thành 'archived', hoặc null nếu không tìm thấy sản phẩm với id đã cho
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const deleteProduct = async (id) => {
  try {
    const sql = `
      UPDATE products
      SET status = 'archived', updated_at = NOW()
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    throw error;
  }
};

/**
 * Hàm lấy danh sách các danh mục sản phẩm đang hoạt động từ cơ sở dữ liệu, sắp xếp theo tên danh mục tăng dần
 * @returns danh sách các danh mục sản phẩm, mỗi danh mục bao gồm id và name
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const getCategoryList = async () =>{
  try {
      const sql = `SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY name ASC`;
      const { rows } = await query(sql);
      return rows;
  } catch (error) {
    console.error("Error in getCategoryList:", error);
    throw error;
  }
}

const getTotalCountForProducts = async (filters) => {
  try {
    const sql = `SELECT COUNT(*) AS total_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id`
      
      const totalCount = await query(sql);
      return totalCount.rows[0].total_count;
  } catch (error) {
    console.error("Error in getTotalCountForProducts:", error);
    throw error;
  }
}


module.exports = {
  findManyForList,
  findByIdDetailBySlug,
  getFilterMetadata,
  createProduct,
  findByCategory,
  updateProduct,
  deleteProduct,
  getCategoryList,
  getTotalCountForProducts,
};
