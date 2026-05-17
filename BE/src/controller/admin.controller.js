const {
    getDashboardStats,
    getTotalUsers,
    getAllOrders,
    countAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    getRevenueChart,
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
};

module.exports = AdminController;
