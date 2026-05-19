const express = require('express');
const router = express.Router();
const ProductController = require('../controller/product.controller');

/**
 * @route GET /api/products/list
 * @description Lấy danh sách sản phẩm với các tùy chọn lọc và phân trang
 * @queryParam {String} category_id - Lọc sản phẩm theo danh mục (tùy chọn)
 * @queryParam {String} sort - Sắp xếp sản phẩm theo trường (price, created_at, view_count, sold_count, avg_rating) và thứ tự (asc, desc), ví dụ: "price:asc" (tùy chọn, mặc định: "created_at:desc")
 * @queryParam {Number} limit - Số lượng sản phẩm trả về trên mỗi trang (tùy chọn, mặc định: 10)
 * @queryParam {String} cursor - Giá trị của trường sắp xếp của sản phẩm cuối cùng trên trang trước để phân trang tiếp theo (tùy chọn)
 */
router.get('/list', ProductController.getManyForList);

/**
 * @route GET /api/products/categories
 * @description Lấy danh sách tất cả danh mục sản phẩm
 */
router.get('/categories', ProductController.getCategoryList);

/**
 * @route GET /api/products/total-count
 * @description Lấy tổng số lượng sản phẩm phù hợp với các tùy chọn lọc (category_id)
 * @queryParam {String} category_id - Lọc sản phẩm theo danh mục (tùy chọn)
 * @return {Object} Đối tượng JSON chứa thông tin thành công và tổng số lượng sản phẩm phù hợp với các tùy chọn lọc
 * @throws Lỗi nếu có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
router.get('/total-count', ProductController.getTotalCountForProducts);
/**
 * @route GET /api/products/filters
 * @description Lấy dữ liệu cần thiết để hiển thị các bộ lọc tìm kiếm sản phẩm, bao gồm danh sách các danh mục sản phẩm đang hoạt động và phạm vi giá tối thiểu và tối đa của tất cả sản phẩm.
 */
router.get('/filters', ProductController.getSearchFilters);

/**
 * @route GET /api/products/:slug
 * @description Lấy chi tiết sản phẩm theo slug
 * @pathParam {String} slug - Slug của sản phẩm cần lấy chi tiết
 * @returns {Object} Đối tượng JSON chứa thông tin thành công và chi tiết sản phẩm
 * @throws Lỗi nếu không tìm thấy sản phẩm với slug đã cho hoặc có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
router.get('/:slug', ProductController.getDetailsBySlug);

/**
 * @route DELETE /api/products/:id
 * @description Xóa sản phẩm theo id
 * @pathParam {String} id - Id của sản phẩm cần xóa
 * @returns {Object} Đối tượng JSON chứa thông tin thành công và thông báo xóa sản phẩm
 * @throws Lỗi nếu không tìm thấy sản phẩm với id đã cho hoặc có vấn đề trong quá trình truy vấn cơ sở dữ liệu
 */
router.delete('/:id', ProductController.deleteProduct);

module.exports = router;