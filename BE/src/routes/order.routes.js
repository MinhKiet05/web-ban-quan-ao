const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const OrderController = require('../controller/order.controller');

// Tất cả order routes đều yêu cầu đăng nhập
router.use(authenticate);

// POST   /api/orders          — Đặt hàng mới
router.post('/', OrderController.createOrder);

// GET    /api/orders          — Danh sách đơn hàng của user
router.get('/', OrderController.getOrders);

// GET    /api/orders/:id      — Chi tiết đơn hàng
router.get('/:id', OrderController.getOrder);

// PATCH  /api/orders/:id/cancel — Huỷ đơn hàng
router.patch('/:id/cancel', OrderController.cancelOrder);

// GET    /api/orders/:id/payment — Trạng thái thanh toán
router.get('/:id/payment', OrderController.getPayment);

module.exports = router;
