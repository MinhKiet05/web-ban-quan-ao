const {
    placeOrder,
    getUserOrders,
    getUserOrderDetail,
    cancelUserOrder,
    getPaymentStatus,
} = require('../services/order.service');
const { HTTP_STATUS } = require('../constants');

const OrderController = {
    // POST /api/orders — Đặt hàng mới
    createOrder: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const {
                shipping_name, shipping_phone, shipping_email,
                shipping_province, shipping_district, shipping_ward,
                shipping_street, shipping_note, customer_note,
                shipping_fee,
                voucher_id,
                payment_method,
                items,
            } = req.body;

            const result = await placeOrder(user_id, {
                shipping_name, shipping_phone, shipping_email,
                shipping_province, shipping_district, shipping_ward,
                shipping_street, shipping_note, customer_note,
                shipping_fee,
                voucher_id,
                payment_method,
                items,
            });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Đặt hàng thành công',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/orders — Danh sách đơn hàng của user
    getOrders: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 10, 50);

            const orders = await getUserOrders(user_id, { page, limit });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: orders,
                pagination: { page, limit },
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/orders/:id — Chi tiết đơn hàng
    getOrder: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const { id } = req.params;

            const order = await getUserOrderDetail(id, user_id);

            return res.status(HTTP_STATUS.OK).json({ success: true, data: order });
        } catch (err) {
            next(err);
        }
    },

    // PATCH /api/orders/:id/cancel — Huỷ đơn hàng
    cancelOrder: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const { id } = req.params;
            const { reason } = req.body;

            const order = await cancelUserOrder(id, user_id, reason);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Đơn hàng đã được huỷ',
                data: order,
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/orders/:id/payment — Trạng thái thanh toán
    getPayment: async (req, res, next) => {
        try {
            const user_id = req.user.id;
            const { id } = req.params;

            const payment = await getPaymentStatus(id, user_id);

            return res.status(HTTP_STATUS.OK).json({ success: true, data: payment });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = OrderController;
