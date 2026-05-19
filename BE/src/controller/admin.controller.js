const {
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
} = require('../model/admin.model');
const { HTTP_STATUS } = require('../constants');

const AdminController = {
    /**
     * GET /api/admin/dashboard
     * Thống kê tổng quan: đơn hàng, doanh thu, users
     */
    getDashboard: async (req, res, next) => {
        try {
            const [stats, totalUsers, revenueChart] = await Promise.all([
                getDashboardStats(),
                getTotalUsers(),
                getRevenueChart(),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { ...stats, total_users: totalUsers, revenue_chart: revenueChart },
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/admin/orders
     * Danh sách tất cả đơn hàng (có filter, search, phân trang)
     */
    getOrders: async (req, res, next) => {
        try {
            const page   = Math.max(parseInt(req.query.page)  || 1, 1);
            const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
            const status = req.query.status || null;
            const search = req.query.search || null;

            const [orders, total] = await Promise.all([
                getAllOrders({ page, limit, status, search }),
                countAllOrders({ status, search }),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: orders,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/admin/orders/:id
     * Chi tiết đơn hàng (không giới hạn user)
     */
    getOrderDetail: async (req, res, next) => {
        try {
            const { id } = req.params;
            const order = await getAdminOrderDetail(id);
            if (!order) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            }
            return res.status(HTTP_STATUS.OK).json({ success: true, data: order });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PATCH /api/admin/orders/:id/status
     * Cập nhật trạng thái đơn hàng
     */
    updateStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, note } = req.body;

            const VALID = ['pending', 'confirmed', 'packing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
            if (!VALID.includes(status)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `Trạng thái không hợp lệ. Chấp nhận: ${VALID.join(', ')}`,
                });
            }

            const order = await updateOrderStatus(id, status, note);
            if (!order) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Cập nhật trạng thái thành công',
                data: order,
            });
        } catch (err) {
            next(err);
        }
    },

    // ─── User management ───────────────────────────────────────────────────────

    /**
     * GET /api/admin/users
     */
    getUsers: async (req, res, next) => {
        try {
            const page   = Math.max(parseInt(req.query.page)  || 1, 1);
            const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
            const search = req.query.search || null;

            const [users, total] = await Promise.all([
                getAllUsers({ page, limit, search }),
                countAllUsers({ search }),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: users,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PATCH /api/admin/users/:id/role
     */
    updateUserRole: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const VALID_ROLES = ['customer', 'admin', 'super_admin'];
            if (!VALID_ROLES.includes(role)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `Role không hợp lệ. Chấp nhận: ${VALID_ROLES.join(', ')}`,
                });
            }
            const user = await updateUserRole(id, role);
            if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Không tìm thấy user' });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PATCH /api/admin/users/:id/block
     */
    toggleUserBlock: async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await toggleUserBlock(id);
            if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Không tìm thấy user' });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: user, message: user.is_blocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
        } catch (err) {
            next(err);
        }
    },

    // ─── Inventory management ──────────────────────────────────────────────────

    /**
     * GET /api/admin/inventory
     */
    getInventory: async (req, res, next) => {
        try {
            const page   = Math.max(parseInt(req.query.page)  || 1, 1);
            const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
            const search = req.query.search || null;

            const [items, total] = await Promise.all([
                getInventory({ page, limit, search }),
                countInventory({ search }),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: items,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PATCH /api/admin/inventory/variants/:id
     */
    updateVariantStock: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { stock_qty } = req.body;
            if (stock_qty === undefined || isNaN(Number(stock_qty)) || Number(stock_qty) < 0) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'stock_qty phải là số >= 0' });
            }
            const variant = await updateVariantStock(id, Number(stock_qty));
            if (!variant) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Không tìm thấy variant' });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: variant });
        } catch (err) {
            next(err);
        }
    },

    // ─── Product management ────────────────────────────────────────────────────

    /**
     * GET /api/admin/products
     */
    getProducts: async (req, res, next) => {
        try {
            const page   = Math.max(parseInt(req.query.page)  || 1, 1);
            const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
            const search = req.query.search || null;
            const status = req.query.status || null;

            const [products, total] = await Promise.all([
                adminGetProducts({ page, limit, search, status }),
                countAdminProducts({ search, status }),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: products,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PUT /api/admin/products/:id
     */
    updateProduct: async (req, res, next) => {
        try {
            const { id } = req.params;
            const product = await adminUpdateProduct(id, req.body);
            if (!product) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: product });
        } catch (err) {
            next(err);
        }
    },

    // ─── Analytics / Stats ────────────────────────────────────────────────────

    /**
     * GET /api/admin/stats
     * Thống kê chi tiết: doanh thu theo tháng, top sản phẩm, tăng trưởng user, số lượng sản phẩm
     */
    getStats: async (req, res, next) => {
        try {
            const [monthlyRevenue, topProducts, growthStats] = await Promise.all([
                getMonthlyRevenue(),
                getTopProducts(),
                getGrowthStats(),
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    monthly_revenue: monthlyRevenue,
                    top_products: topProducts,
                    user_growth: growthStats.user_growth,
                    product_stats: growthStats.product_stats,
                },
            });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = AdminController;
