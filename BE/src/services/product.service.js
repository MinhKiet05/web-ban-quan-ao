const {
  findManyForList: findManyForListModel,
  findByIdDetailBySlug,
  getFilterMetadata: getFilterMetadataModel,
  createProduct,
  deleteProduct: deleteProductFromDB,
  findByCategory,
  updateProduct,
  getCategoryList: getCategoryListFromDB,
  getTotalCountForProducts: getTotalCountForProductsModel,
} = require("../model/product.model");
const { DB_ERRORS, VALIDATION_ERRORS } = require("../constants");
const { createError, PRODUCT_ERRORS } = require("../constants/errors");

async function findManyForList({
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
}) {
  try {
    const result = await findManyForListModel({
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
    });

    return result.map(({ sort_key, ...product }) => product);
  } catch (error) {
    throw error;
  }
}

const getFilterMetadata = async () => {
  try {
    return await getFilterMetadataModel();
  } catch (error) {
    throw error;
  }
};

const findProductDetailsBySlug = async (slug) => {
  try {
    if (!slug) {
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        "Slug là bắt buộc",
      );
    }
    const result = await findByIdDetailBySlug(slug);
    if (!result) {
      throw createError(
        PRODUCT_ERRORS.PRODUCT_NOT_FOUND,
        "Không tìm thấy sản phẩm với slug đã cho",
      );
    }
    return result;
  } catch (error) {
    throw error;
  }
};

const deleteProduct = async (id) => {
  try {
    if (!id) {
      throw createError(
        VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        "Id là bắt buộc",
      );
    }
    const result = await deleteProductFromDB(id);
    if (!result) {
      throw createError(
        PRODUCT_ERRORS.PRODUCT_NOT_FOUND,
        "Không tìm thấy sản phẩm với id đã cho",
      );
    }
    return result;
  } catch (error) {
    throw error;
  }
};


/**
 * Hàm lấy danh sách các danh mục sản phẩm đang hoạt động từ cơ sở dữ liệu, sắp xếp theo tên danh mục tăng dần
 * @returns danh sách các danh mục sản phẩm, mỗi danh mục bao gồm id và name
 * @throws lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
const getCategoryList = async () => {
  try {
    const categories = await getCategoryListFromDB();
    return categories;
  } catch (error) {
    throw error;
  }
};

const getTotalCountForProducts = async () => {
  try {
    // Lấy tổng số lượng sản phẩm từ model
    const totalCount = await getTotalCountForProductsModel();

    // Chuyển đổi kết quả thành số nguyên và kiểm tra tính hợp lệ
    const total = parseInt(totalCount, 10);

    // Nếu kết quả không phải là một số hợp lệ, ném lỗi
    if (isNaN(total)) {
      throw createError(
        DB_ERRORS.INVALID_DATA,
        "Dữ liệu tổng số lượng sản phẩm không hợp lệ",
      );
    }

    const pagination = total > 0 ? Math.ceil(total / 10) : 0; // Giả sử mỗi trang có 10 sản phẩm

    // Trả về tổng số lượng sản phẩm
    return { totalCount: total, pagination };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  findManyForList,
  findProductDetailsBySlug,
  getFilterMetadata,
  createProduct,
  deleteProduct,
  findByCategory,
  updateProduct,
  getCategoryList,
  getTotalCountForProducts,
};
