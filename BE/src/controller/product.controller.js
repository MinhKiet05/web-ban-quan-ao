const {
  findManyForList,
  findProductDetailsBySlug,
  deleteProduct,
  getFilterMetadata,
  getCategoryList,
  getTotalCountForProducts,
} = require("../services/product.service");

const parseListQuery = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const ProductController = {
    async getManyForList(req, res, next) {
        try {
            const {
              category_id,
              category_ids,
              sort,
              limit,
              cursor,
              min_price,
              max_price,
              inStock,
              rating,
              colors,
              sizes,
              is_sale,
              q,
            } = req.query;
            const products = await findManyForList({
                category_id,
                category_ids: parseListQuery(category_ids),
                sort,
                limit: parseInt(limit) || 10,
                cursor: cursor ? JSON.parse(cursor) : undefined,
                min_price: min_price !== undefined ? parseFloat(min_price) : undefined,
                max_price: max_price !== undefined ? parseFloat(max_price) : undefined,
                inStock: inStock === "true",
                rating:
                    rating !== undefined && rating !== ""
                        ? parseFloat(rating)
                        : undefined,
                colors: parseListQuery(colors),
                sizes: parseListQuery(sizes),
                is_sale: is_sale === "true",
                q: q ? String(q).trim() : undefined,
            });

      return res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  },

    async getSearchFilters(req, res, next) {
      try {
        const metadata = await getFilterMetadata();
        return res.status(200).json({
          success: true,
          data: metadata,
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     * @returns 
     */
    async getDetailsBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const product = await findProductDetailsBySlug(slug);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm với slug đã cho",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          product,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const result = await deleteProduct(id);
      return res.status(200).json({
        success: true,
        message: "Xóa sản phẩm thành công",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Ham xử lý yêu cầu lấy danh sách danh mục sản phẩm
   * @description Truy cập vào service để lấy danh sách các danh mục sản phẩm đang hoạt động, sau đó trả về kết quả dưới dạng JSON. Nếu có lỗi xảy ra trong quá trình xử lý, lỗi sẽ được chuyển đến middleware xử lý lỗi tiếp theo.
   * @route GET /api/products/categories
   * @returns {Object} Đối tượng JSON chứa thông tin thành công và dữ liệu danh mục sản phẩm
   * @throws Lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc xử lý yêu cầu
   */
  async getCategoryList(req, res, next) {
    try {
      const categories = await getCategoryList();
      return res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Ham xử lý yêu cầu lấy tổng số lượng sản phẩm
   * @description Truy cập vào service để lấy tổng số lượng sản phẩm, sau đó trả về kết quả dưới dạng JSON. Nếu có lỗi xảy ra trong quá trình xử lý, lỗi sẽ được chuyển đến middleware xử lý lỗi tiếp theo.
   * @route GET /api/products/total-count
   * @returns {Object} Đối tượng JSON chứa thông tin thành công và tổng số lượng sản phẩm
   * @throws Lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu hoặc xử lý yêu cầu
   */
  async getTotalCountForProducts(req, res, next) {
    try {
      const { totalCount, pagination } = await getTotalCountForProducts();
      return res.status(200).json({
        success: true,
        data: { totalCount, pagination },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ProductController;
